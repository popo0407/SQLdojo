# SQL Dojo React

SQL Dojo React は、SQL クエリの実行と結果表示を行う Web アプリケーションです。

## 最新の改善（2025 年 9 月）

### 📊 SQL実行進捗表示機能の実装完了

#### 実装された改善点

**1. リアルタイム進捗表示**
- Snowflakeからのデータ取得中に進捗率をオーバーレイ表示
- 表示内容: `進捗率 12.3% (1,234 / 10,000 レコード)`
- 右上固定位置でのモーダル表示、ブラー効果付き

**2. バックエンドAPI拡張**
- `hybrid_sql_service.py` で進捗情報の計算・送信機能追加
- `current_count`（取得済みレコード数）と `progress_percentage`（進捗率）をレスポンスに含める
- 型安全な進捗データ管理

**3. フロントエンド進捗UI**
- `SqlProgressIndicator.tsx` - 進捗表示専用コンポーネント
- `useProgressIndicator.ts` - 進捗状態管理カスタムフック
- `EditorToolbar.tsx` への統合でSQL実行時の自動表示

#### 技術的成果

```
📁 sql-dojo-react/src/components/common/
├── SqlProgressIndicator.tsx           # 進捗表示コンポーネント
└── SqlProgressIndicator.module.css    # スタイル定義

📁 sql-dojo-react/src/hooks/
└── useProgressIndicator.ts            # 進捗管理フック

📁 sql-dojo-react/src/types/
└── api.ts                            # 進捗情報型定義追加

📁 app/services/
└── hybrid_sql_service.py             # 進捗計算ロジック追加
```

## 過去の改善（2025 年 8 月）

### 🔄 SQL 履歴機能の React 化とエディタ統合一旦完了

#### 実装された改善点

**1. SQL 履歴機能のフル React 化**

**2. エディタ反映機能の実装**

### エクスポート/クリップボード機能 (2025-08 追加)

| 機能                                 | エンドポイント              | フロント操作                           | 制御環境変数                     |
| ------------------------------------ | --------------------------- | -------------------------------------- | -------------------------------- |
| CSV ダウンロード (キャッシュ)        | `/sql/cache/download/csv`   | 結果画面の CSV ボタン (session 必須)   | `max_records_for_csv_download`   |
| CSV ダウンロード (直接 SQL)          | `/sql/download/csv`         | キャッシュ未確立時のみ利用             | 同上                             |
| Excel ダウンロード (キャッシュ)      | `/sql/cache/download/excel` | 結果画面の Excel ボタン (session 必須) | `max_records_for_excel_download` |
| TSV クリップボードコピー(キャッシュ) | `/sql/cache/clipboard/tsv`  | TSV コピー ボタン (session 必須)       | `max_records_for_clipboard_copy` |

#### フロント側コンポーネント

`ExportControls.tsx` が任意ファイル名入力 + CSV/Excel/TSV コピー操作を提供。Zustand `useUIStore` に `exportFilename` と `toasts` を保持し、通知表示は `Toasts` コンポーネント（`main.tsx` へ組込）。

#### 任意ファイル名

UI で拡張子なしの入力可。保存時に `.csv` / `.xlsx` を自動付与（既に付与済なら二重付与しない）。不正文字は `_` に置換し 120 文字に制限。

#### 通知 / エラー統一

成功・警告・エラーはトーストで表示。サーバー側は既存の統一エラーレスポンス（`error_code`, `message` 等）を利用。Excel 無効化やサイズ制限超過時は HTTP ではなく UI 側早期判定で即時トースト。

#### 環境変数 ( `.env` / ホスト設定 )

| 変数                                                                | 役割                   | デフォルト | 備考                      |
| ------------------------------------------------------------------- | ---------------------- | ---------- | ------------------------- |
| `MAX_RECORDS_FOR_EXCEL_DOWNLOAD` / `max_records_for_excel_download` | Excel 許可最大行数     | 100,000    | 超過時 400 LIMIT_EXCEEDED |
| `MAX_RECORDS_FOR_CLIPBOARD_COPY` / `max_records_for_clipboard_copy` | TSV コピー許容最大行数 | 100,000    | 超過時 400 LIMIT_EXCEEDED |
| `MAX_RECORDS_FOR_CSV_DOWNLOAD` / `max_records_for_csv_download`     | CSV 許可最大行数       | 10,000,000 | 既存設定                  |
| `MAX_ROWS_FOR_EXCEL_CHART` / `max_rows_for_excel_chart`             | 通常モード+グラフ閾値  | 100,000    | 以下で将来グラフ許可候補  |

