param(
    [string]$DeployPath = "C:\Users\user\Downloads\SQLdojo",
    [string]$DestinationZip = "C:\Users\user\Downloads\DATAZIP2_summary.zip",
    [string]$FrontendSourceDirName = "sql-dojo-react",
    [string]$FrontendBuildDirs = "dist,build"
)

Write-Host "=============================================="
Write-Host "  SQLdojo deploy package builder"
Write-Host "=============================================="

$DeployPath = (Resolve-Path -Path $DeployPath).Path
Write-Host "DeployPath: $DeployPath"

$FrontendSourceRoot = Join-Path $DeployPath $FrontendSourceDirName
if (-not (Test-Path $FrontendSourceRoot)) {
    Write-Host "ERROR: Frontend source directory not found: $FrontendSourceRoot" -ForegroundColor Red
    exit 1
}

$BackendSourceRoot = $DeployPath
Write-Host "Frontend Source: $FrontendSourceRoot"
Write-Host "Backend Source Root: $BackendSourceRoot"

# --- フロントエンドを常に再ビルドする: .env を .env.production にコピーしてビルド ---
Write-Host "フロントエンドのビルド準備を開始します..." -ForegroundColor Yellow

$envProd = Join-Path $FrontendSourceRoot ".env.production"
if (Test-Path $envProd) {
    Write-Host "既存の .env.production を削除します: $envProd" -ForegroundColor Yellow
    Remove-Item $envProd -Force
}

$envFile = Join-Path $FrontendSourceRoot ".env"
if (Test-Path $envFile) {
    Write-Host "frontend/.env を .env.production にコピーします" -ForegroundColor Green
    Copy-Item -Path $envFile -Destination $envProd -Force
} else {
    Write-Host "警告: frontend/.env が見つかりません。ビルド時の環境変数が不足している可能性があります。" -ForegroundColor Yellow
}

Write-Host "npm run build を実行します（$FrontendSourceRoot）" -ForegroundColor Yellow
Push-Location $FrontendSourceRoot
try {
    # npm が存在することを前提にビルドを実行
    & npm run build

    # ビルド後、web.configをdistにコピー（存在する場合のみ）
    $webConfigSrc = Join-Path $DeployPath "web.config"
    $webConfigDest = Join-Path $FrontendSourceRoot "dist\web.config"
    if (Test-Path $webConfigSrc) {
        Write-Host "web.config を dist にコピーします: $webConfigDest" -ForegroundColor Cyan
        Copy-Item -Path $webConfigSrc -Destination $webConfigDest -Force
    } else {
        Write-Host "web.config がルートに存在しません。" -ForegroundColor Yellow
    }
} catch {
    Write-Host "ERROR: npm run build に失敗しました。出力を確認してください。" -ForegroundColor Red
    Pop-Location
    exit 1
}
Pop-Location


$timestamp = Get-Date -Format "yyyyMMddHHmmss"
$tempDir = Join-Path $env:TEMP "SQLdojo_deploy_$timestamp"
New-Item -ItemType Directory -Path $tempDir -Force | Out-Null
Write-Host "Working directory: $tempDir" -ForegroundColor Yellow

# Frontend build output detection
$frontendOutDir = $null
$buildDirList = $FrontendBuildDirs.Split(',') | ForEach-Object { $_.Trim() } | Where-Object { $_ }
foreach ($d in $buildDirList) {
    $candidate = Join-Path $FrontendSourceRoot $d
    if (Test-Path $candidate) { 
        $frontendOutDir = $candidate
        break 
    }
}

if (-not $frontendOutDir) {
    $frontendOutDir = $FrontendSourceRoot
    Write-Host "No frontend build output found. Including full source." -ForegroundColor Yellow
} else {
    Write-Host "Frontend build output detected: $frontendOutDir" -ForegroundColor Yellow
}

# Copy frontend
Write-Host "Copying frontend files..." -ForegroundColor Cyan
$frontendDest = Join-Path $tempDir $FrontendSourceDirName
New-Item -ItemType Directory -Path $frontendDest -Force | Out-Null
$outName = Split-Path $frontendOutDir -Leaf
$finalFrontendDest = Join-Path $frontendDest $outName
New-Item -ItemType Directory -Path $finalFrontendDest -Force | Out-Null
robocopy $frontendOutDir $finalFrontendDest /E /NFL /NDL /NJH /NJS | Out-Null

# Copy backend
Write-Host "Copying backend files..." -ForegroundColor Cyan
$backendTarget = $tempDir

$excludeDirs = @($FrontendSourceDirName, "node_modules", ".git", ".venv", "dist", "build", "logs")
$xdArgs = @()
foreach ($ex in $excludeDirs) { 
    $p = Join-Path $BackendSourceRoot $ex
    if (Test-Path $p) { 
        $xdArgs += $p 
    }
}

$xfArgs = @(".env", "*.db", "*.pyc", "*.pyo")
robocopy $BackendSourceRoot $backendTarget /E /XD $xdArgs /XF $xfArgs /NFL /NDL /NJH /NJS | Out-Null

# Copy meta files
Get-ChildItem $DeployPath -File | Where-Object { $_.Extension -match '\.(md|txt|ps1)$' } | ForEach-Object { 
    Copy-Item $_.FullName $tempDir -Force 
}

Write-Host "Package file list:" -ForegroundColor Cyan
Get-ChildItem $tempDir -Recurse -File | ForEach-Object {
    $relativePath = $_.FullName.Substring($tempDir.Length+1)
    Write-Host "  $relativePath" -ForegroundColor Gray
}

Write-Host "Compressing to ZIP..." -ForegroundColor Yellow
if (Test-Path $DestinationZip) { 
    Remove-Item $DestinationZip -Force 
}

$zipSource = Join-Path $tempDir "*"
Compress-Archive -Path $zipSource -DestinationPath $DestinationZip -Force

$sizeBytes = (Get-Item $DestinationZip).Length
$sizeMB = [math]::Round(($sizeBytes / 1MB), 2)

Write-Host ""
Write-Host "Package creation completed" -ForegroundColor Cyan
Write-Host "Output: $DestinationZip" -ForegroundColor Cyan  
Write-Host "Size: $sizeMB MB ($sizeBytes bytes)" -ForegroundColor Cyan

Remove-Item $tempDir -Recurse -Force

Write-Host "Next step: copy ZIP to server and run deploy-to-iis.ps1 on target server." -ForegroundColor Yellow
