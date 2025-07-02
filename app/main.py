# -*- coding: utf-8 -*-
"""
FastAPIアプリケーションのメインファイル
"""
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, HTMLResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
import time
import os

from app.api.routes import router
from app.api.error_handlers import register_exception_handlers
from app.config_simplified import get_settings
from app.logger import get_logger
from app.api.models import ErrorResponse
from app import __version__
from app.services.connection_manager_odbc import ConnectionManagerODBC
from app.dependencies import get_connection_manager_di

from starlette.datastructures import URL
from app.config_simplified import get_settings


# 設定とロガーを取得
settings = get_settings()
logger = get_logger("main")


@asynccontextmanager
async def lifespan(app: FastAPI):
    """アプリケーションのライフサイクル管理"""
    # ConnectionManagerODBCをシングルトン生成しDIを上書き
    connection_manager = ConnectionManagerODBC()
    app.dependency_overrides[get_connection_manager_di] = lambda: connection_manager

    logger.info("アプリケーション起動", version=__version__)
    logger.info("設定情報", 
               host=settings.app_host, 
               port=settings.app_port,
               debug=settings.app_debug)
    
    yield
    # 終了時の処理
    connection_manager.close_all_connections()
    logger.info("アプリケーション終了")


# FastAPIアプリケーション作成
app = FastAPI(
    title="Snowsight風SQL Webアプリ",
    description="Webブラウザ上でSQLを記述・実行し、結果をわかりやすく表示・解析できるインターフェース",
    version=__version__,
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan
)

# 共通エラーハンドラーを登録
register_exception_handlers(app)

# CORS設定
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # 本番環境では適切に制限する
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ルーターを追加
app.include_router(router, prefix="/api/v1")

# Static files
app.mount("/static", StaticFiles(directory="app/static"), name="static")

# Templates
templates = Jinja2Templates(directory="app/templates")


@app.middleware("http")
# async def add_process_time_header(request: Request, call_next):
async def force_url_middleware(request: Request, call_next):
    """リクエスト処理時間を計測するミドルウェア"""
    start_time = time.time()
    
    response = await call_next(request)
    
    process_time = time.time() - start_time
    response.headers["X-Process-Time"] = str(process_time)
    
    # ログ出力
    logger.info(
        f"{request.method} {request.url.path}",
        process_time=process_time,
        status_code=response.status_code
    )
    
    return response


@app.get("/")
async def root(request: Request):
    return templates.TemplateResponse(
        "index.html",
        {"request": request, "public_server_url": settings.public_server_url}
    )

@app.get("/api/health")
async def health_check():
    """簡易ヘルスチェック"""
    return {"status": "healthy", "version": __version__}


if __name__ == "__main__":
    import uvicorn
    
    uvicorn.run(
        "app.main:app",
        host=settings.app_host,
        port=settings.app_port,
        reload=settings.app_debug,
        log_level="info"
    ) 