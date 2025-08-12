import sqlite3
import uuid
from datetime import datetime
from typing import Optional, Dict, Any
from pathlib import Path
from app.services.log_handlers.base import BaseLogHandler
from app.logger import get_logger
from app import __version__
from app.config_simplified import get_settings

class SqliteLogHandler(BaseLogHandler):
    """SQLiteデータベース用ログハンドラ"""
    
    def __init__(self, db_path: str):
        self.db_path = db_path
        self.logger = get_logger(__name__)
        self.settings = get_settings()
        self._init_db()

    def _init_db(self):
        """SQLiteデータベースとテーブルを初期化する"""
        try:
            # データベースディレクトリを作成
            db_dir = Path(self.db_path).parent
            db_dir.mkdir(parents=True, exist_ok=True)
            
            with sqlite3.connect(self.db_path) as conn:
                # Logスキーマ（SQLiteではスキーマは使用しないが、テーブル名に含める）
                conn.execute("""
                CREATE TABLE IF NOT EXISTS TOOL_LOG (
                    MK_DATE TEXT NOT NULL,
                    OPE_CODE TEXT NOT NULL,
                    TOOL_NAME TEXT NOT NULL,
                    OPTION_NO TEXT NOT NULL,
                    SYSTEM_WORKNUMBER REAL NOT NULL,
                    FROM_DATE TEXT NOT NULL,
                    TO_DATE TEXT NOT NULL,
                    TOOL_VER INTEGER NOT NULL
                )
                """)
                conn.commit()
                self.logger.info(f"SQLiteログデータベースを初期化しました: {self.db_path}")
        except Exception as e:
            self.logger.error(f"SQLiteログデータベースの初期化に失敗しました: {e}", exc_info=True)
            raise

    def add_log(self, user_id: str, sql: str, execution_time: float, start_time: datetime, row_count: int, success: bool, error_message: Optional[str] = None):
        """SQLiteにSQL実行ログを追加する"""
        try:
            end_time = datetime.now()
            mk_date = end_time.strftime('%Y%m%d%H%M%S')
            from_date = start_time.strftime('%Y%m%d%H%M%S')
            
            # バージョン番号の計算
            version_parts = __version__.split('.')
            version_number = int(version_parts[0]) * 100 + int(version_parts[1]) * 10 + int(version_parts[2])
            with sqlite3.connect(self.db_path) as conn:
                conn.execute(
                    """
                    INSERT INTO TOOL_LOG (
                        MK_DATE, OPE_CODE, TOOL_NAME, OPTION_NO,
                        SYSTEM_WORKNUMBER, FROM_DATE, TO_DATE, TOOL_VER
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                    """,
                    (
                        mk_date,
                        user_id,
                        self.settings.sqlite_tool_name,
                        sql,
                        int(execution_time),
                        from_date,
                        mk_date,
                        version_number,
                    ),
                )
                conn.commit()
        except Exception as e:
            self.logger.error(f"SQLiteへのログ記録中に予期せぬエラーが発生しました: {e}", exc_info=True)

    def get_logs(self, user_id: Optional[str] = None, limit: int = 100, offset: int = 0) -> Dict[str, Any]:
        """SQLiteからSQL実行ログを取得する"""
        try:
            with sqlite3.connect(self.db_path) as conn:
                conn.row_factory = sqlite3.Row
                
                # 総件数を取得
                if self.settings.sqlite_tool_name:
                    count_sql = "SELECT COUNT(*) as total FROM TOOL_LOG WHERE TOOL_NAME = ?"
                    count_params = [self.settings.sqlite_tool_name]
                else:
                    count_sql = "SELECT COUNT(*) as total FROM TOOL_LOG"
                    count_params = []
                if user_id:
                    if self.settings.sqlite_tool_name:
                        count_sql += " AND OPE_CODE = ?"
                    else:
                        count_sql += " WHERE OPE_CODE = ?" if 'WHERE' not in count_sql else " AND OPE_CODE = ?"
                    count_params.append(user_id)
                
                count_result = conn.execute(count_sql, count_params).fetchone()
                total_count = count_result['total'] if count_result else 0
                
                # ログデータを取得
                if self.settings.sqlite_tool_name:
                    data_sql = "SELECT MK_DATE, OPE_CODE, OPTION_NO, SYSTEM_WORKNUMBER FROM TOOL_LOG WHERE TOOL_NAME = ?"
                    data_params = [self.settings.sqlite_tool_name]
                else:
                    data_sql = "SELECT MK_DATE, OPE_CODE, OPTION_NO, SYSTEM_WORKNUMBER FROM TOOL_LOG"
                    data_params = []
                if user_id:
                    if self.settings.sqlite_tool_name:
                        data_sql += " AND OPE_CODE = ?"
                    else:
                        data_sql += " WHERE OPE_CODE = ?" if 'WHERE' not in data_sql else " AND OPE_CODE = ?"
                    data_params.append(user_id)
                
                data_sql += " ORDER BY MK_DATE DESC LIMIT ? OFFSET ?"
                data_params.extend([limit, offset])
                
                logs_result = conn.execute(data_sql, data_params).fetchall()
                
                logs_data = [{
                    "log_id": str(uuid.uuid4()),
                    "user_id": row['OPE_CODE'],
                    "sql": row['OPTION_NO'],
                    "execution_time": row['SYSTEM_WORKNUMBER'],
                    "row_count": None,  # テーブルに存在しないためNone
                    "success": True,     # テーブルに存在しないためデフォルト値
                    "error_message": None,  # テーブルに存在しないためNone
                    "timestamp": datetime.strptime(row['MK_DATE'], '%Y%m%d%H%M%S').isoformat()
                } for row in logs_result]
                
                return {"logs": logs_data, "total_count": total_count}
        except Exception as e:
            self.logger.error(f"SQLiteからのログ取得中に予期せぬエラーが発生しました: {e}", exc_info=True)
            return {"logs": [], "total_count": 0}

    def clear_logs(self, user_id: Optional[str] = None):
        """SQLiteのSQL実行ログをクリアする"""
        try:
            with sqlite3.connect(self.db_path) as conn:
                if self.settings.sqlite_tool_name:
                    if user_id:
                        conn.execute(
                            "DELETE FROM TOOL_LOG WHERE TOOL_NAME = ? AND OPE_CODE = ?",
                            (self.settings.sqlite_tool_name, user_id),
                        )
                    else:
                        conn.execute(
                            "DELETE FROM TOOL_LOG WHERE TOOL_NAME = ?",
                            (self.settings.sqlite_tool_name,),
                        )
                else:
                    if user_id:
                        conn.execute(
                            "DELETE FROM TOOL_LOG WHERE OPE_CODE = ?",
                            (user_id,),
                        )
                    else:
                        conn.execute("DELETE FROM TOOL_LOG")
                conn.commit()
        except Exception as e:
            self.logger.error(f"SQLiteのログクリア中に予期せぬエラーが発生しました: {e}", exc_info=True) 