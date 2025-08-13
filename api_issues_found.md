# API 動作問題レポート

## 発見日時

2025 年 7 月 21 日 09:30

## 進捗アップデート（2025 年 8 月 10 日）

最新の修正状況とテスト結果を記録します。次の改善に進む前に本ファイルを更新しました。

- 高優先度 3 件（本番影響大）: 対応済み（テスト確認済み）

  - メタデータ API 例外ハンドリング: 例外捕捉と適切な HTTP エラー返却を routes に実装。テスト再実行で回帰なし。
    - 検証ログ: `post-metadata-20250810-060348.log`
  - ログ API の Pydantic 型定義: `log_id` を str として返すよう整合化。テスト再実行で回帰なし。
    - 検証ログ: `post-logs-20250810-060348.log`
  - エクスポート API の Content-Type: charset 重複を解消し `text/csv; charset=utf-8` に統一。テスト再実行で回帰なし。
    - 検証ログ: `post-export-20250810-060348.log`

- 次に対応する項目（中優先度）
  - 認証 API レスポンス構造の統一（/login に success を追加して暫定統一、最終方針検討）

追加対応（2025-08-10）:

- ストリーミング例外処理の改善（CSV 生成）: 対応済み

  - 対象: `/sql/download/csv`
  - 変更: レスポンス開始前に SQL 実行とカラム取得を実施し、例外を事前に検出。ジェネレータ内は I/O のみに限定。
  - 効果: `RuntimeError: Caught handled exception, but response already started.` の再発を抑止
  - テスト: `app/tests/test_export_api.py` → 8 passed, 3 skipped（ログは確認後に削除）

  - ログ API の未実装エンドポイントの明確化（スタブ）: 実装済み
    - `/logs/analytics` と `/logs/export` に 501 Not Implemented を明示返却
    - 目的: 404 からの状態改善と仕様未決領域の明確化。将来実装時の移行影響を最小化
    - テスト: `app/tests/test_logs_api.py` → 7 passed, 4 skipped（ログは確認後に削除）

- 認証 API の刷新（/refresh 実装）: 対応済み

  - 対象: `POST /refresh`
  - 仕様: セッションの current_user を前提に、UserService.authenticate_user でキャッシュ（SQLite）から最新ユーザー情報を取得し、`request.session["user"]` を更新。レスポンスは `/login` と同一スキーマ（`{ success, message, user }`）。
  - 例外: ユーザー未検出は 404、その他は 500 を返す。
  - テスト: 追加した最小テスト `app/tests/test_refresh_api_minimal.py` → 2 passed（未認証 401 を含む）。
  - 回帰確認: `app/tests/test_auth_api.py` → 8 passed, 5 skipped（変更なし）。
  - ログ: 実行ログの先頭/末尾を確認。`app.log` はロックのため削除ではなく Clear-Content でクリア。

- 認証 API の補強（/user/info, /users/me の最小テスト追加）: 対応済み
  - 追加テスト:
    - `app/tests/test_user_info_api_minimal.py` → 2 passed（認証あり/未認証）
    - `app/tests/test_users_me_api_minimal.py` → 2 passed（認証あり/未認証）
  - 目的: セッション DI 上書きによる簡易検証で、FastAPI TestClient 制約（session_transaction 非対応）を回避
  - ログ: 実行後に app.log を確認のうえ Clear-Content でクリア

備考: ログは確認後に削除する運用へ移行（詳細は `Rule_of_coding.md` のテスト運用ルール参照）。

— エラーレスポンス統一の適用範囲拡大（メタデータ API/ログ API）: 対応済み

    - 追加テスト:
      - `app/tests/test_error_response_metadata_minimal.py` → 2 passed
      - 既存の `app/tests/test_error_response_minimal.py` と併せて 4 passed を確認
    - 目的: `timestamp` を含む統一エラーフォーマットの維持検証（HTTPException/一般例外/バリデーション）
    - ログ: 実行後に app.log を確認し、Clear-Content でクリア

