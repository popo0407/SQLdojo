# -*- coding: utf-8 -*-
"""
サービスクラスのテスト
"""
import pytest
from unittest.mock import patch, MagicMock, AsyncMock
from datetime import datetime
from typing import List, Dict, Any

from app.services.metadata_service import MetadataService
from app.services.export_service import ExportService
from app.services.query_executor import QueryExecutor
from app.services.sql_service import SQLService
from app.services.database_service import DatabaseService
from app.services.performance_service import PerformanceService
from app.exceptions import DatabaseError, ValidationError


class TestMetadataService:
    """MetadataServiceクラスのテスト"""
    
    @patch('app.services.metadata_service.ConnectionManager')
    def test_metadata_service_initialization(self, mock_connection_manager):
        """MetadataService初期化のテスト"""
        mock_manager = MagicMock()
        mock_connection_manager.return_value = mock_manager
        
        service = MetadataService()
        
        assert service.connection_manager == mock_manager
        mock_connection_manager.assert_called_once()
    
    @patch('app.services.metadata_service.ConnectionManager')
    def test_get_schemas(self, mock_connection_manager):
        """get_schemasメソッドのテスト"""
        mock_manager = MagicMock()
        mock_connection_manager.return_value = mock_manager
        
        # モック接続とカーソルを設定
        mock_connection = MagicMock()
        mock_cursor = MagicMock()
        mock_connection.cursor.return_value = mock_cursor
        mock_cursor.fetchall.return_value = [
            ('SCHEMA1', '2023-01-01', True),
            ('SCHEMA2', '2023-01-02', False)
        ]
        mock_manager.get_connection.return_value = ('conn1', mock_connection)
        
        service = MetadataService()
        result = service.get_schemas()
        
        assert len(result) == 2
        assert result[0]['name'] == 'SCHEMA1'
        assert result[0]['is_default'] is True
        assert result[1]['name'] == 'SCHEMA2'
        assert result[1]['is_default'] is False
        
        mock_cursor.execute.assert_called_once()
        mock_manager.release_connection.assert_called_once_with('conn1')
    
    @patch('app.services.metadata_service.ConnectionManager')
    def test_get_tables(self, mock_connection_manager):
        """get_tablesメソッドのテスト"""
        mock_manager = MagicMock()
        mock_connection_manager.return_value = mock_manager
        
        mock_connection = MagicMock()
        mock_cursor = MagicMock()
        mock_connection.cursor.return_value = mock_cursor
        mock_cursor.fetchall.return_value = [
            ('TABLE1', 'SCHEMA1', 'TABLE', 100, '2023-01-01', '2023-01-01'),
            ('VIEW1', 'SCHEMA1', 'VIEW', None, '2023-01-02', '2023-01-02')
        ]
        mock_manager.get_connection.return_value = ('conn1', mock_connection)
        
        service = MetadataService()
        result = service.get_tables('SCHEMA1')
        
        assert len(result) == 2
        assert result[0]['name'] == 'TABLE1'
        assert result[0]['schema_name'] == 'SCHEMA1'
        assert result[0]['table_type'] == 'TABLE'
        assert result[0]['row_count'] == 100
        assert result[1]['name'] == 'VIEW1'
        assert result[1]['table_type'] == 'VIEW'
        
        mock_cursor.execute.assert_called_once()
        mock_manager.release_connection.assert_called_once_with('conn1')
    
    @patch('app.services.metadata_service.ConnectionManager')
    def test_get_table_details(self, mock_connection_manager):
        """get_table_detailsメソッドのテスト"""
        mock_manager = MagicMock()
        mock_connection_manager.return_value = mock_manager
        
        mock_connection = MagicMock()
        mock_cursor = MagicMock()
        mock_connection.cursor.return_value = mock_cursor
        
        # テーブル情報
        mock_cursor.fetchone.return_value = ('TABLE1', 'SCHEMA1', 'TABLE', 100, '2023-01-01', '2023-01-01')
        mock_manager.get_connection.return_value = ('conn1', mock_connection)
        
        service = MetadataService()
        result = service.get_table_details('SCHEMA1', 'TABLE1')
        
        assert result['table']['name'] == 'TABLE1'
        assert result['table']['schema_name'] == 'SCHEMA1'
        assert result['table']['table_type'] == 'TABLE'
        assert result['table']['row_count'] == 100
        
        mock_cursor.execute.assert_called()
        mock_manager.release_connection.assert_called_once_with('conn1')
    
    @patch('app.services.metadata_service.ConnectionManager')
    def test_get_warehouses(self, mock_connection_manager):
        """get_warehousesメソッドのテスト"""
        mock_manager = MagicMock()
        mock_connection_manager.return_value = mock_manager
        
        mock_connection = MagicMock()
        mock_cursor = MagicMock()
        mock_connection.cursor.return_value = mock_cursor
        mock_cursor.fetchall.return_value = [
            ('WH1', 'SMALL', 'STANDARD', 2, 1, True, True),
            ('WH2', 'MEDIUM', 'STANDARD', 0, 0, False, False)
        ]
        mock_manager.get_connection.return_value = ('conn1', mock_connection)
        
        service = MetadataService()
        result = service.get_warehouses()
        
        assert len(result) == 2
        assert result[0]['name'] == 'WH1'
        assert result[0]['size'] == 'SMALL'
        assert result[0]['is_default'] is True
        assert result[0]['is_current'] is True
        assert result[1]['name'] == 'WH2'
        assert result[1]['is_default'] is False
        
        mock_cursor.execute.assert_called_once()
        mock_manager.release_connection.assert_called_once_with('conn1')
    
    @patch('app.services.metadata_service.ConnectionManager')
    def test_get_databases(self, mock_connection_manager):
        """get_databasesメソッドのテスト"""
        mock_manager = MagicMock()
        mock_connection_manager.return_value = mock_manager
        
        mock_connection = MagicMock()
        mock_cursor = MagicMock()
        mock_connection.cursor.return_value = mock_cursor
        mock_cursor.fetchall.return_value = [
            ('DB1', '2023-01-01', 'OWNER1', 'Database 1', True, True),
            ('DB2', '2023-01-02', 'OWNER2', 'Database 2', False, False)
        ]
        mock_manager.get_connection.return_value = ('conn1', mock_connection)
        
        service = MetadataService()
        result = service.get_databases()
        
        assert len(result) == 2
        assert result[0]['name'] == 'DB1'
        assert result[0]['owner'] == 'OWNER1'
        assert result[0]['is_default'] is True
        assert result[0]['is_current'] is True
        assert result[1]['name'] == 'DB2'
        assert result[1]['is_default'] is False
        
        mock_cursor.execute.assert_called_once()
        mock_manager.release_connection.assert_called_once_with('conn1')


