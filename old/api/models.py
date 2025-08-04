# -*- coding: utf-8 -*-
"""
APIモデル定義
FastAPIで使用するPydanticモデル
"""
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field
from datetime import datetime
import time
from app.config_simplified import get_settings

# 設定を取得
settings = get_settings()


class UserLoginRequest(BaseModel):
    user_id: str


class UserInfo(BaseModel):
    user_id: str
    user_name: str


class SQLRequest(BaseModel):
    """SQL実行リクエスト"""
    sql: str = Field(..., description="実行するSQL")
    limit: Optional[int] = Field(default=5000, description="結果の最大件数")


class SQLResponse(BaseModel):
    """SQL実行レスポンス"""
    success: bool = Field(..., description="実行成功フラグ")
    data: Optional[List[Dict[str, Any]]] = Field(default=None, description="実行結果データ")
    columns: Optional[List[str]] = Field(default=None, description="カラム名リスト")
    row_count: Optional[int] = Field(default=None, description="取得件数")
    execution_time: Optional[float] = Field(default=None, description="実行時間（秒）")
    error_message: Optional[str] = Field(default=None, description="エラーメッセージ")
    sql: str = Field(..., description="実行したSQL")


class SQLValidationRequest(BaseModel):
    """SQLバリデーションリクエスト"""
    sql: str = Field(..., description="バリデーション対象のSQL")


class SQLValidationResponse(BaseModel):
    """SQLバリデーションレスポンス"""
    is_valid: bool = Field(..., description="バリデーション結果")
    errors: List[str] = Field(default=[], description="エラーメッセージリスト")
    warnings: List[str] = Field(default=[], description="警告メッセージリスト")
    suggestions: List[str] = Field(default=[], description="提案メッセージリスト")


class SQLFormatRequest(BaseModel):
    """SQL整形リクエスト"""
    sql: str = Field(..., description="整形対象のSQL")


class SQLFormatResponse(BaseModel):
    """SQL整形レスポンス"""
    formatted_sql: str = Field(..., description="整形されたSQL")
    success: bool = Field(..., description="整形成功フラグ")
    error_message: Optional[str] = Field(default=None, description="エラーメッセージ")


class SQLCompletionRequest(BaseModel):
    """SQL補完リクエスト"""
    sql: str = Field(..., description="現在のSQLクエリ")
    position: int = Field(..., description="カーソル位置")
    context: Optional[Dict[str, Any]] = Field(default=None, description="補完コンテキスト")


class SQLCompletionItem(BaseModel):
    """SQL補完アイテム"""
    label: str = Field(..., description="表示ラベル")
    kind: str = Field(..., description="アイテム種別（keyword, table, column, schema等）")
    detail: Optional[str] = Field(default=None, description="詳細説明")
    documentation: Optional[str] = Field(default=None, description="ドキュメント")
    insert_text: Optional[str] = Field(default=None, description="挿入テキスト")
    sort_text: Optional[str] = Field(default=None, description="ソート用テキスト")


class SQLCompletionResponse(BaseModel):
    """SQL補完レスポンス"""
    suggestions: List[SQLCompletionItem] = Field(default=[], description="補完候補リスト")
    is_incomplete: bool = Field(default=False, description="候補が不完全かどうか")


class SchemaInfo(BaseModel):
    """スキーマ情報"""
    name: str = Field(..., description="スキーマ名")
    created_on: Optional[datetime] = Field(default=None, description="作成日時")
    is_default: bool = Field(default=False, description="デフォルトスキーマフラグ")


class TableInfo(BaseModel):
    """テーブル情報"""
    name: str = Field(..., description="テーブル名")
    schema_name: str = Field(..., description="スキーマ名")
    table_type: str = Field(..., description="テーブルタイプ（TABLE/VIEW）")
    row_count: Optional[int] = Field(default=None, description="行数")
    created_on: Optional[datetime] = Field(default=None, description="作成日時")
    last_altered: Optional[datetime] = Field(default=None, description="最終更新日時")
    comment: Optional[str] = Field(default=None, description="コメント")


class ColumnInfo(BaseModel):
    """カラム情報"""
    name: str = Field(..., description="カラム名")
    data_type: str = Field(..., description="データ型")
    is_nullable: bool = Field(..., description="NULL許可フラグ")
    default_value: Optional[str] = Field(default=None, description="デフォルト値")
    comment: Optional[str] = Field(default=None, description="コメント")


