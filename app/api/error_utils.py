# -*- coding: utf-8 -*-
"""エクスポート等で使用する統一エラーレスポンスユーティリティ

FastAPI の HTTPException を投げる代わりに、error_code付きの JSON を生成する補助。
段階的導入のため既存ハンドラと共存可能な軽量実装。
"""
from fastapi import HTTPException
from typing import Any, Dict


def unified_error(status_code: int, error_code: str, message: str, **extra: Any) -> HTTPException:
    """統一エラーペイロードを生成し HTTPException.detail に格納して返す。

    既存テスト互換のため以下を必ず含める:
      - error: True
      - status_code: HTTPステータス
      - message: 人間向けメッセージ
      - detail: message と同一文字列 (レガシー expectation 対応)
      - error_code: 新方式コード
    """
    payload: Dict[str, Any] = {
        "error": True,
        "status_code": status_code,  # ハンドラ側 setdefault より前に明示
        "error_code": error_code,
        "message": message,
        "detail": message,  # レガシーテスト: detail 文字列前提
    }
    if extra:
        payload.update(extra)
    return HTTPException(status_code=status_code, detail=payload)


def err_limit_exceeded(limit: int, total_count: int) -> HTTPException:
    # 既存テスト互換: テストは部分一致で「データが大きすぎます」を期待
    msg = f"データが大きすぎます: {total_count:,}件（上限 {limit:,}件）"
    return unified_error(400, "LIMIT_EXCEEDED", msg, limit=limit, total_count=total_count)


def err_no_data() -> HTTPException:
    return unified_error(404, "NO_DATA", "データがありません")


def err_internal(message: str = "内部エラーが発生しました") -> HTTPException:
    return unified_error(500, "INTERNAL_ERROR", message)


def err_feature_disabled(feature: str) -> HTTPException:
    return unified_error(501, "FEATURE_DISABLED", f"機能が無効化されています: {feature}")


def extract_error_detail(exc: HTTPException) -> Dict[str, Any]:
    """HTTPException.detail が dict ならそのまま、文字列なら message に再ラップ。"""
    if isinstance(exc.detail, dict):
        return exc.detail
    return {"error": True, "message": str(exc.detail), "error_code": "ERROR"}
