# -*- coding: utf-8 -*-
"""
簡素化された依存性注入コンテナ（後方互換性のため）
FastAPIのDI機能に移行したため、このファイルは後方互換性のためのエイリアスのみ提供
"""
import warnings
from typing import Optional

from app.dependencies import (
    get_connection_manager_di, get_query_executor_di, get_database_service_di,
    get_sql_service_di, get_metadata_service_di, get_performance_service_di,
    get_export_service_di, get_sql_validator_di, get_metadata_cache_di,
    get_app_logger
)
from app.services.connection_manager import ConnectionManager
from app.services.query_executor import QueryExecutor
from app.services.database_service import DatabaseService
from app.services.sql_service import SQLService
from app.services.metadata_service import MetadataService
from app.services.performance_service import PerformanceService
from app.services.export_service import ExportService
from app.sql_validator import SQLValidator
from app.metadata_cache import MetadataCache


def _deprecation_warning():
    """非推奨警告を表示"""
    warnings.warn(
        "container.pyの使用は非推奨です。代わりにapp.dependenciesを使用してください。",
        DeprecationWarning,
        stacklevel=3
    )


# 後方互換性のためのエイリアス関数
def get_connection_manager() -> ConnectionManager:
    """接続管理を取得（非推奨）"""
    _deprecation_warning()
    return get_connection_manager_di()


def get_query_executor() -> QueryExecutor:
    """クエリ実行を取得（非推奨）"""
    _deprecation_warning()
    return get_query_executor_di()


def get_database_service() -> DatabaseService:
    """データベースサービスを取得（非推奨）"""
    _deprecation_warning()
    return get_database_service_di()


def get_sql_service() -> SQLService:
    """SQLサービスを取得（非推奨）"""
    _deprecation_warning()
    return get_sql_service_di()


def get_metadata_service() -> MetadataService:
    """メタデータサービスを取得（非推奨）"""
    _deprecation_warning()
    return get_metadata_service_di()


def get_performance_service() -> PerformanceService:
    """パフォーマンスサービスを取得（非推奨）"""
    _deprecation_warning()
    return get_performance_service_di()


def get_export_service() -> ExportService:
    """エクスポートサービスを取得（非推奨）"""
    _deprecation_warning()
    return get_export_service_di()


def get_sql_validator() -> SQLValidator:
    """SQLバリデーターを取得（非推奨）"""
    _deprecation_warning()
    return get_sql_validator_di()


def get_metadata_cache() -> MetadataCache:
    """メタデータキャッシュを取得（非推奨）"""
    _deprecation_warning()
    return get_metadata_cache_di()


# 旧Containerクラスは削除（使用されていない） 