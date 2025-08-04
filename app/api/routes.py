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
from datetime import datetime, timedelta
from concurrent.futures import ThreadPoolExecutor
import httpx
import csv
import io
import os

from app.api.models import (
    SQLRequest, SQLResponse, SQLValidationRequest, SQLValidationResponse,
    SQLFormatRequest, SQLFormatResponse, SQLCompletionRequest, SQLCompletionResponse,
    SchemaInfo, TableInfo, ColumnInfo,
    TableDetailInfo, SchemaListResponse, TableListResponse, DownloadRequest,
    DownloadResponse, DownloadStatusResponse, HealthCheckResponse,
    PerformanceMetricsResponse, ExportRequest, ExportResponse, ExportHistoryResponse,
    ConnectionStatusResponse, UserLoginRequest, UserInfo, BusinessUserListResponse, BusinessUserRefreshResponse,
    TemplateRequest, TemplateResponse, PartRequest, PartResponse, UserRefreshResponse, AdminLoginRequest,
    SQLExecutionLog, SQLExecutionLogResponse, SaveVisibilitySettingsRequest,
    UserTemplatePreferencesResponse, UserPartPreferencesResponse,
    UpdateTemplatePreferencesRequest, UpdatePartPreferencesRequest, UpdateTemplateRequest,
    TemplateDropdownResponse, PartDropdownResponse,
    CacheSQLRequest, CacheSQLResponse, CacheReadRequest, CacheReadResponse,
    SessionStatusResponse, CancelRequest, CancelResponse, CacheUniqueValuesRequest, CacheUniqueValuesResponse
)
from app.sql_validator import validate_sql, format_sql
from app.logger import get_logger, log_execution_time, get_performance_metrics
from app.config_simplified import get_settings
from app import __version__
from app.dependencies import (
    SQLServiceDep, MetadataServiceDep, PerformanceServiceDep, ExportServiceDep,
    SQLValidatorDep, ConnectionManagerDep, CompletionServiceDep, CurrentUserDep, CurrentAdminDep, SQLLogServiceDep,
    UserServiceDep, TemplateServiceDep, PartServiceDep, AdminServiceDep, VisibilityControlServiceDep,
    UserPreferenceServiceDep, HybridSQLServiceDep, SessionServiceDep, StreamingStateServiceDep
)
from app.exceptions import ExportError, SQLValidationError, SQLExecutionError, MetadataError
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
    """関数をスレッドプールで実行するヘルパー関数"""
    loop = asyncio.get_event_loop()
    return loop.run_in_executor(thread_pool, func, *args, **kwargs)

# ルーター 
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
    sql_service: SQLServiceDep,
    current_user: CurrentUserDep,
    sql_log_service: SQLLogServiceDep,
    background_tasks: BackgroundTasks
):
    """SQL実行エンドポイント"""
    logger.info(f"SQL実行要求, sql={request.sql}, limit={request.limit}")

    if not request.sql:
        raise SQLExecutionError("SQLクエリが無効です")

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
    
    background_tasks.add_task(
        sql_log_service.add_log_to_db,
        user_id=current_user["user_id"],
        sql=request.sql,
        execution_time=result.execution_time,
        start_time=start_time,
        row_count=result.row_count,
        success=result.success,
        error_message=result.error_message
    )
    
    return response


@router.post("/sql/validate", response_model=SQLValidationResponse)
async def validate_sql_endpoint(
    request: SQLValidationRequest,
    sql_validator: SQLValidatorDep
):
    """SQL検証エンドポイント"""
    logger.info(f"SQL検証, sql={request.sql}")

    if not request.sql:
        raise SQLValidationError("SQLクエリが無効です")

    result = await run_in_threadpool(sql_validator.validate_sql, request.sql)
    
    response = SQLValidationResponse(
        is_valid=result.is_valid,
        errors=result.errors,
        warnings=result.warnings,
        suggestions=result.suggestions
    )
    
    if response.is_valid:
        logger.info("SQL検証成功")
    else:
        logger.warning(f"SQL検証失敗, errors={result.errors}")

    return response


@router.post("/sql/format", response_model=SQLFormatResponse)
async def format_sql_endpoint(
    request: SQLFormatRequest,
    sql_validator: SQLValidatorDep
):
    """SQLフォーマットエンドポイント"""
    logger.info(f"SQLフォーマット, sql={request.sql}")

    if not request.sql:
        raise SQLValidationError("SQLクエリが無効です")

    result = await run_in_threadpool(sql_validator.format_sql, request.sql)

    # resultが文字列の場合（format_sqlメソッドの戻り値は文字列）
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
        logger.error(f"SQLフォーマット失敗 {response.error_message}")
        raise SQLValidationError(response.error_message)
    
    return response


