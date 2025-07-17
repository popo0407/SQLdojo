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
    get_template_service, get_part_service, get_current_user,
    get_user_preference_service, get_visibility_control_service
)


class TestTemplateAPI:
    """テンプレートAPIのテスト"""
    
    def test_create_template_success(self, client: TestClient, mock_user):
        """正常なテンプレート作成のテスト"""
        mock_service = Mock()
        mock_service.create_template.return_value = {
            "template_id": 1,
            "name": "テストテンプレート",
            "sql_template": "SELECT * FROM {table_name} WHERE {condition}",
            "description": "テスト用のテンプレート",
            "created_by": mock_user.user_id,
            "created_at": datetime.now()
        }
        
        app = client.app
        app.dependency_overrides[get_template_service] = lambda: mock_service
        app.dependency_overrides[get_current_user] = lambda: {"user_id": mock_user.user_id, "user_name": mock_user.user_name}
        
        try:
            response = client.post(
                "/api/v1/templates",
                json={
                    "name": "テストテンプレート",
                    "sql_template": "SELECT * FROM {table_name} WHERE {condition}",
                    "description": "テスト用のテンプレート"
                }
            )
            
            assert response.status_code == 200
            data = response.json()
            assert data["template_id"] == 1
            assert data["name"] == "テストテンプレート"
            assert "{table_name}" in data["sql_template"]
        finally:
            app.dependency_overrides.clear()
    
    def test_get_templates_success(self, client: TestClient, mock_user):
        """正常なテンプレート一覧取得のテスト"""
        mock_service = Mock()
        mock_service.get_templates.return_value = [
            {
                "template_id": 1,
                "name": "基本SELECT",
                "sql_template": "SELECT * FROM {table_name}",
                "description": "基本的なSELECT文",
                "created_by": mock_user.user_id,
                "created_at": "2025-01-17T09:00:00"
            },
            {
                "template_id": 2,
                "name": "条件付きSELECT",
                "sql_template": "SELECT * FROM {table_name} WHERE {condition}",
                "description": "条件付きのSELECT文",
                "created_by": mock_user.user_id,
                "created_at": "2025-01-17T10:00:00"
            }
        ]
        
        app = client.app
        app.dependency_overrides[get_template_service] = lambda: mock_service
        app.dependency_overrides[get_current_user] = lambda: {"user_id": mock_user.user_id, "user_name": mock_user.user_name}
        app.dependency_overrides[get_visibility_control_service] = lambda: Mock()
        app.dependency_overrides[get_user_preference_service] = lambda: Mock()
        
        try:
            response = client.get("/api/v1/templates")
            
            assert response.status_code == 200
            data = response.json()
            assert "templates" in data
            assert len(data["templates"]) == 2
            assert data["templates"][0]["name"] == "基本SELECT"
            assert data["templates"][1]["name"] == "条件付きSELECT"
        finally:
            app.dependency_overrides.clear()
    
    def test_update_template_success(self, client: TestClient, mock_user):
        """正常なテンプレート更新のテスト"""
        mock_service = Mock()
        mock_service.update_template.return_value = {
            "template_id": 1,
            "name": "更新されたテンプレート",
            "sql_template": "SELECT {columns} FROM {table_name} WHERE {condition}",
            "description": "更新されたテンプレート",
            "created_by": mock_user.user_id,
            "updated_at": datetime.now()
        }
        
        app = client.app
        app.dependency_overrides[get_template_service] = lambda: mock_service
        app.dependency_overrides[get_current_user] = lambda: {"user_id": mock_user.user_id, "user_name": mock_user.user_name}
        
        try:
            response = client.put(
                "/api/v1/templates/1",
                json={
                    "name": "更新されたテンプレート",
                    "sql_template": "SELECT {columns} FROM {table_name} WHERE {condition}",
                    "description": "更新されたテンプレート"
                }
            )
            
            assert response.status_code == 200
            data = response.json()
            assert data["template_id"] == 1
            assert data["name"] == "更新されたテンプレート"
            assert "{columns}" in data["sql_template"]
        finally:
            app.dependency_overrides.clear()
    
    def test_delete_template_success(self, client: TestClient, mock_user):
        """正常なテンプレート削除のテスト"""
        mock_service = Mock()
        mock_service.delete_template.return_value = True
        
        app = client.app
        app.dependency_overrides[get_template_service] = lambda: mock_service
        app.dependency_overrides[get_current_user] = lambda: {"user_id": mock_user.user_id, "user_name": mock_user.user_name}
        
        try:
            response = client.delete("/api/v1/templates/1")
            
            assert response.status_code == 200
            data = response.json()
            assert data["success"] is True
            assert "削除しました" in data["message"]
        finally:
            app.dependency_overrides.clear()


