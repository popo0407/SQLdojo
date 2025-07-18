"""
テスト専用のmain.pyモジュール - static files mount を無効化
"""
import sys
import os

# プロジェクトルートをPythonパスに追加
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.sessions import SessionMiddleware

# アプリケーションの基本設定をインポート
from app.config_simplified import get_settings
from app.api.routes import router
from app.api.error_handlers import register_exception_handlers

settings = get_settings()

# FastAPIアプリケーションを作成
app = FastAPI(
    title="SQL Dojo API",
    description="SQL学習・実行プラットフォーム",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

# SessionMiddleware設定（テスト用）
app.add_middleware(
    SessionMiddleware,
    secret_key="test-secret-key-for-testing-only"
)

# CORS設定
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# APIルーターを登録
app.include_router(router, prefix="/api/v1")

# エラーハンドラーを登録
register_exception_handlers(app)

# ヘルスチェックエンドポイント
@app.get("/health")
async def health_check():
    return {"status": "healthy"}

# ルートエンドポイント
@app.get("/")
async def root():
    return {"message": "SQL Dojo API is running"}

# テスト用: static filesマウントは無効化
# (通常のmain.pyではapp.mount("/static", StaticFiles(directory="app/static"), name="static")が実行される)
