# SQL Dojo React - テスト戦略と実装ガイド

## 📊 現在のテスト状況

### テスト実行結果 (2025 年 7 月 22 日現在)

- **テストファイル**: 20 (成功: 13, 失敗: 7)
- **テストケース**: 139 (成功: 94, 失敗: 45)
- **成功率**: 約 68% (継続的改善 ✨)
- **実行時間**: 51.14 秒
- **エラー**: 2 件の Unhandled Rejection (AuthContext)

### 🎉 **最新の改善成果**

1. **TemplateSaveModal 完全修正** ✅

   - **13/13 テスト成功** (以前は 5/9 失敗)
   - フォーム送信・バリデーション・エラーハンドリング全て正常動作

2. **setIsError→setError 完全移行** ✅

   - UIStore, ResultsExecutionStore, ResultsViewer 全て統一
   - 型定義エラー完全解消

3. **test-id 追加とテスト安定化** ✅
   - data-testid 属性追加でセレクタ特定性向上
   - テストログ保存方式確立で問題分析能力向上

### 🚨 **現在失敗中のテストファイル (7/20)**

1. **TemplateDropdown.test.tsx** - 14/14 failed

   - 問題: 日本語文言の不一致（"テンプレート選択" vs "テンプレート" など）
   - 優先度: 高

2. **TemplateProvider.test.tsx** - 1/3 failed

   - 問題: API mock 設定の不備
   - 優先度: 高

3. **TemplateSaveModal.fixed.test.tsx** - 8/13 failed

   - 問題: 重複テストファイル（削除対象）
   - 優先度: 中

4. **ErrorBoundary.test.tsx** - 8/15 failed

   - 問題: コンポーネントエクスポート/インポート不整合
   - 優先度: 高

5. **UserTemplateInlineManagement.test.tsx** - 13/13 failed

   - 問題: 全面的なテスト修正が必要
   - 優先度: 中

6. **ResultsViewer.test.tsx** - 1/5 failed

   - 問題: 軽微なセレクタ/状態管理の問題
   - 優先度: 低

7. **AuthContext.test.tsx** - Unhandled rejection errors
   - 問題: 非同期エラーハンドリングの不備
   - 優先度: 高

### テストフレームワーク構成

- **メインフレームワーク**: Vitest (ESM 対応、高速実行)
- **UI テスト**: React Testing Library
- **モック**: Vi (Vitest 内蔵)
- **カバレッジ**: @vitest/ui で提供

## 🧪 テスト分類と現状

### 1. 単体テスト (Unit Tests)

#### ✅ **実装済み・良好**

- **Zustand ストア**: 各ストアの状態管理ロジック
  - `useResultsDataStore.test.ts`
  - `useResultsFilterStore.test.ts`
  - `useResultsPaginationStore.test.ts`
  - `useResultsExecutionStore.test.ts`
  - `useUIStore.test.ts`

#### 🟡 **実装済み・要改善**

- **React コンポーネント**: 基本的なレンダリングテスト
  - `ParameterForm.test.tsx` - フォーム入力テスト
  - `TemplateDropdown.test.tsx` - ドロップダウン動作テスト

#### ❌ **未実装・緊急**

- **カスタムフック**: ビジネスロジックフック
- **ユーティリティ関数**: データ変換、フォーマット関数
- **型ガード**: TypeScript 型安全性テスト

### 2. 統合テスト (Integration Tests)

#### 🟡 **部分実装**

- **Provider + Context**: 状態管理とコンポーネント連携
  - `TemplateProvider.test.tsx` - 一部失敗
  - `AuthContext.test.tsx` - 基本テスト

#### ❌ **未実装・重要**

- **API 統合**: フロントエンド ↔ バックエンド通信
- **ルーティング**: ページ遷移とナビゲーション
- **フォーム送信**: エンドツーエンドフォーム処理

### 3. E2E テスト (End-to-End Tests)

