import pytest
import json
import os
import tempfile
from fastapi.testclient import TestClient
from app.main import app
from app.services.user_service import UserService

class TestUserService:
    def setup_method(self):
        self.temp_dir = tempfile.mkdtemp()
        self.user_data_file = os.path.join(self.temp_dir, "user_data.json")
        self.test_users = {
            "test_user1": {"user_id": "test_user1", "user_name": "テストユーザー1"},
            "test_user2": {"user_id": "test_user2", "user_name": "テストユーザー2"}
        }
        with open(self.user_data_file, 'w', encoding='utf-8') as f:
            json.dump(self.test_users, f, ensure_ascii=False, indent=2)
        os.environ["USER_DATA_FILE"] = self.user_data_file

    def teardown_method(self):
        import shutil
        shutil.rmtree(self.temp_dir)
        if "USER_DATA_FILE" in os.environ:
            del os.environ["USER_DATA_FILE"]

    def test_authenticate_user_success(self):
        user_service = UserService()
        result = user_service.authenticate_user("test_user1")
        assert result is not None
        assert result["user_id"] == "test_user1"
        assert result["user_name"] == "テストユーザー1"

    def test_authenticate_user_failure(self):
        user_service = UserService()
        result = user_service.authenticate_user("nonexistent_user")
        assert result is None

    def test_get_all_users(self):
        user_service = UserService()
        users = user_service.get_all_users()
        assert len(users) == 2
        user_ids = [user["user_id"] for user in users]
        assert "test_user1" in user_ids
        assert "test_user2" in user_ids

class TestAuthAPI:
    def setup_method(self):
        self.temp_dir = tempfile.mkdtemp()
        self.user_data_file = os.path.join(self.temp_dir, "user_data.json")
        self.test_users = {
            "test_user1": {"user_id": "test_user1", "user_name": "テストユーザー1"}
        }
        with open(self.user_data_file, 'w', encoding='utf-8') as f:
            json.dump(self.test_users, f, ensure_ascii=False, indent=2)
        os.environ["USER_DATA_FILE"] = self.user_data_file
        self.client = TestClient(app)

    def teardown_method(self):
        import shutil
        shutil.rmtree(self.temp_dir)
        if "USER_DATA_FILE" in os.environ:
            del os.environ["USER_DATA_FILE"]

    def test_login_success(self):
        response = self.client.post("/api/v1/login", json={"user_id": "test_user1"})
        assert response.status_code == 200
        data = response.json()
        assert data["message"] == "ログイン成功"
        assert data["user"]["user_id"] == "test_user1"
        assert data["user"]["user_name"] == "テストユーザー1"

    def test_login_failure(self):
        response = self.client.post("/api/v1/login", json={"user_id": "nonexistent_user"})
        assert response.status_code == 401
        data = response.json()
        assert "ユーザーIDが無効です" in data.get("detail", "")

    def test_logout(self):
        response = self.client.post("/api/v1/logout")
        assert response.status_code == 200
        data = response.json()
        assert data["message"] == "ログアウトしました"

    def test_get_current_user_success(self):
        login_response = self.client.post("/api/v1/login", json={"user_id": "test_user1"})
        assert login_response.status_code == 200
        response = self.client.get("/api/v1/users/me")
        assert response.status_code == 200
        data = response.json()
        assert data["user_id"] == "test_user1"
        assert data["user_name"] == "テストユーザー1"

    def test_get_current_user_unauthorized(self):
        response = self.client.get("/api/v1/users/me")
        assert response.status_code == 401
        data = response.json()
        assert "未ログインです" in data.get("detail", "")

class TestAuthPages:
    def setup_method(self):
        self.temp_dir = tempfile.mkdtemp()
        self.user_data_file = os.path.join(self.temp_dir, "user_data.json")
        self.test_users = {
            "test_user1": {"user_id": "test_user1", "user_name": "テストユーザー1"}
        }
        with open(self.user_data_file, 'w', encoding='utf-8') as f:
            json.dump(self.test_users, f, ensure_ascii=False, indent=2)
        os.environ["USER_DATA_FILE"] = self.user_data_file
        self.client = TestClient(app)

    def teardown_method(self):
        import shutil
        shutil.rmtree(self.temp_dir)
        if "USER_DATA_FILE" in os.environ:
            del os.environ["USER_DATA_FILE"]

    def test_login_page(self):
        response = self.client.get("/login")
        assert response.status_code == 200
        assert "SQL道場webアプリ" in response.text
        assert "ユーザーID" in response.text

    def test_root_redirect_to_login(self):
        response = self.client.get("/", follow_redirects=False)
        assert response.status_code == 307 or response.status_code == 302
        assert response.headers["location"] == "/login"

    def test_root_with_session(self):
        response = self.client.post("/api/v1/login", json={"user_id": "test_user1"})
        assert response.status_code == 200
        response = self.client.get("/")
        assert response.status_code == 200
        assert "SQL道場 Webアプリ" in response.text or "SQLエディタ" in response.text

class TestAdminAuth:
    def setup_method(self):
        self.temp_dir = tempfile.mkdtemp()
        self.user_data_file = os.path.join(self.temp_dir, "user_data.json")
        self.test_users = {
            "hint0530": {"user_id": "hint0530", "user_name": "ヒントユーザー"}
        }
        with open(self.user_data_file, 'w', encoding='utf-8') as f:
            json.dump(self.test_users, f, ensure_ascii=False, indent=2)
        os.environ["USER_DATA_FILE"] = self.user_data_file
        self.client = TestClient(app)

    def teardown_method(self):
        import shutil
        shutil.rmtree(self.temp_dir)
        if "USER_DATA_FILE" in os.environ:
            del os.environ["USER_DATA_FILE"]

    def test_admin_login_success(self):
        response = self.client.post("/api/v1/admin/login", json={"password": "mono0000"})
        assert response.status_code == 200
        data = response.json()
        assert data["message"] == "管理者認証成功"

    def test_admin_login_failure(self):
        response = self.client.post("/api/v1/admin/login", json={"password": "wrong_password"})
        assert response.status_code == 401
        data = response.json()
        assert "管理者パスワードが無効です" in data.get("detail", "")

    def test_admin_logout(self):
        # まず管理者認証
        login_response = self.client.post("/api/v1/admin/login", json={"password": "mono0000"})
        assert login_response.status_code == 200
        
        # ログアウト
        logout_response = self.client.post("/api/v1/admin/logout")
        assert logout_response.status_code == 200
        data = logout_response.json()
        assert data["message"] == "管理者ログアウトしました"

    def test_admin_function_without_auth(self):
        # 管理者認証なしで管理者機能にアクセス
        response = self.client.post("/api/v1/admin/users/refresh")
        assert response.status_code == 403
        data = response.json()
        assert "管理者権限が必要です" in data.get("detail", "")

    def test_admin_function_with_auth(self):
        # まずユーザーログイン
        user_login = self.client.post("/api/v1/login", json={"user_id": "hint0530"})
        assert user_login.status_code == 200
        
        # 管理者認証
        admin_login = self.client.post("/api/v1/admin/login", json={"password": "mono0000"})
        assert admin_login.status_code == 200
        
        # 管理者機能にアクセス
        response = self.client.post("/api/v1/admin/users/refresh")
        assert response.status_code == 200

if __name__ == "__main__":
    pytest.main([__file__, "-v"]) 