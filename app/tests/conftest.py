# -*- coding: utf-8 -*-
"""
テスト用の共通設定とヘルパー関数
"""
import pytest
import asyncio
from typing import Dict, Any, Generator
from fastapi.testclient import TestClient
from unittest.mock import Mock, MagicMock
import tempfile
import os
import sqlite3
from datetime import datetime

from app.tests.test_main import app
from app.api.models import UserInfo
from app.dependencies import (
    get_sql_service_di, get_metadata_service_di, get_performance_service_di,
    get_export_service_di, get_sql_validator_di, get_connection_manager_di,
    get_completion_service_di, get_current_user, get_current_admin,
    get_sql_log_service_di, get_user_service_di, get_template_service_di,
    get_part_service_di, get_admin_service_di, get_visibility_control_service_di,
    get_user_preference_service_di, get_hybrid_sql_service_di,
    get_session_service_di, get_streaming_state_service_di
)

# テスト用のフィクスチャとモック


@pytest.fixture
def client() -> TestClient:
    """テスト用クライアント"""
    return TestClient(app)


@pytest.fixture
def mock_user() -> UserInfo:
    """テスト用ユーザー"""
    return UserInfo(user_id="test_user", user_name="Test User")


@pytest.fixture
def mock_admin() -> UserInfo:
    """テスト用管理者"""
    return UserInfo(user_id="admin_user", user_name="Admin User")


@pytest.fixture
def authenticated_client(client: TestClient, mock_user: UserInfo) -> TestClient:
    """認証済みテストクライアント"""
    def override_get_current_user():
        return {"user_id": mock_user.user_id, "user_name": mock_user.user_name}
    
    app.dependency_overrides[get_current_user] = override_get_current_user
    yield client
    app.dependency_overrides.clear()


@pytest.fixture
def admin_client(client: TestClient, mock_admin: UserInfo) -> TestClient:
    """管理者権限テストクライアント"""
    def override_get_current_admin():
        return {"user_id": mock_admin.user_id, "user_name": mock_admin.user_name}
    
    app.dependency_overrides[get_current_admin] = override_get_current_admin
    yield client
    app.dependency_overrides.clear()


@pytest.fixture
def temp_db() -> Generator[str, None, None]:
    """テスト用一時データベース"""
    fd, path = tempfile.mkstemp(suffix='.db')
    try:
        # 基本的なテーブルを作成
        conn = sqlite3.connect(path)
        cursor = conn.cursor()
        
        # SQL実行ログテーブル
        cursor.execute("""
            CREATE TABLE sql_execution_logs (
                log_id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id TEXT NOT NULL,
                sql TEXT NOT NULL,
                execution_time REAL,
                row_count INTEGER,
                success BOOLEAN,
                error_message TEXT,
                timestamp TEXT
            )
        """)
        
        # セッションテーブル
        cursor.execute("""
            CREATE TABLE sessions (
                session_id TEXT PRIMARY KEY,
                user_id TEXT NOT NULL,
                sql TEXT,
                created_at TEXT,
                status TEXT
            )
        """)
        
        # キャッシュテーブル
        cursor.execute("""
            CREATE TABLE cache_table_test (
                id INTEGER PRIMARY KEY,
                column1 TEXT,
                column2 INTEGER,
                column3 REAL
            )
        """)
        
        # テストデータを挿入
        cursor.execute("""
            INSERT INTO cache_table_test (column1, column2, column3)
            VALUES 
            ('test1', 100, 1.5),
            ('test2', 200, 2.5),
            ('test3', 300, 3.5)
        """)
        
        conn.commit()
        conn.close()
        
        yield path
    finally:
        os.close(fd)
        os.unlink(path)


@pytest.fixture
def mock_sql_service():
    """SQLサービスのモック"""
    service = Mock()
    
    # Mock result object with attributes
    mock_result = Mock()
    mock_result.success = True
    mock_result.data = [{"column1": "value1", "column2": "value2"}]  # 辞書のリスト形式
    mock_result.columns = ["column1", "column2"]
    mock_result.row_count = 1
    mock_result.execution_time = 0.1
    mock_result.error_message = None
    mock_result.sql = "SELECT * FROM test_table"
    
    service.execute_sql.return_value = mock_result
    
    # Validate SQL mock
    mock_validate_result = Mock()
    mock_validate_result.is_valid = True
    mock_validate_result.errors = []
    mock_validate_result.warnings = []
    mock_validate_result.suggestions = []
    
    service.validate_sql.return_value = mock_validate_result
    
    # Format SQL mock
    mock_format_result = Mock()
    mock_format_result.formatted_sql = "SELECT\n    column1,\n    column2\nFROM\n    table1"
    mock_format_result.success = True
    mock_format_result.error_message = None
    
    service.format_sql.return_value = mock_format_result
    
    return service


