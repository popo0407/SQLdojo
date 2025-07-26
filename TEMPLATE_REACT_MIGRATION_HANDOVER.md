# SQLdojo テンプレート機能 React 化プロジェクト - 引き継ぎ資料

## � 現状の開発環境

### ✅ 開発サーバー状況

- **FastAPI サーバー**: http://0.0.0.0:8001 ✅ 正常稼働中
- **React 開発サーバー**: Vite + TypeScript ✅ ビルドエラーなし
- **TypeScript コンパイル**: ✅ エラーなし
- **Cookie 認証**: ✅ 正常動作（ログイン状態維持）

### ✅ API 実装状況

- **GET** `/api/v1/users/templates-for-dropdown` ✅ **実装済み**
- **GET** `/api/v1/users/template-preferences` ✅ **実装済み**
- **POST** `/api/v1/users/templates` ✅ **実装済み**
- **PUT** `/api/v1/users/templates/{id}` ✅ **実装済み**
- **DELETE** `/api/v1/users/templates/{id}` ✅ **実装済み**
- **GET** `/api/v1/users/templates` ✅ **実装済み**

### ✅ UI/UX 技術スタック

- **フレームワーク**: React 19.1.0 + TypeScript + Vite
- **デザインシステム**: Bootstrap 5.3.7 + React Bootstrap 2.10.10
- **アイコン**: Font Awesome 6.4.0
- **状態管理**: React Context + useReducer + TanStack Query 5.83.0
- **ルーティング**: React Router v7.6.3

### ✅ ルーティング設計

- `/` - HomePage (メインページ)
- `/user` - UserPage (ユーザー画面)
- `/manage-templates` - TemplateManagementPage ⏳ 未実装
- `/admin` - AdminPage (管理画面)
- `/login` - LoginPage
- **認証**: PrivateRoute + 管理者権限制御

---

## �📊 プロジェクト全体進捗

| Phase        | 対象画面     | 実装項目                             | 進捗     | 状態            |
| ------------ | ------------ | ------------------------------------ | -------- | --------------- |
| **Phase 1**  | 共通基盤     | TypeScript 型定義・Context・API 基盤 | **100%** | ✅ **完了**     |
| **Phase 2**  | メインページ | ドロップダウン・保存機能             | **100%** | ✅ **完了**     |
| **Phase 3a** | ユーザー画面 | 個人テンプレート管理                 | **0%**   | ⏳ **未着手**   |
| **Phase 3b** | 管理画面     | 共通テンプレート管理                 | **0%**   | ⏳ **未着手**   |
| **Phase 4**  | 全体調整     | テスト・最適化・デプロイ             | **30%**  | 🔄 **部分完了** |

---

## ✅ 完了済み内容 (Phase 1-2)

### 🏗️ 基盤アーキテクチャ (Phase 1)

#### **ファイル構造**

```
src/features/templates/
├── types/
│   └── template.ts                    ✅ 完了
├── stores/
│   ├── TemplateProvider.tsx           ✅ 完了
│   └── templateReducer.ts             ✅ 完了
├── hooks/
│   ├── useTemplates.ts                ✅ 完了
│   └── useTemplateModals.ts           ✅ 完了
├── components/
│   ├── MainPageTemplate.tsx           ✅ 完了
│   ├── TemplateDropdown.tsx           ✅ 完了
│   └── TemplateSaveModal.tsx          ✅ 完了
└── api/
    ├── apiClient.ts                   ✅ 完了
    └── templateApi.ts                 ✅ 完了
```

#### **実装済み機能**

- ✅ TypeScript 型定義 (Template, TemplateDropdownItem, TemplatePreference 等)
- ✅ Context + useReducer 状態管理
- ✅ API 通信基盤 (credentials: 'include'認証統一)
- ✅ カスタムフック (useTemplates, useTemplateModals)

### 🖥️ メインページ統合 (Phase 2)

#### **実装済み機能**

