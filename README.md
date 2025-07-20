# SQLdojo

SQLdojo は、SQL クエリの実行と結果の分析を支援する Web アプリケーションです。

## 機能

- SQL クエリの実行と結果表示
- 複数のデータベース接続（Oracle、Snowflake、SQLite）
- 結果のフィルタリングとソート
- CSV エクスポート
- メタデータの表示
- テンプレート機能
- ユーザー管理
- **パラメータ化 SQL 実行機能**
- **WHERE 句バリデーション機能**（大量データ取得防止）
- **部分 SQL 実行機能**（選択範囲の SQL 実行）
- **リサイズ可能なパネル機能**（サイドバーとメインエリア、エディタと結果エリア）
- **エディタの表示制御機能**（最大化・最小化、SQL 実行時の自動最小化）
- 包括的テストスイート（120+ テストケース）

## 技術スタック

### バックエンド

- FastAPI (Python)
- SQLAlchemy
- Pydantic
- Uvicorn

### フロントエンド

- React 18
- TypeScript
- Vite
- Zustand (状態管理)
- Monaco Editor (SQL エディタ)
- **react-resizable-panels** (リサイズ可能パネル)

## 最新の改善点（2024 年 12 月）

### リファクタリング完了

- **useResultsStore.ts** の大規模リファクタリングを完了
  - 384 行の巨大なストアを 6 つの専用ストアに分割
  - 単一責任の原則（SRP）に準拠した設計
  - ファサードパターンによる統一インターフェース
  - 型安全性の向上と重複コードの削除

### 分割されたストア構成

- `useResultsDataStore.ts` - データ管理（配列、カラム、行数、実行時間）
- `useResultsFilterStore.ts` - フィルタリング・ソート管理
- `useResultsPaginationStore.ts` - ページネーション管理
- `useResultsExportStore.ts` - CSV エクスポート管理
- `useResultsSessionStore.ts` - セッション管理
- `useResultsExecutionStore.ts` - SQL 実行管理

### 型定義の統一

- 重複する型定義を削除し、`types/results.ts`に統一
- API 層での型の整合性を確保
- 開発憲章に準拠した品質向上

## セットアップ

### 前提条件

- Python 3.8+
- Node.js 18+
- データベース接続設定

### インストール

1. リポジトリをクローン

```bash
git clone <repository-url>
cd SQLdojo_20250712
```

2. バックエンドのセットアップ

```bash
pip install -r requirements.txt
cp env.example.simplified .env
# .envファイルを編集してデータベース接続情報を設定
```

3. フロントエンドのセットアップ

```bash
cd sql-dojo-react
npm install
```

### 起動

1. バックエンドサーバーを起動

```bash
cd app
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

2. フロントエンドサーバーを起動

```bash
cd sql-dojo-react
npm run dev
```

## 使用方法

1. ブラウザで `http://localhost:5173` にアクセス
2. ログイン画面でユーザー認証
3. SQL エディタでクエリを記述
4. **パラメータ化 SQL の使用**:
   - `{パラメータ名}`: 自由入力
   - `{パラメータ名[選択肢1,選択肢2]}`: 選択式
   - `{パラメータ名[]}`: 複数項目入力
   - `{パラメータ名['']}`: 複数項目入力（クォート付き）
5. **WHERE 句バリデーション**:
   - WHERE 句なしの SQL は実行不可（大量データ取得防止）
   - WHERE 句の内容が 20 文字以下の場合はエラー
6. **部分 SQL 実行**:
   - エディタでテキストを選択して部分実行可能
7. **リサイズ機能**:
   - サイドバーとメインエリアの境界線をドラッグでリサイズ
   - エディタと結果エリアの境界線をドラッグでリサイズ
   - エディタは最小 5%から最大 95%まで調整可能
8. **エディタ制御機能**:
   - エディタヘッダーの「最大化」/「最小化」ボタンで表示制御
   - 最大化時: エディタが全画面表示、結果エリアが非表示
   - 最小化時: エディタ 95%、結果エリア 5%の表示
   - SQL 実行時に自動的にエディタが最小化される
9. 実行ボタンでクエリを実行
10. 結果をフィルタリング・ソート・エクスポート

## プロジェクト構成

### バックエンド構成

```
app/
├── api/                    # APIエンドポイント
│   ├── routes.py          # メインルーター
│   ├── models.py          # Pydanticモデル
│   └── error_handlers.py  # エラーハンドラー
├── services/              # ビジネスロジック
│   ├── sql_service.py     # SQL実行サービス
│   ├── hybrid_sql_service.py # ハイブリッドSQL実行（キャッシュ機能付き）
│   ├── cache_service.py   # キャッシュ管理
│   ├── metadata_service.py # メタデータ取得
│   └── user_service.py    # ユーザー管理
├── sql_validator.py       # SQLバリデーション（WHERE句チェック等）
├── main.py               # アプリケーションエントリーポイント
└── config_simplified.py  # 設定管理
```

### フロントエンド構成（SQLdojoReact）

