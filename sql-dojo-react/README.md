# SQL Dojo React

SQL Dojo の React フロントエンドアプリケーション

## アーキテクチャ

### 状態管理

- **useEditorStore**: SQL エディタの状態管理
- **useResultsStore**: クエリ結果の表示と操作
- **useSqlPageStore**: SQL ページ全体の統合アクション
- **useUIStore**: UI 状態（ローディング、エラー等）
- **useSidebarStore**: サイドバーの状態管理

### カスタムフック

- **useInfiniteScroll**: 無限スクロール機能
- **useMonacoEditor**: Monaco Editor の設定
- **useEditorOperations**: エディタ操作（クリア、フォーマット等）
- **useResultsDisplay**: 結果表示の制御
- **useConfigSettings**: 設定管理
- **useMetadata**: メタデータ取得

### データフロー

1. ユーザーがエディタで SQL を入力
2. `useSqlPageStore`が`useResultsStore`の`executeSql`を呼び出し
3. 結果が`useResultsStore`に保存され、UI が更新される
4. フィルタ・ソート・ページネーションも`useResultsStore`で管理

## 開発

```bash
npm install
npm run dev
```

## ビルド

```bash
npm run build
```

## リファクタリング履歴

### 2024 年 12 月 - 不要なカスタムフックの削除

- `useLoadMoreData.ts`, `useDownloadCsv.ts`, `useExecuteSql.ts` は既に存在せず、機能は適切にストアに実装済み
- `useSqlPageStore`のコメントを改善し、各アクションの責務を明確化
- データフローがシンプルで明確な構造に最適化済み
