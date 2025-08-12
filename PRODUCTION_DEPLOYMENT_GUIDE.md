# 本番環境への適用手順とチェックリスト

## 1. 変更内容の概要

- **新機能**: ユーザー表示設定管理（テンプレート・パーツの統合リスト、並び替え、表示/非表示切替）
- **DB スキーマ変更**: `user_template_preferences`, `user_part_preferences` テーブル新設
- **API エンドポイント追加**: ユーザー表示設定関連の API（取得・更新・ドロップダウン用）
- **フロントエンド**: 統合管理画面（template-management.html）の追加

## 2. 必要な DB マイグレーション

### 新テーブル作成

```sql
-- user_template_preferences テーブル
CREATE TABLE user_template_preferences (
    user_id TEXT NOT NULL,
    template_id TEXT NOT NULL,
    template_type TEXT NOT NULL,  -- 'user' or 'admin'
    display_order INTEGER NOT NULL DEFAULT 0,
    is_visible BOOLEAN NOT NULL DEFAULT TRUE,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id, template_id, template_type)
);

-- user_part_preferences テーブル
CREATE TABLE user_part_preferences (
    user_id TEXT NOT NULL,
    part_id TEXT NOT NULL,
    part_type TEXT NOT NULL,  -- 'user' or 'admin'
    display_order INTEGER NOT NULL DEFAULT 0,
    is_visible BOOLEAN NOT NULL DEFAULT TRUE,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id, part_id, part_type)
);
```

### 既存データの移行

```python
# migrate_user_preferences.py を本番環境で実行
python migrate_user_preferences.py
```

## 3. 本番環境適用の手順

### Step 1: バックアップ

```bash
# データベースのバックアップ
sqlite3 metadata_cache.db ".backup metadata_cache_backup_$(date +%Y%m%d_%H%M%S).db"

# アプリケーションコードのバックアップ
cp -r app app_backup_$(date +%Y%m%d_%H%M%S)
```

### Step 2: アプリケーション更新

```bash
# サーバー停止
systemctl stop sqldojo-app

# 新しいコードをデプロイ
# - app/api/routes.py (復元・統合済み)
# - app/api/models.py (新APIモデル追加済み)
# - app/services/user_preference_service.py (新規)
# - app/dependencies.py (UserPreferenceServiceDep追加済み)
# - app/templates/template-management.html (新規)
# - app/static/js/template-management.js (新規)
# - app/static/js/app_new.js (修正済み)
# - app/static/js/services/apiService.js (修正済み)
```

### Step 3: データベースマイグレーション

```bash
# 新テーブル作成と既存データ移行
python migrate_user_preferences.py

# マイグレーション結果確認
python check_database.py
```

### Step 4: アプリケーション起動・動作確認

```bash
# サーバー起動
systemctl start sqldojo-app

# ヘルスチェック
curl http://localhost:8001/api/v1/health

# 新機能の動作確認
python test_api_integration.py
```

## 4. 注意点・リスクと対策

### データベース関連

- **リスク**: 新テーブル作成・データ移行時のエラー
- **対策**:
  - 事前にバックアップ取得
  - マイグレーションスクリプトをテスト環境で十分検証
  - migrate_user_preferences.py 実行前後でデータ整合性確認

### API 互換性

- **リスク**: 既存 API への影響
- **対策**:
  - 新 API エンドポイントのみ追加、既存 API は変更なし
  - routes.py は全機能を含む形で復元済み
  - 段階的デプロイ（フロントエンド機能を後から有効化）

### フロントエンド

- **リスク**: 新画面・機能の初期不具合
- **対策**:
  - template-management 画面は独立しており既存機能に影響なし
  - 必要に応じて機能フラグで段階的公開

## 5. 動作確認項目

### 基本機能（既存）

- [ ] ログイン・認証
- [ ] SQL 実行
- [ ] テンプレート・パーツ作成・削除
- [ ] 管理者機能

### 新機能

- [ ] テンプレート表示設定取得 (GET /api/v1/users/template-preferences)
- [ ] パーツ表示設定取得 (GET /api/v1/users/part-preferences)
- [ ] 表示設定一括更新 (PUT /api/v1/users/template-preferences)
- [ ] ドロップダウン用データ取得 (GET /api/v1/users/templates-for-dropdown)
- [ ] 統合管理画面の表示・操作

## 6. ロールバック手順

問題発生時の緊急ロールバック:

```bash
# アプリケーション停止
systemctl stop sqldojo-app

# コードをバックアップから復元
rm -rf app
mv app_backup_YYYYMMDD_HHMMSS app

# データベースをバックアップから復元（必要に応じて）
mv metadata_cache.db metadata_cache_error.db
mv metadata_cache_backup_YYYYMMDD_HHMMSS.db metadata_cache.db

# アプリケーション再起動
systemctl start sqldojo-app
```

## 7. 開発環境と本番環境の差異確認

### チェック項目

- [ ] Python 環境・ライブラリバージョン確認
- [ ] 環境変数・設定ファイル確認
- [ ] データベース構造確認
- [ ] ファイルパーミッション確認

### 推奨事項

- 本番適用前にステージング環境での十分な検証
- 段階的デプロイ（まず API のみ、その後フロントエンド機能）
- 監視・ログ確認体制の準備

## 8. 結論

**新機能の DB マイグレーションは必須です。**
`migrate_user_preferences.py`スクリプトを使用して DB スキーマ変更・既存データ移行を実行してください。

この変更により、ユーザーは個人用・共通テンプレート/パーツを統合したリストで管理でき、表示順序や表示/非表示を自由にカスタマイズできるようになります。
