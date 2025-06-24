# -*- coding: utf-8 -*-
"""
統合テスト
"""
import pytest
from unittest.mock import patch, MagicMock
from fastapi.testclient import TestClient
import json

from app.main import app


class TestAPIIntegration:
    """API統合テスト"""
    
    @pytest.fixture
    def client(self):
        """テストクライアント"""
        return TestClient(app)
    
    @patch('app.api.routes.get_settings')
    def test_health_check(self, mock_get_settings, client):
        """ヘルスチェックエンドポイントのテスト"""
        mock_settings = MagicMock()
        mock_settings.app_debug = False
        mock_get_settings.return_value = mock_settings
        
        with patch('app.api.routes.ConnectionManager') as mock_connection_manager:
            mock_manager = MagicMock()
            mock_connection_manager.return_value = mock_manager
            mock_manager.test_connection.return_value = True
            mock_manager.get_pool_status.return_value = {
                'total_connections': 5,
                'max_connections': 10,
                'active_connections': 3
            }
            
            response = client.get("/api/health")
            
            assert response.status_code == 200
            data = response.json()
            assert data['status'] == 'healthy'
            assert 'timestamp' in data
            assert 'version' in data
            assert 'connection_status' in data
            assert 'performance_metrics' in data
    
    @patch('app.api.routes.get_settings')
    def test_sql_execution_success(self, mock_get_settings, client):
        """SQL実行成功のテスト"""
        mock_settings = MagicMock()
        mock_get_settings.return_value = mock_settings
        
        with patch('app.api.routes.SQLService') as mock_sql_service:
            mock_service = MagicMock()
            mock_sql_service.return_value = mock_service
            mock_service.execute_sql.return_value = {
                'success': True,
                'data': [{'id': 1, 'name': 'test'}],
                'columns': ['id', 'name'],
                'row_count': 1,
                'execution_time': 0.1,
                'sql': 'SELECT id, name FROM test_table'
            }
            
            response = client.post(
                "/api/sql/execute",
                json={"sql": "SELECT id, name FROM test_table", "limit": 100}
            )
            
            assert response.status_code == 200
            data = response.json()
            assert data['success'] is True
            assert data['data'] == [{'id': 1, 'name': 'test'}]
            assert data['columns'] == ['id', 'name']
            assert data['row_count'] == 1
            assert data['sql'] == 'SELECT id, name FROM test_table'
            
            mock_service.execute_sql.assert_called_once_with(
                'SELECT id, name FROM test_table', limit=100
            )
    
    @patch('app.api.routes.get_settings')
    def test_sql_execution_error(self, mock_get_settings, client):
        """SQL実行エラーのテスト"""
        mock_settings = MagicMock()
        mock_get_settings.return_value = mock_settings
        
        with patch('app.api.routes.SQLService') as mock_sql_service:
            mock_service = MagicMock()
            mock_sql_service.return_value = mock_service
            mock_service.execute_sql.return_value = {
                'success': False,
                'data': None,
                'columns': None,
                'row_count': None,
                'execution_time': None,
                'sql': 'SELECT * FROM invalid_table',
                'error_message': 'Table not found'
            }
            
            response = client.post(
                "/api/sql/execute",
                json={"sql": "SELECT * FROM invalid_table"}
            )
            
            assert response.status_code == 200
            data = response.json()
            assert data['success'] is False
            assert data['error_message'] == 'Table not found'
            assert data['sql'] == 'SELECT * FROM invalid_table'
    
    @patch('app.api.routes.get_settings')
    def test_sql_validation_success(self, mock_get_settings, client):
        """SQLバリデーション成功のテスト"""
        mock_settings = MagicMock()
        mock_get_settings.return_value = mock_settings
        
        with patch('app.api.routes.SQLValidator') as mock_validator:
            mock_validator_instance = MagicMock()
            mock_validator.return_value = mock_validator_instance
            mock_validator_instance.validate_sql.return_value = {
                'is_valid': True,
                'errors': [],
                'warnings': ['Consider adding LIMIT clause'],
                'suggestions': ['Add WHERE clause for better performance']
            }
            
            response = client.post(
                "/api/sql/validate",
                json={"sql": "SELECT * FROM test_table"}
            )
            
            assert response.status_code == 200
            data = response.json()
            assert data['is_valid'] is True
            assert data['errors'] == []
            assert data['warnings'] == ['Consider adding LIMIT clause']
            assert data['suggestions'] == ['Add WHERE clause for better performance']
    
    @patch('app.api.routes.get_settings')
    def test_sql_validation_error(self, mock_get_settings, client):
        """SQLバリデーションエラーのテスト"""
        mock_settings = MagicMock()
        mock_get_settings.return_value = mock_settings
        
        with patch('app.api.routes.SQLValidator') as mock_validator:
            mock_validator_instance = MagicMock()
            mock_validator.return_value = mock_validator_instance
            mock_validator_instance.validate_sql.return_value = {
                'is_valid': False,
                'errors': ['Syntax error near FROM'],
                'warnings': [],
                'suggestions': ['Check SQL syntax']
            }
            
            response = client.post(
                "/api/sql/validate",
                json={"sql": "SELECT * FROM"}
            )
            
            assert response.status_code == 200
            data = response.json()
            assert data['is_valid'] is False
            assert data['errors'] == ['Syntax error near FROM']
            assert data['suggestions'] == ['Check SQL syntax']
    
    @patch('app.api.routes.get_settings')
    def test_sql_format_success(self, mock_get_settings, client):
        """SQL整形成功のテスト"""
        mock_settings = MagicMock()
        mock_get_settings.return_value = mock_settings
        
        with patch('app.api.routes.SQLValidator') as mock_validator:
            mock_validator_instance = MagicMock()
            mock_validator.return_value = mock_validator_instance
            mock_validator_instance.format_sql.return_value = {
                'formatted_sql': 'SELECT *\nFROM test_table\nWHERE id = 1;',
                'success': True
            }
            
            response = client.post(
                "/api/sql/format",
                json={"sql": "SELECT * FROM test_table WHERE id=1"}
            )
            
            assert response.status_code == 200
            data = response.json()
            assert data['success'] is True
            assert data['formatted_sql'] == 'SELECT *\nFROM test_table\nWHERE id = 1;'
    
    @patch('app.api.routes.get_settings')
    def test_get_schemas(self, mock_get_settings, client):
        """スキーマ一覧取得のテスト"""
        mock_settings = MagicMock()
        mock_get_settings.return_value = mock_settings
        
        with patch('app.api.routes.MetadataService') as mock_metadata_service:
            mock_service = MagicMock()
            mock_metadata_service.return_value = mock_service
            mock_service.get_schemas.return_value = [
                {'name': 'SCHEMA1', 'created_on': '2023-01-01', 'is_default': True},
                {'name': 'SCHEMA2', 'created_on': '2023-01-02', 'is_default': False}
            ]
            
            response = client.get("/api/metadata/schemas")
            
            assert response.status_code == 200
            data = response.json()
            assert data['total_count'] == 2
            assert len(data['schemas']) == 2
            assert data['schemas'][0]['name'] == 'SCHEMA1'
            assert data['schemas'][0]['is_default'] is True
            assert data['schemas'][1]['name'] == 'SCHEMA2'
            assert data['schemas'][1]['is_default'] is False
    
    @patch('app.api.routes.get_settings')
    def test_get_tables(self, mock_get_settings, client):
        """テーブル一覧取得のテスト"""
        mock_settings = MagicMock()
        mock_get_settings.return_value = mock_settings
        
        with patch('app.api.routes.MetadataService') as mock_metadata_service:
            mock_service = MagicMock()
            mock_metadata_service.return_value = mock_service
            mock_service.get_tables.return_value = [
                {'name': 'TABLE1', 'schema_name': 'SCHEMA1', 'table_type': 'TABLE', 'row_count': 100},
                {'name': 'VIEW1', 'schema_name': 'SCHEMA1', 'table_type': 'VIEW', 'row_count': None}
            ]
            
            response = client.get("/api/metadata/schemas/SCHEMA1/tables")
            
            assert response.status_code == 200
            data = response.json()
            assert data['schema_name'] == 'SCHEMA1'
            assert data['total_count'] == 2
            assert len(data['tables']) == 2
            assert data['tables'][0]['name'] == 'TABLE1'
            assert data['tables'][0]['table_type'] == 'TABLE'
            assert data['tables'][1]['name'] == 'VIEW1'
            assert data['tables'][1]['table_type'] == 'VIEW'
    
    @patch('app.api.routes.get_settings')
    def test_get_table_details(self, mock_get_settings, client):
        """テーブル詳細取得のテスト"""
        mock_settings = MagicMock()
        mock_get_settings.return_value = mock_settings
        
        with patch('app.api.routes.MetadataService') as mock_metadata_service:
            mock_service = MagicMock()
            mock_metadata_service.return_value = mock_service
            mock_service.get_table_details.return_value = {
                'table': {
                    'name': 'TABLE1',
                    'schema_name': 'SCHEMA1',
                    'table_type': 'TABLE',
                    'row_count': 100,
                    'created_on': '2023-01-01',
                    'last_altered': '2023-01-01'
                },
                'columns': [
                    {'name': 'id', 'data_type': 'NUMBER', 'is_nullable': False},
                    {'name': 'name', 'data_type': 'VARCHAR', 'is_nullable': True}
                ]
            }
            
            response = client.get("/api/metadata/schemas/SCHEMA1/tables/TABLE1")
            
            assert response.status_code == 200
            data = response.json()
            assert data['table']['name'] == 'TABLE1'
            assert data['table']['schema_name'] == 'SCHEMA1'
            assert data['table']['table_type'] == 'TABLE'
            assert len(data['columns']) == 2
            assert data['columns'][0]['name'] == 'id'
            assert data['columns'][0]['data_type'] == 'NUMBER'
            assert data['columns'][1]['name'] == 'name'
            assert data['columns'][1]['data_type'] == 'VARCHAR'
    
    @patch('app.api.routes.get_settings')
    def test_export_csv_success(self, mock_get_settings, client):
        """CSVエクスポート成功のテスト"""
        mock_settings = MagicMock()
        mock_get_settings.return_value = mock_settings
        
        with patch('app.api.routes.ExportService') as mock_export_service:
            mock_service = MagicMock()
            mock_export_service.return_value = mock_service
            mock_service.export_to_csv_stream.return_value = "id,name\n1,test1\n2,test2"
            
            response = client.post(
                "/api/export/csv",
                json={"sql": "SELECT id, name FROM test_table"}
            )
            
            assert response.status_code == 200
            assert response.headers['content-type'] == 'text/csv'
            assert response.headers['content-disposition'] == 'attachment; filename="export.csv"'
            assert "id,name" in response.text
            assert "1,test1" in response.text
            assert "2,test2" in response.text
    
    @patch('app.api.routes.get_settings')
    def test_export_csv_error(self, mock_get_settings, client):
        """CSVエクスポートエラーのテスト"""
        mock_settings = MagicMock()
        mock_get_settings.return_value = mock_settings
        
        with patch('app.api.routes.ExportService') as mock_export_service:
            mock_service = MagicMock()
            mock_export_service.return_value = mock_service
            mock_service.export_to_csv_stream.side_effect = Exception("Export failed")
            
            response = client.post(
                "/api/export/csv",
                json={"sql": "SELECT * FROM invalid_table"}
            )
            
            assert response.status_code == 500
            data = response.json()
            assert 'error' in data
    
    @patch('app.api.routes.get_settings')
    def test_get_connection_status(self, mock_get_settings, client):
        """接続状態取得のテスト"""
        mock_settings = MagicMock()
        mock_get_settings.return_value = mock_settings
        
        with patch('app.api.routes.DatabaseService') as mock_database_service:
            mock_service = MagicMock()
            mock_database_service.return_value = mock_service
            mock_service.get_connection_status.return_value = {
                'connected': True,
                'details': {
                    'total_connections': 5,
                    'max_connections': 10,
                    'active_connections': 3
                }
            }
            
            response = client.get("/api/connection/status")
            
            assert response.status_code == 200
            data = response.json()
            assert data['connected'] is True
            assert 'details' in data
            assert data['details']['total_connections'] == 5
            assert data['details']['max_connections'] == 10
            assert data['details']['active_connections'] == 3
    
    @patch('app.api.routes.get_settings')
    def test_get_performance_metrics(self, mock_get_settings, client):
        """パフォーマンスメトリクス取得のテスト"""
        mock_settings = MagicMock()
        mock_get_settings.return_value = mock_settings
        
        with patch('app.api.routes.PerformanceService') as mock_performance_service:
            mock_service = MagicMock()
            mock_performance_service.return_value = mock_service
            mock_service.get_performance_metrics.return_value = {
                'timestamp': 1234567890.0,
                'metrics': {
                    'active_queries': 2,
                    'queued_queries': 1,
                    'avg_response_time': 0.5
                }
            }
            
            response = client.get("/api/performance/metrics")
            
            assert response.status_code == 200
            data = response.json()
            assert data['timestamp'] == 1234567890.0
            assert 'metrics' in data
            assert data['metrics']['active_queries'] == 2
            assert data['metrics']['queued_queries'] == 1
            assert data['metrics']['avg_response_time'] == 0.5
    
    @patch('app.api.routes.get_settings')
    def test_get_warehouses(self, mock_get_settings, client):
        """ウェアハウス一覧取得のテスト"""
        mock_settings = MagicMock()
        mock_get_settings.return_value = mock_settings
        
        with patch('app.api.routes.MetadataService') as mock_metadata_service:
            mock_service = MagicMock()
            mock_metadata_service.return_value = mock_service
            mock_service.get_warehouses.return_value = [
                {'name': 'WH1', 'size': 'SMALL', 'type': 'STANDARD', 'running': 2, 'queued': 1, 'is_default': True, 'is_current': True},
                {'name': 'WH2', 'size': 'MEDIUM', 'type': 'STANDARD', 'running': 0, 'queued': 0, 'is_default': False, 'is_current': False}
            ]
            
            response = client.get("/api/metadata/warehouses")
            
            assert response.status_code == 200
            data = response.json()
            assert len(data) == 2
            assert data[0]['name'] == 'WH1'
            assert data[0]['size'] == 'SMALL'
            assert data[0]['is_default'] is True
            assert data[0]['is_current'] is True
            assert data[1]['name'] == 'WH2'
            assert data[1]['is_default'] is False
    
    @patch('app.api.routes.get_settings')
    def test_get_databases(self, mock_get_settings, client):
        """データベース一覧取得のテスト"""
        mock_settings = MagicMock()
        mock_get_settings.return_value = mock_settings
        
        with patch('app.api.routes.MetadataService') as mock_metadata_service:
            mock_service = MagicMock()
            mock_metadata_service.return_value = mock_service
            mock_service.get_databases.return_value = [
                {'name': 'DB1', 'created_on': '2023-01-01', 'owner': 'OWNER1', 'comment': 'Database 1', 'is_default': True, 'is_current': True},
                {'name': 'DB2', 'created_on': '2023-01-02', 'owner': 'OWNER2', 'comment': 'Database 2', 'is_default': False, 'is_current': False}
            ]
            
            response = client.get("/api/metadata/databases")
            
            assert response.status_code == 200
            data = response.json()
            assert len(data) == 2
            assert data[0]['name'] == 'DB1'
            assert data[0]['owner'] == 'OWNER1'
            assert data[0]['is_default'] is True
            assert data[0]['is_current'] is True
            assert data[1]['name'] == 'DB2'
            assert data[1]['is_default'] is False
    
    def test_invalid_endpoint(self, client):
        """無効なエンドポイントのテスト"""
        response = client.get("/api/invalid/endpoint")
        assert response.status_code == 404
    
    def test_invalid_json(self, client):
        """無効なJSONのテスト"""
        response = client.post(
            "/api/sql/execute",
            data="invalid json",
            headers={"Content-Type": "application/json"}
        )
        assert response.status_code == 422


if __name__ == '__main__':
    pytest.main([__file__]) 