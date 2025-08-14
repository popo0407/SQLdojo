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

from app.exceptions import BaseAppException
from app.logger import get_logger


logger = get_logger(__name__)


async def app_exception_handler(request: Request, exc: BaseAppException) -> JSONResponse:
    """アプリケーション例外ハンドラー"""
    logger.error(f"アプリケーション例外: {exc.message}", 
                details=exc.detail, 
                path=request.url.path,
                method=request.method)
    
    content = exc.to_dict()
    content["timestamp"] = time.time()
    return JSONResponse(
        status_code=exc.status_code,
        content=content
    )


def register_exception_handlers(app):
    """例外ハンドラーを登録"""
    # アプリケーション例外
    app.add_exception_handler(BaseAppException, app_exception_handler)
    
    @app.exception_handler(HTTPException)
    async def http_exception_handler(request: Request, exc: HTTPException):
        raw = exc.detail
        # detail が dict の場合は unified_error 形式を想定し再構築
        if isinstance(raw, dict):
            payload = dict(raw)  # コピー
            payload.setdefault("error", True)
            payload.setdefault("status_code", exc.status_code)
            payload["timestamp"] = time.time()
            # レガシーテスト互換: detail キーにも message を複製
            payload.setdefault("detail", payload.get("message"))
            logger.error(f"HTTP例外: {payload.get('message')}",
                         status_code=exc.status_code,
                         path=request.url.path,
                         method=request.method,
                         error_code=payload.get('error_code'))
            return JSONResponse(status_code=exc.status_code, content=payload)
        else:
            detail = str(raw) if raw else "エラーが発生しました"
            logger.error(f"HTTP例外: {detail}",
                         status_code=exc.status_code,
                         path=request.url.path,
                         method=request.method)
            return JSONResponse(
                status_code=exc.status_code,
                content={
                    "detail": detail,
                    "error": True,
                    "message": detail,
                    "status_code": exc.status_code,
                    "timestamp": time.time(),
                }
            )
    
    app.add_exception_handler(StarletteHTTPException, starlette_http_exception_handler)
    
    # バリデーション例外
    app.add_exception_handler(RequestValidationError, validation_exception_handler)
    
    # 汎用例外（最後に登録）
    app.add_exception_handler(Exception, general_exception_handler)


async def validation_exception_handler(request: Request, exc: RequestValidationError) -> JSONResponse:
    """バリデーション例外ハンドラー"""
    logger.error(f"バリデーション例外: {exc.errors()}", 
                path=request.url.path,
                method=request.method)
    
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
        logger.error(f"Starlette HTTP例外: {exc.detail}", 
                    status_code=exc.status_code,
                    path=request.url.path,
                    method=request.method)
    
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "error": True,
            "message": exc.detail,
            "status_code": exc.status_code,
            "detail": {},
            "timestamp": time.time(),
        }
    )


async def general_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    """汎用例外ハンドラー"""
    logger.error(f"予期しない例外: {str(exc)}", 
                exception=exc,
                path=request.url.path,
                method=request.method)
    
    return JSONResponse(
        status_code=500,
        content={
            "error": True,
            "message": "内部サーバーエラー",
            "status_code": 500,
            "detail": {},
            "timestamp": time.time(),
        }
    ) 