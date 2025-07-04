# -*- coding: utf-8 -*-
"""
統合テスト
"""
import pytest
from fastapi.testclient import TestClient
from unittest.mock import patch, MagicMock
import json
from datetime import datetime

from app.main import app
from app.api.models import (
    SQLRequest, SQLResponse, SQLValidationRequest, SQLValidationResponse,
    SQLFormatRequest, SQLFormatResponse, ExportRequest, ExportResponse
)


class TestAPIIntegration:
    """API統合テスト"""
    
    @pytest.fixture
    def client(self):
        """テストクライアント（認証バイパス）"""
        from app.dependencies import get_current_user
        app.dependency_overrides[get_current_user] = lambda: {"user_id": 1, "username": "test_user", "role": "user"}
        with TestClient(app) as c:
            yield c
        app.dependency_overrides = {}
    
    def test_health_check(self, client):
        """ヘルスチェックエンドポイントのテスト"""
        with patch('app.services.sql_service.SQLService.get_connection_status') as mock_connection_status:
            with patch('app.services.performance_service.PerformanceService.get_metrics') as mock_metrics:
                mock_connection_status.return_value = {
                    'connected': True,
                    'active_connections': 2,
                    'total_connections': 5,
                    'max_connections': 10
                }
                mock_metrics.return_value = {
                    'total_requests': 10,
                    'successful_requests': 9,
                    'failed_requests': 1,
                    'average_response_time': 0.1,
                    'error_rate': 0.1,
                    'active_connections': 2,
                    'timestamp': 1234567890.0
                }
                
                response = client.get("/api/v1/health")
                assert response.status_code == 200
                data = response.json()
                assert data['status'] == 'healthy'
                assert 'version' in data
                assert 'timestamp' in data
                assert 'connection_status' in data
                assert 'performance_metrics' in data
    
    def test_sql_execution_success(self, client):
        """SQL実行成功のテスト"""
        with patch('app.services.sql_service.SQLService.execute_sql') as mock_execute, \
             patch('app.dependencies.get_current_user') as mock_user:
            # 認証をバイパス
            mock_user.return_value = {"username": "test_user", "role": "user"}
            
            mock_result = MagicMock()
            mock_result.success = True
            mock_result.data = [{'id': 1, 'name': 'test'}]
            mock_result.columns = ['id', 'name']
            mock_result.row_count = 1
            mock_result.execution_time = 0.1
            mock_result.error_message = None
            mock_result.sql = 'SELECT id, name FROM test_table WHERE id = 1'
            mock_execute.return_value = mock_result
            
            request_data = {
                "sql": "SELECT id, name FROM test_table WHERE id = 1",
                "limit": 100
            }
            
            response = client.post(
                "/api/v1/sql/execute",
                json=request_data
            )
            assert response.status_code == 200
            data = response.json()
            assert data['success'] is True
            assert data['data'] == [{'id': 1, 'name': 'test'}]
            assert data['columns'] == ['id', 'name']
            assert data['row_count'] == 1
    
    def test_sql_execution_error(self, client):
        """SQL実行エラーのテスト"""
        with patch('app.services.sql_service.SQLService.execute_sql') as mock_execute, \
             patch('app.dependencies.get_current_user') as mock_user:
            # 認証をバイパス
            mock_user.return_value = {"username": "test_user", "role": "user"}
            
            mock_result = MagicMock()
            mock_result.success = False
            mock_result.data = None
            mock_result.columns = None
            mock_result.row_count = 0
            mock_result.execution_time = 0.1
            mock_result.error_message = "Table not found"
            mock_result.sql = 'SELECT * FROM non_existent_table'
            mock_execute.return_value = mock_result
            
            request_data = {
                "sql": "SELECT * FROM non_existent_table",
                "limit": 100
            }
            
            response = client.post(
                "/api/v1/sql/execute",
                json=request_data
            )
            assert response.status_code == 400
            data = response.json()
            # エラーレスポンスの構造を確認
            assert 'error' in data
            assert 'message' in data
            assert 'Table not found' in data['message']
    
    def test_sql_validation_success(self, client):
        """SQL検証成功のテスト"""
        with patch('app.sql_validator.validate_sql') as mock_validate:
            mock_result = MagicMock()
            mock_result.is_valid = True
            mock_result.errors = []
            mock_result.warnings = []
            mock_validate.return_value = mock_result
            
            request_data = {
                "sql": "SELECT id, name FROM test_table WHERE id = 1"
            }
            
            response = client.post(
                "/api/v1/sql/validate",
                json=request_data
            )
            assert response.status_code == 200
            data = response.json()
            assert data['is_valid'] is True
            assert data['errors'] == []
    
    def test_sql_validation_error(self, client):
        """SQL検証エラーのテスト"""
        with patch('app.sql_validator.validate_sql') as mock_validate:
            mock_result = MagicMock()
            mock_result.is_valid = False
            mock_result.errors = ["WHERE句が必須です（システムテーブルを除く）"]
            mock_result.warnings = []
            mock_validate.return_value = mock_result
            
            request_data = {
                "sql": "SELECT * FROM"
            }
            
            response = client.post(
                "/api/v1/sql/validate",
                json=request_data
            )
            assert response.status_code == 200
            data = response.json()
            assert data['is_valid'] is False
            assert "WHERE句が必須です（システムテーブルを除く）" in data['errors']
    
    def test_sql_format_success(self, client):
        """SQLフォーマット成功のテスト"""
        with patch('app.sql_validator.format_sql') as mock_format:
            mock_format.return_value = "SELECT id, name\nFROM test_table\nWHERE id = 1;"
            
            request_data = {
                "sql": "SELECT id,name FROM test_table WHERE id=1"
            }
            
            response = client.post(
                "/api/v1/sql/format",
                json=request_data
            )
            assert response.status_code == 200
            data = response.json()
            assert data['success'] is True
            assert 'formatted_sql' in data
    
    def test_get_schemas(self, client):
        """スキーマ一覧取得のテスト"""
        response = client.get("/api/v1/metadata/schemas")
        assert response.status_code == 200
        data = response.json()
        # 実際のレスポンスはリスト形式
        assert isinstance(data, list)
        # モックデータが返される場合のテスト
        if len(data) > 0:
            assert 'name' in data[0]
    
    def test_get_tables(self, client):
        """テーブル一覧取得のテスト"""
        response = client.get("/api/v1/metadata/schemas/PUBLIC/tables")
        assert response.status_code == 200
        data = response.json()
        # 実際のレスポンスはリスト形式
        assert isinstance(data, list)
        # モックデータが返される場合のテスト
        if len(data) > 0:
            assert 'name' in data[0]
            assert 'schema_name' in data[0]
    
    def test_get_table_details(self, client):
        """テーブル詳細取得のテスト"""
        # 実際のエンドポイントパスを確認
        response = client.get("/api/v1/metadata/schemas/PUBLIC/tables/TEST_TABLE/columns")
        assert response.status_code == 200
        data = response.json()
        # 実際のレスポンスはリスト形式
        assert isinstance(data, list)
        # モックデータが返される場合のテスト
        if len(data) > 0:
            assert 'name' in data[0]
            assert 'data_type' in data[0]
    
    def test_export_csv_success(self, client):
        """CSVエクスポート成功のテスト"""
        with patch('app.services.export_service.ExportService.export_to_csv_stream') as mock_export:
            mock_export.return_value = iter([b'id,name\n1,test\n'])
            
            request_data = {
                "sql": "SELECT id, name FROM test_table WHERE id = 1"
            }
            
            response = client.post(
                "/api/v1/export",
                json=request_data
            )
            # ストリーミングレスポンスのため、ステータスコードは200
            assert response.status_code == 200
            assert 'text/csv' in response.headers['content-type']
    
    def test_export_csv_error(self, client):
        """CSVエクスポートエラーのテスト"""
        with patch('app.services.export_service.ExportService.export_to_csv_stream') as mock_export:
            from app.exceptions import ExportError
            mock_export.side_effect = ExportError("Export failed")
            
            request_data = {
                "sql": "SELECT * FROM non_existent_table"
            }
            
            response = client.post(
                "/api/v1/export",
                json=request_data
            )
            # エラーの場合は500エラーが返される
            assert response.status_code == 500
    
    def test_get_connection_status(self, client):
        """接続状態取得のテスト"""
        response = client.get("/api/v1/connection/status")
        assert response.status_code == 200
        data = response.json()
        assert 'connected' in data
        assert 'detail' in data
        assert 'active_connections' in data['detail']
        assert 'total_connections' in data['detail']
    
    def test_get_performance_metrics(self, client):
        """パフォーマンスメトリクス取得のテスト"""
        response = client.get("/api/v1/performance/metrics")
        assert response.status_code == 200
        data = response.json()
        assert 'timestamp' in data
        assert 'metrics' in data
        assert 'average_response_time' in data['metrics']
        assert 'error_rate' in data['metrics']
    
    def test_get_warehouses(self, client):
        """ウェアハウス情報取得のテスト"""
        response = client.get("/api/v1/metadata/all")
        assert response.status_code == 200
        data = response.json()
        # 実際のレスポンスはリスト形式
        assert isinstance(data, list)
        # モックデータが返される場合のテスト
        if len(data) > 0:
            assert 'name' in data[0]
            assert 'tables' in data[0]
    
    def test_get_databases(self, client):
        """データベース情報取得のテスト"""
        response = client.get("/api/v1/metadata/all")
        assert response.status_code == 200
        data = response.json()
        # 実際のレスポンスはリスト形式
        assert isinstance(data, list)
        # モックデータが返される場合のテスト
        if len(data) > 0:
            assert 'name' in data[0]
            assert 'tables' in data[0]
    
    def test_invalid_endpoint(self, client):
        """無効なエンドポイントのテスト"""
        response = client.get("/api/v1/invalid")
        assert response.status_code == 404
    
    def test_invalid_json(self, client):
        """無効なJSONのテスト"""
        response = client.post(
            "/api/v1/sql/execute",
            data="invalid json",
            headers={"Content-Type": "application/json"}
        )
        assert response.status_code == 422


if __name__ == '__main__':
    pytest.main([__file__]) 