#### 取得 API

フロントは `/config/settings` を初回ロードで呼び、`useUIStore.configSettings` に閾値のみ格納（Excel フラグは廃止）。ボタン活性条件は session_id の有無と行数推定ロジック。

#### テスト

Vitest 結合テスト `ExportControls.integration.test.tsx` で:

1. ファイル名入力反映
2. Excel 機能フラグによるボタン活性/非活性
   を確認。追加でダウンロード API モック・サイズ制限テストを拡張可能。

#### 拡張予定アイデア

- サイズ制限超過時にサーバー応答メッセージをトーストへ反映
- Excel 生成オプション（列幅自動調整、ヘッダースタイル）
- TSV ダウンロード UI ボタン
- 一括エクスポートジョブ（非同期）キューイング
- グラフ付き Excel (行数 <= `max_rows_for_excel_chart` の場合は通常モード活用、それ以上は write_only でグラフ省略)
- **即座転記**: 「エディタに反映」ボタンで SQL を即座にメインエディタに転記
- **SPA 対応**: React Router と useNavigate によるスムーズなナビゲーション
- **二重保証**: Zustand ステートと localStorage 両方での状態管理

**3. 開発環境の整備**

- **依存関係解決**: requirements.txt のエンコーディング問題を解決
- **バックエンド起動**: FastAPI + uvicorn による完全な開発環境

#### 技術的成果

```
📁 src/features/sql-history/
├── components/
│   ├── SqlHistoryTable.tsx     # React化されたSQL履歴テーブル
│   ├── SqlHistoryRow.tsx       # 各行の表示とアクション処理
│   └── SqlHistoryPopover.tsx   # SQLプレビュー表示
├── utils/
│   └── sqlCopyHandler.ts       # エディタ反映ロジック
└── types/
    └── index.ts                # SQL履歴専用型定義

📁 src/hooks/
└── useEditorOperations.ts      # エディタ操作の統合管理

📁 backend/
├── requirements.txt            # UTF-8エンコーディング対応
└── app/                        # FastAPI完全対応
```

**4. UX/UI 改善**

- **テンプレート機能準拠**: 既存テンプレート機能と完全に同じ UX
- **ポップオーバー表示**: SQL 内容をホバーでプレビューする機能は正常に動作していない
- **レスポンシブ対応**: 全デバイスサイズでの最適表示

## 過去の改善（2025 年 7 月）

### 🔄 型定義の重複と不整合の解消完了

#### 実装された改善点

**1. 型定義の統一と整理**

- **共通型定義**: `types/common.ts` - 重複する型定義を統合
- **専用型定義の分離**: `types/api.ts`と`types/results.ts`の責務を明確化
- **段階的移行**: 既存機能を損なわない安全なリファクタリング

**2. 重複型定義の解消**

- **FilterConfig**: 複数箇所での重複定義を統合
- **SortConfig**: 重複定義を削除し、共通型を使用
- **TableRow**: 統一された型定義による整合性確保

**3. 開発憲章の完全遵守**

- ✅ 単一責任の原則（SRP）
- ✅ 関心の分離（SoC）
- ✅ DRY 原則の適用
- ✅ 後方互換性の維持
- ✅ 段階的移行による安全なリファクタリング

#### 技術的成果

```
📁 src/types/
├── common.ts                   # 共通型定義（新規作成）
├── api.ts                      # API通信用型定義（整理済み）
├── results.ts                  # 結果表示専用型定義（整理済み）
├── parameters.ts               # パラメータ専用型定義
├── editor.ts                   # エディタ専用型定義
└── metadata.ts                 # メタデータ専用型定義

📁 src/api/
├── sqlService.ts               # 型参照更新済み
├── metadataService.ts          # 型参照更新済み
└── apiClient.ts                # 型参照更新済み

📁 src/features/results/
└── ResultTable.tsx             # 重複型定義削除済み

📁 src/stores/
├── useResultsPaginationStore.ts # 型参照更新済み
├── useResultsFilterStore.ts     # 型参照更新済み
└── useResultsExecutionStore.ts  # 型参照更新済み
```

### 🔄 AuthContext と ParameterForm のリファクタリング完了

#### 実装された改善点

**1. セッション管理の統一**

