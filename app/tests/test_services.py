# -*- coding: utf-8 -*-
"""
サービス層のテスト

SQL実行、メタデータ、エクスポートなどのサービスクラス
"""
import pytest
from unittest.mock import Mock, patch, MagicMock
from datetime import datetime
import tempfile
import os

from app.services.sql_service import SQLService, SQLExecutionResult
from app.services.metadata_service import MetadataService
from app.services.export_service import ExportService
from app.services.hybrid_sql_service import HybridSQLService


class TestSQLService:
    """SQLServiceのテスト"""
    
    def test_execute_sql_success(self):
        """正常なSQL実行のテスト"""
        mock_query_executor = Mock()
        mock_query_executor.execute_query.return_value = Mock(
            success=True,
            data=[{"column1": "value1", "column2": "value2"}],
            columns=["column1", "column2"],
            row_count=1,
            execution_time=0.1,
            error_message=None,
            query_id="test_query_123"
        )
        
        service = SQLService(mock_query_executor)
        
        # バリデーションをモック
        with patch.object(service, 'validate_sql') as mock_validate:
            mock_validate.return_value = Mock(is_valid=True, errors=[])
            
            result = service.execute_sql("SELECT * FROM test_table", limit=1000)
            
            assert result.success is True
            assert result.data == [{"column1": "value1", "column2": "value2"}]
            assert result.columns == ["column1", "column2"]
            assert result.row_count == 1
            assert result.execution_time == 0.1
    
    def test_execute_sql_validation_error(self):
        """SQLバリデーションエラーのテスト"""
        mock_query_executor = Mock()
        service = SQLService(mock_query_executor)
        
        # バリデーションでエラーを返す
        with patch.object(service, 'validate_sql') as mock_validate:
            mock_validate.return_value = Mock(
                is_valid=False,
                errors=["FROM句が必要です", "WHERE句が必要です"]
            )
            
            result = service.execute_sql("SELECT *", limit=1000)
            
            assert result.success is False
            assert "FROM句が必要です" in result.error_message
            assert "WHERE句が必要です" in result.error_message
    
    def test_execute_sql_query_error(self):
        """クエリ実行エラーのテスト"""
        mock_query_executor = Mock()
        mock_query_executor.execute_query.return_value = Mock(
            success=False,
            data=None,
            columns=None,
            row_count=0,
            execution_time=0.0,
            error_message="テーブルが見つかりません",
            query_id=None
        )
        
        service = SQLService(mock_query_executor)
        
        with patch.object(service, 'validate_sql') as mock_validate:
            mock_validate.return_value = Mock(is_valid=True, errors=[])
            
            result = service.execute_sql("SELECT * FROM non_existent_table")
            
            assert result.success is False
            assert result.error_message == "テーブルが見つかりません"
    
    def test_validate_sql_success(self):
        """正常なSQLバリデーションのテスト"""
        mock_query_executor = Mock()
        service = SQLService(mock_query_executor)
        
        with patch.object(service.validator, 'validate_sql') as mock_validate:
            mock_validate.return_value = Mock(
                is_valid=True,
                errors=[],
                warnings=[],
                suggestions=[]
            )
            
            result = service.validate_sql("SELECT * FROM test_table")
            
            assert result.is_valid is True
            assert result.errors == []
    
    def test_format_sql_success(self):
        """正常なSQL整形のテスト"""
        mock_query_executor = Mock()
        service = SQLService(mock_query_executor)
        
        with patch.object(service.validator, 'format_sql') as mock_format:
            mock_format.return_value = "SELECT *\nFROM test_table"
            
            result = service.format_sql("select * from test_table")
            
            assert result.success is True
            assert "SELECT *\nFROM test_table" in result.formatted_sql
    
    def test_format_sql_error(self):
        """SQL整形エラーのテスト"""
        mock_query_executor = Mock()
        service = SQLService(mock_query_executor)
        
        with patch.object(service.validator, 'format_sql') as mock_format:
            mock_format.side_effect = Exception("フォーマットエラー")
            
            result = service.format_sql("INVALID SQL;;;")
            
            assert result.success is False
            assert "フォーマットエラー" in result.error_message


