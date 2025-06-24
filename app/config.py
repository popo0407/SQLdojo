# -*- coding: utf-8 -*-
"""
設定管理モジュール
アプリケーション全体の設定を管理
"""
import os
import json
from pathlib import Path
from typing import Optional, Dict, Any
from pydantic import BaseModel, Field, field_validator, ConfigDict
from pydantic_settings import BaseSettings
from dotenv import load_dotenv

from app.exceptions import ConfigurationError
from app.utils import validate_file_path, merge_dicts

# .envファイルを明示的に読み込み
load_dotenv()


class DatabaseConfig(BaseModel):
    """データベース設定"""
    model_config = ConfigDict(populate_by_name=True)
    
    host: str = Field(default="", description="データベースホスト")
    port: int = Field(default=5439, description="データベースポート")
    database: str = Field(default="", description="データベース名")
    db_schema: str = Field(default="PUBLIC", description="スキーマ名")
    username: str = Field(default="", description="ユーザー名")
    password: str = Field(default="", description="パスワード")
    warehouse: str = Field(default="COMPUTE_WH", description="ウェアハウス名")
    role: str = Field(default="", description="ロール名")
    timeout: int = Field(default=30, description="接続タイムアウト（秒）")
    max_connections: int = Field(default=10, description="最大接続数")
    private_key_path: str = Field(default="", description="秘密鍵ファイルパス")
    private_key_passphrase: str = Field(default="", description="秘密鍵パスフレーズ")
    
    @field_validator('host')
    @classmethod
    def validate_host(cls, v):
        if not v:
            raise ValueError('データベースホストは必須です')
        return v
    
    @field_validator('username')
    @classmethod
    def validate_username(cls, v):
        if not v:
            raise ValueError('ユーザー名は必須です')
        return v
    
    @field_validator('password')
    @classmethod
    def validate_password(cls, v):
        # キーペア認証の場合はパスワードは不要
        return v
    
    @field_validator('database')
    @classmethod
    def validate_database(cls, v):
        if not v:
            raise ValueError('データベース名は必須です')
        return v
    
    @field_validator('port')
    @classmethod
    def validate_port(cls, v):
        if not 1 <= v <= 65535:
            raise ValueError('ポート番号は1-65535の範囲である必要があります')
        return v
    
    @field_validator('timeout')
    @classmethod
    def validate_timeout(cls, v):
        if v <= 0:
            raise ValueError('タイムアウトは正の値である必要があります')
        return v
    
    @field_validator('max_connections')
    @classmethod
    def validate_max_connections(cls, v):
        if v <= 0:
            raise ValueError('最大接続数は正の値である必要があります')
        return v


class AppConfig(BaseModel):
    """アプリケーション設定"""
    host: str = Field(default="0.0.0.0", description="アプリケーションホスト")
    port: int = Field(default=8001, description="アプリケーションポート")
    debug: bool = Field(default=False, description="デバッグモード")
    secret_key: str = Field(default="", description="シークレットキー")
    session_timeout: int = Field(default=3600, description="セッションタイムアウト（秒）")
    max_file_size: int = Field(default=100 * 1024 * 1024, description="最大ファイルサイズ（バイト）")
    upload_dir: str = Field(default="./uploads", description="アップロードディレクトリ")
    
    @field_validator('port')
    @classmethod
    def validate_port(cls, v):
        if not 1 <= v <= 65535:
            raise ValueError('ポート番号は1-65535の範囲である必要があります')
        return v
    
    @field_validator('session_timeout')
    @classmethod
    def validate_session_timeout(cls, v):
        if v <= 0:
            raise ValueError('セッションタイムアウトは正の値である必要があります')
        return v
    
    @field_validator('max_file_size')
    @classmethod
    def validate_max_file_size(cls, v):
        if v <= 0:
            raise ValueError('最大ファイルサイズは正の値である必要があります')
        return v


class SecurityConfig(BaseModel):
    """セキュリティ設定"""
    enable_ssl: bool = Field(default=False, description="SSL有効化")
    cors_origins: list = Field(default=["*"], description="CORS許可オリジン")
    rate_limit: int = Field(default=100, description="レート制限（リクエスト/分）")
    password_min_length: int = Field(default=8, description="パスワード最小長")
    session_secure: bool = Field(default=False, description="セキュアセッション")
    allowed_file_types: list = Field(default=[".csv", ".xlsx", ".json"], description="許可ファイル形式")
    
    @field_validator('rate_limit')
    @classmethod
    def validate_rate_limit(cls, v):
        if v <= 0:
            raise ValueError('レート制限は正の値である必要があります')
        return v
    
    @field_validator('password_min_length')
    @classmethod
    def validate_password_min_length(cls, v):
        if v < 6:
            raise ValueError('パスワード最小長は6文字以上である必要があります')
        return v


class LogConfig(BaseModel):
    """ログ設定"""
    level: str = Field(default="INFO", description="ログレベル")
    format: str = Field(default="%(asctime)s - %(name)s - %(levelname)s - %(message)s", description="ログフォーマット")
    file_path: Optional[str] = Field(default="app.log", description="ログファイルパス")
    max_size: int = Field(default=10 * 1024 * 1024, description="最大ログファイルサイズ（バイト）")
    backup_count: int = Field(default=5, description="バックアップファイル数")
    enable_console: bool = Field(default=True, description="コンソール出力有効化")
    
    @field_validator('level')
    @classmethod
    def validate_level(cls, v):
        valid_levels = ['DEBUG', 'INFO', 'WARNING', 'ERROR', 'CRITICAL']
        if v.upper() not in valid_levels:
            raise ValueError(f'ログレベルは{valid_levels}のいずれかである必要があります')
        return v.upper()
    
    @field_validator('max_size')
    @classmethod
    def validate_max_size(cls, v):
        if v <= 0:
            raise ValueError('最大ログファイルサイズは正の値である必要があります')
        return v
    
    @field_validator('backup_count')
    @classmethod
    def validate_backup_count(cls, v):
        if v < 0:
            raise ValueError('バックアップファイル数は0以上の値である必要があります')
        return v


