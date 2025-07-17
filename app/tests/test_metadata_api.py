# -*- coding: utf-8 -*-
"""
メタデータAPIのテスト

/metadata/schemas
/metadata/tables
/metadata/columns
/admin/metadata/all-raw
"""
import pytest
from fastapi.testclient import TestClient
from unittest.mock import Mock
from datetime import datetime
from app.dependencies import (
    get_metadata_service, get_current_user, get_current_admin,
    get_visibility_control_service, get_user_preference_service
)


class TestMetadataSchemaAPI:
    """スキーマメタデータAPIのテスト"""
    
    def test_get_schemas_success(self, client: TestClient, mock_metadata_service, mock_user):
        """正常なスキーマ取得のテスト"""
        app = client.app
        app.dependency_overrides[get_metadata_service] = lambda: mock_metadata_service
        app.dependency_overrides[get_current_user] = lambda: {"user_id": mock_user.user_id, "user_name": mock_user.user_name}
        app.dependency_overrides[get_visibility_control_service] = lambda: Mock()
        app.dependency_overrides[get_user_preference_service] = lambda: Mock()
        
        try:
            response = client.get("/api/v1/metadata/schemas")
            
            assert response.status_code == 200
            data = response.json()
            assert "schemas" in data
            assert len(data["schemas"]) > 0
            assert data["schemas"][0]["name"] == "PUBLIC"
            assert data["schemas"][0]["is_default"] is True
        finally:
            app.dependency_overrides.clear()
    
    def test_get_schemas_error(self, client: TestClient, mock_user):
        """スキーマ取得エラーのテスト"""
        mock_service = Mock()
        mock_service.get_schemas.side_effect = Exception("メタデータ接続エラー")
        
        app = client.app
        app.dependency_overrides[get_metadata_service] = lambda: mock_service
        app.dependency_overrides[get_current_user] = lambda: {"user_id": mock_user.user_id, "user_name": mock_user.user_name}
        app.dependency_overrides[get_visibility_control_service] = lambda: Mock()
        app.dependency_overrides[get_user_preference_service] = lambda: Mock()
        
        try:
            response = client.get("/api/v1/metadata/schemas")
            
            assert response.status_code == 500
            data = response.json()
            assert "メタデータ接続エラー" in data["detail"]
        finally:
            app.dependency_overrides.clear()


class TestMetadataTableAPI:
    """テーブルメタデータAPIのテスト"""
    
    def test_get_tables_success(self, client: TestClient, mock_metadata_service, mock_user):
        """正常なテーブル取得のテスト"""
        app = client.app
        app.dependency_overrides[get_metadata_service] = lambda: mock_metadata_service
        app.dependency_overrides[get_current_user] = lambda: {"user_id": mock_user.user_id, "user_name": mock_user.user_name}
        app.dependency_overrides[get_visibility_control_service] = lambda: Mock()
        app.dependency_overrides[get_user_preference_service] = lambda: Mock()
        
        try:
            response = client.get("/api/v1/metadata/tables?schema_name=PUBLIC")
            
            assert response.status_code == 200
            data = response.json()
            assert "tables" in data
            assert len(data["tables"]) > 0
            assert data["tables"][0]["name"] == "test_table"
            assert data["tables"][0]["schema_name"] == "PUBLIC"
        finally:
            app.dependency_overrides.clear()
    
    def test_get_tables_without_schema(self, client: TestClient, mock_user):
        """スキーマ名なしテーブル取得のテスト"""
        app = client.app
        app.dependency_overrides[get_current_user] = lambda: {"user_id": mock_user.user_id, "user_name": mock_user.user_name}
        
        try:
            response = client.get("/api/v1/metadata/tables")
            
            assert response.status_code == 400
            data = response.json()
            assert "schema_name は必須です" in data["detail"]
        finally:
            app.dependency_overrides.clear()
    
    def test_get_tables_with_pagination(self, client: TestClient, mock_user):
        """ページング付きテーブル取得のテスト"""
        mock_service = Mock()
        mock_service.get_tables.return_value = [
            {"name": f"table_{i}", "schema_name": "PUBLIC", "table_type": "BASE TABLE"}
            for i in range(1, 11)
        ]
        
        app = client.app
        app.dependency_overrides[get_metadata_service] = lambda: mock_service
        app.dependency_overrides[get_current_user] = lambda: {"user_id": mock_user.user_id, "user_name": mock_user.user_name}
        app.dependency_overrides[get_visibility_control_service] = lambda: Mock()
        app.dependency_overrides[get_user_preference_service] = lambda: Mock()
        
        try:
            response = client.get("/api/v1/metadata/tables?schema_name=PUBLIC&limit=5&offset=0")
            
            assert response.status_code == 200
            data = response.json()
            assert "tables" in data
            assert len(data["tables"]) == 10  # モックは全データを返す
        finally:
            app.dependency_overrides.clear()