# 認証API
@router.post("/login")
async def login(request: Request, login_req: UserLoginRequest, user_service: UserServiceDep):
    """ユーザー認証"""
    logger.info(f"ログイン要求: {login_req.user_id}")
    
    user = await run_in_threadpool(user_service.authenticate_user, login_req.user_id)
    if user:
        request.session["user"] = user
        logger.info(f"ログイン成功: {user['user_id']}, セッションキー: {list(request.session.keys())}")
        
        # SessionMiddlewareに完全に任せる
        return {"message": "ログイン成功", "user": user}
    else:
        logger.warning(f"ログイン失敗: {login_req.user_id}")
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="ユーザーIDが無効です")

# キャッシュクリア用のヘルパー関数を定義
def cleanup_user_cache_task(
    user_id: str, 
    hybrid_sql_service: HybridSQLServiceDep, 
    session_service: SessionServiceDep, 
    streaming_state_service: StreamingStateServiceDep
):
    """バックグラウンドでユーザーのキャッシュをクリーンアップするタスク"""
    logger.info(f"バックグラウンドでユーザーキャッシュをクリーンアップ: user_id={user_id}")
    try:
        if hybrid_sql_service:
            hybrid_sql_service.cleanup_user_sessions(user_id)
        if session_service:
            session_service.cleanup_user_sessions(user_id)
        if streaming_state_service:
            streaming_state_service.cleanup_user_states(user_id)
        logger.info(f"バックグラウンドキャッシュクリーンアップ完了: user_id={user_id}")
    except Exception as e:
        logger.error(f"バックグラウンドキャッシュクリーンアップ中にエラーが発生: {e}", exc_info=True)


@router.post("/logout")
async def logout(request: Request):
    user = request.session.get("user")
    request.session.clear()
    logger.info(f"セッションをクリアしました。ユーザー: {user.get('user_id') if user else '不明'}")
    return {"message": "ログアウトしました"}

@router.get("/users/me", response_model=UserInfo)
async def get_current_user_info(current_user: CurrentUserDep):
    """認証済みユーザーの情報を取得"""
    return current_user

@router.get("/debug/session")
async def debug_session(request: Request):
    """デバッグ: セッション情報を確認"""
    session_data = dict(request.session)
    return {
        "session_keys": list(request.session.keys()),
        "session_data": session_data,
        "has_user": "user" in request.session
    }


# 管理者認証API
@router.post("/admin/login")
async def admin_login(request: Request, admin_req: AdminLoginRequest):
    """管理者認証"""
    settings = get_settings()
    if admin_req.password == settings.admin_password:
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


# 管理者API
@router.post("/admin/system/refresh", response_model=UserRefreshResponse)
async def refresh_system_data(
    current_admin: CurrentAdminDep,
    admin_service: AdminServiceDep,
    connection_manager: ConnectionManagerDep
):
    """管理者: ユーザー情報とDBメタデータのキャッシュを更新"""
    logger.info("管理者によるシステムキャッシュ更新要求")

    try:
        result = await run_in_threadpool(
            admin_service.refresh_all_system_data,
            connection_manager
        )
        # レスポンスモデルを流用するが、メッセージは動的に設定
        return UserRefreshResponse(
            message=result["message"],
            user_count=result["user_count"]
        )
    except Exception as e:
        logger.error(f"システムキャッシュ更新エラー: {e}")
        raise HTTPException(status_code=500, detail=f"システムキャッシュの更新に失敗しました: {str(e)}")


@router.get("/admin/templates", response_model=List[TemplateResponse])
async def get_admin_templates(template_service: TemplateServiceDep):
    """管理者: テンプレート一覧を取得"""
    return await run_in_threadpool(template_service.get_admin_templates)

@router.post("/admin/templates", response_model=TemplateResponse)
async def create_admin_template(request: TemplateRequest, current_admin: CurrentAdminDep, template_service: TemplateServiceDep):
    """管理者: テンプレートを作成"""
    return await run_in_threadpool(template_service.create_admin_template, request.name, request.sql)

@router.delete("/admin/templates/{template_id}")
async def delete_admin_template(template_id: str, current_admin: CurrentAdminDep, template_service: TemplateServiceDep):
    """管理者: テンプレートを削除"""
    await run_in_threadpool(template_service.delete_admin_template, template_id)
    return {"message": "テンプレートを削除しました"}


# 管理者パーツAPI
@router.get("/admin/parts", response_model=List[PartResponse])
async def get_admin_parts(part_service: PartServiceDep):
    """管理者: パーツ一覧を取得"""
    return await run_in_threadpool(part_service.get_admin_parts)

@router.post("/admin/parts", response_model=PartResponse)
async def create_admin_part(request: PartRequest, current_admin: CurrentAdminDep, part_service: PartServiceDep):
    """管理者: パーツを作成"""
    return await run_in_threadpool(part_service.create_admin_part, request.name, request.sql)

