# -*- coding: utf-8 -*-
"""
エラーレスポンス統一の最小テスト
- HTTPException 経路: /api/v1/logs/analytics (501)
- バリデーションエラー経路: /api/v1/admin/login （password欠如 422）
"""
from fastapi.testclient import TestClient
from app.tests.test_main import app
from app.dependencies import get_current_user


def test_http_exception_has_standard_fields():
    client = TestClient(app)

    # 認証を上書きして 501 のスタブまで到達させる
    def override_current_user():
        return {"user_id": "test_user", "user_name": "Test User", "role": "USER"}
    app.dependency_overrides[get_current_user] = override_current_user

    res = client.get("/api/v1/logs/analytics")
    assert res.status_code == 501
    body = res.json()
    assert body["error"] is True
    assert body["status_code"] == 501
    assert isinstance(body.get("timestamp"), float)
    assert "message" in body
    assert "detail" in body

    app.dependency_overrides.clear()


def test_validation_error_has_standard_fields():
    client = TestClient(app)
    # password 欠如で 422
    res = client.post("/api/v1/admin/login", json={})
    assert res.status_code == 422
    body = res.json()
    assert body["error"] is True
    assert body["status_code"] == 422
    assert isinstance(body.get("timestamp"), float)
    assert body["message"] == "バリデーションエラー"
    assert "validation_errors" in body["detail"], body