class TableDetailInfo(BaseModel):
    """テーブル詳細情報"""
    table: TableInfo = Field(..., description="テーブル情報")
    columns: List[ColumnInfo] = Field(default=[], description="カラム情報リスト")


class SchemaListResponse(BaseModel):
    """スキーマ一覧レスポンス"""
    schemas: List[SchemaInfo] = Field(default=[], description="スキーマ情報リスト")
    total_count: int = Field(..., description="総件数")


class TableListResponse(BaseModel):
    """テーブル一覧レスポンス"""
    tables: List[TableInfo] = Field(default=[], description="テーブル情報リスト")
    schema_name: str = Field(..., description="スキーマ名")
    total_count: int = Field(..., description="総件数")


class DownloadRequest(BaseModel):
    """ダウンロードリクエスト"""
    sql: str = Field(..., description="実行するSQL")
    file_name: Optional[str] = Field(default=None, description="ファイル名")
    format: str = Field(default="csv", description="ファイル形式（csv）")


class DownloadResponse(BaseModel):
    """ダウンロードレスポンス"""
    task_id: str = Field(..., description="タスクID")
    status: str = Field(..., description="ステータス（pending/processing/completed/failed）")
    message: Optional[str] = Field(default=None, description="メッセージ")
    download_url: Optional[str] = Field(default=None, description="ダウンロードURL")


class DownloadStatusResponse(BaseModel):
    """ダウンロードステータスレスポンス"""
    task_id: str = Field(..., description="タスクID")
    status: str = Field(..., description="ステータス")
    progress: Optional[float] = Field(default=None, description="進捗率（0-100）")
    total_rows: Optional[int] = Field(default=None, description="総行数")
    processed_rows: Optional[int] = Field(default=None, description="処理済み行数")
    download_url: Optional[str] = Field(default=None, description="ダウンロードURL")
    error_message: Optional[str] = Field(default=None, description="エラーメッセージ")


class HealthCheckResponse(BaseModel):
    """ヘルスチェックレスポンス"""
    status: str = Field(..., description="ステータス")
    timestamp: float = Field(..., description="タイムスタンプ（UNIX時間）")
    version: str = Field(..., description="アプリケーションバージョン")
    connection_status: Dict[str, Any] = Field(..., description="接続状態詳細")
    performance_metrics: Dict[str, Any] = Field(..., description="パフォーマンスメトリクス")


class ErrorResponse(BaseModel):
    """エラーレスポンス"""
    error: str = Field(..., description="エラーメッセージ")
    detail: Optional[str] = Field(default=None, description="詳細情報")
    timestamp: float = Field(default_factory=time.time, description="エラー発生時刻（UNIX時間）")


class PerformanceMetricsResponse(BaseModel):
    """パフォーマンスメトリクスレスポンス"""
    timestamp: float = Field(..., description="取得時刻（UNIX時間）")
    metrics: Dict[str, Any] = Field(..., description="メトリクス詳細")


class ExportRequest(BaseModel):
    """エクスポートリクエスト"""
    sql: Optional[str] = Field(default=None, description="エクスポート対象のSQL")
    data: List[Dict[str, Any]] = Field(default=[], description="エクスポートするデータ（SQLがない場合に使用）")
    columns: Optional[List[str]] = Field(default=None, description="カラム順序")
    filename: Optional[str] = Field(default="export", description="ファイル名")
    format: str = Field(default="csv", description="エクスポート形式（csv）")


class ExportResponse(BaseModel):
    """エクスポートレスポンス"""
    success: bool = Field(description="エクスポート結果")
    download_url: Optional[str] = Field(default=None, description="ファイルダウンロード用URL（ステージ経由）")
    filename: Optional[str] = Field(default=None, description="ファイル名")
    error_message: Optional[str] = Field(default=None, description="エラーメッセージ")


class ExportHistoryResponse(BaseModel):
    """エクスポート履歴レスポンス"""
    history: List[Dict[str, Any]] = Field(description="エクスポート履歴")
    owner: str = Field(description="所有者")
    comment: str = Field(description="コメント")
    is_default: bool = Field(description="デフォルトデータベースかどうか")
    is_current: bool = Field(description="現在のデータベースかどうか")


class ConnectionStatusResponse(BaseModel):
    """接続状態レスポンス"""
    connected: bool = Field(..., description="接続状態")
    detail: Dict[str, Any] = Field(..., description="接続詳細情報")


class TemplateRequest(BaseModel):
    name: str = Field(..., description="テンプレート名")
    sql: str = Field(..., description="SQL文")