@router.delete("/admin/parts/{part_id}")
async def delete_admin_part(part_id: str, current_admin: CurrentAdminDep, part_service: PartServiceDep):
    """管理者: パーツを削除"""
    await run_in_threadpool(part_service.delete_admin_part, part_id)
    return {"message": "パーツを削除しました"}


# ユーザーテンプレートAPI
@router.get("/users/templates", response_model=List[TemplateResponse])
async def get_user_templates(current_user: CurrentUserDep, template_service: TemplateServiceDep):
    """ユーザーテンプレート一覧を取得"""
    return await run_in_threadpool(template_service.get_user_templates, current_user["user_id"])

@router.post("/users/templates", response_model=TemplateResponse)
async def create_user_template(request: TemplateRequest, current_user: CurrentUserDep, template_service: TemplateServiceDep):
    """ユーザーテンプレートを作成"""
    return await run_in_threadpool(template_service.create_user_template, current_user["user_id"], request.name, request.sql)

@router.delete("/users/templates/{template_id}")
async def delete_user_template(template_id: str, current_user: CurrentUserDep, template_service: TemplateServiceDep):
    """ユーザーテンプレートを削除"""
    await run_in_threadpool(template_service.delete_user_template, template_id, current_user["user_id"])
    return {"message": "テンプレートを削除しました"}

@router.put("/users/templates/{template_id}")
async def update_user_template(
    template_id: str,
    request: UpdateTemplateRequest,
    current_user: CurrentUserDep,
    template_service: TemplateServiceDep
):
    """ユーザーテンプレートを更新（編集機能用）"""
    updated_template = await run_in_threadpool(
        template_service.update_user_template, 
        template_id,
        current_user["user_id"], 
        request.name, 
        request.sql,
        request.display_order  # 順序を保持
    )
    return {"template": updated_template}


# ユーザーパーツAPI
@router.get("/users/parts", response_model=List[PartResponse])
async def get_user_parts(current_user: CurrentUserDep, part_service: PartServiceDep):
    """ユーザーパーツ一覧を取得"""
    return await run_in_threadpool(part_service.get_user_parts, current_user["user_id"])

@router.post("/users/parts", response_model=PartResponse)
async def create_user_part(request: PartRequest, current_user: CurrentUserDep, part_service: PartServiceDep):
    """ユーザーパーツを作成"""
    return await run_in_threadpool(part_service.create_user_part, current_user["user_id"], request.name, request.sql)

@router.delete("/users/parts/{part_id}")
async def delete_user_part(part_id: str, current_user: CurrentUserDep, part_service: PartServiceDep):
    """ユーザーパーツを削除"""
    await run_in_threadpool(part_service.delete_user_part, current_user["user_id"], part_id)
    return {"message": "パーツを削除しました"}


# ユーザー表示設定API
@router.get("/users/template-preferences", response_model=UserTemplatePreferencesResponse)
async def get_user_template_preferences(
    current_user: CurrentUserDep, 
    user_preference_service: UserPreferenceServiceDep
):
    """ユーザーのテンプレート表示設定（統合リスト）を取得"""
    templates = await run_in_threadpool(
        user_preference_service.get_user_template_preferences, 
        current_user["user_id"]
    )
    return UserTemplatePreferencesResponse(templates=templates)


@router.get("/users/part-preferences", response_model=UserPartPreferencesResponse)
async def get_user_part_preferences(
    current_user: CurrentUserDep, 
    user_preference_service: UserPreferenceServiceDep
):
    """ユーザーのパーツ表示設定（統合リスト）を取得"""
    parts = await run_in_threadpool(
        user_preference_service.get_user_part_preferences, 
        current_user["user_id"]
    )
    return UserPartPreferencesResponse(parts=parts)


@router.put("/users/template-preferences")
async def update_user_template_preferences(
    request: UpdateTemplatePreferencesRequest,
    current_user: CurrentUserDep, 
    user_preference_service: UserPreferenceServiceDep
):
    """ユーザーのテンプレート表示設定を一括更新"""
    preferences = [pref.dict() for pref in request.preferences]
    await run_in_threadpool(
        user_preference_service.update_template_preferences, 
        current_user["user_id"], 
        preferences
    )
    return {"message": "テンプレート表示設定を更新しました"}


@router.put("/users/part-preferences")
async def update_user_part_preferences(
    request: UpdatePartPreferencesRequest,
    current_user: CurrentUserDep, 
    user_preference_service: UserPreferenceServiceDep
):
    """ユーザーのパーツ表示設定を一括更新"""
    preferences = [pref.dict() for pref in request.preferences]
    await run_in_threadpool(
        user_preference_service.update_part_preferences, 
        current_user["user_id"], 
        preferences
    )
    return {"message": "パーツ表示設定を更新しました"}