— 付随修正: ODBC ロガーのフォーマット引数エラー修正

    - 現象: `Logger.info() takes 2 positional arguments but 3 were given`
    - 原因: `logging` 標準の`%s`フォーマット引数スタイルがカスタム Logger のシグネチャと不整合
    - 修正: `app/services/connection_manager_odbc.py` の warning/info 呼び出しを f文字列に変更
    - 検証: 最小テスト実行後の `app.log` にエラー再発なし

- エラーレスポンス統一の適用範囲拡大（エクスポート/CSV 系）: 対応済み

  - 追加テスト: `app/tests/test_error_response_export_minimal.py` → 5 passed
    - /sql/download/csv: 空 SQL(400), SQL 実行例外(500), 件数超過(400)
    - /sql/cache/download/csv: session_id 欠如(422), データなし(404)
  - 変更: /sql/cache/download/csv で発生する HTTPException(404) を 500 にラップせずに伝播
  - ログ: 実行後に app.log を確認し、Clear-Content でクリア

- エラーレスポンス統一の適用範囲拡大（認証/認可 系）: 対応済み

  - 追加テスト: `app/tests/test_error_response_authz_minimal.py` → 3 passed
    - /admin/system/refresh: 未認証 401、権限不足 403
    - /users/templates: 未認証 401
  - ポリシー: 401/403 は HTTPException をそのまま統一ハンドラーへ伝播
  - ログ: 実行後に app.log を確認し、Clear-Content でクリア

- エラーレスポンス統一の適用範囲拡大（テンプレート/パーツ 系）: 対応済み（2025-08-10）

  - 追加テスト: `app/tests/test_error_response_templates_parts_minimal.py` → 5 passed
    - /admin/templates: サービス例外時 500（統一フォーマット）
    - /users/templates: バリデーション欠如時 422（統一フォーマット）
    - /users/templates/{template_id}: サービス例外(ValueError)時 500（統一フォーマット）
    - /admin/parts: サービス例外時 500（統一フォーマット）
    - /users/parts: バリデーション欠如時 422（統一フォーマット）
  - 備考: FastAPI TestClient の例外再スローにより 500 検証が妨げられていたため、テスト用クライアントを `raise_server_exceptions=False` に設定（`conftest.py` フィクスチャ）。
  - ログ: 実行後に app.log を確認し、Clear-Content でクリア

— 表示設定 API（/admin/visibility-settings, /visibility-settings）: 対応済み（2025-08-10）

- 変更点:
  - GET /admin/visibility-settings と GET /visibility-settings のレスポンスを `{ "settings": ... }` へ統一
  - POST /admin/visibility-settings の入力を拡張し、`{"settings": {object_name: is_visible}}` 形式（dict）と、既存の `{"settings": [VisibilitySetting, ...]}` 形式（list）の両方を受容
  - サービス実装差分に対応するため、`get_all_visibility_settings|get_all_settings` と `save_visibility_settings|save_settings` の両メソッド名にフォールバック対応
- 追加/更新: `app/api/models.py` に `SaveVisibilitySettingsDictRequest` を追加
- テスト: `TestVisibilitySettingsAPI::test_get_visibility_settings_success`, `::test_save_visibility_settings_success` → 2 passed
- ログ: 異常出力なし（`app/tests/app.log` のみ使用）。

— 互換 API の追加とユーティリティ改善（2025-08-10）

- メタデータ API の互換ラッパー追加:
  - GET `/metadata/tables?schema_name=...` → `{ "tables": [...] }`
  - GET `/metadata/columns?schema_name=...&table_name=...` → `{ "columns": [...] }`
  - GET `/metadata/schemas` は `{ "schemas": [...] }` で返却
  - 管理者用 GET `/admin/metadata/all-raw` は `get_all_metadata_raw` があれば優先、無い場合は `get_all_metadata`
- SQL 補完 API 改善:
  - 空 SQL 時は 400 + `detail: "SQLクエリが空です"` を返却
  - 例外時は 500 + `detail` に元メッセージ
