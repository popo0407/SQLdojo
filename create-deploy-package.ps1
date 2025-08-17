# HTMLエディタシステム デプロイパッケージ作成スクリプト (簡易版)

# 設定
$sourceProjectRoot = "C:\Users\user\Downloads\HTMLEditer"
$tempDir = "C:\Users\user\Downloads\HTMLEditor_for_deploy"
$destinationZip = "C:\Users\user\Downloads\DEPLOY_PACKAGE.zip"

Write-Host "======================================" -ForegroundColor Cyan
Write-Host "  HTMLエディタ デプロイパッケージ作成" -ForegroundColor Cyan
Write-Host "======================================" -ForegroundColor Cyan

# フロントエンドのビルド確認
if (-not (Test-Path "$sourceProjectRoot\frontend\build")) {
    Write-Host "ERROR: フロントエンドがビルドされていません。" -ForegroundColor Red
    Write-Host "以下を実行してからやり直してください：" -ForegroundColor Yellow
    Write-Host "cd $sourceProjectRoot\frontend" -ForegroundColor White
    Write-Host "npm run build" -ForegroundColor White
    exit 1
}

# 準備
Write-Host "作業ディレクトリを準備中..." -ForegroundColor Yellow
if (Test-Path $tempDir) { Remove-Item $tempDir -Recurse -Force }
New-Item -ItemType Directory -Path $tempDir -Force | Out-Null

# ルートファイルをコピー
Write-Host "ルートファイルをコピー中..." -ForegroundColor Yellow
Get-ChildItem $sourceProjectRoot -File | Where-Object { 
    $_.Extension -match '\.(md|html|bat|ps1|txt)$' -and $_.Name -notmatch '^(\.env|package-lock\.json)$'
} | ForEach-Object {
    Copy-Item $_.FullName $tempDir -Force
    Write-Host "  ✓ $($_.Name)" -ForegroundColor Green
}

# バックエンドをコピー
Write-Host "バックエンドファイルをコピー中..." -ForegroundColor Yellow
robocopy "$sourceProjectRoot\backend" "$tempDir\backend" /E /XD .venv __pycache__ .git /XF .env *.db *.pyc *.pyo /NFL /NDL /NJH /NJS

# フロントエンドビルド結果をコピー
Write-Host "フロントエンドビルド結果をコピー中..." -ForegroundColor Yellow
New-Item -ItemType Directory -Path "$tempDir\frontend" -Force | Out-Null
robocopy "$sourceProjectRoot\frontend\build" "$tempDir\frontend" /E /NFL /NDL /NJH /NJS

# パッケージ内容表示
Write-Host ""
Write-Host "パッケージ内容:" -ForegroundColor Magenta
Get-ChildItem $tempDir -Recurse -File | ForEach-Object {
    $relativePath = $_.FullName.Replace($tempDir + "\", "")
    Write-Host "  $relativePath" -ForegroundColor Gray
}

# 圧縮
Write-Host ""
Write-Host "パッケージを圧縮中..." -ForegroundColor Yellow
if (Test-Path $destinationZip) { Remove-Item $destinationZip -Force }
Compress-Archive -Path "$tempDir\*" -DestinationPath $destinationZip -Force

# 完了
$sizeMB = [math]::Round((Get-Item $destinationZip).Length / 1MB, 2)
Write-Host ""
Write-Host "✅ デプロイパッケージ作成完了!" -ForegroundColor Green
Write-Host "出力先: $destinationZip" -ForegroundColor White
Write-Host "サイズ: $sizeMB MB" -ForegroundColor White

# 後片付け
Remove-Item $tempDir -Recurse -Force

Write-Host ""
Write-Host "次のステップ:" -ForegroundColor Yellow
Write-Host "1. ZIPファイルを本番サーバーに転送" -ForegroundColor White
Write-Host "2. deploy-to-iis.ps1を実行" -ForegroundColor White
Write-Host "3. CORS設定を環境に合わせて調整" -ForegroundColor White
