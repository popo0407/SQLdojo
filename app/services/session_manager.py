"""
統一セッション管理サービス
- DB + メモリのハイブリッド管理
- セッションライフサイクルの統一
- 自動クリーンアップ機能
"""

import sqlite3
import threading
import time
from datetime import datetime, timedelta
from typing import Dict, Any, Optional, List
from enum import Enum
import logging

logger = logging.getLogger(__name__)


class SessionStatus(Enum):
    """セッション状態の定義"""
    PENDING = "pending"      # 作成済み、実行前
    ACTIVE = "active"        # 実行中
    COMPLETED = "completed"  # 正常完了
    FAILED = "failed"        # エラー終了
    CANCELLED = "cancelled"  # ユーザーキャンセル
    TIMEOUT = "timeout"      # タイムアウト
    CLEANUP = "cleanup"      # クリーンアップ対象


class SessionCleanupPolicy(Enum):
    """クリーンアップポリシー"""
    IMMEDIATE = "immediate"    # 即座削除
    DELAYED = "delayed"        # 遅延削除
    ARCHIVE = "archive"        # アーカイブ（履歴保持）


class SessionManager:
    """統一セッション管理サービス"""
    
    def __init__(self, cache_db_path: str = "cache_data.db"):
        self.cache_db_path = cache_db_path
        self._lock = threading.RLock()  # 再帰ロック
        self._active_sessions = {}  # メモリキャッシュ（プライマリ）
        self._max_concurrent_sessions = 5
        self._cleanup_policies = {
            SessionStatus.COMPLETED: SessionCleanupPolicy.DELAYED,  # 5分後削除
            SessionStatus.FAILED: SessionCleanupPolicy.DELAYED,     # 30分後削除
            SessionStatus.CANCELLED: SessionCleanupPolicy.IMMEDIATE, # 即座削除
            SessionStatus.TIMEOUT: SessionCleanupPolicy.DELAYED,    # 60分後削除
        }
        self._cleanup_delays = {
            SessionStatus.COMPLETED: timedelta(minutes=5),
            SessionStatus.FAILED: timedelta(minutes=30),
            SessionStatus.TIMEOUT: timedelta(hours=1),
        }
        self._last_db_sync = time.time()
        self._sync_interval = 10  # 10秒間隔でDB同期
        
        self._init_db()
        self._sync_from_db()  # 起動時にDBから復元
    
    def _init_db(self):
        """DB初期化"""
        with sqlite3.connect(self.cache_db_path) as conn:
            cursor = conn.cursor()
            
            # 改良されたセッション管理テーブル
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS cache_sessions (
                    session_id TEXT PRIMARY KEY,
                    user_id TEXT NOT NULL,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    last_accessed TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    completed_at TIMESTAMP NULL,
                    status TEXT DEFAULT 'pending',
                    total_rows INTEGER DEFAULT 0,
                    processed_rows INTEGER DEFAULT 0,
                    execution_time REAL DEFAULT NULL,
                    error_message TEXT NULL,
                    cleanup_policy TEXT DEFAULT 'delayed',
                    scheduled_cleanup_at TIMESTAMP NULL,
                    is_archived BOOLEAN DEFAULT FALSE,
                    metadata TEXT NULL  -- JSON形式で追加情報を保存
                )
            """)
            
            # セッション状態履歴テーブル（デバッグ・統計用）
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS session_state_history (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    session_id TEXT NOT NULL,
                    old_status TEXT,
                    new_status TEXT,
                    changed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    changed_by TEXT,  -- 'user', 'system', 'timeout' など
                    notes TEXT NULL,
                    FOREIGN KEY (session_id) REFERENCES cache_sessions (session_id)
                )
            """)
            
            # クリーンアップジョブテーブル
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS cleanup_jobs (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    session_id TEXT NOT NULL,
                    scheduled_at TIMESTAMP NOT NULL,
                    cleanup_type TEXT NOT NULL,  -- 'data', 'session', 'both'
                    status TEXT DEFAULT 'pending',  -- 'pending', 'completed', 'failed'
                    executed_at TIMESTAMP NULL,
                    error_message TEXT NULL,
                    FOREIGN KEY (session_id) REFERENCES cache_sessions (session_id)
                )
            """)
            
            # インデックス作成
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_cache_sessions_status ON cache_sessions (status)")
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_cache_sessions_user_id ON cache_sessions (user_id)")
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_cache_sessions_cleanup ON cache_sessions (scheduled_cleanup_at)")
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_cleanup_jobs_scheduled ON cleanup_jobs (scheduled_at, status)")
            
            conn.commit()
    
    def create_session(self, session_id: str, user_id: str, metadata: Optional[Dict] = None) -> bool:
        """セッション作成"""
        with self._lock:
            logger.info(f"---[CREATE_SESSION: START] (Session: {session_id})---")
            
            # 1. 同時実行制限チェック
            if not self._check_concurrent_limit():
                logger.warning(f"同時実行制限に達しました: {self._get_active_count()}/{self._max_concurrent_sessions}")
                return False
            
            # 2. メモリに登録
            session_info = {
                'session_id': session_id,
                'user_id': user_id,
                'status': SessionStatus.PENDING,
                'created_at': datetime.now(),
                'last_accessed': datetime.now(),
                'total_rows': 0,
                'processed_rows': 0,
                'metadata': metadata or {}
            }
            self._active_sessions[session_id] = session_info
            
            # 3. DBに同期
            self._sync_session_to_db(session_id)
            
            logger.info(f"セッション作成完了: {session_id}, ユーザー: {user_id}")
            return True
    
    def update_session_status(self, session_id: str, status: SessionStatus, 
                            error_message: Optional[str] = None,
                            changed_by: str = 'system') -> bool:
        """セッション状態更新"""
        with self._lock:
            if session_id not in self._active_sessions:
                logger.warning(f"セッションが見つかりません: {session_id}")
                return False
            
            old_status = self._active_sessions[session_id]['status']
            self._active_sessions[session_id]['status'] = status
            self._active_sessions[session_id]['last_accessed'] = datetime.now()
            
            if status in [SessionStatus.COMPLETED, SessionStatus.FAILED, 
                         SessionStatus.CANCELLED, SessionStatus.TIMEOUT]:
                self._active_sessions[session_id]['completed_at'] = datetime.now()
                
                # クリーンアップスケジュール
                self._schedule_cleanup(session_id, status)
            
            if error_message:
                self._active_sessions[session_id]['error_message'] = error_message
            
            # DB同期
            self._sync_session_to_db(session_id)
            
            # 状態変更履歴を記録
            self._record_state_change(session_id, old_status, status, changed_by)
            
            logger.info(f"セッション状態更新: {session_id} {old_status} → {status}")
            return True
    
    def _check_concurrent_limit(self) -> bool:
        """同時実行制限チェック"""
        # 定期的にDBと同期
        if time.time() - self._last_db_sync > self._sync_interval:
            self._sync_from_db()
        
        active_count = self._get_active_count()
        return active_count < self._max_concurrent_sessions
    
    def _get_active_count(self) -> int:
        """アクティブセッション数取得"""
        active_statuses = [SessionStatus.PENDING, SessionStatus.ACTIVE]
        return len([s for s in self._active_sessions.values() 
                   if s['status'] in active_statuses])
    
    def _sync_session_to_db(self, session_id: str):
        """メモリからDBにセッション同期"""
        if session_id not in self._active_sessions:
            return
        
        session = self._active_sessions[session_id]
        
        try:
            with sqlite3.connect(self.cache_db_path) as conn:
                cursor = conn.cursor()
                
                # セッション情報をUPSERT
                cursor.execute("""
                    INSERT OR REPLACE INTO cache_sessions 
                    (session_id, user_id, created_at, last_accessed, completed_at,
                     status, total_rows, processed_rows, execution_time, error_message,
                     cleanup_policy, scheduled_cleanup_at, metadata)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """, (
                    session_id,
                    session['user_id'],
                    session['created_at'],
                    session['last_accessed'],
                    session.get('completed_at'),
                    session['status'].value,
                    session['total_rows'],
                    session['processed_rows'],
                    session.get('execution_time'),
                    session.get('error_message'),
                    self._cleanup_policies.get(session['status'], SessionCleanupPolicy.DELAYED).value,
                    session.get('scheduled_cleanup_at'),
                    str(session['metadata']) if session['metadata'] else None
                ))
                conn.commit()
                
        except Exception as e:
            logger.error(f"DB同期エラー: {e}")
    
    def _sync_from_db(self):
        """DBからメモリに同期（起動時・定期同期）"""
        try:
            with sqlite3.connect(self.cache_db_path) as conn:
                cursor = conn.cursor()
                
                # アクティブなセッションを取得
                cursor.execute("""
                    SELECT session_id, user_id, created_at, last_accessed, 
                           status, total_rows, processed_rows, execution_time,
                           error_message, metadata
                    FROM cache_sessions 
                    WHERE status IN ('pending', 'active')
                """)
                
                db_sessions = cursor.fetchall()
                
                # メモリをクリアして再構築
                active_sessions = {}
                for row in db_sessions:
                    session_id = row[0]
                    active_sessions[session_id] = {
                        'session_id': session_id,
                        'user_id': row[1],
                        'created_at': datetime.fromisoformat(row[2]) if row[2] else datetime.now(),
                        'last_accessed': datetime.fromisoformat(row[3]) if row[3] else datetime.now(),
                        'status': SessionStatus(row[4]),
                        'total_rows': row[5] or 0,
                        'processed_rows': row[6] or 0,
                        'execution_time': row[7],
                        'error_message': row[8],
                        'metadata': eval(row[9]) if row[9] else {}
                    }
                
                self._active_sessions = active_sessions
                self._last_db_sync = time.time()
                
                logger.info(f"DB同期完了: {len(active_sessions)}個のアクティブセッション")
                
        except Exception as e:
            logger.error(f"DB同期エラー: {e}")
    
    def _schedule_cleanup(self, session_id: str, status: SessionStatus):
        """クリーンアップスケジュール"""
        policy = self._cleanup_policies.get(status, SessionCleanupPolicy.DELAYED)
        
        if policy == SessionCleanupPolicy.IMMEDIATE:
            # 即座実行
            self._execute_cleanup(session_id, 'both')
        elif policy == SessionCleanupPolicy.DELAYED:
            # 遅延実行をスケジュール
            delay = self._cleanup_delays.get(status, timedelta(minutes=30))
            scheduled_at = datetime.now() + delay
            
            self._active_sessions[session_id]['scheduled_cleanup_at'] = scheduled_at
            
            # クリーンアップジョブをDBに登録
            try:
                with sqlite3.connect(self.cache_db_path) as conn:
                    cursor = conn.cursor()
                    cursor.execute("""
                        INSERT INTO cleanup_jobs 
                        (session_id, scheduled_at, cleanup_type)
                        VALUES (?, ?, ?)
                    """, (session_id, scheduled_at, 'both'))
                    conn.commit()
            except Exception as e:
                logger.error(f"クリーンアップジョブ登録エラー: {e}")
    
    def _execute_cleanup(self, session_id: str, cleanup_type: str = 'both'):
        """クリーンアップ実行"""
        logger.info(f"クリーンアップ実行: {session_id} ({cleanup_type})")
        
        try:
            if cleanup_type in ['data', 'both']:
                # キャッシュデータテーブルを削除
                self._cleanup_cache_data(session_id)
            
            if cleanup_type in ['session', 'both']:
                # セッション情報を削除（またはアーカイブ）
                self._cleanup_session_info(session_id)
            
        except Exception as e:
            logger.error(f"クリーンアップエラー: {session_id}, {e}")
    
    def _cleanup_cache_data(self, session_id: str):
        """キャッシュデータの削除"""
        table_name = session_id
        try:
            with sqlite3.connect(self.cache_db_path) as conn:
                cursor = conn.cursor()
                cursor.execute(f"DROP TABLE IF EXISTS {table_name}")
                conn.commit()
        except Exception as e:
            logger.error(f"キャッシュテーブル削除エラー: {e}")
    
    def _cleanup_session_info(self, session_id: str):
        """セッション情報の削除"""
        # メモリから削除
        self._active_sessions.pop(session_id, None)
        
        # DBからも削除（本当に削除するかアーカイブするかは設定による）
        try:
            with sqlite3.connect(self.cache_db_path) as conn:
                cursor = conn.cursor()
                cursor.execute("DELETE FROM cache_sessions WHERE session_id = ?", (session_id,))
                conn.commit()
        except Exception as e:
            logger.error(f"セッション情報削除エラー: {e}")
    
    def _record_state_change(self, session_id: str, old_status: SessionStatus, 
                           new_status: SessionStatus, changed_by: str):
        """状態変更履歴記録"""
        try:
            with sqlite3.connect(self.cache_db_path) as conn:
                cursor = conn.cursor()
                cursor.execute("""
                    INSERT INTO session_state_history 
                    (session_id, old_status, new_status, changed_by)
                    VALUES (?, ?, ?, ?)
                """, (session_id, old_status.value, new_status.value, changed_by))
                conn.commit()
        except Exception as e:
            logger.error(f"状態変更履歴記録エラー: {e}")
    
    def run_scheduled_cleanup(self):
        """スケジュールされたクリーンアップの実行"""
        try:
            with sqlite3.connect(self.cache_db_path) as conn:
                cursor = conn.cursor()
                
                # 実行時刻が来たクリーンアップジョブを取得
                cursor.execute("""
                    SELECT id, session_id, cleanup_type 
                    FROM cleanup_jobs 
                    WHERE scheduled_at <= ? AND status = 'pending'
                """, (datetime.now(),))
                
                jobs = cursor.fetchall()
                
                for job_id, session_id, cleanup_type in jobs:
                    try:
                        self._execute_cleanup(session_id, cleanup_type)
                        
                        # ジョブ完了マーク
                        cursor.execute("""
                            UPDATE cleanup_jobs 
                            SET status = 'completed', executed_at = ?
                            WHERE id = ?
                        """, (datetime.now(), job_id))
                        
                    except Exception as e:
                        # ジョブ失敗マーク
                        cursor.execute("""
                            UPDATE cleanup_jobs 
                            SET status = 'failed', executed_at = ?, error_message = ?
                            WHERE id = ?
                        """, (datetime.now(), str(e), job_id))
                
                conn.commit()
                
        except Exception as e:
            logger.error(f"スケジュールクリーンアップエラー: {e}")
    
    def get_session_info(self, session_id: str) -> Optional[Dict]:
        """セッション情報取得"""
        with self._lock:
            return self._active_sessions.get(session_id)
    
    def get_user_sessions(self, user_id: str) -> List[Dict]:
        """ユーザーのセッション一覧取得"""
        with self._lock:
            return [s for s in self._active_sessions.values() if s['user_id'] == user_id]
    
    def cleanup_user_sessions(self, user_id: str):
        """ユーザーの全セッションクリーンアップ"""
        user_sessions = self.get_user_sessions(user_id)
        for session in user_sessions:
            self._execute_cleanup(session['session_id'], 'both')
