# -*- coding: utf-8 -*-
"""
カスタム例外クラス
アプリケーション固有の例外を定義
"""
from typing import Optional, Dict, Any
from http import HTTPStatus


class BaseAppException(Exception):
    """アプリケーション基底例外クラス"""
    
    def __init__(self, message: str, details: Optional[Dict[str, Any]] = None, status_code: int = HTTPStatus.INTERNAL_SERVER_ERROR):
        super().__init__(message)
        self.message = message
        self.details = details or {}
        self.status_code = status_code
    
    def to_dict(self) -> Dict[str, Any]:
        """例外を辞書形式に変換"""
        return {
            "error": True,
            "message": self.message,
            "details": self.details,
            "status_code": self.status_code
        }


class ConfigurationError(BaseAppException):
    """設定エラー"""
    def __init__(self, message: str, details: Optional[Dict[str, Any]] = None):
        super().__init__(message, details, HTTPStatus.INTERNAL_SERVER_ERROR)


class DatabaseError(BaseAppException):
    """データベースエラー"""
    def __init__(self, message: str, details: Optional[Dict[str, Any]] = None):
        super().__init__(message, details, HTTPStatus.INTERNAL_SERVER_ERROR)


class SQLValidationError(BaseAppException):
    """SQLバリデーションエラー"""
    def __init__(self, message: str, details: Optional[Dict[str, Any]] = None):
        super().__init__(message, details, HTTPStatus.BAD_REQUEST)


class SQLExecutionError(BaseAppException):
    """SQL実行エラー"""
    def __init__(self, message: str, details: Optional[Dict[str, Any]] = None):
        super().__init__(message, details, HTTPStatus.BAD_REQUEST)


class MetadataError(BaseAppException):
    """メタデータエラー"""
    def __init__(self, message: str, details: Optional[Dict[str, Any]] = None):
        super().__init__(message, details, HTTPStatus.INTERNAL_SERVER_ERROR)


class ExportError(BaseAppException):
    """エクスポートエラー"""
    def __init__(self, message: str, details: Optional[Dict[str, Any]] = None):
        super().__init__(message, details, HTTPStatus.INTERNAL_SERVER_ERROR)


class PerformanceError(BaseAppException):
    """パフォーマンスエラー"""
    def __init__(self, message: str, details: Optional[Dict[str, Any]] = None):
        super().__init__(message, details, HTTPStatus.INTERNAL_SERVER_ERROR)


class LoggingError(BaseAppException):
    """ログエラー"""
    def __init__(self, message: str, details: Optional[Dict[str, Any]] = None):
        super().__init__(message, details, HTTPStatus.INTERNAL_SERVER_ERROR)


class ContainerError(BaseAppException):
    """依存性注入コンテナエラー"""
    def __init__(self, message: str, details: Optional[Dict[str, Any]] = None):
        super().__init__(message, details, HTTPStatus.INTERNAL_SERVER_ERROR)


class ValidationError(BaseAppException):
    """バリデーションエラー"""
    def __init__(self, message: str, details: Optional[Dict[str, Any]] = None):
        super().__init__(message, details, HTTPStatus.BAD_REQUEST)


class AuthenticationError(BaseAppException):
    """認証エラー"""
    def __init__(self, message: str, details: Optional[Dict[str, Any]] = None):
        super().__init__(message, details, HTTPStatus.UNAUTHORIZED)


class AuthorizationError(BaseAppException):
    """認可エラー"""
    def __init__(self, message: str, details: Optional[Dict[str, Any]] = None):
        super().__init__(message, details, HTTPStatus.FORBIDDEN)


class FileError(BaseAppException):
    """ファイル操作エラー"""
    def __init__(self, message: str, details: Optional[Dict[str, Any]] = None):
        super().__init__(message, details, HTTPStatus.INTERNAL_SERVER_ERROR)


class NetworkError(BaseAppException):
    """ネットワークエラー"""
    def __init__(self, message: str, details: Optional[Dict[str, Any]] = None):
        super().__init__(message, details, HTTPStatus.SERVICE_UNAVAILABLE)


class TimeoutError(BaseAppException):
    """タイムアウトエラー"""
    def __init__(self, message: str, details: Optional[Dict[str, Any]] = None):
        super().__init__(message, details, HTTPStatus.REQUEST_TIMEOUT)


class ResourceNotFoundError(BaseAppException):
    """リソース未発見エラー"""
    def __init__(self, message: str, details: Optional[Dict[str, Any]] = None):
        super().__init__(message, details, HTTPStatus.NOT_FOUND)


class ServiceUnavailableError(BaseAppException):
    """サービス利用不可エラー"""
    def __init__(self, message: str, details: Optional[Dict[str, Any]] = None):
        super().__init__(message, details, HTTPStatus.SERVICE_UNAVAILABLE)


class RateLimitError(BaseAppException):
    """レート制限エラー"""
    def __init__(self, message: str, details: Optional[Dict[str, Any]] = None):
        super().__init__(message, details, HTTPStatus.TOO_MANY_REQUESTS)


class DataProcessingError(BaseAppException):
    """データ処理エラー"""
    def __init__(self, message: str, details: Optional[Dict[str, Any]] = None):
        super().__init__(message, details, HTTPStatus.INTERNAL_SERVER_ERROR)


class CacheError(BaseAppException):
    """キャッシュエラー"""
    def __init__(self, message: str, details: Optional[Dict[str, Any]] = None):
        super().__init__(message, details, HTTPStatus.INTERNAL_SERVER_ERROR)


class NotificationError(BaseAppException):
    """通知エラー"""
    def __init__(self, message: str, details: Optional[Dict[str, Any]] = None):
        super().__init__(message, details, HTTPStatus.INTERNAL_SERVER_ERROR)


class BackupError(BaseAppException):
    """バックアップエラー"""
    def __init__(self, message: str, details: Optional[Dict[str, Any]] = None):
        super().__init__(message, details, HTTPStatus.INTERNAL_SERVER_ERROR)


class MigrationError(BaseAppException):
    """マイグレーションエラー"""
    def __init__(self, message: str, details: Optional[Dict[str, Any]] = None):
        super().__init__(message, details, HTTPStatus.INTERNAL_SERVER_ERROR)


class HealthCheckError(BaseAppException):
    """ヘルスチェックエラー"""
    def __init__(self, message: str, details: Optional[Dict[str, Any]] = None):
        super().__init__(message, details, HTTPStatus.SERVICE_UNAVAILABLE) 