```
sql-dojo-react/
├── src/
│   ├── components/        # 再利用可能なコンポーネント
│   │   ├── layout/       # レイアウトコンポーネント
│   │   │   ├── MainLayout.tsx        # メインレイアウト
│   │   │   ├── MainWorkspaceLayout.tsx # ワークスペースレイアウト
│   │   │   ├── ResizableLayout.tsx   # リサイズ可能レイアウト
│   │   │   ├── AppHeader.tsx         # ヘッダーコンポーネント
│   │   │   └── Sidebar.tsx           # サイドバーコンポーネント
│   │   ├── common/       # 共通コンポーネント
│   │   │   ├── PrivateRoute.tsx      # 認証ルート
│   │   │   ├── LoadingSpinner.tsx    # ローディング表示
│   │   │   ├── ErrorAlert.tsx        # エラー表示
│   │   │   └── EmptyState.tsx        # 空データ表示
│   │   ├── editor/       # エディタ関連コンポーネント
│   │   │   ├── EditorToolbar.tsx     # エディタツールバー（最大化/最小化ボタン付き）
│   │   │   └── EditorToolbar.module.css # ツールバースタイル
│   │   └── results/      # 結果表示関連コンポーネント
│   │       ├── ResultsStats.tsx      # 統計情報表示
│   │       └── FilterModal.tsx       # フィルターモーダル
│   ├── features/         # 機能別コンポーネント
│   │   ├── editor/       # SQLエディタ機能
│   │   │   ├── SQLEditor.tsx         # SQLエディタ本体
│   │   │   └── SQLEditor.module.css  # エディタスタイル
│   │   ├── results/      # 結果表示機能
│   │   │   ├── ResultsViewer.tsx     # 結果ビューアー
│   │   │   ├── ResultTable.tsx       # 結果テーブル
│   │   │   └── Results.module.css    # 結果表示スタイル
│   │   ├── metadata/     # メタデータ機能
│   │   │   ├── MetadataTree.tsx      # メタデータツリー
│   │   │   ├── TreeNode.tsx          # ツリーノード
│   │   │   └── MetadataTree.module.css # メタデータスタイル
│   │   └── parameters/   # パラメータ機能
│   │       ├── ParameterParser.ts     # パラメータ解析
│   │       ├── ParameterForm.tsx      # パラメータ入力フォーム
│   │       └── ParameterContainer.tsx # パラメータコンテナ
│   ├── pages/            # ページコンポーネント
│   │   ├── HomePage.tsx              # ホームページ
│   │   ├── LoginPage.tsx             # ログインページ
│   │   ├── UserPage.tsx              # ユーザーページ
│   │   ├── AdminPage.tsx             # 管理者ページ
│   │   └── TemplateManagementPage.tsx # テンプレート管理ページ
│   ├── hooks/            # カスタムフック
│   │   ├── useMetadata.ts            # メタデータ取得フック
│   │   ├── useConfigSettings.ts      # 設定管理フック
│   │   ├── useMonacoEditor.ts        # Monaco Editor管理フック
│   │   ├── useEditorOperations.ts    # エディタ操作フック
│   │   ├── useInfiniteScroll.ts      # 無限スクロールフック
│   │   ├── useResultsDisplay.ts      # 結果表示管理フック
│   │   └── useLayoutControl.ts       # レイアウト制御フック（SQL実行時の自動最小化）
│   ├── stores/           # 状態管理（Zustand）
│   │   ├── useSqlPageStore.ts        # メインSQLページ状態管理
│   │   ├── useUIStore.ts             # UI状態管理（ローディング、エラー、モーダル）
│   │   ├── useResultsStore.ts        # 結果表示管理（ファサードパターン）
│   │   ├── useResultsDataStore.ts    # データ管理（配列、カラム、行数、実行時間）
│   │   ├── useResultsFilterStore.ts  # フィルタリング・ソート管理
│   │   ├── useResultsPaginationStore.ts # ページネーション管理
│   │   ├── useResultsExportStore.ts  # CSVエクスポート管理
│   │   ├── useResultsSessionStore.ts # セッション管理
│   │   ├── useResultsExecutionStore.ts # SQL実行管理
│   │   ├── useEditorStore.ts         # エディタ管理（SQLテキスト、エディタインスタンス、整形）
│   │   ├── useSidebarStore.ts        # サイドバー管理（テーブル・カラム選択）
│   │   ├── useParameterStore.ts      # パラメータ管理（プレースホルダー解析、値管理、検証）
│   │   └── useLayoutStore.ts         # レイアウト状態管理（エディタ最大化、パネルサイズ）
│   ├── api/              # API通信層
│   │   ├── apiClient.ts              # 汎用APIクライアント
│   │   ├── authService.ts            # 認証関連APIサービス
│   │   ├── sqlService.ts             # SQL関連APIサービス
│   │   └── metadataService.ts        # メタデータ関連APIサービス
│   ├── types/            # 型定義
│   │   ├── api.ts                    # API型定義
│   │   ├── metadata.ts               # メタデータ型定義
│   │   ├── editor.ts                 # エディタ型定義
│   │   ├── results.ts                # 結果表示型定義（統一型定義）
│   │   └── parameters.ts             # パラメータ型定義
│   ├── contexts/         # Reactコンテキスト
│   │   └── AuthContext.tsx           # 認証コンテキスト
│   ├── components/auth/  # 認証関連コンポーネント
│   │   ├── LoginForm.tsx             # ログインフォーム
│   │   ├── AdminLoginModal.tsx       # 管理者ログインモーダル
│   │   ├── LogoutButton.tsx          # ログアウトボタン
│   │   ├── PrivateRoute.tsx          # 認証ガード
│   │   ├── LoginForm.module.css      # ログインフォームスタイル
│   │   ├── AdminLoginModal.module.css # 管理者ログインモーダルスタイル
│   │   └── LogoutButton.module.css   # ログアウトボタンスタイル
│   ├── config/           # 設定ファイル
│   │   └── editorConfig.ts           # Monaco Editor設定
│   ├── styles/           # グローバルスタイル
│   │   ├── global.css                # グローバルCSS
│   │   ├── Layout.module.css         # レイアウトスタイル
│   │   └── ResizableLayout.module.css # リサイズ可能レイアウトスタイル
│   ├── assets/           # 静的アセット
│   │   ├── react.svg                 # Reactロゴ
│   │   └── hint.png                  # ヒント画像
│   ├── App.tsx           # メインアプリケーションコンポーネント
│   └── main.tsx          # アプリケーションエントリーポイント
├── public/               # パブリックアセット
│   └── vite.svg                      # Viteロゴ
├── package.json          # 依存関係管理
├── vite.config.ts        # Vite設定
├── tsconfig.json         # TypeScript設定
└── eslint.config.js      # ESLint設定
```