- ✅ **テンプレートドロップダウン**: 個人・共通テンプレート統合表示
- ✅ **ホバープレビュー**: マウスオーバーで SQL 内容表示
- ✅ **テンプレート保存**: エディタ全体 or 選択範囲の保存
- ✅ **バックエンド連携**: 既存 API との完全互換性
- ✅ **エラーハンドリング**: 適切なエラー表示と回復処理

#### **対応済み API**

- ✅ `GET /api/v1/users/templates-for-dropdown`
- ✅ `GET /api/v1/users/template-preferences`
- ✅ `POST /api/v1/users/templates`

#### **解決済み技術課題**

- ✅ API レスポンス形式不一致 (配列 vs オブジェクト自動判定)
- ✅ React 無限レンダリング (useState 初期化制御)
- ✅ Cookie 認証統一 (credentials: 'include')
- ✅ TypeScript 型エラー (適切な型定義)

---

## ⏳ 未実装内容 (Phase 3-4)

### 🎯 Phase 3a: ユーザー画面テンプレート管理

#### **実装予定場所**

```
src/features/templates/components/management/user/
├── UserTemplateManagementPage.tsx     ⏳ 未実装
├── UserTemplateList.tsx               ⏳ 未実装
├── UserTemplateEditModal.tsx          ⏳ 未実装
├── UserTemplateDeleteModal.tsx        ⏳ 未実装
├── UserTemplateOrderControl.tsx       ⏳ 未実装
└── UserTemplateVisibilityControl.tsx  ⏳ 未実装
```

#### **必要な機能詳細**

##### **📝 個人テンプレート CRUD 操作**

```typescript
⏳ 作成機能
  - ✅ 基本保存 (Phase2で完了)
  - ⏳ 管理画面での新規作成フォーム

⏳ 編集機能
  - ⏳ テンプレート名の変更
  - ⏳ SQL内容の変更
  - ⏳ モーダル編集
  - ⏳ 変更の確定・破棄

⏳ 削除機能
  - ⏳ 個別削除 (確認ダイアログ付き)

⏳ 一覧表示
  - ⏳ テンプレート名・SQL内容プレビュー・表示順
  - ⏳ ソート機能 (名前・作成日・表示順)
```

##### **🔄 表示順序変更**

```typescript

⏳ 上下移動ボタン
  - ⏳ 1つずつ移動
  - ⏳ 先頭・末尾への移動
  - ⏳ キーボードショートカット
```

##### **👁️ 表示/非表示制御**

```typescript
⏳ テンプレート制御
  - ⏳ 個人テンプレート、管理者テンプレートの表示/非表示
  - ⏳ トグルスイッチ
  - ⏳ 即座の反映
  - ⏳ 状態の視覚的表示

⏳ 制御
  - ⏳ 個人設定の保存
```

#### **必要な API 拡張**

```typescript
⏳ PUT /api/v1/users/templates/{id}
  - テンプレート更新 (名前・SQL)

⏳ DELETE /api/v1/users/templates/{id}
  - テンプレート削除

⏳ PUT /api/v1/users/template-preferences
  - 表示設定・順序の一括更新 (実装済み)

⏳ GET /api/v1/users/templates
  - 管理画面用の詳細テンプレート一覧
```

### 🔧 Phase 3b: 管理画面テンプレート管理

#### **実装予定場所**

```
src/features/templates/components/management/admin/
├── AdminTemplateManagementPage.tsx    ⏳ 未実装
├── AdminTemplateList.tsx              ⏳ 未実装
├── AdminTemplateEditModal.tsx         ⏳ 未実装
├── AdminTemplateCreateModal.tsx       ⏳ 未実装
├── AdminTemplateDeleteModal.tsx       ⏳ 未実装
└── AdminTemplateDefaultSettings.tsx   ⏳ 未実装
```

#### **必要な機能詳細**

##### **📝 共通テンプレート管理**

```typescript
⏳ 作成機能
  - ⏳ 新規共通テンプレート作成
  - ⏳ 名前・SQL・カテゴリ設定
  - ⏳ デフォルト表示設定

⏳ 編集機能
  - ⏳ 既存テンプレートの変更・削除

⏳ 一覧管理
  - ⏳ カテゴリ・タグ管理
```

