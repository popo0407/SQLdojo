# SQL Dojo

SQL Dojo は、Snowflake データベースと連携した SQL クエリの実行・結果表示・エクスポートを行う Web アプリケーションです。

## 🚀 特徴

- **SQL クエリエディタ**: Monaco Editor による高機能な SQL エディタ（パラメータ保護フォーマット機能付き）
- **リアルタイム実行**: SQL クエリのリアルタイム実行と結果表示
- **データエクスポート**: 実行結果の Excel・CSV 形式でのエクスポート
- **キャッシュ機能**: クエリ結果のキャッシュによる高速化
- **管理機能**: クエリログの管理とメタデータ表示
- **レスポンシブ UI**: モダンな UI による快適な操作体験

## 🛠 技術スタック

### フロントエンド

- **React 19.1.0** + TypeScript
- **Vite** - ビルドツール
- **Zustand** - 状態管理
- **React Bootstrap** - UI コンポーネント
- **Monaco Editor** - SQL エディタ
- **React Query** - データフェッチング
- **React Router DOM** - ルーティング
- **Chart.js** - グラフ表示

### バックエンド

- **FastAPI 0.103.2** + Python
- **Uvicorn** - ASGI サーバー
- **pyodbc** - データベース接続
- **Snowflake Connector** - Snowflake 専用接続
- **Pandas** - データ処理
- **OpenPyXL / XlsxWriter** - Excel エクスポート

### テスト

- **Vitest** - フロントエンドテスト
- **Jest** - 追加テストフレームワーク
- **React Testing Library** - コンポーネントテスト
- **pytest** - バックエンドテスト

## 📁 プロジェクト構造

```
SQLdojo/
├── app/                    # バックエンド (FastAPI)
│   ├── api/               # APIルーター・モデル・エラーハンドリング
│   ├── services/          # ビジネスロジック
│   ├── tests/            # バックエンドテスト
│   ├── utils/            # ユーティリティ
│   ├── main.py           # FastAPIアプリケーションエントリーポイント
│   └── config_simplified.py # 設定管理
├── sql-dojo-react/       # フロントエンド (React)
│   └── src/
│       ├── api/          # API通信
│       ├── components/   # 再利用可能UIコンポーネント
│       ├── features/     # 機能別コンポーネント
│       ├── stores/       # Zustand状態管理
│       ├── types/        # TypeScript型定義
│       ├── utils/        # ユーティリティ
│       └── pages/        # ページコンポーネント
├── logs/                 # ログファイル
├── scripts/              # ユーティリティスクリプト
├── requirements.txt      # Python依存関係
└── README.md            # このファイル
```

## � 詳細仕様

### プロジェクト概要の詳細

SQL Dojo は、企業のデータ分析業務を効率化するために開発された Web ベースの SQL クエリ実行プラットフォームです。特に Snowflake データウェアハウスとの統合に特化しており、データアナリストや開発者が直感的に SQL クエリを作成・実行・共有できる環境を提供します。

#### 主な用途

- **データ分析**: 大容量データセットに対するアドホッククエリ実行
- **レポート作成**: 定期的なデータレポートの生成と自動化
- **データ探索**: 新しいデータセットの構造理解と探索
- **チーム協力**: SQL クエリの共有とバージョン管理

### 特徴の詳細説明

#### SQL クエリエディタ

- **構文ハイライト**: SQL 構文の色分け表示により、読みやすさを向上
- **オートコンプリート**: テーブル名、カラム名、SQL 関数の自動補完
- **エラー検出**: リアルタイムでの構文エラー検出と表示
- **フォーマット機能**: SQL クエリの自動整形とインデント調整
- **パラメータ保護フォーマット**: `{パラメータ}` 形式のパラメータを1つの塊として保護するフォーマット機能
- **複数タブ対応**: 複数のクエリを同時に編集可能

#### リアルタイム実行機能

- **非同期実行**: UI をブロックせずにクエリを実行
- **進捗表示**: 長時間実行クエリの進捗状況リアルタイム表示
- **キャンセル機能**: 実行中クエリの中断機能
- **実行履歴**: 過去に実行したクエリの履歴管理
- **パフォーマンス分析**: クエリ実行時間とリソース使用量の表示

