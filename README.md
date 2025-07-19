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
│   │   └── common/       # 共通コンポーネント
│   │       └── PrivateRoute.tsx      # 認証ルート
│   ├── features/         # 機能別コンポーネント
│   │   ├── editor/       # SQLエディタ機能
│   │   │   ├── SQLEditor.tsx         # SQLエディタ本体
│   │   │   ├── SQLEditor.module.css  # エディタスタイル
│   │   │   └── useSqlCompletion.ts   # SQL補完機能
│   │   ├── results/      # 結果表示機能
│   │   │   ├── ResultsViewer.tsx     # 結果ビューアー
│   │   │   ├── ResultTable.tsx       # 結果テーブル
│   │   │   ├── FilterModal.tsx       # フィルターモーダル
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
│   │   ├── useExecuteSql.ts          # SQL実行フック
│   │   ├── useMetadata.ts            # メタデータ取得フック
│   │   ├── useLoadMoreData.ts        # データ読み込みフック
│   │   ├── useDownloadCsv.ts         # CSVダウンロードフック
│   │   └── useConfigSettings.ts      # 設定管理フック
│   ├── stores/           # 状態管理
│   │   └── useSqlPageStore.ts        # SQLページ状態管理（Zustand）
│   ├── api/              # API通信
│   │   └── apiClient.ts              # APIクライアント
│   ├── types/            # 型定義
│   │   ├── api.ts                    # API型定義
│   │   └── metadata.ts               # メタデータ型定義
│   ├── contexts/         # Reactコンテキスト
│   │   └── AuthContext.tsx           # 認証コンテキスト
│   ├── utils/            # ユーティリティ
│   │   └── filterUtils.ts            # フィルター関連ユーティリティ
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

- **状態管理**: Zustand を使用した SQL ページ状態の一元管理
- **SQL エディタ**: Monaco Editor によるシンタックスハイライトと補完
- **結果表示**: ページネーション対応の結果テーブル表示
- **フィルタリング**: カラム別の動的フィルター機能
- **メタデータ**: ツリー形式でのテーブル・カラム表示
- **認証**: React Context による認証状態管理

### データフロー

1. ユーザーが SQL エディタでクエリを入力
2. フロントエンドがバックエンド API にクエリを送信
3. バックエンドがデータベースでクエリを実行
4. 結果をキャッシュに保存し、フロントエンドに返却
5. フロントエンドが結果を表示し、フィルタリング・ソート機能を提供

## 開発ガイドライン

### コード規約

- TypeScript の厳格な型チェック
- ESLint によるコード品質管理
- コンポーネントの単一責任原則
- カスタムフックによるロジック分離

### 状態管理

- Zustand による軽量な状態管理
- セレクターによる派生状態の計算
- 非同期処理の適切なエラーハンドリング

### パフォーマンス

- 大量データの段階的読み込み
- メモ化による不要な再レンダリング防止
- キャッシュによる API 呼び出し最適化

## 更新履歴

### 2025-07-19: 連鎖フィルター機能の修正

#### 修正内容
- **APIモデルの修正**: `CacheUniqueValuesRequest`に`filters`フィールドを追加
- **APIエンドポイントの修正**: `/api/v1/sql/cache/unique-values`でフィルター条件を正しく受け渡し
- **サービス層の修正**: `HybridSQLService.get_unique_values`メソッドに`filters`パラメータを追加
- **キャッシュサービスの修正**: `CacheService.get_unique_values`で動的WHERE句生成を実装

#### 技術的詳細
- **問題**: 連鎖フィルターで後続カラムの候補が前のフィルター条件に基づいて更新されない
- **原因**: バックエンドでフィルター条件が正しく受け取られず、WHERE句が生成されない
- **解決**: APIリクエストからサービス層まで一貫してフィルター条件を渡すように修正

#### 修正ファイル
- `app/api/models.py`: `CacheUniqueValuesRequest`に`filters`フィールド追加
- `app/api/routes.py`: APIエンドポイントでフィルター条件をデバッグログ出力
- `app/services/hybrid_sql_service.py`: `get_unique_values`メソッドに`filters`パラメータ追加
- `app/services/cache_service.py`: 動的WHERE句生成による連鎖フィルター実装

#### 動作確認
- フロントエンドからフィルター条件付きでAPIリクエスト送信
- バックエンドでフィルター条件を正しく受け取り
- 動的SQLクエリ生成により、フィルター条件に合致するユニーク値のみを返却
- 連鎖フィルターで後続カラムの候補が前の選択に基づいて動的に更新

## ライセンス

このプロジェクトは MIT ライセンスの下で公開されています。

## 貢献

プルリクエストやイシューの報告を歓迎します。貢献する前に、コーディング規約を確認してください。
