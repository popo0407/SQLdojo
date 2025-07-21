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
    get_user_service_di, get_admin_service_di, get_session_service_di,
    get_hybrid_sql_service_di, get_streaming_state_service_di,
    get_sql_log_service_di, get_current_user
)


class TestUserLoginAPI:
    """ユーザーログインAPIのテスト"""
    
    def test_login_success(self, client: TestClient):
        """正常なユーザーログインのテスト"""
        mock_service = Mock()
        # 実際のUserServiceは辞書を返す
        mock_service.authenticate_user.return_value = {
            "user_id": "test_user",
            "user_name": "Test User", 
            "role": "USER"
        }
        
        app = client.app
        app.dependency_overrides[get_user_service_di] = lambda: mock_service
        
        try:
            response = client.post(
                "/api/v1/login",
                json={"user_id": "test_user"}
            )
            
            assert response.status_code == 200
            data = response.json()
            # 実際のAPIレスポンス構造に合わせる
            assert data["message"] == "ログイン成功"
            assert data["user"]["user_id"] == "test_user"
            assert data["user"]["user_name"] == "Test User"
        finally:
            app.dependency_overrides.clear()
    
    def test_login_invalid_user(self, client: TestClient):
        """無効なユーザーでのログインのテスト"""
        mock_service = Mock()
        # 実際のUserServiceは失敗時にNoneを返す
        mock_service.authenticate_user.return_value = None
        
        app = client.app
        app.dependency_overrides[get_user_service_di] = lambda: mock_service
        
        try:
            response = client.post(
                "/api/v1/login",
                json={"user_id": "invalid_user"}
            )
            
            assert response.status_code == 401
            data = response.json()
            assert "ユーザーIDが無効です" in data["detail"]
        finally:
            app.dependency_overrides.clear()
    
    def test_login_error(self, client: TestClient):
        """ログインエラーのテスト"""
        mock_service = Mock()
        mock_service.authenticate_user.side_effect = Exception("認証システムエラー")
        
        app = client.app
        app.dependency_overrides[get_user_service_di] = lambda: mock_service
        
        try:
            # FastAPIのエラーハンドラーが例外をキャッチして500エラーにする
            try:
                response = client.post(
                    "/api/v1/login",
                    json={"user_id": "test_user"}
                )
                # 例外が発生せずにレスポンスが返ってきた場合は500エラーであることを確認
                assert response.status_code == 500
            except Exception as e:
                # 例外が発生した場合は、正しい例外メッセージであることを確認
                assert "認証システムエラー" in str(e)
        finally:
            app.dependency_overrides.clear()


class TestUserLogoutAPI:
    """ユーザーログアウトAPIのテスト"""
    
    def test_logout_success(self, client: TestClient):
        """正常なログアウトのテスト"""
        # 実際のAPIはセッションのクリアのみ行う（サービス依存なし）
        try:
            response = client.post("/api/v1/logout")
            
            assert response.status_code == 200
            data = response.json()
            # 実際のAPIレスポンス構造に合わせる
            assert data["message"] == "ログアウトしました"
        finally:
            pass  # 依存性注入なし
    
    def test_logout_without_session(self, client: TestClient):
        """セッションなしでのログアウトのテスト"""
        # セッションがなくてもログアウトは成功する（セッションをクリアするのみ）
        try:
            response = client.post("/api/v1/logout")
            
            assert response.status_code == 200
            data = response.json()
            assert data["message"] == "ログアウトしました"
        finally:
            pass  # 依存性注入なし


class TestUserRefreshAPI:
    """ユーザー情報更新APIのテスト"""
    
    @pytest.mark.skip(reason="TestClientはsession_transactionをサポートしていないためスキップ")
    def test_refresh_success(self, client: TestClient, mock_user):
        """正常なユーザー情報更新のテスト"""
        mock_service = Mock()
        mock_service.get_user_info.return_value = {
            "user_id": mock_user.user_id,
            "user_name": mock_user.user_name,
            "last_login": "2025-01-17T10:00:00"
        }
        
        app = client.app
        app.dependency_overrides[get_user_service_di] = lambda: mock_service
        
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
    
    @pytest.mark.skip(reason="リフレッシュAPIは未実装のためスキップ")
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
        # 管理者ログインは設定ファイルのパスワードのみで認証
        # AdminServiceは使用されない
        
        try:
            response = client.post(
                "/api/v1/admin/login",
                json={"password": "mono0000"}  # 実際の管理者パスワード
            )
            
            assert response.status_code == 200
            data = response.json()
            assert data["message"] == "管理者認証成功"
        finally:
            pass  # dependency_overrides不要
    
    def test_admin_login_invalid_admin(self, client: TestClient):
        """無効な管理者でのログインのテスト"""
        try:
            response = client.post(
                "/api/v1/admin/login",
                json={"password": "wrong_password"}
            )
            
            assert response.status_code == 401
            data = response.json()
            assert "管理者パスワードが無効です" in data["detail"]
        finally:
            pass
    
    def test_admin_login_error(self, client: TestClient):
        """管理者ログインエラーのテスト（パスワード未提供）"""
        try:
            response = client.post(
                "/api/v1/admin/login",
                json={}  # passwordフィールドなし
            )
            
            assert response.status_code == 422  # Validation Error
            data = response.json()
            assert "detail" in data
        finally:
            pass


class TestUserInfoAPI:
    """ユーザー情報取得APIのテスト"""
    
    @pytest.mark.skip(reason="TestClientはsession_transactionをサポートしていないためスキップ")
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
        app.dependency_overrides[get_user_service_di] = lambda: mock_service
        
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
    
    @pytest.mark.skip(reason="ユーザー情報APIは未実装のためスキップ")
    def test_get_user_info_unauthorized(self, client: TestClient):
        """未認証でのユーザー情報取得のテスト"""
        response = client.get("/api/v1/user/info")
        
        assert response.status_code == 401


class TestUserHistoryAPI:
    """ユーザー履歴APIのテスト"""
    
    @pytest.mark.skip(reason="TestClientはsession_transactionをサポートしていないためスキップ")
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
        app.dependency_overrides[get_sql_log_service_di] = lambda: mock_service
        
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
