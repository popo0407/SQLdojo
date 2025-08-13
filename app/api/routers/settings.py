# -*- coding: utf-8 -*-
from fastapi import APIRouter
from app.config_simplified import get_settings

router = APIRouter(prefix="/config", tags=["settings"])


@router.get("/settings")
async def get_config_settings():
    settings = get_settings()
    return {
        "default_page_size": settings.default_page_size,
        "max_page_size": settings.max_page_size,
        "cursor_chunk_size": settings.cursor_chunk_size,
        "infinite_scroll_threshold": settings.infinite_scroll_threshold,
        "max_records_for_display": settings.max_records_for_display,
        "max_records_for_csv_download": settings.max_records_for_csv_download,
    }
