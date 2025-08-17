# -*- coding: utf-8 -*-
"""
カスタム例外クラス
アプリケーション固有の例外を定義
"""
from typing import Optional, Dict, Any
from http import HTTPStatus
from enum import Enum


class ErrorCode(str, Enum):
    """統一エラーコード列挙体（段階的導入）"""
    INTERNAL_ERROR = "INTERNAL_ERROR"
    CONFIG_ERROR = "CONFIG_ERROR"
    DATABASE_ERROR = "DATABASE_ERROR"
    SQL_VALIDATION_ERROR = "SQL_VALIDATION_ERROR"
    SQL_EXECUTION_ERROR = "SQL_EXECUTION_ERROR"
    METADATA_ERROR = "METADATA_ERROR"
    EXPORT_ERROR = "EXPORT_ERROR"
    PERFORMANCE_ERROR = "PERFORMANCE_ERROR"
    LOGGING_ERROR = "LOGGING_ERROR"
    CONTAINER_ERROR = "CONTAINER_ERROR"
    VALIDATION_ERROR = "VALIDATION_ERROR"
    AUTHENTICATION_ERROR = "AUTHENTICATION_ERROR"
    AUTHORIZATION_ERROR = "AUTHORIZATION_ERROR"
    FILE_ERROR = "FILE_ERROR"
    NETWORK_ERROR = "NETWORK_ERROR"
    TIMEOUT_ERROR = "TIMEOUT_ERROR"
    NOT_FOUND = "NOT_FOUND"
    # 既存テストで使用されている独自コード
    NO_DATA = "NO_DATA"  # データ0件時 (404)
    LIMIT_EXCEEDED = "LIMIT_EXCEEDED"  # 行数/サイズ上限超過 (400)
    INVALID_SESSION = "INVALID_SESSION"  # セッション未指定/不正 (400)
    SERVICE_UNAVAILABLE = "SERVICE_UNAVAILABLE"
    RATE_LIMIT = "RATE_LIMIT"
    DATA_PROCESSING_ERROR = "DATA_PROCESSING_ERROR"
    CACHE_ERROR = "CACHE_ERROR"
    NOTIFICATION_ERROR = "NOTIFICATION_ERROR"
    BACKUP_ERROR = "BACKUP_ERROR"
    MIGRATION_ERROR = "MIGRATION_ERROR"
    HEALTHCHECK_ERROR = "HEALTHCHECK_ERROR"

    # 汎用フォールバック
    APP_ERROR = "APP_ERROR"


class BaseAppException(Exception):
    """アプリケーション基底例外クラス（統一エラーコード対応）"""

    error_code: ErrorCode = ErrorCode.APP_ERROR

    def __init__(
        self,
        message: str,
        detail: Optional[Dict[str, Any]] = None,
        status_code: int = HTTPStatus.INTERNAL_SERVER_ERROR,
        error_code: Optional[ErrorCode] = None,
    ):
        super().__init__(message)
        self.message = message
        self.detail = detail or {}
        self.status_code = status_code
        # 個別指定優先。なければクラス属性。未知なら APP_ERROR
        self.error_code: ErrorCode = error_code or getattr(self, "error_code", ErrorCode.APP_ERROR)

    def to_dict(self) -> Dict[str, Any]:
        """例外を辞書形式に変換（統一レスポンス準拠）"""
        return {
            "error": True,
            "message": self.message,
            "detail": self.detail,
            "status_code": self.status_code,
            "error_code": self.error_code,
        }


class ConfigurationError(BaseAppException):
    """設定エラー"""
    error_code = ErrorCode.CONFIG_ERROR
    def __init__(self, message: str, detail: Optional[Dict[str, Any]] = None):
        super().__init__(message, detail, HTTPStatus.INTERNAL_SERVER_ERROR)


class DatabaseError(BaseAppException):
    """データベースエラー"""
    error_code = ErrorCode.DATABASE_ERROR
    def __init__(self, message: str, detail: Optional[Dict[str, Any]] = None):
        super().__init__(message, detail, HTTPStatus.INTERNAL_SERVER_ERROR)


class SQLValidationError(BaseAppException):
    """SQLバリデーションエラー"""
    error_code = ErrorCode.SQL_VALIDATION_ERROR
    def __init__(self, message: str, detail: Optional[Dict[str, Any]] = None):
        super().__init__(message, detail, HTTPStatus.BAD_REQUEST)


class SQLExecutionError(BaseAppException):
    """SQL実行エラー"""
    error_code = ErrorCode.SQL_EXECUTION_ERROR
    def __init__(self, message: str, detail: Optional[Dict[str, Any]] = None):
        super().__init__(message, detail, HTTPStatus.BAD_REQUEST)


class MetadataError(BaseAppException):
    """メタデータエラー"""
    error_code = ErrorCode.METADATA_ERROR
    def __init__(self, message: str, detail: Optional[Dict[str, Any]] = None):
        super().__init__(message, detail, HTTPStatus.INTERNAL_SERVER_ERROR)


class ExportError(BaseAppException):
    """エクスポートエラー"""
    error_code = ErrorCode.EXPORT_ERROR
    def __init__(self, message: str, detail: Optional[Dict[str, Any]] = None):
        super().__init__(message, detail, HTTPStatus.INTERNAL_SERVER_ERROR)


