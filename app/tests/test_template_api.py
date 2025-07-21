# -*- coding: utf-8 -*-
"""
テンプレート・パーツ管理APIのテスト

/templates/*
/parts/*
/user/templates/*
/user/parts/*
"""
import pytest
from fastapi.testclient import TestClient
from unittest.mock import Mock
from datetime import datetime
from app.dependencies import (
    get_template_service_di, get_part_service_di, get_current_user,
    get_user_preference_service_di, get_visibility_control_service_di
)


class TestTemplateAPI:
    """テンプレートAPIのテスト"""
    
    def test_create_template_success(self, client: TestClient, mock_user):
        """正常なテンプレート作成のテスト"""
        mock_service = Mock()
        
        # モックサービスの戻り値を適切に設定
        mock_template = Mock()
        mock_template.id = "1"
        mock_template.name = "テストテンプレート"
        mock_template.sql = "SELECT * FROM {table_name} WHERE {condition}"
        mock_template.created_at = "2024-01-01T00:00:00Z"
        
        mock_service.create_user_template.return_value = mock_template
        
        app = client.app
        app.dependency_overrides[get_template_service_di] = lambda: mock_service
        app.dependency_overrides[get_current_user] = lambda: {"user_id": mock_user.user_id, "user_name": mock_user.user_name}
        
        try:
            response = client.post(
                "/api/v1/users/templates",
                json={
                    "name": "テストテンプレート",
                    "sql": "SELECT * FROM {table_name} WHERE {condition}"
                }
            )
            
            assert response.status_code == 200
            data = response.json()
            assert data["id"] == "1"
            assert data["name"] == "テストテンプレート"
            assert "{table_name}" in data["sql"]
        finally:
            app.dependency_overrides.clear()
    
    def test_get_templates_success(self, client: TestClient, mock_user):
        """正常なテンプレート一覧取得のテスト"""
        mock_service = Mock()
        
        # モックテンプレートリストを作成
        mock_templates = []
        for i in range(2):
            template = Mock()
            template.id = str(i + 1)
            template.name = f"テストテンプレート{i + 1}"
            template.sql = f"SELECT * FROM table{i + 1}"
            template.created_at = "2024-01-01T00:00:00Z"
            mock_templates.append(template)
        
        mock_service.get_user_templates.return_value = mock_templates
        
        app = client.app
        app.dependency_overrides[get_template_service_di] = lambda: mock_service
        app.dependency_overrides[get_current_user] = lambda: {"user_id": mock_user.user_id, "user_name": mock_user.user_name}
        
        try:
            response = client.get("/api/v1/users/templates")
            
            assert response.status_code == 200
            data = response.json()
            assert len(data) == 2
            assert data[0]["name"] == "テストテンプレート1"
            assert data[1]["name"] == "テストテンプレート2"
        finally:
            app.dependency_overrides.clear()
    
    @pytest.mark.skip(reason="テンプレート更新APIは未実装")
    def test_update_template_success(self, client: TestClient, mock_user):
        """正常なテンプレート更新のテスト"""
        mock_service = Mock()
        
        # モックテンプレートの戻り値を設定
        mock_template = Mock()
        mock_template.id = "1"
        mock_template.name = "更新されたテンプレート"
        mock_template.sql = "SELECT {columns} FROM {table_name} WHERE {condition}"
        mock_template.created_at = "2024-01-01T00:00:00Z"
        
        mock_service.update_user_template.return_value = mock_template
        
        app = client.app
        app.dependency_overrides[get_template_service_di] = lambda: mock_service
        app.dependency_overrides[get_current_user] = lambda: {"user_id": mock_user.user_id, "user_name": mock_user.user_name}
        
        try:
            response = client.put(
                "/api/v1/users/templates/1",
                json={
                    "name": "更新されたテンプレート",
                    "sql": "SELECT {columns} FROM {table_name} WHERE {condition}"
                }
            )
            
            assert response.status_code == 200
            data = response.json()
            assert data["id"] == "1"
            assert data["name"] == "更新されたテンプレート"
            assert "{columns}" in data["sql"]
        finally:
            app.dependency_overrides.clear()
    
    def test_delete_template_success(self, client: TestClient, mock_user):
        """正常なテンプレート削除のテスト"""
        mock_service = Mock()
        mock_service.delete_user_template.return_value = True
        
        app = client.app
        app.dependency_overrides[get_template_service_di] = lambda: mock_service
        app.dependency_overrides[get_current_user] = lambda: {"user_id": mock_user.user_id, "user_name": mock_user.user_name}
        
        try:
            response = client.delete("/api/v1/users/templates/1")
            
            assert response.status_code == 200
            data = response.json()
            assert "削除しました" in data["message"]
        finally:
            app.dependency_overrides.clear()