class TestExportService:
    """ExportServiceクラスのテスト"""
    
    @patch('app.services.export_service.ConnectionManager')
    def test_export_service_initialization(self, mock_connection_manager):
        """ExportService初期化のテスト"""
        mock_manager = MagicMock()
        mock_connection_manager.return_value = mock_manager
        
        service = ExportService()
        
        assert service.connection_manager == mock_manager
        mock_connection_manager.assert_called_once()
    
    @patch('app.services.export_service.ConnectionManager')
    def test_export_to_csv_stream(self, mock_connection_manager):
        """export_to_csv_streamメソッドのテスト"""
        mock_manager = MagicMock()
        mock_connection_manager.return_value = mock_manager
        
        mock_connection = MagicMock()
        mock_cursor = MagicMock()
        mock_connection.cursor.return_value = mock_cursor
        mock_cursor.description = [('id',), ('name',)]
        mock_cursor.fetchall.return_value = [(1, 'test1'), (2, 'test2')]
        mock_manager.get_connection.return_value = ('conn1', mock_connection)
        
        service = ExportService()
        result = service.export_to_csv_stream("SELECT id, name FROM test_table")
        
        # CSVデータが生成されることを確認
        assert 'id,name' in result
        assert '1,test1' in result
        assert '2,test2' in result
        
        mock_cursor.execute.assert_called_once_with("SELECT id, name FROM test_table")
        mock_manager.release_connection.assert_called_once_with('conn1')
    
    @patch('app.services.export_service.ConnectionManager')
    def test_export_data_to_csv(self, mock_connection_manager):
        """export_data_to_csvメソッドのテスト"""
        mock_manager = MagicMock()
        mock_connection_manager.return_value = mock_manager
        
        data = [
            {'id': 1, 'name': 'test1'},
            {'id': 2, 'name': 'test2'}
        ]
        columns = ['id', 'name']
        
        service = ExportService()
        result = service.export_data_to_csv(data, columns)
        
        assert 'id,name' in result
        assert '1,test1' in result
        assert '2,test2' in result


