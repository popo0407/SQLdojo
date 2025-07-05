import pytest
import json
import os
import tempfile
import sqlite3
from unittest.mock import patch, MagicMock
from fastapi.testclient import TestClient
from app.main import app
from app.services.user_service import UserService
from app.metadata_cache import MetadataCache

class TestUserService:
    def setup_method(self):
        # テスト用のSQLiteデータベースを作成
        self.temp_dir = tempfile.mkdtemp()
        self.db_path = os.path.join(self.temp_dir, "test_metadata_cache.db")
        
        # テスト用のMetadataCacheを作成
        self.metadata_cache = MetadataCache(self.db_path)
        
        # テストユーザーデータをSQLiteに挿入
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()
            cursor.execute("DELETE FROM users")  # 既存データをクリア
            cursor.executemany(
                "INSERT INTO users (user_id, user_name) VALUES (?, ?)",
                [
                    ("test_user1", "テストユーザー1"),
                    ("test_user2", "テストユーザー2")
                ]
            )
            conn.commit()

    def teardown_method(self):
        import shutil
        shutil.rmtree(self.temp_dir)

    def test_authenticate_user_success(self):
        user_service = UserService(self.metadata_cache)
        result = user_service.authenticate_user("test_user1")
        assert result is not None
        assert result["user_id"] == "test_user1"
        assert result["user_name"] == "テストユーザー1"

    def test_authenticate_user_failure(self):
        user_service = UserService(self.metadata_cache)
        result = user_service.authenticate_user("nonexistent_user")
        assert result is None

    def test_get_all_users(self):
        user_service = UserService(self.metadata_cache)
        users = user_service.get_all_users()
        assert len(users) == 2
        user_ids = [user["user_id"] for user in users]
        assert "test_user1" in user_ids
        assert "test_user2" in user_ids

class TestAuthAPI:
    def setup_method(self):
        # テスト用のSQLiteデータベースを作成
        self.temp_dir = tempfile.mkdtemp()
        self.db_path = os.path.join(self.temp_dir, "test_metadata_cache.db")
        
        # テスト用のMetadataCacheを作成
        self.metadata_cache = MetadataCache(self.db_path)
        
        # テストユーザーデータをSQLiteに挿入
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()
            cursor.execute("DELETE FROM users")  # 既存データをクリア
            cursor.execute(
                "INSERT INTO users (user_id, user_name) VALUES (?, ?)",
                ("test_user1", "テストユーザー1")
            )
            conn.commit()
        
        self.client = TestClient(app)

    def teardown_method(self):
        import shutil
        shutil.rmtree(self.temp_dir)

    @patch('app.services.user_service.UserService.authenticate_user')
    def test_login_success(self, mock_authenticate):
        # モックの設定
        mock_authenticate.return_value = {"user_id": "test_user1", "user_name": "テストユーザー1"}
        
        response = self.client.post("/api/v1/login", json={"user_id": "test_user1"})
        assert response.status_code == 200
        data = response.json()
        assert data["message"] == "ログイン成功"
        assert data["user"]["user_id"] == "test_user1"
        assert data["user"]["user_name"] == "テストユーザー1"

    @patch('app.services.user_service.UserService.authenticate_user')
    def test_login_failure(self, mock_authenticate):
        # モックの設定
        mock_authenticate.return_value = None
        
        response = self.client.post("/api/v1/login", json={"user_id": "nonexistent_user"})
        assert response.status_code == 401
        data = response.json()
        assert "ユーザーIDが無効です" in data.get("detail", "")

    def test_logout(self):
        response = self.client.post("/api/v1/logout")
        assert response.status_code == 200
        data = response.json()
        assert data["message"] == "ログアウトしました"

    @patch('app.services.user_service.UserService.authenticate_user')
    def test_get_current_user_success(self, mock_authenticate):
        # モックの設定
        mock_authenticate.return_value = {"user_id": "test_user1", "user_name": "テストユーザー1"}
        
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
        # テスト用のSQLiteデータベースを作成
        self.temp_dir = tempfile.mkdtemp()
        self.db_path = os.path.join(self.temp_dir, "test_metadata_cache.db")
        
        # テスト用のMetadataCacheを作成
        self.metadata_cache = MetadataCache(self.db_path)
        
        # テストユーザーデータをSQLiteに挿入
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()
            cursor.execute("DELETE FROM users")  # 既存データをクリア
            cursor.execute(
                "INSERT INTO users (user_id, user_name) VALUES (?, ?)",
                ("test_user1", "テストユーザー1")
            )
            conn.commit()
        
        self.client = TestClient(app)

    def teardown_method(self):
        import shutil
        shutil.rmtree(self.temp_dir)

    def test_login_page(self):
        response = self.client.get("/login")
        assert response.status_code == 200
        assert "SQL道場webアプリ" in response.text
        assert "ユーザーID" in response.text

    def test_root_redirect_to_login(self):
        response = self.client.get("/", follow_redirects=False)
        assert response.status_code == 307 or response.status_code == 302
        assert response.headers["location"] == "/login"

    @patch('app.services.user_service.UserService.authenticate_user')
    def test_root_with_session(self, mock_authenticate):
        # モックの設定
        mock_authenticate.return_value = {"user_id": "test_user1", "user_name": "テストユーザー1"}
        
        response = self.client.post("/api/v1/login", json={"user_id": "test_user1"})
        assert response.status_code == 200
        response = self.client.get("/")
        assert response.status_code == 200
        assert "SQL道場 Webアプリ" in response.text or "SQLエディタ" in response.text

class TestAdminAuth:
    def setup_method(self):
        # テスト用のSQLiteデータベースを作成
        self.temp_dir = tempfile.mkdtemp()
        self.db_path = os.path.join(self.temp_dir, "test_metadata_cache.db")
        
        # テスト用のMetadataCacheを作成
        self.metadata_cache = MetadataCache(self.db_path)
        
        # テストユーザーデータをSQLiteに挿入
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()
            cursor.execute("DELETE FROM users")  # 既存データをクリア
            cursor.execute(
                "INSERT INTO users (user_id, user_name) VALUES (?, ?)",
                ("hint0530", "ヒントユーザー")
            )
            conn.commit()
        
        self.client = TestClient(app)

    def teardown_method(self):
        import shutil
        shutil.rmtree(self.temp_dir)

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

    @patch('app.services.user_service.UserService.authenticate_user')
    def test_admin_function_with_auth(self, mock_authenticate):
        # モックの設定
        mock_authenticate.return_value = {"user_id": "hint0530", "user_name": "ヒントユーザー"}
        
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