class TestPartAPI:
    """パーツAPIのテスト"""
    
    def test_create_part_success(self, client: TestClient, mock_user):
        """正常なパーツ作成のテスト"""
        mock_service = Mock()
        mock_service.create_part.return_value = {
            "part_id": 1,
            "name": "基本WHERE条件",
            "sql_part": "WHERE status = 'active'",
            "description": "アクティブレコードの条件",
            "category": "condition",
            "created_by": mock_user.user_id,
            "created_at": datetime.now()
        }
        
        app = client.app
        app.dependency_overrides[get_part_service] = lambda: mock_service
        app.dependency_overrides[get_current_user] = lambda: {"user_id": mock_user.user_id, "user_name": mock_user.user_name}
        
        try:
            response = client.post(
                "/api/v1/parts",
                json={
                    "name": "基本WHERE条件",
                    "sql_part": "WHERE status = 'active'",
                    "description": "アクティブレコードの条件",
                    "category": "condition"
                }
            )
            
            assert response.status_code == 200
            data = response.json()
            assert data["part_id"] == 1
            assert data["name"] == "基本WHERE条件"
            assert "WHERE" in data["sql_part"]
            assert data["category"] == "condition"
        finally:
            app.dependency_overrides.clear()
    
    def test_get_parts_by_category_success(self, client: TestClient, mock_user):
        """正常なカテゴリ別パーツ取得のテスト"""
        mock_service = Mock()
        mock_service.get_parts_by_category.return_value = [
            {
                "part_id": 1,
                "name": "基本WHERE条件",
                "sql_part": "WHERE status = 'active'",
                "description": "アクティブレコードの条件",
                "category": "condition"
            },
            {
                "part_id": 2,
                "name": "日付条件",
                "sql_part": "WHERE created_date >= '{start_date}'",
                "description": "作成日の条件",
                "category": "condition"
            }
        ]
        
        app = client.app
        app.dependency_overrides[get_part_service] = lambda: mock_service
        app.dependency_overrides[get_current_user] = lambda: {"user_id": mock_user.user_id, "user_name": mock_user.user_name}
        app.dependency_overrides[get_visibility_control_service] = lambda: Mock()
        app.dependency_overrides[get_user_preference_service] = lambda: Mock()
        
        try:
            response = client.get("/api/v1/parts?category=condition")
            
            assert response.status_code == 200
            data = response.json()
            assert "parts" in data
            assert len(data["parts"]) == 2
            assert all(part["category"] == "condition" for part in data["parts"])
        finally:
            app.dependency_overrides.clear()
    
    def test_get_all_parts_success(self, client: TestClient, mock_user):
        """正常な全パーツ取得のテスト"""
        mock_service = Mock()
        mock_service.get_all_parts.return_value = [
            {
                "part_id": 1,
                "name": "基本SELECT",
                "sql_part": "SELECT * FROM",
                "category": "select"
            },
            {
                "part_id": 2,
                "name": "基本WHERE条件",
                "sql_part": "WHERE status = 'active'",
                "category": "condition"
            },
            {
                "part_id": 3,
                "name": "基本ORDER BY",
                "sql_part": "ORDER BY created_date DESC",
                "category": "order"
            }
        ]
        
        app = client.app
        app.dependency_overrides[get_part_service] = lambda: mock_service
        app.dependency_overrides[get_current_user] = lambda: {"user_id": mock_user.user_id, "user_name": mock_user.user_name}
        app.dependency_overrides[get_visibility_control_service] = lambda: Mock()
        app.dependency_overrides[get_user_preference_service] = lambda: Mock()
        
        try:
            response = client.get("/api/v1/parts")
            
            assert response.status_code == 200
            data = response.json()
            assert "parts" in data
            assert len(data["parts"]) == 3
            categories = {part["category"] for part in data["parts"]}
            assert "select" in categories
            assert "condition" in categories
            assert "order" in categories
        finally:
            app.dependency_overrides.clear()


