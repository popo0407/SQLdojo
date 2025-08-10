# -*- coding: utf-8 -*-
"""
GET /user/info の最小テスト
- 認証あり: DIで current_user を上書きし 200 を期待
- 未認証: DI上書きなしで 401 を期待
"""
from fastapi.testclient import TestClient
from app.dependencies import get_current_user
from app.tests.test_main import app


def test_user_info_success_minimal():
    client = TestClient(app)

    def override_current_user():
        return {"user_id": "test_user", "user_name": "Test User", "role": "USER"}

    app.dependency_overrides[get_current_user] = override_current_user
    try:
        res = client.get("/api/v1/user/info")
        assert res.status_code == 200
        data = res.json()
        assert data["user_id"] == "test_user"
        assert data["user_name"] == "Test User"
        # role は省略可
    finally:
        app.dependency_overrides.clear()


 

def test_user_info_unauthorized_minimal():
    client = TestClient(app)
    res = client.get("/api/v1/user/info")
    assert res.status_code == 401