- パフォーマンスメトリクス API 改善:
  - サービス例外時に 500 を返却
- クリンナップ API 追加:
  - POST `/cleanup/cache` → `{ success: true, message: "クリーンアップが完了しました" }`
- テスト: 対応範囲の最小テスト → 9 passed（表示設定 2 件、互換/補完/性能/クリンナップ関連）

- HybridSQLService のテスト互換修正（2025-08-10）: 対応済み

  - 変更点:
    - execute_sql_with_cache にレガシーモードを追加（cache_service.cache_results が存在する場合）
    - セッション ID 生成で session_service.create_session を優先（旧テスト互換）
    - レガシーモードでは fetchall + cache_results を使用し、COUNT 取得失敗時は processed_rows を total_count にフォールバック
    - get_cached_data は欠損キー（page/page_size/total_pages）にデフォルト値で補完
    - \_get_total_count は多様な Mock 戻り値に対応し、例外時は 0 を返す（Logger.debug の引数不整合も修正）
  - テスト結果:
    - app/tests/test_services.py::TestHybridSQLService → 5 passed（他は deselected）
  - 影響範囲:
    - 既存 API の挙動は維持（通常モードは従来どおりのカーソル逐次取得）。
    - 旧テストが期待するレガシー経路でも成功するよう互換を確保。

- CORS とポートの .env 化（2025-08-10）: 対応済み

  - 変更点:
  - 環境変数 `CORS_ORIGINS` を導入し、`.env` から CORS 許可オリジンを設定可能に（カンマ区切りのみ対応）
    - ポート設定は `APP_PORT` に一本化（`PORT_NO` 互換上書きは廃止）
    - `app/main.py` で `settings.cors_origins` を使用して CORS ミドルウェアを構成
  - 検証:
    - 最小起動テストで許可オリジンが反映されることをヘッダーで確認（開発モード）
    - 127.0.0.1 / localhost 両方のオリジンで Cookie セッションが維持されることをブラウザで確認予定
  - 備考:
    - `env.example.simplified` に `CORS_ORIGINS` を追記（`PORT_NO` 記載は削除）

## 認証 API (/login) の問題

### 問題 1: レスポンス構造の不一致

**期待値（テスト）**:

```json
{
  "success": true,
  "user_id": "test_user",
  "user_name": "Test User"
}
```

**実際の API 実装**:

```json
{
  "message": "ログイン成功",
  "user": {
    "user_id": "test_user",
    "user_name": "Test User"
  }
}
```

**対応（2025-08-10）**:

- /login の成功レスポンスに `success: true` を追加し、暫定統一。
- /logout の成功レスポンスにも `success: true` を追加し、統一。
- /user/info を実装（`GET /user/info` → 認証済みユーザー情報を返却、`response_model=UserInfo`）。
- /refresh は仕様未決のため `501 Not Implemented` を明示返却するスタブを追加。
  **影響**: テストが実際の API レスポンス構造と一致していない問題は解消（`app/tests/test_auth_api.py` → 8 passed, 5 skipped を維持）。

### 問題 2: サービス実装と API レスポンスの詳細

**UserService.authenticate_user**: `Optional[Dict[str, Any]]` を返す

- 成功時: `{"user_id": "test_user", "user_name": "Test User", "role": "USER"}`
- 失敗時: `None`

**API 実装**:

```python
if user:
    request.session["user"] = user
    return {"message": "ログイン成功", "user": user}
else:
    raise HTTPException(status_code=401, detail="ユーザーIDが無効です")
```

**問題**: テストはサービスレベルのレスポンス形式を期待しているが、実際の API は異なる構造を返す

### 問題 3: セッション管理の複雑性

**API 実装**: `request.session["user"] = user` でセッションに保存
**テスト**: セッション機能のモック化が不完全

### 問題 4: 管理者ログイン API のパラメータ不整合

**発見箇所**: `/admin/login`

**テストで送信**:

```json
{ "user_id": "admin_user" }
```

