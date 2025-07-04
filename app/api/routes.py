# -*- coding: utf-8 -*-
"""
APIルート定義
FastAPIのエンドポイント定義
"""
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks, Request, status
from fastapi.responses import JSONResponse, FileResponse, HTMLResponse, StreamingResponse, RedirectResponse
from fastapi.concurrency import run_in_threadpool
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from typing import List, Dict, Any, Optional
import time
import asyncio
from datetime import datetime
from concurrent.futures import ThreadPoolExecutor
import httpx
import csv
import io
import os
import json


from app.api.models import (
    SQLRequest, SQLResponse, SQLValidationRequest, SQLValidationResponse,
    SQLFormatRequest, SQLFormatResponse, SQLCompletionRequest, SQLCompletionResponse,
    SchemaInfo, TableInfo, ColumnInfo,
    TableDetailInfo, SchemaListResponse, TableListResponse, DownloadRequest,
    DownloadResponse, DownloadStatusResponse, HealthCheckResponse,
    PerformanceMetricsResponse, ExportRequest, ExportResponse, ExportHistoryResponse,
    WarehouseInfo, DatabaseInfo, ConnectionStatusResponse, UserLoginRequest, UserInfo,
    TemplateRequest, TemplateResponse, UserRefreshResponse, AdminLoginRequest,
    SQLExecutionLog, SQLExecutionLogResponse
)
from app.sql_validator import validate_sql, format_sql
from app.logger import get_logger, log_execution_time, get_performance_metrics
from app.config_simplified import get_settings
from app import __version__
from app.dependencies import (
    SQLServiceDep, MetadataServiceDep, PerformanceServiceDep, ExportServiceDep,
    SQLValidatorDep, ConnectionManagerDep, CompletionServiceDep, CurrentUserDep, CurrentAdminDep, SQLLogServiceDep
)
from app.exceptions import ExportError, SQLValidationError, SQLExecutionError, MetadataError
from app.services.database_service import DatabaseService
from app.services.metadata_service import MetadataService
from app.services.export_service import ExportService
from app.services.performance_service import PerformanceService
from app.services.sql_service import SQLService
from app.services.completion_service import CompletionService
from app.logger import Logger
from app.services.user_service import UserService

# グローバルなThreadPoolExecutorを作成
thread_pool = ThreadPoolExecutor(max_workers=4)

def run_in_threadpool(func, *args, **kwargs):
    """関数をスレッドプールで実行"""
    loop = asyncio.get_event_loop()
    return loop.run_in_executor(thread_pool, func, *args, **kwargs)

# ルーター作成
router = APIRouter(tags=["API"])
logger = Logger(__name__)

TEMPLATES_USER_FILE = os.path.join(os.path.dirname(__file__), '../../templates_user.json')
TEMPLATES_ADMIN_FILE = os.path.join(os.path.dirname(__file__), '../../templates_admin.json')

def load_templates(file_path):
    if os.path.exists(file_path):
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read().strip()
            if content:
                return json.loads(content)
    return []

def save_templates(file_path, templates):
    with open(file_path, 'w', encoding='utf-8') as f:
        json.dump(templates, f, ensure_ascii=False, indent=2)

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
    sql_service: SQLServiceDep,
    current_user: CurrentUserDep,
    sql_log_service: SQLLogServiceDep,
    background_tasks: BackgroundTasks
):
    """SQL実行エンドポイント"""
    logger.info("SQL実行要求", sql=request.sql, limit=request.limit)
    
    if not request.sql:
        raise SQLExecutionError("SQLクエリが必要です。")

    start_time = datetime.now()

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
        background_tasks.add_task(
            sql_log_service.add_log_to_db,
            user_id=current_user["user_id"],
            sql=request.sql,
            execution_time=result.execution_time,
            start_time=start_time
        )
    
    sql_log_service.add_log(
        user_id=current_user["user_id"],
        sql=request.sql,
        execution_time=result.execution_time,
        row_count=result.row_count,
        success=result.success,
        error_message=result.error_message
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
    
    try:
        # エラーハンドリングのため、まずストリームをテスト
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
        logger.error("エクスポートエラー", error=str(e))
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


@router.post("/sql/suggest", response_model=SQLCompletionResponse)
@log_execution_time("sql_suggest")
async def suggest_sql_endpoint(
    request: SQLCompletionRequest,
    completion_service: CompletionServiceDep
):
    """SQL補完候補取得エンドポイント"""
    logger.info("SQL補完候補要求", position=request.position, sql_length=len(request.sql))
    
    if not request.sql:
        raise SQLValidationError("SQLクエリが必要です。")

    result = await run_in_threadpool(
        completion_service.get_completions,
        request.sql,
        request.position,
        request.context
    )
    
    logger.info("SQL補完候補取得完了", suggestion_count=len(result.suggestions))
    
    return result


# 認証API
@router.post("/login")
async def login(request: Request, login_req: UserLoginRequest):
    user_service = UserService()
    user = user_service.authenticate_user(login_req.user_id)
    if user:
        request.session["user"] = user
        return {"message": "ログイン成功", "user": user}
    else:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="ユーザーIDが無効です")

