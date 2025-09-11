# -*- coding: utf-8 -*-
"""
キャッシュサービス
SQL実行結果をローカルにキャッシュする機能を提供
"""
import sqlite3
import hashlib
import uuid
import time
import threading
from typing import Optional, Dict, Any, List, Tuple
from datetime import datetime, date
from decimal import Decimal
from app.logger import get_logger
from app.config_simplified import settings

logger = get_logger("CacheService")

class CacheService:
    """ローカルキャッシュ管理サービス"""
    
    def __init__(self, cache_db_path: str = "cache_data.db"):
        self.cache_db_path = cache_db_path
        self._lock = threading.Lock()
        self._active_sessions = {}  # セッションID -> セッション情報
        self._max_concurrent_sessions = 5
        self._init_cache_db()

    def _get_table_name_from_session_id(self, session_id: str) -> str:
        """セッションIDからテーブル名を生成"""
        parts = session_id.split('_')
        if len(parts) >= 4 and parts[0] == 'cache':
            # 新形式: cache_hint0530_20250911231732_130
            # この場合、テーブル名はセッションIDと同じ
            table_name = session_id
        elif len(parts) >= 3:
            # 旧形式: user_timestamp_xxx
            user_id = parts[0]
            timestamp = parts[1]
            dt = datetime.fromtimestamp(int(timestamp))
            formatted_time = dt.strftime('%Y%m%d%H%M%S')
            table_name = f"cache_{user_id}_{formatted_time}"
        else:
            table_name = f"cache_{session_id.replace('-', '_')}"
        return table_name
    
    def _init_cache_db(self):
        """キャッシュDBの初期化"""
        with sqlite3.connect(self.cache_db_path) as conn:
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
        """キャッシュテーブルを作成"""
        # セッションIDがそのままテーブル名として使用可能になった
        table_name = session_id
        
        with sqlite3.connect(self.cache_db_path) as conn:
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
        
        return table_name
    
    def insert_chunk(self, table_name: str, data: List[List[Any]]) -> int:
        """データチャンクを挿入"""
        if not data:
            return 0
        
        with sqlite3.connect(self.cache_db_path) as conn:
            cursor = conn.cursor()
            
            # プレースホルダーを作成
            placeholders = ','.join(['?' for _ in data[0]])
            insert_sql = f"INSERT INTO {table_name} VALUES ({placeholders})"
            
            cursor.executemany(insert_sql, data)
            conn.commit()
            
            return len(data)
    
    def get_session_info(self, session_id: str) -> Optional[Dict[str, Any]]:
        """セッション情報を取得"""
        with sqlite3.connect(self.cache_db_path) as conn:
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
        return None
    
    def update_session_progress(self, session_id: str, processed_rows: int, is_complete: bool = False, execution_time: Optional[float] = None):
        """セッションの進捗を更新"""
        with sqlite3.connect(self.cache_db_path) as conn:
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
    
    def register_session(self, session_id: str, user_id: str, total_rows: int = 0) -> bool:
        """セッションを登録（同時実行制限チェック付き）"""
        with self._lock:
            logger.info(f"---[REGISTER_SESSION: START] (Session: {session_id})---")
            logger.info(f"現在のactive_sessions ({len(self._active_sessions)}件): {list(self._active_sessions.keys())}")

            # DB上のアクティブセッション数をチェック（is_complete=0のもののみ）
            try:
                with sqlite3.connect(self.cache_db_path) as conn:
                    cursor = conn.cursor()
                    cursor.execute("SELECT COUNT(*) FROM cache_sessions WHERE is_complete = 0")
                    db_active_count = cursor.fetchone()[0]
                    
                    # メモリ上のアクティブセッション数もチェック
                    memory_active_count = len([s for s in self._active_sessions.values() if s['status'] == 'active'])
                    
                    # より大きい方を採用（整合性を保つため）
                    active_count = max(db_active_count, memory_active_count)
                    
                    logger.info(f"DB上のアクティブセッション数: {db_active_count}, メモリ上のアクティブセッション数: {memory_active_count}")
                    
                    if active_count >= self._max_concurrent_sessions:
                        logger.warning(f"同時実行制限に達しました: {active_count}/{self._max_concurrent_sessions}")
                        logger.info(f"---[REGISTER_SESSION: END - BLOCKED] (Session: {session_id})---")
                        return False
                        
            except Exception as e:
                logger.error(f"DBアクティブセッション数チェックエラー: {e}")
                # エラーが発生した場合はメモリ上のチェックのみを使用
                active_count = len([s for s in self._active_sessions.values() if s['status'] == 'active'])
                if active_count >= self._max_concurrent_sessions:
                    logger.warning(f"同時実行制限に達しました: {active_count}/{self._max_concurrent_sessions}")
                    logger.info(f"---[REGISTER_SESSION: END - BLOCKED] (Session: {session_id})---")
                    return False
            
            # セッションを登録
            with sqlite3.connect(self.cache_db_path) as conn:
                cursor = conn.cursor()
                cursor.execute("""
                    INSERT INTO cache_sessions 
                    (session_id, user_id, total_rows, processed_rows, status, is_complete)
                    VALUES (?, ?, ?, 0, 'active', 0)
                """, (session_id, user_id, total_rows))
                conn.commit()
            
            self._active_sessions[session_id] = {
                'user_id': user_id,
                'status': 'active',
                'total_rows': total_rows,
                'processed_rows': 0
            }
            
            logger.info(f"セッション登録完了: {session_id}, ユーザー: {user_id}")
            logger.info(f"---[REGISTER_SESSION: END - SUCCESS] (Session: {session_id})---")
            return True

    def complete_active_session(self, session_id: str):
        """メモリ上のアクティブセッションを完了状態にする（DBのキャッシュは消さない）"""
        with self._lock:
            logger.info(f"---[COMPLETE_SESSION: START] (Session: {session_id})---")
            logger.info(f"削除前のactive_sessions ({len(self._active_sessions)}件): {list(self._active_sessions.keys())}")

            session = self._active_sessions.pop(session_id, None)

            if session:
                logger.info(f"アクティブセッションを完了しました: {session_id}")
            else:
                logger.warning(f"完了しようとしたセッションが見つかりません（既に削除済みか、存在しませんでした）: {session_id}")
            
            logger.info(f"削除後のactive_sessions ({len(self._active_sessions)}件): {list(self._active_sessions.keys())}")
            logger.info(f"---[COMPLETE_SESSION: END] (Session: {session_id})---")
    
    def cleanup_session(self, session_id: str):
        """セッションをクリーンアップ"""
        with self._lock:
            logger.info(f"---[CLEANUP_SESSION: START] (Session: {session_id})---")
            logger.info(f"クリーンアップ前のactive_sessions ({len(self._active_sessions)}件): {list(self._active_sessions.keys())}")
            
            self._active_sessions.pop(session_id, None)
            
            logger.info(f"クリーンアップ後のactive_sessions ({len(self._active_sessions)}件): {list(self._active_sessions.keys())}")
            
            # セッションIDがそのままテーブル名
            table_name = session_id
            
            # キャッシュテーブルを削除
            try:
                with sqlite3.connect(self.cache_db_path) as conn:
                    cursor = conn.cursor()
                    cursor.execute(f"DROP TABLE IF EXISTS {table_name}")
                    conn.commit()
            except Exception as e:
                logger.error(f"キャッシュテーブル削除エラー: {e}")
            
            # セッション情報を削除
            with sqlite3.connect(self.cache_db_path) as conn:
                cursor = conn.cursor()
                cursor.execute("DELETE FROM cache_sessions WHERE session_id = ?", (session_id,))
                conn.commit()
            
            logger.info(f"---[CLEANUP_SESSION: END] (Session: {session_id})---")

    def cleanup_user_sessions(self, user_id: str):
        """ユーザーの全セッションをクリーンアップ（効率化版）"""
        logger.info(f"ユーザー({user_id})の全セッションクリーンアップを開始します。")
        try:
            # timeoutを設定してロック待ちの時間を制限
            with sqlite3.connect(self.cache_db_path, timeout=10.0) as conn:
                cursor = conn.cursor()
                
                # 削除対象のセッションIDを取得
                cursor.execute("SELECT session_id FROM cache_sessions WHERE user_id = ?", (user_id,))
                sessions_to_delete = cursor.fetchall()
                
                if not sessions_to_delete:
                    logger.info(f"ユーザー({user_id})に削除対象のセッションはありません。")
                    return

                logger.info(f"ユーザー({user_id})の{len(sessions_to_delete)}件のセッションを削除します。")

                for (session_id,) in sessions_to_delete:
                    # セッションIDがそのままテーブル名
                    table_name = session_id
                    
                    # キャッシュテーブルを削除
                    logger.debug(f"テーブルを削除します: {table_name}")
                    cursor.execute(f"DROP TABLE IF EXISTS {table_name}")

                # セッション情報を一括削除
                logger.debug(f"cache_sessionsテーブルからユーザー({user_id})のレコードを削除します。")
                cursor.execute("DELETE FROM cache_sessions WHERE user_id = ?", (user_id,))
                
                conn.commit()
                logger.info(f"ユーザー({user_id})のDBクリーンアップが完了しました。")

            # メモリ上のアクティブセッション情報もクリア
            with self._lock:
                active_sessions_before = len(self._active_sessions)
                sessions_to_remove_from_memory = [
                    sid for sid, info in self._active_sessions.items() if info.get('user_id') == user_id
                ]
                for sid in sessions_to_remove_from_memory:
                    if sid in self._active_sessions:
                        del self._active_sessions[sid]
                active_sessions_after = len(self._active_sessions)
                logger.info(f"ユーザー({user_id})のメモリ上のセッションをクリアしました。({active_sessions_before} -> {active_sessions_after})")

        except sqlite3.Error as e:
            # sqlite3.OperationalError: database is locked などのエラーを捕捉
            logger.error(f"ユーザー({user_id})のセッションクリーンアップ中にSQLiteエラーが発生しました: {e}", exc_info=True)
            raise
        except Exception as e:
            logger.error(f"ユーザー({user_id})のセッションクリーンアップ中に予期せぬエラーが発生しました: {e}", exc_info=True)
            raise
    
    def get_cached_data(self, session_id: str, page: int = 1, page_size: int = None, 
                        filters: Optional[Dict] = None, sort_by: Optional[str] = None, 
                        sort_order: str = 'ASC') -> Dict[str, Any]:
        """キャッシュされたデータを取得"""
        # page_sizeが指定されていない場合は設定ファイルの値を使用
        if page_size is None:
            page_size = settings.default_page_size
            
        # セッションIDがそのままテーブル名
        table_name = session_id
        
        with sqlite3.connect(self.cache_db_path) as conn:
            cursor = conn.cursor()
            
            # WHERE句を構築
            where_clause = ""
            params = []
            if filters:
                conditions = []
                for col, values in filters.items():
                    if values and len(values) > 0:  # 空でない配列の場合のみ処理
                        safe_col = col.replace('"', '""')
                        # IN句を使用して複数の値に対応
                        placeholders = ','.join(['?' for _ in values])
                        conditions.append(f'"{safe_col}" IN ({placeholders})')
                        params.extend(values)
                if conditions:
                    where_clause = f"WHERE {' AND '.join(conditions)}"
            
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

    def get_unique_values(self, session_id: str, column_name: str, limit: int = 100, filters: Optional[Dict] = None) -> dict:
        """キャッシュテーブルから指定カラムのユニーク値（最大limit件）を取得（連鎖フィルター対応）"""
        # セッションIDからテーブル名を生成
        table_name = self._get_table_name_from_session_id(session_id)
        
        logger.info(f"ユニーク値取得: session_id={session_id}, table_name={table_name}, column={column_name}")

        with sqlite3.connect(self.cache_db_path) as conn:
            cursor = conn.cursor()
            safe_col = column_name.replace('"', '""')
            
            # WHERE句を構築（連鎖フィルター用）
            where_clause = ""
            params = []
            if filters:
                conditions = []
                for col, values in filters.items():
                    if values and len(values) > 0:  # 空でない配列の場合のみ処理
                        safe_filter_col = col.replace('"', '""')
                        # IN句を使用して複数の値に対応
                        placeholders = ','.join(['?' for _ in values])
                        conditions.append(f'"{safe_filter_col}" IN ({placeholders})')
                        params.extend(values)
                if conditions:
                    where_clause = f"WHERE {' AND '.join(conditions)}"
            
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