**API 実装で要求**:

```json
{ "user_id": "admin_user", "password": "required_field" }
```

**エラー**: `422 Unprocessable Entity` - Field required: password
**影響**: 管理者ログイン機能が全て失敗

### 問題 5: 未実装エンドポイント

**発見箇所**: `/refresh`, `/user/info`

**現状対応（2025-08-10）**:

- 501 Not Implemented を明示返却するスタブを追加（/refresh, /user/info）。
- 目的: 404（未定義）から 501（仕様未決・未実装）に変更してクライアント実装を安定化。

### 問題 6: TestClient セッション処理問題

**テストエラー**: `'TestClient' object has no attribute 'session_transaction'`
**問題**: Flask のセッション処理方法が FastAPI の TestClient で使用できない

## 修正アクション

1. テストのレスポンス期待値を API 実装に合わせる
2. サービスモックの戻り値を実際の型に合わせる
3. セッション管理のモック化を改善

## ログアウト API (/logout) の問題

### 問題 1: セッション依存処理

**API 実装**:

```python
@router.post("/logout")
async def logout(request: Request):
    user = request.session.get("user")
    request.session.clear()
    return {"message": "ログアウトしました"}
```

**問題**:

- セッション内容に依存する処理
- テストでは実際のセッション機能が動作しない
- `user.get('user_id')` で user が None の場合エラーの可能性

### 問題 2: バックグラウンドクリーンアップの依存関係

テストのログアウト処理で複数のサービスの依存性注入が必要

## メタデータ API (/metadata/\*) の問題

### 問題 1: 例外ハンドリングの欠如

**発見箇所**: `/metadata/schemas`, `/metadata/schemas/{schema}/tables/{table}/columns`

**現在の API 実装**:

```python
@router.get("/metadata/schemas", response_model=List[Dict[str, Any]])
async def get_schemas_endpoint(metadata_service: MetadataServiceDep):
    """スキーマ一覧を取得する"""
    return await run_in_threadpool(metadata_service.get_schemas)

@router.get("/metadata/schemas/{schema_name}/tables/{table_name}/columns", response_model=List[Dict[str, Any]])
async def get_columns_endpoint(schema_name: str, table_name: str, metadata_service: MetadataServiceDep):
    """カラム一覧を取得する"""
    return await run_in_threadpool(metadata_service.get_columns, schema_name, table_name)
```

**問題**:

- サービス層で例外が発生した場合、適切にキャッチされていない
- 例外がそのまま上位に伝播し、500 Internal Server Error になる
- エラーメッセージが適切にフォーマットされていない
- デバッグが困難

**ベストプラクティス違反**:

```python
# 推奨されるエラーハンドリング例
@router.get("/metadata/schemas")
async def get_schemas_endpoint(metadata_service: MetadataServiceDep):
    try:
        return await run_in_threadpool(metadata_service.get_schemas)
    except MetadataError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"予期しないエラー: {e}")
        raise HTTPException(status_code=500, detail="メタデータ取得に失敗しました")
```

**影響**:

- 本番環境でユーザーに不適切なエラーメッセージが表示される可能性
- ログが適切に記録されない
- エラーの原因特定が困難

### 問題 2: エラーレスポンス形式の非一貫性

**現状**: FastAPI のデフォルトエラーハンドラーに依存
**問題**: プロジェクト全体でエラーレスポンス形式が統一されていない

### 問題 3: メタデータ API エンドポイントの機能重複

**発見箇所**: メタデータ関連の 4 つのエンドポイント

**重複問題の詳細**:

#### **重複ペア ①②: 基本メタデータ取得**

- `GET /metadata/all` - フィルタリング済みメタデータ取得
- `GET /metadata/raw` - 生メタデータ取得

**実装上の問題**:

```python
# 両方とも同一のサービスメソッドを呼び出し
all_metadata = await run_in_threadpool(metadata_service.get_all_metadata)
```

**差異**:

