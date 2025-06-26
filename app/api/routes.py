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
    SQLFormatRequest, SQLFormatResponse, SchemaInfo, TableInfo, ColumnInfo,
    TableDetailInfo, SchemaListResponse, TableListResponse, DownloadRequest,
    DownloadResponse, DownloadStatusResponse, HealthCheckResponse,
    PerformanceMetricsResponse, ExportRequest, ExportResponse, ExportHistoryResponse,
    WarehouseInfo, DatabaseInfo, ConnectionStatusResponse
)
from app.sql_validator import validate_sql, format_sql
from app.logger import get_logger, log_execution_time, get_performance_metrics
from app.config_simplified import get_settings
from app import __version__
from app.dependencies import (
    SQLServiceDep, MetadataServiceDep, PerformanceServiceDep, ExportServiceDep,
    SQLValidatorDep, ConnectionManagerDep
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
    return {"message": "Snowsight風SQL Webアプリ", "version": "1.3.0"}


@router.get("/favicon.ico")
async def favicon():
    """Faviconエンドポイント"""
    from fastapi.responses import Response
    return Response(status_code=204)  # No Content


@router.get("/.well-known/appspecific/com.chrome.devtools.json")
async def chrome_devtools():
    """Chrome DevToolsエンドポイント"""
    from fastapi.responses import Response
    return Response(status_code=204)  # No Content


@router.get("/health", response_model=HealthCheckResponse)
async def health_check(
    sql_service: SQLServiceDep,
    performance_service: PerformanceServiceDep
):
    """ヘルスチェックエンドポイント"""
    logger.info("ヘルスチェック要求")
    
    # 接続状態を確認
    connection_status = sql_service.get_connection_status()
    
    # パフォーマンスメトリクスを取得
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
async def execute_sql_endpoint(
    request: SQLRequest,
    sql_service: SQLServiceDep
):
    """SQL実行エンドポイント"""
    logger.info("SQL実行要求", sql=request.sql, limit=request.limit)
    
    if not request.sql:
        raise SQLExecutionError("SQLクエリが必要です。")

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
    
    if not result.success:
        raise SQLExecutionError(result.error_message)
    
    return response


@router.post("/sql/validate", response_model=SQLValidationResponse)
async def validate_sql_endpoint(
    request: SQLValidationRequest,
    sql_validator: SQLValidatorDep
):
    """SQL検証エンドポイント"""
    logger.info("SQL検証要求", sql=request.sql)
    
    if not request.sql:
        raise SQLValidationError("SQLクエリが必要です。")

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
async def format_sql_endpoint(
    request: SQLFormatRequest,
    sql_validator: SQLValidatorDep
):
    """SQLフォーマットエンドポイント"""
    logger.info("SQLフォーマット要求", sql=request.sql)
    
    if not request.sql:
        raise SQLValidationError("SQLクエリが必要です。")

    result = await run_in_threadpool(sql_validator.format_sql, request.sql)
    
    # resultが文字列の場合（format_sqlメソッドの戻り値）
    if isinstance(result, str):
        response = SQLFormatResponse(
            formatted_sql=result,
            success=True,
            error_message=None
        )
    else:
        # resultがValidationResultの場合
        response = SQLFormatResponse(
            formatted_sql=result.formatted_sql,
            success=result.success,
            error_message=result.error_message
        )
    
    if response.success:
        logger.info("SQLフォーマット成功")
    else:
        logger.error("SQLフォーマット失敗", error=response.error_message)
        raise SQLValidationError(response.error_message)
    
    return response


@router.get("/metadata/all", response_model=List[Dict[str, Any]])
@log_execution_time("get_all_metadata")
async def get_all_metadata_endpoint(metadata_service: MetadataServiceDep):
    """全てのメタデータを取得（キャッシュ利用）"""
    logger.info("全メタデータ取得要求（キャッシュ利用）")
    all_metadata = await run_in_threadpool(metadata_service.get_all_metadata)
    return all_metadata


@router.get("/metadata/initial", response_model=List[Dict[str, Any]])
@log_execution_time("get_initial_metadata")
async def get_initial_metadata_endpoint(metadata_service: MetadataServiceDep):
    """
    キャッシュからスキーマ、テーブル、カラム情報を取得する。
    バックグラウンドでの更新は行わない。
    """
    logger.info("初期メタデータ取得要求（キャッシュのみ）")
    
    # キャッシュからスキーマ、テーブル、カラムの情報を取得
    all_metadata = await run_in_threadpool(metadata_service.get_all_metadata)
    
    return all_metadata


@router.post("/metadata/refresh", response_model=List[Dict[str, Any]])
@log_execution_time("refresh_all_metadata")
async def refresh_all_metadata_endpoint(metadata_service: MetadataServiceDep):
    """メタデータを強制更新（直接Snowflakeから取得）"""
    logger.info("メタデータ強制更新要求")
    
    # 直接Snowflakeから取得してキャッシュを更新
    await run_in_threadpool(metadata_service.refresh_full_metadata_cache)
    
    # 更新されたキャッシュから全データを返す
    all_metadata = await run_in_threadpool(metadata_service.get_all_metadata)
    return all_metadata


@router.get("/connection/status", response_model=ConnectionStatusResponse)
async def get_connection_status_endpoint(sql_service: SQLServiceDep):
    """接続状態を取得"""
    logger.info("接続状態確認要求")
    
    connection_status = sql_service.get_connection_status()
    
    response = ConnectionStatusResponse(
        connected=connection_status.get('is_connected', False),
        detail=connection_status
    )
    
    return response


@router.get("/performance/metrics", response_model=PerformanceMetricsResponse)
async def get_performance_metrics_route(performance_service: PerformanceServiceDep):
    """パフォーマンスメトリクスを取得"""
    logger.info("パフォーマンスメトリクス取得要求")
    
    metrics = performance_service.get_metrics()
    
    response = PerformanceMetricsResponse(
        timestamp=time.time(),
        metrics=metrics
    )
    
    return response


@router.post("/export")
@log_execution_time("export")
def export_data_endpoint(request: ExportRequest, export_service: ExportServiceDep):
    """データエクスポートエンドポイント"""
    logger.info("データエクスポート要求", sql=request.sql)
    
    if not request.sql:
        raise ExportError("SQLクエリが必要です。")
    
    # エラーハンドリングのため、まずストリームをテスト
    try:
        # 最初のチャンクを取得してエラーをチェック
        stream = export_service.export_to_csv_stream(request.sql)
        first_chunk = next(stream, None)
        
        def stream_generator():
            # BOM (Byte Order Mark) を最初に一度だけ送信
            yield '\ufeff'.encode('utf-8')
            
            # 最初のチャンクを返す
            if first_chunk:
                yield first_chunk
            
            # 残りのチャンクをストリーミング
            for chunk in stream:
                yield chunk
        
        filename = f"export_{datetime.now().strftime('%Y%m%d_%H%M%S')}.csv"
        
        return StreamingResponse(
            stream_generator(),
            media_type="text/csv; charset=utf-8",
            headers={"Content-Disposition": f"attachment; filename={filename}"}
        )
        
    except Exception as e:
        # エラーが発生した場合は例外を再発生
        raise ExportError(f"エクスポートに失敗しました: {str(e)}")


@router.get("/metadata/schemas", response_model=List[Dict[str, Any]])
async def get_schemas_endpoint(metadata_service: MetadataServiceDep):
    """スキーマ一覧を取得"""
    return await run_in_threadpool(metadata_service.get_schemas)


@router.get("/metadata/schemas/{schema_name}/tables", response_model=List[Dict[str, Any]])
async def get_tables_endpoint(schema_name: str, metadata_service: MetadataServiceDep):
    """テーブル一覧を取得"""
    return await run_in_threadpool(metadata_service.get_tables, schema_name)


@router.get("/metadata/schemas/{schema_name}/tables/{table_name}/columns", response_model=List[Dict[str, Any]])
async def get_columns_endpoint(schema_name: str, table_name: str, metadata_service: MetadataServiceDep):
    """カラム一覧を取得"""
    return await run_in_threadpool(metadata_service.get_columns, schema_name, table_name)


@router.post("/metadata/refresh-cache")
@log_execution_time("refresh_all_metadata_normalized")
async def refresh_all_metadata_normalized_endpoint(metadata_service: MetadataServiceDep):
    """メタデータキャッシュを更新（正規化版）"""
    logger.info("メタデータキャッシュ更新要求")
    await run_in_threadpool(metadata_service.refresh_full_metadata_cache)
    return {"message": "メタデータキャッシュが更新されました"}


@router.delete("/metadata/cache")
async def clear_cache_endpoint(metadata_service: MetadataServiceDep):
    """メタデータキャッシュをクリア"""
    logger.info("メタデータキャッシュクリア要求")
    await run_in_threadpool(metadata_service.clear_cache)
    return {"message": "メタデータキャッシュがクリアされました"} 