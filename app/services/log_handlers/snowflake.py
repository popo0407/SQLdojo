import uuid
from datetime import datetime
from typing import Optional, Dict, Any
from app.services.log_handlers.base import BaseLogHandler
from app.services.query_executor import QueryExecutor
from app.logger import get_logger
from app import __version__

class SnowflakeLogHandler(BaseLogHandler):
    """Snowflakeデータベース用ログハンドラ"""
    
    def __init__(self, query_executor: QueryExecutor):
        self.query_executor = query_executor
        self.logger = get_logger(__name__)
        # Snowflake接続マネージャーを直接使用
        from app.services.connection_manager_snowflake_log import ConnectionManagerSnowflakeLog
        self.connection_manager = ConnectionManagerSnowflakeLog()

    def add_log(self, user_id: str, sql: str, execution_time: float, start_time: datetime, row_count: int, success: bool, error_message: Optional[str] = None):
        """SnowflakeにSQL実行ログを追加する"""
        try:
            self.logger.info(f"Snowflakeログ記録を開始: user_id={user_id}, success={success}")
            
            end_time = datetime.now()
            mk_date = end_time.strftime('%Y%m%d%H%M%S')
            from_date = start_time.strftime('%Y%m%d%H%M%S')
            
            truncated_sql = sql[:3900] if len(sql) > 3900 else sql
            self.logger.debug(f"SQL長: {len(sql)} -> {len(truncated_sql)}")
            
            version_parts = __version__.split('.')
            version_number = int(version_parts[0]) * 100 + int(version_parts[1]) * 10 + int(version_parts[2])

            log_sql = f"""
            INSERT INTO Log.TOOL_LOG (
                MK_DATE, OPE_CODE, TOOL_NAME, OPTION_NO, 
                SYSTEM_WORKNUMBER, FROM_DATE, TO_DATE, TOOL_VER, CONNSERVER
            ) VALUES (
                '{mk_date}', '{user_id}', 'SQLDOJOWEB', '{truncated_sql}',
                {int(execution_time)}, '{from_date}', '{mk_date}', {version_number}, '98'
            )
            """
            params = None
            
            self.logger.debug(f"実行SQL: {log_sql}")
            self.logger.debug(f"パラメータ: {params}")

            self.logger.info("Snowflakeクエリ実行を開始します")
            # 直接ConnectionManagerSnowflakeLogを使用
            result = self.connection_manager.execute_query(log_sql, params)
            self.logger.info(f"クエリ実行結果: success={result['success']}")
            
            if not result['success']:
                self.logger.error(f"Snowflakeへのログ記録に失敗しました: {result['error_message']}")
                self.logger.error(f"失敗の詳細: {result}")
            else:
                self.logger.info("Snowflakeへのログ記録が成功しました")
        except Exception as e:
            self.logger.error(f"Snowflakeへのログ記録中に予期せぬエラーが発生しました: {e}", exc_info=True)

    def get_logs(self, user_id: Optional[str] = None, limit: int = 100, offset: int = 0) -> Dict[str, Any]:
        """SnowflakeからSQL実行ログを取得する"""
        try:
            base_sql = "FROM Log.TOOL_LOG WHERE TOOL_NAME = 'SQLDOJOWEB'"
            if user_id:
                base_sql += f" AND OPE_CODE = '{user_id}'"

            count_sql = f"SELECT COUNT(*) as TOTAL_COUNT {base_sql}"
            count_result = self.connection_manager.execute_query(count_sql, None)
            total_count = count_result['data'][0]['TOTAL_COUNT'] if count_result['success'] and count_result['data'] else 0

            data_sql = f"""
            SELECT MK_DATE, OPE_CODE, OPTION_NO, SYSTEM_WORKNUMBER, CONNSERVER
            {base_sql} ORDER BY MK_DATE DESC OFFSET {offset} ROWS FETCH NEXT {limit} ROWS ONLY
            """
            
            logs_result = self.connection_manager.execute_query(data_sql, None)
            
            if not logs_result['success']:
                return {"logs": [], "total_count": 0}

            logs_data = [{
                "log_id": str(uuid.uuid4()),
                "user_id": row.get("OPE_CODE"),
                "sql": row.get("OPTION_NO"),
                "execution_time": row.get("SYSTEM_WORKNUMBER"),
                "connserver": row.get("CONNSERVER", "98"),  # CONNSERVERカラムを追加
                "row_count": None,  # テーブルに存在しないためNone
                "success": True,     # テーブルに存在しないためデフォルト値
                "error_message": None,  # テーブルに存在しないためNone
                "timestamp": datetime.strptime(row.get("MK_DATE"), '%Y%m%d%H%M%S').isoformat()
            } for row in logs_result['data']]

            return {"logs": logs_data, "total_count": total_count}
        except Exception as e:
            self.logger.error(f"Snowflakeからのログ取得中に予期せぬエラーが発生しました: {e}", exc_info=True)
            return {"logs": [], "total_count": 0} 