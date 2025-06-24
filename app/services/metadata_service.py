# -*- coding: utf-8 -*-
"""
メタデータサービス
スキーマ・テーブル・カラム情報の管理
"""
from typing import Dict, Any, List, Optional
from datetime import datetime

from app.logger import Logger
from app.exceptions import MetadataError
from app.container import get_app_logger
from .query_executor import QueryExecutor
from app.metadata_cache import MetadataCache


class MetadataService:
    """メタデータサービス"""
    
    def __init__(self, query_executor: QueryExecutor, metadata_cache: MetadataCache):
        self.logger: Logger = get_app_logger()
        self.query_executor = query_executor
        self.cache: MetadataCache = metadata_cache
    
    def get_all_metadata(self) -> List[Dict[str, Any]]:
        """全メタデータを取得（キャッシュ優先）"""
        self.logger.info("全メタデータ取得開始")
        
        # まずキャッシュから取得を試行
        cached_data = self.cache.get_all_metadata_normalized()
        if cached_data:
            self.logger.info("キャッシュから全メタデータ取得完了", count=len(cached_data))
            return cached_data
        
        # キャッシュがない場合はDBから取得
        self.logger.info("キャッシュにデータがないため、DBから全メタデータを取得")
        return self._fetch_all_from_snowflake()

    def get_schemas_and_tables(self) -> List[Dict[str, Any]]:
        """スキーマとテーブル情報のみをDBから取得するメソッド"""
        self.logger.info("スキーマとテーブルの情報のみをDBから取得開始")
        all_schemas_data = []
        schemas = self.get_schemas()  # 既存のメソッドを活用

        for schema_info in schemas:
            schema_name = schema_info.get("name")
            if not schema_name or schema_name.upper() == 'INFORMATION_SCHEMA':
                continue

            tables = self.get_tables(schema_name)  # 既存のメソッドを活用
            # カラム情報はここでは取得しない
            for table_info in tables:
                table_info["columns"] = []  # 空のリストを入れておく

            schema_info["tables"] = tables
            all_schemas_data.append(schema_info)
        
        self.logger.info("スキーマとテーブルの情報取得完了", schema_count=len(all_schemas_data))
        return all_schemas_data

    def refresh_full_metadata_cache(self) -> None:
        """バックグラウンドで全メタデータを取得してキャッシュを更新するメソッド"""
        self.logger.info("バックグラウンドで全メタデータのキャッシュ更新を開始")
        try:
            # 既存の全データ取得ロジックを流用
            all_metadata = self._fetch_all_from_snowflake() 
            self.cache.save_all_metadata_normalized(all_metadata)
            self.logger.info("バックグラウンドでのキャッシュ更新が完了", count=len(all_metadata))
        except Exception as e:
            self.logger.error("バックグラウンドでのキャッシュ更新に失敗", error=str(e))

    def get_schemas(self) -> List[Dict[str, Any]]:
        """スキーマ一覧を取得"""
        try:
            self.logger.info("スキーマ一覧取得開始")
            
            sql = "SELECT SCHEMA_NAME, CREATED, SCHEMA_OWNER FROM INFORMATION_SCHEMA.SCHEMATA"
            result = self.query_executor.execute_query(sql)
            
            if not result.success:
                self.logger.warning("データベース接続エラー、モックデータを返します", error=result.error_message)
                return [{"name": "PUBLIC", "comment": "モックデータ"}]
            
            schemas = []
            for row in result.data:
                schemas.append({
                    "name": row.get("schema_name", ""),
                    "created_on": str(row.get("created", "")),
                    "owner": row.get("schema_owner", ""),
                })
            
            self.logger.info("スキーマ一覧取得完了", count=len(schemas))
            return schemas
            
        except Exception as e:
            self.logger.error("スキーマ一覧取得エラー", exception=e)
            return [{"name": "PUBLIC", "comment": "エラー時のモックデータ"}]
    
    def get_tables(self, schema_name: str) -> List[Dict[str, Any]]:
        """テーブル一覧を取得"""
        try:
            self.logger.info("テーブル一覧取得開始", schema_name=schema_name)
            
            result = self.query_executor.execute_query(f"SELECT TABLE_NAME, TABLE_TYPE, ROW_COUNT, CREATED, LAST_ALTERED FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = '{schema_name}'")
            
            if not result.success:
                self.logger.warning("データベース接続エラー、モックデータを返します", error=result.error_message)
                return [{"name": "sample_table", "schema_name": schema_name}]
            
            tables = []
            for row in result.data:
                tables.append({
                    "name": row.get("table_name", ""),
                    "schema_name": schema_name,
                    "table_type": row.get("table_type", ""),
                    "row_count": row.get("row_count", 0),
                    "created_on": str(row.get("created", "")),
                    "last_altered": str(row.get("last_altered", "")),
                })
            
            self.logger.info("テーブル一覧取得完了", schema_name=schema_name, count=len(tables))
            return tables
            
        except Exception as e:
            self.logger.error("テーブル一覧取得エラー", exception=e, schema_name=schema_name)
            return [{"name": "sample_table", "schema_name": schema_name, "comment": "エラー時のモック"}]
    
    def get_columns(self, schema_name: str, table_name: str) -> List[Dict[str, Any]]:
        """カラム情報を取得"""
        try:
            self.logger.info("カラム情報取得開始", schema_name=schema_name, table_name=table_name)
            
            result = self.query_executor.execute_query(f"SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = '{schema_name}' AND TABLE_NAME = '{table_name}'")
            
            if not result.success:
                 self.logger.warning("データベース接続エラー、モックデータを返します", error=result.error_message)
                 return [{"name": "id", "data_type": "NUMBER"}, {"name": "name", "data_type": "VARCHAR"}]

            columns = []
            for row in result.data:
                columns.append({
                    "name": row.get("column_name", ""),
                    "data_type": row.get("data_type", ""),
                    "is_nullable": row.get("is_nullable", "YES") == "YES",
                })
            
            self.logger.info("カラム情報取得完了", schema_name=schema_name, table_name=table_name, count=len(columns))
            return columns
            
        except Exception as e:
            self.logger.error("カラム情報取得エラー", exception=e, schema_name=schema_name, table_name=table_name)
            return [{"name": "id", "data_type": "NUMBER", "comment": "エラー時のモック"}]
    
    def get_table_info(self, schema_name: str, table_name: str) -> Dict[str, Any]:
        """テーブル詳細情報を取得"""
        try:
            self.logger.info("テーブル詳細情報取得開始", 
                           schema_name=schema_name, table_name=table_name)
            
            # テーブル情報とカラム情報を取得
            tables = self.get_tables(schema_name)
            table_info = next((t for t in tables if t["name"] == table_name), None)
            
            if not table_info:
                raise MetadataError(f"テーブル '{table_name}' が見つかりません")
            
            columns = self.get_columns(schema_name, table_name)
            
            result = {
                **table_info,
                "columns": columns,
                "column_count": len(columns),
                "primary_keys": [col["name"] for col in columns if col.get("is_primary_key", False)],
                "unique_columns": [col["name"] for col in columns if col.get("is_unique", False)]
            }
            
            self.logger.info("テーブル詳細情報取得完了", 
                           schema_name=schema_name, table_name=table_name)
            return result
            
        except Exception as e:
            self.logger.error("テーブル詳細情報取得エラー", 
                            exception=e, schema_name=schema_name, 
                            table_name=table_name)
            raise MetadataError(f"テーブル詳細情報取得エラー: {str(e)}")
    
    def get_warehouse_info(self) -> List[Dict[str, Any]]:
        """ウェアハウス情報を取得"""
        try:
            self.logger.info("ウェアハウス情報取得開始")
            
            # データベースからウェアハウス情報を取得
            result = self.query_executor.execute_query("SELECT warehouse_name, warehouse_size, warehouse_type, running, queued, is_default, is_current FROM INFORMATION_SCHEMA.WAREHOUSES")
            
            if not result.success:
                raise MetadataError(f"ウェアハウス情報取得エラー: {result.error_message}")
            
            # 結果を整形
            warehouses = []
            for row in result.data:
                warehouses.append({
                    "name": row.get("warehouse_name", ""),
                    "size": row.get("warehouse_size", ""),
                    "type": row.get("warehouse_type", ""),
                    "running": row.get("running", 0),
                    "queued": row.get("queued", 0),
                    "is_default": row.get("is_default", False),
                    "is_current": row.get("is_current", False)
                })
            
            self.logger.info("ウェアハウス情報取得完了", count=len(warehouses))
            return warehouses
            
        except Exception as e:
            self.logger.error("ウェアハウス情報取得エラー", exception=e)
            raise MetadataError(f"ウェアハウス情報取得エラー: {str(e)}")
    
    def get_database_info(self) -> List[Dict[str, Any]]:
        """データベース情報を取得"""
        try:
            self.logger.info("データベース情報取得開始")
            
            # データベースからデータベース情報を取得
            result = self.query_executor.execute_query("SELECT database_name, owner, is_default, is_current FROM INFORMATION_SCHEMA.DATABASES")
            
            if not result.success:
                raise MetadataError(f"データベース情報取得エラー: {result.error_message}")
            
            # 結果を整形
            databases = []
            for row in result.data:
                databases.append({
                    "name": row.get("database_name", ""),
                    "owner": row.get("owner", ""),
                    "is_default": row.get("is_default", False),
                    "is_current": row.get("is_current", False)
                })
            
            self.logger.info("データベース情報取得完了", count=len(databases))
            return databases
            
        except Exception as e:
            self.logger.error("データベース情報取得エラー", exception=e)
            raise MetadataError(f"データベース情報取得エラー: {str(e)}")

    # 正規化キャッシュ用メソッド群
    def refresh_all_metadata_from_snowflake(self) -> List[Dict[str, Any]]:
        """Snowflakeから全メタデータを取得し、正規化キャッシュを更新"""
        self.logger.info("Snowflakeから全メタデータの一括更新を開始")
        all_metadata = self._fetch_all_from_snowflake()
        self.cache.save_all_metadata_normalized(all_metadata)
        self.logger.info("Snowflakeから全メタデータの一括更新が完了")
        return all_metadata

    def get_schemas_from_cache(self) -> List[Dict[str, Any]]:
        """正規化キャッシュからスキーマ一覧を取得"""
        return self.cache.load_schemas()

    def get_tables_from_cache(self, schema_name: str) -> List[Dict[str, Any]]:
        """正規化キャッシュからテーブル一覧を取得"""
        return self.cache.load_tables(schema_name)

    def get_columns_from_cache(self, schema_name: str, table_name: str) -> List[Dict[str, Any]]:
        """キャッシュからカラム一覧を取得"""
        self.logger.info("キャッシュからカラム情報取得", schema=schema_name, table=table_name)
        
        # キャッシュから全メタデータを取得
        cached_data = self.cache.get_all_metadata_normalized()
        if not cached_data:
            self.logger.warning("キャッシュにデータがないため、空のリストを返します")
            return []
        
        # 指定されたスキーマとテーブルのカラムを検索
        for schema_data in cached_data:
            if schema_data.get("name") == schema_name:
                for table_data in schema_data.get("tables", []):
                    if table_data.get("name") == table_name:
                        columns = table_data.get("columns", [])
                        self.logger.info("キャッシュからカラム情報取得完了", 
                                       schema=schema_name, table=table_name, column_count=len(columns))
                        return columns
        
        self.logger.warning("指定されたスキーマ・テーブルのカラムが見つかりません", 
                           schema=schema_name, table=table_name)
        return []

    def _fetch_all_from_snowflake(self) -> List[Dict[str, Any]]:
        """Snowflakeから全メタデータを取得する内部メソッド"""
        all_schemas_data = []
        schemas = self.get_schemas()

        for schema_info in schemas:
            schema_name = schema_info.get("name")
            if not schema_name or schema_name.upper() == 'INFORMATION_SCHEMA':
                continue

            tables = self.get_tables(schema_name)
            for table_info in tables:
                table_name = table_info.get("name")
                if not table_name:
                    continue

                columns = self.get_columns(schema_name, table_name)
                table_info["columns"] = columns

            schema_info["tables"] = tables
            all_schemas_data.append(schema_info)
        return all_schemas_data

    def clear_cache(self):
        """キャッシュをクリア"""
        self.cache.clear_cache() 