class TestQueryExecutor:
    """QueryExecutorクラスのテスト"""
    
    @patch('app.services.query_executor.ConnectionManager')
    def test_query_executor_initialization(self, mock_connection_manager):
        """QueryExecutor初期化のテスト"""
        mock_manager = MagicMock()
        mock_connection_manager.return_value = mock_manager
        
        service = QueryExecutor()
        
        assert service.connection_manager == mock_manager
        mock_connection_manager.assert_called_once()
    
    @patch('app.services.query_executor.ConnectionManager')
    def test_execute_query_success(self, mock_connection_manager):
        """execute_query成功のテスト"""
        mock_manager = MagicMock()
        mock_connection_manager.return_value = mock_manager
        
        mock_connection = MagicMock()
        mock_cursor = MagicMock()
        mock_connection.cursor.return_value = mock_cursor
        mock_cursor.description = [('id',), ('name',)]
        mock_cursor.fetchall.return_value = [(1, 'test1'), (2, 'test2')]
        mock_manager.get_connection.return_value = ('conn1', mock_connection)
        
        service = QueryExecutor()
        result = service.execute_query("SELECT id, name FROM test_table")
        
        assert result['success'] is True
        assert result['data'] == [{'id': 1, 'name': 'test1'}, {'id': 2, 'name': 'test2'}]
        assert result['columns'] == ['id', 'name']
        assert result['row_count'] == 2
        assert result['sql'] == "SELECT id, name FROM test_table"
        assert result['error_message'] is None
        
        mock_cursor.execute.assert_called_once_with("SELECT id, name FROM test_table")
        mock_manager.release_connection.assert_called_once_with('conn1')
    
    @patch('app.services.query_executor.ConnectionManager')
    def test_execute_query_error(self, mock_connection_manager):
        """execute_queryエラーのテスト"""
        mock_manager = MagicMock()
        mock_connection_manager.return_value = mock_manager
        
        mock_connection = MagicMock()
        mock_cursor = MagicMock()
        mock_connection.cursor.return_value = mock_cursor
        mock_cursor.execute.side_effect = Exception("SQL Error")
        mock_manager.get_connection.return_value = ('conn1', mock_connection)
        
        service = QueryExecutor()
        result = service.execute_query("SELECT * FROM invalid_table")
        
        assert result['success'] is False
        assert result['data'] is None
        assert result['columns'] is None
        assert result['row_count'] is None
        assert result['sql'] == "SELECT * FROM invalid_table"
        assert "SQL Error" in result['error_message']
        
        mock_manager.release_connection.assert_called_once_with('conn1')
    
    @patch('app.services.query_executor.ConnectionManager')
    def test_execute_query_with_limit(self, mock_connection_manager):
        """execute_query with limitのテスト"""
        mock_manager = MagicMock()
        mock_connection_manager.return_value = mock_manager
        
        mock_connection = MagicMock()
        mock_cursor = MagicMock()
        mock_connection.cursor.return_value = mock_cursor
        mock_cursor.description = [('id',)]
        mock_cursor.fetchall.return_value = [(1,), (2,), (3,)]
        mock_manager.get_connection.return_value = ('conn1', mock_connection)
        
        service = QueryExecutor()
        result = service.execute_query("SELECT id FROM test_table", limit=2)
        
        assert result['success'] is True
        assert len(result['data']) == 2  # limitで制限される
        assert result['row_count'] == 2
        
        mock_cursor.execute.assert_called_once_with("SELECT id FROM test_table LIMIT 2")
        mock_manager.release_connection.assert_called_once_with('conn1')


class TestSQLService:
    """SQLServiceクラスのテスト"""
    
    @patch('app.services.sql_service.QueryExecutor')
    def test_sql_service_initialization(self, mock_query_executor):
        """SQLService初期化のテスト"""
        mock_executor = MagicMock()
        mock_query_executor.return_value = mock_executor
        
        service = SQLService()
        
        assert service.query_executor == mock_executor
        mock_query_executor.assert_called_once()
    
    @patch('app.services.sql_service.QueryExecutor')
    def test_execute_sql_success(self, mock_query_executor):
        """execute_sql成功のテスト"""
        mock_executor = MagicMock()
        mock_query_executor.return_value = mock_executor
        
        expected_result = {
            'success': True,
            'data': [{'id': 1, 'name': 'test'}],
            'columns': ['id', 'name'],
            'row_count': 1,
            'execution_time': 0.1,
            'sql': 'SELECT id, name FROM test_table'
        }
        mock_executor.execute_query.return_value = expected_result
        
        service = SQLService()
        result = service.execute_sql('SELECT id, name FROM test_table', limit=100)
        
        assert result == expected_result
        mock_executor.execute_query.assert_called_once_with('SELECT id, name FROM test_table', limit=100)
    
    @patch('app.services.sql_service.QueryExecutor')
    def test_execute_sql_error(self, mock_query_executor):
        """execute_sqlエラーのテスト"""
        mock_executor = MagicMock()
        mock_query_executor.return_value = mock_executor
        
        expected_result = {
            'success': False,
            'data': None,
            'columns': None,
            'row_count': None,
            'execution_time': None,
            'sql': 'SELECT * FROM invalid_table',
            'error_message': 'Table not found'
        }
        mock_executor.execute_query.return_value = expected_result
        
        service = SQLService()
        result = service.execute_sql('SELECT * FROM invalid_table')
        
        assert result == expected_result
        mock_executor.execute_query.assert_called_once_with('SELECT * FROM invalid_table', limit=5000)