#### データエクスポート機能

- **複数形式対応**: Excel (.xlsx)、CSV、JSON 形式でのエクスポート
- **大容量データ対応**: ストリーミング方式による大容量データの効率的エクスポート
- **フィルタリング**: エクスポート時のデータフィルタリング機能
- **圧縮オプション**: 大容量ファイルの ZIP 圧縮
- **チャート埋め込み**: Excel エクスポート時のグラフ自動生成

#### キャッシュ機能

- **結果キャッシュ**: 同一クエリの結果をキャッシュして高速化
- **メタデータキャッシュ**: テーブル構造情報のキャッシュ
- **TTL 管理**: キャッシュの有効期限管理
- **キャッシュクリア**: 手動および自動キャッシュクリア機能

#### 管理機能

- **ユーザー管理**: ロールベースアクセス制御 (RBAC)
- **クエリログ**: 全実行クエリの詳細ログ記録
- **リソース監視**: システムリソースの使用状況監視
- **設定管理**: データベース接続設定の一元管理

#### レスポンシブ UI

- **モバイル対応**: タブレット・スマートフォンでの利用可能
- **ダークモード**: 目に優しいダークテーマ対応
- **カスタマイズ**: ユーザー個別の UI 設定保存
- **アクセシビリティ**: WCAG 準拠のアクセシビリティ対応

### 技術スタックの詳細説明

#### フロントエンド技術詳細

**React 19.1.0 + TypeScript**

- 最新の React 機能（Concurrent Features、Suspense）を活用
- TypeScript 厳密モードによる型安全性の確保
- 関数コンポーネント + Hooks パターンの採用

**Vite（ビルドツール）**

- 高速なホットリロード機能
- ES Modules ベースの最適化されたビルド
- プラグインエコシステムによる拡張性

**Zustand（状態管理）**

- 軽量で直感的な API
- TypeScript 完全対応
- Redux DevTools との統合

**React Bootstrap（UI コンポーネント）**

- Bootstrap 5 ベースのコンポーネント
- レスポンシブデザインの標準化
- カスタムテーマ対応

**Monaco Editor（SQL エディタ）**

- VS Code と同じエディタエンジン
- SQL 構文ハイライトとオートコンプリート
- カスタムキーバインド対応
- **カスタムフォーマッタ**: パラメータ `{パラメータ}` を保護するフォーマット機能（パラメータが改行で分割されないよう保護）

**React Query（データフェッチング）**

- サーバー状態の効率的な管理
- 自動キャッシュとバックグラウンド更新
- エラーハンドリングとリトライ機能

**Chart.js（グラフ表示）**

- 多様なチャートタイプ対応
- インタラクティブなデータ可視化
- レスポンシブグラフ対応

#### バックエンド技術詳細

**FastAPI 0.103.2 + Python**

- 高性能な ASGI フレームワーク
- 自動 OpenAPI/Swagger 文書生成
- Python 型ヒントによるバリデーション

**Uvicorn（ASGI サーバー）**

- 高速な async/await 対応
- ホットリロード機能
- 本番環境での Gunicorn 統合

**pyodbc（データベース接続）**

- 汎用 ODBC 接続ライブラリ
- 複数データベース対応
- 接続プール管理

**Snowflake Connector**

- Snowflake 最適化された専用コネクタ
- SSO 認証対応
- 大容量データの効率的転送

**Pandas（データ処理）**

- 高性能なデータ操作ライブラリ
- メモリ効率的なデータ処理
- 豊富なデータ変換機能

**OpenPyXL / XlsxWriter（Excel エクスポート）**

- Excel ファイルの読み書き
- 複雑なフォーマッティング対応
- チャートとマクロの埋め込み

#### テスト技術詳細

**Vitest（フロントエンドテスト）**

- Vite ネイティブなテストランナー
- Jest 互換 API
- 高速なテスト実行

**React Testing Library**

- ユーザー中心のテストアプローチ
- アクセシビリティテスト対応
- 実際の DOM 操作テスト

**pytest（バックエンドテスト）**

- 豊富なプラグインエコシステム
- 並列テスト実行
- カバレッジレポート生成

### プロジェクト構造の詳細説明

#### バックエンド構造（app/）

**api/ディレクトリ**

