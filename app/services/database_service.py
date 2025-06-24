# -*- coding: utf-8 -*-
"""
データベースサービス
Facadeパターンで他のサービスにシンプルなインターフェースを提供
"""
from typing import Optional, Dict, Any, List

from app.services.connection_manager import ConnectionManager
from app.services.query_executor import QueryExecutor, QueryResult
from app.logger import get_logger
from app.exceptions import DatabaseError


class DatabaseService:
    """データベースサービス（Facadeパターン）"""
    
    def __init__(self, connection_manager: ConnectionManager, query_executor: QueryExecutor):
        self.connection_manager = connection_manager
        self.query_executor = query_executor
        self.logger = get_logger(__name__)
    
    def execute_query(self, sql: str, params: Optional[Dict[str, Any]] = None, limit: Optional[int] = None) -> QueryResult:
        """SQLクエリを実行"""
        return self.query_executor.execute_query(sql, params, limit)
    
    async def execute_query_async(self, sql: str, params: Optional[Dict[str, Any]] = None, limit: Optional[int] = None) -> QueryResult:
        """SQLクエリを非同期実行"""
        # 非同期実行の実装（必要に応じて）
        return self.query_executor.execute_query(sql, params, limit)
    
    def test_connection(self) -> bool:
        """接続テスト"""
        return self.query_executor.test_connection()
    
    def get_warehouse_info(self) -> QueryResult:
        """ウェアハウス情報を取得"""
        sql = "SHOW WAREHOUSES"
        return self.query_executor.execute_metadata_query(sql)
    
    def get_database_info(self) -> QueryResult:
        """データベース情報を取得"""
        sql = "SHOW DATABASES"
        return self.query_executor.execute_metadata_query(sql)
    
    def get_schema_info(self) -> QueryResult:
        """スキーマ情報を取得"""
        sql = "SHOW SCHEMAS"
        return self.query_executor.execute_metadata_query(sql)
    
    def get_table_info(self, schema: str) -> QueryResult:
        """テーブル情報を取得"""
        sql = f"SHOW TABLES IN SCHEMA {schema}"
        return self.query_executor.execute_metadata_query(sql)
    
    def get_column_info(self, schema: str, table: str) -> QueryResult:
        """カラム情報を取得"""
        sql = f"DESCRIBE TABLE {schema}.{table}"
        return self.query_executor.execute_metadata_query(sql)
    
    def get_pool_status(self) -> Dict[str, Any]:
        """接続プールの状態を取得"""
        return self.query_executor.get_connection_status()
    
    def close(self):
        """サービスを閉じる"""
        try:
            self.connection_manager.close_all_connections()
            self.logger.info("データベースサービスを閉じました")
        except Exception as e:
            self.logger.error(f"データベースサービスクローズエラー: {e}")


# 後方互換性のための関数
def get_database_service() -> DatabaseService:
    """データベースサービスを取得（後方互換性）"""
    from app.container import get_database_service as get_db_service
    return get_db_service()


def close_database_service():
    """データベースサービスを閉じる（後方互換性）"""
    service = get_database_service()
    service.close() 