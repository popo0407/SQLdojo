# -*- coding: utf-8 -*-
"""
FastAPI依存性注入用の関数
"""
from functools import lru_cache
from typing import Annotated

from fastapi import Depends, Request, HTTPException, status

from app.config_simplified import get_settings
from app.logger import get_logger
from app.sql_validator import SQLValidator, get_validator
from app.metadata_cache import MetadataCache
from app.services.connection_manager_odbc import ConnectionManagerODBC
from app.services.query_executor import QueryExecutor
from app.services.sql_service import SQLService
from app.services.metadata_service import MetadataService
from app.services.performance_service import PerformanceService
from app.services.export_service import ExportService
from app.services.completion_service import CompletionService
from app.services.user_service import UserService
from app.services.sql_log_service import SQLLogService


# 設定の依存性注入
@lru_cache()
def get_app_settings():
    """アプリケーション設定を取得"""
    return get_settings()


# ロガーの依存性注入
@lru_cache()
def get_app_logger():
    """アプリケーションロガーを取得"""
    return get_logger("app")


# SQLバリデーターの依存性注入
@lru_cache()
def get_sql_validator_di() -> SQLValidator:
    """SQLバリデーターを取得"""
    return get_validator()


# メタデータキャッシュの依存性注入
@lru_cache()
def get_metadata_cache_di() -> MetadataCache:
    """メタデータキャッシュを取得"""
    return MetadataCache()


# 接続マネージャーの依存性注入
def get_connection_manager_di() -> ConnectionManagerODBC:
    """接続マネージャーを取得"""
    return ConnectionManagerODBC()


# クエリ実行器の依存性注入
def get_query_executor_di(
    connection_manager: Annotated[ConnectionManagerODBC, Depends(get_connection_manager_di)]
) -> QueryExecutor:
    """クエリ実行器を取得"""
    return QueryExecutor(connection_manager)


# データベースサービスの依存性注入（削除）
# def get_database_service_di(
#     connection_manager: Annotated[ConnectionManagerODBC, Depends(get_connection_manager_di)],
#     query_executor: Annotated[QueryExecutor, Depends(get_query_executor_di)]
# ) -> DatabaseService:
#     """データベースサービスを取得"""
#     return DatabaseService(connection_manager, query_executor)


# SQLサービスの依存性注入
def get_sql_service_di(
    query_executor: Annotated[QueryExecutor, Depends(get_query_executor_di)]
) -> SQLService:
    """SQLサービスを取得"""
    return SQLService(query_executor)


# メタデータサービスの依存性注入
def get_metadata_service_di(
    query_executor: Annotated[QueryExecutor, Depends(get_query_executor_di)],
    metadata_cache: Annotated[MetadataCache, Depends(get_metadata_cache_di)]
) -> MetadataService:
    """メタデータサービスを取得"""
    return MetadataService(query_executor, metadata_cache)


# パフォーマンスサービスの依存性注入
def get_performance_service_di() -> PerformanceService:
    """パフォーマンスサービスを取得"""
    return PerformanceService()


# エクスポートサービスの依存性注入
def get_export_service_di(
    query_executor: Annotated[QueryExecutor, Depends(get_query_executor_di)]
) -> ExportService:
    """エクスポートサービスを取得"""
    return ExportService(query_executor)


# 補完サービスの依存性注入
def get_completion_service_di(
    metadata_service: Annotated[MetadataService, Depends(get_metadata_service_di)]
) -> CompletionService:
    """補完サービスを取得"""
    return CompletionService(metadata_service)


# 認証チェックの依存性注入
def get_current_user(request: Request):
    """現在のユーザーを取得（認証チェック付き）"""
    user = request.session.get("user")
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="未ログインです")
    return user


# 管理者認証チェックの依存性注入
def get_current_admin(request: Request):
    """現在の管理者を取得（管理者認証チェック付き）"""
    # 管理者認証をチェック
    is_admin = request.session.get("is_admin")
    if not is_admin:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="管理者権限が必要です")
    return True


# SQLLogServiceの依存性注入
def get_sql_log_service_di(
    query_executor: Annotated[QueryExecutor, Depends(get_query_executor_di)]
) -> SQLLogService:
    """SQLLogServiceのインスタンスを取得"""
    return SQLLogService(query_executor=query_executor)


# 型エイリアス（使用例）
ConnectionManagerDep = Annotated[ConnectionManagerODBC, Depends(get_connection_manager_di)]
QueryExecutorDep = Annotated[QueryExecutor, Depends(get_query_executor_di)]
# DatabaseServiceDep = Annotated[DatabaseService, Depends(get_database_service_di)]  # 削除
SQLServiceDep = Annotated[SQLService, Depends(get_sql_service_di)]
MetadataServiceDep = Annotated[MetadataService, Depends(get_metadata_service_di)]
PerformanceServiceDep = Annotated[PerformanceService, Depends(get_performance_service_di)]
ExportServiceDep = Annotated[ExportService, Depends(get_export_service_di)]
CompletionServiceDep = Annotated[CompletionService, Depends(get_completion_service_di)]
SQLValidatorDep = Annotated[SQLValidator, Depends(get_sql_validator_di)]
MetadataCacheDep = Annotated[MetadataCache, Depends(get_metadata_cache_di)]
CurrentUserDep = Annotated[dict, Depends(get_current_user)]
CurrentAdminDep = Annotated[bool, Depends(get_current_admin)]
SQLLogServiceDep = Annotated[SQLLogService, Depends(get_sql_log_service_di)] 