- `routes.py`: API エンドポイントの定義
- `models.py`: Pydantic モデルとスキーマ定義
- `error_handlers.py`: エラーハンドリングとレスポンス統一
- `error_utils.py`: エラー処理ユーティリティ関数

**services/ディレクトリ**

- `admin_service.py`: 管理機能のビジネスロジック
- `cache_service.py`: キャッシュ管理サービス
- `completion_service.py`: SQL オートコンプリート機能
- `connection_manager_*.py`: 各データベース接続管理

**tests/ディレクトリ**

- 各機能ごとのユニットテスト
- 統合テスト
- テストフィクスチャとモック

**utils/ディレクトリ**

- 共通ユーティリティ関数
- データ変換処理
- 設定管理ヘルパー

#### フロントエンド構造（sql-dojo-react/src/）

**api/ディレクトリ**

- API クライアント関数
- リクエスト/レスポンス型定義
- エラーハンドリング

**components/ディレクトリ**

- 再利用可能な UI コンポーネント
- 基本的な UI 要素（ボタン、入力フィールドなど）
- レイアウトコンポーネント

**features/ディレクトリ**

- 機能別のコンポーネントグループ
- SQL エディタ機能
- データ表示機能
- エクスポート機能

**stores/ディレクトリ**

- Zustand 状態管理ストア
- アプリケーション状態
- ユーザー設定

**types/ディレクトリ**

- TypeScript 型定義
- API 型定義
- 共通インター faces

**pages/ディレクトリ**

- ルートレベルのページコンポーネント
- ページ固有のロジック

#### 追加ディレクトリ

**logs/ディレクトリ**

- アプリケーションログファイル
- エラーログ
- アクセスログ
- SQL クエリ実行ログ

**scripts/ディレクトリ**

- デプロイメントスクリプト
- データベースマイグレーション
- ユーティリティスクリプト

## �🚦 はじめに

### 必要な環境

- **Python 3.11+**
- **Node.js 18+**
- **npm**

### 環境セットアップ

#### 1. リポジトリのクローン

```bash
git clone <repository-url>
cd SQLdojo
```

#### 2. バックエンドセットアップ

```bash
# Python仮想環境作成・有効化
python -m venv .venv
.venv/Scripts/activate     # Windows
# または
source .venv/bin/activate  # Linux/Mac

# 依存関係インストール
pip install -r requirements.txt
```

#### 3. フロントエンドセットアップ

```bash
cd sql-dojo-react
npm install
```

#### 4. 環境変数設定

```bash
# プロジェクトルートに .env ファイルを作成
cp env.example .env
# 必要な環境変数を設定（Snowflake接続情報など）
```

## 🏃‍♂️ 開発サーバーの起動

### バックエンド起動

```bash
# プロジェクトルートで実行
uvicorn app.main:app --reload --port 8001
```

バックエンドは http://localhost:8001 で起動します

### フロントエンド起動

```bash
cd sql-dojo-react
npm run dev
```

フロントエンドは http://localhost:5173 で起動します

## 🧪 テスト実行

### バックエンドテスト

```bash
# プロジェクトルートで実行
pytest                     # 全テスト実行
pytest --cov              # カバレッジ付き実行
pytest app/tests/test_*.py # 特定テストファイル実行
```

### フロントエンドテスト

```bash
cd sql-dojo-react
npm test                   # Vitestテスト実行
npm run test:watch         # ウォッチモード
npm run test:coverage      # カバレッジ付き実行
npm run test:jest          # Jestテスト実行
```

## 📊 主な機能

### 1. SQL クエリエディタ

- Monaco Editor による構文ハイライト
- オートコンプリート機能
- クエリ履歴管理

### 2. データ表示・エクスポート

- テーブル形式での結果表示
- Excel・CSV 形式でのエクスポート
- 大容量データの効率的な表示

### 3. 管理機能

- クエリ実行ログの管理
- データベースメタデータの表示
- システム設定管理

### 4. パフォーマンス最適化

- クエリ結果のキャッシュ機能
- 仮想化による大量データ表示
- 非同期処理による応答性向上

## 🏗 開発ガイドライン

### コーディング規約

