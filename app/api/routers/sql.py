# -*- coding: utf-8 -*-
from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from datetime import datetime
import csv
import io

from app.api.models import (
    SQLRequest, SQLResponse, SQLValidationRequest, SQLValidationResponse,
    SQLFormatRequest, SQLFormatResponse, SQLCompletionRequest, SQLCompletionResponse,
    ConnectionStatusResponse
)
from app.dependencies import (
    SQLServiceDep, SQLValidatorDep, CompletionServiceDep,
    CurrentUserDep, SQLLogServiceDep, ConnectionManagerDep, ExportServiceDep
)
from ._helpers import run_in_threadpool
from app.logger import Logger
from app.exceptions import SQLValidationError, SQLExecutionError
from app.config_simplified import get_settings

logger = Logger(__name__)
router = APIRouter(prefix="/sql", tags=["sql"])


@router.post("/execute", response_model=SQLResponse)
async def execute_sql_endpoint(request: SQLRequest, sql_service: SQLServiceDep, current_user: CurrentUserDep, sql_log_service: SQLLogServiceDep):
    if not request.sql:
        raise SQLExecutionError("SQLクエリが無効です")
    start_time = datetime.now()
    result = await run_in_threadpool(sql_service.execute_sql, request.sql, request.limit)
    response = SQLResponse(
        success=result.success,
        data=result.data,
        columns=result.columns,
        row_count=result.row_count,
        execution_time=result.execution_time,
        error_message=result.error_message,
        sql=result.sql,
    )
    await run_in_threadpool(
        sql_log_service.add_log_to_db,
        current_user["user_id"],
        request.sql,
        result.execution_time,
        start_time,
        result.row_count,
        result.success,
        result.error_message,
    )
    return response


@router.post("/validate", response_model=SQLValidationResponse)
async def validate_sql_endpoint(request: SQLValidationRequest, sql_service: SQLServiceDep):
    if not request.sql:
        raise SQLValidationError("SQLクエリが無効です")
    result = await run_in_threadpool(sql_service.validate_sql, request.sql)
    return SQLValidationResponse(
        is_valid=result.is_valid,
        errors=result.errors,
        warnings=result.warnings,
        suggestions=result.suggestions,
    )


@router.post("/format", response_model=SQLFormatResponse)
async def format_sql_endpoint(request: SQLFormatRequest, sql_validator: SQLValidatorDep):
    if not request.sql:
        raise SQLValidationError("SQLクエリが無効です")
    result = await run_in_threadpool(sql_validator.format_sql, request.sql)
    if isinstance(result, str):
        return SQLFormatResponse(formatted_sql=result, success=True, error_message=None)
    return SQLFormatResponse(formatted_sql=result.formatted_sql, success=result.success, error_message=result.error_message)


@router.post("/suggest", response_model=SQLCompletionResponse)
async def suggest_sql_endpoint(request: SQLCompletionRequest, completion_service: CompletionServiceDep):
    if not request.sql:
        raise HTTPException(status_code=400, detail="SQLクエリが空です")
    try:
        return await run_in_threadpool(completion_service.get_completions, request.sql, request.position, request.context)
    except Exception as e:
        logger.error(f"SQL補完候補取得エラー: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/connection/status", response_model=ConnectionStatusResponse)
async def get_connection_status_endpoint(sql_service: SQLServiceDep):
    status = sql_service.get_connection_status()
    return ConnectionStatusResponse(connected=status.get("is_connected", False), detail=status)


@router.post("/export")
async def export_data_endpoint(request: SQLRequest, export_service: ExportServiceDep):
    if not request.sql:
        raise HTTPException(status_code=400, detail="SQLクエリが空です、エクスポートできません")
    try:
        stream = export_service.export_to_csv_stream(request.sql)
        first_chunk = next(stream, None)

        def stream_generator():
            yield '\ufeff'.encode('utf-8')
            if first_chunk:
                yield first_chunk
            for chunk in stream:
                yield chunk

        filename = f"export_{datetime.now().strftime('%Y%m%d_%H%M%S')}.csv"
        return StreamingResponse(stream_generator(), media_type="text/csv; charset=utf-8", headers={"Content-Disposition": f"attachment; filename={filename}"})
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"エクスポートに失敗しました: {str(e)}")


@router.post("/download/csv")
async def download_csv_endpoint(request: SQLRequest, connection_manager: ConnectionManagerDep, current_user: CurrentUserDep):
    if not request.sql:
        raise HTTPException(status_code=400, detail="SQLクエリが無効です")
    count_sql = f"SELECT COUNT(*) FROM ({request.sql}) as count_query"
    conn_id, connection = connection_manager.get_connection()
    cursor = connection.cursor()
    try:
        cursor.execute(count_sql)
        result = cursor.fetchone()
        total_count = result[0] if result else 0
    except Exception as e:
        # 統一エラーレスポンス（500）
        raise HTTPException(status_code=500, detail=f"CSVダウンロードに失敗しました: {str(e)}")
    settings = get_settings()
    if total_count > settings.max_records_for_csv_download:
        raise HTTPException(status_code=400, detail=f"データが大きすぎます（{total_count:,}件）。クエリを制限してから再実行してください。")
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    filename = f"query_result_{timestamp}.csv"
    try:
        cursor.execute(request.sql)
        columns = [c[0] for c in cursor.description]
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"CSVダウンロードに失敗しました: {str(e)}")

    def csv_stream_generator():
        try:
            output = io.StringIO()
            writer = csv.writer(output)
            writer.writerow(columns)
            yield output.getvalue(); output.seek(0); output.truncate()
            chunk_size = 1000
            processed_rows = 0
            while True:
                chunk = cursor.fetchmany(chunk_size)
                if not chunk:
                    break
                for row in chunk:
                    writer.writerow(row); processed_rows += 1
                yield output.getvalue(); output.seek(0); output.truncate()
            logger.info(f"CSVダウンロード完了: {processed_rows}件, ユーザー: {current_user['user_id']}")
        finally:
            if 'conn_id' in locals() and conn_id:
                connection_manager.release_connection(conn_id)

    return StreamingResponse(csv_stream_generator(), media_type="text/csv; charset=utf-8", headers={"Content-Disposition": f"attachment; filename={filename}"})
