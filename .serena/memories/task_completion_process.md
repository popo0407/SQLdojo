# タスク完了時の手順

## Rule_of_coding.md準拠の完了プロセス

### 1. 品質チェック
```bash
# フロントエンドテスト
cd sql-dojo-react
npm test
npm run lint

# バックエンドテスト  
cd ..
pytest
```

### 2. 開発憲章違反チェック
- [ ] 単一責任原則の遵守
- [ ] 関心の分離の実現
- [ ] DRY原則の適用
- [ ] 既存機能の保護
- [ ] 適切なテスト実装
- [ ] 型安全性の確保

### 3. ドキュメント更新
- README.md の更新 (必要に応じて)
- コードコメントの追加・更新
- 型定義の追加・更新

### 4. Git操作
```bash
git status                 # 変更範囲確認
git add .                  # 変更をステージング
git commit -m "feat: [機能概要] - [詳細説明]"
git push                   # GitHubにプッシュ
```

### 5. 自己評価・振り返り
以下の質問で自己評価:
- なぜこの問題が発生したか？
- 開発憲章に従うことで防げたか？
- 憲章自体の改善は必要か？

### 6. リスクレベル別対応

#### 高リスク変更
- 完全な影響分析実施
- テスト駆動開発必須
- 段階的移行計画
- 詳細ドキュメント更新

#### 中リスク変更  
- 基本原則遵守
- 関連テスト実行
- ドキュメント更新

#### 低リスク変更
- 基本品質チェックのみ
- セルフレビュー後コミット
- プルリクエストは任意

### 7. テスト実行プロトコル
```powershell
# 修正前テスト実行
npx vitest run path/to/target.test.tsx > pre-test.log 2>&1

# 修正後テスト実行  
npx vitest run path/to/target.test.tsx > post-test.log 2>&1

# 結果比較・検証
echo "ログファイルを確認"
Test-Path "post-test.log"
Get-Content "post-test.log" | Select-Object -First 20 -Last 20

# ログクリーンアップ
Remove-Item "pre-test.log" -Force
Remove-Item "post-test.log" -Force
```