class TestMetadataColumnAPI:
    """カラムメタデータAPIのテスト"""
    
    def test_get_columns_success(self, client: TestClient, mock_metadata_service, mock_user):
        """正常なカラム取得のテスト"""
        app = client.app
        app.dependency_overrides[get_metadata_service] = lambda: mock_metadata_service
        app.dependency_overrides[get_current_user] = lambda: {"user_id": mock_user.user_id, "user_name": mock_user.user_name}
        app.dependency_overrides[get_visibility_control_service] = lambda: Mock()
        app.dependency_overrides[get_user_preference_service] = lambda: Mock()
        
        try:
            response = client.get("/api/v1/metadata/columns?schema_name=PUBLIC&table_name=test_table")
            
            assert response.status_code == 200
            data = response.json()
            assert "columns" in data
            assert len(data["columns"]) == 2
            assert data["columns"][0]["name"] == "column1"
            assert data["columns"][0]["data_type"] == "VARCHAR"
            assert data["columns"][1]["name"] == "column2"
            assert data["columns"][1]["data_type"] == "INTEGER"
        finally:
            app.dependency_overrides.clear()
    
    def test_get_columns_missing_params(self, client: TestClient, mock_user):
        """必須パラメータなしカラム取得のテスト"""
        app = client.app
        app.dependency_overrides[get_current_user] = lambda: {"user_id": mock_user.user_id, "user_name": mock_user.user_name}
        
        try:
            response = client.get("/api/v1/metadata/columns?schema_name=PUBLIC")
            
            assert response.status_code == 400
            data = response.json()
            assert "table_name は必須です" in data["detail"]
        finally:
            app.dependency_overrides.clear()
    
    def test_get_columns_error(self, client: TestClient, mock_user):
        """カラム取得エラーのテスト"""
        mock_service = Mock()
        mock_service.get_columns.side_effect = Exception("テーブルが見つかりません")
        
        app = client.app
        app.dependency_overrides[get_metadata_service] = lambda: mock_service
        app.dependency_overrides[get_current_user] = lambda: {"user_id": mock_user.user_id, "user_name": mock_user.user_name}
        app.dependency_overrides[get_visibility_control_service] = lambda: Mock()
        app.dependency_overrides[get_user_preference_service] = lambda: Mock()
        
        try:
            response = client.get("/api/v1/metadata/columns?schema_name=PUBLIC&table_name=non_existent")
            
            assert response.status_code == 500
            data = response.json()
            assert "テーブルが見つかりません" in data["detail"]
        finally:
            app.dependency_overrides.clear()


class TestAdminMetadataAPI:
    """管理者用メタデータAPIのテスト"""
    
    def test_get_all_metadata_raw_admin_success(self, client: TestClient, mock_admin):
        """正常な管理者用全メタデータ取得のテスト"""
        mock_service = Mock()
        mock_service.get_all_metadata_raw.return_value = [
            {
                "schema_name": "PUBLIC",
                "table_name": "test_table",
                "column_name": "column1",
                "data_type": "VARCHAR",
                "is_nullable": True,
                "is_visible": True
            },
            {
                "schema_name": "PUBLIC",
                "table_name": "test_table",
                "column_name": "column2",
                "data_type": "INTEGER",
                "is_nullable": False,
                "is_visible": True
            }
        ]
        
        app = client.app
        app.dependency_overrides[get_metadata_service] = lambda: mock_service
        app.dependency_overrides[get_current_admin] = lambda: {"user_id": mock_admin.user_id, "user_name": mock_admin.user_name}
        
        try:
            response = client.get("/api/v1/admin/metadata/all-raw")
            
            assert response.status_code == 200
            data = response.json()
            assert len(data) == 2
            assert data[0]["table_name"] == "test_table"
            assert data[0]["column_name"] == "column1"
            assert data[1]["column_name"] == "column2"
        finally:
            app.dependency_overrides.clear()
    
    def test_get_all_metadata_raw_admin_unauthorized(self, client: TestClient, mock_user):
        """非管理者による管理者用メタデータ取得のテスト"""
        app = client.app
        app.dependency_overrides[get_current_user] = lambda: {"user_id": mock_user.user_id, "user_name": mock_user.user_name}
        
        try:
            response = client.get("/api/v1/admin/metadata/all-raw")
            
            # 管理者認証が必要なため403が返される想定
            assert response.status_code in [401, 403]
        finally:
            app.dependency_overrides.clear()


class TestVisibilitySettingsAPI:
    """表示設定APIのテスト"""
    
    def test_get_visibility_settings_success(self, client: TestClient, mock_admin):
        """正常な表示設定取得のテスト"""
        mock_service = Mock()
        mock_service.get_all_visibility_settings.return_value = {
            "PUBLIC.test_table.column1": True,
            "PUBLIC.test_table.column2": False,
            "SCHEMA2.table2.column1": True
        }
        
        app = client.app
        app.dependency_overrides[get_visibility_control_service] = lambda: mock_service
        app.dependency_overrides[get_current_admin] = lambda: {"user_id": mock_admin.user_id, "user_name": mock_admin.user_name}
        
        try:
            response = client.get("/api/v1/admin/visibility-settings")
            
            assert response.status_code == 200
            data = response.json()
            assert "settings" in data
            assert data["settings"]["PUBLIC.test_table.column1"] is True
            assert data["settings"]["PUBLIC.test_table.column2"] is False
        finally:
            app.dependency_overrides.clear()
    
    def test_save_visibility_settings_success(self, client: TestClient, mock_admin):
        """正常な表示設定保存のテスト"""
        mock_service = Mock()
        mock_service.save_visibility_settings.return_value = True
        
        app = client.app
        app.dependency_overrides[get_visibility_control_service] = lambda: mock_service
        app.dependency_overrides[get_current_admin] = lambda: {"user_id": mock_admin.user_id, "user_name": mock_admin.user_name}
        
        try:
            response = client.post(
                "/api/v1/admin/visibility-settings",
                json={
                    "settings": {
                        "PUBLIC.test_table.column1": True,
                        "PUBLIC.test_table.column2": False
                    }
                }
            )
            
            assert response.status_code == 200
            data = response.json()
            assert data["success"] is True
            assert "保存しました" in data["message"]
        finally:
            app.dependency_overrides.clear()