@router.get("/users/templates-for-dropdown", response_model=List[TemplateDropdownResponse])
async def get_visible_templates_for_dropdown(
    current_user: CurrentUserDep, 
    user_preference_service: UserPreferenceServiceDep
):
    """メイン画面のドロップダウン用・表示設定に基づくテンプレート一覧"""
    templates = await run_in_threadpool(
        user_preference_service.get_visible_templates_for_dropdown, 
        current_user["user_id"]
    )
    return templates


@router.get("/users/parts-for-dropdown", response_model=List[PartDropdownResponse])
async def get_visible_parts_for_dropdown(
    current_user: CurrentUserDep, 
    user_preference_service: UserPreferenceServiceDep
):
    """メイン画面のドロップダウン用・表示設定に基づくパーツ一覧"""
    parts = await run_in_threadpool(
        user_preference_service.get_visible_parts_for_dropdown, 
        current_user["user_id"]
    )
    return parts


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


# 管理者用のAPI（メタデータ・表示設定）
@router.get("/admin/metadata/all-raw", response_model=List[Dict[str, Any]])
async def get_all_metadata_raw_admin_endpoint(
    current_admin: CurrentAdminDep,
    metadata_service: MetadataServiceDep
):
    """全てのメタデータをフィルタリングせずに取得（管理者用）"""
    logger.info("管理者による生メタデータ取得要求")
    all_metadata = await run_in_threadpool(metadata_service.get_all_metadata)
    return all_metadata


@router.get("/admin/visibility-settings")
async def get_visibility_settings(
    current_admin: CurrentAdminDep,
    visibility_service: VisibilityControlServiceDep,
):
    """全ての表示設定を取得します。"""
    settings = await run_in_threadpool(visibility_service.get_all_settings)
    return settings


@router.get("/visibility-settings")
async def get_visibility_settings_for_user(
    current_user: CurrentUserDep,
    visibility_service: VisibilityControlServiceDep,
):
    """ユーザーのロールに基づく表示設定を取得します。"""
    settings = await run_in_threadpool(visibility_service.get_all_settings)
    return settings


@router.post("/admin/visibility-settings")
async def save_visibility_settings(
    request: SaveVisibilitySettingsRequest,
    current_admin: CurrentAdminDep,
    visibility_service: VisibilityControlServiceDep,
):
    """表示設定を保存します。"""
    await run_in_threadpool(visibility_service.save_settings, request.settings)
    return {"message": "表示設定を保存しました。"}


# メタデータ関連API
@router.get("/metadata/all", response_model=List[Dict[str, Any]])
@log_execution_time("get_all_metadata")
async def get_all_metadata_endpoint(
    metadata_service: MetadataServiceDep,
    visibility_service: VisibilityControlServiceDep,
    current_user: CurrentUserDep
):
    """全てのメタデータを取得（キャッシュ・表示制限利用）"""
    logger.info("全メタデータ取得要求（キャッシュ利用）")
    all_metadata = await run_in_threadpool(metadata_service.get_all_metadata)

    # ロールに基づいたフィルタリングする処理を追加
    user_role = current_user.get('role', 'DEFAULT')
    filtered_metadata = await run_in_threadpool(
        visibility_service.filter_metadata,
        all_metadata,
        user_role
    )
    return filtered_metadata


@router.get("/metadata/initial", response_model=List[Dict[str, Any]])
@log_execution_time("get_initial_metadata")
async def get_initial_metadata_endpoint(metadata_service: MetadataServiceDep):
    """
    キャッシュからスキーマ、テーブル、カラムのメタデータを取得する、バックグラウンドでの更新は行わない
    """
    logger.info("初期メタデータ取得要求（キャッシュのみ）")

    # キャッシュからスキーマ、テーブル、カラムのメタデータを取得
    all_metadata = await run_in_threadpool(metadata_service.get_all_metadata)

    return all_metadata


@router.get("/metadata/raw", response_model=List[Dict[str, Any]])
@log_execution_time("get_raw_metadata")
async def get_raw_metadata_endpoint(metadata_service: MetadataServiceDep):
    """
    フィルタリング前の生メタデータを取得する、フロントエンドでフィルタリングを行うために使用
    """
    logger.info("生メタデータ取得要求（フィルタリングなし）")

    # キャッシュからスキーマ、テーブル、カラムのメタデータを取得（フィルタリングなし）
    all_metadata = await run_in_threadpool(metadata_service.get_all_metadata)

    return all_metadata


@router.post("/metadata/refresh", response_model=List[Dict[str, Any]])
@log_execution_time("refresh_all_metadata")
async def refresh_all_metadata_endpoint(metadata_service: MetadataServiceDep):
    """メタデータを強制更新し、直接Snowflakeから取得する"""
    logger.info("メタデータ強制更新要求")

    # 直接Snowflakeから取得してキャッシュを更新
    await run_in_threadpool(metadata_service.refresh_full_metadata_cache)

    # 更新されたキャッシュから全メタデータを返す
    all_metadata = await run_in_threadpool(metadata_service.get_all_metadata)
    return all_metadata