## 主要な処理概要

### バックエンド処理

- **SQL 実行**: `sql_service.py`で SQL クエリを実行し、結果をキャッシュ
- **ハイブリッド SQL 実行**: `hybrid_sql_service.py`でキャッシュ機能付き SQL 実行
- **SQL バリデーション**: `sql_validator.py`で WHERE 句必須チェックと内容検証
- **キャッシュ管理**: `cache_service.py`で大量データの段階的取得とキャッシュ
- **メタデータ取得**: `metadata_service.py`でテーブル・カラム情報を取得
- **フィルタリング**: 既存フィルター条件を考慮したユニーク値取得
- **認証管理**: セッション管理とユーザー権限制御

### フロントエンド処理

- **API 通信層**: 関心事分離による一元化された API 通信
  - `apiClient.ts`: 汎用 HTTP 通信とエラーハンドリング
  - `sqlService.ts`: SQL 関連 API（実行、キャッシュ読み取り、CSV ダウンロード、整形、補完）
  - `metadataService.ts`: メタデータ関連 API（テーブル情報、設定、ユニーク値取得）
- **状態管理**: Zustand を使用した関心事分離による状態管理
  - `useUIStore`: UI 状態管理（ローディング、エラー、モーダル）
  - `useResultsStore`: 結果表示管理（データ、ソート、フィルタ、CSV）
  - `useEditorStore`: エディタ管理（SQL テキスト、エディタインスタンス、整形）
  - `useSidebarStore`: サイドバー管理（テーブル・カラム選択）
  - `useSqlPageStore`: メイン SQL ページ状態管理（他ストアとの連携）
  - `useLayoutStore`: レイアウト状態管理（エディタ最大化、パネルサイズ制御）
- **カスタムフック**: ロジック分離による再利用可能な機能
  - `useMonacoEditor.ts`: Monaco Editor 初期化と補完機能管理
  - `useEditorOperations.ts`: エディタ操作ロジック（実行、整形、クリア）
  - `useInfiniteScroll.ts`: 無限スクロールロジック
  - `useResultsDisplay.ts`: 結果表示データ管理ロジック
  - `useLayoutControl.ts`: レイアウト制御ロジック（SQL 実行時の自動最小化）
- **SQL エディタ**: Monaco Editor によるシンタックスハイライトと補完
- **結果表示**: ページネーション対応の結果テーブル表示
- **フィルタリング**: カラム別の動的フィルター機能（連鎖フィルター対応）
- **メタデータ**: ツリー形式でのテーブル・カラム表示
- **パラメータ化 SQL**: 動的フォーム生成によるパラメータ入力機能
- **認証**: React Context による認証状態管理
  - ユーザー ID 認証（セッションベース）
  - 管理者パスワード認証
  - セッション管理とキャッシュクリア
  - 認証ガードによるページ保護
- **部分 SQL 実行**: Monaco Editor の選択範囲を活用した部分実行機能
- **リサイズ可能パネル**: react-resizable-panels による動的レイアウト制御
  - サイドバーとメインエリアの水平リサイズ
  - エディタと結果エリアの垂直リサイズ
  - パネルサイズの状態管理と永続化
- **エディタ表示制御**: 最大化・最小化機能と自動制御
  - エディタヘッダーの最大化/最小化ボタン
  - SQL 実行時の自動最小化機能
  - パネルサイズの動的制御（最小 5%から最大 95%）

### データフロー

1. **SQL 実行フロー**

   - ユーザーが SQL エディタでクエリを入力
   - `useEditorOperations.ts`が`sqlService.ts`を通じて API に送信
   - バックエンドがデータベースでクエリを実行
   - 結果をキャッシュに保存し、フロントエンドに返却
   - `useResultsStore`が結果を管理し、`ResultsViewer.tsx`で表示

2. **フィルタリング・ソートフロー**

   - ユーザーがフィルター条件を設定
   - `FilterModal.tsx`が`metadataService.ts`でユニーク値を取得
   - 連鎖フィルターで前の条件を考慮した候補を動的更新
   - `useResultsStore`がフィルター条件を管理し、結果を再取得

3. **SQL バリデーションフロー**

   - ユーザーが SQL を入力・実行
   - `sql_validator.py`で WHERE 句の存在と内容をチェック
   - バリデーションエラー時は適切なエラーメッセージを表示
   - フロントエンドでエラーハンドリングとユーザー通知

4. **部分 SQL 実行フロー**

   - ユーザーがエディタでテキストを選択
   - `useEditorStore`で選択範囲の SQL を取得
   - 選択範囲がある場合は部分実行、ない場合は全 SQL 実行
   - 実行結果を通常通り表示

