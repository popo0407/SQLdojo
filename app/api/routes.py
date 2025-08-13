# -*- coding: utf-8 -*-
"""
app.api.routes は後方互換のために残した集約ルーターです。
実体は app.api.routers.* に分割されています。
"""
from fastapi import APIRouter
from app.api.routers import build_api_router

router: APIRouter = build_api_router()