##### **⚙️ デフォルト設定管理**

```typescript
⏳ 新規ユーザー設定
  - ⏳ 初期表示順設定
  - ⏳ カテゴリ別表示設定

```

#### **必要な API 拡張**

```typescript
⏳ GET /api/v1/admin/templates
  - 管理者用テンプレート一覧

⏳ POST /api/v1/admin/templates
  - 共通テンプレート作成

⏳ PUT /api/v1/admin/templates/{id}
  - 共通テンプレート更新

⏳ DELETE /api/v1/admin/templates/{id}
  - 共通テンプレート削除

⏳ PUT /api/v1/admin/template-default-settings
  - デフォルト設定更新
```

### 🚀 Phase 4: 最終調整

#### **完了済み項目**

- ✅ **基本エラーハンドリング**: API 通信エラー・バリデーション
- ✅ **基本パフォーマンス最適化**: useCallback・useMemo・React.memo
- ✅ **TypeScript 型安全性**: 完全な型定義

#### **未完了項目**

```typescript
⏳ 包括的テスト
  - ⏳ ユニットテスト (Jest + React Testing Library)
  - ⏳ 統合テスト (API連携テスト)
  - ⏳ E2Eテスト (Playwright/Cypress)
  - ⏳ 目標カバレッジ: 80%以上

⏳ 高度なパフォーマンス最適化
  - ⏳ React.lazy + Suspense (コード分割)
  - ⏳ APIレスポンスキャッシュ (React Query検討)
  - ⏳ 仮想スクロール (100+テンプレート対応)
  - ⏳ メモ化戦略の見直し

⏳ アクセシビリティ強化
  - ⏳ WAI-ARIA準拠
  - ⏳ キーボードナビゲーション
  - ⏳ スクリーンリーダー対応
  - ⏳ ハイコントラストモード

⏳ プロダクション準備
  - ⏳ バンドルサイズ最適化
  - ⏳ PWA対応 (オフライン機能)
  - ⏳ ブラウザ互換性テスト
  - ⏳ セキュリティ監査
```

---

## 🏗️ 技術アーキテクチャ詳細

### **現在の状態管理構造**

```typescript
// TemplateState (templateReducer.ts)
interface TemplateState {
  // データ
  userTemplates: Template[];           ✅ 実装済み
  adminTemplates: Template[];          ✅ 実装済み
  dropdownTemplates: TemplateDropdownItem[];  ✅ 実装済み
  templatePreferences: TemplatePreference[];  ✅ 実装済み

  // ローディング状態
  isLoading: boolean;                  ✅ 実装済み
  isLoadingDropdown: boolean;          ✅ 実装済み
  isLoadingPreferences: boolean;       ✅ 実装済み

  // エラー状態
  error: string | null;                ✅ 実装済み
}
```

### **実装済み Reducer アクション**

```typescript
✅ SET_LOADING / SET_LOADING_DROPDOWN / SET_LOADING_PREFERENCES
✅ SET_ERROR / CLEAR_ERROR
✅ SET_USER_TEMPLATES / SET_ADMIN_TEMPLATES / SET_DROPDOWN_TEMPLATES
✅ SET_TEMPLATE_PREFERENCES
✅ ADD_USER_TEMPLATE
⏳ UPDATE_USER_TEMPLATE (Phase 3aで実装)
⏳ DELETE_USER_TEMPLATE (Phase 3aで実装)
⏳ REORDER_USER_TEMPLATES (Phase 3aで実装)
⏳ UPDATE_TEMPLATE_PREFERENCES (Phase 3aで実装)
```

### **API 基盤の設計**

```typescript
// apiClient.ts - 完成済み基盤
✅ fetchWithAuth: 共通認証付きfetch
✅ credentials: 'include' 統一済み
✅ エラーハンドリング統一済み
✅ TypeScript型安全性確保

// templateApi.ts - 拡張予定
✅ loadTemplatesForDropdown()
✅ loadTemplatePreferences()
✅ saveUserTemplate()
⏳ updateUserTemplate() (Phase 3aで実装)
⏳ deleteUserTemplate() (Phase 3aで実装)
⏳ updateTemplatePreferences() (Phase 3aで実装)
⏳ loadAdminTemplates() (Phase 3bで実装)
⏳ saveAdminTemplate() (Phase 3bで実装)
⏳ updateAdminTemplate() (Phase 3bで実装)
⏳ deleteAdminTemplate() (Phase 3bで実装)
```