- **単一責任原則 (SRP)**: 1 つのコンポーネント/関数は 1 つの責務のみ
- **関心の分離 (SoC)**: UI、ロジック、データアクセスの分離
- **TypeScript**: 厳密な型定義の使用
- **テスト駆動開発**: 高リスク変更は必須テスト

### ファイル命名規則

- コンポーネント: PascalCase (例: `SqlEditor.tsx`)
- hooks: camelCase with "use" prefix (例: `useEditorStore.ts`)
- utils: camelCase (例: `dataParser.ts`)

詳細は `Rule_of_coding.md` を参照してください。

## 🔌 API 仕様

SQL Dojo は包括的な RESTful API を提供し、SQL クエリの実行、データ管理、システム管理の機能を提供します。

### 認証 API (`/auth`)

| エンドポイント  | メソッド | 説明                   | 認証   |
| --------------- | -------- | ---------------------- | ------ |
| `/login`        | POST     | ユーザーログイン       | 不要   |
| `/logout`       | POST     | ユーザーログアウト     | 必要   |
| `/refresh`      | POST     | トークンリフレッシュ   | 必要   |
| `/users/me`     | GET      | 現在のユーザー情報取得 | 必要   |
| `/admin/login`  | POST     | 管理者ログイン         | 不要   |
| `/admin/logout` | POST     | 管理者ログアウト       | 管理者 |

### SQL クエリ API (`/sql`)

| エンドポイント  | メソッド | 説明                         | 機能                           |
| --------------- | -------- | ---------------------------- | ------------------------------ |
| `/format`       | POST     | SQL クエリの整形             | 構文ハイライト、インデント調整 |
| `/suggest`      | POST     | SQL オートコンプリート       | テーブル名、カラム名の候補提供 |
| `/download/csv` | POST     | CSV ダウンロード（認証不要） | 直接 SQL 実行結果を CSV 出力   |

### キャッシュ API (`/sql/cache`)

| エンドポイント          | メソッド | 説明                     | 機能                                 |
| ----------------------- | -------- | ------------------------ | ------------------------------------ |
| `/execute`              | POST     | キャッシュ付き SQL 実行  | 高速化、進捗管理、大容量データ対応   |
| `/read`                 | POST     | キャッシュデータ読み込み | ページング、フィルタリング、ソート   |
| `/status/{session_id}`  | GET      | 実行状況確認             | 進捗率、処理済み行数の取得           |
| `/cancel`               | POST     | 実行中断                 | 長時間クエリのキャンセル             |
| `/session/{session_id}` | DELETE   | セッションクリーンアップ | キャッシュデータの削除               |
| `/user/{user_id}`       | DELETE   | ユーザーキャッシュクリア | 特定ユーザーのキャッシュ全削除       |
| `/clipboard/tsv`        | POST     | TSV クリップボード出力   | 表計算ソフト向けタブ区切り形式       |
| `/download/excel`       | POST     | Excel ダウンロード       | チャート埋め込み、高度なフォーマット |
| `/unique-values`        | POST     | カラム固有値取得         | フィルタリング用の選択肢提供         |
| `/dummy-data`           | POST     | ダミーデータ生成         | 開発・テスト用データ作成             |

### メタデータ API (`/metadata`)

| エンドポイント                             | メソッド | 説明                                 | 機能                                       |
| ------------------------------------------ | -------- | ------------------------------------ | ------------------------------------------ |
| `/all`                                     | GET      | 全メタデータ取得（権限フィルタ済み） | ユーザー権限に応じたスキーマ・テーブル情報 |
| `/initial`                                 | GET      | 初期メタデータ取得                   | アプリ起動時の基本情報                     |
| `/raw`                                     | GET      | 生メタデータ取得                     | フィルタリング前の全データ                 |
| `/refresh-cache`                           | POST     | メタデータキャッシュ更新             | 最新の DB 構造情報を取得                   |
| `/cache`                                   | DELETE   | メタデータキャッシュクリア           | キャッシュの強制削除                       |
| `/schemas`                                 | GET      | スキーマ一覧取得                     | データベーススキーマのリスト               |
| `/schemas/{schema}/tables`                 | GET      | テーブル一覧取得                     | 指定スキーマ内のテーブル                   |
| `/schemas/{schema}/tables/{table}/columns` | GET      | カラム一覧取得                       | 指定テーブルのカラム情報                   |
| `/visibility-settings`                     | GET/POST | 表示設定管理                         | スキーマ・テーブルの表示/非表示制御        |

