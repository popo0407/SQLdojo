# -*- coding: utf-8 -*-
"""
基本SQL実行APIのテスト

/sql/execute
/sql/validate
/sql/format
"""
import pytest
from fastapi.testclient import TestClient
from unittest.mock import Mock, patch
from app.dependencies import (
    get_sql_service_di,
    get_sql_validator_di,
    get_current_user,
    get_sql_log_service_di
)


class TestSQLExecuteAPI:
    """SQL実行APIのテスト"""
    
    def test_execute_sql_success(self, client: TestClient, mock_sql_service, mock_user):
        """正常なSQL実行のテスト"""
        # 依存関係をオーバーライド
        app = client.app
        app.dependency_overrides[get_sql_service_di] = lambda: mock_sql_service
        app.dependency_overrides[get_current_user] = lambda: {"user_id": mock_user.user_id, "user_name": mock_user.user_name}
        app.dependency_overrides[get_sql_log_service_di] = lambda: Mock()
        
        try:
            response = client.post(
                "/api/v1/sql/execute",
                json={"sql": "SELECT * FROM test_table", "limit": 1000}
            )
            
            assert response.status_code == 200
            data = response.json()
            assert data["success"] is True
            assert "data" in data
            assert "columns" in data
            assert "execution_time" in data
            assert data["sql"] == "SELECT * FROM test_table"
        finally:
            app.dependency_overrides.clear()
    
    def test_execute_sql_empty_query(self, client: TestClient, mock_sql_service, mock_user):
        """空のSQLクエリのテスト"""
        app = client.app
        app.dependency_overrides[get_sql_service_di] = lambda: mock_sql_service
        app.dependency_overrides[get_current_user] = lambda: {"user_id": mock_user.user_id, "user_name": mock_user.user_name}
        app.dependency_overrides[get_sql_log_service_di] = lambda: Mock()
        
        try:
            response = client.post(
                "/api/v1/sql/execute",
                json={"sql": "", "limit": 1000}
            )
            
            assert response.status_code == 400
            data = response.json()
            assert "SQLクエリが無効です" in data["detail"]
        finally:
            app.dependency_overrides.clear()
    
    def test_execute_sql_error(self, client: TestClient, mock_user):
        """SQL実行エラーのテスト"""
        mock_sql_service = Mock()
        mock_sql_service.execute_sql.return_value = Mock(
            success=False,
            error_message="テーブルが見つかりません",
            data=None,
            columns=None,
            row_count=0,
            execution_time=0.1,
            sql="SELECT * FROM non_existent_table"
        )
        
        app = client.app
        app.dependency_overrides[get_sql_service_di] = lambda: mock_sql_service
        app.dependency_overrides[get_current_user] = lambda: {"user_id": mock_user.user_id, "user_name": mock_user.user_name}
        app.dependency_overrides[get_sql_log_service_di] = lambda: Mock()
        
        try:
            response = client.post(
                "/api/v1/sql/execute",
                json={"sql": "SELECT * FROM non_existent_table", "limit": 1000}
            )
            
            assert response.status_code == 400
            data = response.json()
            assert "テーブルが見つかりません" in data["detail"]
        finally:
            app.dependency_overrides.clear()


class TestSQLValidateAPI:
    """SQLバリデーションAPIのテスト"""
    
    def test_validate_sql_success(self, client: TestClient):
        """正常なSQLバリデーションのテスト"""
        mock_validator = Mock()
        mock_validator.validate_sql.return_value = Mock(
            is_valid=True,
            errors=[],
            warnings=[],
            suggestions=[]
        )
        
        app = client.app
        app.dependency_overrides[get_sql_validator_di] = lambda: mock_validator
        
        try:
            response = client.post(
                "/api/v1/sql/validate",
                json={"sql": "SELECT * FROM test_table"}
            )
            
            assert response.status_code == 200
            data = response.json()
            assert data["is_valid"] is True
            assert data["errors"] == []
            assert "warnings" in data
            assert "suggestions" in data
        finally:
            app.dependency_overrides.clear()
    
    def test_validate_sql_with_errors(self, client: TestClient):
        """エラーありSQLバリデーションのテスト"""
        mock_validator = Mock()
        mock_validator.validate_sql.return_value = Mock(
            is_valid=False,
            errors=["FROM句が必要です"],
            warnings=["SELECT * は推奨されません"],
            suggestions=["具体的なカラム名を指定してください"]
        )
        
        app = client.app
        app.dependency_overrides[get_sql_validator_di] = lambda: mock_validator
        
        try:
            response = client.post(
                "/api/v1/sql/validate",
                json={"sql": "SELECT *"}
            )
            
            assert response.status_code == 200
            data = response.json()
            assert data["is_valid"] is False
            assert "FROM句が必要です" in data["errors"]
            assert "SELECT * は推奨されません" in data["warnings"]
            assert "具体的なカラム名を指定してください" in data["suggestions"]
        finally:
            app.dependency_overrides.clear()
    
    def test_validate_sql_empty_query(self, client: TestClient):
        """空のSQLクエリバリデーションのテスト"""
        response = client.post(
            "/api/v1/sql/validate",
            json={"sql": ""}
        )
        
        assert response.status_code == 400
        data = response.json()
        assert "SQLクエリが無効です" in data["detail"]


class TestSQLFormatAPI:
    """SQL整形APIのテスト"""
    
    def test_format_sql_success(self, client: TestClient):
        """正常なSQL整形のテスト"""
        mock_validator = Mock()
        mock_validator.format_sql.return_value = "SELECT *\nFROM test_table\nWHERE id = 1"
        
        app = client.app
        app.dependency_overrides[get_sql_validator_di] = lambda: mock_validator
        
        try:
            response = client.post(
                "/api/v1/sql/format",
                json={"sql": "select * from test_table where id=1"}
            )
            
            assert response.status_code == 200
            data = response.json()
            assert data["success"] is True
            assert "SELECT *" in data["formatted_sql"]
            assert "FROM test_table" in data["formatted_sql"]
            assert data["error_message"] is None
        finally:
            app.dependency_overrides.clear()
    
    def test_format_sql_error(self, client: TestClient):
        """SQL整形エラーのテスト"""
        mock_validator = Mock()
        mock_validator.format_sql.side_effect = Exception("フォーマットエラー")
        
        app = client.app
        app.dependency_overrides[get_sql_validator_di] = lambda: mock_validator
        
        try:
            response = client.post(
                "/api/v1/sql/format",
                json={"sql": "INVALID SQL;;;"}
            )
            
            assert response.status_code == 400
            data = response.json()
            assert "フォーマットエラー" in data["detail"]
        finally:
            app.dependency_overrides.clear()
    
    def test_format_sql_empty_query(self, client: TestClient):
        """空のSQLクエリ整形のテスト"""
        response = client.post(
            "/api/v1/sql/format",
            json={"sql": ""}
        )
        
        assert response.status_code == 400
        data = response.json()
        assert "SQLクエリが無効です" in data["detail"]