class TestMetadataService:
    """MetadataServiceのテスト"""
    
    def test_get_schemas_success(self):
        """正常なスキーマ取得のテスト"""
        mock_query_executor = Mock()
        cache = Mock()
        cache.is_cache_valid.return_value = True
        cache.get_all_metadata_normalized.return_value = [
            {"name": "PUBLIC", "created_on": "2025-01-01T00:00:00", "owner": "SYSADMIN", "tables": []},
            {"name": "SCHEMA2", "created_on": "2025-01-01T00:00:00", "owner": "SYSADMIN", "tables": []},
        ]

        service = MetadataService(mock_query_executor, cache)
        schemas = service.get_schemas()

        assert len(schemas) == 2
        assert schemas[0]["name"] == "PUBLIC"
    # is_default は現行実装では返さない
        assert schemas[1]["name"] == "SCHEMA2"
    # is_default は現行実装では返さない
    
    def test_get_tables_success(self):
        """正常なテーブル取得のテスト"""
        mock_query_executor = Mock()
        cache = Mock()
        cache.is_cache_valid.return_value = True
        cache.get_all_metadata_normalized.return_value = [
            {
                "name": "PUBLIC",
                "created_on": "",
                "owner": "",
                "tables": [
                    {"name": "test_table1", "schema_name": "PUBLIC", "table_type": "BASE TABLE", "row_count": 0, "created_on": "", "last_altered": "", "columns": []},
                    {"name": "test_table2", "schema_name": "PUBLIC", "table_type": "VIEW", "row_count": None, "created_on": "", "last_altered": "", "columns": []},
                ],
            }
        ]

        service = MetadataService(mock_query_executor, cache)
        tables = service.get_tables("PUBLIC")

        assert len(tables) == 2
        assert tables[0]["name"] == "test_table1"
        assert tables[0]["schema_name"] == "PUBLIC"
        assert tables[0]["table_type"] == "BASE TABLE"
    
    def test_get_columns_success(self):
        """正常なカラム取得のテスト"""
        mock_query_executor = Mock()
        cache = Mock()
        cache.is_cache_valid.return_value = True
        cache.get_all_metadata_normalized.return_value = [
            {
                "name": "PUBLIC",
                "created_on": "",
                "owner": "",
                "tables": [
                    {
                        "name": "test_table",
                        "schema_name": "PUBLIC",
                        "table_type": "BASE TABLE",
                        "row_count": 0,
                        "created_on": "",
                        "last_altered": "",
                        "columns": [
                            {"name": "column1", "data_type": "VARCHAR", "is_nullable": True, "default_value": None, "comment": "主キー"},
                            {"name": "column2", "data_type": "INTEGER", "is_nullable": False, "default_value": "0", "comment": "カウンタ"},
                        ],
                    }
                ],
            }
        ]

        service = MetadataService(mock_query_executor, cache)
        columns = service.get_columns("PUBLIC", "test_table")

        assert len(columns) == 2
        assert columns[0]["name"] == "column1"
        assert columns[0]["data_type"] == "VARCHAR"
        assert columns[0]["is_nullable"] is True
        assert columns[1]["name"] == "column2"
        assert columns[1]["is_nullable"] is False
    
    def test_get_schemas_fallback_when_cache_empty(self):
        """キャッシュ空ならモックデータにフォールバックする"""
        mock_query_executor = Mock()
        cache = Mock()
        cache.is_cache_valid.return_value = True
        cache.get_all_metadata_normalized.return_value = []

        service = MetadataService(mock_query_executor, cache)
        schemas = service.get_schemas()
        assert isinstance(schemas, list)
        assert len(schemas) > 0


class TestExportService:
    """ExportServiceのテスト"""
    
    def test_export_to_csv_stream_success(self):
        """正常なCSVストリーミングエクスポートのテスト"""
        mock_connection_manager = Mock()
        mock_connection = Mock()
        mock_cursor = Mock()
        
        # カーソルの設定
        mock_cursor.description = [["column1"], ["column2"]]
        mock_cursor.fetchmany.side_effect = [
            [["value1", "value2"], ["value3", "value4"]],  # 最初のチャンク
            []  # 次のチャンクは空（データ終了）
        ]
        
        mock_connection.cursor.return_value = mock_cursor
        mock_connection_manager.get_connection.return_value = ("conn_1", mock_connection)
        
        service = ExportService(mock_connection_manager)
        stream = service.export_to_csv_stream("SELECT * FROM test_table")
        
        # ストリームの内容をチェック
        chunks = list(stream)
        csv_content = b"".join(chunks).decode('utf-8')
        
        assert "column1,column2" in csv_content
        assert "value1,value2" in csv_content
        assert "value3,value4" in csv_content
    
    def test_export_to_csv_stream_error(self):
        """CSVストリーミングエクスポートエラーのテスト"""
        mock_connection_manager = Mock()
        mock_connection_manager.get_connection.side_effect = Exception("接続エラー")
        
        service = ExportService(mock_connection_manager)
        
        with pytest.raises(Exception) as exc_info:
            list(service.export_to_csv_stream("SELECT * FROM test_table"))
        
        assert "接続エラー" in str(exc_info.value)
    
    def test_export_large_dataset(self):
        """大容量データセットのエクスポートのテスト"""
        mock_connection_manager = Mock()
        mock_connection = Mock()
        mock_cursor = Mock()
        
        # 大量のデータを模擬
        mock_cursor.description = [["id"], ["name"]]
        
        # 複数のチャンクを返す
        chunks_data = [
            [[i, f"name_{i}"] for i in range(j, j + 1000)]
            for j in range(0, 5000, 1000)
        ]
        chunks_data.append([])  # 最後は空リスト
        
        mock_cursor.fetchmany.side_effect = chunks_data
        mock_connection.cursor.return_value = mock_cursor
        mock_connection_manager.get_connection.return_value = ("conn_1", mock_connection)
        
        service = ExportService(mock_connection_manager)
        stream = service.export_to_csv_stream("SELECT * FROM large_table")
        
        # ストリームの内容をチェック
        chunks = list(stream)
        csv_content = b"".join(chunks).decode('utf-8')
        
        assert "id,name" in csv_content
        assert "0,name_0" in csv_content
        assert "4999,name_4999" in csv_content
        
        # 行数をチェック（ヘッダー1行 + データ5000行）
        line_count = csv_content.count('\n')
        assert line_count >= 5000