@pytest.fixture
def mock_metadata_service():
    """メタデータサービスのモック"""
    service = Mock()
    # 実際のサービスはリストを直接返す（辞書でラップしない）
    service.get_schemas.return_value = [
        {"name": "PUBLIC", "created_on": "2024-01-01", "owner": "ROOT", "is_default": True},
        {"name": "SCHEMA1", "created_on": "2024-01-02", "owner": "USER1", "is_default": False}
    ]
    service.get_tables.return_value = [
        {
            "name": "test_table", 
            "schema_name": "PUBLIC", 
            "table_type": "BASE TABLE",
            "row_count": 100,
            "created_on": "2024-01-01",
            "last_altered": "2024-01-01"
        }
    ]
    service.get_columns.return_value = [
        {
            "name": "column1", 
            "data_type": "VARCHAR", 
            "is_nullable": True,
            "ordinal_position": 1,
            "is_primary_key": False
        },
        {
            "name": "column2", 
            "data_type": "INTEGER", 
            "is_nullable": False,
            "ordinal_position": 2,
            "is_primary_key": True
        }
    ]
    # 管理者用のモック
    service.get_all_metadata_raw.return_value = [
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
    return service


@pytest.fixture
def mock_hybrid_sql_service():
    """ハイブリッドSQLサービスのモック"""
    service = Mock()
    service.execute_sql_with_cache.return_value = {
        "success": True,
        "session_id": "test_session_123",
        "total_count": 100,
        "processed_rows": 100,
        "execution_time": 0.5,
        "message": "SQL実行が完了しました"
    }
    service.get_cached_data.return_value = {
        "success": True,
        "data": [["value1", "value2"], ["value3", "value4"]],
        "columns": ["column1", "column2"],
        "total_count": 2,
        "page": 1,
        "page_size": 10,
        "total_pages": 1,
        "session_info": {"session_id": "test_session_123"},
        "execution_time": 0.1
    }
    return service


@pytest.fixture
def mock_export_service():
    """ExportServiceのモック"""
    service = Mock()
    # CSVデータのモック
    csv_data = "column1,column2\nvalue1,value2\nvalue3,value4"
    service.export_to_csv_stream.return_value = csv_data
    return service


@pytest.fixture  
def mock_streaming_state_service():
    """StreamingStateServiceのモック"""
    service = Mock()
    service.get_session_status.return_value = {
        "session_id": "test_session_123",
        "status": "completed",
        "progress": 100,
        "message": "処理が完了しました"
    }
    service.cancel_session.return_value = True
    return service


@pytest.fixture
def mock_user_service():
    """UserServiceのモック"""
    service = Mock()
    service.authenticate_user.return_value = {
        "success": True,
        "user_id": "test_user",
        "user_name": "Test User"
    }
    service.get_user_info.return_value = {
        "user_id": "test_user", 
        "user_name": "Test User",
        "last_login": "2025-07-19T00:00:00"
    }
    return service


def override_dependencies(client: TestClient, **overrides):
    """依存関係を一括でオーバーライド"""
    dependency_map = {
        'sql_service': get_sql_service_di,
        'metadata_service': get_metadata_service_di,
        'performance_service': get_performance_service_di,
        'export_service': get_export_service_di,
        'sql_validator': get_sql_validator_di,
        'connection_manager': get_connection_manager_di,
        'completion_service': get_completion_service_di,
        'current_user': get_current_user,
        'current_admin': get_current_admin,
        'sql_log_service': get_sql_log_service_di,
        'user_service': get_user_service_di,
        'template_service': get_template_service_di,
        'part_service': get_part_service_di,
        'admin_service': get_admin_service_di,
        'visibility_control_service': get_visibility_control_service_di,
        'user_preference_service': get_user_preference_service_di,
        'hybrid_sql_service': get_hybrid_sql_service_di,
        'session_service': get_session_service_di,
        'streaming_state_service': get_streaming_state_service_di
    }
    
    for name, mock_value in overrides.items():
        if name in dependency_map:
            app.dependency_overrides[dependency_map[name]] = lambda: mock_value
    return client


class MockResponse:
    """モックレスポンス"""
    def __init__(self, json_data: Dict[str, Any], status_code: int = 200):
        self.json_data = json_data
        self.status_code = status_code
        self.ok = status_code < 400
    
    def json(self):
        return self.json_data


class AsyncMock(MagicMock):
    """非同期関数用のモック"""
    async def __call__(self, *args, **kwargs):
        return super(AsyncMock, self).__call__(*args, **kwargs)


def create_test_sql_result(
    success: bool = True,
    data: list = None,
    columns: list = None,
    row_count: int = 0,
    execution_time: float = 0.1,
    error_message: str = None,
    sql: str = "SELECT * FROM test_table"
) -> Dict[str, Any]:
    """テスト用SQL実行結果を作成"""
    return {
        "success": success,
        "data": data or [["value1", "value2"]],
        "columns": columns or ["column1", "column2"],
        "row_count": row_count or len(data or []),
        "execution_time": execution_time,
        "error_message": error_message,
        "sql": sql
    }


def create_test_validation_result(
    is_valid: bool = True,
    errors: list = None,
    warnings: list = None,
    suggestions: list = None
) -> Dict[str, Any]:
    """テスト用バリデーション結果を作成"""
    return {
        "is_valid": is_valid,
        "errors": errors or [],
        "warnings": warnings or [],
        "suggestions": suggestions or []
    }


def create_test_cache_response(
    success: bool = True,
    session_id: str = "test_session_123",
    total_count: int = 100,
    processed_rows: int = 100,
    execution_time: float = 0.5,
    message: str = "処理が完了しました"
) -> Dict[str, Any]:
    """テスト用キャッシュレスポンスを作成"""
    return {
        "success": success,
        "session_id": session_id,
        "total_count": total_count,
        "processed_rows": processed_rows,
        "execution_time": execution_time,
        "message": message,
        "error_message": None if success else "エラーが発生しました"
    }
