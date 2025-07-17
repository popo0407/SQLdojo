# -*- coding: utf-8 -*-
"""
ユーティリティ・設定APIのテスト

/health
/config/settings
/connection/status
/performance/metrics
/sql/suggest
"""
import pytest
from fastapi.testclient import TestClient
from unittest.mock import Mock
from app.dependencies import (
    get_sql_service, get_performance_service, get_completion_service
)


class TestHealthCheckAPI:
    """ヘルスチェックAPIのテスト"""
    
    def test_health_check_success(self, client: TestClient):
        """正常なヘルスチェックのテスト"""
        mock_sql_service = Mock()
        mock_sql_service.get_connection_status.return_value = {
            "is_connected": True,
            "connection_type": "snowflake",
            "database": "test_db",
            "schema": "PUBLIC"
        }
        
        mock_performance_service = Mock()
        mock_performance_service.get_metrics.return_value = {
            "cpu_usage": 45.2,
            "memory_usage": 512.8,
            "active_connections": 5,
            "avg_response_time": 0.3
        }
        
        app = client.app
        app.dependency_overrides[get_sql_service] = lambda: mock_sql_service
        app.dependency_overrides[get_performance_service] = lambda: mock_performance_service
        
        try:
            response = client.get("/api/v1/health")
            
            assert response.status_code == 200
            data = response.json()
            assert data["status"] == "healthy"
            assert "version" in data
            assert "timestamp" in data
            assert data["connection_status"]["is_connected"] is True
            assert "performance_metrics" in data
        finally:
            app.dependency_overrides.clear()
    
    def test_health_check_connection_error(self, client: TestClient):
        """接続エラー時のヘルスチェックのテスト"""
        mock_sql_service = Mock()
        mock_sql_service.get_connection_status.return_value = {
            "is_connected": False,
            "error": "データベース接続エラー"
        }
        
        mock_performance_service = Mock()
        mock_performance_service.get_metrics.return_value = {
            "cpu_usage": 80.5,
            "memory_usage": 1024.0,
            "active_connections": 0,
            "avg_response_time": None
        }
        
        app = client.app
        app.dependency_overrides[get_sql_service] = lambda: mock_sql_service
        app.dependency_overrides[get_performance_service] = lambda: mock_performance_service
        
        try:
            response = client.get("/api/v1/health")
            
            assert response.status_code == 200
            data = response.json()
            assert data["status"] == "healthy"  # APIレスポンス自体は正常
            assert data["connection_status"]["is_connected"] is False
            assert "データベース接続エラー" in data["connection_status"]["error"]
        finally:
            app.dependency_overrides.clear()


class TestConfigSettingsAPI:
    """設定情報APIのテスト"""
    
    def test_get_config_settings_success(self, client: TestClient):
        """正常な設定情報取得のテスト"""
        response = client.get("/api/v1/config/settings")
        
        assert response.status_code == 200
        data = response.json()
        assert "default_page_size" in data
        assert "max_records_for_display" in data
        assert "max_records_for_csv_download" in data
        assert isinstance(data["default_page_size"], int)
        assert isinstance(data["max_records_for_display"], int)
        assert isinstance(data["max_records_for_csv_download"], int)


class TestConnectionStatusAPI:
    """接続状態APIのテスト"""
    
    def test_get_connection_status_success(self, client: TestClient):
        """正常な接続状態取得のテスト"""
        mock_service = Mock()
        mock_service.get_connection_status.return_value = {
            "is_connected": True,
            "connection_type": "snowflake",
            "database": "test_db",
            "schema": "PUBLIC",
            "warehouse": "test_warehouse",
            "user": "test_user"
        }
        
        app = client.app
        app.dependency_overrides[get_sql_service] = lambda: mock_service
        
        try:
            response = client.get("/api/v1/connection/status")
            
            assert response.status_code == 200
            data = response.json()
            assert data["connected"] is True
            assert data["detail"]["is_connected"] is True
            assert data["detail"]["database"] == "test_db"
        finally:
            app.dependency_overrides.clear()
    
    def test_get_connection_status_disconnected(self, client: TestClient):
        """切断状態の接続状態取得のテスト"""
        mock_service = Mock()
        mock_service.get_connection_status.return_value = {
            "is_connected": False,
            "error": "認証エラー",
            "last_connection": "2025-01-17T08:00:00"
        }
        
        app = client.app
        app.dependency_overrides[get_sql_service] = lambda: mock_service
        
        try:
            response = client.get("/api/v1/connection/status")
            
            assert response.status_code == 200
            data = response.json()
            assert data["connected"] is False
            assert "認証エラー" in data["detail"]["error"]
        finally:
            app.dependency_overrides.clear()


