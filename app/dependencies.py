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
from app.services.query_executor_snowflake_log import QueryExecutorSnowflakeLog
from app.services.connection_manager_snowflake_log import ConnectionManagerSnowflakeLog
# from app.services.database_service import DatabaseService  # 削除
from app.services.sql_service import SQLService
from app.services.metadata_service import MetadataService
from app.services.performance_service import PerformanceService
from app.services.export_service import ExportService
from app.services.completion_service import CompletionService
from app.services.user_service import UserService
from app.services.template_service import TemplateService
from app.services.part_service import PartService
from app.services.sql_log_service import SQLLogService
from app.services.admin_service import AdminService
from app.services.visibility_control_service import VisibilityControlService
from app.services.connection_manager_oracle import ConnectionManagerOracle
from app.services.user_preference_service import UserPreferenceService
from app.services.cache_service import CacheService
from app.services.hybrid_sql_service import HybridSQLService
from app.services.session_service import SessionService
from app.services.streaming_state_service import StreamingStateService


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


# ユーザーサービスの依存性注入
def get_user_service_di(
    metadata_cache: Annotated[MetadataCache, Depends(get_metadata_cache_di)]
) -> UserService:
    """ユーザーサービスを取得"""
    return UserService(metadata_cache)


# テンプレートサービスの依存性注入
def get_template_service_di(
    metadata_cache: Annotated[MetadataCache, Depends(get_metadata_cache_di)]
) -> TemplateService:
    """テンプレートサービスを取得"""
    return TemplateService(metadata_cache)

# パーツサービスの依存性注入
def get_part_service_di(
    metadata_cache: Annotated[MetadataCache, Depends(get_metadata_cache_di)]
) -> PartService:
    """パーツサービスを取得"""
    return PartService(metadata_cache)


# ユーザー表示設定サービスの依存性注入
def get_user_preference_service_di(
    metadata_cache: Annotated[MetadataCache, Depends(get_metadata_cache_di)]
) -> UserPreferenceService:
    """ユーザー表示設定サービスを取得"""
    return UserPreferenceService(metadata_cache)


# キャッシュサービスの依存性注入
@lru_cache()
def get_cache_service_di() -> CacheService:
    """キャッシュサービスを取得"""
    return CacheService()


# セッションサービスの依存性注入
@lru_cache()
def get_session_service_di() -> SessionService:
    """セッションサービスを取得"""
    return SessionService()


# ストリーミング状態管理サービスの依存性注入
@lru_cache()
def get_streaming_state_service_di() -> StreamingStateService:
    """ストリーミング状態管理サービスを取得"""
    return StreamingStateService()


# ハイブリッドSQLサービスの依存性注入
def get_hybrid_sql_service_di(
    cache_service: Annotated[CacheService, Depends(get_cache_service_di)],
    connection_manager: Annotated[ConnectionManagerODBC, Depends(get_connection_manager_di)],
    streaming_state_service: Annotated[StreamingStateService, Depends(get_streaming_state_service_di)]
) -> HybridSQLService:
    """ハイブリッドSQLサービスを取得"""
    return HybridSQLService(cache_service, connection_manager, streaming_state_service)


# 認証チェックの依存性注入
def get_current_user(request: Request):
    """現在のユーザーを取得（認証チェック付き）"""
    logger = get_logger("dependencies")
    
    # リクエスト情報をログに出力
    headers = dict(request.headers)
    cookie_header = headers.get('cookie', 'なし')
    logger.info(f"認証チェック開始 - session keys: {list(request.session.keys())}, Cookie: {cookie_header[:100]}...")
    
    user = request.session.get("user")
    if not user:
        logger.warning("セッションにユーザー情報が見つかりません")
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="未ログインです")
    
    logger.info(f"認証成功 - user_id: {user.get('user_id')}")
    if 'role' not in user:
        user['role'] = 'DEFAULT' # 古いセッションの場合のフォールバック
    return user


# 管理者認証チェックの依存性注入
def get_current_admin(request: Request):
    """現在の管理者を取得（管理者認証チェック付き）"""
    # 管理者認証をチェック
    is_admin = request.session.get("is_admin")
    if not is_admin:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="管理者権限が必要です")
    return True


