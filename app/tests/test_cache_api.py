# -*- coding: utf-8 -*-
"""
キャッシュ機能APIのテスト

/sql/cache/execute
/sql/cache/read
/sql/cache/download/csv
/sql/cache/unique-values
"""
import pytest
from fastapi.testclient import TestClient
from unittest.mock import Mock, patch, AsyncMock
from app.dependencies import (
    get_hybrid_sql_service_di, get_current_user, get_sql_log_service_di,
    get_streaming_state_service_di, get_session_service_di
)


class TestCacheSQLExecuteAPI:
    """キャッシュ機能付きSQL実行APIのテスト"""
    
    def test_cache_execute_sql_success(self, client: TestClient, mock_user):
        """正常なキャッシュSQL実行のテスト"""
        mock_service = AsyncMock()
        mock_service.execute_sql_with_cache.return_value = {
            "success": True,
            "session_id": "test_session_123",
            "total_count": 100,
            "processed_rows": 100,
            "execution_time": 0.5,
            "message": "SQL実行が完了しました"
        }
        
        app = client.app
        app.dependency_overrides[get_hybrid_sql_service_di] = lambda: mock_service
        app.dependency_overrides[get_current_user] = lambda: {"user_id": mock_user.user_id, "user_name": mock_user.user_name}
        app.dependency_overrides[get_sql_log_service_di] = lambda: Mock()
        
        try:
            response = client.post(
                "/api/v1/sql/cache/execute",
                json={"sql": "SELECT * FROM test_table", "limit": 10000}
            )
            
            assert response.status_code == 200
            data = response.json()
            assert data["success"] is True
            assert data["session_id"] == "test_session_123"
            assert data["total_count"] == 100
            assert data["processed_rows"] == 100
            assert "execution_time" in data
        finally:
            app.dependency_overrides.clear()
    
    def test_cache_execute_sql_requires_confirmation(self, client: TestClient, mock_user):
        """大容量データの確認要求のテスト"""
        mock_service = AsyncMock()
        mock_service.execute_sql_with_cache.return_value = {
            "status": "requires_confirmation",
            "total_count": 1000000,
            "message": "大容量データです。実行しますか？"
        }
        
        app = client.app
        app.dependency_overrides[get_hybrid_sql_service_di] = lambda: mock_service
        app.dependency_overrides[get_current_user] = lambda: {"user_id": mock_user.user_id, "user_name": mock_user.user_name}
        app.dependency_overrides[get_sql_log_service_di] = lambda: Mock()
        
        try:
            response = client.post(
                "/api/v1/sql/cache/execute",
                json={"sql": "SELECT * FROM large_table", "limit": None}
            )
            
            assert response.status_code == 200
            data = response.json()
            assert data["success"] is False
            assert data["session_id"] is None
            assert data["total_count"] == 1000000
            assert "大容量データです" in data["message"]
        finally:
            app.dependency_overrides.clear()
    
    def test_cache_execute_sql_error(self, client: TestClient, mock_user):
        """キャッシュSQL実行エラーのテスト"""
        mock_service = AsyncMock()
        mock_service.execute_sql_with_cache.side_effect = Exception("データベース接続エラー")
        
        app = client.app
        app.dependency_overrides[get_hybrid_sql_service_di] = lambda: mock_service
        app.dependency_overrides[get_current_user] = lambda: {"user_id": mock_user.user_id, "user_name": mock_user.user_name}
        app.dependency_overrides[get_sql_log_service_di] = lambda: Mock()
        
        try:
            response = client.post(
                "/api/v1/sql/cache/execute",
                json={"sql": "SELECT * FROM test_table"}
            )
            
            assert response.status_code == 400
            data = response.json()
            assert "データベース接続エラー" in data["message"]
        finally:
            app.dependency_overrides.clear()


