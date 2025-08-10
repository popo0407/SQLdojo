# -*- coding: utf-8 -*-
"""
エクスポート/CSV系APIにおける統一エラーレスポンスの最小テスト
対象:
- POST /sql/download/csv 空SQL(400) と SQL実行例外(500)
- POST /sql/cache/download/csv session_id欠如(400)
"""
from fastapi.testclient import TestClient
from unittest.mock import Mock

from app.tests.test_main import app
from app.dependencies import get_connection_manager_di, get_current_user, get_hybrid_sql_service_di


def test_sql_download_csv_empty_sql_has_unified_error():
    client = TestClient(app)
    app.dependency_overrides[get_current_user] = lambda: {"user_id": "u1", "user_name": "U1"}
    try:
        res = client.post("/api/v1/sql/download/csv", json={"sql": ""})
        assert res.status_code == 400
        body = res.json()
        assert body["error"] is True
        assert body["status_code"] == 400
        assert isinstance(body.get("timestamp"), float)
        assert "SQLクエリが無効です" in body["message"]
        assert "SQLクエリが無効です" in body["detail"]
    finally:
        app.dependency_overrides.clear()


def test_sql_download_csv_sql_error_has_unified_error():
    client = TestClient(app)
    mock_cm = Mock()
    mock_conn = Mock()
    mock_cursor = Mock()
    # count用の最初のexecuteで例外を投げさせる（外側exceptにより500へ）
    mock_cursor.execute.side_effect = Exception("テーブルが見つかりません")
    mock_conn.cursor.return_value = mock_cursor
    mock_cm.get_connection.return_value = ("conn_1", mock_conn)

    app.dependency_overrides[get_connection_manager_di] = lambda: mock_cm
    app.dependency_overrides[get_current_user] = lambda: {"user_id": "u1", "user_name": "U1"}
    try:
        res = client.post("/api/v1/sql/download/csv", json={"sql": "SELECT * FROM non_exist"})
        assert res.status_code == 500
        body = res.json()
        assert body["error"] is True
        assert body["status_code"] == 500
        assert isinstance(body.get("timestamp"), float)
        assert "CSVダウンロードに失敗しました" in body["message"]
        assert "CSVダウンロードに失敗しました" in body["detail"]
    finally:
        app.dependency_overrides.clear()


def test_cache_download_csv_missing_session_id_has_unified_error():
    client = TestClient(app)
    # serviceのDIは不要（手前で400になる）
    try:
        res = client.post("/api/v1/sql/cache/download/csv", json={})
        # Pydanticの必須フィールド欠如はバリデーションで422
        assert res.status_code == 422
        body = res.json()
        assert body["error"] is True
        assert body["status_code"] == 422
        assert isinstance(body.get("timestamp"), float)
        assert body["message"] == "バリデーションエラー"
        assert "validation_errors" in body["detail"]
    finally:
        app.dependency_overrides.clear()


def test_sql_download_csv_too_large_returns_400_unified():
    client = TestClient(app)
    mock_cm = Mock()
    mock_conn = Mock()
    mock_cursor = Mock()
    # 件数が制限超過になる値を返す
    mock_cursor.fetchone.return_value = [10_000_001]
    mock_conn.cursor.return_value = mock_cursor
    mock_cm.get_connection.return_value = ("conn_X", mock_conn)

    app.dependency_overrides[get_connection_manager_di] = lambda: mock_cm
    app.dependency_overrides[get_current_user] = lambda: {"user_id": "u1", "user_name": "U1"}
    try:
        res = client.post("/api/v1/sql/download/csv", json={"sql": "SELECT * FROM big"})
        assert res.status_code == 400
        body = res.json()
        assert body["error"] is True
        assert body["status_code"] == 400
        assert isinstance(body.get("timestamp"), float)
        assert "データが大きすぎます" in body["message"]
        assert "データが大きすぎます" in body["detail"]
    finally:
        app.dependency_overrides.clear()


def test_cache_download_csv_no_data_returns_404_unified():
    client = TestClient(app)
    mock_service = Mock()
    mock_service.get_cached_data.return_value = {
        "success": True,
        "data": [],
        "columns": [],
        "total_count": 0,
    }

    app.dependency_overrides[get_hybrid_sql_service_di] = lambda: mock_service
    try:
        res = client.post("/api/v1/sql/cache/download/csv", json={"session_id": "s1"})
        assert res.status_code == 404
        body = res.json()
        assert body["error"] is True
        assert body["status_code"] == 404
        assert isinstance(body.get("timestamp"), float)
        assert "データが見つかりません" in body["message"]
        assert "データが見つかりません" in body["detail"]
    finally:
        app.dependency_overrides.clear()