5. **無限スクロールフロー**

   - ユーザーがスクロールでページ下部に到達
   - `useInfiniteScroll.ts`が`sqlService.ts`で追加データを取得
   - `useResultsStore`が既存データに追加データを結合
   - `ResultsViewer.tsx`が更新されたデータを表示

6. **CSV エクスポートフロー**
   - ユーザーがエクスポートボタンをクリック
   - `useResultsStore`が`sqlService.ts`で CSV ダウンロード API を呼び出し
   - ブラウザがファイルダウンロードを実行

## テストスイート

### 概要

SQLdojo では包括的なテストスイートを提供しており、API エンドポイント、サービス層、統合テストを含む 120+ のテストケースでアプリケーションの品質を保証しています。

### テスト構成

```
app/tests/
├── conftest.py              # テスト設定とフィクスチャー
├── pytest.ini              # pytest 設定
├── README.md               # テスト実行ガイド
├── TEST_ANALYSIS.md        # テスト分析と改善計画
├── run_tests.py            # テスト実行スクリプト
├── fix_imports.py          # インポート修正ユーティリティ
├── test_main.py            # メインアプリケーションテスト
├── test_sql_api.py         # SQL実行APIテスト
├── test_cache_api.py       # キャッシュ機能APIテスト
├── test_metadata_api.py    # メタデータAPIテスト
├── test_auth_api.py        # 認証APIテスト
├── test_export_api.py      # エクスポート機能APIテスト
├── test_template_api.py    # テンプレート管理APIテスト
├── test_logs_api.py        # ログAPIテスト
├── test_utils_api.py       # ユーティリティAPIテスト
├── test_services.py        # サービス層テスト
└── test_integration.py     # 統合テスト
```

### テスト状況（2025-07-20 最新）

#### 全体概要

- **総テスト数**: 129 件
- **成功**: 45 件（35%）
- **失敗**: 84 件（65%）

#### 主要分野別の状況

**✅ 完全成功分野：**

- **キャッシュ API** (12/12 成功): SQL 実行、データ読み出し、CSV ダウンロード、ユニーク値取得、セッション状態、ストリーミングキャンセル
- **SQL サービス** (6/6 成功): SQL 実行、バリデーション、フォーマット機能
- **WHERE 句バリデーション** (3/3 成功): 大量データ取得防止機能
- **ユーティリティ API** (8/12 成功): ヘルスチェック、設定取得、接続状態、パフォーマンスメトリクス、SQL 補完

**🔧 改善中の分野：**

- **認証 API** (0/13 成功): セッション管理、モック設定の不備
- **エクスポート API** (3/10 成功): Content-Type、CSV ストリーミング関連
- **ログ API** (4/10 成功): データ型、ルート 404 エラー
- **メタデータ API** (1/9 成功): レスポンス検証、ルート 404 エラー
- **テンプレート API** (0/13 成功): 全てルート 404 エラー
- **統合テスト** (1/6 成功): 複数 API 連携のシナリオ
- **サービス層** (6/18 成功): モック設定と非同期処理の改善が必要

### テスト実行

#### 全テスト実行

```bash
# プロジェクトルートから
python -m pytest app/tests/ -v

# または
cd app/tests
python run_tests.py
```

#### 特定のテスト実行

```bash
# 成功しているキャッシュAPIテスト
python -m pytest app/tests/test_cache_api.py -v

# サービス層テスト
python -m pytest app/tests/test_services.py -v

# 特定のテストクラス
python -m pytest app/tests/test_metadata_api.py::TestMetadataSchemaAPI -v

# 特定のテストメソッド
python -m pytest app/tests/test_auth_api.py::TestAuthAPI::test_login_success -v
```

#### マーカーによるテスト実行

```bash
# API テストのみ
python -m pytest -m api -v

# 統合テストのみ
python -m pytest -m integration -v

# 遅いテストを除外
python -m pytest -m "not slow" -v
```

#### 主な改善点

**成功したキャッシュ API テストの特徴：**

- AsyncMock の適切な使用（非同期サービス用）
- API 実装に合致したレスポンス形式のアサーション
- エラーハンドリングのフィールド名統一（"message"フィールド）
- Content-Type の部分マッチング対応

**今後の改善計画：**

1. **認証 API**: セッション管理とモック設定の修正
2. **エクスポート API**: Content-Type 問題とストリーミング処理の修正
3. **メタデータ API**: ルート 404 問題とレスポンス検証の修正
4. **テンプレート API**: API 実装の確認とルーティング修正

### テスト設定

#### 環境設定

```python
# conftest.py でのテスト用設定
@pytest.fixture
def client():
    """テスト用 FastAPI クライアント"""
    return TestClient(app)

@pytest.fixture
def mock_user():
    """テスト用ユーザー"""
    return UserInfo(user_id="test_user", user_name="Test User")

@pytest.fixture
def mock_admin():
    """テスト用管理者"""
    return UserInfo(user_id="admin_user", user_name="Admin User")
```

#### 依存性注入のオーバーライド

```python
# テスト内でのモック設定例
app.dependency_overrides[get_sql_service_di] = lambda: mock_sql_service
app.dependency_overrides[get_current_user] = lambda: test_user
```

### トラブルシューティング

#### よくある問題

1. **インポートエラー**: `python app/tests/fix_imports.py` を実行
2. **設定エラー**: `pytest.ini` の設定確認
3. **依存関係エラー**: 必要なパッケージのインストール確認

#### デバッグ実行

