# -*- coding: utf-8 -*-
"""
認証・ユーザー管理APIのテスト

/login
/logout
/refresh
/admin/login
"""
import pytest
from fastapi.testclient import TestClient
from unittest.mock import Mock, patch
from app.dependencies import (
    get_user_service, get_admin_service, get_session_service,
    get_hybrid_sql_service, get_streaming_state_service
)


class TestUserLoginAPI:
    """ユーザーログインAPIのテスト"""
    
    def test_login_success(self, client: TestClient):
        """正常なユーザーログインのテスト"""
        mock_service = Mock()
        mock_service.authenticate_user.return_value = {
            "success": True,
            "user_id": "test_user",
            "user_name": "Test User"
        }
        
        app = client.app
        app.dependency_overrides[get_user_service] = lambda: mock_service
        
        try:
            response = client.post(
                "/api/v1/login",
                json={"user_id": "test_user"}
            )
            
            assert response.status_code == 200
            data = response.json()
            assert data["success"] is True
            assert data["user_id"] == "test_user"
            assert data["user_name"] == "Test User"
        finally:
            app.dependency_overrides.clear()
    
    def test_login_invalid_user(self, client: TestClient):
        """無効なユーザーでのログインのテスト"""
        mock_service = Mock()
        mock_service.authenticate_user.return_value = {
            "success": False,
            "message": "ユーザーが見つかりません"
        }
        
        app = client.app
        app.dependency_overrides[get_user_service] = lambda: mock_service
        
        try:
            response = client.post(
                "/api/v1/login",
                json={"user_id": "invalid_user"}
            )
            
            assert response.status_code == 401
            data = response.json()
            assert "ユーザーが見つかりません" in data["detail"]
        finally:
            app.dependency_overrides.clear()
    
    def test_login_error(self, client: TestClient):
        """ログインエラーのテスト"""
        mock_service = Mock()
        mock_service.authenticate_user.side_effect = Exception("認証システムエラー")
        
        app = client.app
        app.dependency_overrides[get_user_service] = lambda: mock_service
        
        try:
            response = client.post(
                "/api/v1/login",
                json={"user_id": "test_user"}
            )
            
            assert response.status_code == 500
            data = response.json()
            assert "認証システムエラー" in data["detail"]
        finally:
            app.dependency_overrides.clear()


class TestUserLogoutAPI:
    """ユーザーログアウトAPIのテスト"""
    
    def test_logout_success(self, client: TestClient, mock_user):
        """正常なログアウトのテスト"""
        mock_session_service = Mock()
        mock_hybrid_service = Mock()
        mock_streaming_service = Mock()
        
        app = client.app
        app.dependency_overrides[get_session_service] = lambda: mock_session_service
        app.dependency_overrides[get_hybrid_sql_service] = lambda: mock_hybrid_service
        app.dependency_overrides[get_streaming_state_service] = lambda: mock_streaming_service
        
        try:
            # セッションを設定してからログアウト
            with client as c:
                with c.session_transaction() as sess:
                    sess["user_id"] = mock_user.user_id
                    sess["user_name"] = mock_user.user_name
                
                response = c.post("/api/v1/logout")
                
                assert response.status_code == 200
                data = response.json()
                assert data["success"] is True
                assert "ログアウトしました" in data["message"]
        finally:
            app.dependency_overrides.clear()
    
    def test_logout_without_session(self, client: TestClient):
        """セッションなしでのログアウトのテスト"""
        app = client.app
        app.dependency_overrides[get_session_service] = lambda: Mock()
        app.dependency_overrides[get_hybrid_sql_service] = lambda: Mock()
        app.dependency_overrides[get_streaming_state_service] = lambda: Mock()
        
        try:
            response = client.post("/api/v1/logout")
            
            assert response.status_code == 200
            data = response.json()
            assert data["success"] is True
            assert "ログアウトしました" in data["message"]
        finally:
            app.dependency_overrides.clear()


class TestUserRefreshAPI:
    """ユーザー情報更新APIのテスト"""
    
    def test_refresh_success(self, client: TestClient, mock_user):
        """正常なユーザー情報更新のテスト"""
        mock_service = Mock()
        mock_service.get_user_info.return_value = {
            "user_id": mock_user.user_id,
            "user_name": mock_user.user_name,
            "last_login": "2025-01-17T10:00:00"
        }
        
        app = client.app
        app.dependency_overrides[get_user_service] = lambda: mock_service
        
        try:
            # セッションを設定
            with client as c:
                with c.session_transaction() as sess:
                    sess["user_id"] = mock_user.user_id
                    sess["user_name"] = mock_user.user_name
                
                response = c.post("/api/v1/refresh")
                
                assert response.status_code == 200
                data = response.json()
                assert data["success"] is True
                assert data["user_id"] == mock_user.user_id
                assert data["user_name"] == mock_user.user_name
        finally:
            app.dependency_overrides.clear()
    
    def test_refresh_without_session(self, client: TestClient):
        """セッションなしでのユーザー情報更新のテスト"""
        response = client.post("/api/v1/refresh")
        
        assert response.status_code == 401
        data = response.json()
        assert "ユーザー情報が見つかりません" in data["detail"]


