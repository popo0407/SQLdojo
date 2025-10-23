# -*- coding: utf-8 -*-
"""
キャッシュサービス
SQL実行結果をローカルにキャッシュする機能を提供
統一セッションライフサイクル管理を使用
"""
import sqlite3
import hashlib
import uuid
import time
import threading
from typing import Optional, Dict, Any, List, Tuple
from datetime import datetime, date, timedelta
from decimal import Decimal
from app.logger import get_logger
from app.config_simplified import settings

logger = get_logger("CacheService")

class CacheService:
    """ローカルキャッシュ管理サービス（改良ハイブリッド管理 - DB分離版）"""
    
    def __init__(self, session_db_path: str = "session_manager.db"):
        # セッション管理専用DBパス
        self.session_db_path = session_db_path
        # 設定値からバッチサイズを取得
        self.batch_size = settings.cache_batch_size
        self._lock = threading.Lock()
        self._active_sessions = {}  # セッションID -> セッション情報（メモリ復活）
        self._max_concurrent_sessions = 5
        self._last_sync_time = {}   # セッションID -> 最終同期時刻
        
        # バッチCOMMIT用の管理変数
        self._batch_connections = {}  # セッションID -> 専用DB接続（各セッション専用DB）
        self._batch_counters = {}     # セッションID -> 現在のバッチ内チャンク数
        
        self._init_session_db()
        self._restore_sessions_from_db()  # 起動時にDB→メモリ復旧

    def _get_session_db_path(self, session_id: str) -> str:
        """セッションIDから専用DBファイルパスを生成"""
        # cache_userid_timestamp_xxx -> cache_userid_timestamp_xxx.db
        return f"{session_id}.db"
    
    def _get_table_name_from_session_id(self, session_id: str) -> str:
        """セッションIDからテーブル名を生成（セッション専用DBでは固定名）"""
        # 各セッション専用DBでは "cache_data" という固定テーブル名を使用
        return "cache_data"
    
    def _init_session_db(self):
        """セッション管理専用DBの初期化"""
        with sqlite3.connect(self.session_db_path) as conn:
            cursor = conn.cursor()
            # セッション管理テーブル
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS cache_sessions (
                    session_id TEXT PRIMARY KEY,
                    user_id TEXT NOT NULL,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    last_accessed TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    status TEXT DEFAULT 'active',
                    total_rows INTEGER DEFAULT 0,
                    processed_rows INTEGER DEFAULT 0,
                    is_complete BOOLEAN DEFAULT FALSE,
                    execution_time REAL DEFAULT NULL
                )
            """)
            
            # execution_timeカラムが存在しない場合は追加
            try:
                cursor.execute("SELECT execution_time FROM cache_sessions LIMIT 1")
            except sqlite3.OperationalError:
                cursor.execute("ALTER TABLE cache_sessions ADD COLUMN execution_time REAL DEFAULT NULL")
            
            conn.commit()
            logger.info(f"セッション管理DB初期化完了: {self.session_db_path}")
    
    def _restore_sessions_from_db(self):
        """セッション管理DBからアクティブセッションをメモリに復旧"""
        with self._lock:
            logger.info("セッション管理DBからセッション情報を復旧中...")
            
            try:
                with sqlite3.connect(self.session_db_path) as conn:
                    cursor = conn.cursor()
                    cursor.execute("""
                        SELECT session_id, user_id, created_at, last_accessed, 
                               status, total_rows, processed_rows, is_complete, execution_time
                        FROM cache_sessions 
                        WHERE is_complete = 0 AND status = 'active'
                    """)
                    
                    restored_count = 0
                    now = datetime.now()
                    
                    for row in cursor.fetchall():
                        session_id = row[0]
                        
                        # 30分以上古いセッションはタイムアウト処理
                        created_at = datetime.fromisoformat(row[2]) if row[2] else now
                        if now - created_at > timedelta(minutes=30):
                            logger.warning(f"古いセッションをタイムアウト処理: {session_id}")
                            self._mark_session_timeout_in_db(session_id)
                            continue
                        
                        session_info = {
                            'user_id': row[1],
                            'created_at': created_at,
                            'last_accessed': datetime.fromisoformat(row[3]) if row[3] else now,
                            'status': row[4] or 'active',
                            'total_rows': row[5] or 0,
                            'processed_rows': row[6] or 0,
                            'is_complete': bool(row[7]),
                            'execution_time': row[8]
                        }
                        
                        self._active_sessions[session_id] = session_info
                        restored_count += 1
                    
                    logger.info(f"セッション復旧完了: {restored_count}件")
                    
            except Exception as e:
                logger.error(f"セッション復旧エラー: {e}")
    
    def _mark_session_timeout_in_db(self, session_id: str):
        """セッション管理DBでセッションをタイムアウト状態にマーク"""
        try:
            with sqlite3.connect(self.session_db_path) as conn:
                cursor = conn.cursor()
                cursor.execute("""
                    UPDATE cache_sessions 
                    SET status = 'timeout', is_complete = 1 
                    WHERE session_id = ?
                """, (session_id,))
                conn.commit()
        except Exception as e:
            logger.error(f"タイムアウトマークエラー: {e}")
    
    def generate_session_id(self, user_id: str) -> str:
        """セッションIDを生成（テーブル名と同じ形式にして変換を不要にする）"""
        from datetime import datetime
        # YYYYMMDDhhmmss形式のタイムスタンプを生成
        formatted_time = datetime.now().strftime('%Y%m%d%H%M%S')
        # 同一秒内の重複を避けるためのサフィックス（ミリ秒の下3桁）
        import time
        microseconds = int(time.time() * 1000) % 1000
        return f"cache_{user_id}_{formatted_time}_{microseconds:03d}"
    
    def create_cache_table(self, session_id: str, columns: List[str]) -> str:
        """セッション専用DBにキャッシュテーブルを作成"""
        # セッション専用DBパスを取得
        session_db_path = self._get_session_db_path(session_id)
        # テーブル名は固定
        table_name = self._get_table_name_from_session_id(session_id)
        
        with sqlite3.connect(session_db_path) as conn:
            cursor = conn.cursor()
            
            # カラム定義を作成（SQLite用にエスケープ）
            column_defs = []
            for col in columns:
                safe_col = col.replace('"', '""')
                column_defs.append(f'"{safe_col}" TEXT')
            
            create_sql = f"""
                CREATE TABLE IF NOT EXISTS {table_name} (
                    {', '.join(column_defs)}
                )
            """
            cursor.execute(create_sql)
            conn.commit()
        
        logger.info(f"セッション専用DBにテーブル作成: {session_db_path} / {table_name}")
        return table_name
    
    def insert_chunk(self, table_name: str, data: List[List[Any]], session_id: Optional[str] = None) -> int:
        """データチャンクを挿入（バッチCOMMIT対応 - セッション専用DB使用）"""
        if not data:
            return 0
        
        # セッションIDが必須
        if not session_id:
            raise ValueError("session_idは必須です（セッション専用DB使用のため）")
        
        # バッチCOMMIT方式で挿入
        return self._insert_chunk_with_batch(table_name, data, session_id)
    
    def _insert_chunk_with_batch(self, table_name: str, data: List[List[Any]], session_id: str) -> int:
        """バッチCOMMIT方式でデータチャンクを挿入（セッション専用DB使用）"""
        with self._lock:
            # セッション専用DBへの接続を取得または作成
            if session_id not in self._batch_connections:
                session_db_path = self._get_session_db_path(session_id)
                self._batch_connections[session_id] = sqlite3.connect(session_db_path)
                self._batch_counters[session_id] = 0
                logger.info(f"バッチCOMMIT開始: session={session_id}, db={session_db_path}, batch_size={self.batch_size}")
            
            conn = self._batch_connections[session_id]
            cursor = conn.cursor()
            
            # データを挿入
            placeholders = ','.join(['?' for _ in data[0]])
            insert_sql = f"INSERT INTO {table_name} VALUES ({placeholders})"
            cursor.executemany(insert_sql, data)
            
            # バッチカウンターを更新
            self._batch_counters[session_id] += 1
            
            # バッチサイズに達したらCOMMIT
            if self._batch_counters[session_id] >= self.batch_size:
                conn.commit()
                self._batch_counters[session_id] = 0
                logger.debug(f"バッチCOMMIT実行: session={session_id}, {self.batch_size}チャンク処理完了")
            
            return len(data)
    
    def finalize_batch_session(self, session_id: str) -> None:
        """セッション終了時の最終COMMIT"""
        with self._lock:
            if session_id in self._batch_connections:
                conn = self._batch_connections[session_id]
                
                # 残りのデータをCOMMIT
                if self._batch_counters[session_id] > 0:
                    conn.commit()
                    logger.info(f"最終バッチCOMMIT: session={session_id}, 残り{self._batch_counters[session_id]}チャンク")
                
                # 接続をクリーンアップ
                conn.close()
                del self._batch_connections[session_id]
                del self._batch_counters[session_id]
                logger.info(f"バッチセッション終了: session={session_id}")
    
    def get_session_info(self, session_id: str) -> Optional[Dict[str, Any]]:
        """セッション情報を取得（メモリ優先の高速アクセス - セッション管理DB使用）"""
        with self._lock:
            # メモリから取得（高速）
            if session_id in self._active_sessions:
                return self._active_sessions[session_id].copy()
            
            # メモリにない場合はセッション管理DBから取得（復旧のため）
            try:
                with sqlite3.connect(self.session_db_path) as conn:
                    cursor = conn.cursor()
                    cursor.execute("""
                        SELECT session_id, user_id, created_at, last_accessed, 
                               status, total_rows, processed_rows, is_complete, execution_time
                        FROM cache_sessions 
                        WHERE session_id = ?
                    """, (session_id,))
                    
                    row = cursor.fetchone()
                    if row:
                        return {
                            'session_id': row[0],
                            'user_id': row[1],
                            'created_at': row[2],
                            'last_accessed': row[3],
                            'status': row[4],
                            'total_rows': row[5],
                            'processed_rows': row[6],
                            'is_complete': bool(row[7]),
                            'execution_time': row[8] if len(row) > 8 else None
                        }
            except Exception as e:
                logger.error(f"セッション情報取得エラー: {e}")
                
        return None
    
    def update_session_progress(self, session_id: str, processed_rows: int, is_complete: bool = False, execution_time: Optional[float] = None):
        """セッションの進捗を更新（改良ハイブリッド管理）"""
        with self._lock:
            now = datetime.now()
            
            # メモリ更新（高速）
            if session_id in self._active_sessions:
                self._active_sessions[session_id]['processed_rows'] = processed_rows
                self._active_sessions[session_id]['last_accessed'] = now
                self._active_sessions[session_id]['is_complete'] = is_complete
                if execution_time is not None:
                    self._active_sessions[session_id]['execution_time'] = execution_time
            
            # 重要な変更の場合は即座にDB同期
            should_sync = is_complete or execution_time is not None
            
            if should_sync:
                try:
                    with sqlite3.connect(self.session_db_path) as conn:
                        cursor = conn.cursor()
                        if execution_time is not None:
                            cursor.execute("""
                                UPDATE cache_sessions 
                                SET processed_rows = ?, last_accessed = CURRENT_TIMESTAMP, is_complete = ?, execution_time = ?
                                WHERE session_id = ?
                            """, (processed_rows, is_complete, execution_time, session_id))
                        else:
                            cursor.execute("""
                                UPDATE cache_sessions 
                                SET processed_rows = ?, last_accessed = CURRENT_TIMESTAMP, is_complete = ?
                                WHERE session_id = ?
                            """, (processed_rows, is_complete, session_id))
                        conn.commit()
                        self._last_sync_time[session_id] = now
                except Exception as e:
                    logger.error(f"進捗DB同期エラー: {e}")
    
    def register_session(self, session_id: str, user_id: str, total_rows: int = 0) -> bool:
        """セッションを登録（改良ハイブリッド管理）"""
        with self._lock:
            logger.info(f"---[REGISTER_SESSION: START] (Session: {session_id})---")

            # メモリでの同時実行制限チェック（高速）
            memory_active_count = len([s for s in self._active_sessions.values() if s['status'] == 'active'])
            
            if memory_active_count >= self._max_concurrent_sessions:
                logger.warning(f"同時実行制限に達しました: {memory_active_count}/{self._max_concurrent_sessions}")
                logger.info(f"---[REGISTER_SESSION: END - BLOCKED] (Session: {session_id})---")
                return False
            
            # メモリに登録
            now = datetime.now()
            session_info = {
                'user_id': user_id,
                'created_at': now,
                'last_accessed': now,
                'status': 'active',
                'total_rows': total_rows,
                'processed_rows': 0,
                'is_complete': False,
                'execution_time': None
            }
            
            self._active_sessions[session_id] = session_info
            self._last_sync_time[session_id] = now
            
            # セッション管理DBに同期（即座同期）
            try:
                with sqlite3.connect(self.session_db_path) as conn:
                    cursor = conn.cursor()
                    cursor.execute("""
                        INSERT INTO cache_sessions 
                        (session_id, user_id, total_rows, processed_rows, status, is_complete)
                        VALUES (?, ?, ?, 0, 'active', 0)
                    """, (session_id, user_id, total_rows))
                    conn.commit()
                
                logger.info(f"セッション登録完了: {session_id}, ユーザー: {user_id}")
                logger.info(f"---[REGISTER_SESSION: END - SUCCESS] (Session: {session_id})---")
                return True
                
            except Exception as e:
                # DB登録失敗時はメモリからも削除
                self._active_sessions.pop(session_id, None)
                self._last_sync_time.pop(session_id, None)
                logger.error(f"セッション登録エラー: {e}")
                return False

    def complete_active_session(self, session_id: str):
        """アクティブセッションを完了状態にする（改良ハイブリッド管理）"""
        with self._lock:
            logger.info(f"---[COMPLETE_SESSION: START] (Session: {session_id})---")

            # メモリ更新（高速）
            if session_id in self._active_sessions:
                self._active_sessions[session_id]['status'] = 'completed'
                self._active_sessions[session_id]['is_complete'] = True
                self._active_sessions[session_id]['last_accessed'] = datetime.now()
                # 完了後も少し保持してフロントエンドのステータス確認に対応
                self._active_sessions[session_id]['completed_at'] = datetime.now()
                
                logger.info(f"メモリセッション完了: {session_id}")
            else:
                logger.warning(f"メモリにセッションが見つかりません: {session_id}")

            # DBに反映（遅延同期可能、競合状態を回避）
            try:
                with sqlite3.connect(self.session_db_path) as conn:
                    cursor = conn.cursor()
                    
                    # 現在の状態を確認
                    cursor.execute("""
                        SELECT is_complete, status 
                        FROM cache_sessions 
                        WHERE session_id = ?
                    """, (session_id,))
                    current = cursor.fetchone()
                    
                    if current:
                        current_complete, current_status = current
                        if current_complete == 1 and current_status == 'completed':
                            # 既に完了済み（高速処理による重複呼び出し）
                            logger.debug(f"DBセッションは既に完了済み: {session_id}")
                        else:
                            # 更新が必要な場合のみ実行
                            cursor.execute("""
                                UPDATE cache_sessions 
                                SET is_complete = 1, status = 'completed'
                                WHERE session_id = ?
                            """, (session_id,))
                            conn.commit()
                            logger.info(f"DBセッション完了: {session_id}")
                    else:
                        logger.warning(f"DBでセッションが見つかりません: {session_id}")
                    
            except Exception as e:
                logger.error(f"セッション完了エラー: {e}")
            
            logger.info(f"---[COMPLETE_SESSION: END] (Session: {session_id})---")
    
    def cleanup_session(self, session_id: str):
        """セッションをクリーンアップ（改良ハイブリッド管理）"""
        with self._lock:
            logger.info(f"---[CLEANUP_SESSION: START] (Session: {session_id})---")
            
            # 事前状態を記録
            was_in_memory = session_id in self._active_sessions
            db_exists = False
            
            # DBでの存在確認
            try:
                with sqlite3.connect(self.cache_db_path) as conn:
                    cursor = conn.cursor()
                    cursor.execute("SELECT COUNT(*) FROM cache_sessions WHERE session_id = ?", (session_id,))
                    db_exists = cursor.fetchone()[0] > 0
            except Exception as e:
                logger.error(f"DB存在確認エラー: {e}")
            
            logger.info(f"クリーンアップ対象: メモリ={was_in_memory}, DB={db_exists}")
            
            # メモリからセッション削除
            if was_in_memory:
                session_info = self._active_sessions.pop(session_id, None)
                logger.info(f"メモリからセッション削除: {session_id}")
            else:
                logger.warning(f"メモリにセッションが見つかりません: {session_id}")
            
            # 同期時刻情報も削除
            self._last_sync_time.pop(session_id, None)
            
            # セッション専用DBファイルを削除
            session_db_path = self._get_session_db_path(session_id)
            try:
                import os
                if os.path.exists(session_db_path):
                    # バッチ接続がある場合はクローズ
                    if session_id in self._batch_connections:
                        self._batch_connections[session_id].close()
                        del self._batch_connections[session_id]
                        del self._batch_counters[session_id]
                    
                    os.remove(session_db_path)
                    logger.info(f"セッション専用DBファイル削除: {session_db_path}")
                else:
                    logger.warning(f"セッション専用DBファイルが存在しません: {session_db_path}")
            except Exception as e:
                logger.error(f"セッション専用DBファイル削除エラー: {e}")
            
            # セッション管理DBからセッション情報を削除
            try:
                with sqlite3.connect(self.session_db_path) as conn:
                    cursor = conn.cursor()
                    cursor.execute("DELETE FROM cache_sessions WHERE session_id = ?", (session_id,))
                    rows_deleted = cursor.rowcount
                    conn.commit()
                    
                    if rows_deleted > 0:
                        logger.info(f"DBセッション情報削除: {session_id} ({rows_deleted}行)")
                    else:
                        logger.warning(f"DBにセッション情報が見つかりません: {session_id}")
                    
            except Exception as e:
                logger.error(f"セッション情報削除エラー: {e}")
            
            # 現在のアクティブセッション数
            active_count = len([s for s in self._active_sessions.values() if s.get('status') == 'active'])
            logger.info(f"---[CLEANUP_SESSION: END] (Session: {session_id}) アクティブセッション数: {active_count}---")
    
    def error_session(self, session_id: str, error_message: str):
        """セッションをエラー状態にマーク（改良ハイブリッド管理）"""
        with self._lock:
            logger.info(f"---[ERROR_SESSION: START] (Session: {session_id})---")
            
            # メモリ更新
            if session_id in self._active_sessions:
                self._active_sessions[session_id]['status'] = 'error'
                self._active_sessions[session_id]['is_complete'] = True
                self._active_sessions[session_id]['last_accessed'] = datetime.now()
                logger.info(f"メモリセッションエラー設定: {session_id}")
            
            # セッション管理DBに同期（即座同期）
            try:
                with sqlite3.connect(self.session_db_path) as conn:
                    cursor = conn.cursor()
                    cursor.execute("""
                        UPDATE cache_sessions 
                        SET status = 'error', is_complete = 1, last_accessed = CURRENT_TIMESTAMP
                        WHERE session_id = ?
                    """, (session_id,))
                    rows_affected = cursor.rowcount
                    conn.commit()
                    
                    if rows_affected > 0:
                        logger.info(f"DBセッションエラー設定: {session_id}")
                    else:
                        logger.warning(f"DBでセッションが見つかりません: {session_id}")
                        
            except Exception as e:
                logger.error(f"セッションエラー設定失敗: {e}")
            
            logger.error(f"セッションエラー: {session_id} - {error_message}")
            logger.info(f"---[ERROR_SESSION: END] (Session: {session_id})---")

    def cleanup_user_sessions(self, user_id: str):
        """ユーザーの全セッションをクリーンアップ（効率化版）"""
        logger.info(f"ユーザー({user_id})の全セッションクリーンアップを開始します。")
        try:
            import os
            # セッション管理DBから削除対象のセッションIDを取得
            with sqlite3.connect(self.session_db_path, timeout=10.0) as conn:
                cursor = conn.cursor()
                cursor.execute("SELECT session_id FROM cache_sessions WHERE user_id = ?", (user_id,))
                sessions_to_delete = cursor.fetchall()
                
                if not sessions_to_delete:
                    logger.info(f"ユーザー({user_id})に削除対象のセッションはありません。")
                    return

                logger.info(f"ユーザー({user_id})の{len(sessions_to_delete)}件のセッションを削除します。")

                # 各セッションの専用DBファイルを削除
                for (session_id,) in sessions_to_delete:
                    session_db_path = self._get_session_db_path(session_id)
                    try:
                        if os.path.exists(session_db_path):
                            # バッチ接続がある場合はクローズ
                            if session_id in self._batch_connections:
                                self._batch_connections[session_id].close()
                                del self._batch_connections[session_id]
                                del self._batch_counters[session_id]
                            
                            os.remove(session_db_path)
                            logger.debug(f"セッション専用DBファイル削除: {session_db_path}")
                    except Exception as e:
                        logger.error(f"セッション専用DBファイル削除エラー ({session_id}): {e}")

                # セッション管理DBからセッション情報を一括削除
                cursor.execute("DELETE FROM cache_sessions WHERE user_id = ?", (user_id,))
                conn.commit()
                logger.info(f"ユーザー({user_id})のクリーンアップが完了しました。")

        except sqlite3.Error as e:
            # sqlite3.OperationalError: database is locked などのエラーを捕捉
            logger.error(f"ユーザー({user_id})のセッションクリーンアップ中にSQLiteエラーが発生しました: {e}", exc_info=True)
            raise
        except Exception as e:
            logger.error(f"ユーザー({user_id})のセッションクリーンアップ中に予期せぬエラーが発生しました: {e}", exc_info=True)
            raise
    
    def _build_extended_filter_conditions(self, extended_filters: List, params: List) -> List[str]:
        """拡張フィルター条件からWHERE句の条件文を構築"""
        if not extended_filters:
            return []
        
        conditions = []
        
        for filter_condition in extended_filters:
            # Pydanticモデルの場合は直接アトリビュートアクセス、辞書の場合は.get()メソッド
            if hasattr(filter_condition, 'column_name'):
                column_name = filter_condition.column_name
                filter_type = filter_condition.filter_type
            else:
                column_name = filter_condition.get('column_name')
                filter_type = filter_condition.get('filter_type')
            
            if not column_name or not filter_type:
                continue
                
            safe_col = column_name.replace('"', '""')
            
            if filter_type == 'exact':
                # 完全一致フィルター
                if hasattr(filter_condition, 'values'):
                    values = filter_condition.values
                else:
                    values = filter_condition.get('values', [])
                    
                if values:
                    placeholders = ','.join(['?' for _ in values])
                    condition = f'"{safe_col}" IN ({placeholders})'
                    conditions.append(condition)
                    params.extend(values)
                    
            elif filter_type == 'range':
                # 範囲フィルター
                if hasattr(filter_condition, 'min_value'):
                    min_value = filter_condition.min_value
                    max_value = filter_condition.max_value
                    data_type = filter_condition.data_type
                else:
                    min_value = filter_condition.get('min_value')
                    max_value = filter_condition.get('max_value')
                    data_type = filter_condition.get('data_type', 'string')
                
                if min_value is not None and max_value is not None:
                    if data_type in ['date', 'datetime']:
                        condition = f'"{safe_col}" BETWEEN ? AND ?'
                        conditions.append(condition)
                        params.extend([min_value, max_value])
                    elif data_type == 'number':
                        condition = f'CAST("{safe_col}" AS REAL) BETWEEN ? AND ?'
                        conditions.append(condition)
                        params.extend([float(min_value), float(max_value)])
                elif min_value is not None:
                    if data_type in ['date', 'datetime']:
                        condition = f'"{safe_col}" >= ?'
                        conditions.append(condition)
                        params.append(min_value)
                    elif data_type == 'number':
                        condition = f'CAST("{safe_col}" AS REAL) >= ?'
                        conditions.append(condition)
                        params.append(float(min_value))
                elif max_value is not None:
                    if data_type in ['date', 'datetime']:
                        condition = f'"{safe_col}" <= ?'
                        conditions.append(condition)
                        params.append(max_value)
                    elif data_type == 'number':
                        condition = f'CAST("{safe_col}" AS REAL) <= ?'
                        conditions.append(condition)
                        params.append(float(max_value))
                        
            elif filter_type == 'text_search':
                # 部分一致検索フィルター
                if hasattr(filter_condition, 'search_text'):
                    search_text = filter_condition.search_text
                    case_sensitive = filter_condition.case_sensitive
                else:
                    search_text = filter_condition.get('search_text')
                    case_sensitive = filter_condition.get('case_sensitive', False)
                
                if search_text:
                    if case_sensitive:
                        condition = f'"{safe_col}" LIKE ?'
                    else:
                        condition = f'LOWER("{safe_col}") LIKE LOWER(?)'
                    conditions.append(condition)
                    params.append(f'%{search_text}%')
        
        return conditions

    def get_cached_data(self, session_id: str, page: int = 1, page_size: int = None, 
                        filters: Optional[Dict] = None, extended_filters: Optional[List] = None, 
                        sort_by: Optional[str] = None, sort_order: str = 'ASC') -> Dict[str, Any]:
        """キャッシュされたデータを取得"""
        # page_sizeが指定されていない場合は設定ファイルの値を使用
        if page_size is None:
            page_size = settings.default_page_size
            
        # セッション専用DBに接続してデータを取得
        session_db_path = self._get_session_db_path(session_id)
        table_name = self._get_table_name_from_session_id(session_id)
        
        with sqlite3.connect(session_db_path) as conn:
            cursor = conn.cursor()
            
            # WHERE句を構築
            where_clause = ""
            params = []
            all_conditions = []
            
            # 従来のフィルター（後方互換性）
            if filters:
                for col, values in filters.items():
                    if values and len(values) > 0:  # 空でない配列の場合のみ処理
                        safe_col = col.replace('"', '""')
                        # IN句を使用して複数の値に対応
                        placeholders = ','.join(['?' for _ in values])
                        condition = f'"{safe_col}" IN ({placeholders})'
                        all_conditions.append(condition)
                        params.extend(values)
            
            # 拡張フィルター
            if extended_filters:
                extended_conditions = self._build_extended_filter_conditions(extended_filters, params)
                all_conditions.extend(extended_conditions)
                
            if all_conditions:
                where_clause = f"WHERE {' AND '.join(all_conditions)}"
            
            # ORDER BY句を構築
            order_clause = ""
            if sort_by:
                safe_col = sort_by.replace('"', '""')
                order_clause = f"ORDER BY \"{safe_col}\" {sort_order}"
            
            # 総件数を取得
            count_sql = f"SELECT COUNT(*) FROM {table_name} {where_clause}"
            cursor.execute(count_sql, params)
            total_count = cursor.fetchone()[0]
            
            # データを取得
            offset = (page - 1) * page_size
            data_sql = f"""
                SELECT * FROM {table_name} 
                {where_clause} 
                {order_clause}
                LIMIT ? OFFSET ?
            """
            cursor.execute(data_sql, params + [page_size, offset])
            
            # カラム名を取得
            columns = [description[0] for description in cursor.description]
            rows = cursor.fetchall()
            
            return {
                'data': [list(row) for row in rows],
                'columns': columns,
                'total_count': total_count,
                'page': page,
                'page_size': page_size,
                'total_pages': (total_count + page_size - 1) // page_size
            }
    
    def validate_data_types(self, data: List[List[Any]]) -> Tuple[bool, Optional[str]]:
        """データ型を検証"""
        for row_idx, row in enumerate(data):
            for col_idx, value in enumerate(row):
                if value is None:
                    continue
                
                # VARIANT, OBJECT, ARRAY型のチェック（文字列として検出）
                if isinstance(value, str):
                    if value.startswith('{') and value.endswith('}'):  # JSON形式
                        return False, f"行{row_idx + 1}, 列{col_idx + 1}: VARIANT/OBJECT型はサポートされていません"
                    if value.startswith('[') and value.endswith(']'):  # 配列形式
                        return False, f"行{row_idx + 1}, 列{col_idx + 1}: ARRAY型はサポートされていません"
                
                # その他の型変換
                if isinstance(value, (datetime, date)):
                    data[row_idx][col_idx] = value.isoformat()
                elif isinstance(value, Decimal):
                    data[row_idx][col_idx] = float(value)
                elif not isinstance(value, (str, int, float, bool)):
                    data[row_idx][col_idx] = str(value)
        
        return True, None

    def get_unique_values(self, session_id: str, column_name: str, limit: int = 100, 
                         filters: Optional[Dict] = None, extended_filters: Optional[List] = None) -> dict:
        """キャッシュテーブルから指定カラムのユニーク値（最大limit件）を取得（連鎖フィルター対応）"""
        # セッション専用DBに接続
        session_db_path = self._get_session_db_path(session_id)
        table_name = self._get_table_name_from_session_id(session_id)
        
        logger.info(f"ユニーク値取得: session_id={session_id}, db={session_db_path}, column={column_name}")

        with sqlite3.connect(session_db_path) as conn:
            cursor = conn.cursor()
            safe_col = column_name.replace('"', '""')
            
            # WHERE句を構築（連鎖フィルター用）
            where_clause = ""
            params = []
            all_conditions = []
            
            # 従来のフィルター（後方互換性）
            if filters:
                for col, values in filters.items():
                    if values and len(values) > 0:  # 空でない配列の場合のみ処理
                        safe_filter_col = col.replace('"', '""')
                        # IN句を使用して複数の値に対応
                        placeholders = ','.join(['?' for _ in values])
                        all_conditions.append(f'"{safe_filter_col}" IN ({placeholders})')
                        params.extend(values)
            
            # 拡張フィルター
            if extended_filters:
                extended_conditions = self._build_extended_filter_conditions(extended_filters, params)
                all_conditions.extend(extended_conditions)
                
            if all_conditions:
                where_clause = f"WHERE {' AND '.join(all_conditions)}"
            
            # ユニーク値を取得
            sql = f'SELECT DISTINCT "{safe_col}" FROM {table_name} {where_clause} LIMIT ?'
            cursor.execute(sql, params + [limit + 1])  # +1で上限超過判定
            values = [row[0] for row in cursor.fetchall()]
            is_truncated = len(values) > limit
            values = values[:limit]
            
            # 総ユニーク件数も取得
            count_sql = f'SELECT COUNT(DISTINCT "{safe_col}") FROM {table_name} {where_clause}'
            cursor.execute(count_sql, params)
            total_count = cursor.fetchone()[0]
            
            return {
                'values': values,
                'total_count': total_count,
                'is_truncated': is_truncated
            }