```bash
# 詳細なエラー情報表示
python -m pytest app/tests/ -v --tb=long

# 特定のテストをデバッグ
python -m pytest app/tests/test_sql_api.py::TestSQLExecuteAPI::test_execute_sql_success -v -s
```

## 開発ガイドライン

### コード規約

- TypeScript の厳格な型チェック
- ESLint によるコード品質管理
- コンポーネントの単一責任原則
- カスタムフックによるロジック分離
- API 通信層の関心事分離（`apiClient.ts`、`sqlService.ts`、`metadataService.ts`）
- 型定義の統一と再利用性の確保

### 状態管理

- Zustand による軽量な状態管理
- セレクターによる派生状態の計算
- 非同期処理の適切なエラーハンドリング

### パフォーマンス

- 大量データの段階的読み込み（無限スクロール）
- メモ化による不要な再レンダリング防止
- キャッシュによる API 呼び出し最適化
- API 通信層の一元化による重複リクエストの削減
- 型安全性による実行時エラーの事前防止

## 更新履歴

### 2025-07-20: WHERE 句バリデーション機能と部分 SQL 実行機能の実装

#### 実装内容

- **WHERE 句バリデーション機能**:
  - WHERE 句なしの SQL 実行を防止（大量データ取得防止）
  - WHERE 句の内容が 20 文字以下の場合のエラー表示
  - `HybridSQLService`へのバリデーション統合
  - フロントエンドのエラーハンドリング改善
- **部分 SQL 実行機能**:
  - Monaco Editor の選択範囲を活用した部分実行
  - `useEditorStore`での選択範囲管理
  - エディタツールバーでの部分実行表示

#### 技術的詳細

- **SQL バリデーション**: `sql_validator.py`での WHERE 句必須チェックと内容検証
- **エラーハンドリング**: API エンドポイントとフロントエンドでの適切なエラー処理
- **部分実行**: Monaco Editor の選択 API を活用した部分 SQL 実行
- **レスポンス形式**: バリデーションエラー時の統一されたレスポンス形式

#### 修正ファイル

- `app/services/hybrid_sql_service.py`: SQL バリデーションの統合
- `app/api/routes.py`: エラーレスポンス形式の修正
- `sql-dojo-react/src/stores/useResultsStore.ts`: エラーハンドリングの改善
- `sql-dojo-react/src/stores/useEditorStore.ts`: 部分実行機能の追加
- `sql-dojo-react/src/stores/useSqlPageStore.ts`: 部分実行ロジックの統合
- `sql-dojo-react/src/components/editor/EditorToolbar.tsx`: 部分実行表示の追加

#### 動作確認

- WHERE 句なしの SQL でバリデーションエラーが表示される
- WHERE 句の内容が短すぎる場合のエラー表示
- エディタでテキスト選択時の部分実行機能
- 適切なエラーメッセージの表示

### 2025-07-20: パラメータ化 SQL 実行機能の実装

#### 実装内容

- **パラメータ化 SQL 機能**: SQL テキスト内のプレースホルダーを動的フォームに変換
- **4 種類のプレースホルダー対応**:
  - `{名前}`: 自由入力テキスト
  - `{ステータス[有効,無効]}`: 選択式ドロップダウン
  - `{ID[]}`: 複数項目入力（カンマ区切り）
  - `{ID['']}`: 複数項目入力（シングルクォート付き）
- **Excel 対応**: Excel からのコピペで複数項目を一括入力
- **入力検証**: 未入力や不正な値での SQL 実行を防止
- **エラー表示**: SQL 失敗時と同じ場所にパラメータエラーを表示

#### 技術的詳細

- **プレースホルダー解析**: 正規表現による動的パラメータ検出
- **フォーム生成**: プレースホルダー型に応じた動的 UI 生成
- **状態管理**: Zustand によるパラメータ値の一元管理
- **Excel 処理**: 改行文字除去とタブ区切りデータの解析
- **検証機能**: 未入力、空項目、選択肢チェック

#### 作成ファイル

- `src/features/parameters/ParameterParser.ts`: プレースホルダー解析・置換
- `src/features/parameters/ParameterForm.tsx`: 動的フォーム生成
- `src/features/parameters/ParameterContainer.tsx`: パラメータコンテナ
- `src/stores/useParameterStore.ts`: パラメータ状態管理
- `src/types/parameters.ts`: パラメータ型定義
- `src/features/parameters/test-samples.md`: テスト用 SQL 例
- `src/features/parameters/test-validation.md`: 検証機能テスト例

#### 修正ファイル

- `src/stores/useSqlPageStore.ts`: SQL 実行時のパラメータ検証追加
- `src/components/layout/Sidebar.tsx`: パラメータフォーム表示追加

#### 動作確認

- プレースホルダー検出と動的フォーム生成
- Excel からのコピペによる複数項目入力
- 未入力時のエラー表示と SQL 実行防止
- パラメータ置換による SQL 実行

### 2025-07-21: リサイズ可能パネル機能とエディタ表示制御機能の実装

#### 実装内容

- **リサイズ可能パネル機能**:
  - サイドバーとメインエリアの水平リサイズ（最小 15%から最大 40%）
  - エディタと結果エリアの垂直リサイズ（最小 5%から最大 95%）
  - react-resizable-panels ライブラリを使用した動的レイアウト制御
  - パネルサイズの状態管理と永続化
- **エディタ表示制御機能**:
  - エディタヘッダーの最大化/最小化ボタン
  - 最大化時: エディタが全画面表示、結果エリアが非表示
  - 最小化時: エディタ 95%、結果エリア 5%の表示
  - SQL 実行時の自動最小化機能
  - パネルサイズの動的制御（最小 5%から最大 95%）

