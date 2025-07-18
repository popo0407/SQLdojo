# SQLDojo テストフレームワーク

このディレクトリには、SQLDojo プロジェクト全体のテストが含まれています。テストは機能別・API 別に適度なサイズで分割されており、機能追加やリファクタリング時に編集しやすい構成になっています。

## ディレクトリ構成

```
app/tests/
├── __init__.py              # テストパッケージ初期化
├── conftest.py              # pytest設定とフィクスチャ
├── pytest.ini              # pytest設定ファイル
├── run_tests.py             # テスト実行ユーティリティ
├── test_sql_api.py          # 基本SQL実行API
├── test_cache_api.py        # キャッシュ機能API
├── test_metadata_api.py     # メタデータAPI
├── test_auth_api.py         # 認証・ユーザー管理API
├── test_export_api.py       # エクスポート・ダウンロードAPI
├── test_logs_api.py         # ログ・履歴管理API
├── test_utils_api.py        # ユーティリティ・設定API
├── test_template_api.py     # テンプレート・パーツ管理API
├── test_services.py         # サービス層テスト
└── test_integration.py      # 統合テスト
```

## テストファイル別の責務

### API 層テスト

- **test_sql_api.py**: `/sql/execute`, `/sql/validate`, `/sql/format`
- **test_cache_api.py**: `/sql/cache/*` - キャッシュ機能のすべての API
- **test_metadata_api.py**: `/metadata/*` - スキーマ、テーブル、カラム情報
- **test_auth_api.py**: `/login`, `/logout`, `/refresh`, 認証関連
- **test_export_api.py**: `/export`, `/sql/download/csv` - データエクスポート
- **test_logs_api.py**: `/logs/*` - SQL 実行ログ、履歴管理
- **test_utils_api.py**: `/health`, `/config/*`, `/performance/*` - システム情報
- **test_template_api.py**: `/templates/*`, `/parts/*` - テンプレート・パーツ管理

### サービス層・統合テスト

- **test_services.py**: ビジネスロジック層のユニットテスト
- **test_integration.py**: 複数 API を組み合わせたエンドツーエンドテスト

## テストの実行方法

### 基本的な実行

```bash
# すべてのテストを実行
cd /path/to/SQLdojo_20250712
python -m pytest app/tests

# または、テスト実行ユーティリティを使用
python app/tests/run_tests.py
```

### 特定のテストファイルを実行

```bash
# SQL APIのテストのみ
python -m pytest app/tests/test_sql_api.py

# キャッシュAPIのテストのみ
python -m pytest app/tests/test_cache_api.py

# ユーティリティを使用
python app/tests/run_tests.py --file test_sql_api.py
```

### マーカーを使用した実行

```bash
# APIテストのみ
python -m pytest -m api app/tests

# ユニットテストのみ
python -m pytest -m unit app/tests

# 統合テストのみ
python -m pytest -m integration app/tests

# 高速テストのみ（slowマーカーを除外）
python -m pytest -m "not slow" app/tests
```

### カバレッジ付き実行

```bash
# カバレッジレポート付きで実行
python -m pytest --cov=app --cov-report=html:htmlcov app/tests

# ユーティリティでカバレッジ付き実行
python app/tests/run_tests.py --no-coverage  # カバレッジ無効化
```

### 並列実行

```bash
# pytest-xdistをインストール後
pip install pytest-xdist

# 並列実行
python -m pytest -n auto app/tests

# ユーティリティで並列実行
python app/tests/run_tests.py --parallel
```

## テストの追加・編集方法

### 新しい API テストの追加

1. 適切なテストファイル（例：`test_sql_api.py`）を選択
2. 新しいテストクラスまたはメソッドを追加
3. 必要に応じて`conftest.py`にフィクスチャを追加

```python
class TestNewAPI:
    """新しいAPIのテスト"""

    def test_new_api_success(self, client: TestClient, mock_user):
        """正常なAPIリクエストのテスト"""
        # テスト実装
        pass
```

### 新しいサービステストの追加

`test_services.py`に新しいサービスクラスのテストを追加：

```python
class TestNewService:
    """新しいサービスのテスト"""

    def test_service_method_success(self):
        """サービスメソッドの正常テスト"""
        # テスト実装
        pass
```

### 統合テストの追加

`test_integration.py`に新しいワークフローテストを追加：

```python
class TestNewWorkflow:
    """新しいワークフローの統合テスト"""

    def test_complete_new_workflow(self, client: TestClient):
        """完全な新ワークフローテスト"""
        # テスト実装
        pass
```

## テストベストプラクティス

### 1. モックの使用

- 外部依存関係（データベース、ファイルシステム）はモックを使用
- `conftest.py`で共通モックを定義
- テスト内で`app.dependency_overrides`を使用して DI をオーバーライド

### 2. テストデータ

- `conftest.py`の`create_test_*`関数を使用してテストデータを生成
- 一時データベース（`temp_db`フィクスチャ）を使用

### 3. エラーテストの重要性

- 正常系だけでなく、エラー系のテストも必須
- 各 API で想定されるエラーパターンをテスト

### 4. テストの独立性

- 各テストは独立して実行可能
- `try/finally`でリソース（`app.dependency_overrides`）をクリーンアップ

### 5. マーカーの活用

```python
@pytest.mark.unit
def test_unit_function():
    pass

@pytest.mark.api
def test_api_endpoint():
    pass

@pytest.mark.slow
def test_long_running_process():
    pass
```

## 必要なパッケージ

テスト実行に必要なパッケージ：

```bash
pip install pytest
pip install pytest-asyncio
pip install pytest-cov
pip install pytest-xdist  # 並列実行用（オプション）
```

## トラブルシューティング

### テストが失敗する場合

1. **依存関係の問題**: モックが正しく設定されているか確認
2. **設定の問題**: `conftest.py`のフィクスチャが正しく動作しているか確認
3. **環境の問題**: Python パスや環境変数が正しく設定されているか確認

### カバレッジが低い場合

1. 新しいコードにテストを追加
2. エラーハンドリングのテストを追加
3. エッジケースのテストを追加

### テストが遅い場合

1. `@pytest.mark.slow`でマーカーを付けて通常実行から除外
2. モックを使用して外部依存を削除
3. 並列実行を使用

## CI/CD 統合

このテストフレームワークは CI/CD パイプラインに統合可能：

```bash
# CI用のテスト実行
python app/tests/run_tests.py --fast --no-coverage

# リリース前の完全テスト
python app/tests/run_tests.py --parallel
```