@router.post("/logout")
async def logout(request: Request):
    request.session.clear()
    return {"message": "ログアウトしました"}

@router.get("/users/me", response_model=UserInfo)
async def get_current_user(request: Request):
    user = request.session.get("user")
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="未ログインです")
    return user

# 管理者API
@router.post("/admin/users/refresh", response_model=UserRefreshResponse)
async def refresh_users_from_db(
    request: Request,
    current_admin: CurrentAdminDep,
    connection_manager: ConnectionManagerDep
):
    """HF3IGM01からユーザー情報を取得し、user_data.jsonを更新"""
    user_service = UserService()
    users = user_service.refresh_users_from_db(connection_manager)
    return UserRefreshResponse(
        message="ユーザー情報を更新しました",
        user_count=len(users)
    )

@router.get("/admin/templates", response_model=List[TemplateResponse])
async def get_templates():
    """共通テンプレートを取得（管理者権限不要）"""
    return load_templates(TEMPLATES_ADMIN_FILE)

@router.post("/admin/templates", response_model=TemplateResponse)
async def create_template(request: TemplateRequest, current_admin: CurrentAdminDep):
    import uuid
    from datetime import datetime
    templates = load_templates(TEMPLATES_ADMIN_FILE)
    new_template = {
        "id": str(uuid.uuid4()),
        "name": request.name,
        "sql": request.sql,
        "created_at": datetime.now().isoformat()
    }
    templates.append(new_template)
    save_templates(TEMPLATES_ADMIN_FILE, templates)
    return new_template

@router.delete("/admin/templates/{template_id}")
async def delete_template(template_id: str, current_admin: CurrentAdminDep):
    templates = load_templates(TEMPLATES_ADMIN_FILE)
    templates = [t for t in templates if t["id"] != template_id]
    save_templates(TEMPLATES_ADMIN_FILE, templates)
    return {"message": "テンプレートを削除しました"}

# ユーザーAPI
@router.get("/users/history")
async def get_user_history(
    current_user: CurrentUserDep,
    connection_manager: ConnectionManagerDep
):
    """Log.TOOL_LOGテーブルからログインユーザーの過去半年の実行履歴を取得"""
    # 過去半年の日付を計算
    from datetime import datetime, timedelta
    six_months_ago = datetime.now() - timedelta(days=180)
    date_str = six_months_ago.strftime('%Y%m%d%H%M%S')
    
    sql = f"""
        SELECT MK_DATE, OPTION_NO, SYSTEM_WORKNUMBER
        FROM Log.TOOL_LOG
        WHERE OPE_CODE = '{current_user["user_id"]}'
        AND MK_DATE >= '{date_str}'
        ORDER BY MK_DATE DESC
    """
    
    try:
        result = connection_manager.execute_query(sql)
        return result
    except Exception as e:
        logger.error(f"SQL履歴取得エラー: {e}")
        raise HTTPException(status_code=500, detail="履歴の取得に失敗しました")

@router.get("/users/templates", response_model=List[TemplateResponse])
async def get_user_templates(current_user: CurrentUserDep):
    templates = load_templates(TEMPLATES_USER_FILE)
    user_id = current_user["user_id"]
    user_templates = [t for t in templates if t.get("user_id") == user_id]
    return user_templates