class TemplateResponse(BaseModel):
    id: str = Field(..., description="テンプレートID")
    name: str = Field(..., description="テンプレート名")
    sql: str = Field(..., description="SQL文")
    created_at: str = Field(..., description="作成日時")


class PartRequest(BaseModel):
    name: str = Field(..., description="パーツ名")
    sql: str = Field(..., description="SQL文")


class PartResponse(BaseModel):
    id: str = Field(..., description="パーツID")
    name: str = Field(..., description="パーツ名")
    sql: str = Field(..., description="SQL文")
    created_at: str = Field(..., description="作成日時")


class TemplateDropdownResponse(BaseModel):
    """ドロップダウン用テンプレートレスポンス"""
    id: str = Field(..., description="テンプレートID")
    name: str = Field(..., description="テンプレート名")
    sql: str = Field(..., description="SQL文")
    type: str = Field(..., description="テンプレート種別 (user/admin)")
    is_common: bool = Field(default=False, description="共通テンプレートかどうか")


class PartDropdownResponse(BaseModel):
    """ドロップダウン用パーツレスポンス"""
    id: str = Field(..., description="パーツID")
    name: str = Field(..., description="パーツ名")
    sql: str = Field(..., description="SQL文")
    type: str = Field(..., description="パーツ種別 (user/admin)")
    is_common: bool = Field(default=False, description="共通パーツかどうか")


class UserRefreshResponse(BaseModel):
    message: str = Field(..., description="更新メッセージ")
    user_count: int = Field(..., description="更新されたユーザー数")


class AdminLoginRequest(BaseModel):
    password: str = Field(..., description="管理者パスワード")


class SQLExecutionLog(BaseModel):
    """SQL実行ログ"""
    log_id: str = Field(..., description="ログID")
    user_id: str = Field(..., description="ユーザーID")
    sql: str = Field(..., description="実行されたSQL")
    execution_time: float = Field(..., description="実行時間（秒）")
    row_count: int = Field(..., description="取得行数")
    success: bool = Field(..., description="実行成功フラグ")
    error_message: Optional[str] = Field(None, description="エラーメッセージ")
    timestamp: datetime = Field(..., description="実行日時")


class SQLExecutionLogResponse(BaseModel):
    """SQL実行ログレスポンス"""
    logs: List[SQLExecutionLog] = Field(..., description="ログ一覧")
    total_count: int = Field(..., description="総件数")


class VisibilitySetting(BaseModel):
    object_name: str = Field(..., description="オブジェクト名（スキーマ名またはテーブル名）")
    role_name: str = Field(..., description="ロール名")
    is_visible: bool = Field(..., description="表示フラグ")


class SaveVisibilitySettingsRequest(BaseModel):
    settings: List[VisibilitySetting] = Field(..., description="表示設定リスト")


# ユーザー表示設定用のモデル
class UserTemplatePreference(BaseModel):
    """ユーザーテンプレート表示設定"""
    template_id: str = Field(..., description="テンプレートID")
    name: str = Field(..., description="テンプレート名")
    sql: str = Field(..., description="SQL文")
    created_at: str = Field(..., description="作成日時")
    type: str = Field(..., description="テンプレート種別（user/admin）")
    is_common: bool = Field(default=False, description="共通テンプレートかどうか")
    display_order: int = Field(..., description="表示順序")
    is_visible: bool = Field(..., description="表示フラグ")


class UserPartPreference(BaseModel):
    """ユーザーパーツ表示設定"""
    part_id: str = Field(..., description="パーツID")
    name: str = Field(..., description="パーツ名")
    sql: str = Field(..., description="SQL文")
    created_at: str = Field(..., description="作成日時")
    type: str = Field(..., description="パーツ種別（user/admin）")
    is_common: bool = Field(default=False, description="共通パーツかどうか")
    display_order: int = Field(..., description="表示順序")
    is_visible: bool = Field(..., description="表示フラグ")


class UserTemplatePreferencesResponse(BaseModel):
    """ユーザーテンプレート表示設定レスポンス"""
    templates: List[UserTemplatePreference] = Field(..., description="テンプレート表示設定リスト")


class UserPartPreferencesResponse(BaseModel):
    """ユーザーパーツ表示設定レスポンス"""
    parts: List[UserPartPreference] = Field(..., description="パーツ表示設定リスト")


