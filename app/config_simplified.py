# -*- coding: utf-8 -*-
"""
簡素化された設定管理モジュール（キーペア認証専用）
"""
import os
from typing import Optional, List
from pydantic import Field, field_validator, ConfigDict
from pydantic_settings import BaseSettings
from dotenv import load_dotenv

from app.exceptions import ConfigurationError

# .envファイルを明示的に読み込み
load_dotenv()


class Settings(BaseSettings):
    """アプリケーション設定クラス - キーペア認証専用"""
    model_config = ConfigDict(
        env_file=".env",
        case_sensitive=False,
        extra="ignore"  # 未定義の環境変数を無視
    )
    
    # Snowflake接続設定（キーペア認証）
    snowflake_account: str = Field(..., description="Snowflakeアカウント")
    snowflake_user: str = Field(..., description="Snowflakeユーザー名")
    snowflake_private_key_path: str = Field(..., description="秘密鍵ファイルパス")
    snowflake_private_key_passphrase: str = Field(..., description="秘密鍵パスフレーズ")
    snowflake_warehouse: str = Field(default="COMPUTE_WH", description="Snowflakeウェアハウス")
    snowflake_database: str = Field(..., description="Snowflakeデータベース")
    snowflake_schema: str = Field(default="PUBLIC", description="Snowflakeスキーマ")
    snowflake_role: str = Field(default="", description="Snowflakeロール")
    
    # ODBC接続設定（キーペア認証またはパスワード認証）
    snowflake_odbc_dsn: Optional[str] = Field(default=None, description="ODBC DSN名")
    snowflake_password: Optional[str] = Field(default=None, description="Snowflakeパスワード（ODBC用）")
    snowflake_use_keypair: bool = Field(default=True, description="キーペア認証を使用するかどうか")
    
    # アプリケーション設定
    app_host: str = Field(default="0.0.0.0", description="アプリケーションホスト")
    app_port: int = Field(default=8000, description="アプリケーションポート")
    app_debug: bool = Field(default=False, description="デバッグモード")
    
    # ログ設定
    log_level: str = Field(default="INFO", description="ログレベル")

    # 補完機能設定
    completion_target_schemas: List[str] = Field(default=["PUBLIC"], description="補完対象のスキーマリスト")
    
    @field_validator('snowflake_account')
    @classmethod
    def validate_snowflake_account(cls, v):
        if not v:
            raise ValueError('Snowflakeアカウントは必須です')
        return v
    
    @field_validator('snowflake_user')
    @classmethod
    def validate_snowflake_user(cls, v):
        if not v:
            raise ValueError('Snowflakeユーザー名は必須です')
        return v
    
    @field_validator('snowflake_private_key_path')
    @classmethod
    def validate_private_key_path(cls, v):
        if not v:
            raise ValueError('秘密鍵ファイルパスは必須です')
        return v
    
    @field_validator('snowflake_private_key_passphrase')
    @classmethod
    def validate_private_key_passphrase(cls, v):
        if not v:
            raise ValueError('秘密鍵パスフレーズは必須です')
        return v
    
    @field_validator('snowflake_database')
    @classmethod
    def validate_snowflake_database(cls, v):
        if not v:
            raise ValueError('Snowflakeデータベース名は必須です')
        return v
    
    @field_validator('app_port')
    @classmethod
    def validate_app_port(cls, v):
        if not 1 <= v <= 65535:
            raise ValueError('ポート番号は1-65535の範囲である必要があります')
        return v
    
    @field_validator('log_level')
    @classmethod
    def validate_log_level(cls, v):
        valid_levels = ['DEBUG', 'INFO', 'WARNING', 'ERROR', 'CRITICAL']
        if v.upper() not in valid_levels:
            raise ValueError(f'ログレベルは{valid_levels}のいずれかである必要があります')
        return v.upper()


# グローバル設定インスタンス
_settings: Optional[Settings] = None


def get_settings() -> Settings:
    """設定を取得（シングルトン）"""
    global _settings
    if _settings is None:
        try:
            _settings = Settings()
        except Exception as e:
            raise ConfigurationError(f"設定の読み込みに失敗しました: {str(e)}")
    return _settings


def validate_settings() -> bool:
    """設定を検証"""
    try:
        settings = get_settings()
        # Pydanticの自動バリデーションが実行される
        return True
    except Exception as e:
        raise ConfigurationError(f"設定の検証に失敗しました: {str(e)}")


# 後方互換性のためのエイリアス関数
def get_database_config():
    """データベース設定を取得（後方互換性）"""
    settings = get_settings()
    return type('DatabaseConfig', (), {
        'host': settings.snowflake_account,
        'username': settings.snowflake_user,
        'private_key_path': settings.snowflake_private_key_path,
        'private_key_passphrase': settings.snowflake_private_key_passphrase,
        'warehouse': settings.snowflake_warehouse,
        'database': settings.snowflake_database,
        'db_schema': settings.snowflake_schema,
        'role': settings.snowflake_role,
        'timeout': 30,
        'max_connections': 10
    })()


def get_app_config():
    """アプリケーション設定を取得（後方互換性）"""
    settings = get_settings()
    return type('AppConfig', (), {
        'host': settings.app_host,
        'port': settings.app_port,
        'debug': settings.app_debug
    })()


def get_log_config():
    """ログ設定を取得（後方互換性）"""
    settings = get_settings()
    return type('LogConfig', (), {
        'level': settings.log_level
    })() 