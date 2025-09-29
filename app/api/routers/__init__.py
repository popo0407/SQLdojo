# -*- coding: utf-8 -*-
"""
機能別に分割された FastAPI ルーター群。
本パッケージの __init__ では公開用の include_router 関数のみを提供します。
"""
from fastapi import APIRouter

from .root import router as root_router
from .auth import router as auth_router
from .admin import router as admin_router
from .admin import user_router as users_router
from .metadata import router as metadata_router
from .sql import router as sql_router
from .logs import router as logs_router
from .cache import router as cache_router
from .settings import router as settings_router
from .health import router as health_router
from .utils import router as utils_router
from .master import router as master_router


def build_api_router() -> APIRouter:
    router = APIRouter(tags=["API"])
    router.include_router(root_router)
    router.include_router(auth_router)
    router.include_router(admin_router)
    router.include_router(users_router)
    router.include_router(metadata_router)
    router.include_router(sql_router)
    router.include_router(logs_router)
    router.include_router(cache_router)
    router.include_router(settings_router)
    router.include_router(health_router)
    router.include_router(utils_router)
    router.include_router(master_router)
    return router