class PerformanceError(BaseAppException):
    """パフォーマンスエラー"""
    error_code = ErrorCode.PERFORMANCE_ERROR
    def __init__(self, message: str, detail: Optional[Dict[str, Any]] = None):
        super().__init__(message, detail, HTTPStatus.INTERNAL_SERVER_ERROR)


class LoggingError(BaseAppException):
    """ログエラー"""
    error_code = ErrorCode.LOGGING_ERROR
    def __init__(self, message: str, detail: Optional[Dict[str, Any]] = None):
        super().__init__(message, detail, HTTPStatus.INTERNAL_SERVER_ERROR)


class ContainerError(BaseAppException):
    """依存性注入コンテナエラー"""
    error_code = ErrorCode.CONTAINER_ERROR
    def __init__(self, message: str, detail: Optional[Dict[str, Any]] = None):
        super().__init__(message, detail, HTTPStatus.INTERNAL_SERVER_ERROR)


class ValidationError(BaseAppException):
    """バリデーションエラー"""
    error_code = ErrorCode.VALIDATION_ERROR
    def __init__(self, message: str, detail: Optional[Dict[str, Any]] = None):
        super().__init__(message, detail, HTTPStatus.BAD_REQUEST)


class AuthenticationError(BaseAppException):
    """認証エラー"""
    error_code = ErrorCode.AUTHENTICATION_ERROR
    def __init__(self, message: str, detail: Optional[Dict[str, Any]] = None):
        super().__init__(message, detail, HTTPStatus.UNAUTHORIZED)


class AuthorizationError(BaseAppException):
    """認可エラー"""
    error_code = ErrorCode.AUTHORIZATION_ERROR
    def __init__(self, message: str, detail: Optional[Dict[str, Any]] = None):
        super().__init__(message, detail, HTTPStatus.FORBIDDEN)


class FileError(BaseAppException):
    """ファイル操作エラー"""
    error_code = ErrorCode.FILE_ERROR
    def __init__(self, message: str, detail: Optional[Dict[str, Any]] = None):
        super().__init__(message, detail, HTTPStatus.INTERNAL_SERVER_ERROR)


class NetworkError(BaseAppException):
    """ネットワークエラー"""
    error_code = ErrorCode.NETWORK_ERROR
    def __init__(self, message: str, detail: Optional[Dict[str, Any]] = None):
        super().__init__(message, detail, HTTPStatus.SERVICE_UNAVAILABLE)


class TimeoutError(BaseAppException):
    """タイムアウトエラー"""
    error_code = ErrorCode.TIMEOUT_ERROR
    def __init__(self, message: str, detail: Optional[Dict[str, Any]] = None):
        super().__init__(message, detail, HTTPStatus.REQUEST_TIMEOUT)


class ResourceNotFoundError(BaseAppException):
    """リソース未発見エラー"""
    error_code = ErrorCode.NOT_FOUND
    def __init__(self, message: str, detail: Optional[Dict[str, Any]] = None):
        super().__init__(message, detail, HTTPStatus.NOT_FOUND)


class ServiceUnavailableError(BaseAppException):
    """サービス利用不可エラー"""
    error_code = ErrorCode.SERVICE_UNAVAILABLE
    def __init__(self, message: str, detail: Optional[Dict[str, Any]] = None):
        super().__init__(message, detail, HTTPStatus.SERVICE_UNAVAILABLE)


class RateLimitError(BaseAppException):
    """レート制限エラー"""
    error_code = ErrorCode.RATE_LIMIT
    def __init__(self, message: str, detail: Optional[Dict[str, Any]] = None):
        super().__init__(message, detail, HTTPStatus.TOO_MANY_REQUESTS)


class DataProcessingError(BaseAppException):
    """データ処理エラー"""
    error_code = ErrorCode.DATA_PROCESSING_ERROR
    def __init__(self, message: str, detail: Optional[Dict[str, Any]] = None):
        super().__init__(message, detail, HTTPStatus.INTERNAL_SERVER_ERROR)


class CacheError(BaseAppException):
    """キャッシュエラー"""
    error_code = ErrorCode.CACHE_ERROR
    def __init__(self, message: str, detail: Optional[Dict[str, Any]] = None):
        super().__init__(message, detail, HTTPStatus.INTERNAL_SERVER_ERROR)


class NotificationError(BaseAppException):
    """通知エラー"""
    error_code = ErrorCode.NOTIFICATION_ERROR
    def __init__(self, message: str, detail: Optional[Dict[str, Any]] = None):
        super().__init__(message, detail, HTTPStatus.INTERNAL_SERVER_ERROR)


class BackupError(BaseAppException):
    """バックアップエラー"""
    error_code = ErrorCode.BACKUP_ERROR
    def __init__(self, message: str, detail: Optional[Dict[str, Any]] = None):
        super().__init__(message, detail, HTTPStatus.INTERNAL_SERVER_ERROR)


class MigrationError(BaseAppException):
    """マイグレーションエラー"""
    error_code = ErrorCode.MIGRATION_ERROR
    def __init__(self, message: str, detail: Optional[Dict[str, Any]] = None):
        super().__init__(message, detail, HTTPStatus.INTERNAL_SERVER_ERROR)


class HealthCheckError(BaseAppException):
    """ヘルスチェックエラー"""
    error_code = ErrorCode.HEALTHCHECK_ERROR
    def __init__(self, message: str, detail: Optional[Dict[str, Any]] = None):
        super().__init__(message, detail, HTTPStatus.SERVICE_UNAVAILABLE) 