# -*- coding: utf-8 -*-
from fastapi import APIRouter
from typing import Dict

router = APIRouter()

@router.get("/", response_model=Dict[str, str])
async def root():
    return {"message": "Snowsight風SQL Webアプリ", "version": "1.3.0"}

@router.get("/favicon.ico")
async def favicon():
    from fastapi.responses import Response
    return Response(status_code=204)

@router.get("/.well-known/appspecific/com.chrome.devtools.json")
async def chrome_devtools():
    from fastapi.responses import Response
    return Response(status_code=204)
