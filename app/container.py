# -*- coding: utf-8 -*-
"""
簡素化された依存性注入コンテナ
アプリケーション全体の依存関係を管理
"""
from typing import Dict, Any, Optional
from functools import lru_cache

from app.config_simplified import get_settings
from app.logger import get_logger
from app.sql_validator import SQLValidator, get_validator
from app.exceptions import ConfigurationError, ContainerError
from app.metadata_cache import MetadataCache


class Container:
    """簡素化された依存性注入コンテナ"""
    
    def __init__(self):
        self._services: Dict[str, Any] = {}
        self._initialized = False
        self._logger = None
    
    def get(self, name: str) -> Any:
        """サービスを取得"""
        if name not in self._services:
            raise KeyError(f"サービス '{name}' が見つかりません")
        return self._services[name]
    
    def has(self, name: str) -> bool:
        """サービスが登録されているかチェック"""
        return name in self._services
    
    def clear(self) -> None:
        """コンテナをクリア"""
        self._services.clear()
        self._initialized = False
    
    def initialize(self) -> None:
        """コンテナを初期化"""
        if self._initialized:
            return
        
        try:
            # ロガーを登録
            logger = get_logger("container")
            self._services["logger"] = logger
            self._logger = logger
            
            # SQLバリデーターを登録
            validator = get_validator()
            self._services["sql_validator"] = validator
            
            # メタデータキャッシュを登録
            metadata_cache = MetadataCache()
            self._services["metadata_cache"] = metadata_cache
            
            self._initialized = True
            logger.info("依存性注入コンテナが初期化されました")
            
        except Exception as e:
            raise ContainerError(f"コンテナの初期化に失敗しました: {str(e)}")
    
    def get_logger(self):
        """ロガーを取得"""
        return self.get("logger")
    
    def get_sql_validator(self) -> SQLValidator:
        """SQLバリデーターを取得"""
        return self.get("sql_validator")
    
    def get_connection_manager(self):
        """接続管理を取得"""
        if "connection_manager" not in self._services:
            from app.services.connection_manager import ConnectionManager
            self._services["connection_manager"] = ConnectionManager()
        return self._services["connection_manager"]
    
    def get_query_executor(self):
        """クエリ実行を取得"""
        if "query_executor" not in self._services:
            from app.services.query_executor import QueryExecutor
            connection_manager = self.get_connection_manager()
            self._services["query_executor"] = QueryExecutor(connection_manager)
        return self._services["query_executor"]
    
    def get_database_service(self):
        """データベースサービスを取得"""
        if "database_service" not in self._services:
            from app.services.database_service import DatabaseService
            connection_manager = self.get_connection_manager()
            query_executor = self.get_query_executor()
            self._services["database_service"] = DatabaseService(connection_manager, query_executor)
        return self._services["database_service"]
    
    def get_sql_service(self):
        """SQLサービスを取得"""
        if "sql_service" not in self._services:
            from app.services.sql_service import SQLService
            query_executor = self.get_query_executor()
            self._services["sql_service"] = SQLService(query_executor)
        return self._services["sql_service"]
    
    def get_metadata_service(self):
        """メタデータサービスを取得"""
        if "metadata_service" not in self._services:
            from app.services.metadata_service import MetadataService
            query_executor = self.get_query_executor()
            metadata_cache = self.get("metadata_cache")
            self._services["metadata_service"] = MetadataService(query_executor, metadata_cache)
        return self._services["metadata_service"]
    
    def get_performance_service(self):
        """パフォーマンスサービスを取得"""
        if "performance_service" not in self._services:
            from app.services.performance_service import PerformanceService
            self._services["performance_service"] = PerformanceService()
        return self._services["performance_service"]
    
    def get_export_service(self):
        """エクスポートサービスを取得"""
        if "export_service" not in self._services:
            from app.services.export_service import ExportService
            query_executor = self.get_query_executor()
            self._services["export_service"] = ExportService(query_executor)
        return self._services["export_service"]
    
    def get_metadata_cache(self):
        """メタデータキャッシュサービスを取得"""
        return self.get("metadata_cache")

    def reset(self):
        """コンテナをリセット"""
        self.clear()


# グローバルコンテナインスタンス
_container: Optional[Container] = None


def get_container() -> Container:
    """コンテナを取得"""
    global _container
    if _container is None:
        _container = Container()
        _container.initialize()
    return _container


# 簡素化されたサービス取得関数
@lru_cache()
def get_app_logger():
    """アプリケーションロガーを取得"""
    return get_logger("app")


@lru_cache()
def get_sql_validator() -> SQLValidator:
    """SQLバリデーターを取得"""
    return get_validator()


def get_connection_manager():
    """接続管理を取得"""
    return get_container().get_connection_manager()


def get_query_executor():
    """クエリ実行を取得"""
    return get_container().get_query_executor()


def get_database_service():
    """データベースサービスを取得"""
    return get_container().get_database_service()


def get_sql_service():
    """SQLサービスを取得"""
    return get_container().get_sql_service()


def get_metadata_service():
    """メタデータサービスを取得"""
    return get_container().get_metadata_service()


def get_performance_service():
    """パフォーマンスサービスを取得"""
    return get_container().get_performance_service()


@lru_cache()
def get_metadata_cache() -> MetadataCache:
    """メタデータキャッシュを取得"""
    return MetadataCache()


def get_export_service():
    """エクスポートサービスを取得"""
    return get_container().get_export_service()


def reset_container():
    """コンテナをリセット"""
    global _container
    if _container:
        _container.reset()
        _container = None 