#### ❌ **未実装**

- **ユーザージャーニー**: 完全なワークフロー
- **クロスブラウザ**: 複数ブラウザ対応
- **パフォーマンス**: レスポンス時間・メモリ使用量

## 🔧 主要な問題と対策

### 現在の主要な問題

1. **ErrorBoundary テスト失敗** (8/15 テスト)

   ```
   Element type is invalid: expected a string (for built-in components)
   or a class/function (for composite components) but got: undefined.
   ```

   **原因**: 関数コンポーネント化によるエクスポート/インポート不整合

2. **TemplateProvider テスト失敗** (2/6 テスト)

   ```
   response.text is not a function
   ```

   **原因**: fetch モックの不完全な設定

3. **TemplateSaveModal テスト失敗** (5/9 テスト)
   ```
   Found multiple elements with the role "textbox"
   ```
   **原因**: セレクタの特定性不足

### 🆕 **Zustand ストア統一化に伴う新規テスト**

#### useTemplateStore.test.ts (新規作成)

**目的**: reducer パターンから Zustand パターンへの移行に伴う新アーキテクチャのテスト

**背景**:

- 従来: `useReducer` + `dispatch` + Context API
- 新方式: Zustand store + 直接アクション関数

**テスト内容**:

1. **初期状態検証** - ストアの初期値確認
2. **基本アクション** - set/get/clear 等の状態操作
3. **モーダル状態管理** - UI 状態の管理
4. **非同期 API 呼び出し** - fetch 処理とエラーハンドリング
5. **データ更新フロー** - CRUD 操作の完全性

**移行戦略**:

- **段階的移行**: 旧テスト（TemplateProvider.test.tsx）と新テスト（useTemplateStore.test.ts）を並行運用
- **機能検証**: 新ストアが旧機能を完全に代替できることを確認
- **完全移行**: 新ストアの安定後、旧テストを段階的廃止

**現在の状況**:

- ✅ 新テスト実装完了 (12 テストケース)
- 🔄 旧テスト修正中 (互換性保持)
- 📋 移行完了後に旧テスト廃止予定

### 解決策

#### 1. ErrorBoundary 修正 (優先度: 高)

```typescript
// 適切なエクスポート形式の統一
export const ErrorBoundary = ...
export { TemplateErrorBoundary, ComponentErrorBoundary }
```

#### 2. API モック改善 (優先度: 高)

```typescript
// 完全なfetchレスポンスモック
global.fetch = vi.fn(() =>
  Promise.resolve({
    ok: true,
    json: () => Promise.resolve({ data: [] }),
    text: () => Promise.resolve(""),
    status: 200,
  })
);
```

#### 3. セレクタ改善 (優先度: 中)

```typescript
// より具体的なセレクタ使用
const templateNameInput = screen.getByLabelText("テンプレート名");
const sqlContentInput = screen.getByLabelText("SQL内容");
```

## 📋 テスト実装優先度

### 🔴 **緊急 (1-2 週間)**

1. **既存テスト修正**

   - ErrorBoundary テストの完全修正
   - TemplateProvider の API モック改善
   - TemplateSaveModal のセレクタ改善

2. **重要なカスタムフックテスト**
   - `useMetadataContext` - メタデータ管理
   - `useTemplateContext` - テンプレート管理
   - `useResultsDisplay` - 結果表示ロジック

### 🟡 **重要 (2-4 週間)**

3. **API クライアントテスト**

   - `templateApi.ts` - CRUD 操作
   - `metadataApi.ts` - メタデータ取得
   - `queryApi.ts` - SQL 実行

4. **主要コンポーネント統合テスト**
   - `SQLEditor` + `ParameterContainer` 連携
   - `ResultsViewer` + `FilterModal` 連携
   - `TemplateDropdown` + `TemplateProvider` 連携

### 🟢 **改善 (1-2 ヶ月)**

