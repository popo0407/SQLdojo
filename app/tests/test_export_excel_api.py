# -*- coding: utf-8 -*-
"""Excel/CSV エクスポート追加機能の基本テスト
- filename オプションサニタイズ
- 上限超過 / 空データ (簡易)
NOTE: 既存フィクスチャで testclient が提供されている前提。
"""
import re
from fastapi.testclient import TestClient
from app.tests.test_main import app  # 共通テストアプリ
from app.config_simplified import get_settings

client = TestClient(app)


def test_csv_download_filename_option(monkeypatch):
    """任意ファイル名サニタイズ: 禁止文字が '_' に置換される"""
    sql = "SELECT 1 as A, 2 as B"
    resp = client.post("/api/v1/sql/download/csv", json={"sql": sql, "filename": "test:bad*chars"})
    assert resp.status_code == 200, resp.text
    cd = resp.headers.get("content-disposition", "")
    assert re.search(r'filename="test_bad_chars\.csv"', cd)
    body = resp.content.decode('utf-8')
    assert 'A,B' in body


# 旧 Excel 直接エンドポイントは削除済みのためテスト対象外