class TestPartAPI:
    """パーツAPIのテスト"""
    
    def test_create_part_success(self, client: TestClient, mock_user):
        """正常なパーツ作成のテスト"""
        mock_service = Mock()
        
        # モックパーツの戻り値を設定
        mock_part = Mock()
        mock_part.id = "1"
        mock_part.name = "基本WHERE条件"
        mock_part.sql = "WHERE status = 'active'"
        mock_part.created_at = "2024-01-01T00:00:00Z"
        
        mock_service.create_user_part.return_value = mock_part
        
        app = client.app
        app.dependency_overrides[get_part_service_di] = lambda: mock_service
        app.dependency_overrides[get_current_user] = lambda: {"user_id": mock_user.user_id, "user_name": mock_user.user_name}
        
        try:
            response = client.post(
                "/api/v1/users/parts",
                json={
                    "name": "基本WHERE条件",
                    "sql": "WHERE status = 'active'"
                }
            )
            
            assert response.status_code == 200
            data = response.json()
            assert data["id"] == "1"
            assert data["name"] == "基本WHERE条件"
            assert "WHERE" in data["sql"]
        finally:
            app.dependency_overrides.clear()
    
    def test_get_parts_success(self, client: TestClient, mock_user):
        """正常なパーツ一覧取得のテスト"""
        mock_service = Mock()
        
        # モックパーツリストを作成
        mock_parts = []
        for i in range(2):
            part = Mock()
            part.id = str(i + 1)
            part.name = f"テストパーツ{i + 1}"
            part.sql = f"WHERE condition{i + 1} = 'value'"
            part.created_at = "2024-01-01T00:00:00Z"
            mock_parts.append(part)
        
        mock_service.get_user_parts.return_value = mock_parts
        
        app = client.app
        app.dependency_overrides[get_part_service_di] = lambda: mock_service
        app.dependency_overrides[get_current_user] = lambda: {"user_id": mock_user.user_id, "user_name": mock_user.user_name}
        
        try:
            response = client.get("/api/v1/users/parts")
            
            assert response.status_code == 200
            data = response.json()
            assert len(data) == 2
            assert data[0]["name"] == "テストパーツ1"
            assert data[1]["name"] == "テストパーツ2"
        finally:
            app.dependency_overrides.clear()
    
    @pytest.mark.skip(reason="カテゴリ別パーツ取得APIは未実装")
    def test_get_parts_by_category_success(self, client: TestClient, mock_user):
        """正常なカテゴリ別パーツ取得のテスト（未実装）"""
        pass
    
    @pytest.mark.skip(reason="全パーツ取得APIは未実装")
    def test_get_all_parts_success(self, client: TestClient, mock_user):
        """正常な全パーツ取得のテスト（未実装）"""
        pass
    
    def test_delete_part_success(self, client: TestClient, mock_user):
        """正常なパーツ削除のテスト"""
        mock_service = Mock()
        mock_service.delete_user_part.return_value = True
        
        app = client.app
        app.dependency_overrides[get_part_service_di] = lambda: mock_service
        app.dependency_overrides[get_current_user] = lambda: {"user_id": mock_user.user_id, "user_name": mock_user.user_name}
        
        try:
            response = client.delete("/api/v1/users/parts/1")
            
            assert response.status_code == 200
            data = response.json()
            assert "削除しました" in data["message"]
        finally:
            app.dependency_overrides.clear()


class TestUserTemplatePreferencesAPI:
    """ユーザーテンプレート設定APIのテスト"""
    
    @pytest.mark.skip(reason="API エンドポイント未実装のためスキップ")
    def test_get_user_template_preferences_success(self, client: TestClient, mock_user):
        """正常なユーザーテンプレート設定取得のテスト"""
        mock_service = Mock()
        mock_service.get_user_template_preferences.return_value = {
            "visible_templates": [1, 2, 3],
            "hidden_templates": [4, 5],
            "favorite_templates": [1, 3],
            "template_order": [1, 3, 2]
        }
        
        app = client.app
        app.dependency_overrides[get_user_preference_service_di] = lambda: mock_service
        app.dependency_overrides[get_current_user] = lambda: {"user_id": mock_user.user_id, "user_name": mock_user.user_name}
        
        try:
            response = client.get("/api/v1/user/templates/preferences")
            
            assert response.status_code == 200
            data = response.json()
            assert "visible_templates" in data
            assert "favorite_templates" in data
            assert len(data["visible_templates"]) == 3
            assert 1 in data["favorite_templates"]
        finally:
            app.dependency_overrides.clear()
    
    @pytest.mark.skip(reason="API エンドポイント未実装のためスキップ")
    def test_update_user_template_preferences_success(self, client: TestClient, mock_user):
        """正常なユーザーテンプレート設定更新のテスト"""
        mock_service = Mock()
        mock_service.update_user_template_preferences.return_value = True
        
        app = client.app
        app.dependency_overrides[get_user_preference_service_di] = lambda: mock_service
        app.dependency_overrides[get_current_user] = lambda: {"user_id": mock_user.user_id, "user_name": mock_user.user_name}
        
        try:
            response = client.put(
                "/api/v1/user/templates/preferences",
                json={
                    "visible_templates": [1, 2, 3, 6],
                    "favorite_templates": [1, 3, 6],
                    "template_order": [1, 6, 3, 2]
                }
            )
            
            assert response.status_code == 200
            data = response.json()
            assert data["success"] is True
            assert "更新しました" in data["message"]
        finally:
            app.dependency_overrides.clear()


