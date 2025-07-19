# app/services/sql_log_service.py

import uuid
from datetime import datetime
from typing import List, Dict, Any, Optional
from app.logger import get_logger
from app.services.query_executor import QueryExecutor
from app.services.log_handlers import OracleLogHandler, SqliteLogHandler, SnowflakeLogHandler
from app.config_simplified import get_settings
from app import __version__

logger = get_logger("SQLLogService")

class SQLLogService:
    def __init__(self, query_executor: QueryExecutor, log_storage_type: str = "oracle"):
        self.query_executor = query_executor
        self.log_storage_type = log_storage_type
        self.settings = get_settings()
        self.logger = get_logger(__name__)
        
        self.logger.info(f"SQLLogService初期化: log_storage_type={log_storage_type}")
        
        # ログハンドラの初期化
        if log_storage_type == "oracle":
            self.logger.info("Oracleログハンドラを初期化します")
            self.log_handler = OracleLogHandler(query_executor)
        elif log_storage_type == "sqlite":
            self.logger.info("SQLiteログハンドラを初期化します")
            # SQLite用のQueryExecutorを作成
            from app.services.connection_manager_sqlite import ConnectionManagerSQLite
            sqlite_connection_manager = ConnectionManagerSQLite()
            sqlite_query_executor = QueryExecutor(sqlite_connection_manager)
            self.log_handler = SqliteLogHandler(self.settings.sqlite_db_path)
        elif log_storage_type == "snowflake":
            self.logger.info("Snowflakeログハンドラを初期化します")
            # Snowflake用のQueryExecutorを作成
            from app.services.connection_manager_snowflake_log import ConnectionManagerSnowflakeLog
            snowflake_log_connection_manager = ConnectionManagerSnowflakeLog()
            snowflake_log_query_executor = QueryExecutor(snowflake_log_connection_manager)
            self.log_handler = SnowflakeLogHandler(snowflake_log_query_executor)
        else:
            raise ValueError(f"サポートされていないログストレージタイプ: {log_storage_type}")
        
        self.logger.info(f"ログハンドラ初期化完了: {type(self.log_handler).__name__}")

    def add_log_to_db(self, user_id: str, sql: str, execution_time: float, start_time: datetime, row_count: int, success: bool, error_message: Optional[str]):
        """ログハンドラを使用してログを追加"""
        try:
            self.logger.info(f"ログ記録を開始: storage_type={self.log_storage_type}, user_id={user_id}")
            self.log_handler.add_log(user_id, sql, execution_time, start_time, row_count, success, error_message)
            self.logger.info(f"ログ記録が完了しました: storage_type={self.log_storage_type}")
        except Exception as e:
            self.logger.error(f"{self.log_storage_type}へのログ記録中に予期せぬエラーが発生しました: {e}", exc_info=True)

    def get_logs(self, user_id: Optional[str] = None, limit: int = 100, offset: int = 0) -> Dict[str, Any]:
        """ログハンドラを使用してログを取得"""
        try:
            return self.log_handler.get_logs(user_id, limit, offset)
        except Exception as e:
            self.logger.error(f"{self.log_storage_type}からのログ取得中に予期せぬエラーが発生しました: {e}", exc_info=True)
            return {"logs": [], "total_count": 0}

    def clear_logs(self, user_id: Optional[str] = None):
        """ログハンドラを使用してログをクリア"""
        try:
            self.log_handler.clear_logs(user_id)
        except Exception as e:
            self.logger.error(f"{self.log_storage_type}のログクリア中に予期せぬエラーが発生しました: {e}", exc_info=True)