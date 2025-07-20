# useResultsStore.ts リファクタリング事前協議

## 現在の状況

### 問題のあるファイル
- `sql-dojo-react/src/stores/useResultsStore.ts` (384行)
- 単一責任の原則違反：データ管理、ソート、フィルタ、ページネーション、CSVダウンロードが混在
- 関心の分離違反：ビジネスロジックとデータアクセスが密結合
- テスト困難性：巨大なストアのため単体テストが困難

### 現在の責務分析
1. **データ管理**: allData, rawData, columns, rowCount, execTime
2. **ソート・フィルタ**: sortConfig, filters, filterModal, applySort, applyFilter
3. **ページネーション**: currentPage, hasMoreData, loadMoreData
4. **CSVダウンロード**: downloadCsv, downloadCsvLocal
5. **セッション管理**: sessionId, configSettings
6. **SQL実行**: executeSql

## 改善要求

開発憲章に従った以下の改善を要求：
- 単一責任の原則の遵守
- 関心の分離の実現
- テスト容易性の向上
- 保守性と拡張性の確保

## 検討すべき改善点

### 1. ストア分割案
```typescript
// 分割後のファイル構成
- useResultsDataStore.ts (データ管理専用)
  - allData, rawData, columns, rowCount, execTime
  - setAllData, setRawData, setColumns, setRowCount, setExecTime
  - clearResults

- useResultsFilterStore.ts (フィルタ・ソート専用)
  - sortConfig, filters, filterModal
  - setSortConfig, setFilters, setFilterModal
  - applySort, applyFilter

- useResultsPaginationStore.ts (ページネーション専用)
  - currentPage, hasMoreData
  - setCurrentPage, setHasMoreData
  - loadMoreData, resetPagination

- useResultsExportStore.ts (CSVダウンロード専用)
  - downloadCsv, downloadCsvLocal

- useResultsSessionStore.ts (セッション管理専用)
  - sessionId, configSettings
  - setSessionId, setConfigSettings

- useResultsExecutionStore.ts (SQL実行専用)
  - executeSql
```

### 2. 依存関係の設計
- 各ストア間の依存関係を最小化
- 共通の型定義を`types/results.ts`に集約
- ストア間の通信はZustandのsubscribe機能を活用

### 3. 段階的移行計画
1. **Phase 1**: 型定義の統一と共通化
2. **Phase 2**: データ管理ストアの分離
3. **Phase 3**: フィルタ・ソートストアの分離
4. **Phase 4**: ページネーションストアの分離
5. **Phase 5**: エクスポートストアの分離
6. **Phase 6**: セッション管理ストアの分離
7. **Phase 7**: SQL実行ストアの分離
8. **Phase 8**: 移行漏れ調査と不要ファイル削除

## 実装方針の検討

### 高リスク変更として扱う理由
- コアロジックの変更（結果表示機能の根幹）
- 共有モジュールの変更（複数のコンポーネントが依存）
- 広範囲に影響する変更（結果表示関連の全機能）

### 憲章の全ルールを厳密適用
1. **影響範囲分析**: 依存関係の徹底的な洗い出し
2. **テスト駆動**: 各段階でのテスト作成と検証
3. **段階的移行**: 8段階の慎重な移行計画
4. **ドキュメント更新**: 変更内容の詳細な記録

### 本番機能の絶対保護
- 既存のAPIインターフェースは維持
- 各段階で動作確認を実施
- 問題発生時は即座にロールバック

## ユーザーに確認すべき不足情報

1. **移行優先順位**: 8段階の移行計画の順序は適切でしょうか？
2. **テスト戦略**: 各段階での動作確認方法について、特に重視したい機能はありますか？
3. **後方互換性**: 既存のコンポーネントとの互換性について、特に注意すべき点はありますか？
4. **パフォーマンス**: ストア分割によるパフォーマンスへの影響について懸念はありますか？
5. **型定義**: 共通化する型定義の範囲について、追加で考慮すべき型はありますか？ 