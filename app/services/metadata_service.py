# -*- coding: utf-8 -*-
"""
メタデータサービス
データベースのメタデータ（スキーマ、テーブル、カラム）を管理
"""
from typing import List, Dict, Any, Optional
from datetime import datetime, timedelta

from app.logger import get_logger
from app.metadata_cache import MetadataCache
from app.exceptions import MetadataError
from .query_executor import QueryExecutor, QueryResult


class MetadataService:
    """メタデータサービス"""
    
    def __init__(self, query_executor: QueryExecutor, metadata_cache: MetadataCache):
        self.query_executor = query_executor
        self.cache = metadata_cache
        self.logger = get_logger(__name__)
    
    def get_all_metadata(self) -> List[Dict[str, Any]]:
        """全メタデータを取得（キャッシュ優先）"""
        self.logger.info("全メタデータ取得開始")
        
        try:
            # キャッシュから全メタデータを取得
            cached_data = self.cache.get_all_metadata_normalized()
            if not cached_data:
                self.logger.warning("キャッシュにデータがないため、モックデータを返します")
                return self._get_mock_all_metadata()
            
            self.logger.info("キャッシュから全メタデータ取得完了", 
                           schema_count=len(cached_data),
                           total_tables=sum(len(schema.get("tables", [])) for schema in cached_data),
                           total_columns=sum(len(table.get("columns", [])) for schema in cached_data for table in schema.get("tables", [])))
            return cached_data
            
        except Exception as e:
            self.logger.error("全メタデータ取得エラー", exception=e)
            return self._get_mock_all_metadata()

    def get_schemas_and_tables(self) -> List[Dict[str, Any]]:
        """スキーマとテーブル情報のみをキャッシュから取得するメソッド"""
        self.logger.info("キャッシュからスキーマとテーブル情報を取得開始")
        
        try:
            # キャッシュから全メタデータを取得
            cached_data = self.cache.get_all_metadata_normalized()
            if not cached_data:
                self.logger.warning("キャッシュにデータがないため、モックデータを返します")
                return self._get_mock_schemas_and_tables()
            
            # スキーマとテーブルのみを返す（カラム情報は除外）
            schemas_and_tables = []
            for schema_data in cached_data:
                schema_info = {
                    "name": schema_data.get("name"),
                    "created_on": schema_data.get("created_on"),
                    "owner": schema_data.get("owner"),
                    "tables": []
                }
                
                for table_data in schema_data.get("tables", []):
                    table_info = {
                        "name": table_data.get("name"),
                        "schema_name": table_data.get("schema_name"),
                        "table_type": table_data.get("table_type"),
                        "row_count": table_data.get("row_count"),
                        "created_on": table_data.get("created_on"),
                        "last_altered": table_data.get("last_altered"),
                        "columns": []  # 空のリストを設定
                    }
                    schema_info["tables"].append(table_info)
                
                schemas_and_tables.append(schema_info)
            
            self.logger.info("キャッシュからスキーマとテーブル情報取得完了", 
                           schema_count=len(schemas_and_tables),
                           total_tables=sum(len(schema.get("tables", [])) for schema in schemas_and_tables))
            return schemas_and_tables
            
        except Exception as e:
            self.logger.error("キャッシュからスキーマとテーブル情報取得エラー", exception=e)
            return self._get_mock_schemas_and_tables()

    def _get_mock_schemas_and_tables(self) -> List[Dict[str, Any]]:
        """モックのスキーマとテーブル情報を返す"""
        return [
            {
                "name": "PUBLIC",
                "created_on": "2023-01-01 00:00:00",
                "owner": "SYSADMIN",
                "tables": [
                    {
                        "name": "SAMPLE_TABLE",
                        "schema_name": "PUBLIC",
                        "table_type": "TABLE",
                        "row_count": 1000,
                        "created_on": "2023-01-01 00:00:00",
                        "last_altered": "2023-01-01 00:00:00",
                        "columns": []
                    },
                    {
                        "name": "SAMPLE_VIEW",
                        "schema_name": "PUBLIC",
                        "table_type": "VIEW",
                        "row_count": None,
                        "created_on": "2023-01-01 00:00:00",
                        "last_altered": "2023-01-01 00:00:00",
                        "columns": []
                    }
                ]
            }
        ]

    def refresh_full_metadata_cache(self) -> None:
        """バックグラウンドで全メタデータを取得してキャッシュを更新するメソッド"""
        self.logger.info("メタデータキャッシュの強制更新を開始")
        try:
            # 直接Snowflakeから全メタデータを取得（キャッシュは使用しない）
            all_metadata = self._fetch_all_from_snowflake_direct()
            if all_metadata:
                self.cache.save_all_metadata_normalized(all_metadata)
                self.logger.info("メタデータキャッシュの更新が完了", count=len(all_metadata))
            else:
                self.logger.warning("メタデータ取得に失敗しました")
        except Exception as e:
            self.logger.error("メタデータキャッシュの更新に失敗", error=str(e))

    def get_schemas(self) -> List[Dict[str, Any]]:
        """スキーマ一覧を取得（キャッシュ優先）"""
        self.logger.info("スキーマ一覧取得開始")
        
        # キャッシュの有効性をチェック
        if self.cache.is_cache_valid():
            cached_data = self.cache.get_all_metadata_normalized()
            if cached_data:
                schemas = []
                for schema_data in cached_data:
                    schemas.append({
                        "name": schema_data.get("name"),
                        "created_on": schema_data.get("created_on"),
                        "owner": schema_data.get("owner"),
                    })
                
                self.logger.info("キャッシュからスキーマ一覧取得完了", count=len(schemas))
                return schemas
        
        # キャッシュが無効または存在しない場合はモックデータを返す
        self.logger.warning("キャッシュが無効なため、モックデータを返します")
        return self._get_mock_schemas()

    def get_tables(self, schema_name: str) -> List[Dict[str, Any]]:
        """テーブル一覧を取得（キャッシュ優先）"""
        self.logger.info("テーブル一覧取得開始", schema=schema_name)
        
        # キャッシュの有効性をチェック
        if self.cache.is_cache_valid():
            cached_data = self.cache.get_all_metadata_normalized()
            if cached_data:
                for schema_data in cached_data:
                    if schema_data.get("name") == schema_name:
                        tables = []
                        for table_data in schema_data.get("tables", []):
                            tables.append({
                                "name": table_data.get("name"),
                                "schema_name": table_data.get("schema_name"),
                                "table_type": table_data.get("table_type"),
                                "row_count": table_data.get("row_count"),
                                "created_on": table_data.get("created_on"),
                                "last_altered": table_data.get("last_altered"),
                            })
                        
                        self.logger.info("キャッシュからテーブル一覧取得完了", 
                                       schema=schema_name, count=len(tables))
                        return tables
        
        # キャッシュが無効または存在しない場合はモックデータを返す
        self.logger.warning("キャッシュが無効なため、モックデータを返します", schema=schema_name)
        return self._get_mock_tables(schema_name)

    def get_columns(self, schema_name: str, table_name: str) -> List[Dict[str, Any]]:
        """カラム一覧を取得（キャッシュ優先）"""
        self.logger.info("カラム一覧取得開始", schema=schema_name, table=table_name)
        
        # キャッシュの有効性をチェック
        if self.cache.is_cache_valid():
            cached_data = self.cache.get_all_metadata_normalized()
            if cached_data:
                for schema_data in cached_data:
                    if schema_data.get("name") == schema_name:
                        for table_data in schema_data.get("tables", []):
                            if table_data.get("name") == table_name:
                                columns = table_data.get("columns", [])
                                self.logger.info("キャッシュからカラム一覧取得完了", 
                                               schema=schema_name, table=table_name, count=len(columns))
                                return columns
        
        # キャッシュが無効または存在しない場合はモックデータを返す
        self.logger.warning("キャッシュが無効なため、モックデータを返します", 
                        schema=schema_name, table=table_name)
        return self._get_mock_columns(schema_name, table_name)

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
        self.logger.info("Snowflakeからウェアハウス情報取得開始")
        
        sql = """
        SELECT 
            WAREHOUSE_NAME,
            WAREHOUSE_SIZE,
            WAREHOUSE_TYPE,
            RUNNING,
            QUEUED,
            IS_DEFAULT,
            IS_CURRENT
        FROM INFORMATION_SCHEMA.WAREHOUSES
        ORDER BY WAREHOUSE_NAME
        """
        
        result = self.query_executor.execute_query(sql)
        
        if not result.success:
            self.logger.error("ウェアハウス情報の取得に失敗", error=result.error_message)
            return []
        
        warehouses = []
        for row in result.data:
            warehouses.append({
                "name": row.get("warehouse_name", ""),
                "size": row.get("warehouse_size", ""),
                "type": row.get("warehouse_type", ""),
                "running": row.get("running", 0),
                "queued": row.get("queued", 0),
                "is_default": row.get("is_default", False),
                "is_current": row.get("is_current", False),
            })
        
        self.logger.info("Snowflakeからウェアハウス情報取得完了", count=len(warehouses))
        return warehouses

    def get_database_info(self) -> List[Dict[str, Any]]:
        """データベース情報を取得"""
        self.logger.info("Snowflakeからデータベース情報取得開始")
        
        sql = """
        SELECT 
            DATABASE_NAME,
            OWNER,
            IS_DEFAULT,
            IS_CURRENT
        FROM INFORMATION_SCHEMA.DATABASES
        ORDER BY DATABASE_NAME
        """
        
        result = self.query_executor.execute_query(sql)
        
        if not result.success:
            self.logger.error("データベース情報の取得に失敗", error=result.error_message)
            return []
        
        databases = []
        for row in result.data:
            databases.append({
                "name": row.get("database_name", ""),
                "owner": row.get("owner", ""),
                "is_default": row.get("is_default", False),
                "is_current": row.get("is_current", False),
            })
        
        self.logger.info("Snowflakeからデータベース情報取得完了", count=len(databases))
        return databases

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
        """Snowflakeから全メタデータを取得する内部メソッド（最適化版）"""
        self.logger.info("Snowflakeから全メタデータを一括取得開始")
        
        try:
            # 1. スキーマ一覧を取得
            schemas = self.get_schemas()
            all_schemas_data = []
            
            # 2. 全テーブル情報を一度に取得
            all_tables_sql = """
            SELECT 
                TABLE_SCHEMA,
                TABLE_NAME,
                TABLE_TYPE,
                ROW_COUNT,
                CREATED,
                LAST_ALTERED
            FROM INFORMATION_SCHEMA.TABLES 
            WHERE TABLE_SCHEMA NOT IN ('INFORMATION_SCHEMA')
            ORDER BY TABLE_SCHEMA, TABLE_NAME
            """
            
            tables_result = self.query_executor.execute_query(all_tables_sql)
            if not tables_result.success:
                self.logger.error("テーブル情報の一括取得に失敗", error=tables_result.error_message)
                return []
            
            # テーブル情報をスキーマ別に整理
            tables_by_schema = {}
            for row in tables_result.data:
                schema_name = row.get("table_schema", "")
                if schema_name not in tables_by_schema:
                    tables_by_schema[schema_name] = []
                
                tables_by_schema[schema_name].append({
                    "name": row.get("table_name", ""),
                    "schema_name": schema_name,
                    "table_type": row.get("table_type", ""),
                    "row_count": row.get("row_count", 0),
                    "created_on": str(row.get("created", "")),
                    "last_altered": str(row.get("last_altered", "")),
                })
            
            # 3. 全カラム情報を一度に取得
            all_columns_sql = """
            SELECT 
                TABLE_SCHEMA,
                TABLE_NAME,
                COLUMN_NAME,
                DATA_TYPE,
                IS_NULLABLE,
                COLUMN_DEFAULT,
                ORDINAL_POSITION
            FROM INFORMATION_SCHEMA.COLUMNS 
            WHERE TABLE_SCHEMA NOT IN ('INFORMATION_SCHEMA')
            ORDER BY TABLE_SCHEMA, TABLE_NAME, ORDINAL_POSITION
            """
            
            columns_result = self.query_executor.execute_query(all_columns_sql)
            if not columns_result.success:
                self.logger.error("カラム情報の一括取得に失敗", error=columns_result.error_message)
                return []
            
            # カラム情報をテーブル別に整理
            columns_by_table = {}
            for row in columns_result.data:
                schema_name = row.get("table_schema", "")
                table_name = row.get("table_name", "")
                key = f"{schema_name}.{table_name}"
                
                if key not in columns_by_table:
                    columns_by_table[key] = []
                
                columns_by_table[key].append({
                    "name": row.get("column_name", ""),
                    "data_type": row.get("data_type", ""),
                    "is_nullable": row.get("is_nullable", "YES") == "YES",
                    "default_value": row.get("column_default"),
                    "ordinal_position": row.get("ordinal_position", 0),
                })
            
            # 4. スキーマ、テーブル、カラム情報を統合
            for schema_info in schemas:
                schema_name = schema_info.get("name")
                if not schema_name or schema_name.upper() == 'INFORMATION_SCHEMA':
                    continue
                
                # スキーマのテーブル情報を取得
                tables = tables_by_schema.get(schema_name, [])
                
                # 各テーブルにカラム情報を追加
                for table_info in tables:
                    table_name = table_info.get("name")
                    if not table_name:
                        continue
                    
                    # カラム情報を取得
                    key = f"{schema_name}.{table_name}"
                    columns = columns_by_table.get(key, [])
                    table_info["columns"] = columns
                
                schema_info["tables"] = tables
                all_schemas_data.append(schema_info)
            
            self.logger.info("Snowflakeから全メタデータの一括取得完了", 
                           schema_count=len(all_schemas_data),
                           total_tables=sum(len(schema.get("tables", [])) for schema in all_schemas_data),
                           total_columns=sum(len(table.get("columns", [])) for schema in all_schemas_data for table in schema.get("tables", [])))
            
            return all_schemas_data
            
        except Exception as e:
            self.logger.error("全メタデータ取得中にエラーが発生", exception=e)
            return []

    def _fetch_all_from_snowflake_direct(self) -> List[Dict[str, Any]]:
        """Snowflakeから全メタデータを直接取得する内部メソッド（キャッシュを使用しない）"""
        self.logger.info("Snowflakeからメタデータを直接取得開始")
        
        try:
            # 1. スキーマ一覧を直接取得
            schemas_sql = "SELECT SCHEMA_NAME, CREATED, SCHEMA_OWNER FROM INFORMATION_SCHEMA.SCHEMATA"
            schemas_result = self.query_executor.execute_query(schemas_sql)
            
            if not schemas_result.success:
                self.logger.error("スキーマ情報の取得に失敗", error=schemas_result.error_message)
                return []
            
            schemas = []
            for row in schemas_result.data:
                schemas.append({
                    "name": row.get("schema_name", ""),
                    "created_on": str(row.get("created", "")),
                    "owner": row.get("schema_owner", ""),
                })
            
            # 2. 全テーブル情報を一度に取得（コメント情報を含む）
            all_tables_sql = """
            SELECT 
                TABLE_SCHEMA,
                TABLE_NAME,
                TABLE_TYPE,
                ROW_COUNT,
                CREATED,
                LAST_ALTERED,
                COMMENT
            FROM INFORMATION_SCHEMA.TABLES 
            WHERE TABLE_SCHEMA NOT IN ('INFORMATION_SCHEMA')
            ORDER BY TABLE_SCHEMA, TABLE_NAME
            """
            
            tables_result = self.query_executor.execute_query(all_tables_sql)
            if not tables_result.success:
                self.logger.error("テーブル情報の一括取得に失敗", error=tables_result.error_message)
                return []
            
            # テーブル情報をスキーマ別に整理
            tables_by_schema = {}
            for row in tables_result.data:
                schema_name = row.get("table_schema", "")
                if schema_name not in tables_by_schema:
                    tables_by_schema[schema_name] = []
                
                tables_by_schema[schema_name].append({
                    "name": row.get("table_name", ""),
                    "schema_name": schema_name,
                    "table_type": row.get("table_type", ""),
                    "row_count": row.get("row_count", 0),
                    "created_on": str(row.get("created", "")),
                    "last_altered": str(row.get("last_altered", "")),
                    "comment": row.get("comment"),
                })
            
            # 3. 全カラム情報を一度に取得（コメント情報を含む）
            all_columns_sql = """
            SELECT 
                TABLE_SCHEMA,
                TABLE_NAME,
                COLUMN_NAME,
                DATA_TYPE,
                IS_NULLABLE,
                COLUMN_DEFAULT,
                ORDINAL_POSITION,
                COMMENT
            FROM INFORMATION_SCHEMA.COLUMNS 
            WHERE TABLE_SCHEMA NOT IN ('INFORMATION_SCHEMA')
            ORDER BY TABLE_SCHEMA, TABLE_NAME, ORDINAL_POSITION
            """
            
            columns_result = self.query_executor.execute_query(all_columns_sql)
            if not columns_result.success:
                self.logger.error("カラム情報の一括取得に失敗", error=columns_result.error_message)
                return []
            
            # カラム情報をテーブル別に整理
            columns_by_table = {}
            for row in columns_result.data:
                schema_name = row.get("table_schema", "")
                table_name = row.get("table_name", "")
                key = f"{schema_name}.{table_name}"
                
                if key not in columns_by_table:
                    columns_by_table[key] = []
                
                columns_by_table[key].append({
                    "name": row.get("column_name", ""),
                    "data_type": row.get("data_type", ""),
                    "is_nullable": row.get("is_nullable", "YES") == "YES",
                    "default_value": row.get("column_default"),
                    "ordinal_position": row.get("ordinal_position", 0),
                    "comment": row.get("comment"),
                })
            
            # 4. スキーマ、テーブル、カラム情報を統合
            all_schemas_data = []
            for schema_info in schemas:
                schema_name = schema_info.get("name")
                if not schema_name or schema_name.upper() == 'INFORMATION_SCHEMA':
                    continue
                
                # スキーマのテーブル情報を取得
                tables = tables_by_schema.get(schema_name, [])
                
                # 各テーブルにカラム情報を追加
                for table_info in tables:
                    table_name = table_info.get("name")
                    if not table_name:
                        continue
                    
                    # カラム情報を取得
                    key = f"{schema_name}.{table_name}"
                    columns = columns_by_table.get(key, [])
                    table_info["columns"] = columns
                
                schema_info["tables"] = tables
                all_schemas_data.append(schema_info)
            
            total_tables = sum(len(schema.get("tables", [])) for schema in all_schemas_data)
            total_columns = sum(len(table.get("columns", [])) for schema in all_schemas_data for table in schema.get("tables", []))
            
            self.logger.info("Snowflakeからメタデータ取得完了", 
                           schema_count=len(all_schemas_data),
                           table_count=total_tables,
                           column_count=total_columns)
            
            return all_schemas_data
            
        except Exception as e:
            self.logger.error("メタデータ取得中にエラーが発生", error=str(e))
            return []

    def clear_cache(self):
        """キャッシュをクリア"""
        self.cache.clear_cache()

    def _fetch_schemas_from_snowflake(self) -> List[Dict[str, Any]]:
        """Snowflakeからスキーマ情報を取得"""
        sql = "SELECT SCHEMA_NAME, CREATED, SCHEMA_OWNER FROM INFORMATION_SCHEMA.SCHEMATA"
        result = self.query_executor.execute_query(sql)
        
        if not result.success:
            self.logger.error("スキーマ情報の取得に失敗", error=result.error_message)
            return []
        
        schemas = []
        for row in result.data:
            schemas.append({
                "name": row.get("schema_name", ""),
                "created_on": str(row.get("created", "")),
                "owner": row.get("schema_owner", ""),
            })
        
        self.logger.info("Snowflakeからスキーマ情報取得完了", count=len(schemas))
        return schemas

    def _fetch_tables_from_snowflake(self, schema_name: str) -> List[Dict[str, Any]]:
        """Snowflakeからテーブル情報を取得"""
        sql = f"""
        SELECT TABLE_NAME, TABLE_TYPE, ROW_COUNT, CREATED, LAST_ALTERED 
        FROM INFORMATION_SCHEMA.TABLES 
        WHERE TABLE_SCHEMA = '{schema_name}'
        ORDER BY TABLE_NAME
        """
        result = self.query_executor.execute_query(sql)
        
        if not result.success:
            self.logger.error("テーブル情報の取得に失敗", error=result.error_message, schema=schema_name)
            return []
        
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
        
        self.logger.info("Snowflakeからテーブル情報取得完了", schema=schema_name, count=len(tables))
        return tables

    def _fetch_columns_from_snowflake(self, schema_name: str, table_name: str) -> List[Dict[str, Any]]:
        """Snowflakeからカラム情報を取得"""
        sql = f"""
        SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE, COLUMN_DEFAULT, ORDINAL_POSITION
        FROM INFORMATION_SCHEMA.COLUMNS 
        WHERE TABLE_SCHEMA = '{schema_name}' AND TABLE_NAME = '{table_name}'
        ORDER BY ORDINAL_POSITION
        """
        result = self.query_executor.execute_query(sql)
        
        if not result.success:
            self.logger.error("カラム情報の取得に失敗", error=result.error_message, 
                            schema=schema_name, table=table_name)
            return []
        
        columns = []
        for row in result.data:
            columns.append({
                "name": row.get("column_name", ""),
                "data_type": row.get("data_type", ""),
                "is_nullable": row.get("is_nullable", "YES") == "YES",
                "default_value": row.get("column_default"),
                "ordinal_position": row.get("ordinal_position", 0),
            })
        
        self.logger.info("Snowflakeからカラム情報取得完了", 
                        schema=schema_name, table=table_name, count=len(columns))
        return columns

    def _get_mock_schemas(self) -> List[Dict[str, Any]]:
        """モックのスキーマ情報を返す"""
        return [
            {
                "name": "PUBLIC",
                "created_on": "2023-01-01 00:00:00",
                "owner": "SYSADMIN"
            }
        ]


    def _get_mock_tables(self, schema_name: str) -> List[Dict[str, Any]]:
        """モックのテーブル情報を返す"""
        return [
            {
                "name": "SAMPLE_TABLE",
                "schema_name": schema_name,
                "table_type": "TABLE",
                "row_count": 1000,
                "created_on": "2023-01-01 00:00:00",
                "last_altered": "2023-01-01 00:00:00"
            },
            {
                "name": "SAMPLE_VIEW",
                "schema_name": schema_name,
                "table_type": "VIEW",
                "row_count": None,
                "created_on": "2023-01-01 00:00:00",
                "last_altered": "2023-01-01 00:00:00"
            }
        ]


    def _get_mock_columns(self, schema_name: str, table_name: str) -> List[Dict[str, Any]]:
        """モックのカラム情報を返す"""
        return [
            {
                "name": "ID",
                "data_type": "NUMBER",
                "is_nullable": False,
                "default_value": None,
                "ordinal_position": 1
            },
            {
                "name": "NAME",
                "data_type": "VARCHAR",
                "is_nullable": True,
                "default_value": None,
                "ordinal_position": 2
            },
            {
                "name": "CREATED_AT",
                "data_type": "TIMESTAMP",
                "is_nullable": True,
                "default_value": "CURRENT_TIMESTAMP()",
                "ordinal_position": 3
            }
        ]

    def _get_mock_all_metadata(self) -> List[Dict[str, Any]]:
        """モックの全メタデータを返す"""
        return [
            {
                "name": "PUBLIC",
                "created_on": "2023-01-01 00:00:00",
                "owner": "SYSADMIN",
                "tables": [
                    {
                        "name": "SAMPLE_TABLE",
                        "schema_name": "PUBLIC",
                        "table_type": "TABLE",
                        "row_count": 1000,
                        "created_on": "2023-01-01 00:00:00",
                        "last_altered": "2023-01-01 00:00:00",
                        "columns": [
                            {
                                "name": "ID",
                                "data_type": "NUMBER",
                                "is_nullable": False,
                                "default_value": None,
                                "ordinal_position": 1
                            },
                            {
                                "name": "NAME",
                                "data_type": "VARCHAR",
                                "is_nullable": True,
                                "default_value": None,
                                "ordinal_position": 2
                            },
                            {
                                "name": "CREATED_AT",
                                "data_type": "TIMESTAMP",
                                "is_nullable": True,
                                "default_value": "CURRENT_TIMESTAMP()",
                                "ordinal_position": 3
                            }
                        ]
                    },
                    {
                        "name": "SAMPLE_VIEW",
                        "schema_name": "PUBLIC",
                        "table_type": "VIEW",
                        "row_count": None,
                        "created_on": "2023-01-01 00:00:00",
                        "last_altered": "2023-01-01 00:00:00",
                        "columns": [
                            {
                                "name": "ID",
                                "data_type": "NUMBER",
                                "is_nullable": False,
                                "default_value": None,
                                "ordinal_position": 1
                            },
                            {
                                "name": "NAME",
                                "data_type": "VARCHAR",
                                "is_nullable": True,
                                "default_value": None,
                                "ordinal_position": 2
                            }
                        ]
                    }
                ]
            }
        ]

    def get_schema_info_from_db(self) -> QueryResult:
        """スキーマ情報をDBから直接取得（DatabaseServiceから移行）"""
        sql = "SHOW SCHEMAS"
        self.logger.info("スキーマ情報取得", query=sql)
        return self.query_executor.execute_metadata_query(sql)

    def get_table_info_from_db(self, schema: str) -> QueryResult:
        """テーブル情報をDBから直接取得（DatabaseServiceから移行）"""
        sql = f"SHOW TABLES IN SCHEMA {schema}"
        self.logger.info("テーブル情報取得", query=sql, schema=schema)
        return self.query_executor.execute_metadata_query(sql)

    def get_column_info_from_db(self, schema: str, table: str) -> QueryResult:
        """カラム情報をDBから直接取得（DatabaseServiceから移行）"""
        sql = f"DESCRIBE TABLE {schema}.{table}"
        self.logger.info("カラム情報取得", query=sql, schema=schema, table=table)
        return self.query_executor.execute_metadata_query(sql) 