### 管理者 API (`/admin`)

#### テンプレート・パーツ管理

| エンドポイント | メソッド        | 説明                 | 機能                      |
| -------------- | --------------- | -------------------- | ------------------------- |
| `/templates`   | GET/POST/DELETE | SQL テンプレート管理 | 定型クエリの作成・管理    |
| `/parts`       | GET/POST/DELETE | SQL パーツ管理       | 再利用可能な SQL 部品管理 |

#### システム管理

| エンドポイント         | メソッド   | 説明                 | 機能                         |
| ---------------------- | ---------- | -------------------- | ---------------------------- |
| `/system/refresh`      | POST       | システムリフレッシュ | 各種キャッシュの一括更新     |
| `/visibility-settings` | GET/POST   | 表示設定管理         | 全体的な表示制御設定         |
| `/logs/sql`            | GET/DELETE | SQL ログ管理         | 全ユーザーのクエリログ管理   |
| `/metadata/all-raw`    | GET        | 管理者用メタデータ   | フィルタなしの完全な DB 情報 |
| `/business-users`      | GET/POST   | ビジネスユーザー管理 | ユーザー権限・グループ管理   |

### ログ API (`/logs`)

| エンドポイント | メソッド   | 説明                    | 機能                                   |
| -------------- | ---------- | ----------------------- | -------------------------------------- |
| `/sql`         | GET/DELETE | ユーザー SQL ログ       | 個人のクエリ履歴管理                   |
| `/admin/sql`   | GET/DELETE | 全 SQL ログ（管理者用） | 全ユーザーのログ表示・削除             |
| `/analytics`   | GET        | ログ分析                | 使用統計・パフォーマンス分析（未実装） |
| `/export`      | POST       | ログエクスポート        | ログデータのエクスポート（未実装）     |

### ユーティリティ API (`/utils`)

| エンドポイント         | メソッド | 説明               | 機能                      |
| ---------------------- | -------- | ------------------ | ------------------------- |
| `/health`              | GET      | ヘルスチェック     | システム状態・DB 接続確認 |
| `/connection/status`   | GET      | DB 接続状況        | 接続プールの状態確認      |
| `/export`              | POST     | データエクスポート | 汎用 CSV エクスポート機能 |
| `/performance/metrics` | GET      | パフォーマンス指標 | システムリソース使用状況  |

### 設定 API (`/config`)

| エンドポイント | メソッド | 説明                 | 機能                               |
| -------------- | -------- | -------------------- | ---------------------------------- |
| `/settings`    | GET      | アプリケーション設定 | ページサイズ、制限値などの設定取得 |

### ユーザー API (`/users`)

| エンドポイント        | メソッド | 説明               | 機能                               |
| --------------------- | -------- | ------------------ | ---------------------------------- |
| `/history`            | GET      | ユーザー履歴       | 個人の SQL 実行履歴（直近 6 か月） |
| `/templates/dropdown` | GET      | テンプレート選択肢 | ドロップダウン用のテンプレート一覧 |
| `/parts/dropdown`     | GET      | パーツ選択肢       | ドロップダウン用のパーツ一覧       |

## 🔧 環境変数設定

SQL Dojo は以下の環境変数で動作をカスタマイズできます。`.env`ファイルに設定してください。

### データベース接続設定

#### Snowflake 接続（メイン）

```bash
# Snowflake接続情報
SNOWFLAKE_ACCOUNT=your-account.snowflakecomputing.com
SNOWFLAKE_USER=your_username
SNOWFLAKE_PRIVATE_KEY_PATH=/path/to/rsa_key.p8
SNOWFLAKE_PRIVATE_KEY_PASSPHRASE=your_passphrase
SNOWFLAKE_WAREHOUSE=your_warehouse
SNOWFLAKE_DATABASE=your_database
SNOWFLAKE_SCHEMA=your_schema
SNOWFLAKE_ROLE=your_role
SNOWFLAKE_USE_KEYPAIR=true  # 鍵ペア認証の有効化
```

#### ログストレージ設定