class Settings(BaseSettings):
    """アプリケーション設定クラス"""
    model_config = ConfigDict(
        env_file=".env",
        env_nested_delimiter="__",
        case_sensitive=False
    )
    
    database: DatabaseConfig = Field(default_factory=DatabaseConfig, description="データベース設定")
    app: AppConfig = Field(default_factory=AppConfig, description="アプリケーション設定")
    security: SecurityConfig = Field(default_factory=SecurityConfig, description="セキュリティ設定")
    log: LogConfig = Field(default_factory=LogConfig, description="ログ設定")


class ConfigManager:
    """設定管理クラス"""
    
    def __init__(self, config_file: Optional[str] = None):
        self.config_file = config_file or "config.json"
        self._settings: Optional[Settings] = None
        self._load_settings()
    
    def _load_settings(self) -> None:
        """設定を読み込み"""
        try:
            # 環境変数から基本設定を読み込み
            self._settings = Settings()
            
            # 設定ファイルが存在する場合は上書き
            if Path(self.config_file).exists():
                with open(self.config_file, 'r', encoding='utf-8') as f:
                    file_config = json.load(f)
                
                # 設定をマージ
                self._settings = self._merge_config(self._settings, file_config)
                
        except Exception as e:
            raise ConfigurationError(f"設定の読み込みに失敗しました: {str(e)}")
    
    def _merge_config(self, settings: Settings, file_config: Dict[str, Any]) -> Settings:
        """設定をマージ"""
        try:
            # 各セクションの設定をマージ
            if 'database' in file_config:
                settings.database = DatabaseConfig(**merge_dicts(
                    settings.database.model_dump(), file_config['database']
                ))
            
            if 'app' in file_config:
                settings.app = AppConfig(**merge_dicts(
                    settings.app.model_dump(), file_config['app']
                ))
            
            if 'security' in file_config:
                settings.security = SecurityConfig(**merge_dicts(
                    settings.security.model_dump(), file_config['security']
                ))
            
            if 'log' in file_config:
                settings.log = LogConfig(**merge_dicts(
                    settings.log.model_dump(), file_config['log']
                ))
            
            return settings
            
        except Exception as e:
            raise ConfigurationError(f"設定のマージに失敗しました: {str(e)}")
    
    def save_config(self, config_file: Optional[str] = None) -> None:
        """設定を保存"""
        try:
            file_path = config_file or self.config_file
            config_data = {
                'database': self._settings.database.model_dump(),
                'app': self._settings.app.model_dump(),
                'security': self._settings.security.model_dump(),
                'log': self._settings.log.model_dump()
            }
            
            with open(file_path, 'w', encoding='utf-8') as f:
                json.dump(config_data, f, indent=2, ensure_ascii=False)
                
        except Exception as e:
            raise ConfigurationError(f"設定の保存に失敗しました: {str(e)}")
    
    def get_settings(self) -> Settings:
        """設定を取得"""
        return self._settings
    
    def update_database_config(self, **kwargs) -> None:
        """データベース設定を更新"""
        current_config = self._settings.database.model_dump()
        updated_config = {**current_config, **kwargs}
        self._settings.database = DatabaseConfig(**updated_config)
    
    def update_app_config(self, **kwargs) -> None:
        """アプリケーション設定を更新"""
        current_config = self._settings.app.model_dump()
        updated_config = {**current_config, **kwargs}
        self._settings.app = AppConfig(**updated_config)
    
    def validate_config(self) -> bool:
        """設定を検証"""
        try:
            # 必須項目のチェック
            if not self._settings.database.host:
                raise ConfigurationError("データベースホストが設定されていません")
            
            if not self._settings.database.username:
                raise ConfigurationError("データベースユーザー名が設定されていません")
            
            # キーペア認証の場合はパスワードは不要
            # if not self._settings.database.password:
            #     raise ConfigurationError("データベースパスワードが設定されていません")
            
            if not self._settings.database.database:
                raise ConfigurationError("データベース名が設定されていません")
            
            # 各設定クラスのバリデーション
            self._settings.database.model_validate(self._settings.database.model_dump())
            self._settings.app.model_validate(self._settings.app.model_dump())
            self._settings.security.model_validate(self._settings.security.model_dump())
            self._settings.log.model_validate(self._settings.log.model_dump())
            
            return True
            
        except Exception as e:
            raise ConfigurationError(f"設定の検証に失敗しました: {str(e)}")


# グローバル設定インスタンス
_config_manager: Optional[ConfigManager] = None


def get_config_manager() -> ConfigManager:
    """設定管理を取得"""
    global _config_manager
    if _config_manager is None:
        _config_manager = ConfigManager()
    return _config_manager


def get_settings() -> Settings:
    """設定を取得"""
    return get_config_manager().get_settings()


def save_settings() -> None:
    """設定を保存"""
    get_config_manager().save_config()


def update_database_config(**kwargs) -> None:
    """データベース設定を更新"""
    get_config_manager().update_database_config(**kwargs)


def update_app_config(**kwargs) -> None:
    """アプリケーション設定を更新"""
    get_config_manager().update_app_config(**kwargs)


def validate_settings() -> bool:
    """設定を検証"""
    return get_config_manager().validate_config() 