5. **E2E テストシナリオ**

   - ログイン → SQL 実行 → 結果表示
   - テンプレート作成 → 保存 → 呼び出し
   - 管理者権限 → テンプレート管理

6. **パフォーマンステスト**
   - 大量データ表示時のレンダリング性能
   - メモリリーク検出
   - バンドルサイズ最適化検証

## 🛠️ テスト実装ベストプラクティス

### 1. テスト構造

```typescript
describe('ComponentName', () => {
  describe('正常動作', () => {
    it('期待される動作を行う', () => { ... })
  })

  describe('エラーハンドリング', () => {
    it('エラー時に適切に処理する', () => { ... })
  })

  describe('エッジケース', () => {
    it('境界値で正しく動作する', () => { ... })
  })
})
```

### 2. モック戦略

```typescript
// 1. APIモック (MSW推奨)
// 2. 外部ライブラリモック (Vi.mock)
// 3. 内部モジュールモック (部分モック)
```

### 3. アサーション原則

```typescript
// 1. ユーザー視点での検証
expect(screen.getByRole("button", { name: "保存" })).toBeEnabled();

// 2. 実装詳細を避ける
// ❌ expect(component.state.isLoading).toBe(false)
// ✅ expect(screen.queryByText('読み込み中')).not.toBeInTheDocument()

// 3. 非同期処理の適切な待機
await waitFor(() => expect(mockApi).toHaveBeenCalled());
```

## 📈 テストメトリクス目標

### 短期目標 (1 ヶ月)

- **テスト成功率**: 90%以上
- **コードカバレッジ**: 70%以上
- **重要パス**: 100%カバー

### 中期目標 (3 ヶ月)

- **テスト成功率**: 95%以上
- **コードカバレッジ**: 80%以上
- **E2E テスト**: 主要ユーザージャーニー対応

### 長期目標 (6 ヶ月)

- **テスト成功率**: 98%以上
- **コードカバレッジ**: 85%以上
- **自動化**: CI/CD パイプライン完全統合

## 🚀 テスト実行コマンド

### 開発時

```bash
# 監視モードでテスト実行
npm run test:watch

# 特定ファイルのテスト
npm test -- ErrorBoundary

# カバレッジ付きテスト
npm run test:coverage

# テスト結果確認できるテスト例
npx vitest run src/features/templates/__tests__/TemplateSaveModal.test.tsx --reporter=verbose > test-results.log 2>&1

# 特定のテストファイルのログ保存
npx vitest run src/features/templates/__tests__/TemplateProvider.test.tsx --reporter=default > templateprovider-test.log 2>&1

# 全テンプレート関連テストのログ保存
npx vitest run src/features/templates/ --reporter=default > templates-all-tests.log 2>&1
```

## 📁 テストログ管理戦略

### ログファイル作成と確認

```bash
# ログファイル作成（標準出力・エラー出力両方を保存）
npx vitest run [テストファイルパス] --reporter=verbose > test-log-$(date +%Y%m%d-%H%M%S).log 2>&1

# ログファイルの内容確認
cat test-results.log | head -50    # 最初の50行
cat test-results.log | tail -20    # 最後の20行
grep -E "(FAIL|PASS|Error)" test-results.log  # 結果のみ抽出
```

### ログファイル自動削除

```bash
# テスト実行後の自動クリーンアップ
npx vitest run src/components/ --reporter=default > temp-test.log 2>&1 && \
  echo "テスト完了。ログを確認中..." && \
  cat temp-test.log && \
  rm temp-test.log

# 古いログファイルの一括削除（7日以上前）
find . -name "*.log" -type f -mtime +7 -delete

# プロジェクト終了時のログクリーンアップ
rm -f test-results.log templatesavemodal-test-results.log templateprovider-test-results.log final-*.log
```

### 継続的テスト実行スクリプト

