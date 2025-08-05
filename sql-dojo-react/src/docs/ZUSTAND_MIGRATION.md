# Zustand ストア設計統一化 - 移行ガイド

## 実施内容

### 1. 統一型定義システム (`src/types/index.ts`)

#### 新機能

- 全プロジェクトで使用する型定義を一元管理
- `BaseStoreState`と`BaseStoreActions`でストア統一化
- API 関連型の標準化
- 型ガードユーティリティ関数

#### 移行済み

- ✅ `FilterModalState` → `ResultsFilterModalState` / `FilterModalState`
- ✅ 共通 UI 状態型（`LoadingState`, `PaginationState`等）
- ✅ API 応答型（`ApiResponse<T>`, `ApiError`）

### 2. テンプレートストアの Zustand 化

#### 変更点

- ❌ **旧**: `useReducer` + `dispatch` + Context API
- ✅ **新**: Zustand store + 直接アクション関数

#### 新しいファイル構成

```
src/features/templates/stores/
├── useTemplateStore.ts          # 新しいZustandストア
├── useTemplateStore.test.ts     # 新しいストアのテスト
├── TemplateProvider.tsx         # 旧reducerパターン（段階的廃止予定）
├── templateContext.ts           # 旧contextパターン（段階的廃止予定）
└── templateReducer.ts           # 旧reducerパターン（段階的廃止予定）
```

#### 新しいフック

```
src/features/templates/hooks/
├── useTemplatesNew.ts           # 新しいZustandベースフック
├── useTemplates.ts              # 旧reducerベースフック（段階的廃止予定）
└── useTemplateContext.ts        # 旧contextベースフック（段階的廃止予定）
```

### 3. 統一ストア設計パターン

#### 基本構造

```typescript
interface MyStoreState extends BaseStoreState {
  // データ状態
  items: Item[];
  currentItem: Item | null;

  // UI状態
  isModalOpen: boolean;
}

interface MyStoreActions extends BaseStoreActions {
  // 同期アクション
  setItems: (items: Item[]) => void;
  setCurrentItem: (item: Item | null) => void;

  // 非同期アクション
  fetchItems: () => Promise<void>;
  saveItem: (item: Item) => Promise<void>;
}
```

#### ファイル名規則

- `use[Feature]Store.ts` - メインストア
- `use[Feature]Store.test.ts` - テストファイル
- `create[Feature]Store.ts` - ファクトリー関数（テスト用）

## 移行状況

### ✅ 完了済み

1. **統合型定義システム構築**

   - `src/types/index.ts` 作成
   - `src/types/common.ts` を統合型への re-export 化

2. **UI ストア統一化**

   - `useUIStore.ts` を `BaseStoreState/Actions` 準拠に変更
   - 型定義を統合型システムに移行

3. **新テンプレートストア実装**
   - `useTemplateStore.ts` で Zustand ベース実装
   - `useTemplatesNew.ts` で統合フック提供
   - 完全なテストスイート作成

### 🔄 進行中

1. **既存テストの修正**

   - TemplateSaveModal テストのセレクタ改善
   - TemplateProvider テストの新ストア対応

2. **段階的移行**
   - 既存コンポーネントの新フック使用への切り替え
   - 旧 reducer/context パターンの廃止

### 📋 今後のタスク

1. **他ストアの統一化**

   - `useResultsDataStore`, `useParameterStore` 等を統一パターンに移行

2. **テスト安定化**

   - 既存テストの新ストア構造対応
   - テストカバレッジの維持・向上

3. **ドキュメント更新**
   - 開発者向けストア使用ガイド
   - 型定義使用ガイド

## 利用方法

### 新しいテンプレートストアの使用

```typescript
// 旧パターン（段階的廃止予定）
import { useTemplates } from "../hooks/useTemplates";
import { TemplateProvider } from "../stores/TemplateProvider";

// 新パターン
import { useTemplates } from "../hooks/useTemplatesNew";
// Provider不要、直接Zustandストア使用
```

### 統合型定義の使用

```typescript
// 旧パターン
import { FilterModalState } from "../types/filterModal";
import { TableRow } from "../types/common";

// 新パターン
import type {
  FilterModalState,
  ResultsFilterModalState,
  TableRow,
  BaseStoreState,
  BaseStoreActions,
} from "../../../types";
```

## ベストプラクティス

### 1. 新規ストア作成時

- `BaseStoreState/Actions` を継承
- 統合型定義システムの型を使用
- テストファーストでテストを先に作成

### 2. 既存ストア改修時

- 段階的移行でバックワード互換性を保持
- 旧パターンと新パターンを並行運用
- テストが全て通ることを確認してから旧コード削除

### 3. 型定義追加時

- `src/types/index.ts` への追加を検討
- 複数箇所で使用される型は統合型定義に集約
- JSDoc コメントで用途を明確化

## トラブルシューティング

### よくある問題

1. **型エラー**: 統合型定義からのインポートパス確認
2. **テスト失敗**: 新旧ストアの混在が原因の場合が多い
3. **パフォーマンス**: 不要な store subscription 確認

### デバッグ方法

1. 型エラーは統合型定義 (`src/types/index.ts`) で export されているか確認
2. ストア状態は React DevTools の Zustand 拡張で確認
3. テスト失敗は新しいストア構造に対応しているか確認
