# API動作問題レポート

## 発見日時
2025年7月21日 09:30

## 認証API (/login) の問題

### 問題1: レスポンス構造の不一致
**期待値（テスト）**: 
```json
{
  "success": true,
  "user_id": "test_user", 
  "user_name": "Test User"
}
```

**実際のAPI実装**:
```json
{
  "message": "ログイン成功",
  "user": {
    "user_id": "test_user",
    "user_name": "Test User"
  }
}
```

**影響**: テストが実際のAPIレスポンス構造と一致していない

### 問題2: サービス実装とAPIレスポンスの詳細
**UserService.authenticate_user**: `Optional[Dict[str, Any]]` を返す
- 成功時: `{"user_id": "test_user", "user_name": "Test User", "role": "USER"}`
- 失敗時: `None`

**API実装**: 
```python
if user:
    request.session["user"] = user
    return {"message": "ログイン成功", "user": user}
else:
    raise HTTPException(status_code=401, detail="ユーザーIDが無効です")
```

**問題**: テストはサービスレベルのレスポンス形式を期待しているが、実際のAPIは異なる構造を返す

### 問題3: セッション管理の複雑性
**API実装**: `request.session["user"] = user` でセッションに保存
**テスト**: セッション機能のモック化が不完全

### 問題4: 管理者ログインAPIのパラメータ不整合
**発見箇所**: `/admin/login`

**テストで送信**:
```json
{"user_id": "admin_user"}
```

**API実装で要求**:
```json
{"user_id": "admin_user", "password": "required_field"}
```

**エラー**: `422 Unprocessable Entity` - Field required: password
**影響**: 管理者ログイン機能が全て失敗

### 問題5: 未実装エンドポイント
**発見箇所**: `/refresh`, `/user/info`

**エラー**: `404 Not Found`
**問題**: ルーティングが定義されていないか、実装が不完全

### 問題6: TestClientセッション処理問題
**テストエラー**: `'TestClient' object has no attribute 'session_transaction'`
**問題**: Flaskのセッション処理方法がFastAPIのTestClientで使用できない

## 修正アクション
1. テストのレスポンス期待値をAPI実装に合わせる
2. サービスモックの戻り値を実際の型に合わせる  
3. セッション管理のモック化を改善

## ログアウトAPI (/logout) の問題

### 問題1: セッション依存処理
**API実装**:
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
- `user.get('user_id')` でuserがNoneの場合エラーの可能性

### 問題2: バックグラウンドクリーンアップの依存関係
テストのログアウト処理で複数のサービスの依存性注入が必要

## メタデータAPI (/metadata/*) の問題

### 問題1: 例外ハンドリングの欠如
**発見箇所**: `/metadata/schemas`, `/metadata/schemas/{schema}/tables/{table}/columns`

**現在のAPI実装**:
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
- 例外がそのまま上位に伝播し、500 Internal Server Errorになる
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

### 問題2: エラーレスポンス形式の非一貫性
**現状**: FastAPIのデフォルトエラーハンドラーに依存
**問題**: プロジェクト全体でエラーレスポンス形式が統一されていない

## エクスポートAPI (/export/*) の問題

### 問題1: Content-Type重複問題
**発見箇所**: CSVダウンロード機能

**現在の問題**:
```
実際の出力: "text/csv; charset=utf-8; charset=utf-8"
期待値: "text/csv; charset=utf-8"
```

**原因**: HTTPレスポンス生成時にcharsetが重複して設定されている
**影響**: ブラウザによってはContent-Typeの解釈に問題が生じる可能性

### 問題2: ストリーミング例外処理の不備
**発見箇所**: CSV生成でのストリーミングレスポンス

**エラー内容**: 
```
RuntimeError: Caught handled exception, but response already started.
```

**問題**: 
- ストリーミング開始後の例外処理が適切でない
- レスポンスヘッダー送信後にエラーが発生すると適切に処理できない
- Mockオブジェクトがiterableでない問題 (`'Mock' object is not iterable`)

**修正が必要な箇所**:
```python
# app/api/routes.py のCSVストリーミング処理
# cursor.description の取り扱いとエラーハンドリング
```

## ログAPI (/logs/*) の問題

### 問題1: Pydanticモデル型定義エラー
**発見箇所**: SQLExecutionLogモデル

**エラー内容**:
```
pydantic_core._pydantic_core.ValidationError: 1 validation error for SQLExecutionLog
log_id
  Input should be a valid string [type=string_type, input_value=3, input_type=int]
```

**問題**: 
- データベースからはlog_idがintで返される
- Pydanticモデルではstrを期待している
- 型変換が適切に行われていない

**影響**: ログ機能全般が動作しない

### 問題2: 未実装エンドポイント
**発見箇所**: `/logs/analytics`, `/logs/export`

**問題**: 
- ルーティングは定義されているがエンドポイントが存在しない
- 404エラーが発生
- テストでスキップマークが必要

## 修正優先度と推奨アクション

### 🔥 高優先度 (本番影響大)
1. **メタデータAPI例外ハンドリング**: エラーハンドリング追加
2. **ログAPIのPydanticモデル修正**: 型定義統一
3. **エクスポートAPIのContent-Type修正**: HTTPヘッダー重複解消

### 📋 中優先度 (開発効率影響)
4. **認証APIレスポンス構造統一**: APIとテストの整合性
5. **ストリーミング例外処理改善**: 安定性向上

### 📝 低優先度 (機能拡張)
6. **未実装エンドポイント**: 実装またはルート削除

## API設計ガイドライン提案
1. **統一エラーハンドリング**: カスタム例外クラスとHTTPException変換
2. **レスポンス形式標準化**: 成功・失敗の一貫したJSONスキーマ
3. **ログ設計統一**: 構造化ログとエラートレーシング
4. **型安全性**: PydanticモデルとDB型の整合性確保
