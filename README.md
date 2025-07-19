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
4. 実行ボタンでクエリを実行
5. 結果をフィルタリング・ソート・エクスポート

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
│   ├── cache_service.py   # キャッシュ管理
│   ├── metadata_service.py # メタデータ取得
│   └── user_service.py    # ユーザー管理
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
│   │   │   ├── AppHeader.tsx         # ヘッダーコンポーネント
│   │   │   └── Sidebar.tsx           # サイドバーコンポーネント
│   │   ├── common/       # 共通コンポーネント
│   │   │   ├── PrivateRoute.tsx      # 認証ルート
│   │   │   ├── LoadingSpinner.tsx    # ローディング表示
│   │   │   ├── ErrorAlert.tsx        # エラー表示
│   │   │   └── EmptyState.tsx        # 空データ表示
│   │   ├── editor/       # エディタ関連コンポーネント
│   │   │   └── EditorToolbar.tsx     # エディタツールバー
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
│   │   └── metadata/     # メタデータ機能
│   │       ├── MetadataTree.tsx      # メタデータツリー
│   │       ├── TreeNode.tsx          # ツリーノード
│   │       └── MetadataTree.module.css # メタデータスタイル
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
│   │   └── useResultsDisplay.ts      # 結果表示管理フック
│   ├── stores/           # 状態管理（Zustand）
│   │   ├── useSqlPageStore.ts        # メインSQLページ状態管理
│   │   ├── useUIStore.ts             # UI状態管理（ローディング、エラー、モーダル）
│   │   ├── useResultsStore.ts        # 結果表示管理（データ、ソート、フィルタ、CSV）
│   │   ├── useEditorStore.ts         # エディタ管理（SQLテキスト、エディタインスタンス、整形）
│   │   └── useSidebarStore.ts        # サイドバー管理（テーブル・カラム選択）
│   ├── api/              # API通信層
│   │   ├── apiClient.ts              # 汎用APIクライアント
│   │   ├── sqlService.ts             # SQL関連APIサービス
│   │   └── metadataService.ts        # メタデータ関連APIサービス
│   ├── types/            # 型定義
│   │   ├── api.ts                    # API型定義
│   │   ├── metadata.ts               # メタデータ型定義
│   │   ├── editor.ts                 # エディタ型定義
│   │   └── results.ts                # 結果表示型定義
│   ├── contexts/         # Reactコンテキスト
│   │   └── AuthContext.tsx           # 認証コンテキスト
│   ├── config/           # 設定ファイル
│   │   └── editorConfig.ts           # Monaco Editor設定
│   ├── styles/           # グローバルスタイル
│   │   ├── global.css                # グローバルCSS
│   │   └── Layout.module.css         # レイアウトスタイル
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
- **カスタムフック**: ロジック分離による再利用可能な機能
  - `useMonacoEditor.ts`: Monaco Editor 初期化と補完機能管理
  - `useEditorOperations.ts`: エディタ操作ロジック（実行、整形、クリア）
  - `useInfiniteScroll.ts`: 無限スクロールロジック
  - `useResultsDisplay.ts`: 結果表示データ管理ロジック
- **SQL エディタ**: Monaco Editor によるシンタックスハイライトと補完
- **結果表示**: ページネーション対応の結果テーブル表示
- **フィルタリング**: カラム別の動的フィルター機能（連鎖フィルター対応）
- **メタデータ**: ツリー形式でのテーブル・カラム表示
- **認証**: React Context による認証状態管理

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

3. **無限スクロールフロー**

   - ユーザーがスクロールでページ下部に到達
   - `useInfiniteScroll.ts`が`sqlService.ts`で追加データを取得
   - `useResultsStore`が既存データに追加データを結合
   - `ResultsViewer.tsx`が更新されたデータを表示

4. **CSV エクスポートフロー**
   - ユーザーがエクスポートボタンをクリック
   - `useResultsStore`が`sqlService.ts`で CSV ダウンロード API を呼び出し
   - ブラウザがファイルダウンロードを実行

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

## ライセンス

このプロジェクトは MIT ライセンスの下で公開されています。

## 貢献

プルリクエストやイシューの報告を歓迎します。貢献する前に、コーディング規約を確認してください。