class TestPerformanceMetricsAPI:
    """パフォーマンスメトリクスAPIのテスト"""
    
    def test_get_performance_metrics_success(self, client: TestClient):
        """正常なパフォーマンスメトリクス取得のテスト"""
        mock_service = Mock()
        mock_service.get_metrics.return_value = {
            "cpu_usage": 55.8,
            "memory_usage": 768.2,
            "disk_usage": 45.3,
            "active_connections": 8,
            "query_queue_size": 2,
            "avg_response_time": 0.45,
            "total_queries_today": 1250,
            "error_rate": 0.02
        }
        
        app = client.app
        app.dependency_overrides[get_performance_service] = lambda: mock_service
        
        try:
            response = client.get("/api/v1/performance/metrics")
            
            assert response.status_code == 200
            data = response.json()
            assert "timestamp" in data
            assert "metrics" in data
            assert data["metrics"]["cpu_usage"] == 55.8
            assert data["metrics"]["active_connections"] == 8
            assert data["metrics"]["total_queries_today"] == 1250
        finally:
            app.dependency_overrides.clear()
    
    def test_get_performance_metrics_error(self, client: TestClient):
        """パフォーマンスメトリクス取得エラーのテスト"""
        mock_service = Mock()
        mock_service.get_metrics.side_effect = Exception("メトリクス取得エラー")
        
        app = client.app
        app.dependency_overrides[get_performance_service] = lambda: mock_service
        
        try:
            response = client.get("/api/v1/performance/metrics")
            
            assert response.status_code == 500
        finally:
            app.dependency_overrides.clear()


class TestSQLSuggestAPI:
    """SQL補完候補APIのテスト"""
    
    def test_sql_suggest_success(self, client: TestClient):
        """正常なSQL補完候補取得のテスト"""
        mock_service = Mock()
        mock_service.get_completions.return_value = Mock(
            suggestions=[
                {
                    "label": "SELECT",
                    "kind": "keyword",
                    "detail": "SQL SELECT statement",
                    "documentation": "Retrieve data from database",
                    "insert_text": "SELECT ",
                    "sort_text": "0000"
                },
                {
                    "label": "test_table",
                    "kind": "table",
                    "detail": "Table in PUBLIC schema",
                    "documentation": "テストテーブル",
                    "insert_text": "test_table",
                    "sort_text": "0001"
                }
            ],
            is_incomplete=False
        )
        
        app = client.app
        app.dependency_overrides[get_completion_service] = lambda: mock_service
        
        try:
            response = client.post(
                "/api/v1/sql/suggest",
                json={
                    "sql": "SEL",
                    "position": 3,
                    "context": {"schema": "PUBLIC"}
                }
            )
            
            assert response.status_code == 200
            data = response.json()
            assert "suggestions" in data
            assert len(data["suggestions"]) == 2
            assert data["suggestions"][0]["label"] == "SELECT"
            assert data["suggestions"][0]["kind"] == "keyword"
            assert data["suggestions"][1]["label"] == "test_table"
            assert data["suggestions"][1]["kind"] == "table"
            assert data["is_incomplete"] is False
        finally:
            app.dependency_overrides.clear()
    
    def test_sql_suggest_empty_query(self, client: TestClient):
        """空のSQLクエリでの補完候補取得のテスト"""
        response = client.post(
            "/api/v1/sql/suggest",
            json={
                "sql": "",
                "position": 0
            }
        )
        
        assert response.status_code == 400
        data = response.json()
        assert "SQLクエリが空です" in data["detail"]
    
    def test_sql_suggest_error(self, client: TestClient):
        """SQL補完候補取得エラーのテスト"""
        mock_service = Mock()
        mock_service.get_completions.side_effect = Exception("補完エラー")
        
        app = client.app
        app.dependency_overrides[get_completion_service] = lambda: mock_service
        
        try:
            response = client.post(
                "/api/v1/sql/suggest",
                json={
                    "sql": "SELECT * FROM",
                    "position": 14
                }
            )
            
            assert response.status_code == 500
        finally:
            app.dependency_overrides.clear()
    
    def test_sql_suggest_table_completion(self, client: TestClient):
        """テーブル名補完のテスト"""
        mock_service = Mock()
        mock_service.get_completions.return_value = Mock(
            suggestions=[
                {
                    "label": "customer_table",
                    "kind": "table",
                    "detail": "Customer data table",
                    "documentation": "顧客データを格納するテーブル",
                    "insert_text": "customer_table",
                    "sort_text": "0000"
                },
                {
                    "label": "customer_orders",
                    "kind": "table",
                    "detail": "Customer orders table",
                    "documentation": "顧客の注文データ",
                    "insert_text": "customer_orders",
                    "sort_text": "0001"
                }
            ],
            is_incomplete=False
        )
        
        app = client.app
        app.dependency_overrides[get_completion_service] = lambda: mock_service
        
        try:
            response = client.post(
                "/api/v1/sql/suggest",
                json={
                    "sql": "SELECT * FROM cust",
                    "position": 18,
                    "context": {"schema": "PUBLIC", "prefix": "cust"}
                }
            )
            
            assert response.status_code == 200
            data = response.json()
            assert len(data["suggestions"]) == 2
            assert all(sug["kind"] == "table" for sug in data["suggestions"])
            assert all("customer" in sug["label"] for sug in data["suggestions"])
        finally:
            app.dependency_overrides.clear()


class TestCleanupAPI:
    """クリーンアップAPIのテスト"""
    
    def test_cleanup_cache_success(self, client: TestClient, mock_user):
        """正常なキャッシュクリーンアップのテスト"""
        mock_hybrid_service = Mock()
        mock_session_service = Mock()
        mock_streaming_service = Mock()
        
        app = client.app
        app.dependency_overrides[get_current_user] = lambda: {"user_id": mock_user.user_id, "user_name": mock_user.user_name}
        
        try:
            response = client.post("/api/v1/cleanup/cache")
            
            assert response.status_code == 200
            data = response.json()
            assert data["success"] is True
            assert "クリーンアップが完了しました" in data["message"]
        finally:
            app.dependency_overrides.clear()
