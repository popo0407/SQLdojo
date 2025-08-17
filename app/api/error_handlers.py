# -*- coding: utf-8 -*-
"""
APIエラーハンドラー
FastAPIの例外ハンドリングを共通化
"""
from fastapi import Request, HTTPException
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from starlette.exceptions import HTTPException as StarletteHTTPException
from typing import Union
import logging
import time

from app.exceptions import BaseAppException, ErrorCode
from app.logger import get_logger


logger = get_logger(__name__)


async def app_exception_handler(request: Request, exc: BaseAppException) -> JSONResponse:
    """アプリ例外 → 統一レスポンス

    ロギング衝突防止: logger.error は第一引数のみ。extra で message を渡さない。
    ErrorCode は文字列へ変換。
    """
    code = getattr(exc, "error_code", ErrorCode.APP_ERROR)
    if isinstance(code, ErrorCode):
        code_val = code.value
    else:
        code_val = str(code)
    logger.error(f"アプリケーション例外 code={code_val} path={request.url.path} method={request.method} msg={exc.message}")
    payload = exc.to_dict()
    # Enum → 文字列 (JSONシリアライズ安定化)
    if isinstance(payload.get("error_code"), ErrorCode):
        payload["error_code"] = payload["error_code"].value
    payload["timestamp"] = time.time()
    return JSONResponse(status_code=exc.status_code, content=payload)


def register_exception_handlers(app):
    """例外ハンドラーを登録"""
    # アプリケーション例外
    app.add_exception_handler(BaseAppException, app_exception_handler)
    
    @app.exception_handler(HTTPException)
    async def http_exception_handler(request: Request, exc: HTTPException):
        raw = exc.detail
        if isinstance(raw, dict):  # unified_error を尊重
            payload = {**raw}
            payload.setdefault("error", True)
            payload.setdefault("status_code", exc.status_code)
            payload.setdefault("error_code", raw.get("error_code", ErrorCode.APP_ERROR))
            if not isinstance(payload.get("detail"), str):
                payload["detail"] = payload.get("message")

            # --- ErrorCode 正規化開始 ---
            ec_raw = payload.get("error_code")
            # Enum -> 値
            if isinstance(ec_raw, ErrorCode):
                ec_raw = ec_raw.value  # e.g. ErrorCode.NOT_FOUND -> "NOT_FOUND"
            ec_raw_str = str(ec_raw) if ec_raw is not None else ""
            # 'ErrorCode.X' 形式なら末尾を抽出
            if ec_raw_str.startswith("ErrorCode."):
                ec_base = ec_raw_str.split(".", 1)[1]
            else:
                ec_base = ec_raw_str

            msg = str(payload.get("message") or "")
            status = exc.status_code

            # 404 系は (NOT_FOUND/NO_DATA/空) を NO_DATA に統一
            if status == 404:
                if ec_base in ("", "NOT_FOUND", "NO_DATA") or any(k in msg for k in ("データがありません", "データが見つかりません")):
                    ec_norm = "NO_DATA"
                else:
                    ec_norm = ec_base or "NO_DATA"
            # データサイズ関連 400/413 を LIMIT_EXCEEDED へ
            elif status in (400, 413) and (
                ec_base in ("DATA_PROCESSING_ERROR", "LIMIT_EXCEEDED") or
                any(kw in msg for kw in ("データが大きすぎ", "上限"))
            ):
                ec_norm = "LIMIT_EXCEEDED"
            else:
                ec_norm = ec_base or str(ErrorCode.APP_ERROR.value)

            payload["error_code"] = ec_norm
            payload["timestamp"] = time.time()
            logger.error(
                f"HTTP例外(unified) status={exc.status_code} code={ec_norm} path={request.url.path} msg={msg}"
            )
            return JSONResponse(status_code=exc.status_code, content=payload)

        # 文字列 detail → ラップ
        detail_text = str(raw) if raw else "エラーが発生しました"
        logger.error(f"HTTP例外 status={exc.status_code} path={request.url.path} msg={detail_text}")
        payload = {
            "error": True,
            "status_code": exc.status_code,
            "message": detail_text,
            "detail": detail_text,
            # 404 を NO_DATA に統一 (テスト期待)
            "error_code": "NO_DATA" if exc.status_code == 404 and detail_text in ("データがありません", "データが見つかりません") else ErrorCode.APP_ERROR,
            "timestamp": time.time(),
        }
        return JSONResponse(status_code=exc.status_code, content=payload)
    
    app.add_exception_handler(StarletteHTTPException, starlette_http_exception_handler)
    
    # バリデーション例外
    app.add_exception_handler(RequestValidationError, validation_exception_handler)
    
    # 汎用例外（最後に登録）
    app.add_exception_handler(Exception, general_exception_handler)


async def validation_exception_handler(request: Request, exc: RequestValidationError) -> JSONResponse:
    """バリデーション例外ハンドラー"""
    logger.error(
        f"バリデーション例外 path={request.url.path} method={request.method} errors={exc.errors()}"
    )
    
    return JSONResponse(
        status_code=422,
        content={
            "error": True,
            "message": "バリデーションエラー",
            "status_code": 422,
            "detail": {
                "validation_errors": exc.errors()
            },
            "timestamp": time.time(),
        }
    )


async def starlette_http_exception_handler(request: Request, exc: StarletteHTTPException) -> JSONResponse:
    """Starlette HTTP例外ハンドラー"""
    # 404エラーはdebugレベルでログ出力
    if exc.status_code == 404:
        logger.debug(f"404 Not Found: {request.url.path}")
    else:
        logger.error(
            f"Starlette HTTP例外 status={exc.status_code} path={request.url.path} method={request.method} msg={exc.detail}"
        )
    
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "error": True,
            "message": exc.detail,
            "status_code": exc.status_code,
            "detail": {},
            "error_code": "NO_DATA" if exc.status_code == 404 else ErrorCode.APP_ERROR,
            "timestamp": time.time(),
        },
    )


async def general_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    """汎用例外ハンドラー"""
    logger.error(
        f"予期しない例外 path={request.url.path} method={request.method} exc={type(exc).__name__} msg={exc}"
    )
    
    return JSONResponse(
        status_code=500,
        content={
            "error": True,
            "message": "内部サーバーエラー",
            "status_code": 500,
            "detail": {},
            "error_code": ErrorCode.INTERNAL_ERROR,
            "timestamp": time.time(),
        },
    )