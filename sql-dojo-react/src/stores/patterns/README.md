# Zustand ストア設計パターン

## 統一設計原則

### 1. ストア構造パターン

```typescript
// 基本パターン: 状態 + アクション
interface StoreState {
  // データ状態
  data: T[];
  currentItem: T | null;

  // UI状態
  isLoading: boolean;
  error: string | null;

  // アクション（同期処理）
  setData: (data: T[]) => void;
  setCurrentItem: (item: T | null) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;

  // アクション（非同期処理）
  fetchData: () => Promise<void>;
  createItem: (item: Omit<T, "id">) => Promise<void>;
  updateItem: (id: string, updates: Partial<T>) => Promise<void>;
  deleteItem: (id: string) => Promise<void>;

  // ヘルパーアクション
  reset: () => void;
  clearError: () => void;
}
```

### 2. ファイル名規則

- `use[FeatureName]Store.ts` - 基本ストア
- `use[FeatureName]Store.test.ts` - テストファイル
- `create[FeatureName]Store.ts` - ストアファクトリー（テスト用）

### 3. 非同期処理パターン

```typescript
const fetchData = async () => {
  set({ isLoading: true, error: null });
  try {
    const data = await api.getData();
    set({ data, isLoading: false });
  } catch (error) {
    set({
      error: error instanceof Error ? error.message : "Unknown error",
      isLoading: false,
    });
  }
};
```

### 4. 状態更新パターン

```typescript
// Immerは使わず、スプレッド演算子で不変更新
const updateItem = (id: string, updates: Partial<T>) => {
  set((state) => ({
    data: state.data.map((item) =>
      item.id === id ? { ...item, ...updates } : item
    ),
  }));
};
```

## 移行指針

### Reducer パターンからの移行

1. `useReducer` + `dispatch` → Zustand `set` + アクション関数
2. `action.type` switch 文 → 個別のアクション関数
3. Context Provider → 直接 Zustand ストア使用