class TestDatabaseService:
    """DatabaseServiceクラスのテスト"""
    
    @patch('app.services.database_service.ConnectionManager')
    def test_database_service_initialization(self, mock_connection_manager):
        """DatabaseService初期化のテスト"""
        mock_manager = MagicMock()
        mock_connection_manager.return_value = mock_manager
        
        service = DatabaseService()
        
        assert service.connection_manager == mock_manager
        mock_connection_manager.assert_called_once()
    
    @patch('app.services.database_service.ConnectionManager')
    def test_test_connection_success(self, mock_connection_manager):
        """test_connection成功のテスト"""
        mock_manager = MagicMock()
        mock_connection_manager.return_value = mock_manager
        mock_manager.test_connection.return_value = True
        
        service = DatabaseService()
        result = service.test_connection()
        
        assert result['connected'] is True
        assert 'details' in result
        mock_manager.test_connection.assert_called_once()
    
    @patch('app.services.database_service.ConnectionManager')
    def test_test_connection_failure(self, mock_connection_manager):
        """test_connection失敗のテスト"""
        mock_manager = MagicMock()
        mock_connection_manager.return_value = mock_manager
        mock_manager.test_connection.return_value = False
        
        service = DatabaseService()
        result = service.test_connection()
        
        assert result['connected'] is False
        assert 'details' in result
        mock_manager.test_connection.assert_called_once()
    
    @patch('app.services.database_service.ConnectionManager')
    def test_get_connection_status(self, mock_connection_manager):
        """get_connection_statusのテスト"""
        mock_manager = MagicMock()
        mock_connection_manager.return_value = mock_manager
        
        pool_status = {
            'total_connections': 5,
            'max_connections': 10,
            'active_connections': 3,
            'connection_details': []
        }
        mock_manager.get_pool_status.return_value = pool_status
        mock_manager.test_connection.return_value = True
        
        service = DatabaseService()
        result = service.get_connection_status()
        
        assert result['connected'] is True
        assert result['details'] == pool_status
        mock_manager.get_pool_status.assert_called_once()
        mock_manager.test_connection.assert_called_once()


class TestPerformanceService:
    """PerformanceServiceクラスのテスト"""
    
    @patch('app.services.performance_service.ConnectionManager')
    def test_performance_service_initialization(self, mock_connection_manager):
        """PerformanceService初期化のテスト"""
        mock_manager = MagicMock()
        mock_connection_manager.return_value = mock_manager
        
        service = PerformanceService()
        
        assert service.connection_manager == mock_manager
        mock_connection_manager.assert_called_once()
    
    @patch('app.services.performance_service.ConnectionManager')
    def test_get_performance_metrics(self, mock_connection_manager):
        """get_performance_metricsのテスト"""
        mock_manager = MagicMock()
        mock_connection_manager.return_value = mock_manager
        
        mock_connection = MagicMock()
        mock_cursor = MagicMock()
        mock_connection.cursor.return_value = mock_cursor
        mock_cursor.fetchall.return_value = [
            ('QUERY1', 'RUNNING', 10.5, '2023-01-01 10:00:00'),
            ('QUERY2', 'QUEUED', 0.0, '2023-01-01 10:01:00')
        ]
        mock_manager.get_connection.return_value = ('conn1', mock_connection)
        
        service = PerformanceService()
        result = service.get_performance_metrics()
        
        assert 'timestamp' in result
        assert 'metrics' in result
        assert 'active_queries' in result['metrics']
        assert 'queued_queries' in result['metrics']
        
        mock_cursor.execute.assert_called()
        mock_manager.release_connection.assert_called_once_with('conn1')
    
    @patch('app.services.performance_service.ConnectionManager')
    def test_get_warehouse_usage(self, mock_connection_manager):
        """get_warehouse_usageのテスト"""
        mock_manager = MagicMock()
        mock_connection_manager.return_value = mock_manager
        
        mock_connection = MagicMock()
        mock_cursor = MagicMock()
        mock_connection.cursor.return_value = mock_cursor
        mock_cursor.fetchall.return_value = [
            ('WH1', 'SMALL', 2, 1, 50.0),
            ('WH2', 'MEDIUM', 0, 0, 0.0)
        ]
        mock_manager.get_connection.return_value = ('conn1', mock_connection)
        
        service = PerformanceService()
        result = service.get_warehouse_usage()
        
        assert len(result) == 2
        assert result[0]['warehouse'] == 'WH1'
        assert result[0]['size'] == 'SMALL'
        assert result[0]['running_queries'] == 2
        assert result[0]['queued_queries'] == 1
        assert result[0]['usage_percentage'] == 50.0
        
        mock_cursor.execute.assert_called_once()
        mock_manager.release_connection.assert_called_once_with('conn1')


if __name__ == '__main__':
    pytest.main([__file__]) 