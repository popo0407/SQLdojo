# -*- coding: utf-8 -*-
"""
テンプレート/パーツAPIの失敗経路における統一エラーレスポンスの最小テスト
- 管理テンプレート作成: サービス例外で500
- ユーザーテンプレート作成: バリデーション欠如で422
- ユーザーテンプレート更新: サービス例外(ValueError)で500
- 管理パーツ作成: サービス例外で500
- ユーザーパーツ作成: バリデーション欠如で422
"""
from unittest.mock import Mock

from app.tests.test_main import app
from fastapi.testclient import TestClient
from app.dependencies import (
    get_current_admin,
    get_current_user,
    get_template_service_di,
    get_part_service_di,
)


def test_admin_create_template_service_error_unified_500(client):
    # このテストでは500レスポンスの本文を検証したいので再スローを無効化
    client = TestClient(app, raise_server_exceptions=False)
    mock_service = Mock()
    mock_service.create_admin_template.side_effect = Exception("DB error")

    app.dependency_overrides[get_current_admin] = lambda: True
    app.dependency_overrides[get_template_service_di] = lambda: mock_service
    try:
        res = client.post(
            "/api/v1/admin/templates",
            json={"name": "T1", "sql": "SELECT 1"}
        )
        assert res.status_code == 500
        body = res.json()
        assert body["error"] is True
        assert body["status_code"] == 500
        assert isinstance(body.get("timestamp"), float)
        assert body["message"] == "内部サーバーエラー"
    finally:
        app.dependency_overrides.clear()


def test_user_create_template_validation_422(client):
    client = TestClient(app, raise_server_exceptions=False)
    app.dependency_overrides[get_current_user] = lambda: {"user_id": "u1", "user_name": "U1"}
    try:
        res = client.post(
            "/api/v1/users/templates",
            json={}  # 必須フィールド欠如
        )
        assert res.status_code == 422
        body = res.json()
        assert body["error"] is True
        assert body["status_code"] == 422
        assert isinstance(body.get("timestamp"), float)
        assert body["message"] == "バリデーションエラー"
        assert "validation_errors" in body["detail"]
    finally:
        app.dependency_overrides.clear()


def test_user_update_template_service_error_unified_500(client):
    client = TestClient(app, raise_server_exceptions=False)
    mock_service = Mock()
    mock_service.update_user_template.side_effect = ValueError("テンプレートが見つかりません")

    app.dependency_overrides[get_current_user] = lambda: {"user_id": "u1", "user_name": "U1"}
    app.dependency_overrides[get_template_service_di] = lambda: mock_service
    try:
        res = client.put(
            "/api/v1/users/templates/temp123",
            json={"name": "T", "sql": "SELECT 1", "display_order": 1}
        )
        assert res.status_code == 500
        body = res.json()
        assert body["error"] is True
        assert body["status_code"] == 500
        assert isinstance(body.get("timestamp"), float)
        assert body["message"] == "内部サーバーエラー"
    finally:
        app.dependency_overrides.clear()


def test_admin_create_part_service_error_unified_500(client):
    client = TestClient(app, raise_server_exceptions=False)
    mock_service = Mock()
    mock_service.create_admin_part.side_effect = Exception("DB error")

    app.dependency_overrides[get_current_admin] = lambda: True
    app.dependency_overrides[get_part_service_di] = lambda: mock_service
    try:
        res = client.post(
            "/api/v1/admin/parts",
            json={"name": "P1", "sql": "SELECT 1"}
        )
        assert res.status_code == 500
        body = res.json()
        assert body["error"] is True
        assert body["status_code"] == 500
        assert isinstance(body.get("timestamp"), float)
        assert body["message"] == "内部サーバーエラー"
    finally:
        app.dependency_overrides.clear()


def test_user_create_part_validation_422(client):
    client = TestClient(app, raise_server_exceptions=False)
    app.dependency_overrides[get_current_user] = lambda: {"user_id": "u1", "user_name": "U1"}
    try:
        res = client.post(
            "/api/v1/users/parts",
            json={}
        )
        assert res.status_code == 422
        body = res.json()
        assert body["error"] is True
        assert body["status_code"] == 422
        assert isinstance(body.get("timestamp"), float)
        assert body["message"] == "バリデーションエラー"
        assert "validation_errors" in body["detail"]
    finally:
        app.dependency_overrides.clear()
