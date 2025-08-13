# -*- coding: utf-8 -*-
from fastapi import APIRouter, HTTPException, Body
from fastapi.responses import StreamingResponse
from typing import Optional
from datetime import datetime
import csv
import io
import inspect

from app.api.models import (
    CacheSQLRequest, CacheSQLResponse, CacheReadRequest, CacheReadResponse,
    SessionStatusResponse, CancelRequest, CancelResponse, CacheUniqueValuesRequest, CacheUniqueValuesResponse
)
from app.dependencies import (
    HybridSQLServiceDep, CurrentUserDep, SQLLogServiceDep,
    StreamingStateServiceDep, SessionServiceDep
)
from app.logger import Logger

logger = Logger(__name__)
router = APIRouter(prefix="/sql/cache", tags=["cache"])


@router.post("/execute", response_model=CacheSQLResponse)
async def execute_sql_with_cache_endpoint(
    request: CacheSQLRequest,
    hybrid_sql_service: HybridSQLServiceDep,
    current_user: CurrentUserDep,
    sql_log_service: SQLLogServiceDep,
):
    if not request.sql:
        raise HTTPException(status_code=400, detail="SQLクエリが無効です")
    start_time = datetime.now()
    try:
        maybe = hybrid_sql_service.execute_sql_with_cache(request.sql, current_user["user_id"], request.limit)
        result = await maybe if inspect.isawaitable(maybe) else maybe
    except Exception as e:
        logger.error(f"キャッシュ付きSQL実行エラー: {e}")
        raise HTTPException(status_code=400, detail=str(e))
    if result.get("status") == "requires_confirmation":
        return CacheSQLResponse(success=False, session_id=None, total_count=result["total_count"], processed_rows=0, execution_time=0, message=result["message"], error_message=None)
    response = CacheSQLResponse(
        success=result["success"],
        session_id=result["session_id"],
        total_count=result["total_count"],
        processed_rows=result["processed_rows"],
        execution_time=result["execution_time"],
        message=result["message"],
        error_message=result.get("error_message"),
    )
    maybe_log = sql_log_service.add_log_to_db(
        current_user["user_id"], request.sql, result["execution_time"], start_time, result["processed_rows"], result["success"], result.get("error_message")
    )
    if inspect.isawaitable(maybe_log):
        await maybe_log
    if not result["success"]:
        return CacheSQLResponse(success=False, session_id=None, total_count=0, processed_rows=0, execution_time=result.get("execution_time", 0), message=None, error_message=result.get("error_message", "SQL実行に失敗しました"))
    return response


@router.post("/read", response_model=CacheReadResponse)
async def read_cached_data_endpoint(request: CacheReadRequest = Body(...), hybrid_sql_service: HybridSQLServiceDep = None):
    try:
        result = hybrid_sql_service.get_cached_data(
            request.session_id,
            request.page,
            request.page_size,
            request.filters,
            request.sort_by,
            request.sort_order,
        )
        result = await result if inspect.isawaitable(result) else result
        return CacheReadResponse(
            success=result["success"],
            data=result["data"],
            columns=result["columns"],
            total_count=result["total_count"],
            page=result["page"],
            page_size=result["page_size"],
            total_pages=result["total_pages"],
            session_info=result["session_info"],
            execution_time=result.get("execution_time"),
            error_message=result.get("error_message"),
        )
    except Exception as e:
        logger.error(f"キャッシュデータ読み出しエラー: {e}")
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/status/{session_id}", response_model=SessionStatusResponse)
async def get_session_status_endpoint(session_id: str, streaming_state_service: StreamingStateServiceDep):
    state = streaming_state_service.get_state(session_id)
    if not state:
        raise HTTPException(status_code=404, detail="セッションが見つかりません")
    progress = (state["processed_count"] / state["total_count"]) * 100 if state["total_count"] > 0 else 0
    return SessionStatusResponse(
        session_id=state["session_id"],
        status=state["status"],
        total_count=state["total_count"],
        processed_count=state["processed_count"],
        progress_percentage=progress,
        is_complete=state["status"] == "completed",
        error_message=state.get("error_message"),
    )


@router.post("/cancel", response_model=CancelResponse)
async def cancel_streaming_endpoint(request: CancelRequest, streaming_state_service: StreamingStateServiceDep, hybrid_sql_service: HybridSQLServiceDep):
    success = streaming_state_service.cancel_streaming(request.session_id)
    if success:
        maybe = hybrid_sql_service.cleanup_session(request.session_id)
        if inspect.isawaitable(maybe):
            await maybe
        return CancelResponse(success=True, message="ストリーミングをキャンセルしました")
    return CancelResponse(success=False, error_message="キャンセルできませんでした")