class TestCacheReadAPI:
    """キャッシュデータ読み出しAPIのテスト"""
    
    def test_cache_read_success(self, client: TestClient, mock_hybrid_sql_service):
        """正常なキャッシュデータ読み出しのテスト"""
        app = client.app
        app.dependency_overrides[get_hybrid_sql_service_di] = lambda: mock_hybrid_sql_service
        
        try:
            response = client.post(
                "/api/v1/sql/cache/read",
                json={
                    "session_id": "test_session_123",
                    "page": 1,
                    "page_size": 10
                }
            )
            
            assert response.status_code == 200
            data = response.json()
            assert data["success"] is True
            assert data["data"] == [["value1", "value2"], ["value3", "value4"]]
            assert data["columns"] == ["column1", "column2"]
            assert data["total_count"] == 2
            assert data["page"] == 1
            assert data["page_size"] == 10
        finally:
            app.dependency_overrides.clear()
    
    def test_cache_read_with_filters_and_sort(self, client: TestClient):
        """フィルタとソート付きキャッシュデータ読み出しのテスト"""
        mock_service = Mock()
        mock_service.get_cached_data.return_value = {
            "success": True,
            "data": [["filtered_value1", "sorted_value2"]],
            "columns": ["column1", "column2"],
            "total_count": 1,
            "page": 1,
            "page_size": 10,
            "total_pages": 1,
            "session_info": {"session_id": "test_session_123"},
            "execution_time": 0.05
        }
        
        app = client.app
        app.dependency_overrides[get_hybrid_sql_service_di] = lambda: mock_service
        
        try:
            response = client.post(
                "/api/v1/sql/cache/read",
                json={
                    "session_id": "test_session_123",
                    "page": 1,
                    "page_size": 10,
                    "filters": {"column1": ["filtered_value1"]},
                    "sort_by": "column2",
                    "sort_order": "DESC"
                }
            )
            
            assert response.status_code == 200
            data = response.json()
            assert data["success"] is True
            assert data["data"] == [["filtered_value1", "sorted_value2"]]
            assert data["total_count"] == 1
            
            # サービスが正しい引数で呼ばれたかチェック
            mock_service.get_cached_data.assert_called_once_with(
                "test_session_123", 1, 10,
                {"column1": ["filtered_value1"]}, "column2", "DESC"
            )
        finally:
            app.dependency_overrides.clear()
    
    def test_cache_read_error(self, client: TestClient):
        """キャッシュデータ読み出しエラーのテスト"""
        mock_service = Mock()
        mock_service.get_cached_data.side_effect = Exception("キャッシュが見つかりません")
        
        app = client.app
        app.dependency_overrides[get_hybrid_sql_service_di] = lambda: mock_service
        
        try:
            response = client.post(
                "/api/v1/sql/cache/read",
                json={
                    "session_id": "invalid_session",
                    "page": 1,
                    "page_size": 10
                }
            )
            
            assert response.status_code == 400
            data = response.json()
            assert "キャッシュが見つかりません" in data["message"]
        finally:
            app.dependency_overrides.clear()


class TestCacheDownloadCSVAPI:
    """キャッシュCSVダウンロードAPIのテスト"""
    
    def test_cache_download_csv_success(self, client: TestClient):
        """正常なキャッシュCSVダウンロードのテスト"""
        mock_service = Mock()
        mock_service.get_cached_data.return_value = {
            "success": True,
            "data": [["value1", "value2"], ["value3", "value4"]],
            "columns": ["column1", "column2"],
            "total_count": 2
        }
        
        app = client.app
        app.dependency_overrides[get_hybrid_sql_service_di] = lambda: mock_service
        
        try:
            response = client.post(
                "/api/v1/sql/cache/download/csv",
                json={"session_id": "test_session_123"}
            )
            
            assert response.status_code == 200
            # content-typeには重複したcharsetが含まれる可能性があるため、部分一致で確認
            assert "text/csv" in response.headers["content-type"]
            assert "charset=utf-8" in response.headers["content-type"]
            assert "attachment" in response.headers["content-disposition"]
            
            # CSVコンテンツをチェック
            content = response.content.decode('utf-8')
            assert "column1,column2" in content
            assert "value1,value2" in content
            assert "value3,value4" in content
        finally:
            app.dependency_overrides.clear()
    
    def test_cache_download_csv_no_data(self, client: TestClient):
        """データなしキャッシュCSVダウンロードのテスト"""
        mock_service = AsyncMock()
        mock_service.read_cached_data.return_value = {
            "success": True,
            "data": [],
            "columns": [],
            "total_count": 0
        }
        
        app = client.app
        app.dependency_overrides[get_hybrid_sql_service_di] = lambda: mock_service
        
        try:
            response = client.post(
                "/api/v1/sql/cache/download-csv",
                json={"session_id": "empty_session"}
            )
            
            assert response.status_code == 404
            data = response.json()
            assert data["message"] == "Not Found"
        finally:
            app.dependency_overrides.clear()


