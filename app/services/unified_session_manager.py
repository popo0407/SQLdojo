# -*- coding: utf-8 -*-
"""
統合セッション管理サービス
高速メモリアクセス + DB永続化のハイブリッド管理
"""
import sqlite3
import threading
import time
from datetime import datetime, timedelta
from typing import Dict, Any, Optional, List
from enum import Enum
from app.logger import get_logger

logger = get_logger("UnifiedSessionManager")

class SessionStatus(Enum):
    """セッション状態"""
    ACTIVE = "active"
    COMPLETED = "completed"
    ERROR = "error"
    TIMEOUT = "timeout"
    CANCELLED = "cancelled"

class SessionCleanupRule:
    """セッションクリーンアップルール"""
    
    # タイムアウト設定（分）
    ACTIVE_TIMEOUT = 30      # 30分間応答がない場合は異常終了
    COMPLETED_RETENTION = 60 # 完了セッションは60分保持
    ERROR_RETENTION = 120    # エラーセッションは2時間保持
    MAX_SESSION_AGE = 720    # 12時間経過後は強制削除
    
    # 進行状況タイムアウト
    NO_PROGRESS_TIMEOUT = 10 # 10分間進行がない場合は停止扱い

class UnifiedSessionManager:
    """統合セッション管理"""
    
    def __init__(self, cache_db_path: str = "cache_data.db"):
        self.cache_db_path = cache_db_path
        self._lock = threading.Lock()
        
        # メモリセッション（高速アクセス用）
        self._memory_sessions: Dict[str, Dict[str, Any]] = {}
        
        # 設定
        self._max_concurrent_sessions = 5
        self._sync_interval = 5  # 5秒間隔で同期
        self._last_cleanup = datetime.now()
        
        # 初期化
        self._init_db()
        self._restore_sessions_from_db()
        self._start_background_tasks()
    
    def _init_db(self):
        """DB初期化"""
        with sqlite3.connect(self.cache_db_path) as conn:
            cursor = conn.cursor()
            
            # 既存テーブルに新しいカラムを追加
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS cache_sessions (
                    session_id TEXT PRIMARY KEY,
                    user_id TEXT NOT NULL,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    last_accessed TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    last_progress_update TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    status TEXT DEFAULT 'active',
                    total_rows INTEGER DEFAULT 0,
                    processed_rows INTEGER DEFAULT 0,
                    is_complete BOOLEAN DEFAULT FALSE,
                    execution_time REAL DEFAULT NULL,
                    error_message TEXT DEFAULT NULL,
                    browser_session_id TEXT DEFAULT NULL
                )
            """)
            
            # 新しいカラムを追加（存在しない場合のみ）
            self._add_column_if_not_exists(cursor, 'cache_sessions', 'last_progress_update', 'TIMESTAMP DEFAULT CURRENT_TIMESTAMP')
            self._add_column_if_not_exists(cursor, 'cache_sessions', 'error_message', 'TEXT DEFAULT NULL')
            self._add_column_if_not_exists(cursor, 'cache_sessions', 'browser_session_id', 'TEXT DEFAULT NULL')
            
            conn.commit()
    
    def _add_column_if_not_exists(self, cursor, table_name: str, column_name: str, column_def: str):
        """カラムが存在しない場合のみ追加"""
        try:
            cursor.execute(f"SELECT {column_name} FROM {table_name} LIMIT 1")
        except sqlite3.OperationalError:
            cursor.execute(f"ALTER TABLE {table_name} ADD COLUMN {column_name} {column_def}")
            logger.info(f"カラム追加: {table_name}.{column_name}")
    
    def _restore_sessions_from_db(self):
        """DB からアクティブセッションをメモリに復旧"""
        with self._lock:
            logger.info("DBからセッション情報を復旧中...")
            
            try:
                with sqlite3.connect(self.cache_db_path) as conn:
                    cursor = conn.cursor()
                    cursor.execute("""
                        SELECT session_id, user_id, created_at, last_accessed, 
                               last_progress_update, status, total_rows, processed_rows,
                               is_complete, execution_time, error_message, browser_session_id
                        FROM cache_sessions 
                        WHERE is_complete = 0 AND status IN ('active', 'running')
                    """)
                    
                    restored_count = 0
                    for row in cursor.fetchall():
                        session_id = row[0]
                        session_info = {
                            'user_id': row[1],
                            'created_at': datetime.fromisoformat(row[2]) if row[2] else datetime.now(),
                            'last_accessed': datetime.fromisoformat(row[3]) if row[3] else datetime.now(),
                            'last_progress_update': datetime.fromisoformat(row[4]) if row[4] else datetime.now(),
                            'status': row[5],
                            'total_rows': row[6] or 0,
                            'processed_rows': row[7] or 0,
                            'is_complete': bool(row[8]),
                            'execution_time': row[9],
                            'error_message': row[10],
                            'browser_session_id': row[11]
                        }
                        
                        # タイムアウトチェック
                        if self._is_session_timeout(session_info):
                            self._mark_session_timeout(session_id, session_info)
                        else:
                            self._memory_sessions[session_id] = session_info
                            restored_count += 1
                    
                    logger.info(f"セッション復旧完了: {restored_count}件")
                    
            except Exception as e:
                logger.error(f"セッション復旧エラー: {e}")
    
    def _is_session_timeout(self, session_info: Dict[str, Any]) -> bool:
        """セッションがタイムアウトしているかチェック"""
        now = datetime.now()
        
        # 作成から最大時間経過チェック
        if now - session_info['created_at'] > timedelta(minutes=SessionCleanupRule.MAX_SESSION_AGE):
            return True
            
        # アクティブセッションの無応答チェック
        if session_info['status'] == 'active':
            if now - session_info['last_progress_update'] > timedelta(minutes=SessionCleanupRule.ACTIVE_TIMEOUT):
                return True
                
        return False
    
    def _mark_session_timeout(self, session_id: str, session_info: Dict[str, Any]):
        """セッションをタイムアウト状態にマーク"""
        try:
            with sqlite3.connect(self.cache_db_path) as conn:
                cursor = conn.cursor()
                cursor.execute("""
                    UPDATE cache_sessions 
                    SET status = 'timeout', is_complete = 1, error_message = 'セッションタイムアウト'
                    WHERE session_id = ?
                """, (session_id,))
                conn.commit()
                
            logger.warning(f"セッションタイムアウト: {session_id}")
            
        except Exception as e:
            logger.error(f"タイムアウトマークエラー: {e}")
    
    def _start_background_tasks(self):
        """バックグラウンドタスク開始"""
        def background_worker():
            while True:
                try:
                    time.sleep(self._sync_interval)
                    self._periodic_sync()
                    self._periodic_cleanup()
                except Exception as e:
                    logger.error(f"バックグラウンドタスクエラー: {e}")
        
        thread = threading.Thread(target=background_worker, daemon=True)
        thread.start()
        logger.info("バックグラウンドタスク開始")
    
    def _periodic_sync(self):
        """定期同期"""
        # 必要に応じてメモリ→DB同期を実行
        pass
    
    def _periodic_cleanup(self):
        """定期クリーンアップ（5分間隔）"""
        now = datetime.now()
        if now - self._last_cleanup < timedelta(minutes=5):
            return
            
        self._last_cleanup = now
        self._cleanup_expired_sessions()
    
    def _cleanup_expired_sessions(self):
        """期限切れセッションをクリーンアップ"""
        logger.info("期限切れセッションのクリーンアップを開始")
        
        try:
            with sqlite3.connect(self.cache_db_path) as conn:
                cursor = conn.cursor()
                
                now = datetime.now()
                
                # 12時間経過したセッションを削除
                cutoff_time = now - timedelta(minutes=SessionCleanupRule.MAX_SESSION_AGE)
                cursor.execute("""
                    SELECT session_id FROM cache_sessions 
                    WHERE created_at < ?
                """, (cutoff_time.isoformat(),))
                
                expired_sessions = [row[0] for row in cursor.fetchall()]
                
                for session_id in expired_sessions:
                    self._delete_session_completely(session_id)
                    
                logger.info(f"期限切れセッション削除: {len(expired_sessions)}件")
                
        except Exception as e:
            logger.error(f"クリーンアップエラー: {e}")
    
    def _delete_session_completely(self, session_id: str):
        """セッションを完全削除（DBテーブル + セッション情報）"""
        try:
            with sqlite3.connect(self.cache_db_path) as conn:
                cursor = conn.cursor()
                
                # キャッシュテーブル削除
                cursor.execute(f"DROP TABLE IF EXISTS {session_id}")
                
                # セッション情報削除
                cursor.execute("DELETE FROM cache_sessions WHERE session_id = ?", (session_id,))
                
                conn.commit()
                
            # メモリからも削除
            with self._lock:
                self._memory_sessions.pop(session_id, None)
                
            logger.info(f"セッション完全削除: {session_id}")
            
        except Exception as e:
            logger.error(f"セッション削除エラー: {e}")
    
    # ========== 公開API ==========
    
    def register_session(self, session_id: str, user_id: str, browser_session_id: Optional[str] = None, total_rows: int = 0) -> bool:
        """セッションを登録（同時実行制限チェック付き）"""
        with self._lock:
            logger.info(f"---[REGISTER_SESSION: START] (Session: {session_id})---")
            
            # 同時実行制限チェック
            active_count = len([s for s in self._memory_sessions.values() if s['status'] == 'active'])
            if active_count >= self._max_concurrent_sessions:
                logger.warning(f"同時実行制限に達しました: {active_count}/{self._max_concurrent_sessions}")
                return False
            
            # メモリに登録
            now = datetime.now()
            session_info = {
                'user_id': user_id,
                'created_at': now,
                'last_accessed': now,
                'last_progress_update': now,
                'status': SessionStatus.ACTIVE.value,
                'total_rows': total_rows,
                'processed_rows': 0,
                'is_complete': False,
                'execution_time': None,
                'error_message': None,
                'browser_session_id': browser_session_id
            }
            
            self._memory_sessions[session_id] = session_info
            
            # DBに同期
            self._sync_session_to_db(session_id, session_info)
            
            logger.info(f"セッション登録完了: {session_id}, ユーザー: {user_id}")
            return True
    
    def update_session_progress(self, session_id: str, processed_rows: int, 
                              status: Optional[str] = None, is_complete: bool = False, 
                              execution_time: Optional[float] = None, 
                              error_message: Optional[str] = None):
        """セッションの進捗を更新"""
        with self._lock:
            if session_id not in self._memory_sessions:
                logger.warning(f"存在しないセッションの進捗更新: {session_id}")
                return
            
            session_info = self._memory_sessions[session_id]
            now = datetime.now()
            
            # メモリ更新
            session_info['processed_rows'] = processed_rows
            session_info['last_accessed'] = now
            session_info['last_progress_update'] = now
            session_info['is_complete'] = is_complete
            
            if status:
                session_info['status'] = status
            if execution_time is not None:
                session_info['execution_time'] = execution_time
            if error_message:
                session_info['error_message'] = error_message
            
            # DBに同期（重要な変更のみ即座に同期）
            if is_complete or error_message or execution_time is not None:
                self._sync_session_to_db(session_id, session_info)
    
    def complete_session(self, session_id: str, execution_time: Optional[float] = None):
        """セッションを完了状態にする"""
        self.update_session_progress(
            session_id, 
            processed_rows=self._memory_sessions.get(session_id, {}).get('processed_rows', 0),
            status=SessionStatus.COMPLETED.value,
            is_complete=True,
            execution_time=execution_time
        )
        logger.info(f"セッション完了: {session_id}")
    
    def error_session(self, session_id: str, error_message: str):
        """セッションをエラー状態にする"""
        self.update_session_progress(
            session_id,
            processed_rows=self._memory_sessions.get(session_id, {}).get('processed_rows', 0),
            status=SessionStatus.ERROR.value,
            is_complete=True,
            error_message=error_message
        )
        logger.error(f"セッションエラー: {session_id} - {error_message}")
    
    def cancel_session(self, session_id: str):
        """セッションをキャンセル状態にする"""
        self.update_session_progress(
            session_id,
            processed_rows=self._memory_sessions.get(session_id, {}).get('processed_rows', 0),
            status=SessionStatus.CANCELLED.value,
            is_complete=True
        )
        logger.info(f"セッションキャンセル: {session_id}")
    
    def get_session_info(self, session_id: str) -> Optional[Dict[str, Any]]:
        """セッション情報を取得（高速メモリアクセス）"""
        with self._lock:
            return self._memory_sessions.get(session_id, {}).copy() if session_id in self._memory_sessions else None
    
    def cleanup_session(self, session_id: str):
        """セッションをクリーンアップ（テーブル削除）"""
        logger.info(f"セッションクリーンアップ: {session_id}")
        
        # 完了状態にマーク
        if session_id in self._memory_sessions:
            self.complete_session(session_id)
        
        # キャッシュテーブル削除
        self._delete_session_completely(session_id)
    
    def cleanup_user_sessions(self, user_id: str):
        """ユーザーの全セッションをクリーンアップ"""
        logger.info(f"ユーザー({user_id})の全セッションクリーンアップ開始")
        
        with self._lock:
            # メモリから該当セッションを検索
            user_sessions = [
                sid for sid, info in self._memory_sessions.items() 
                if info.get('user_id') == user_id
            ]
        
        # 各セッションをクリーンアップ
        for session_id in user_sessions:
            self.cleanup_session(session_id)
        
        logger.info(f"ユーザー({user_id})のクリーンアップ完了: {len(user_sessions)}件")
    
    def generate_session_id(self, user_id: str) -> str:
        """セッションIDを生成"""
        from datetime import datetime
        import time
        
        formatted_time = datetime.now().strftime('%Y%m%d%H%M%S')
        microseconds = int(time.time() * 1000) % 1000
        return f"cache_{user_id}_{formatted_time}_{microseconds:03d}"
    
    # ========== 内部同期メソッド ==========
    
    def _sync_session_to_db(self, session_id: str, session_info: Dict[str, Any]):
        """メモリからDBに同期"""
        try:
            with sqlite3.connect(self.cache_db_path) as conn:
                cursor = conn.cursor()
                
                # UPSERT (INSERT OR REPLACE)
                cursor.execute("""
                    INSERT OR REPLACE INTO cache_sessions 
                    (session_id, user_id, created_at, last_accessed, last_progress_update,
                     status, total_rows, processed_rows, is_complete, execution_time, 
                     error_message, browser_session_id)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """, (
                    session_id,
                    session_info['user_id'],
                    session_info['created_at'].isoformat(),
                    session_info['last_accessed'].isoformat(),
                    session_info['last_progress_update'].isoformat(),
                    session_info['status'],
                    session_info['total_rows'],
                    session_info['processed_rows'],
                    session_info['is_complete'],
                    session_info['execution_time'],
                    session_info['error_message'],
                    session_info['browser_session_id']
                ))
                
                conn.commit()
                
        except Exception as e:
            logger.error(f"DB同期エラー: {session_id} - {e}")
    
    # ========== キャッシュテーブル管理 ==========
    
    def create_cache_table(self, session_id: str, columns: List[str]) -> str:
        """キャッシュテーブルを作成"""
        table_name = session_id
        
        try:
            with sqlite3.connect(self.cache_db_path) as conn:
                cursor = conn.cursor()
                
                # カラム定義を作成
                column_defs = []
                for i, col in enumerate(columns):
                    clean_col = str(col).replace('"', '').replace("'", "").replace('[', '').replace(']', '')
                    column_defs.append(f"col_{i} TEXT")
                
                # テーブル作成
                create_sql = f"CREATE TABLE IF NOT EXISTS {table_name} ({', '.join(column_defs)})"
                cursor.execute(create_sql)
                conn.commit()
                
                logger.info(f"キャッシュテーブル作成: {table_name} ({len(columns)}列)")
                return table_name
                
        except Exception as e:
            logger.error(f"キャッシュテーブル作成エラー: {e}")
            raise
    
    def get_active_session_count(self) -> int:
        """アクティブセッション数を取得"""
        with self._lock:
            return len([s for s in self._memory_sessions.values() if s['status'] == 'active'])