@router.delete("/session/{session_id}")
async def cleanup_session_endpoint(session_id: str, hybrid_sql_service: HybridSQLServiceDep, session_service: SessionServiceDep, streaming_state_service: StreamingStateServiceDep):
    hybrid_sql_service.cleanup_session(session_id)
    session_service.cleanup_session(session_id)
    streaming_state_service.cleanup_state(session_id)
    return {"message": "セッションをクリーンアップしました"}


@router.delete("/user/{user_id}")
async def cleanup_user_cache_endpoint(user_id: str, hybrid_sql_service: HybridSQLServiceDep, session_service: SessionServiceDep, streaming_state_service: StreamingStateServiceDep):
    try:
        try:
            hybrid_sql_service.cleanup_user_sessions(user_id)
        except Exception as e:
            logger.error(f"HybridSQLService クリーンアップエラー: {e}")
        try:
            session_service.cleanup_user_sessions(user_id)
        except Exception as e:
            logger.error(f"SessionService クリーンアップエラー: {e}")
        try:
            streaming_state_service.cleanup_user_states(user_id)
        except Exception as e:
            logger.error(f"StreamingStateService クリーンアップエラー: {e}")
        return {"message": f"ユーザー {user_id} の全キャッシュをクリーンアップしました"}
    except Exception as e:
        logger.error(f"ユーザーキャッシュクリーンアップエラー: {e}")
        return {"message": "キャッシュクリーンアップを試行しました"}


@router.delete("/current-user")
async def cleanup_current_user_cache_endpoint(current_user: CurrentUserDep, hybrid_sql_service: HybridSQLServiceDep, session_service: SessionServiceDep, streaming_state_service: StreamingStateServiceDep):
    user_id = current_user["user_id"]
    try:
        try:
            hybrid_sql_service.cleanup_user_sessions(user_id)
        except Exception as e:
            logger.error(f"HybridSQLService クリーンアップエラー: {e}")
        try:
            session_service.cleanup_user_sessions(user_id)
        except Exception as e:
            logger.error(f"SessionService クリーンアップエラー: {e}")
        try:
            streaming_state_service.cleanup_user_states(user_id)
        except Exception as e:
            logger.error(f"StreamingStateService クリーンアップエラー: {e}")
        return {"message": f"ユーザー {user_id} の全キャッシュをクリーンアップしました"}
    except Exception as e:
        logger.error(f"現在のユーザーキャッシュクリーンアップエラー: {e}")
        return {"message": "キャッシュクリーンアップを試行しました"}


@router.post("/download/csv")
async def download_cached_csv_endpoint(request: CacheReadRequest = Body(...), hybrid_sql_service: HybridSQLServiceDep = None):
    if not request.session_id:
        raise HTTPException(status_code=400, detail="session_idが必要です")
    try:
        result = hybrid_sql_service.get_cached_data(
            request.session_id,
            page=1,
            page_size=1000000,
            filters=request.filters,
            sort_by=request.sort_by,
            sort_order=request.sort_order,
        )
        result = await result if inspect.isawaitable(result) else result
    except Exception as e:
        logger.error(f"キャッシュCSVダウンロード用データ取得エラー: {e}")
        raise HTTPException(status_code=500, detail=f"CSVダウンロードに失敗しました: {str(e)}")
    if not result["success"] or not result["data"] or not result["columns"]:
        raise HTTPException(status_code=404, detail="CSVダウンロードに失敗しました: データが見つかりません")
    output = io.StringIO(); writer = csv.writer(output)
    writer.writerow(result["columns"])  # header
    for row in result["data"]:
        writer.writerow(row)
    csv_content = output.getvalue(); output.close()
    filename = f"query_result_{datetime.now().strftime('%Y%m%d_%H%M%S')}.csv"
    return StreamingResponse(io.StringIO(csv_content), media_type="text/csv; charset=utf-8", headers={"Content-Disposition": f"attachment; filename={filename}"})


@router.post("/unique-values", response_model=CacheUniqueValuesResponse)
async def get_cache_unique_values(request: CacheUniqueValuesRequest, hybrid_sql_service: HybridSQLServiceDep):
    try:
        result = hybrid_sql_service.get_unique_values(request.session_id, request.column_name, request.limit, request.filters)
        return CacheUniqueValuesResponse(values=result["values"], total_count=result["total_count"], is_truncated=result["is_truncated"])
    except Exception as e:
        logger.error(f"キャッシュユニーク値取得エラー: {e}")
        raise HTTPException(status_code=500, detail=f"ユニーク値の取得に失敗しました: {str(e)}")
