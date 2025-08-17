"""FastAPI アプリ生成ファクトリ

main.py と tests/test_main.py の重複初期化ロジックを集約するためのモジュール。

Phase 1: 既存挙動互換性を維持しつつ抽出のみ。大幅な責務再編は次フェーズ。
"""
from typing import Optional, Callable, Any
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.sessions import SessionMiddleware

from app.api.routes import router
from app.api.error_handlers import register_exception_handlers
from app.config_simplified import get_settings
from app.logger import get_logger


def create_app(
    *,
    title: Optional[str] = None,
    description: Optional[str] = None,
    version: Optional[str] = None,
    docs_url: str = "/docs",
    redoc_url: str = "/redoc",
    session_secret: str = "test-secret-key-for-testing-only",
    allow_origins: Optional[list[str]] = None,
    lifespan: Optional[Callable[[FastAPI], Any]] = None,
    for_test: bool = False,
) -> FastAPI:
    """FastAPI アプリを生成する共通関数"""
    settings = get_settings()
    logger = get_logger("app_factory")

    app = FastAPI(
        title=title or ("SQL道場 Webアプリ" if not for_test else "SQL Dojo API"),
        description=description or "SQL学習・実行プラットフォーム",
        version=version or getattr(settings, "__version__", "1.0.0"),
        docs_url=docs_url,
        redoc_url=redoc_url,
        lifespan=lifespan,
    )

    app.add_middleware(
        CORSMiddleware,
        allow_origins=allow_origins or settings.cors_origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    app.add_middleware(
        SessionMiddleware,
        secret_key=session_secret,
        same_site="lax",
        https_only=False,
        max_age=24 * 60 * 60,
        path="/",
    )

    app.include_router(router, prefix="/api/v1")
    register_exception_handlers(app)

    if for_test:
        @app.get("/health")
        async def health_check():  # pragma: no cover
            return {"status": "healthy"}

        @app.get("/")
        async def root():  # pragma: no cover
            return {"message": "SQL Dojo API is running"}

    logger.debug("FastAPI アプリ生成完了", for_test=for_test)
    return app