@router.get("/connection/status", response_model=ConnectionStatusResponse)
async def get_connection_status_endpoint(sql_service: SQLServiceDep):
    """接続状態を取得する"""
    logger.info("接続状態確認要求")

    connection_status = sql_service.get_connection_status()
    
    response = ConnectionStatusResponse(
        connected=connection_status.get('is_connected', False),
        detail=connection_status
    )
    
    return response


@router.get("/performance/metrics", response_model=PerformanceMetricsResponse)
async def get_performance_metrics_route(performance_service: PerformanceServiceDep):
    """パフォーマンスメトリクスを取得する"""
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
    """チューニングされたSQLクエリをエクスポートするエンドポイント"""
    logger.info(f"チューニングされたSQLエクスポート要求, sql={request.sql}")

    if not request.sql:
        raise ExportError("SQLクエリが空です、エクスポートできません")

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
        # エラーが発生した場合、例外を再発生
        logger.error(f"エクスポートエラー: {str(e)}")
        raise ExportError(f"エクスポートに失敗しました: {str(e)}")


@router.get("/metadata/schemas", response_model=List[Dict[str, Any]])
async def get_schemas_endpoint(metadata_service: MetadataServiceDep):
    """スキーマ一覧を取得する"""
    return await run_in_threadpool(metadata_service.get_schemas)


@router.get("/metadata/schemas/{schema_name}/tables", response_model=List[Dict[str, Any]])
async def get_tables_endpoint(schema_name: str, metadata_service: MetadataServiceDep):
    """テーブル一覧を取得する"""
    return await run_in_threadpool(metadata_service.get_tables, schema_name)


@router.get("/metadata/schemas/{schema_name}/tables/{table_name}/columns", response_model=List[Dict[str, Any]])
async def get_columns_endpoint(schema_name: str, table_name: str, metadata_service: MetadataServiceDep):
    """カラム一覧を取得する"""
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
    logger.info(f"SQL補完候補要求, position={request.position}, sql_length={len(request.sql)}")

    if not request.sql:
        raise SQLValidationError("SQLクエリが空です、エクスポートできません")

    result = await run_in_threadpool(
        completion_service.get_completions,
        request.sql,
        request.position,
        request.context
    )

    logger.info(f"SQL補完候補取得完了, suggestion_count={len(result.suggestions)}")

    return result


# ユーザー履歴API
@router.get("/users/history")
async def get_user_history(
    current_user: CurrentUserDep,
    sql_log_service: SQLLogServiceDep
):
    """ログインユーザーの過去半年の実行履歴を取得"""
    # 過去半年の日付を計算
    six_months_ago = datetime.now() - timedelta(days=180)
    date_str = six_months_ago.strftime('%Y%m%d%H%M%S')
    
    # SQLLogService経由でログを取得（LOG_STORAGE_TYPEに依存）
    result = sql_log_service.get_logs(
        user_id=current_user["user_id"],
        limit=1000,  # 過去半年分を取得
        offset=0
    )
    
    # 日付フィルタリングをPython側で実施
    filtered_logs = []
    for log in result["logs"]:
        try:
            log_timestamp = datetime.fromisoformat(log["timestamp"])
            if log_timestamp >= six_months_ago:
                filtered_logs.append(log)
        except Exception:
            # 日付解析エラーは無視
            continue
    
    return {
        "logs": filtered_logs,
        "total_count": len(filtered_logs)
    }


# キャッシュ機能用のエンドポイント
@router.post("/sql/cache/execute", response_model=CacheSQLResponse)
@log_execution_time("cache_sql_execute")
async def execute_sql_with_cache_endpoint(
    request: CacheSQLRequest,
    hybrid_sql_service: HybridSQLServiceDep,
    current_user: CurrentUserDep,
    sql_log_service: SQLLogServiceDep,
    background_tasks: BackgroundTasks
):
    """キャッシュ機能付きSQL実行エンドポイント"""
    logger.info(f"キャッシュSQL実行要求, sql={request.sql}, limit={request.limit}, user_id={current_user['user_id']}")

    if not request.sql:
        raise SQLExecutionError("SQLクエリが無効です")

    start_time = datetime.now()

    try:
        # サービス層に処理を一任する
        result = await hybrid_sql_service.execute_sql_with_cache(
            sql=request.sql, 
            user_id=current_user["user_id"], 
            limit=request.limit
        )
        
        # 大容量データの確認要求の場合
        if result.get('status') == 'requires_confirmation':
            response = CacheSQLResponse(
                success=False,
                session_id=None,
                total_count=result['total_count'],
                processed_rows=0,
                execution_time=0,
                message=result['message'],
                error_message=None
            )
            return response
        
        response = CacheSQLResponse(
            success=result['success'],
            session_id=result['session_id'],
            total_count=result['total_count'],
            processed_rows=result['processed_rows'],
            execution_time=result['execution_time'],
            message=result['message'],
            error_message=result.get('error_message')
        )
        
        # ログ記録のタスクを追加
        background_tasks.add_task(
            sql_log_service.add_log_to_db,
            user_id=current_user["user_id"],
            sql=request.sql,
            execution_time=result['execution_time'],
            start_time=start_time,
            row_count=result['processed_rows'],
            success=result['success'],
            error_message=result.get('error_message')
        )
        
        if not result['success']:
            # エラーレスポンスを返す（例外を発生させない）
            error_response = CacheSQLResponse(
                success=False,
                session_id=None,
                total_count=0,
                processed_rows=0,
                execution_time=result.get('execution_time', 0),
                message=None,
                error_message=result.get('error_message', 'SQL実行に失敗しました')
            )
            return error_response
        
        return response
        
    except Exception as e:
        logger.error(f"キャッシュSQL実行エラー: {e}", exc_info=True)
        # エラーをラップして再送出
        raise SQLExecutionError(f"SQL実行に失敗しました: {str(e)}")

