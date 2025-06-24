# -*- coding: utf-8 -*-
"""
サービスクラスのテスト
"""
import pytest
from unittest.mock import patch, MagicMock
from datetime import datetime

from app.services.metadata_service import MetadataService
from app.services.export_service import ExportService
from app.services.query_executor import QueryExecutor, QueryResult
from app.services.sql_service import SQLService
from app.services.database_service import DatabaseService
from app.services.performance_service import PerformanceService
from app.services.connection_manager import ConnectionManager
from app.metadata_cache import MetadataCache
from app.exceptions import MetadataError, ExportError, SQLValidationError, SQLExecutionError


class TestMetadataService:
    """メタデータサービスのテスト"""
    
    @pytest.fixture
    def mock_query_executor(self):
        return MagicMock(spec=QueryExecutor)
    
    @pytest.fixture
    def mock_metadata_cache(self):
        return MagicMock(spec=MetadataCache)
    
    @pytest.fixture
    def metadata_service(self, mock_query_executor, mock_metadata_cache):
        return MetadataService(mock_query_executor, mock_metadata_cache)
    
    def test_metadata_service_initialization(self, metadata_service, mock_query_executor, mock_metadata_cache):
        """メタデータサービスの初期化テスト"""
        assert metadata_service.query_executor == mock_query_executor
        assert metadata_service.cache == mock_metadata_cache
        assert metadata_service.logger is not None
    
    def test_get_schemas(self, metadata_service, mock_query_executor):
        """スキーマ一覧取得のテスト"""
        mock_result = MagicMock()
        mock_result.success = True
        mock_result.data = [
            {'schema_name': 'SCHEMA1', 'created': '2023-01-01', 'schema_owner': 'OWNER1'},
            {'schema_name': 'SCHEMA2', 'created': '2023-01-02', 'schema_owner': 'OWNER2'}
        ]
        mock_query_executor.execute_query.return_value = mock_result
        
        result = metadata_service.get_schemas()
        
        assert len(result) == 2
        assert result[0]['name'] == 'SCHEMA1'
        assert result[0]['owner'] == 'OWNER1'
        assert result[1]['name'] == 'SCHEMA2'
        assert result[1]['owner'] == 'OWNER2'
    
    def test_get_tables(self, metadata_service, mock_query_executor):
        """テーブル一覧取得のテスト"""
        mock_result = MagicMock()
        mock_result.success = True
        mock_result.data = [
            {'table_name': 'TABLE1', 'table_type': 'TABLE', 'row_count': 100, 'created': '2023-01-01', 'last_altered': '2023-01-01'},
            {'table_name': 'VIEW1', 'table_type': 'VIEW', 'row_count': None, 'created': '2023-01-02', 'last_altered': '2023-01-02'}
        ]
        mock_query_executor.execute_query.return_value = mock_result
        
        result = metadata_service.get_tables('SCHEMA1')
        
        assert len(result) == 2
        assert result[0]['name'] == 'TABLE1'
        assert result[0]['schema_name'] == 'SCHEMA1'
        assert result[0]['table_type'] == 'TABLE'
        assert result[1]['name'] == 'VIEW1'
        assert result[1]['table_type'] == 'VIEW'
    
    def test_get_table_details(self, metadata_service, mock_query_executor):
        """テーブル詳細情報取得のテスト"""
        # テーブル情報のモック
        table_result = MagicMock()
        table_result.success = True
        table_result.data = [
            {'table_name': 'TABLE1', 'table_type': 'TABLE', 'row_count': 100, 'created': '2023-01-01', 'last_altered': '2023-01-01'}
        ]
        
        # カラム情報のモック
        column_result = MagicMock()
        column_result.success = True
        column_result.data = [
            {'column_name': 'id', 'data_type': 'NUMBER', 'is_nullable': 'NO'},
            {'column_name': 'name', 'data_type': 'VARCHAR', 'is_nullable': 'YES'}
        ]
        
        mock_query_executor.execute_query.side_effect = [table_result, column_result]
        
        result = metadata_service.get_table_info('SCHEMA1', 'TABLE1')
        
        assert result['name'] == 'TABLE1'
        assert result['schema_name'] == 'SCHEMA1'
        assert result['table_type'] == 'TABLE'
        assert len(result['columns']) == 2
        assert result['columns'][0]['name'] == 'id'
        assert result['columns'][0]['data_type'] == 'NUMBER'
        assert result['columns'][1]['name'] == 'name'
        assert result['columns'][1]['data_type'] == 'VARCHAR'
    
    def test_get_warehouses(self, metadata_service, mock_query_executor):
        """ウェアハウス情報取得のテスト"""
        mock_result = MagicMock()
        mock_result.success = True
        mock_result.data = [
            {'warehouse_name': 'WH1', 'warehouse_size': 'SMALL', 'warehouse_type': 'STANDARD', 'running': 2, 'queued': 1, 'is_default': True, 'is_current': True},
            {'warehouse_name': 'WH2', 'warehouse_size': 'MEDIUM', 'warehouse_type': 'STANDARD', 'running': 0, 'queued': 0, 'is_default': False, 'is_current': False}
        ]
        mock_query_executor.execute_query.return_value = mock_result
        
        result = metadata_service.get_warehouse_info()
        
        assert len(result) == 2
        assert result[0]['name'] == 'WH1'
        assert result[0]['size'] == 'SMALL'
        assert result[0]['type'] == 'STANDARD'
        assert result[0]['running'] == 2
        assert result[0]['queued'] == 1
        assert result[0]['is_default'] is True
        assert result[0]['is_current'] is True
    
    def test_get_databases(self, metadata_service, mock_query_executor):
        """データベース情報取得のテスト"""
        mock_result = MagicMock()
        mock_result.success = True
        mock_result.data = [
            {'database_name': 'DB1', 'owner': 'OWNER1', 'is_default': True, 'is_current': True},
            {'database_name': 'DB2', 'owner': 'OWNER2', 'is_default': False, 'is_current': False}
        ]
        mock_query_executor.execute_query.return_value = mock_result
        
        result = metadata_service.get_database_info()
        
        assert len(result) == 2
        assert result[0]['name'] == 'DB1'
        assert result[0]['owner'] == 'OWNER1'
        assert result[0]['is_default'] is True
        assert result[0]['is_current'] is True


