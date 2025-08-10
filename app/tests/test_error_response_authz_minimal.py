# -*- coding: utf-8 -*-
"""
認可/認証エラーにおける統一エラーレスポンスの最小テスト
- 管理系: /admin/system/refresh で 401/403
- ユーザー系: /users/templates で 401
"""
from fastapi.testclient import TestClient
from fastapi import HTTPException

from app.tests.test_main import app
from app.dependencies import get_current_admin, get_current_user


def test_admin_refresh_unauthenticated_has_unified_error():
    client = TestClient(app)

    # 管理者認証チェックを未ログインとして失敗させる（HTTPException 401）
    def override_admin_unauth():
        raise HTTPException(status_code=401, detail="ログインが必要です")

    app.dependency_overrides[get_current_admin] = override_admin_unauth
    try:
        res = client.post("/api/v1/admin/system/refresh")
        assert res.status_code == 401
        body = res.json()
        assert body["error"] is True
        assert body["status_code"] == 401
        assert isinstance(body.get("timestamp"), float)
        assert "ログインが必要です" in body["message"]
        assert "ログインが必要です" in body["detail"]
    finally:
        app.dependency_overrides.clear()


def test_admin_refresh_forbidden_has_unified_error():
    client = TestClient(app)

    # 管理者権限不足として失敗させる（HTTPException 403）
    def override_admin_forbidden():
        raise HTTPException(status_code=403, detail="管理者権限が必要です")

    app.dependency_overrides[get_current_admin] = override_admin_forbidden
    try:
        res = client.post("/api/v1/admin/system/refresh")
        assert res.status_code == 403
        body = res.json()
        assert body["error"] is True
        assert body["status_code"] == 403
        assert isinstance(body.get("timestamp"), float)
        assert "管理者権限が必要です" in body["message"]
        assert "管理者権限が必要です" in body["detail"]
    finally:
        app.dependency_overrides.clear()


def test_user_templates_unauthenticated_has_unified_error():
    client = TestClient(app)

    # ユーザー認証チェックを未ログインとして失敗（HTTPException 401）
    def override_user_unauth():
        raise HTTPException(status_code=401, detail="未ログインです")

    app.dependency_overrides[get_current_user] = override_user_unauth
    try:
        res = client.get("/api/v1/users/templates")
        assert res.status_code == 401
        body = res.json()
        assert body["error"] is True
        assert body["status_code"] == 401
        assert isinstance(body.get("timestamp"), float)
        assert "未ログイン" in body["message"]
        assert "未ログイン" in body["detail"]
    finally:
        app.dependency_overrides.clear()
