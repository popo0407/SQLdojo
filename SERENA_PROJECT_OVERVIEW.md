# SQLdojo プロジェクト概要（Serena MCP ベース）

本ドキュメントは Serena MCP のシンボル解析とディレクトリ列挙結果に基づき、バックエンド(Python)とフロントエンド(React)の主要機能・クラス・データ構造を要約したものです。

## 1. ルート構成（抜粋）
- app/ … Python バックエンド（FastAPI ベース）
- sql-dojo-react/ … React + Vite + TypeScript
- .serena/project.yml … Serena 設定（language: python, ignore_all_files_in_gitignore: true）

## 2. バックエンド（app/）
### 2.1 エントリ/設定
- app/main.py
  - 関数: lifespan, add_process_time_header, login_page, root, admin_page, user_page, template_management_page, health_check
- app/config_simplified.py
  - クラス: Settings
  - 関数: get_settings, validate_settings, get_database_config, get_app_config, get_log_config
- app/dependencies.py
  - DI取得関数: get_app_settings, get_app_logger, get_sql_validator_di, get_metadata_cache_di, get_connection_manager_di, get_query_executor_di, get_sql_service_di, get_metadata_service_di, get_performance_service_di, get_export_service_di, get_completion_service_di, get_user_service_di, get_template_service_di, get_part_service_di, get_user_preference_service_di, get_cache_service_di, get_session_service_di, get_streaming_state_service_di, get_hybrid_sql_service_di, get_current_user, get_current_admin, get_connection_manager_oracle_di, get_query_executor_for_oracle_di, get_connection_manager_snowflake_log_di, get_query_executor_for_snowflake_log_di, get_sql_log_service_di, get_admin_service_di, get_visibility_control_service_di
- app/logger.py
  - クラス: PerformanceMonitor, Logger
  - 関数: get_logger, log_execution_time, clear_all_loggers, get_performance_metrics, log_user_action
- app/api/error_handlers.py
  - 関数: app_exception_handler, register_exception_handlers, validation_exception_handler, starlette_http_exception_handler, general_exception_handler

### 2.2 モデル/バリデーション
- app/api/models.py
  - Pydanticモデル群: UserLoginRequest, UserInfo, BusinessUserListResponse, BusinessUserRefreshResponse, SQLRequest, SQLResponse, SQLValidationRequest, SQLValidationResponse, SQLFormatRequest, SQLFormatResponse, SQLCompletionRequest, SQLCompletionItem, SQLCompletionResponse, SchemaInfo, TableInfo, ColumnInfo, TableDetailInfo, SchemaListResponse, TableListResponse, DownloadRequest, DownloadResponse, DownloadStatusResponse, HealthCheckResponse, ErrorResponse, PerformanceMetricsResponse, ExportRequest, ExportResponse, ExportHistoryResponse, ConnectionStatusResponse, TemplateRequest, TemplateResponse, PartRequest, PartResponse, TemplateDropdownResponse, PartDropdownResponse, UserRefreshResponse, AdminLoginRequest, SQLExecutionLog, SQLExecutionLogResponse, VisibilitySetting, SaveVisibilitySettingsRequest, SaveVisibilitySettingsDictRequest, UserTemplatePreference, UserPartPreference, UserTemplatePreferencesResponse, UserPartPreferencesResponse, UpdateTemplatePreferenceItem, UpdatePartPreferenceItem, UpdateTemplatePreferencesRequest, UpdatePartPreferencesRequest, UpdateTemplateRequest, CacheSQLRequest, CacheSQLResponse, CacheReadRequest, CacheReadResponse, SessionStatusResponse, CancelRequest, CancelResponse, CacheUniqueValuesRequest, CacheUniqueValuesResponse
- app/sql_validator.py
  - クラス: ValidationResult, SQLValidator
  - 関数: get_validator, validate_sql, format_sql, validate_sql_detailed

