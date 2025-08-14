"""キャッシュ経由 TSV / Excel エクスポート API テスト

目的:
    - /api/v1/sql/cache/clipboard/tsv
    - /api/v1/sql/cache/download/excel
の正常系/異常系/フィルタ&ソート伝播を検証する。
"""

from fastapi.testclient import TestClient
from unittest.mock import Mock
from app.dependencies import get_hybrid_sql_service_di
from app.config_simplified import get_settings


class TestCacheClipboardTSVAPI:
    def test_cache_clipboard_tsv_success(self, client: TestClient):
        mock_service = Mock()
        mock_service.get_cached_data.return_value = {
            "data": [
                {"col1": "v1", "col2": "v2"},
                {"col1": "=1+2", "col2": "複\n数行"},
            ],
            "columns": ["col1", "col2"],
        }
        app = client.app
        app.dependency_overrides[get_hybrid_sql_service_di] = lambda: mock_service
        resp = client.post("/api/v1/sql/cache/clipboard/tsv", json={"session_id": "s1"})
        assert resp.status_code == 200
        assert "text/tab-separated-values" in resp.headers["content-type"].lower()
        body = resp.content.decode("utf-8")
        assert body.startswith("col1\tcol2")
        assert "'" in body  # formula injection prefix
        assert "複\n数行" in body.replace("\r\n", "\n")
        app.dependency_overrides.clear()

    def test_cache_clipboard_tsv_no_session(self, client: TestClient):
        resp = client.post("/api/v1/sql/cache/clipboard/tsv", json={})
        assert resp.status_code == 400
        data = resp.json()
        # error_utils.unified_error により error_code はトップレベル
        assert data.get("error_code") == "INVALID_SESSION"

    def test_cache_clipboard_tsv_no_data(self, client: TestClient):
        mock_service = Mock()
        mock_service.get_cached_data.return_value = {"data": [], "columns": ["col1", "col2"]}
        app = client.app
        app.dependency_overrides[get_hybrid_sql_service_di] = lambda: mock_service
        resp = client.post("/api/v1/sql/cache/clipboard/tsv", json={"session_id": "s_empty"})
        assert resp.status_code == 404
        data = resp.json()
        assert data.get("error_code") == "NO_DATA"
        app.dependency_overrides.clear()

    def test_cache_clipboard_tsv_limit_exceeded(self, client: TestClient):
        settings = get_settings()
        over = settings.max_records_for_clipboard_copy + 1
        mock_rows = [{"c": i} for i in range(over)]
        mock_service = Mock()
        mock_service.get_cached_data.return_value = {"data": mock_rows, "columns": ["c"]}
        app = client.app
        app.dependency_overrides[get_hybrid_sql_service_di] = lambda: mock_service
        resp = client.post("/api/v1/sql/cache/clipboard/tsv", json={"session_id": "s_limit"})
        assert resp.status_code == 400
        data = resp.json()
        assert data.get("error_code") == "LIMIT_EXCEEDED"
        assert "データが大きすぎます" in data.get("message", "")
        app.dependency_overrides.clear()

    def test_cache_clipboard_tsv_filters_and_sort(self, client: TestClient):
        mock_service = Mock()
        mock_service.get_cached_data.return_value = {
            "data": [{"col1": "f1", "col2": "s2"}],
            "columns": ["col1", "col2"],
        }
        app = client.app
        app.dependency_overrides[get_hybrid_sql_service_di] = lambda: mock_service
        resp = client.post(
            "/api/v1/sql/cache/clipboard/tsv",
            json={
                "session_id": "s_filters",
                "filters": {"col1": ["f1"]},
                "sort_by": "col2",
                "sort_order": "DESC",
            },
        )
        assert resp.status_code == 200
        mock_service.get_cached_data.assert_called_once()
        kwargs = mock_service.get_cached_data.call_args.kwargs
        assert kwargs["filters"] == {"col1": ["f1"]}
        assert kwargs["sort_by"] == "col2"
        assert kwargs["sort_order"] == "DESC"
        app.dependency_overrides.clear()


class TestCacheDownloadExcelAPI:
    def test_cache_download_excel_success(self, client: TestClient):
        mock_service = Mock()
        mock_service.get_cached_data.return_value = {
            "data": [{"A": 1, "B": 2}, {"A": 3, "B": 4}],
            "columns": ["A", "B"],
        }
        app = client.app
        app.dependency_overrides[get_hybrid_sql_service_di] = lambda: mock_service
        resp = client.post("/api/v1/sql/cache/download/excel", json={"session_id": "s_excel"})
        assert resp.status_code == 200
        ctype = resp.headers["content-type"].lower()
        assert "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" in ctype
        assert len(resp.content) > 500
        app.dependency_overrides.clear()

    def test_cache_download_excel_no_session(self, client: TestClient):
        resp = client.post("/api/v1/sql/cache/download/excel", json={})
        assert resp.status_code == 400
        data = resp.json()
        assert data.get("error_code") == "INVALID_SESSION"

    def test_cache_download_excel_no_data(self, client: TestClient):
        mock_service = Mock()
        mock_service.get_cached_data.return_value = {"data": [], "columns": ["A"]}
        app = client.app
        app.dependency_overrides[get_hybrid_sql_service_di] = lambda: mock_service
        resp = client.post("/api/v1/sql/cache/download/excel", json={"session_id": "s_empty"})
        assert resp.status_code == 404
        data = resp.json()
        assert data.get("error_code") == "NO_DATA"
        app.dependency_overrides.clear()

    def test_cache_download_excel_limit_exceeded(self, client: TestClient):
        settings = get_settings()
        over = settings.max_records_for_excel_download + 1
        mock_rows = [{"A": i} for i in range(over)]
        mock_service = Mock()
        mock_service.get_cached_data.return_value = {"data": mock_rows, "columns": ["A"]}
        app = client.app
        app.dependency_overrides[get_hybrid_sql_service_di] = lambda: mock_service
        resp = client.post("/api/v1/sql/cache/download/excel", json={"session_id": "s_limit"})
        assert resp.status_code == 400
        data = resp.json()
        assert data.get("error_code") == "LIMIT_EXCEEDED"
        assert "データが大きすぎます" in data.get("message", "")
        app.dependency_overrides.clear()

    def test_cache_download_excel_filters_and_sort(self, client: TestClient):
        mock_service = Mock()
        mock_service.get_cached_data.return_value = {
            "data": [{"A": 10, "B": 20}],
            "columns": ["A", "B"],
        }
        app = client.app
        app.dependency_overrides[get_hybrid_sql_service_di] = lambda: mock_service
        resp = client.post(
            "/api/v1/sql/cache/download/excel",
            json={
                "session_id": "s_filters",
                "filters": {"A": [10]},
                "sort_by": "B",
                "sort_order": "DESC",
            },
        )
        assert resp.status_code == 200
        mock_service.get_cached_data.assert_called_once()
        kwargs = mock_service.get_cached_data.call_args.kwargs
        assert kwargs["filters"] == {"A": [10]}
        assert kwargs["sort_by"] == "B"
        assert kwargs["sort_order"] == "DESC"
        app.dependency_overrides.clear()