```bash
# package.jsonに追加推奨スクリプト
"scripts": {
  "test:log": "npx vitest run --reporter=verbose > test-$(date +%Y%m%d-%H%M%S).log 2>&1 && echo 'ログ保存完了'",
  "test:clean": "rm -f *.log && echo 'テストログを削除しました'",
  "test:verify": "npx vitest run --reporter=default > verify-test.log 2>&1 && cat verify-test.log && rm verify-test.log"
}
```

````
### CI/CD

```bash
# 全テスト実行 (結果出力付き)
npm test -- --reporter=verbose --run

# 失敗時詳細出力
## 🔄 テスト改善サイクル

### 毎週

1. **全テスト実行**: すべてのテストスイートを実行
2. **失敗テスト特定**: 継続的に失敗しているテストを記録
3. **優先順位付け**: ビジネス影響度とバグの重要度で優先度決定
4. **修正計画作成**: 次週の修正対象を明確化

### 毎月

1. **成功率測定**: 月次テスト成功率の追跡と改善
2. **テストカバレッジ**: 新機能に対するテストカバレッジ確保
3. **リファクタリング**: 重複テストや不要テストの整理

## 📋 テストログ管理戦略

### ログ保存のベストプラクティス

#### 個別テストファイルの実行とログ保存
```powershell
# 特定のテストファイルを実行してログ保存
npx vitest run src/features/templates/__tests__/TemplateSaveModal.test.tsx --reporter=default > templatesavemodal-test-results.log 2>&1

# テスト結果確認
Get-Content templatesavemodal-test-results.log | Select-Object -Last 20
````

#### 全テストの実行とログ保存

```powershell
# 全テストを実行してログ保存
npx vitest run --reporter=default > current-all-tests.log 2>&1

# テスト統計の確認
Select-String -Path current-all-tests.log -Pattern "Test Files.*failed.*passed" -Context 0,0
```

#### ログファイルのクリーンアップ

```powershell
# 全ログファイル削除
Remove-Item *.log; echo "テストログファイルを削除しました"

# 古いログファイルのみ削除（Windows）
forfiles /p . /m *.log /d -7 /c "cmd /c del @path"
```

### ログ管理のワークフロー

1. **テスト実行前**: 古いログファイルを削除
2. **テスト実行**: 結果をタイムスタンプ付きログファイルに保存
3. **結果確認**: ログファイルから成功/失敗の統計を抽出
4. **分析**: 失敗したテストの詳細を分析
5. **クリーンアップ**: 不要なログファイルを削除

### 推奨ログファイル命名規則

- `all-tests-YYYYMMDD-HHMMSS.log` - 全テスト実行結果
- `{component}-test-YYYYMMDD.log` - 個別コンポーネントテスト
- `fix-{issue}-test.log` - 特定問題修正後の検証テスト
- `verify-test.log` - 一時的な検証用（削除推奨）

この戦略により、テスト結果の追跡、問題の特定、進捗の測定が効率的に行えます。

```

## 🔄 テスト改善サイクル

### 毎週

1. **テスト失敗修正**: 新たに失敗したテストの即時対応
2. **カバレッジ確認**: 新機能のテストカバレッジチェック

### 毎月

1. **テスト戦略見直し**: 効果的でないテストの削除・改善
2. **パフォーマンス測定**: テスト実行時間の最適化

### 四半期

1. **E2E テスト追加**: 新しいユーザージャーニーの追加
2. **テストツール評価**: より良いツール・手法の検討

---

## 📚 参考資料

- [React Testing Library Best Practices](https://kentcdodds.com/blog/common-mistakes-with-react-testing-library)
- [Vitest Configuration Guide](https://vitest.dev/config/)
- [Testing Trophy Strategy](https://kentcdodds.com/blog/the-testing-trophy-and-testing-classifications)

---

**最終更新**: 2025 年 8 月 4 日
**次回見直し予定**: 2025 年 9 月 4 日
```
