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

## テスト（Vitest + jsdom）

### 実行方法

```bash
npm test
# または
npx vitest run
```

### テストファイル命名規則

- `*.test.tsx` / `*.test.ts` で自動検出

### 主要カバレッジ

- FilterModal, ResultTable, ParameterForm, TreeNode, AuthContext など主要機能を網羅
- Excel ペースト・認証・状態管理・UI 分岐などエッジケースもカバー

### Jest からの移行ポイント

- すべて `jest.fn()` → `vi.fn()`、`jest.mock()` → `vi.mock()` へ移行済み
- `@testing-library/jest-dom` matcher は `setupTests.ts` で自動有効化
- jsdom 環境で `ClipboardEvent`/`DataTransfer` などもグローバルモック済み

### 注意

- テストで `act(...)` 警告が出る場合は、`await waitFor` で非同期 UI 更新を待つ
- 未処理 Promise 例外はテストの品質向上のため、今後も随時抑制・改善予定