---

## 🎯 次フェーズの推奨実装戦略

### **Phase 3a: ユーザー画面 (推奨期間: 2-3 週間)**

#### **Week 1: 基本 CRUD 実装**

```typescript
1. UserTemplateManagementPage.tsx
   - 基本レイアウト作成
   - useTemplates統合
   - ナビゲーション実装

2. UserTemplateList.tsx
   - テンプレート一覧表示
   - 基本的な表示・非表示切り替え
   - 簡単な編集・削除ボタン

3. API拡張
   - updateUserTemplate()
   - deleteUserTemplate()
   - Reducer拡張 (UPDATE_USER_TEMPLATE, DELETE_USER_TEMPLATE)
```

#### **Week 2: 高度な UX 実装**

```typescript
1. UserTemplateEditModal.tsx
   - モーダル編集
   - バリデーション

2. UserTemplateOrderControl.tsx
   - 上下移動ボタン、ショートカットキー

3. 検索・フィルタ機能
   - 名前・SQL内容での検索
   - 作成日・表示状態でのフィルタ
```

#### **Week 3: 最適化・テスト**

```typescript
1. パフォーマンス最適化
   - メモ化戦略
   - レンダリング最適化

2. ユニットテスト作成
   - コンポーネントテスト
   - カスタムフックテスト
   - API連携テスト

3. UX改善
   - ローディング状態改善
   - エラーメッセージ改善
   - アニメーション追加
```

### **Phase 3b: 管理画面 (推奨期間: 2-3 週間)**

#### **Week 1: 基本管理機能**

```typescript
1. AdminTemplateManagementPage.tsx
   - 管理者レイアウト
   - 権限チェック

2. AdminTemplateList.tsx
   - 共通テンプレート一覧
   - 使用状況表示
   - 基本編集・削除

3. API拡張
   - loadAdminTemplates()
   - saveAdminTemplate()
   - updateAdminTemplate()
   - deleteAdminTemplate()
```

#### **Week 2: 高度な管理機能**

```typescript
1. デフォルト設定管理
   - 新規ユーザー設定
   - 全体ポリシー設定
```

#### **Week 3: 統合・最適化**

```typescript
1. ユーザー画面との統合
   - 共通コンポーネントの抽出
   - 統一されたUX
   - データ同期

2. 管理者専用機能
   - システム設定
```

---

## ⚠️ 重要な技術的注意点

### **継承すべき設計判断**

1. **API レスポンス自動判定**

   ```typescript
   // TemplateProvider.tsx の重要なパターン
   const templates = Array.isArray(data) ? data : data.templates || [];
   ```

2. **認証統一**

   ```typescript
   // 全APIで必須
   credentials: "include";
   ```

3. **初期化制御**

   ```typescript
   // MainPageTemplate.tsx のパターン
   const [isInitialized, setIsInitialized] = useState(false);
   ```

4. **エラーハンドリング**
   ```typescript
   // 統一されたエラー処理
   dispatch({ type: "SET_ERROR", payload: errorMessage });
   ```

### **パフォーマンス考慮事項**

- **API 呼び出し**: React Query 導入でキャッシュ戦略
- **バンドルサイズ**: コード分割と lazy loading

### **ブラウザ・デバイス対応**

- **対象**: Modern browsers (ES2020+)
- **除外**: IE11 サポート不要
- **モバイル**: タッチデバイス完全対応
- **アクセシビリティ**: WAI-ARIA 準拠必須

---

## 🧪 テスト戦略

### **ユニットテスト (80%カバレッジ目標)**

