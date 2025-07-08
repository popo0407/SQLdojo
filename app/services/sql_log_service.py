# app/services/sql_log_service.py

import uuid
from datetime import datetime
from typing import List, Dict, Any, Optional
from app.logger import get_logger
from app.services.query_executor import QueryExecutor
from app import __version__

logger = get_logger("SQLLogService")

class SQLLogService:
    def __init__(self, query_executor: QueryExecutor):
        self.query_executor = query_executor

    def add_log_to_db(self, user_id: str, sql: str, execution_time: float, start_time: datetime, row_count: int, success: bool, error_message: Optional[str]):
        try:
            end_time = datetime.now()
            mk_date = end_time.strftime('%Y%m%d%H%M%S')
            from_date = start_time.strftime('%Y%m%d%H%M%S')
            
            truncated_sql = sql[:3900] if len(sql) > 3900 else sql
            
            version_parts = __version__.split('.')
            version_number = int(version_parts[0]) * 100 + int(version_parts[1]) * 10 + int(version_parts[2])

            log_sql = """
            INSERT INTO Log.TOOL_LOG (
                MK_DATE, OPE_CODE, TOOL_NAME, OPTION_NO, 
                SYSTEM_WORKNUMBER, FROM_DATE, TO_DATE, TOOL_VER,
                ROW_COUNT, SUCCESS, ERROR_MESSAGE
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """
            params = (
                mk_date, user_id, 'SQLDOJOWEB', truncated_sql,
                round(execution_time, 6), from_date, mk_date, version_number,
                row_count, 1 if success else 0, error_message
            )

            result = self.query_executor.execute_query(log_sql, params)
            if not result.success:
                logger.error("OracleDBへのログ記録に失敗しました", error=result.error_message)
        except Exception as e:
            logger.error(f"OracleDBへのログ記録中に予期せぬエラーが発生しました: {e}", exc_info=True)

    def get_logs(self, user_id: Optional[str] = None, limit: int = 100, offset: int = 0) -> Dict[str, Any]:
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
            SELECT MK_DATE, OPE_CODE, OPTION_NO, SYSTEM_WORKNUMBER, ROW_COUNT, SUCCESS, ERROR_MESSAGE
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
                "row_count": row.get("ROW_COUNT"),
                "success": bool(row.get("SUCCESS")),
                "error_message": row.get("ERROR_MESSAGE"),
                "timestamp": datetime.strptime(row.get("MK_DATE"), '%Y%m%d%H%M%S').isoformat()
            } for row in logs_result.data]

            return {"logs": logs_data, "total_count": total_count}
        except Exception as e:
            logger.error(f"OracleDBからのログ取得中に予期せぬエラーが発生しました: {e}", exc_info=True)
            return {"logs": [], "total_count": 0}

    def clear_logs(self, user_id: Optional[str] = None):
        try:
            sql = "DELETE FROM Log.TOOL_LOG WHERE TOOL_NAME = 'SQLDOJOWEB'"
            params = []
            if user_id:
                sql += " AND OPE_CODE = ?"
                params.append(user_id)
            
            result = self.query_executor.execute_query(sql, tuple(params))
            if not result.success:
                logger.error("OracleDBのログクリアに失敗", error=result.error_message)
        except Exception as e:
            logger.error(f"OracleDBのログクリア中に予期せぬエラーが発生しました: {e}", exc_info=True)