class TestUserTemplatePreferencesAPI:
    """ユーザーテンプレート設定APIのテスト"""
    
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
        app.dependency_overrides[get_user_preference_service] = lambda: mock_service
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
    
    def test_update_user_template_preferences_success(self, client: TestClient, mock_user):
        """正常なユーザーテンプレート設定更新のテスト"""
        mock_service = Mock()
        mock_service.update_user_template_preferences.return_value = True
        
        app = client.app
        app.dependency_overrides[get_user_preference_service] = lambda: mock_service
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
        app.dependency_overrides[get_user_preference_service] = lambda: mock_service
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
    
    def test_update_user_part_preferences_success(self, client: TestClient, mock_user):
        """正常なユーザーパーツ設定更新のテスト"""
        mock_service = Mock()
        mock_service.update_user_part_preferences.return_value = True
        
        app = client.app
        app.dependency_overrides[get_user_preference_service] = lambda: mock_service
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
        mock_template_service = Mock()
        mock_template_service.get_templates_for_dropdown.return_value = [
            {"template_id": 1, "name": "基本SELECT", "description": "基本的なSELECT文"},
            {"template_id": 2, "name": "JOIN SELECT", "description": "結合を含むSELECT文"}
        ]
        
        mock_user_pref_service = Mock()
        mock_user_pref_service.filter_user_templates.return_value = [
            {"template_id": 1, "name": "基本SELECT", "description": "基本的なSELECT文"}
        ]
        
        app = client.app
        app.dependency_overrides[get_template_service] = lambda: mock_template_service
        app.dependency_overrides[get_user_preference_service] = lambda: mock_user_pref_service
        app.dependency_overrides[get_current_user] = lambda: {"user_id": mock_user.user_id, "user_name": mock_user.user_name}
        
        try:
            response = client.get("/api/v1/templates/dropdown")
            
            assert response.status_code == 200
            data = response.json()
            assert "templates" in data
            assert len(data["templates"]) == 1
            assert data["templates"][0]["name"] == "基本SELECT"
        finally:
            app.dependency_overrides.clear()


class TestPartDropdownAPI:
    """パーツドロップダウンAPIのテスト"""
    
    def test_get_part_dropdown_success(self, client: TestClient, mock_user):
        """正常なパーツドロップダウン取得のテスト"""
        mock_part_service = Mock()
        mock_part_service.get_parts_for_dropdown.return_value = [
            {"part_id": 1, "name": "基本WHERE条件", "category": "condition"},
            {"part_id": 2, "name": "基本ORDER BY", "category": "order"}
        ]
        
        mock_user_pref_service = Mock()
        mock_user_pref_service.filter_user_parts.return_value = [
            {"part_id": 1, "name": "基本WHERE条件", "category": "condition"}
        ]
        
        app = client.app
        app.dependency_overrides[get_part_service] = lambda: mock_part_service
        app.dependency_overrides[get_user_preference_service] = lambda: mock_user_pref_service
        app.dependency_overrides[get_current_user] = lambda: {"user_id": mock_user.user_id, "user_name": mock_user.user_name}
        
        try:
            response = client.get("/api/v1/parts/dropdown")
            
            assert response.status_code == 200
            data = response.json()
            assert "parts" in data
            assert len(data["parts"]) == 1
            assert data["parts"][0]["name"] == "基本WHERE条件"
            assert data["parts"][0]["category"] == "condition"
        finally:
            app.dependency_overrides.clear()
