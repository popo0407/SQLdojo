# app/services/query_executor_snowflake_log.py

import time
from typing import Optional, Dict, Any, List
from dataclasses import dataclass
from app.services.connection_manager_snowflake_log import ConnectionManagerSnowflakeLog
from app.logger import get_logger
from app.exceptions import SQLExecutionError

@dataclass
class QueryResult:
    """クエリ実行結果"""
    success: bool
    data: Optional[List[Dict[str, Any]]] = None
    columns: Optional[List[str]] = None
    row_count: int = 0
    execution_time: float = 0.0
    error_message: Optional[str] = None
    query_id: Optional[str] = None
    sql: Optional[str] = None


class QueryExecutorSnowflakeLog:
    """Snowflakeログ用SQLクエリ実行クラス"""
    
    def __init__(self, connection_manager: ConnectionManagerSnowflakeLog):
        self.connection_manager = connection_manager
        self.logger = get_logger(__name__)
    
    def execute_query(self, sql: str, params: Optional[tuple] = None, limit: Optional[int] = None) -> QueryResult:
        """SQLクエリを実行"""
        start_time = time.time()
        
        try:
            # Snowflakeログ用の直接実行
            result = self.connection_manager.execute_query(sql, params)
            
            execution_time = time.time() - start_time
            
            if result["success"]:
                return QueryResult(
                    success=True,
                    data=result.get("data", []),
                    row_count=len(result.get("data", [])),
                    execution_time=execution_time,
                    sql=sql
                )
            else:
                return QueryResult(
                    success=False,
                    error_message=result.get("error_message", "不明なエラー"),
                    execution_time=execution_time,
                    sql=sql
                )
            
        except Exception as e:
            execution_time = time.time() - start_time
            error_message = f"クエリ実行エラー: {str(e)}"
            
            self.logger.error(f"Snowflakeログ用クエリ実行失敗", 
                            sql=sql,
                            error=error_message,
                            execution_time=execution_time)
            
            return QueryResult(
                success=False,
                error_message=error_message,
                execution_time=execution_time,
                sql=sql
            )
    
    def test_connection(self) -> bool:
        """接続テスト"""
        return self.connection_manager.test_connection()
    
    def get_connection_status(self) -> Dict[str, Any]:
        """接続状態を取得"""
        return self.connection_manager.get_pool_status() 