class TestExportService:
    """エクスポートサービスのテスト"""
    
    @pytest.fixture
    def mock_query_executor(self):
        return MagicMock(spec=QueryExecutor)
    
    @pytest.fixture
    def export_service(self, mock_query_executor):
        return ExportService(mock_query_executor)
    
    def test_export_service_initialization(self, export_service, mock_query_executor):
        """エクスポートサービスの初期化テスト"""
        assert export_service.query_executor == mock_query_executor
        assert export_service.logger is not None
    
    def test_export_to_csv_stream(self, export_service, mock_query_executor):
        """CSVストリーミングエクスポートのテスト"""
        mock_result = MagicMock()
        mock_result.success = True
        mock_result.data = [
            {'id': 1, 'name': 'test1'},
            {'id': 2, 'name': 'test2'}
        ]
        mock_result.columns = ['id', 'name']
        mock_query_executor.execute_query.return_value = mock_result
        
        result = list(export_service.export_to_csv_stream("SELECT id, name FROM test_table"))
        
        assert len(result) > 0
        # CSVヘッダーとデータが含まれていることを確認
        csv_content = b''.join(result).decode('utf-8')
        assert 'id,name' in csv_content
        assert '1,test1' in csv_content
        assert '2,test2' in csv_content
    
    def test_export_data_to_csv(self, export_service, mock_query_executor):
        """データからCSVエクスポートのテスト"""
        data = [
            {'id': 1, 'name': 'test1'},
            {'id': 2, 'name': 'test2'}
        ]
        columns = ['id', 'name']
        
        result = export_service.export_data_to_csv(data, columns)
        
        assert isinstance(result, str)
        assert 'id,name' in result
        assert '1,test1' in result
        assert '2,test2' in result