class TestAdminLoginAPI:
    """管理者ログインAPIのテスト"""
    
    def test_admin_login_success(self, client: TestClient):
        """正常な管理者ログインのテスト"""
        mock_service = Mock()
        mock_service.authenticate_admin.return_value = {
            "success": True,
            "user_id": "admin_user",
            "user_name": "Admin User",
            "is_admin": True
        }
        
        app = client.app
        app.dependency_overrides[get_admin_service] = lambda: mock_service
        
        try:
            response = client.post(
                "/api/v1/admin/login",
                json={"user_id": "admin_user"}
            )
            
            assert response.status_code == 200
            data = response.json()
            assert data["success"] is True
            assert data["user_id"] == "admin_user"
            assert data["user_name"] == "Admin User"
            assert data["is_admin"] is True
        finally:
            app.dependency_overrides.clear()
    
    def test_admin_login_invalid_admin(self, client: TestClient):
        """無効な管理者でのログインのテスト"""
        mock_service = Mock()
        mock_service.authenticate_admin.return_value = {
            "success": False,
            "message": "管理者権限がありません"
        }
        
        app = client.app
        app.dependency_overrides[get_admin_service] = lambda: mock_service
        
        try:
            response = client.post(
                "/api/v1/admin/login",
                json={"user_id": "regular_user"}
            )
            
            assert response.status_code == 403
            data = response.json()
            assert "管理者権限がありません" in data["detail"]
        finally:
            app.dependency_overrides.clear()
    
    def test_admin_login_error(self, client: TestClient):
        """管理者ログインエラーのテスト"""
        mock_service = Mock()
        mock_service.authenticate_admin.side_effect = Exception("管理者認証システムエラー")
        
        app = client.app
        app.dependency_overrides[get_admin_service] = lambda: mock_service
        
        try:
            response = client.post(
                "/api/v1/admin/login",
                json={"user_id": "admin_user"}
            )
            
            assert response.status_code == 500
            data = response.json()
            assert "管理者認証システムエラー" in data["detail"]
        finally:
            app.dependency_overrides.clear()


class TestUserInfoAPI:
    """ユーザー情報取得APIのテスト"""
    
    def test_get_user_info_success(self, client: TestClient, mock_user):
        """正常なユーザー情報取得のテスト"""
        mock_service = Mock()
        mock_service.get_user_info.return_value = {
            "user_id": mock_user.user_id,
            "user_name": mock_user.user_name,
            "last_login": "2025-01-17T10:00:00",
            "total_queries": 150,
            "last_query_time": "2025-01-17T09:30:00"
        }
        
        app = client.app
        app.dependency_overrides[get_user_service] = lambda: mock_service
        
        try:
            # 認証を設定
            with client as c:
                with c.session_transaction() as sess:
                    sess["user_id"] = mock_user.user_id
                    sess["user_name"] = mock_user.user_name
                
                response = c.get("/api/v1/user/info")
                
                assert response.status_code == 200
                data = response.json()
                assert data["user_id"] == mock_user.user_id
                assert data["user_name"] == mock_user.user_name
                assert data["total_queries"] == 150
        finally:
            app.dependency_overrides.clear()
    
    def test_get_user_info_unauthorized(self, client: TestClient):
        """未認証でのユーザー情報取得のテスト"""
        response = client.get("/api/v1/user/info")
        
        assert response.status_code == 401


class TestUserHistoryAPI:
    """ユーザー履歴APIのテスト"""
    
    def test_get_user_history_success(self, client: TestClient, mock_user):
        """正常なユーザー履歴取得のテスト"""
        mock_service = Mock()
        mock_service.get_user_history.return_value = {
            "history": [
                {
                    "sql": "SELECT * FROM table1",
                    "execution_time": 0.5,
                    "row_count": 100,
                    "timestamp": "2025-01-17T09:00:00"
                },
                {
                    "sql": "SELECT COUNT(*) FROM table2",
                    "execution_time": 0.2,
                    "row_count": 1,
                    "timestamp": "2025-01-17T08:30:00"
                }
            ],
            "total_count": 2
        }
        
        app = client.app
        app.dependency_overrides[get_sql_log_service] = lambda: mock_service
        
        try:
            # 認証を設定
            with client as c:
                with c.session_transaction() as sess:
                    sess["user_id"] = mock_user.user_id
                
                response = c.get("/api/v1/users/history")
                
                assert response.status_code == 200
                data = response.json()
                assert "history" in data
                assert len(data["history"]) == 2
                assert "SELECT * FROM table1" in data["history"][0]["sql"]
        finally:
            app.dependency_overrides.clear()