class TestUserPartPreferencesAPI:
    """ユーザーパーツ設定APIのテスト"""
    
    @pytest.mark.skip(reason="API エンドポイント未実装のためスキップ")
    def test_get_user_part_preferences_success(self, client: TestClient, mock_user):
        """正常なユーザーパーツ設定取得のテスト"""
        mock_service = Mock()
        mock_service.get_user_part_preferences.return_value = {
            "visible_parts": [1, 2, 3, 4],
            "hidden_parts": [5, 6],
            "favorite_parts": [1, 4],
            "part_categories_order": ["select", "condition", "join", "order"]
        }
        
        app = client.app
        app.dependency_overrides[get_user_preference_service_di] = lambda: mock_service
        app.dependency_overrides[get_current_user] = lambda: {"user_id": mock_user.user_id, "user_name": mock_user.user_name}
        
        try:
            response = client.get("/api/v1/user/parts/preferences")
            
            assert response.status_code == 200
            data = response.json()
            assert "visible_parts" in data
            assert "favorite_parts" in data
            assert "part_categories_order" in data
            assert len(data["visible_parts"]) == 4
            assert "select" in data["part_categories_order"]
        finally:
            app.dependency_overrides.clear()
    
    @pytest.mark.skip(reason="API エンドポイント未実装のためスキップ")
    def test_update_user_part_preferences_success(self, client: TestClient, mock_user):
        """正常なユーザーパーツ設定更新のテスト"""
        mock_service = Mock()
        mock_service.update_user_part_preferences.return_value = True
        
        app = client.app
        app.dependency_overrides[get_user_preference_service_di] = lambda: mock_service
        app.dependency_overrides[get_current_user] = lambda: {"user_id": mock_user.user_id, "user_name": mock_user.user_name}
        
        try:
            response = client.put(
                "/api/v1/user/parts/preferences",
                json={
                    "visible_parts": [1, 2, 3, 4, 7],
                    "favorite_parts": [1, 4, 7],
                    "part_categories_order": ["select", "join", "condition", "order"]
                }
            )
            
            assert response.status_code == 200
            data = response.json()
            assert data["success"] is True
            assert "更新しました" in data["message"]
        finally:
            app.dependency_overrides.clear()


class TestTemplateDropdownAPI:
    """テンプレートドロップダウンAPIのテスト"""
    
    def test_get_template_dropdown_success(self, client: TestClient, mock_user):
        """正常なテンプレートドロップダウン取得のテスト"""
        mock_user_pref_service = Mock()
        
        # モックドロップダウンアイテムを作成
        mock_templates = []
        for i in range(2):
            template = Mock()
            template.id = str(i + 1)
            template.name = f"テストテンプレート{i + 1}"
            template.sql = f"SELECT * FROM table{i + 1}"
            template.type = "user"
            template.is_common = False
            mock_templates.append(template)
        
        mock_user_pref_service.get_visible_templates_for_dropdown.return_value = mock_templates
        
        app = client.app
        app.dependency_overrides[get_user_preference_service_di] = lambda: mock_user_pref_service
        app.dependency_overrides[get_current_user] = lambda: {"user_id": mock_user.user_id, "user_name": mock_user.user_name}
        
        try:
            response = client.get("/api/v1/users/templates-for-dropdown")
            
            assert response.status_code == 200
            data = response.json()
            assert len(data) == 2
            assert data[0]["name"] == "テストテンプレート1"
            assert data[0]["type"] == "user"
            assert data[0]["is_common"] == False
        finally:
            app.dependency_overrides.clear()


class TestPartDropdownAPI:
    """パーツドロップダウンAPIのテスト"""
    
    def test_get_part_dropdown_success(self, client: TestClient, mock_user):
        """正常なパーツドロップダウン取得のテスト"""
        mock_user_pref_service = Mock()
        
        # モックドロップダウンアイテムを作成
        mock_parts = []
        for i in range(2):
            part = Mock()
            part.id = str(i + 1)
            part.name = f"テストパーツ{i + 1}"
            part.sql = f"WHERE condition{i + 1} = 'value'"
            part.type = "user"
            part.is_common = False
            mock_parts.append(part)
        
        mock_user_pref_service.get_visible_parts_for_dropdown.return_value = mock_parts
        
        app = client.app
        app.dependency_overrides[get_user_preference_service_di] = lambda: mock_user_pref_service
        app.dependency_overrides[get_current_user] = lambda: {"user_id": mock_user.user_id, "user_name": mock_user.user_name}
        
        try:
            response = client.get("/api/v1/users/parts-for-dropdown")
            
            assert response.status_code == 200
            data = response.json()
            assert len(data) == 2
            assert data[0]["name"] == "テストパーツ1"
            assert data[0]["type"] == "user"
            assert data[0]["is_common"] == False
        finally:
            app.dependency_overrides.clear()
