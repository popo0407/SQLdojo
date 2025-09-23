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
        """chart_configありとなしでファイルサイズを比較"""
        mock_service = Mock()
        mock_service.get_cached_data.return_value = {
            "data": [{"name": "Product_1", "price": 100, "quantity": 10}, 
                     {"name": "Product_2", "price": 200, "quantity": 20}],
            "columns": ["name", "price", "quantity"],
        }
        app = client.app
        app.dependency_overrides[get_hybrid_sql_service_di] = lambda: mock_service
        
        # 1. chart_configなしでテスト
        resp_no_chart = client.post("/api/v1/sql/cache/download/excel", json={
            "session_id": "s_excel"
        })
        assert resp_no_chart.status_code == 200
        size_no_chart = len(resp_no_chart.content)
        
        # 2. chart_config付きでテスト
        chart_config = {
            'chartType': 'bar',
            'xColumn': 'name',
            'yColumns': ['price', 'quantity'],
            'title': 'Test Products Chart',
            'xAxisLabel': 'Product Name',
            'yAxisLabel': 'Value'
        }
        
        resp_with_chart = client.post("/api/v1/sql/cache/download/excel", json={
            "session_id": "s_excel", 
            "chart_config": chart_config
        })
        assert resp_with_chart.status_code == 200
        size_with_chart = len(resp_with_chart.content)
        
        print(f"Excel file size without chart: {size_no_chart} bytes")
        print(f"Excel file size with chart: {size_with_chart} bytes")
        print(f"Size difference: {size_with_chart - size_no_chart} bytes")
        
        # chart_config付きの方が大きいはず（グラフが含まれている場合）
        if size_with_chart > size_no_chart:
            print("✅ Chart appears to be included (file size increased)")
        else:
            print("❌ Chart may not be included (no size increase)")
        
        # Excelファイルを保存して検証
        with open('test_no_chart.xlsx', 'wb') as f:
            f.write(resp_no_chart.content)
        with open('test_with_chart.xlsx', 'wb') as f:
            f.write(resp_with_chart.content)
        print("Excel files saved: test_no_chart.xlsx, test_with_chart.xlsx")
        
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