# 推奨開発コマンド

## 環境セットアップ

### フロントエンド (sql-dojo-react/)
```bash
cd sql-dojo-react
npm install
npm run dev        # 開発サーバー起動 (http://127.0.0.1:5173/)
```

### バックエンド (プロジェクトルート)
```bash
# Python仮想環境作成・有効化
python -m venv .venv
.venv\Scripts\activate     # Windows
pip install -r requirements.txt

# FastAPIサーバー起動
uvicorn app.main:app --reload --port 8001
```

## テスト実行

### フロントエンド
```bash
cd sql-dojo-react
npm test                    # Vitestテスト実行
npm run test:watch         # ウォッチモード
npm run test:coverage      # カバレッジ付き
npm run test:jest          # Jestテスト実行
```

### バックエンド
```bash
pytest                     # Python テスト実行
pytest --cov              # カバレッジ付き
```

## ビルド・デプロイ

### フロントエンド
```bash
cd sql-dojo-react
npm run build              # プロダクションビルド
npm run preview            # ビルド確認
npm run lint               # ESLint実行
```

## Git操作
```bash
git status                 # 変更状況確認
git add .                  # 変更をステージング
git commit -m "message"    # コミット
git push                   # プッシュ
```

## Windows固有コマンド
```powershell
Get-Content file.txt       # ファイル内容表示 (cat相当)
Test-Path file.txt         # ファイル存在確認
Remove-Item file.txt       # ファイル削除 (rm相当)
```