# --- Oracle用のDIを追加 ---
@lru_cache()
def get_connection_manager_oracle_di() -> ConnectionManagerOracle:
    return ConnectionManagerOracle()

def get_query_executor_for_oracle_di(
    connection_manager: Annotated[ConnectionManagerOracle, Depends(get_connection_manager_oracle_di)]
) -> QueryExecutor:
    return QueryExecutor(connection_manager)

# --- Snowflakeログ用のDIを追加 ---
@lru_cache()
def get_connection_manager_snowflake_log_di() -> ConnectionManagerSnowflakeLog:
    return ConnectionManagerSnowflakeLog()

def get_query_executor_for_snowflake_log_di(
    connection_manager: Annotated[ConnectionManagerSnowflakeLog, Depends(get_connection_manager_snowflake_log_di)]
) -> QueryExecutorSnowflakeLog:
    return QueryExecutorSnowflakeLog(connection_manager)

# --- SQLLogServiceのDIを修正 ---
def get_sql_log_service_di() -> SQLLogService:
    settings = get_settings()
    
    if settings.log_storage_type == "snowflake":
        # Snowflakeログ用のQueryExecutorを使用
        connection_manager = get_connection_manager_snowflake_log_di()
        query_executor = QueryExecutorSnowflakeLog(connection_manager)
    else:
        # Oracleログ用のQueryExecutorを使用
        connection_manager = get_connection_manager_oracle_di()
        query_executor = QueryExecutor(connection_manager)
    
    return SQLLogService(query_executor=query_executor, log_storage_type=settings.log_storage_type)


# AdminServiceの依存性注入を追加
def get_admin_service_di(
    user_service: Annotated[UserService, Depends(get_user_service_di)],
    metadata_service: Annotated[MetadataService, Depends(get_metadata_service_di)]
) -> AdminService:
    return AdminService(user_service, metadata_service)


# VisibilityControlServiceの依存性注入を追加
def get_visibility_control_service_di(
    metadata_cache: Annotated[MetadataCache, Depends(get_metadata_cache_di)]
) -> VisibilityControlService:
    """VisibilityControlServiceのインスタンスを取得"""
    return VisibilityControlService(metadata_cache)


# 型エイリアス（使用例）
ConnectionManagerDep = Annotated[ConnectionManagerODBC, Depends(get_connection_manager_di)]
QueryExecutorDep = Annotated[QueryExecutor, Depends(get_query_executor_di)]
# DatabaseServiceDep = Annotated[DatabaseService, Depends(get_database_service_di)]  # 削除
SQLServiceDep = Annotated[SQLService, Depends(get_sql_service_di)]
MetadataServiceDep = Annotated[MetadataService, Depends(get_metadata_service_di)]
PerformanceServiceDep = Annotated[PerformanceService, Depends(get_performance_service_di)]
ExportServiceDep = Annotated[ExportService, Depends(get_export_service_di)]
CompletionServiceDep = Annotated[CompletionService, Depends(get_completion_service_di)]
UserServiceDep = Annotated[UserService, Depends(get_user_service_di)]
TemplateServiceDep = Annotated[TemplateService, Depends(get_template_service_di)]
PartServiceDep = Annotated[PartService, Depends(get_part_service_di)]
SQLValidatorDep = Annotated[SQLValidator, Depends(get_sql_validator_di)]
MetadataCacheDep = Annotated[MetadataCache, Depends(get_metadata_cache_di)]
CurrentUserDep = Annotated[dict, Depends(get_current_user)]
CurrentAdminDep = Annotated[bool, Depends(get_current_admin)]
SQLLogServiceDep = Annotated[SQLLogService, Depends(get_sql_log_service_di)]
AdminServiceDep = Annotated[AdminService, Depends(get_admin_service_di)]
UserPreferenceServiceDep = Annotated[UserPreferenceService, Depends(get_user_preference_service_di)]
VisibilityControlServiceDep = Annotated[VisibilityControlService, Depends(get_visibility_control_service_di)]
HybridSQLServiceDep = Annotated[HybridSQLService, Depends(get_hybrid_sql_service_di)]
SessionServiceDep = Annotated[SessionService, Depends(get_session_service_di)]
StreamingStateServiceDep = Annotated[StreamingStateService, Depends(get_streaming_state_service_di)]