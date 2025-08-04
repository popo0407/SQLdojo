# メタデータ取得機能 React 化実装計画

## 実装概要

JavaScript で実装されているメタデータ取得・表示機能を React 化し、管理者専用機能として実装する。

## 技術仕様

### アーキテクチャ

- **機能範囲**: 管理者専用
- **デザイン**: 新デザインシステムに準拠
- **状態管理**: Context + useReducer パターン
- **エラーハンドリング**: 3 段階エラーバウンダリー

### パフォーマンス要件

- **初期表示**: 1 万行データの高速表示
- **更新処理**: 数十万行、5 分許容（進捗表示付き）
- **仮想化**: 大量データ対応の Virtual List 実装

## ファイル構成

```
sql-dojo-react/src/
├── contexts/
│   └── MetadataContext.tsx              # メタデータ状態管理
├── hooks/
│   └── useMetadata.ts                   # メタデータ操作フック
├── features/admin/components/metadata/
│   ├── MetadataManagement.tsx           # メイン管理画面
│   ├── MetadataTree.tsx                 # ツリー表示コンポーネント
│   ├── MetadataRefreshButton.tsx        # 更新ボタン
│   ├── MetadataProgressModal.tsx        # 進捗表示モーダル
│   └── MetadataErrorBoundary.tsx        # エラーハンドリング
├── types/
│   └── metadata.ts                      # 型定義
└── pages/
    └── AdminPage.tsx                    # 管理者ページに統合
```

## API 利用方針

### エンドポイント機能重複の整理

**機能重複あり**:

- ①GET /metadata/all ⇔ ②GET /metadata/raw (権限フィルタリングの有無のみ)
- ③POST /metadata/refresh ⇔ ④GET /admin/metadata/all-raw (更新処理の有無のみ)

### 推奨利用方針

- **GET /metadata/all**: 一般ユーザー向け（権限フィルタリング済み）※既に実装済み
- **POST /metadata/refresh**: 管理者による強制更新（管理者機能で利用）
- **GET /metadata/raw**: 廃止候補（GET /metadata/all で代替可能）
- **GET /admin/metadata/all-raw**: 廃止候補（POST /metadata/refresh で代替可能）

### データフロー

```
1. 初期表示: Context → API(/metadata/all) → Tree表示
2. 強制更新: RefreshButton → API(/metadata/refresh) → 進捗表示 → Context更新
3. エラー時: ErrorBoundary → フォールバック表示
```

## 実装フェーズ

### 既存実装の確認結果

✅ **実装済み**:

- MetadataTree.tsx (階層ツリー表示)
- TreeNode.tsx (3 階層構造表示)
- getAllMetadata() API 呼び出し
- データ型・コメント表示
- エディタ連携機能

### Phase 1: 管理者機能拡張（必須）

- [ ] メタデータ強制更新機能 (POST /metadata/refresh)
- [ ] 更新進捗表示モーダル
- [ ] 管理者ページへの統合
- [ ] エラーハンドリング強化

### Phase 2: UX 向上

- [ ] Virtual List による大量データ対応
- [ ] 検索・フィルタリング機能
- [ ] 詳細エラーメッセージ

### Phase 3: 運用機能

- [ ] 更新ログ出力
- [ ] 管理者通知機能
- [ ] API 重複排除の提案

## 実装詳細

### 状態管理設計

```typescript
interface MetadataState {
  data: Schema[];
  loading: boolean;
  refreshing: boolean;
  error: string | null;
  lastUpdated: Date | null;
  progress: {
    current: number;
    total: number;
    stage: string;
  } | null;
}
```

### ログ・通知要件

- **更新開始**: INFO レベルでログ出力
- **更新完了**: INFO レベル + UI 通知
- **エラー発生**: ERROR レベル + ユーザー通知

## 注意点

### 開発憲章準拠

- **Rule 22**: 既存機能の保護（JavaScript 版との共存）
- **Rule 25**: 段階的実装（Phase 分割）
- **Rule 37**: 3 段階エラーバウンダリー実装

### セキュリティ

- 管理者権限チェックをバックエンドで実施
- フロントエンドでは表示制御のみ

### パフォーマンス

- 初期表示の高速化を最優先
- Virtual List で大量データに対応
- メモリリーク防止の実装
