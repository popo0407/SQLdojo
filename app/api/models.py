# -*- coding: utf-8 -*-
"""
APIモデル定義
FastAPIで使用するPydanticモデル
"""
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field
from datetime import datetime
import time


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


class WarehouseInfo(BaseModel):
    """ウェアハウス情報"""
    name: str = Field(description="ウェアハウス名")
    size: str = Field(description="サイズ")
    type: str = Field(description="タイプ")
    running: int = Field(description="実行中クエリ数")
    queued: int = Field(description="待機中クエリ数")
    is_default: bool = Field(description="デフォルトウェアハウスかどうか")
    is_current: bool = Field(description="現在のウェアハウスかどうか")


class DatabaseInfo(BaseModel):
    """データベース情報"""
    name: str = Field(description="データベース名")
    created_on: str = Field(description="作成日時")
    owner: str = Field(description="所有者")
    comment: str = Field(description="コメント")
    is_default: bool = Field(description="デフォルトデータベースかどうか")
    is_current: bool = Field(description="現在のデータベースかどうか")


class ConnectionStatusResponse(BaseModel):
    """接続状態レスポンス"""
    connected: bool = Field(..., description="接続状態")
    detail: Dict[str, Any] = Field(..., description="接続詳細情報") 