```typescript
// 必須テスト項目
⏳ useTemplates.test.ts
  - 全カスタムフック機能のテスト
  - API連携のモック化テスト
  - エラーハンドリングテスト

⏳ templateReducer.test.ts
  - 全アクションの状態変更テスト
  - エッジケースのテスト

⏳ UserTemplateList.test.tsx
  - コンポーネントレンダリングテスト
  - ユーザーインタラクションテスト
  - プロパティ変更時の動作テスト

⏳ AdminTemplateManagement.test.tsx
  - 権限チェックテスト
  - 管理機能のテスト
```

### **統合テスト**

```typescript
⏳ API連携テスト
  - 実際のバックエンドとの通信テスト
  - 認証フローのテスト
  - エラー応答のテスト

⏳ ユーザーフローテスト
  - テンプレート作成→編集→削除フロー
  - 順序変更→保存フロー
  - 表示設定変更フロー
```

### **E2E テスト**

```typescript
⏳ 主要ユーザーシナリオ
  - 新規ユーザーのテンプレート設定
  - 日常的なテンプレート使用
  - 管理者による全体設定変更

⏳ クロスブラウザテスト
  - Chrome, Firefox, Safari, Edge
  - モバイルブラウザ対応
```

---

## 🚀 完了判定基準

### **Phase 3a 完了の定義**

- [ ] 全ユーザーテンプレート CRUD 操作が完全動作
- [ ] 表示/非表示設定が即座に反映・保存
- [ ] エラーハンドリングが全シナリオで適切
- [ ] ユニットテストカバレッジ 80%以上

### **Phase 3b 完了の定義**

- [ ] 管理者権限チェックが適切に動作
- [ ] 共通テンプレート CRUD 操作が完全動作
- [ ] デフォルト設定が新規ユーザーに適用
- [ ] ユーザー画面との統合が完璧
- [ ] 管理者専用機能が安全に動作

### **プロジェクト全体完了の定義**

- [ ] 既存 JavaScript 機能の 100%置換完了
- [ ] パフォーマンス要件完全クリア
- [ ] テストカバレッジ 80%以上達成
- [ ] アクセシビリティ AA 準拠
- [ ] セキュリティ監査通過
- [ ] プロダクションデプロイ準備完了
- [ ] ユーザー受け入れテスト完了

---

## 📋 推奨ライブラリ・ツール

### **新規導入検討**

````typescript

// データフェッチング・キャッシュ
"@tanstack/react-query": "^4.0.0"   // Phase 4で検討

// テスト
"@testing-library/user-event": "^14.0.0"  // Phase 4で必要
"@playwright/test": "^1.40.0"             // Phase 4で必要

---

## 🧪 テスト戦略・開発体験

### **テスト実装状況**
- **Jest + React Testing Library**: ✅ 環境構築済み
- **Vitest**: ✅ 高速テスト実行環境構築済み
- **Coverage**: vitest run --coverage で取得可能
- **実装テスト**: Phase 2 の MainPageTemplate.tsx のみ実装済み

### **開発コマンド**
```bash
# 開発サーバー起動
npm run dev                    # Vite 開発サーバー

# テスト実行
npm test                       # Vitest (推奨)
npm run test:jest              # Jest
npm run test:watch             # Watch モード
npm run test:coverage          # カバレッジ取得

# ビルド・品質チェック
npm run build                  # TypeScript + Vite ビルド
npm run lint                   # ESLint チェック
npm run preview                # ビルド結果プレビュー
````

### **開発環境の特徴**

- **Hot Reload**: Vite による高速リロード
- **Type Checking**: TypeScript 厳格設定
- **Linting**: ESLint + React Hook Rules
- **Import**: 絶対パス設定 (`src/` から相対)
- **Bootstrap + CSS Modules**: スタイル管理

### **推奨開発フロー**

1. `npm run dev` でサーバー起動
2. `npm run test:watch` でテスト監視
3. 機能実装 → テスト追加 → コミット

---

## 📦 技術的依存関係

### **現在使用中（安定稼働）**

```typescript
// 基盤フレームワーク
"react": "^19.1.0"                   ✅ 継続使用
"react-dom": "^19.1.0"               ✅ 継続使用
"typescript": "^5.0.0"               ✅ 継続使用
"vite": "^6.0.1"                     ✅ 継続使用