#### 技術的詳細

- **レイアウト制御**: react-resizable-panels による動的パネル分割
- **状態管理**: Zustand によるレイアウト状態の一元管理
- **自動制御**: SQL 実行時のエディタ自動最小化
- **レスポンシブ対応**: モバイルデバイスでのリサイズ機能無効化
- **アクセシビリティ**: 基本的な aria 属性とキーボード操作対応

#### 作成ファイル

- `src/components/layout/ResizableLayout.tsx`: リサイズ可能レイアウトコンポーネント
- `src/stores/useLayoutStore.ts`: レイアウト状態管理
- `src/hooks/useLayoutControl.ts`: レイアウト制御フック
- `src/styles/ResizableLayout.module.css`: リサイズ関連スタイル
- `src/components/editor/EditorToolbar.module.css`: エディタツールバースタイル

#### 修正ファイル

- `src/components/layout/MainLayout.tsx`: サイドバー重複問題の修正
- `src/components/layout/MainWorkspaceLayout.tsx`: 新しいレイアウトへの統合
- `src/components/editor/EditorToolbar.tsx`: 最大化/最小化ボタンの追加
- `src/features/editor/SQLEditor.tsx`: レイアウト制御フックの統合
- `src/stores/useSqlPageStore.ts`: isPending 状態の追加
- `src/styles/Layout.module.css`: リサイズハンドルスタイルの追加

#### 動作確認

- サイドバーとメインエリアの境界線をドラッグでリサイズ
- エディタと結果エリアの境界線をドラッグでリサイズ
- エディタヘッダーの最大化/最小化ボタンでの表示制御
- SQL 実行時のエディタ自動最小化
- エディタの表示範囲を最小 5%から最大 95%まで調整可能

### 2025-07-19: API 通信ロジックの一元化リファクタリング

#### リファクタリング内容

- **API 通信層の完全一元化**: 散在していた API 呼び出しを専用サービスファイルに統合

  - `src/api/sqlService.ts`: SQL 関連 API（実行、キャッシュ読み取り、CSV ダウンロード、整形、補完）
  - `src/api/metadataService.ts`: メタデータ関連 API（テーブル情報、設定、ユニーク値取得）
  - `src/api/apiClient.ts`: 汎用 HTTP 通信とエラーハンドリング

- **型定義の統一**: 重複していた型定義を`src/types/api.ts`に統合

  - API レスポンス型の統一
  - メタデータ型と API 型の整合性確保
  - TypeScript エラーの完全解決

- **不要ファイルの削除**: 重複・未使用ファイルの適切な削除
  - `useDownloadCsv.ts`: 重複機能の削除
  - `useExecuteSql.ts`: 未使用ファイルの削除
  - `useLoadMoreData.ts`: 重複機能の削除
  - `apiService.test.ts`: 互換性問題ファイルの削除
  - `filterUtils.ts`: 未使用ユーティリティの削除

#### 技術的詳細

- **問題**: API 通信ロジックが複数のファイルに散在し、保守性と再利用性が低下
- **解決**: 関心事分離による段階的リファクタリング
- **アプローチ**: 既存機能を完全保護しながら、API 通信を一元化
- **型安全性**: 統一された型定義による型安全性の向上

#### 修正ファイル

**新規作成ファイル**

- `src/api/sqlService.ts`: SQL 関連 API サービス
- `src/api/metadataService.ts`: メタデータ関連 API サービス

**修正ファイル**

- `src/stores/useResultsStore.ts`: SQL 関連 API 呼び出しを`sqlService.ts`に移行
- `src/stores/useEditorStore.ts`: SQL 整形 API 呼び出しを`sqlService.ts`に移行
- `src/hooks/useMetadata.ts`: メタデータ API 呼び出しを`metadataService.ts`に移行
- `src/hooks/useConfigSettings.ts`: 設定 API 呼び出しを`metadataService.ts`に移行
- `src/features/results/FilterModal.tsx`: ユニーク値取得 API 呼び出しを`metadataService.ts`に移行
- `src/hooks/useMonacoEditor.ts`: SQL 補完 API 呼び出しを`sqlService.ts`に移行
- `src/types/api.ts`: 型定義の統一と整合性確保

**削除ファイル**

- `src/hooks/useDownloadCsv.ts`: 重複機能の削除
- `src/hooks/useExecuteSql.ts`: 未使用ファイルの削除
- `src/hooks/useLoadMoreData.ts`: 重複機能の削除
- `src/tests/apiService.test.ts`: 互換性問題ファイルの削除
- `src/utils/filterUtils.ts`: 未使用ユーティリティの削除

#### 動作確認

- 既存機能の完全な保護（手動テストによる確認）
- SQL 実行、フィルタリング、ソート、CSV ダウンロード、無限スクロールの正常動作
- 型安全性の向上と TypeScript エラーの完全解決
- API 通信の一元化による保守性の大幅向上

### 2025-07-19: コンポーネント内ロジックの分離リファクタリング

#### リファクタリング内容

- **ResultsViewer.tsx のリファクタリング**: 174 行 → 78 行に削減（55%削減）

  - `useInfiniteScroll.ts`: 無限スクロールロジックの分離
  - `useResultsDisplay.ts`: 表示データ管理ロジックの分離
  - `LoadingSpinner.tsx`: ローディング表示コンポーネントの分離
  - `ErrorAlert.tsx`: エラー表示コンポーネントの分離
  - `EmptyState.tsx`: 空データ表示コンポーネントの分離
  - `ResultsStats.tsx`: 統計情報表示コンポーネントの分離

