# -*- coding: utf-8 -*-
"""テスト用アサートヘルパー

統一エラーレスポンスフォーマットの検証を一元化する。
"""
from typing import Dict, Iterable

REQUIRED_ERROR_KEYS: Iterable[str] = (
    "error",
    "status_code",
    "message",
    "detail",
    "error_code",
    "timestamp",
)

def assert_unified_error(payload: Dict, status_code: int | None = None, *, error_code: str | None = None) -> None:
    """統一エラーレスポンス形式を検証する。

    Args:
        payload: response.json() の辞書
        status_code: 期待する HTTP ステータス
        error_code: 期待する error_code（省略時は検証しない）
    """
    for key in REQUIRED_ERROR_KEYS:
        assert key in payload, f"missing key: {key} in {payload}"
    assert payload["error"] is True
    if status_code is not None:
        assert payload["status_code"] == status_code, f"status_code mismatch: {payload['status_code']} != {status_code}"
    if error_code is not None:
        assert payload["error_code"] == error_code, f"error_code mismatch: {payload['error_code']} != {error_code}"
    # レガシー互換: detail は message と同一文字列であること（統一ヘルパー設計）
    if isinstance(payload.get("detail"), str):
        assert payload["detail"] == payload["message"], "detail should mirror message for legacy tests"