class TestQueryExecutor:
    """クエリ実行器のテスト"""
    
    @pytest.fixture
    def mock_connection_manager(self):
        return MagicMock(spec=ConnectionManager)
    
    @pytest.fixture
    def query_executor(self, mock_connection_manager):
        return QueryExecutor(mock_connection_manager)
    
    def test_query_executor_initialization(self, query_executor, mock_connection_manager):
        """クエリ実行器の初期化テスト"""
        assert query_executor.connection_manager == mock_connection_manager
        assert query_executor.logger is not None
    
    def test_execute_query_success(self, query_executor, mock_connection_manager):
        """クエリ実行成功のテスト"""
        mock_connection = MagicMock()
        mock_cursor = MagicMock()
        # 実際のデータを返すように設定
        mock_cursor.fetchall.return_value = [(1, 'test')]  # タプルのリスト
        mock_cursor.description = [('id',), ('name',)]
        mock_cursor.sfqid = 'test-query-id'
        mock_connection.cursor.return_value = mock_cursor
        mock_connection_manager.get_connection.return_value = ('conn-1', mock_connection)
        
        result = query_executor.execute_query("SELECT id, name FROM test_table")
        
        assert result.success is True
        assert result.data == [{'id': 1, 'name': 'test'}]
        assert result.columns == ['id', 'name']
        assert result.row_count == 1
        assert result.query_id == 'test-query-id'
    
    def test_execute_query_error(self, query_executor, mock_connection_manager):
        """クエリ実行エラーのテスト"""
        mock_connection_manager.get_connection.side_effect = Exception("Connection failed")
        
        result = query_executor.execute_query("SELECT * FROM test_table")
        
        assert result.success is False
        assert result.error_message is not None
        assert "Connection failed" in result.error_message
    
    def test_execute_query_with_limit(self, query_executor, mock_connection_manager):
        """LIMIT付きクエリ実行のテスト"""
        mock_connection = MagicMock()
        mock_cursor = MagicMock()
        # 実際のデータを返すように設定
        mock_cursor.fetchmany.return_value = [(1,), (2,)]  # タプルのリスト
        mock_cursor.description = [('id',)]
        mock_cursor.sfqid = 'test-query-id'
        mock_connection.cursor.return_value = mock_cursor
        mock_connection_manager.get_connection.return_value = ('conn-1', mock_connection)
        
        result = query_executor.execute_query("SELECT id FROM test_table", limit=2)
        
        assert result.success is True
        assert result.data == [{'id': 1}, {'id': 2}]
        assert result.row_count == 2
        assert result.query_id == 'test-query-id'


class TestSQLService:
    """SQLサービスのテスト"""
    
    @pytest.fixture
    def mock_query_executor(self):
        return MagicMock(spec=QueryExecutor)
    
    @pytest.fixture
    def sql_service(self, mock_query_executor):
        return SQLService(mock_query_executor)
    
    def test_sql_service_initialization(self, sql_service, mock_query_executor):
        """SQLサービスの初期化テスト"""
        assert sql_service.query_executor == mock_query_executor
        assert sql_service.logger is not None
        assert sql_service.validator is not None
    
    def test_execute_sql_success(self, sql_service, mock_query_executor):
        """SQL実行成功のテスト"""
        # バリデーション成功のモック
        mock_validation_result = MagicMock()
        mock_validation_result.is_valid = True
        mock_validation_result.errors = []
        
        # クエリ実行成功のモック
        mock_query_result = MagicMock()
        mock_query_result.success = True
        mock_query_result.data = [{'id': 1, 'name': 'test'}]
        mock_query_result.columns = ['id', 'name']
        mock_query_result.row_count = 1
        mock_query_result.execution_time = 0.1
        mock_query_result.error_message = None
        mock_query_result.query_id = 'test-query-id'
        
        with patch.object(sql_service.validator, 'validate_sql', return_value=mock_validation_result):
            mock_query_executor.execute_query.return_value = mock_query_result
            
            result = sql_service.execute_sql('SELECT id, name FROM test_table WHERE id = 1')
            
            assert result.success is True
            assert result.data == [{'id': 1, 'name': 'test'}]
            assert result.columns == ['id', 'name']
            assert result.row_count == 1
            assert result.execution_time > 0
            assert result.query_id == 'test-query-id'
    
    def test_execute_sql_error(self, sql_service, mock_query_executor):
        """SQL実行エラーのテスト"""
        # バリデーション失敗のモック
        mock_validation_result = MagicMock()
        mock_validation_result.is_valid = False
        mock_validation_result.errors = ['Table not found']
        
        with patch.object(sql_service.validator, 'validate_sql', return_value=mock_validation_result):
            result = sql_service.execute_sql('SELECT * FROM non_existent_table')
            
            assert result.success is False
            assert 'Table not found' in result.error_message


