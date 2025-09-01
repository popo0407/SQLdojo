# SQLdojo プロジェクト概要

## プロジェクトの目的
SQLクエリの実行と結果表示を行うWebアプリケーション。Snowflakeデータベースと接続し、SQL実行、結果表示、エクスポート機能を提供。

## 技術スタック

### フロントエンド
- **React 19.1.0** + TypeScript
- **Vite** - ビルドツール
- **Zustand** - 状態管理
- **React Bootstrap** - UIコンポーネント
- **Monaco Editor** - SQLエディタ
- **React Query** - データフェッチング
- **React Router DOM** - ルーティング

### バックエンド  
- **FastAPI 0.103.2** + Python
- **Uvicorn** - ASGI サーバー
- **pyodbc** - データベース接続
- **Snowflake Connector** - Snowflake専用接続
- **Pandas** - データ処理
- **OpenPyXL / XlsxWriter** - Excel エクスポート

### テスト
- **Vitest** - フロントエンドテスト
- **Jest** - 追加テストフレームワーク  
- **React Testing Library** - コンポーネントテスト
- **pytest** - バックエンドテスト

## プロジェクト構造
```
SQLdojo/
├── app/                    # バックエンド (FastAPI)
│   ├── api/               # APIルーター
│   ├── services/          # ビジネスロジック
│   ├── tests/            # バックエンドテスト
│   └── utils/            # ユーティリティ
├── sql-dojo-react/       # フロントエンド (React)
│   └── src/
│       ├── api/          # API通信
│       ├── components/   # UIコンポーネント
│       ├── features/     # 機能別コンポーネント
│       ├── stores/       # 状態管理
│       ├── types/        # TypeScript型定義
│       └── utils/        # ユーティリティ
└── requirements.txt      # Python依存関係
```