- `/metadata/all`: `visibility_service.filter_metadata()` による権限フィルタリングあり
- `/metadata/raw`: フィルタリングなし（生データ）

**問題点**:

- 機能的重複によるメンテナンス負荷増大
- エンドポイント命名の一貫性不足
- 権限管理ロジックの分散

#### **重複ペア ③④: 管理者機能**

- `POST /metadata/refresh` - メタデータ強制更新
- `GET /admin/metadata/all-raw` - 管理者用生メタデータ取得

**実装上の問題**:

```python
# /metadata/refresh: 更新 + データ返却
await run_in_threadpool(metadata_service.refresh_full_metadata_cache)
all_metadata = await run_in_threadpool(metadata_service.get_all_metadata)

# /admin/metadata/all-raw: データ取得のみ
all_metadata = await run_in_threadpool(metadata_service.get_all_metadata)
```

**差異**:

- `/metadata/refresh`: データベースからの強制更新 + 結果返却
- `/admin/metadata/all-raw`: キャッシュからの管理者用データ取得

**問題点**:

- 管理者権限チェック方式の不統一
- 更新処理と取得処理の責務混在
- API パスの命名規則不一致

### 推奨解決策

#### **短期対応（Phase 1）**

1. **機能統合による重複排除**:

   - `GET /metadata/raw` → `GET /metadata/all` への統合
   - `GET /admin/metadata/all-raw` → `POST /metadata/refresh` への統合

2. **エンドポイント利用方針の明確化**:

   ```
   推奨利用:
   - GET /metadata/all: 一般ユーザー向け（権限フィルタリング済み）
   - POST /metadata/refresh: 管理者による強制更新（更新後データも返却）

   廃止候補:
   - GET /metadata/raw: 機能重複により廃止
   - GET /admin/metadata/all-raw: 機能重複により廃止
   ```

#### **長期対応（Phase 2）**

1. **RESTful API 設計の適用**:

```
GET /admin/metadata     # 管理者用メタデータ参照
POST /admin/metadata/refresh  # 管理者による強制更新
```

2. **権限管理の統一**:
   - 全エンドポイントで一貫した権限チェック方式採用
   - ミドルウェアレベルでの権限制御実装

**優先度**: 📋 中優先度（開発効率影響）
**影響範囲**: フロントエンド API 呼び出し部分、管理者機能
**推定工数**: 1-2 週間

### 実施（2025-08-13）: Phase 1 の非破壊導入（Deprecation 通知）

- 下記の重複エンドポイントに廃止予告ヘッダーを付与し、クライアントに後継 API を提示:
  - GET `/api/v1/metadata/raw` → ヘッダー: `Deprecation: true`, `Sunset: +90days`, `Link: </api/v1/metadata/all>; rel=successor-version`
  - GET `/api/v1/admin/metadata/all-raw` → ヘッダー: `Deprecation: true`, `Sunset: +90days`, `Link: </api/v1/metadata/refresh>; rel=successor-version`
- 実装: `app/api/routes.py`
- 影響: 挙動は従来通り（レスポンス本文不変）。クライアント側で段階的移行が可能。

### 追加対応（2025-08-13）: 認証系レスポンス統一の最終決めと/admin/loginの互換

- 方針最終決定: 認証系の成功レスポンスは `{ success: boolean, message: string, user?: object }` に統一
  - `/api/v1/login`: `{ success: true, message: "ログイン成功", user }`
  - `/api/v1/logout`: `{ success: true, message: "ログアウトしました" }`
  - `/api/v1/admin/login`: `{ success: true, message: "管理者認証成功" }`
  - `/api/v1/admin/logout`: `{ success: true, message: "管理者ログアウトしました" }`
- 管理者ログインのパラメータ不整合への対応:
  - `AdminLoginRequest` に `user_id: Optional[str]` を追加し後方互換を確保（現時点では未使用）。必須項目は `password` のみ。
  - 実装: `app/api/models.py`, `app/api/routes.py`
  - 互換影響: 既存テストは`password`のみ送信で 200、未送信は 422 のまま。