@router.post("/users/templates", response_model=TemplateResponse)
async def create_user_template(request: TemplateRequest, current_user: CurrentUserDep):
    import uuid
    from datetime import datetime
    templates = load_templates(TEMPLATES_USER_FILE)
    new_template = {
        "id": str(uuid.uuid4()),
        "user_id": current_user["user_id"],
        "name": request.name,
        "sql": request.sql,
        "created_at": datetime.now().isoformat()
    }
    templates.append(new_template)
    save_templates(TEMPLATES_USER_FILE, templates)
    return new_template

@router.delete("/users/templates/{template_id}")
async def delete_user_template(template_id: str, current_user: CurrentUserDep):
    templates = load_templates(TEMPLATES_USER_FILE)
    user_id = current_user["user_id"]
    templates = [t for t in templates if not (t["id"] == template_id and t.get("user_id") == user_id)]
    save_templates(TEMPLATES_USER_FILE, templates)
    return {"message": "テンプレートを削除しました"}

# 管理者認証API
@router.post("/admin/login")
async def admin_login(request: Request, admin_req: AdminLoginRequest):
    """管理者認証（パスワード: mono0000）"""
    if admin_req.password == "mono0000":
        # 管理者フラグをセッションに保存
        request.session["is_admin"] = True
        return {"message": "管理者認証成功"}
    else:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="管理者パスワードが無効です")

@router.post("/admin/logout")
async def admin_logout(request: Request):
    """管理者ログアウト"""
    request.session.pop("is_admin", None)
    return {"message": "管理者ログアウトしました"}

# SQL実行ログ関連API
@router.get("/logs/sql", response_model=SQLExecutionLogResponse)
async def get_sql_logs(
    current_user: CurrentUserDep,
    sql_log_service: SQLLogServiceDep,
    limit: int = 50,
    offset: int = 0
):
    """ユーザーのSQL実行ログを取得"""
    result = sql_log_service.get_logs(
        user_id=current_user["user_id"],
        limit=limit,
        offset=offset
    )
    
    logs = [
        SQLExecutionLog(
            log_id=log["log_id"],
            user_id=log["user_id"],
            sql=log["sql"],
            execution_time=log["execution_time"],
            row_count=log["row_count"],
            success=log["success"],
            error_message=log.get("error_message"),
            timestamp=datetime.fromisoformat(log["timestamp"])
        )
        for log in result["logs"]
    ]
    
    return SQLExecutionLogResponse(
        logs=logs,
        total_count=result["total_count"]
    )

@router.get("/admin/logs/sql", response_model=SQLExecutionLogResponse)
async def get_all_sql_logs(
    current_admin: CurrentAdminDep,
    sql_log_service: SQLLogServiceDep,
    limit: int = 100,
    offset: int = 0
):
    """全ユーザーのSQL実行ログを取得（管理者用）"""
    result = sql_log_service.get_logs(
        limit=limit,
        offset=offset
    )
    
    logs = [
        SQLExecutionLog(
            log_id=log["log_id"],
            user_id=log["user_id"],
            sql=log["sql"],
            execution_time=log["execution_time"],
            row_count=log["row_count"],
            success=log["success"],
            error_message=log.get("error_message"),
            timestamp=datetime.fromisoformat(log["timestamp"])
        )
        for log in result["logs"]
    ]
    
    return SQLExecutionLogResponse(
        logs=logs,
        total_count=result["total_count"]
    )

@router.delete("/logs/sql")
async def clear_user_sql_logs(
    current_user: CurrentUserDep,
    sql_log_service: SQLLogServiceDep
):
    """ユーザーのSQL実行ログをクリア"""
    sql_log_service.clear_logs(user_id=current_user["user_id"])
    return {"message": "SQL実行ログをクリアしました"}

@router.delete("/admin/logs/sql")
async def clear_all_sql_logs(
    current_admin: CurrentAdminDep,
    sql_log_service: SQLLogServiceDep
):
    """全SQL実行ログをクリア（管理者用）"""
    sql_log_service.clear_logs()
    return {"message": "全SQL実行ログをクリアしました"} 