- **StorageService**: localStorage を使用した汎用的なセッション管理サービス
- **シングルトンパターン**: 一貫したストレージアクセス
- **sessionStorage → localStorage**: セッション管理の統一

**2. Excel 解析ロジックの分離**

- **DataParser**: 汎用的なデータ解析ユーティリティ
- **拡張可能な設計**: CSV/TSV 対応を考慮した将来性
- **UI コンポーネントからの分離**: 関心の分離の実現

**3. 開発憲章の完全遵守**

- ✅ 単一責任の原則（SRP）
- ✅ 関心の分離（SoC）
- ✅ DRY 原則の適用
- ✅ 本番コードからの console.log 削除
- ✅ 段階的移行による安全なリファクタリング

#### 技術的成果

```
📁 src/services/
├── StorageService.ts           # セッション管理サービス

📁 src/utils/
├── dataParser.ts              # データ解析ユーティリティ

📁 src/contexts/
├── AuthContext.tsx            # リファクタリング済み認証コンテキスト
└── __tests__/
    └── AuthContext.test.tsx   # 包括的テストスイート

📁 src/features/parameters/
├── ParameterForm.tsx          # リファクタリング済みパラメータフォーム
└── __tests__/
    └── ParameterForm.test.tsx # 包括的テストスイート
```

### 🧪 テスト環境の整備

#### テストカバレッジ

**AuthContext**: 認証機能の包括的テスト
**ParameterForm**: パラメータ入力機能の包括的テスト

```typescript
// 実装済みテストカテゴリ
✅ 認証状態の初期化 (2テスト)
✅ ユーザーログイン (3テスト)
✅ 管理者ログイン (3テスト)
✅ ログアウト (2テスト)
✅ パラメータ入力 (8テスト)
✅ Excelペースト機能 (3テスト)
```

#### テスト技術スタック

- **Jest**: テストフレームワーク
- **React Testing Library**: コンポーネントテスト
- **TypeScript**: 型安全なテスト
- **メモリ最適化**: テスト実行時のメモリ不足解消

#### テストの活用方法

```bash
# AuthContextのテスト実行
npm test -- --testPathPattern="AuthContext.test.tsx"

# ParameterFormのテスト実行
npm test -- --testPathPattern="ParameterForm.test.tsx"

# 全テスト実行
npm test
```

### 🔄 FilterModal コンポーネントのリファクタリング完了

#### 実装された改善点

**1. 関心の分離の実現**

- **状態管理**: `useFilterModalState.ts` - フィルタモーダルの状態管理に専念
- **アクション処理**: `useFilterModalActions.ts` - ユーザーアクションの処理に専念
- **UI 表示**: `FilterModal.tsx` - 純粋な UI コンポーネントに簡素化

**2. 開発憲章の完全遵守**

- ✅ 単一責任の原則（SRP）
- ✅ 関心の分離（SoC）
- ✅ テスト駆動開発（TDD）
- ✅ 段階的移行による安全なリファクタリング
- ✅ 既存機能の 100%保持

**3. コード品質の大幅向上**

- 可読性の向上
- 再利用性の向上
- 保守性の向上
- 型安全性の確保

#### 技術的成果

```
📁 src/features/results/
├── hooks/
│   ├── useFilterModalState.ts     # 状態管理フック
│   └── useFilterModalActions.ts   # アクション処理フック
├── types/
│   └── filterModal.ts            # 型定義
├── __tests__/
│   └── FilterModal.test.tsx      # 包括的テストスイート
└── FilterModal.tsx               # 簡素化されたUIコンポーネント
```

### 🧪 React テストの実装状況

#### テストカバレッジ

**FilterModal コンポーネント**: 18 個のテストケースで 100%カバレッジ

```typescript
// 実装済みテストカテゴリ
✅ 初期表示 (2テスト)
✅ ユニーク値の取得 (5テスト)
✅ 検索機能 (2テスト)
✅ 値の選択 (3テスト)
✅ 全選択/全解除機能 (2テスト)
✅ フィルタの適用 (3テスト)
✅ 既存フィルタの復元 (1テスト)
```

#### テスト技術スタック

- **Jest**: テストフレームワーク
- **React Testing Library**: コンポーネントテスト
- **TypeScript**: 型安全なテスト
- **MSW**: API モック

#### テストの活用方法

```bash
# FilterModalのテスト実行
npx jest src/features/results/__tests__/FilterModal.test.tsx

# 特定のテストのみ実行
npx jest -t "検索機能"

# 全テスト実行
npm test
```