# -*- coding: utf-8 -*-
"""
APIルート定義
FastAPIのエンドポイント定義
"""
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from fastapi.responses import JSONResponse, FileResponse, HTMLResponse, StreamingResponse
from fastapi.concurrency import run_in_threadpool
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from typing import List, Dict, Any, Optional
import time
import asyncio
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime
import httpx
import csv
import io


from app.api.models import (
    SQLRequest, SQLResponse, SQLValidationRequest, SQLValidationResponse,
    SQLFormatRequest, SQLFormatResponse, HealthCheckResponse, ErrorResponse,
    PerformanceMetricsResponse, ExportRequest, ExportResponse, ExportHistoryResponse,
    ConnectionStatusResponse
)
from app.sql_validator import validate_sql, format_sql
from app.logger import get_logger, log_execution_time, get_performance_metrics
from app.config_simplified import get_settings
from app import __version__
from app.container import (
    get_sql_validator, get_sql_service, get_metadata_service,
    get_performance_service, get_export_service, get_app_logger
)
from app.exceptions import ExportError, SQLValidationError, SQLExecutionError, MetadataError
from app.services.database_service import DatabaseService
from app.services.metadata_service import MetadataService
from app.services.export_service import ExportService
from app.services.performance_service import PerformanceService
from app.services.sql_service import SQLService
from app.logger import Logger

# グローバルなThreadPoolExecutorを作成
thread_pool = ThreadPoolExecutor(max_workers=4)

def run_in_threadpool(func, *args, **kwargs):
    """関数をスレッドプールで実行"""
    loop = asyncio.get_event_loop()
    return loop.run_in_executor(thread_pool, func, *args, **kwargs)

# ルーター作成
router = APIRouter(tags=["API"])
logger = Logger(__name__)


@router.get("/", response_model=Dict[str, str])
async def root():
    """ルートエンドポイント"""
    return {"message": "Snowsight風SQL Webアプリ API", "version": "1.0.0"}


@router.get("/health", response_model=HealthCheckResponse)
async def health_check():
    """ヘルスチェックエンドポイント"""
    logger.info("ヘルスチェック要求")
    
    # 接続状態を確認
    sql_service = get_sql_service()
    connection_status = sql_service.get_connection_status()
    
    # パフォーマンスメトリクスを取得
    performance_service = get_performance_service()
    metrics = performance_service.get_metrics()
    
    response = HealthCheckResponse(
        status="healthy",
        version=__version__,
        timestamp=time.time(),
        connection_status=connection_status,
        performance_metrics=metrics
    )
    
    return response


@router.post("/sql/execute", response_model=SQLResponse)
@log_execution_time("sql_execute")
async def execute_sql_endpoint(request: SQLRequest):
    """SQL実行エンドポイント"""
    logger.info("SQL実行要求", sql=request.sql, limit=request.limit)
    
    if not request.sql:
        raise SQLExecutionError("SQLクエリが必要です。")

    sql_service = get_sql_service()
    result = await run_in_threadpool(
        sql_service.execute_sql,
        request.sql,
        request.limit
    )
    
    response = SQLResponse(
        success=result.success,
        data=result.data,
        columns=result.columns,
        row_count=result.row_count,
        execution_time=result.execution_time,
        error_message=result.error_message,
        sql=result.sql
    )
    
    if result.success:
        logger.info("SQL実行成功", 
                   row_count=result.row_count,
                   execution_time=result.execution_time)
    else:
        logger.error("SQL実行失敗", 
                    error=result.error_message,
                    execution_time=result.execution_time)
        raise SQLExecutionError(result.error_message)
    
    return response


@router.post("/sql/validate", response_model=SQLValidationResponse)
async def validate_sql_endpoint(request: SQLValidationRequest):
    """SQL検証エンドポイント"""
    logger.info("SQL検証要求", sql=request.sql)
    
    if not request.sql:
        raise SQLValidationError("SQLクエリが必要です。")

    sql_validator = get_sql_validator()
    result = await run_in_threadpool(sql_validator.validate_sql, request.sql)
    
    response = SQLValidationResponse(
        is_valid=result.is_valid,
        errors=result.errors,
        warnings=result.warnings,
        suggestions=result.suggestions
    )
    
    if result.is_valid:
        logger.info("SQL検証成功")
    else:
        logger.warning("SQL検証失敗", errors=result.errors)
    
    return response


@router.post("/sql/format", response_model=SQLFormatResponse)
async def format_sql_endpoint(request: SQLFormatRequest):
    """SQLフォーマットエンドポイント"""
    logger.info("SQLフォーマット要求", sql=request.sql)
    
    if not request.sql:
        raise SQLValidationError("SQLクエリが必要です。")

    sql_validator = get_sql_validator()
    result = await run_in_threadpool(sql_validator.format_sql, request.sql)
    
    response = SQLFormatResponse(
        formatted_sql=result.formatted_sql,
        success=result.success,
        error_message=result.error_message
    )
    
    if result.success:
        logger.info("SQLフォーマット成功")
    else:
        logger.error("SQLフォーマット失敗", error=result.error_message)
        raise SQLValidationError(result.error_message)
    
    return response


