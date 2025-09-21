# -*- coding: utf-8 -*-
"""
簡素化された設定管理モジュール（キーペア認証専用）
"""
from typing import Optional, List
from pydantic import Field, field_validator, ConfigDict, AliasChoices
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
    SNOWFLAKE_PROXY_HOST: str = Field(default="", description="Snowflakeプロキシホスト")
    SNOWFLAKE_PROXY_PORT: str = Field(default="", description="Snowflakeプロキシポート")
    
    # ODBC接続設定（キーペア認証またはパスワード認証）
    snowflake_odbc_dsn: Optional[str] = Field(default=None, description="ODBC DSN名")
    snowflake_password: Optional[str] = Field(default=None, description="Snowflakeパスワード（ODBC用）")
    snowflake_use_keypair: bool = Field(default=True, description="キーペア認証を使用するかどうか")
    
    # Oracle接続設定 (DSN-less対応)
    oracle_dsn: Optional[str] = Field(default=None, description="Oracle ODBC DSN名（D-lessの場合は不要）")
    oracle_driver: Optional[str] = Field(default=None, description="Oracle ODBCドライバ名")
    oracle_host: Optional[str] = Field(default=None, description="Oracleサーバーホスト名")
    oracle_port: Optional[int] = Field(default=1521, description="Oracleサーバーポート番号")
    oracle_service_name: Optional[str] = Field(default=None, description="Oracleサービス名")
    oracle_sid: Optional[str] = Field(default=None, description="Oracle SID")
    oracle_user: Optional[str] = Field(default=None, description="Oracleユーザー名")
    oracle_password: Optional[str] = Field(default=None, description="Oracleパスワード")
    
    # SQLite接続設定（環境変数 SQLITE_LOG_DB_PATH を優先）
    sqlite_db_path: str = Field(
        default="./logs/sql_logs.db",
        description="SQLiteデータベースファイルパス",
        validation_alias=AliasChoices('SQLITE_LOG_DB_PATH', 'sqlite_db_path')
    )
    sqlite_tool_name: str = Field(
        default="SQLDOJOWEB",
        description="SQLiteログで使用するTOOL_NAME（空文字でフィルタ無効化）",
        validation_alias=AliasChoices('SQLITE_TOOL_NAME', 'sqlite_tool_name')
    )

    # アプリケーション設定
    app_host: str = Field(default="0.0.0.0", description="アプリケーションホスト")
    app_port: int = Field(default=8001, description="アプリケーションポート")
    app_debug: bool = Field(default=False, description="デバッグモード")
    # CORS 設定（環境変数はカンマ区切りの文字列を受け取り、プロパティで List[str] に変換）
    cors_origins_raw: str = Field(
        default="http://localhost:5173,http://127.0.0.1:5173",
        description="CORS許可オリジンのカンマ区切り文字列",
        validation_alias=AliasChoices('CORS_ORIGINS', 'cors_origins')
    )
    
    # ログ設定
    log_level: str = Field(default="INFO", description="ログレベル")
    log_storage_type: str = Field(
        default="oracle",
        description="ログ保存先タイプ (oracle, sqlite, snowflake)",
        validation_alias=AliasChoices('LOG_STORAGE_TYPE', 'log_storage_type')
    )

    # Snowflakeログ用接続設定（キーペア認証）
    snowflake_log_account: Optional[str] = Field(default=None, description="Snowflakeログ用アカウント")
    snowflake_log_user: Optional[str] = Field(default=None, description="Snowflakeログ用ユーザー名")
    snowflake_log_private_key_path: Optional[str] = Field(default=None, description="Snowflakeログ用秘密鍵ファイルパス")
    snowflake_log_private_key_passphrase: Optional[str] = Field(default=None, description="Snowflakeログ用秘密鍵パスフレーズ")
    snowflake_log_warehouse: Optional[str] = Field(default=None, description="Snowflakeログ用ウェアハウス")
    snowflake_log_database: Optional[str] = Field(default=None, description="Snowflakeログ用データベース")
    snowflake_log_schema: str = Field(default="LOG", description="Snowflakeログ用スキーマ")
    snowflake_log_role: Optional[str] = Field(default=None, description="Snowflakeログ用ロール")
    snowflake_log_use_keypair: bool = Field(default=True, description="Snowflakeログ用キーペア認証を使用するかどうか")

    # 補完機能設定
    completion_target_schemas: List[str] = Field(default=["PUBLIC"], description="補完対象のスキーマリスト")
    
    # サーバー設定
    public_server_url: Optional[str] = Field(default=None, description="公開サーバーURL（IIS発行時用）")
    
    # 管理者設定
    admin_password: str = Field(..., description="管理者パスワード")
    
    # ページネーション設定
    default_page_size: int = Field(
        default=100, 
        description="デフォルトのページサイズ（表示件数）",
        validation_alias=AliasChoices('DEFAULT_PAGE_SIZE', 'default_page_size')
    )
    max_page_size: int = Field(default=1000, description="最大ページサイズ")
    
    # カーソル方式設定
    cursor_chunk_size: int = Field(
        default=1000, 
        description="カーソル方式での一度に取得する行数",
        validation_alias=AliasChoices('CURSOR_CHUNK_SIZE', 'cursor_chunk_size')
    )
    
    # タイムアウト設定
    query_timeout_seconds: int = Field(default=1200, description="SQLクエリ実行タイムアウト（秒）- 20分")
    connection_timeout_seconds: int = Field(default=30, description="データベース接続タイムアウト（秒）")
    api_timeout_seconds: int = Field(default=1320, description="API応答タイムアウト（秒）- 22分（クエリタイムアウト+2分）")
    http_client_timeout_seconds: int = Field(default=1320, description="HTTPクライアントタイムアウト（秒）- 22分")
    
    # 無限スクロール設定
    infinite_scroll_threshold: int = Field(default=200, description="無限スクロールで表示する最大件数")
    
    # 大容量データ処理設定
    max_records_for_display: int = Field(
        default=1000000, 
        description="画面表示を試みる最大レコード数の閾値",
        validation_alias=AliasChoices('MAX_RECORDS_FOR_DISPLAY', 'max_records_for_display')
    )
    max_records_for_csv_download: int = Field(
        default=10000000, 
        description="CSVダウンロードを許可する最大レコード数の閾値",
        validation_alias=AliasChoices('MAX_RECORDS_FOR_CSV_DOWNLOAD', 'max_records_for_csv_download')
    )
    # 追加: Excel / Clipboard / Chart 関連設定
    max_records_for_excel_download: int = Field(
        default=1000000, 
        description="Excelダウンロードを許可する最大レコード数の閾値",
        validation_alias=AliasChoices('MAX_RECORDS_FOR_EXCEL_DOWNLOAD', 'max_records_for_excel_download')
    )
    max_records_for_clipboard_copy: int = Field(
        default=50000, 
        description="クリップボードコピーを許可する最大レコード数の閾値",
        validation_alias=AliasChoices('MAX_RECORDS_FOR_CLIPBOARD_COPY', 'max_records_for_clipboard_copy')
    )
    max_rows_for_excel_chart: int = Field(default=100000, description="グラフ付きExcelを許容する最大行数（将来オプション）")
    
    # 履歴関連設定
    max_history_logs: int = Field(
        default=1000, 
        description="SQL履歴表示の最大件数",
        validation_alias=AliasChoices('MAX_HISTORY_LOGS', 'max_history_logs')
    )
    
    # キャッシュセッション自動クリーンアップ設定
    cache_cleanup_enabled: bool = Field(
        default=True, 
        description="キャッシュセッション自動クリーンアップの有効/無効",
        validation_alias=AliasChoices('CACHE_CLEANUP_ENABLED', 'cache_cleanup_enabled')
    )
    cache_cleanup_interval_minutes: int = Field(
        default=15, 
        description="キャッシュクリーンアップの実行間隔（分）",
        validation_alias=AliasChoices('CACHE_CLEANUP_INTERVAL_MINUTES', 'cache_cleanup_interval_minutes')
    )
    cache_session_timeout_minutes: int = Field(
        default=30, 
        description="セッションタイムアウト時間（分）",
        validation_alias=AliasChoices('CACHE_SESSION_TIMEOUT_MINUTES', 'cache_session_timeout_minutes')
    )
    cache_session_cleanup_hours: int = Field(
        default=12, 
        description="セッション削除までの時間（時間）",
        validation_alias=AliasChoices('CACHE_SESSION_CLEANUP_HOURS', 'cache_session_cleanup_hours')
    )

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
    
    @field_validator('log_storage_type')
    @classmethod
    def validate_log_storage_type(cls, v):
        valid_types = ['oracle', 'sqlite', 'snowflake']
        if v.lower() not in valid_types:
            raise ValueError(f'ログストレージタイプは{valid_types}のいずれかである必要があります')
        return v.lower()

    @property
    def cors_origins(self) -> List[str]:
        s = (self.cors_origins_raw or "").strip()
        if not s:
            return ["http://localhost:5173", "http://127.0.0.1:5173"]
        parts = [p.strip() for p in s.split(',')]
        return [p for p in parts if p]


# グローバル設定インスタンス
_settings: Optional[Settings] = None
settings = None  # 後方互換性のため


def get_settings() -> Settings:
    """設定を取得（シングルトン）"""
    global _settings, settings
    if _settings is None:
        try:
            _settings = Settings()
            settings = _settings  # 後方互換性のため
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
        'timeout': settings.connection_timeout_seconds,
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