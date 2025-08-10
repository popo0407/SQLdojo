# -*- coding: utf-8 -*-
"""
/refresh エンドポイントの最小テスト
- 認証済み（current_user のDIを上書き）
- UserService.authenticate_user をモックして最新情報を返す
- レスポンスが { success, message, user } で返ること
"""
from fastapi.testclient import TestClient
from unittest.mock import Mock

from app.dependencies import get_current_user, get_user_service_di
from app.tests.test_main import app


def test_refresh_success_minimal():
    client = TestClient(app)

    # current_user を固定
    def override_current_user():
        return {"user_id": "test_user", "user_name": "Old Name", "role": "USER"}

    # UserService モック
    mock_user_service = Mock()
    mock_user_service.authenticate_user.return_value = {
        "user_id": "test_user",
        "user_name": "New Name",
        "role": "USER"
    }

    # 依存を上書き
    app.dependency_overrides[get_current_user] = override_current_user
    app.dependency_overrides[get_user_service_di] = lambda: mock_user_service

    try:
        res = client.post("/api/v1/refresh")
        assert res.status_code == 200
        data = res.json()
        assert data["success"] is True
        assert data["user"]["user_id"] == "test_user"
        assert data["user"]["user_name"] == "New Name"
    finally:
        app.dependency_overrides.clear()


def test_refresh_unauthorized_minimal():
    """未認証の場合は 401 を返すことを確認"""
    client = TestClient(app)
    # 依存の上書きは行わない（= 未認証）
    res = client.post("/api/v1/refresh")
    assert res.status_code == 401