@router.get("/metadata/all", response_model=List[Dict[str, Any]])
@log_execution_time("get_all_metadata")
async def get_all_metadata_endpoint():
    """全てのメタデータを取得（キャッシュ利用）"""
    logger.info("全メタデータ取得要求（キャッシュ利用）")
    metadata_service = get_metadata_service()
    all_metadata = await run_in_threadpool(metadata_service.get_all_metadata)
    return all_metadata


@router.get("/metadata/initial", response_model=List[Dict[str, Any]])
@log_execution_time("get_initial_metadata")
async def get_initial_metadata_endpoint(background_tasks: BackgroundTasks):
    """
    高速化のため、まずスキーマとテーブル情報のみを返す。
    その後、バックグラウンドで全メタデータ（カラム含む）のキャッシュを更新する。
    """
    logger.info("初期メタデータ取得要求（スキーマ＆テーブルのみ）")
    metadata_service = get_metadata_service()
    
    # 1. まずスキーマとテーブルの情報だけを取得して即座に返す
    schemas_and_tables = await run_in_threadpool(metadata_service.get_schemas_and_tables)
    
    # 2. 重い処理（全データ取得とキャッシュ作成）をバックグラウンドタスクとして登録
    background_tasks.add_task(metadata_service.refresh_full_metadata_cache)
    
    return schemas_and_tables


@router.post("/metadata/refresh", response_model=List[Dict[str, Any]])
@log_execution_time("refresh_all_metadata")
async def refresh_all_metadata_endpoint():
    """メタデータを強制更新"""
    logger.info("メタデータ強制更新要求")
    metadata_service = get_metadata_service()
    all_metadata = await run_in_threadpool(metadata_service.get_all_metadata)
    return all_metadata


@router.get("/connection/status", response_model=ConnectionStatusResponse)
async def get_connection_status_endpoint():
    """接続状態を取得"""
    logger.info("接続状態確認要求")
    
    sql_service = get_sql_service()
    connection_status = sql_service.get_connection_status()
    
    response = ConnectionStatusResponse(
        connected=connection_status.get('is_connected', False),
        details=connection_status
    )
    
    return response


@router.get("/performance/metrics", response_model=PerformanceMetricsResponse)
async def get_performance_metrics_route():
    """パフォーマンスメトリクスを取得"""
    logger.info("パフォーマンスメトリクス取得要求")
    
    performance_service = get_performance_service()
    metrics = performance_service.get_metrics()
    
    response = PerformanceMetricsResponse(
        timestamp=time.time(),
        metrics=metrics
    )
    
    return response


@router.post("/export")
@log_execution_time("export")
def export_data_endpoint(request: ExportRequest):
    """データエクスポートエンドポイント"""
    logger.info("データエクスポート要求", sql=request.sql)
    
    if not request.sql:
        raise ExportError("SQLクエリが必要です。")
    
    export_service = get_export_service()
    
    def stream_generator():
        # BOM (Byte Order Mark) を最初に一度だけ送信
        yield '\ufeff'.encode('utf-8')
        
        # CSVデータをストリーミング
        for chunk in export_service.export_to_csv_stream(request.sql):
            yield chunk
    
    filename = f"export_{datetime.now().strftime('%Y%m%d_%H%M%S')}.csv"
    
    return StreamingResponse(
        stream_generator(),
        media_type="text/csv; charset=utf-8",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )


@router.get("/metadata/schemas", response_model=List[Dict[str, Any]])
async def get_schemas_endpoint():
    """スキーマ一覧を取得"""
    metadata_service = get_metadata_service()
    return await run_in_threadpool(metadata_service.get_schemas)


@router.get("/metadata/schemas/{schema_name}/tables", response_model=List[Dict[str, Any]])
async def get_tables_endpoint(schema_name: str):
    """テーブル一覧を取得"""
    metadata_service = get_metadata_service()
    return await run_in_threadpool(metadata_service.get_tables, schema_name)


@router.get("/metadata/schemas/{schema_name}/tables/{table_name}/columns", response_model=List[Dict[str, Any]])
async def get_columns_endpoint(schema_name: str, table_name: str):
    """カラム一覧を取得"""
    metadata_service = get_metadata_service()
    return await run_in_threadpool(metadata_service.get_columns, schema_name, table_name)


@router.post("/metadata/refresh-cache")
@log_execution_time("refresh_all_metadata_normalized")
async def refresh_all_metadata_normalized_endpoint():
    """メタデータキャッシュを更新（正規化版）"""
    logger.info("メタデータキャッシュ更新要求（正規化版）")
    metadata_service = get_metadata_service()
    await run_in_threadpool(metadata_service.refresh_full_metadata_cache)
    return {"message": "メタデータキャッシュが更新されました"}


@router.delete("/metadata/cache")
async def clear_cache_endpoint():
    """メタデータキャッシュをクリア"""
    logger.info("メタデータキャッシュクリア要求")
    metadata_service = get_metadata_service()
    await run_in_threadpool(metadata_service.clear_cache)
    return {"message": "メタデータキャッシュがクリアされました"} 