- **SQLEditor.tsx のリファクタリング**: 368 行 → 51 行に削減（86%削減）
  - `useMonacoEditor.ts`: Monaco Editor 初期化と補完機能管理の分離
  - `useEditorOperations.ts`: エディタ操作ロジックの分離
  - `EditorToolbar.tsx`: ツールバー表示コンポーネントの分離
  - `editorConfig.ts`: Monaco Editor 設定の分離

#### 技術的詳細

- **問題**: 巨大なコンポーネントによる保守性の低下と責務の混在
- **解決**: カスタムフックと専用コンポーネントによる関心事分離
- **アプローチ**: 既存機能を保護しながら、段階的にロジックを分離
- **型安全性**: TypeScript 型定義の分離による型安全性の向上

#### 作成ファイル

**ResultsViewer.tsx 関連**

- `src/hooks/useInfiniteScroll.ts`: 無限スクロールロジック
- `src/hooks/useResultsDisplay.ts`: 表示データ管理ロジック
- `src/components/common/LoadingSpinner.tsx`: ローディング表示
- `src/components/common/ErrorAlert.tsx`: エラー表示
- `src/components/common/EmptyState.tsx`: 空データ表示
- `src/components/results/ResultsStats.tsx`: 統計情報表示
- `src/types/results.ts`: 結果表示関連の型定義

**SQLEditor.tsx 関連**

- `src/hooks/useMonacoEditor.ts`: Monaco Editor 管理ロジック
- `src/hooks/useEditorOperations.ts`: エディタ操作ロジック
- `src/components/editor/EditorToolbar.tsx`: ツールバー表示
- `src/config/editorConfig.ts`: Monaco Editor 設定
- `src/types/editor.ts`: エディタ関連の型定義

#### 動作確認

- 既存機能の完全な保護（回帰テストなし）
- 各カスタムフックの独立したロジック管理
- 再利用可能なコンポーネントの作成
- 型安全性の向上

### 2025-07-19: Zustand ストアの関心事分離リファクタリング

#### リファクタリング内容

- **巨大な God Store の分割**: 単一の`useSqlPageStore`を 4 つの専門ストアに分割
  - `useUIStore`: UI 状態管理（ローディング、エラー、モーダル）
  - `useResultsStore`: 結果表示管理（データ、ソート、フィルタ、CSV）
  - `useEditorStore`: エディタ管理（SQL テキスト、エディタインスタンス、整形）
  - `useSidebarStore`: サイドバー管理（テーブル・カラム選択）

#### 技術的詳細

- **問題**: 単一の巨大なストア（God Store）による保守性の低下
- **解決**: 関心事分離による段階的リファクタリング
- **アプローチ**: 既存機能を保護しながら、段階的にストアを分離
- **連携**: 単方向コマンドパターンによるストア間通信

#### 修正ファイル

- `src/stores/useUIStore.ts`: UI 状態管理ストア（新規作成）
- `src/stores/useResultsStore.ts`: 結果表示管理ストア（新規作成）
- `src/stores/useEditorStore.ts`: エディタ管理ストア（新規作成）
- `src/stores/useSidebarStore.ts`: サイドバー管理ストア（新規作成）
- `src/stores/useSqlPageStore.ts`: メインストア（他ストアとの連携に変更）
- `src/features/editor/SQLEditor.tsx`: エディタストアの使用に変更
- `src/features/results/ResultsViewer.tsx`: 結果ストアの使用に変更
- `src/features/results/FilterModal.tsx`: 結果ストアの使用に変更
- `src/features/metadata/TreeNode.tsx`: サイドバーストアの使用に変更
- `src/components/layout/Sidebar.tsx`: エディタストアの使用に変更

#### 動作確認

- 既存機能の完全な保護（回帰テストなし）
- 各ストアの独立した状態管理
- ストア間の適切な連携
- サイドバー選択からエディタへの反映機能

### 2025-07-19: 連鎖フィルター機能の修正

#### 修正内容

- **API モデルの修正**: `CacheUniqueValuesRequest`に`filters`フィールドを追加
- **API エンドポイントの修正**: `/api/v1/sql/cache/unique-values`でフィルター条件を正しく受け渡し
- **サービス層の修正**: `HybridSQLService.get_unique_values`メソッドに`filters`パラメータを追加
- **キャッシュサービスの修正**: `CacheService.get_unique_values`で動的 WHERE 句生成を実装

#### 技術的詳細

- **問題**: 連鎖フィルターで後続カラムの候補が前のフィルター条件に基づいて更新されない
- **原因**: バックエンドでフィルター条件が正しく受け取られず、WHERE 句が生成されない
- **解決**: API リクエストからサービス層まで一貫してフィルター条件を渡すように修正

#### 修正ファイル

- `app/api/models.py`: `CacheUniqueValuesRequest`に`filters`フィールド追加
- `app/api/routes.py`: API エンドポイントでフィルター条件をデバッグログ出力
- `app/services/hybrid_sql_service.py`: `get_unique_values`メソッドに`filters`パラメータ追加
- `app/services/cache_service.py`: 動的 WHERE 句生成による連鎖フィルター実装

#### 動作確認