// UI・デザイン
"bootstrap": "^5.3.7"                ✅ 継続使用（既存UI統一）
"react-bootstrap": "^2.10.10"        ✅ 継続使用
"@fortawesome/react-fontawesome": "^0.2.2" ✅ 継続使用

// 状態管理・通信
"@tanstack/react-query": "^5.83.0"   ✅ 継続使用
"react-router-dom": "^7.6.3"         ✅ 継続使用

// エディタ・UI拡張
"@monaco-editor/react": "^4.7.0"     ✅ 継続使用
"react-resizable-panels": "^3.0.3"   ✅ 継続使用

// テスト
"jest": "^29.0.0"                    ✅ 継続使用
"vitest": "^2.1.0"                   ✅ 継続使用
"@testing-library/react": "^16.1.0"  ✅ 継続使用
```

---

## 🎯 重要メッセージ

### **✅ Phase 1-2 は本番 ready 状態**

- メインページのテンプレート機能は完全に動作
- 既存 JavaScript との置換が可能
- エラーハンドリング・パフォーマンスも適切

### **🔥 Phase 3 が最重要**

- **ユーザー画面**: 日常使用する管理機能
- **管理画面**: システム全体の制御機能
- 両方とも UI/UX の品質が直接ユーザー体験に影響

### **⚡ 推奨開始順序**

1. **Phase 3a (ユーザー画面)** から開始
2. 基本 CRUD → 順序変更 → 表示制御の順
3. **Phase 3b (管理画面)** は 3a の経験を活かして実装
4. **Phase 4** で品質向上・プロダクション準備

---

---

## 📋 現状確認サマリー (2025-07-25 19:20 時点)

### ✅ 確認済み動作状況

1. **FastAPI サーバー**: http://0.0.0.0:8001 で正常稼働中

   - ログイン認証、メタデータ取得、テンプレート CRUD API すべて動作確認済み
   - Cookie 認証による自動ログイン維持が正常動作

2. **React 開発環境**: TypeScript コンパイルエラーなし

   - `npm run build` 正常完了
   - 全モジュールの型定義問題なし
   - Vite + Hot Reload 環境整備済み

3. **API バックエンド実装**: Phase 3 に必要な API は **すべて実装済み**

   ```bash
   ✅ GET    /api/v1/users/templates              # 一覧取得
   ✅ POST   /api/v1/users/templates              # 作成
   ✅ PUT    /api/v1/users/templates/{id}         # 更新
   ✅ DELETE /api/v1/users/templates/{id}         # 削除
   ✅ GET    /api/v1/users/template-preferences   # 設定取得
   ```

4. **UI/UX 基盤**: Bootstrap 5 + React Bootstrap 環境構築済み
   - レスポンシブデザイン対応
   - Font Awesome アイコン統合
   - CSS Modules によるスタイル管理

### 🎯 次のアクション: Phase 3a 実装開始

**バックエンド API が完備されているため、フロントエンド実装に集中可能**

#### 優先実装順序 (推奨)

1. **UserTemplateList.tsx** - 一覧表示 (GET API を使用)
2. **UserTemplateEditModal.tsx** - 編集機能 (PUT API を使用)
3. **UserTemplateDeleteModal.tsx** - 削除機能 (DELETE API を使用)
4. **順序変更・表示制御** - より高度な機能

#### 技術的な準備状況

- ✅ **型定義**: Template, UpdateTemplateRequest 等すべて定義済み
- ✅ **API クライアント**: templateApi.ts で基盤構築済み
- ✅ **状態管理**: Context + Reducer パターン構築済み
- ✅ **ルーティング**: `/manage-templates` ルート定義済み

### ⚠️ 重要な注意事項

1. **既存 API 仕様維持**: PUT API は「削除 → 新規作成」方式で実装済み
2. **認証**: Cookie 認証 (`credentials: 'include'`) 必須
3. **テスト**: 新機能追加時は必ずテストコード追加推奨
4. **Bootstrap 準拠**: 既存デザインシステムとの統一性維持
