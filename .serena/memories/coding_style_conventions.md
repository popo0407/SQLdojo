# 開発スタイル・規約

## Rule_of_coding.md準拠

### 基本原則
- **単一責任原則 (SRP)**: 1つのコンポーネント/関数は1つの責務のみ
- **関心の分離 (SoC)**: UI、ロジック、データアクセスの分離
- **DRY原則**: 重複コードの排除
- **段階的移行**: 既存機能を保護しながらの安全なリファクタリング

### フロントエンド規約

#### TypeScript
- 厳密な型定義の使用
- 共通型は `src/types/common.ts` に配置
- API型は `src/types/api.ts` に配置

#### コンポーネント設計
- 関数コンポーネント + hooks使用
- propsとstateの明確な分離
- カスタムhooksでロジック抽出

#### ファイル命名
- コンポーネント: PascalCase (例: `SqlEditor.tsx`)
- hooks: camelCase with "use" prefix (例: `useEditorStore.ts`)
- utils: camelCase (例: `dataParser.ts`)

#### 状態管理 (Zustand)
- 機能別にストア分離
- 単一責任でstore設計
- actions と state の明確な分離

### バックエンド規約

#### Python
- PEP8準拠
- 型ヒント必須
- docstring記述

#### サービス設計
- `app/services/` 配下に機能別配置
- 依存性注入パターン使用
- 単一責任でサービス設計

#### API設計
- RESTful API原則
- 統一エラーレスポンス
- 適切なHTTPステータスコード使用

### テスト規約
- テスト駆動開発 (TDD)
- 高リスク変更は必須テスト
- テストカバレッジ重視

### コード品質
- 本番コードからconsole.log削除
- エラーハンドリング必須
- ログ出力の適切な使用