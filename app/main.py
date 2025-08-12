# -*- coding: utf-8 -*-
"""
FastAPIアプリケーションのメインファイル
"""
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse, RedirectResponse
# from fastapi.staticfiles import StaticFiles
# from fastapi.templating import Jinja2Templates
import time
import os

from app.api.routes import router
from app.api.error_handlers import register_exception_handlers
from app.config_simplified import get_settings
from app.logger import get_logger
from app import __version__
from app.services.connection_manager_odbc import ConnectionManagerODBC
from app.dependencies import get_connection_manager_di

from starlette.middleware.sessions import SessionMiddleware

# --- 設定とロガーを取得 ---
settings = get_settings()
logger = get_logger("main")

# セッション用のSECRET_KEY (環境変数から取得を強く推奨)
SECRET_KEY = os.getenv("SECRET_KEY", "a_very_secret_key_that_should_be_changed")

# --- アプリケーションのライフサイクル管理 ---
@asynccontextmanager
async def lifespan(app: FastAPI):
    """アプリケーションのライフサイクル管理"""
    # 起動時の処理
    connection_manager = ConnectionManagerODBC()
    app.dependency_overrides[get_connection_manager_di] = lambda: connection_manager
    logger.info(f"アプリケーション起動 Ver: {__version__}")
    yield
    # 終了時の処理
    connection_manager.close_all_connections()
    logger.info("アプリケーション終了")


# --- FastAPIアプリケーション作成 ---
app = FastAPI(
    title="SQL道場 Webアプリ",
    description="Webブラウザ上でSQLを記述・実行し、結果をわかりやすく表示・解析できるインターフェース",
    version=__version__,
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan
)

# --- ミドルウェアの設定 ---

# 共通エラーハンドラーを登録
register_exception_handlers(app)

# CORS設定（.envの CORS_ORIGINS / cors_origins から取得）
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# セッション管理ミドルウェア
app.add_middleware(
    SessionMiddleware, 
    secret_key=SECRET_KEY,
    same_site="lax",  # localhost開発環境では lax が最も適切
    https_only=False,  # HTTPでも動作するように設定（開発環境用）
    max_age=24*60*60,   # 24時間
    path="/"  # パスを明示
)

# リクエスト処理時間を記録するミドルウェア
@app.middleware("http")
async def add_process_time_header(request: Request, call_next):
    start_time = time.time()
    response = await call_next(request)
    process_time = time.time() - start_time
    response.headers["X-Process-Time"] = str(process_time)
    logger.info(
        f"{request.method} {request.url.path}",
        process_time=process_time,
        status_code=response.status_code
    )
    return response

# --- ルーターと静的ファイルの設定 ---
app.include_router(router, prefix="/api/v1")
# 静的ファイルとテンプレートはReactに移行済みのため、コメントアウト
# app.mount("/static", StaticFiles(directory="app/static"), name="static")
# templates = Jinja2Templates(directory="app/templates")


# --- ルート定義 (エンドポイント) ---

# HTMLテンプレートはReactに移行済みのため、APIエンドポイントのみ提供
@app.get("/login")
async def login_page():
    return {"message": "Reactアプリケーションに移行済みです"}

@app.get("/")
async def root():
    return {"message": "Reactアプリケーションに移行済みです"}

@app.get("/admin")
async def admin_page():
    return {"message": "Reactアプリケーションに移行済みです"}

@app.get("/user")
async def user_page():
    return {"message": "Reactアプリケーションに移行済みです"}

@app.get("/manage-templates")
async def template_management_page():
    return {"message": "Reactアプリケーションに移行済みです"}

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
        reload=False, 
        log_level="info"
    )