class UpdateTemplatePreferenceItem(BaseModel):
    """テンプレート表示設定更新アイテム"""
    template_id: str = Field(..., description="テンプレートID")
    template_type: str = Field(..., description="テンプレート種別（user/admin）")
    display_order: int = Field(..., description="表示順序")
    is_visible: bool = Field(..., description="表示フラグ")


class UpdatePartPreferenceItem(BaseModel):
    """パーツ表示設定更新アイテム"""
    part_id: str = Field(..., description="パーツID")
    part_type: str = Field(..., description="パーツ種別（user/admin）")
    display_order: int = Field(..., description="表示順序")
    is_visible: bool = Field(..., description="表示フラグ")


class UpdateTemplatePreferencesRequest(BaseModel):
    """テンプレート表示設定更新リクエスト"""
    preferences: List[UpdateTemplatePreferenceItem] = Field(..., description="表示設定リスト")


class UpdatePartPreferencesRequest(BaseModel):
    """パーツ表示設定更新リクエスト"""
    preferences: List[UpdatePartPreferenceItem] = Field(..., description="表示設定リスト")


class UpdateTemplateRequest(BaseModel):
    """テンプレート更新リクエスト"""
    name: str = Field(..., description="テンプレート名")
    sql: str = Field(..., description="SQL文")


# キャッシュ機能用のモデル
class CacheSQLRequest(BaseModel):
    """キャッシュSQL実行リクエスト"""
    sql: str = Field(..., description="実行するSQL")
    limit: Optional[int] = Field(default=None, description="結果の最大件数")
    editor_id: Optional[str] = Field(default=None, description="エディタID")


class CacheSQLResponse(BaseModel):
    """キャッシュSQL実行レスポンス"""
    success: bool = Field(..., description="実行成功フラグ")
    session_id: Optional[str] = Field(default=None, description="セッションID")
    total_count: Optional[int] = Field(default=None, description="総件数")
    processed_rows: Optional[int] = Field(default=None, description="処理済み件数")
    execution_time: Optional[float] = Field(default=None, description="実行時間（秒）")
    message: Optional[str] = Field(default=None, description="メッセージ")
    error_message: Optional[str] = Field(default=None, description="エラーメッセージ")


class CacheReadRequest(BaseModel):
    """キャッシュ読み出しリクエスト"""
    session_id: str = Field(..., description="セッションID")
    page: int = Field(default=1, description="ページ番号")
    page_size: int = Field(default=settings.default_page_size, description="1ページあたりの件数")  # 設定ファイルから取得
    filters: Optional[Dict[str, List[str]]] = Field(default=None, description="フィルタ条件")
    sort_by: Optional[str] = Field(default=None, description="ソート対象カラム")
    sort_order: str = Field(default="ASC", description="ソート順序")


class CacheReadResponse(BaseModel):
    """キャッシュ読み出しレスポンス"""
    success: bool = Field(..., description="取得成功フラグ")
    data: Optional[List[List[Any]]] = Field(default=None, description="データ")
    columns: Optional[List[str]] = Field(default=None, description="カラム名リスト")
    total_count: Optional[int] = Field(default=None, description="総件数")
    page: Optional[int] = Field(default=None, description="現在のページ")
    page_size: Optional[int] = Field(default=None, description="ページサイズ")
    total_pages: Optional[int] = Field(default=None, description="総ページ数")
    session_info: Optional[Dict[str, Any]] = Field(default=None, description="セッション情報")
    execution_time: Optional[float] = Field(default=None, description="実行時間（秒）")
    error_message: Optional[str] = Field(default=None, description="エラーメッセージ")


class SessionStatusResponse(BaseModel):
    """セッション状態レスポンス"""
    session_id: str = Field(..., description="セッションID")
    status: str = Field(..., description="ステータス")
    total_count: Optional[int] = Field(default=None, description="総件数")
    processed_count: Optional[int] = Field(default=None, description="処理済み件数")
    progress_percentage: Optional[float] = Field(default=None, description="進捗率")
    is_complete: bool = Field(default=False, description="完了フラグ")
    error_message: Optional[str] = Field(default=None, description="エラーメッセージ")


class CancelRequest(BaseModel):
    """キャンセルリクエスト"""
    session_id: str = Field(..., description="セッションID")


class CancelResponse(BaseModel):
    """キャンセルレスポンス"""
    success: bool = Field(..., description="キャンセル成功フラグ")
    message: Optional[str] = Field(default=None, description="メッセージ")
    error_message: Optional[str] = Field(default=None, description="エラーメッセージ")