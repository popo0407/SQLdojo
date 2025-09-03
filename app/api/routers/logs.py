# -*- coding: utf-8 -*-
from fastapi import APIRouter, HTTPException
from typing import List
from datetime import datetime, timedelta

from app.config_simplified import get_settings
from app.api.models import SQLExecutionLog, SQLExecutionLogResponse
from app.dependencies import CurrentUserDep, CurrentAdminDep, SQLLogServiceDep
from app.logger import Logger

logger = Logger(__name__)
router = APIRouter(prefix="/logs", tags=["logs"])


@router.get("/sql", response_model=SQLExecutionLogResponse)
async def get_sql_logs(current_user: CurrentUserDep, sql_log_service: SQLLogServiceDep, limit: int = 50, offset: int = 0):
    result = sql_log_service.get_logs(user_id=current_user["user_id"], limit=limit, offset=offset)
    logs = [
        SQLExecutionLog(
            log_id=str(log.get("log_id", "")),
            user_id=log["user_id"],
            sql=log["sql"],
            execution_time=log["execution_time"],
            row_count=log["row_count"],
            success=log["success"],
            error_message=log.get("error_message"),
            timestamp=datetime.fromisoformat(log["timestamp"]),
        )
        for log in result["logs"]
    ]
    return SQLExecutionLogResponse(logs=logs, total_count=result["total_count"])


@router.get("/admin/sql", response_model=SQLExecutionLogResponse)
async def get_all_sql_logs(current_admin: CurrentAdminDep, sql_log_service: SQLLogServiceDep, limit: int = 100, offset: int = 0):
    result = sql_log_service.get_logs(limit=limit, offset=offset)
    logs = [
        SQLExecutionLog(
            log_id=str(log.get("log_id", "")),
            user_id=log["user_id"],
            sql=log["sql"],
            execution_time=log["execution_time"],
            row_count=log["row_count"],
            success=log["success"],
            error_message=log.get("error_message"),
            timestamp=datetime.fromisoformat(log["timestamp"]),
        )
        for log in result["logs"]
    ]
    return SQLExecutionLogResponse(logs=logs, total_count=result["total_count"])


@router.delete("/sql")
async def clear_user_sql_logs(current_user: CurrentUserDep, sql_log_service: SQLLogServiceDep):
    sql_log_service.clear_logs(user_id=current_user["user_id"])
    return {"message": "SQL実行ログをクリアしました"}


@router.delete("/admin/sql")
async def clear_all_sql_logs(current_admin: CurrentAdminDep, sql_log_service: SQLLogServiceDep):
    sql_log_service.clear_logs()
    return {"message": "全SQL実行ログをクリアしました"}


@router.get("/analytics")
async def get_log_analytics(current_user: CurrentUserDep):
    raise HTTPException(status_code=501, detail="ログ分析APIは未実装です")


@router.post("/export")
async def export_logs(current_user: CurrentUserDep):
    raise HTTPException(status_code=501, detail="ログエクスポートAPIは未実装です")


@router.get("/user-history")
async def get_user_history(current_user: CurrentUserDep, sql_log_service: SQLLogServiceDep):
    six_months_ago = datetime.now() - timedelta(days=180)
    settings = get_settings()
    result = sql_log_service.get_logs(user_id=current_user["user_id"], limit=settings.max_history_logs, offset=0)
    filtered = []
    for log in result["logs"]:
        try:
            if datetime.fromisoformat(log["timestamp"]) >= six_months_ago:
                filtered.append(log)
        except Exception:
            continue
    return {"logs": filtered, "total_count": len(filtered)}