class TestDatabaseService:
    """データベースサービスのテスト"""
    
    @pytest.fixture
    def mock_connection_manager(self):
        return MagicMock(spec=ConnectionManager)
    
    @pytest.fixture
    def mock_query_executor(self):
        return MagicMock(spec=QueryExecutor)
    
    @pytest.fixture
    def database_service(self, mock_connection_manager, mock_query_executor):
        return DatabaseService(mock_connection_manager, mock_query_executor)
    
    def test_database_service_initialization(self, database_service, mock_connection_manager, mock_query_executor):
        """データベースサービスの初期化テスト"""
        assert database_service.connection_manager == mock_connection_manager
        assert database_service.query_executor == mock_query_executor
        assert database_service.logger is not None
    
    def test_test_connection_success(self, database_service, mock_query_executor):
        """接続テスト成功のテスト"""
        mock_query_executor.test_connection.return_value = True
        
        result = database_service.test_connection()
        
        assert result is True
        mock_query_executor.test_connection.assert_called_once()
    
    def test_test_connection_failure(self, database_service, mock_query_executor):
        """接続テスト失敗のテスト"""
        mock_query_executor.test_connection.return_value = False
        
        result = database_service.test_connection()
        
        assert result is False
        mock_query_executor.test_connection.assert_called_once()
    
    def test_get_connection_status(self, database_service, mock_query_executor):
        """接続状態取得のテスト"""
        mock_query_executor.test_connection.return_value = True
        mock_query_executor.get_connection_status.return_value = {
            'active_connections': 3,
            'total_connections': 5,
            'max_connections': 10
        }
        
        result = database_service.get_connection_status()
        
        assert result['connected'] is True
        assert result['active_connections'] == 3
        assert result['total_connections'] == 5
        assert result['max_connections'] == 10
        assert 'pool_status' in result
    
    def test_get_pool_status(self, database_service, mock_query_executor):
        """接続プール状態取得のテスト"""
        mock_status = {
            'total_connections': 5,
            'active_connections': 3,
            'max_connections': 10
        }
        mock_query_executor.get_connection_status.return_value = mock_status
        
        result = database_service.get_pool_status()
        
        assert result == mock_status
        mock_query_executor.get_connection_status.assert_called_once()


class TestPerformanceService:
    """パフォーマンスサービスのテスト"""
    
    @pytest.fixture
    def performance_service(self):
        return PerformanceService()
    
    def test_performance_service_initialization(self, performance_service):
        """パフォーマンスサービスの初期化テスト"""
        assert performance_service.logger is not None
        assert performance_service.metrics is not None
    
    def test_get_performance_metrics(self, performance_service):
        """パフォーマンスメトリクス取得のテスト"""
        # テストデータを記録
        performance_service.record_request('/test', 0.1, True)
        performance_service.record_request('/test', 0.2, False)
        
        metrics = performance_service.get_metrics()
        
        assert 'total_requests' in metrics
        assert 'successful_requests' in metrics
        assert 'failed_requests' in metrics
        assert 'average_response_time' in metrics
        assert 'error_rate' in metrics
        assert 'timestamp' in metrics
        assert metrics['total_requests'] == 2
        assert metrics['successful_requests'] == 1
        assert metrics['failed_requests'] == 1
    
    def test_get_warehouse_usage(self, performance_service):
        """ウェアハウス使用状況取得のテスト"""
        # データベース操作を記録
        performance_service.record_database_operation('query', 0.1, True)
        performance_service.record_database_operation('connection', 0.05, True)
        
        metrics = performance_service.get_metrics()
        
        assert 'database_stats' in metrics
        db_stats = metrics['database_stats']
        assert db_stats['query_count'] == 1
        assert db_stats['total_connections'] == 1
        assert db_stats['avg_query_time'] > 0


if __name__ == '__main__':
    pytest.main([__file__]) 