```bash
# ログ保存先の選択
LOG_STORAGE_TYPE=sqlite  # sqlite | oracle

# SQLite設定（推奨）
SQLITE_LOG_DB_PATH=./logs/sql_logs.db

# Oracle設定（オプション）
ORACLE_DRIVER=Oracle in OraDB19Home1
ORACLE_HOST=your_oracle_host
ORACLE_PORT=1521
ORACLE_SID=your_sid
ORACLE_USER=your_oracle_user
ORACLE_PASSWORD=your_oracle_password
ORACLE_DSN=your_dsn
```

### アプリケーション設定

#### サーバー設定

```bash
# FastAPIサーバー設定
APP_HOST=0.0.0.0
APP_PORT=8001
APP_DEBUG=false
PUBLIC_SERVER_URL=http://your-server-url:8080

# セキュリティ設定
SECRET_KEY=your-secret-key-here
ADMIN_PASSWORD=your-admin-password
```

#### ログレベル設定

```bash
# ログレベル選択
LOG_LEVEL=INFO  # DEBUG | INFO | WARNING | ERROR | CRITICAL

# DEBUG: 最も詳細な情報（開発時のデバッグ用）
# INFO: 正常な動作を示す情報
# WARNING: 予期しない事象や将来問題になる可能性
# ERROR: 重大なエラー（処理が正常完了できない）
# CRITICAL: 致命的なエラー
```

### パフォーマンス・制限設定

#### データ処理制限

```bash
# ページング設定
DEFAULT_PAGE_SIZE=200           # デフォルトページサイズ
CURSOR_CHUNK_SIZE=2000          # データベースから一度に取得する行数

# 大容量データ処理制限
MAX_RECORDS_FOR_DISPLAY=10000000      # 画面表示可能な最大行数
MAX_RECORDS_FOR_CSV_DOWNLOAD=10000000 # CSV出力可能な最大行数
MAX_RECORDS_FOR_EXCEL_DOWNLOAD=1000000 # Excel出力可能な最大行数
MAX_RECORDS_FOR_CLIPBOARD_COPY=50000   # クリップボードコピー可能な最大行数
MAX_ROWS_FOR_EXCEL_CHART=100000        # Excelチャート作成可能な最大行数
```

#### キャッシュ管理設定

```bash
# キャッシュ自動クリーンアップ
CACHE_CLEANUP_ENABLED=true                 # 自動クリーンアップの有効化
CACHE_CLEANUP_INTERVAL_MINUTES=15          # クリーンアップ実行間隔（分）
CACHE_SESSION_TIMEOUT_MINUTES=30           # セッションタイムアウト時間（分）
CACHE_SESSION_CLEANUP_HOURS=12             # セッション削除までの時間（時間）
```

#### タイムアウト設定

```bash
# 各種タイムアウト設定
CONNECTION_TIMEOUT_SECONDS=30    # データベース接続タイムアウト
QUERY_TIMEOUT_SECONDS=1320      # SQLクエリ実行タイムアウト（22分）
API_TIMEOUT_SECONDS=1320        # API応答タイムアウト（22分）
```

### フロントエンド統合設定

#### CORS 設定

```bash
# 許可するオリジン（カンマ区切り）
CORS_ORIGINS=http://localhost:5173,http://127.0.0.1:5173
```

#### 履歴管理設定

```bash
# SQL実行履歴の保持設定
MAX_HISTORY_LOGS=1000  # 保持する履歴の最大件数
```

### 環境変数の優先順位

1. システム環境変数
2. `.env`ファイル
3. `env.example`のデフォルト値

### セキュリティ考慮事項

- **SECRET_KEY**: 本番環境では十分に長く（32 文字以上）ランダムな値を設定
- **ADMIN_PASSWORD**: 強力なパスワードを設定し、定期的に変更
- **データベース認証情報**: 最小権限の原則に従ってアカウントを設定
- **CORS_ORIGINS**: 本番環境では具体的なドメインを指定し、ワイルドカード（\*）は避ける

## 🤝 コントリビューション

1. フィーチャーブランチを作成
2. 変更を実装
3. テストを追加・実行
4. プルリクエストを作成

## 📄 ライセンス

このプロジェクトは私的利用のためのものです。
