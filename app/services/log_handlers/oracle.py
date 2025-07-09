import uuid
from datetime import datetime
from typing import Optional, Dict, Any
from app.services.log_handlers.base import BaseLogHandler
from app.services.query_executor import QueryExecutor
from app.logger import get_logger
from app import __version__

class OracleLogHandler(BaseLogHandler):
    """Oracleデータベース用ログハンドラ"""
    
    def __init__(self, query_executor: QueryExecutor):
        self.query_executor = query_executor
        self.logger = get_logger(__name__)

    def add_log(self, user_id: str, sql: str, execution_time: float, start_time: datetime, row_count: int, success: bool, error_message: Optional[str] = None):
        """OracleにSQL実行ログを追加する"""
        try:
            end_time = datetime.now()
            mk_date = end_time.strftime('%Y%m%d%H%M%S')
            from_date = start_time.strftime('%Y%m%d%H%M%S')
            
            # SQLが長すぎる場合は切り詰める
            truncated_sql = sql[:3900] if len(sql) > 3900 else sql
            
            # バージョン番号の計算
            version_parts = __version__.split('.')
            version_number = int(version_parts[0]) * 100 + int(version_parts[1]) * 10 + int(version_parts[2])

            log_sql = f"""
            INSERT INTO Log.TOOL_LOG (
                MK_DATE, OPE_CODE, TOOL_NAME, OPTION_NO, 
                SYSTEM_WORKNUMBER, FROM_DATE, TO_DATE, TOOL_VER
            ) VALUES (
                '{mk_date}', '{user_id}', 'SQLDOJOWEB', '{truncated_sql}',
                {int(execution_time)}, '{from_date}', '{mk_date}', {version_number}
            )
            """
            params = None

            result = self.query_executor.execute_query(log_sql, params)
            if not result.success:
                self.logger.error(f"Oracleへのログ記録に失敗しました: {result.error_message}")
        except Exception as e:
            self.logger.error(f"Oracleへのログ記録中に予期せぬエラーが発生しました: {e}", exc_info=True)

    def get_logs(self, user_id: Optional[str] = None, limit: int = 100, offset: int = 0) -> Dict[str, Any]:
        """OracleからSQL実行ログを取得する"""
        try:
            base_sql = "FROM Log.TOOL_LOG WHERE TOOL_NAME = 'SQLDOJOWEB'"
            params = []
            if user_id:
                base_sql += " AND OPE_CODE = ?"
                params.append(user_id)

            count_sql = f"SELECT COUNT(*) as TOTAL_COUNT {base_sql}"
            count_result = self.query_executor.execute_query(count_sql, tuple(params))
            total_count = count_result.data[0]['TOTAL_COUNT'] if count_result.success and count_result.data else 0

            data_sql = f"""
            SELECT MK_DATE, OPE_CODE, OPTION_NO, SYSTEM_WORKNUMBER
            {base_sql} ORDER BY MK_DATE DESC OFFSET ? ROWS FETCH NEXT ? ROWS ONLY
            """
            params.extend([offset, limit])
            
            logs_result = self.query_executor.execute_query(data_sql, tuple(params))
            
            if not logs_result.success:
                return {"logs": [], "total_count": 0}

            logs_data = [{
                "log_id": str(uuid.uuid4()),
                "user_id": row.get("OPE_CODE"),
                "sql": row.get("OPTION_NO"),
                "execution_time": row.get("SYSTEM_WORKNUMBER"),
                "row_count": None,  # テーブルに存在しないためNone
                "success": True,     # テーブルに存在しないためデフォルト値
                "error_message": None,  # テーブルに存在しないためNone
                "timestamp": datetime.strptime(row.get("MK_DATE"), '%Y%m%d%H%M%S').isoformat()
            } for row in logs_result.data]

            return {"logs": logs_data, "total_count": total_count}
        except Exception as e:
            self.logger.error(f"Oracleからのログ取得中に予期せぬエラーが発生しました: {e}", exc_info=True)
            return {"logs": [], "total_count": 0}

    def clear_logs(self, user_id: Optional[str] = None):
        """OracleのSQL実行ログをクリアする"""
        try:
            sql = "DELETE FROM Log.TOOL_LOG WHERE TOOL_NAME = 'SQLDOJOWEB'"
            params = []
            if user_id:
                sql += " AND OPE_CODE = ?"
                params.append(user_id)
            
            result = self.query_executor.execute_query(sql, tuple(params))
            if not result.success:
                self.logger.error(f"Oracleのログクリアに失敗: {result.error_message}")
        except Exception as e:
            self.logger.error(f"Oracleのログクリア中に予期せぬエラーが発生しました: {e}", exc_info=True) 