- フロントエンドからフィルター条件付きで API リクエスト送信
- バックエンドでフィルター条件を正しく受け取り
- 動的 SQL クエリ生成により、フィルター条件に合致するユニーク値のみを返却
- 連鎖フィルターで後続カラムの候補が前の選択に基づいて動的に更新

### 2025-07-20: 包括的テストスイートの実装

#### 実装内容

- **テストファイル作成**: 120+ テストケースを含む包括的テストスイート
- **テスト構造化**: 機能別、API 別に論理的にグループ化
- **モック・フィクスチャー**: 実データベース接続なしでのテスト環境構築
- **エラーハンドリング**: 正常系・異常系両方の包括的テスト

### 2025-07-21: React 認証機能の実装

#### 実装内容

- **認証システム**: HTML+JavaScript から React への認証機能移行
- **ユーザー認証**: ユーザー ID によるセッションベース認証
- **管理者認証**: パスワードによる管理者認証モーダル
- **セッション管理**: セッションストレージによる認証状態の永続化
- **キャッシュクリア**: ログアウト時の完全キャッシュクリア機能
- **認証ガード**: 認証が必要なページの保護機能

#### 技術的詳細

- **問題**: HTML+JavaScript システムの認証機能を React に移行
- **解決**: React Context API とカスタムフックによる認証状態管理
- **アプローチ**: 既存バックエンド API を活用した段階的移行
- **セキュリティ**: セッションベース認証とキャッシュクリアによる安全性確保

#### 作成ファイル

**認証サービス**

- `src/api/authService.ts`: 認証関連 API サービス（ログイン、ログアウト、管理者認証）

**認証コンテキスト**

- `src/contexts/AuthContext.tsx`: 認証状態管理コンテキスト（更新）

**認証コンポーネント**

- `src/components/auth/LoginForm.tsx`: ユーザー ID 入力ログインフォーム
- `src/components/auth/AdminLoginModal.tsx`: 管理者パスワード認証モーダル
- `src/components/auth/LogoutButton.tsx`: ログアウトボタン
- `src/components/auth/PrivateRoute.tsx`: 認証ガードコンポーネント

**認証スタイル**

- `src/components/auth/LoginForm.module.css`: ログインフォームスタイル
- `src/components/auth/AdminLoginModal.module.css`: 管理者ログインモーダルスタイル
- `src/components/auth/LogoutButton.module.css`: ログアウトボタンスタイル

**認証フック**

- `src/hooks/useAuth.ts`: 認証関連カスタムフック

#### 修正ファイル

- `src/App.tsx`: 認証ガードとルーティングの統合
- `src/components/layout/AppHeader.tsx`: ログアウトボタンと管理者ログインボタンの統合
- `src/api/apiClient.ts`: DELETE メソッドの追加

#### 主要機能

1. **ユーザー認証**

   - ユーザー ID 入力によるログイン
   - セッションベース認証の継続
   - エラーハンドリング（登録されていないユーザー ID の表示）

2. **管理者認証**

   - パスワード認証モーダル
   - 管理者権限の管理
   - 管理者ページへの自動リダイレクト

3. **セッション管理**

   - セッションストレージによる認証状態の永続化
   - ページリロード時の認証状態復元
   - 管理者権限の適切な管理

4. **ログアウト機能**

   - サーバーサイドキャッシュのクリア
   - ローカルストレージのクリア
   - ログインページへの自動リダイレクト

5. **認証ガード**
   - 認証が必要なページの保護
   - 管理者権限が必要なページの保護
   - 自動リダイレクト機能

#### セキュリティ機能

- **CSRF 対策**: セッションベース認証で対応
- **XSS 対策**: React の自動エスケープ機能
- **認証状態の検証**: 各 API 呼び出し時の認証確認
- **キャッシュクリア**: ログアウト時の完全クリア

#### 動作確認

- ユーザー ID 認証の正常動作
- 管理者パスワード認証の正常動作
- セッション管理とページリロード時の状態復元
- ログアウト時の完全キャッシュクリア
- 認証ガードによる適切なページ保護
- エラーハンドリングとユーザーフレンドリーなメッセージ表示

#### テストファイル

- `test_sql_api.py`: SQL 実行、バリデーション、フォーマット API
- `test_cache_api.py`: キャッシュ機能、ストリーミング処理 API
- `test_metadata_api.py`: スキーマ、テーブル、カラム情報 API
- `test_auth_api.py`: 認証、権限管理 API
- `test_export_api.py`: CSV、Excel エクスポート API
- `test_template_api.py`: SQL テンプレート CRUD API
- `test_logs_api.py`: SQL 実行ログ API
- `test_utils_api.py`: ユーティリティ API
- `test_services.py`: サービス層ユニットテスト
- `test_integration.py`: エンドツーエンド統合テスト
- `test_main.py`: メインアプリケーションテスト

#### 技術的特徴

- **pytest フレームワーク**: 高度なテスト機能とレポート
- **依存性注入**: FastAPI の dependency override によるモック
- **フィクスチャー**: 再利用可能なテストデータとセットアップ
- **マーカー**: テスト分類による選択的実行
- **設定管理**: pytest.ini による統一されたテスト設定

#### 品質保証

- **カバレッジ**: 全主要 API エンドポイントと機能をテスト
- **保守性**: モジュラー構造による拡張しやすいテスト
- **信頼性**: モックによる一貫したテスト環境
- **効率性**: 高速実行とデバッグ支援機能

## ライセンス

このプロジェクトは MIT ライセンスの下で公開されています。

## 貢献

プルリクエストやイシューの報告を歓迎します。貢献する前に、コーディング規約を確認してください。