@router.post("/sql/cache/read", response_model=CacheReadResponse)
async def read_cached_data_endpoint(
    request: CacheReadRequest,
    hybrid_sql_service: HybridSQLServiceDep
):
    """キャッシュされたデータを読み出し"""
    logger.info(f"キャッシュ読み出し要求, session_id={request.session_id}")

    try:
        result = hybrid_sql_service.get_cached_data(
            request.session_id,
            request.page,
            request.page_size,
            request.filters,
            request.sort_by,
            request.sort_order
        )
        
        response = CacheReadResponse(
            success=result['success'],
            data=result['data'],
            columns=result['columns'],
            total_count=result['total_count'],
            page=result['page'],
            page_size=result['page_size'],
            total_pages=result['total_pages'],
            session_info=result['session_info'],
            execution_time=result.get('execution_time'),
            error_message=result.get('error_message')
        )
        
        return response
        
    except Exception as e:
        logger.error(f"キャッシュ読み出しエラー: {e}")
        raise SQLExecutionError(f"キャッシュデータの読み出しに失敗しました: {str(e)}")


@router.get("/sql/cache/status/{session_id}", response_model=SessionStatusResponse)
async def get_session_status_endpoint(
    session_id: str,
    streaming_state_service: StreamingStateServiceDep
):
    """セッションの状態を取得"""
    logger.info(f"セッション状態取得要求, session_id={session_id}")

    try:
        state = streaming_state_service.get_state(session_id)
        if not state:
            # セッションが見つからない場合は404を返す
            raise HTTPException(status_code=404, detail="セッションが見つかりません")
        
        progress_percentage = 0
        if state['total_count'] > 0:
            progress_percentage = (state['processed_count'] / state['total_count']) * 100
        
        response = SessionStatusResponse(
            session_id=state['session_id'],
            status=state['status'],
            total_count=state['total_count'],
            processed_count=state['processed_count'],
            progress_percentage=progress_percentage,
            is_complete=state['status'] == 'completed',
            error_message=state.get('error_message')
        )
        
        return response
        
    except HTTPException:
        # HTTPExceptionはそのまま再送出
        raise
    except Exception as e:
        logger.error(f"セッション状態取得エラー: {e}")
        # 詳細なエラー情報をログに出力
        import traceback
        logger.error(f"詳細エラー: {traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=f"セッション状態の取得に失敗しました: {str(e)}")


@router.post("/sql/cache/cancel", response_model=CancelResponse)
async def cancel_streaming_endpoint(
    request: CancelRequest,
    streaming_state_service: StreamingStateServiceDep,
    hybrid_sql_service: HybridSQLServiceDep
):
    """ストリーミングをキャンセル"""
    logger.info(f"ストリーミングキャンセル要求, session_id={request.session_id}")

    try:
        # ストリーミングをキャンセル
        success = streaming_state_service.cancel_streaming(request.session_id)
        
        if success:
            # キャッシュセッションをクリーンアップ
            hybrid_sql_service.cleanup_session(request.session_id)
            
            response = CancelResponse(
                success=True,
                message="ストリーミングをキャンセルしました"
            )
        else:
            response = CancelResponse(
                success=False,
                error_message="キャンセルできませんでした"
            )
        
        return response
        
    except Exception as e:
        logger.error(f"ストリーミングキャンセルエラー: {e}")
        raise HTTPException(status_code=500, detail=f"キャンセルに失敗しました: {str(e)}")


@router.delete("/sql/cache/session/{session_id}")
async def cleanup_session_endpoint(
    session_id: str,
    hybrid_sql_service: HybridSQLServiceDep,
    session_service: SessionServiceDep,
    streaming_state_service: StreamingStateServiceDep
):
    """セッションをクリーンアップ"""
    logger.info(f"セッションクリーンアップ要求, session_id={session_id}")

    try:
        # 各サービスでクリーンアップ
        hybrid_sql_service.cleanup_session(session_id)
        session_service.cleanup_session(session_id)
        streaming_state_service.cleanup_state(session_id)
        
        return {"message": "セッションをクリーンアップしました"}
        
    except Exception as e:
        logger.error(f"セッションクリーンアップエラー: {e}")
        raise HTTPException(status_code=500, detail=f"クリーンアップに失敗しました: {str(e)}")


@router.delete("/sql/cache/user/{user_id}")
async def cleanup_user_cache_endpoint(
    user_id: str,
    hybrid_sql_service: HybridSQLServiceDep,
    session_service: SessionServiceDep,
    streaming_state_service: StreamingStateServiceDep
):
    """ユーザーの全キャッシュをクリーンアップ"""
    logger.info(f"ユーザーキャッシュクリーンアップ要求, user_id={user_id}")

    try:
        # 各サービスでユーザーの全セッションをクリーンアップ
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
        # エラーが発生しても200を返す（フロントエンドでログアウトを続行するため）
        return {"message": "キャッシュクリーンアップを試行しました"}


@router.delete("/sql/cache/current-user")
async def cleanup_current_user_cache_endpoint(
    current_user: CurrentUserDep,
    hybrid_sql_service: HybridSQLServiceDep,
    session_service: SessionServiceDep,
    streaming_state_service: StreamingStateServiceDep
):
    """現在のユーザーの全キャッシュをクリーンアップ"""
    logger.info(f"現在のユーザーキャッシュクリーンアップ要求, user_id={current_user['user_id']}")

    try:
        user_id = current_user["user_id"]
        
        # 各サービスでユーザーの全セッションをクリーンアップ
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
        # エラーが発生しても200を返す（フロントエンドでログアウトを続行するため）
        return {"message": "キャッシュクリーンアップを試行しました"}


@router.get("/config/settings")
async def get_config_settings():
    """アプリケーション設定を取得"""
    settings = get_settings()
    return {
        "default_page_size": settings.default_page_size,
        "max_page_size": settings.max_page_size,
        "cursor_chunk_size": settings.cursor_chunk_size,
        "infinite_scroll_threshold": settings.infinite_scroll_threshold,
        "max_records_for_display": settings.max_records_for_display,
        "max_records_for_csv_download": settings.max_records_for_csv_download
    }


@router.post("/sql/download/csv")
async def download_csv_endpoint(
    request: SQLRequest,
    connection_manager: ConnectionManagerDep,
    current_user: CurrentUserDep
):
    """CSVストリーミングダウンロードエンドポイント"""
    logger.info(f"CSVダウンロード要求, sql={request.sql}, ユーザー: {current_user['user_id']}")
    
    if not request.sql:
        raise HTTPException(status_code=400, detail="SQLクエリが無効です")
    
    try:
        # 総件数を取得して制限チェック
        count_sql = f"SELECT COUNT(*) FROM ({request.sql}) as count_query"
        conn_id, connection = connection_manager.get_connection()
        cursor = connection.cursor()
        cursor.execute(count_sql)
        result = cursor.fetchone()
        total_count = result[0] if result else 0
        
        # CSVダウンロード制限チェック
        from app.config_simplified import get_settings
        settings = get_settings()
        max_records_for_csv_download = settings.max_records_for_csv_download
        
        if total_count > max_records_for_csv_download:
            raise HTTPException(
                status_code=400, 
                detail=f"データが大きすぎます（{total_count:,}件）。クエリを制限してから再実行してください。"
            )
        
        # ファイル名を生成
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = f"query_result_{timestamp}.csv"
        
        def csv_stream_generator():
            """CSVストリーミング生成器"""
            try:
                # SQLを実行
                cursor.execute(request.sql)
                
                # カラム情報を取得
                columns = [column[0] for column in cursor.description]
                
                # CSVライターを作成
                output = io.StringIO()
                writer = csv.writer(output)
                
                # ヘッダーを書き込み
                writer.writerow(columns)
                yield output.getvalue()
                output.seek(0)
                output.truncate()
                
                # データをチャンク単位で取得・書き込み
                chunk_size = 1000
                processed_rows = 0
                
                while True:
                    chunk = cursor.fetchmany(chunk_size)
                    if not chunk:
                        break
                    
                    for row in chunk:
                        writer.writerow(row)
                        processed_rows += 1
                    
                    # チャンクごとにストリーミング
                    yield output.getvalue()
                    output.seek(0)
                    output.truncate()
                
                logger.info(f"CSVダウンロード完了: {processed_rows}件, ユーザー: {current_user['user_id']}")
                
            except Exception as e:
                logger.error(f"CSVダウンロードエラー: {e}", exc_info=True)
                raise HTTPException(status_code=500, detail=f"CSVダウンロードに失敗しました: {str(e)}")
            finally:
                if 'conn_id' in locals() and conn_id:
                    connection_manager.release_connection(conn_id)
        
        return StreamingResponse(
            csv_stream_generator(),
            media_type="text/csv",
            headers={
                "Content-Disposition": f"attachment; filename={filename}",
                "Content-Type": "text/csv; charset=utf-8"
            }
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"CSVダウンロードエラー: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"CSVダウンロードに失敗しました: {str(e)}")

@router.post("/sql/cache/download/csv")
@log_execution_time("cache_download_csv")
async def download_cached_csv_endpoint(
    request: CacheReadRequest,
    hybrid_sql_service: HybridSQLServiceDep
):
    """キャッシュされたデータをCSVでダウンロード"""
    logger.info(f"キャッシュCSVダウンロード要求, session_id={request.session_id}")

    if not request.session_id:
        raise HTTPException(status_code=400, detail="session_idが必要です")

    try:
        # 全件取得（フィルタ・ソート条件付き）
        result = hybrid_sql_service.get_cached_data(
            request.session_id,
            page=1,
            page_size=1000000,  # 大きな値で全件取得
            filters=request.filters,
            sort_by=request.sort_by,
            sort_order=request.sort_order
        )
        
        if not result['success'] or not result['data'] or not result['columns']:
            raise HTTPException(status_code=404, detail="データが見つかりません")

        # CSVデータを生成
        output = io.StringIO()
        writer = csv.writer(output)
        
        # ヘッダー行
        writer.writerow(result['columns'])
        
        # データ行
        for row in result['data']:
            writer.writerow(row)
        
        csv_content = output.getvalue()
        output.close()
        
        # ファイル名を生成
        filename = f"query_result_{datetime.now().strftime('%Y%m%d_%H%M%S')}.csv"
        
        return StreamingResponse(
            io.StringIO(csv_content),
            media_type="text/csv; charset=utf-8",
            headers={"Content-Disposition": f"attachment; filename={filename}"}
        )
        
    except Exception as e:
        logger.error(f"キャッシュCSVダウンロードエラー: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"CSVダウンロードに失敗しました: {str(e)}")

@router.post("/sql/cache/unique-values", response_model=CacheUniqueValuesResponse)
async def get_cache_unique_values(
    request: CacheUniqueValuesRequest,
    hybrid_sql_service: HybridSQLServiceDep
):
    """キャッシュテーブルから指定カラムのユニーク値を取得（連鎖フィルター対応）"""
    logger.info(f"キャッシュユニーク値取得要求, session_id={request.session_id}, column={request.column_name}, limit={request.limit}, filters={request.filters}")
    
    try:
        result = hybrid_sql_service.get_unique_values(
            request.session_id,
            request.column_name,
            request.limit,
            request.filters
        )
        return CacheUniqueValuesResponse(
            values=result['values'],
            total_count=result['total_count'],
            is_truncated=result['is_truncated']
        )
    except Exception as e:
        logger.error(f"キャッシュユニーク値取得エラー: {e}")
        raise HTTPException(status_code=500, detail=f"ユニーク値の取得に失敗しました: {str(e)}")


# 業務システムユーザー管理エンドポイント
@router.get("/admin/business-users", response_model=BusinessUserListResponse)
async def get_business_users(current_admin: CurrentAdminDep, user_service: UserServiceDep):
    """業務システムユーザー一覧を取得（管理者専用）"""
    try:
        users = await run_in_threadpool(user_service.get_all_users)
        return BusinessUserListResponse(
            users=[UserInfo(user_id=user["user_id"], user_name=user["user_name"], role=user.get("role")) for user in users],
            total_count=len(users)
        )
    except Exception as e:
        logger.error(f"業務システムユーザー一覧取得エラー: {e}")
        raise HTTPException(status_code=500, detail=f"ユーザー一覧の取得に失敗しました: {str(e)}")


@router.post("/admin/business-users/refresh", response_model=BusinessUserRefreshResponse)
async def refresh_business_users(current_admin: CurrentAdminDep, user_service: UserServiceDep):
    """業務システムユーザー情報を更新（管理者専用）"""
    try:
        updated_count = await run_in_threadpool(user_service.refresh_users_from_db)
        return BusinessUserRefreshResponse(
            success=True,
            updated_count=updated_count,
            message=f"業務システムユーザー情報を更新しました。更新件数: {updated_count}"
        )
    except Exception as e:
        logger.error(f"業務システムユーザー情報更新エラー: {e}")
        return BusinessUserRefreshResponse(
            success=False,
            updated_count=0,
            message=f"ユーザー情報の更新に失敗しました: {str(e)}"
        )