### 2.3 ルーティング
- app/api/routes.py
  - 主要エンドポイント: execute_sql_endpoint, validate_sql_endpoint, format_sql_endpoint, login, refresh_user_info, get_user_info, logout, get_current_user_info, admin_login, admin_logout, refresh_system_data, get_admin_templates, create_admin_template, delete_admin_template, get_admin_parts, create_admin_part, delete_admin_part, get_user_templates, create_user_template, delete_user_template, update_user_template, get_user_parts, create_user_part, delete_user_part, get_user_template_preferences, get_user_part_preferences, update_user_template_preferences, update_user_part_preferences, get_visible_templates_for_dropdown, get_visible_parts_for_dropdown, get_sql_logs, get_all_sql_logs, clear_user_sql_logs, clear_all_sql_logs, get_log_analytics, export_logs, get_all_metadata_raw_admin_endpoint, get_visibility_settings, get_visibility_settings_for_user, save_visibility_settings, get_all_metadata_endpoint, get_initial_metadata_endpoint, get_raw_metadata_endpoint, refresh_all_metadata_endpoint, get_connection_status_endpoint, get_performance_metrics_route, export_data_endpoint, get_schemas_endpoint, get_tables_endpoint, get_columns_endpoint, get_tables_legacy, get_columns_legacy, refresh_all_metadata_normalized_endpoint, clear_cache_endpoint, suggest_sql_endpoint, cleanup_cache_endpoint, get_user_history, execute_sql_with_cache_endpoint, read_cached_data_endpoint, get_session_status_endpoint, cancel_streaming_endpoint, cleanup_session_endpoint, cleanup_user_cache_endpoint, cleanup_current_user_cache_endpoint, get_config_settings, download_csv_endpoint, download_cached_csv_endpoint, get_cache_unique_values, get_business_users, refresh_business_users

### 2.4 サービス層（app/services/）
- SQL/クエリ実行
  - query_executor.py: クラス QueryResult, QueryExecutor
  - sql_service.py: クラス SQLExecutionResult, SQLService
  - hybrid_sql_service.py:（省略: 構成上存在）
  - connection_manager_*.py: ODBC/Oracle/Snowflake/SQLite 接続管理
- メタデータ/キャッシュ
  - metadata_service.py: クラス MetadataService
  - metadata_cache.py: クラス MetadataCache
  - cache_service.py: クラス CacheService
- セッション/ストリーミング
  - session_service.py: クラス SessionService
  - streaming_state_service.py:（省略: 構成上存在）
- ログ/分析/エクスポート
  - sql_log_service.py: クラス SQLLogService
  - performance_service.py: クラス PerformanceMetrics, PerformanceService（get_performance_metrics）
  - export_service.py: クラス ExportResult, ExportService
  - services/log_handlers/: base.py, oracle.py, snowflake.py, sqlite.py
- その他
  - completion_service.py, template_service.py, part_service.py, user_preference_service.py, user_service.py, admin_service.py, visibility_control_service.py, performance_service.py

### 2.5 ユーティリティ
- app/utils.py
  - 関数: generate_timestamp, format_datetime, safe_json_serialize, calculate_hash, validate_file_path, sanitize_filename, chunk_list, merge_dicts, get_nested_value, set_nested_value, format_file_size, format_duration, retry_on_exception

## 3. フロントエンド（sql-dojo-react/）
### 3.1 エントリ/構成
- src/main.tsx, src/App.tsx
- 設定類: vite.config.ts, tsconfig*.json, jest/vitest 設定

### 3.2 API/ページ
- src/api/apiClient.ts
  - クラス: ApiError
  - 定数/オブジェクト: success, apiClient
- src/pages/HomePage.tsx: コンポーネント HomePage
- src/pages/LoginPage.tsx: コンポーネント LoginPage
- 型: src/types/api.ts（APIレスポンス/リクエスト関連の型定義）

## 4. データ構造（代表）
- バックエンド: Pydanticモデル（各種*Request/*Response、SchemaInfo/TableInfo/ColumnInfoなど）、SQLExecutionResult、QueryResult、PerformanceMetrics、ExportResult
- フロント: TypeScript型（types/api.ts ほか）

## 5. アーキテクチャ概要
- バックエンド: FastAPI + DI（dependencies.py）でサービス層を注入。routes.py がAPIを集約し、services配下で機能を分離（SQL実行、メタデータ、キャッシュ、セッション、ログ、可視性制御など）。設定はconfig_simplified.py、例外/ログはerror_handlers.py/logger.pyで集中管理。
- フロント: React + Vite + TS。apiClientを介してバックエンドと通信し、ページ/コンポーネントで表示・操作。types下で型を統一。

## 6. 環境・運用メモ
- .serena/project.yml: language=python、.gitignore尊重（ignore_all_files_in_gitignore: true）
- .env: APP_PORT, CORS_ORIGINS など（Vite開発サーバはAPP_PORTにプロキシ; 機微情報は本番での取り扱い注意）

以上。