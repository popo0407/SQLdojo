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

from app.exceptions import BaseAppException
from app.logger import get_logger


logger = get_logger(__name__)


async def app_exception_handler(request: Request, exc: BaseAppException) -> JSONResponse:
    """アプリケーション例外ハンドラー"""
    logger.error(f"アプリケーション例外: {exc.message}", 
                details=exc.detail, 
                path=request.url.path,
                method=request.method)
    
    return JSONResponse(
        status_code=exc.status_code,
        content=exc.to_dict()
    )


async def http_exception_handler(request: Request, exc: HTTPException) -> JSONResponse:
    """HTTP例外ハンドラー"""
    logger.error(f"HTTP例外: {exc.detail}", 
                status_code=exc.status_code,
                path=request.url.path,
                method=request.method)
    
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "error": True,
            "message": exc.detail,
            "status_code": exc.status_code,
            "detail": {}
        }
    )


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
            }
        }
    )


async def starlette_http_exception_handler(request: Request, exc: StarletteHTTPException) -> JSONResponse:
    """Starlette HTTP例外ハンドラー"""
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
            "detail": {}
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
            "detail": {}
        }
    )


def register_exception_handlers(app):
    """例外ハンドラーを登録"""
    # アプリケーション例外
    app.add_exception_handler(BaseAppException, app_exception_handler)
    
    # HTTP例外
    app.add_exception_handler(HTTPException, http_exception_handler)
    app.add_exception_handler(StarletteHTTPException, starlette_http_exception_handler)
    
    # バリデーション例外
    app.add_exception_handler(RequestValidationError, validation_exception_handler)
    
    # 汎用例外（最後に登録）
    app.add_exception_handler(Exception, general_exception_handler) 