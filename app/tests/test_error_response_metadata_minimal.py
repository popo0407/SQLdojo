# -*- coding: utf-8 -*-
"""
メタデータAPIのエラーレスポンス統一を検証する最小テスト
- /metadata/schemas でサービスが MetadataError を投げた場合
- /metadata/schemas/{schema}/tables/{table}/columns で一般例外が起きた場合
"""
from fastapi.testclient import TestClient
from unittest.mock import Mock

from app.tests.test_main import app
from app.dependencies import get_metadata_service_di
from app.exceptions import MetadataError


def test_metadata_schemas_metadataerror_unified_body():
    client = TestClient(app)
    mock_service = Mock()
    mock_service.get_schemas.side_effect = MetadataError("スキーマ取得に失敗")

    app.dependency_overrides[get_metadata_service_di] = lambda: mock_service
    try:
        res = client.get("/api/v1/metadata/schemas")
        assert res.status_code == 400
        body = res.json()
        assert body["error"] is True
        assert body["status_code"] == 400
        assert isinstance(body.get("timestamp"), float)
        assert "スキーマ取得に失敗" in body["message"]
        assert "スキーマ取得に失敗" in body["detail"]
    finally:
        app.dependency_overrides.clear()


def test_metadata_columns_general_exception_unified_body():
    client = TestClient(app)
    mock_service = Mock()
    mock_service.get_columns.side_effect = Exception("DB down")

    app.dependency_overrides[get_metadata_service_di] = lambda: mock_service
    try:
        res = client.get("/api/v1/metadata/schemas/PUBLIC/tables/T1/columns")
        assert res.status_code == 500
        body = res.json()
        assert body["error"] is True
        assert body["status_code"] == 500
        assert isinstance(body.get("timestamp"), float)
        assert "メタデータ取得に失敗しました" in body["message"]
        assert "メタデータ取得に失敗しました" in body["detail"]
    finally:
        app.dependency_overrides.clear()