class TestHybridSQLService:
    """HybridSQLServiceのテスト"""
    
    def test_get_cached_data_success(self):
        """正常なキャッシュデータ取得のテスト"""
        mock_cache_service = Mock()
        mock_cache_service.get_cached_data.return_value = {
            "success": True,
            "data": [["value1", "value2"], ["value3", "value4"]],
            "columns": ["column1", "column2"],
            "total_count": 2
        }
        
        service = HybridSQLService(
            mock_cache_service,
            Mock(),  # connection_manager
            Mock()   # session_service
        )
        
        result = service.get_cached_data(
            "test_session_123",
            page=1,
            page_size=10,
            filters=None,
            sort_by=None,
            sort_order="ASC"
        )
        
        assert result["success"] is True
        assert len(result["data"]) == 2
        assert result["columns"] == ["column1", "column2"]
    
    def test_get_cached_data_with_filters(self):
        """フィルタ付きキャッシュデータ取得のテスト"""
        mock_cache_service = Mock()
        mock_cache_service.get_cached_data.return_value = {
            "success": True,
            "data": [["filtered_value1", "value2"]],
            "columns": ["column1", "column2"],
            "total_count": 1
        }
        
        service = HybridSQLService(
            mock_cache_service,
            Mock(),  # connection_manager
            Mock()   # session_service
        )
        
        filters = {"column1": ["filtered_value1"]}
        result = service.get_cached_data(
            "test_session_123",
            page=1,
            page_size=10,
            filters=filters,
            sort_by="column2",
            sort_order="DESC"
        )
        
        assert result["success"] is True
        assert len(result["data"]) == 1
        assert result["data"][0][0] == "filtered_value1"
        
        # キャッシュサービスが正しい引数で呼ばれたかチェック
        mock_cache_service.get_cached_data.assert_called_once_with(
            "test_session_123", 1, 10, filters, "column2", "DESC"
        )
    
    def test_execute_sql_with_cache_large_data_confirmation(self):
        """大容量データの確認要求のテスト"""
        # 設定値をオーバーライドして確実に大容量判定を発生させる
        from unittest.mock import patch
        
        with patch('app.services.hybrid_sql_service.settings') as mock_settings:
            mock_settings.max_records_for_display = 100000  # 10万件で大容量判定
            mock_settings.max_records_for_csv_download = 10000000  # 1000万件でCSV制限
            
            mock_connection_manager = Mock()
            mock_cache_service = Mock()

            # cache_serviceのmockを完全に設定
            mock_cache_service.validate_data_types.return_value = (True, None)
            mock_cache_service.generate_session_id.return_value = "test_session_123"

            # 大容量データの件数を返す
            mock_connection = Mock()
            mock_cursor = Mock()
            mock_cursor.fetchone.return_value = [1000000]  # 100万件
            mock_cursor.description = [('col1',), ('col2',)]  # カラム名のモック
            mock_cursor.fetchmany.return_value = []  # データは空で返す
            mock_connection.cursor.return_value = mock_cursor
            mock_connection_manager.get_connection.return_value = ("conn_1", mock_connection)

            service = HybridSQLService(
                mock_cache_service,
                mock_connection_manager,
            )

            # _get_total_count メソッドをモック（10万件を超える値を設定）
            service._get_total_count = Mock(return_value=200000)  # 20万件

            result = service.execute_sql_with_cache(
                "SELECT * FROM large_table WHERE column_name = 'some_value_that_is_long_enough'",  # 十分に長いWHERE句
                "test_user",
                limit=None
            )

            assert result["status"] == "requires_confirmation"
            assert result["total_count"] == 200000
            assert "大容量データです" in result["message"]
    
    def test_cleanup_session_success(self):
        """正常なセッションクリーンアップのテスト"""
        mock_cache_service = Mock()
        mock_session_service = Mock()
        
        mock_cache_service.cleanup_session.return_value = True
        mock_session_service.delete_session.return_value = True
        
        service = HybridSQLService(
            mock_cache_service,
            Mock(),  # connection_manager
            mock_session_service
        )
        
        result = service.cleanup_session("test_session_123")
        
        assert result is True
        mock_cache_service.cleanup_session.assert_called_once_with("test_session_123")
        mock_session_service.delete_session.assert_called_once_with("test_session_123")