class TestCacheUniqueValuesAPI:
    """キャッシュユニーク値取得APIのテスト"""
    
    def test_cache_unique_values_success(self, client: TestClient):
        """正常なキャッシュユニーク値取得のテスト"""
        mock_service = Mock()
        mock_service.get_unique_values.return_value = {
            "values": ["value1", "value2", "value3"],
            "total_count": 3,
            "is_truncated": False
        }
        
        app = client.app
        app.dependency_overrides[get_hybrid_sql_service_di] = lambda: mock_service
        
        try:
            response = client.post(
                "/api/v1/sql/cache/unique-values",
                json={
                    "session_id": "test_session_123",
                    "column_name": "column1"
                }
            )
            
            assert response.status_code == 200
            data = response.json()
            assert data["values"] == ["value1", "value2", "value3"]
            assert data["total_count"] == 3
            assert data["is_truncated"] is False
        finally:
            app.dependency_overrides.clear()
    
    def test_cache_unique_values_error(self, client: TestClient):
        """キャッシュユニーク値取得エラーのテスト"""
        mock_service = Mock()
        mock_service.get_unique_values.side_effect = Exception("カラムが見つかりません")
        
        app = client.app
        app.dependency_overrides[get_hybrid_sql_service_di] = lambda: mock_service
        
        try:
            response = client.post(
                "/api/v1/sql/cache/unique-values",
                json={
                    "session_id": "test_session_123",
                    "column_name": "invalid_column"
                }
            )
            
            assert response.status_code == 500
            data = response.json()
            assert "カラムが見つかりません" in data.get("message", data.get("detail", ""))
        finally:
            app.dependency_overrides.clear()


class TestSessionStatusAPI:
    """セッション状態APIのテスト"""
    
    def test_get_session_status_success(self, client: TestClient):
        """正常なセッション状態取得のテスト"""
        mock_service = Mock()
        mock_service.get_state.return_value = {
            "session_id": "test_session_123",
            "status": "completed",
            "total_count": 100,
            "processed_count": 100,
            "error_message": None
        }
        
        app = client.app
        app.dependency_overrides[get_streaming_state_service_di] = lambda: mock_service
        
        try:
            response = client.get("/api/v1/sql/cache/status/test_session_123")
            
            assert response.status_code == 200
            data = response.json()
            assert data["session_id"] == "test_session_123"
            assert data["status"] == "completed"
            assert data["is_complete"] is True
        finally:
            app.dependency_overrides.clear()


class TestCancelStreamingAPI:
    """ストリーミングキャンセルAPIのテスト"""
    
    def test_cancel_streaming_success(self, client: TestClient):
        """正常なストリーミングキャンセルのテスト"""
        mock_streaming_service = AsyncMock()
        mock_streaming_service.cancel_session.return_value = True
        
        mock_hybrid_service = AsyncMock()
        mock_hybrid_service.cleanup_session.return_value = True
        
        app = client.app
        app.dependency_overrides[get_streaming_state_service_di] = lambda: mock_streaming_service
        app.dependency_overrides[get_hybrid_sql_service_di] = lambda: mock_hybrid_service
        
        try:
            response = client.post(
                "/api/v1/sql/cache/cancel",
                json={"session_id": "test_session_123"}
            )
            
            assert response.status_code == 200
            data = response.json()
            assert data["success"] is True
            assert "キャンセルしました" in data["message"]
        finally:
            app.dependency_overrides.clear()
