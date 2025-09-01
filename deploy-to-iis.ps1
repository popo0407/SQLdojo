# SQLdojo IIS デプロイメント自動化スクリプト
# サーバー設定専用バージョン (HTTPS対応)
#
# 前提条件:
# 1. 開発PCでビルドされたフロントエンド(本リポでは `$DeployPath\sql-dojo-react`) と
#    バックエンド(ルート直下 app/, main.py 等)# 自己署名証明書を作成
Write-ColorOutput Yellow "  - 自己署名証明書を作成中: $certName (DNS: $($dnsNames -join ', '))"
$newCert = New-SelfSignedCertificate -DnsName $dnsNames -CertStoreLocation $certStorePath -FriendlyName $certName
$certThumbprint = $newCert.ThumbprintDeployPath に配置済みであ# 自己署名証明書を作成
Write-ColorOutput Yellow "  - 自己署名証明書を作成中: $certName (DNS: $($dnsNames -join ', '))"
$newCert = New-SelfSignedCertificate -DnsName $dnsNames -CertStoreLocation $certStorePath -FriendlyName $certName。
#    - フロント成果物: `$DeployPath\sql-dojo-react\dist` (なければ build)
#    - バックエンド: ルート直下 (app, requirements*.txt など)
# 2. このスクリプトは管理者権限で実行してください。
# 3. HTTPSリダイレクト機能には「URL Rewrite」モジュールが必要です。
# 4. PowerShellを管理者権限で開いて、以下を実行
#    PowerShell.exe -ExecutionPolicy Bypass -File "<DeployPath>\deploy-to-iis.ps1"  # 例: C:\Path\To\Your\DeployFolder\deploy-to-iis.ps1

param(
    [string]$SiteName = "SQLdojo",
    [string]$FrontendPort = "81",
    [string]$BackendPort = "8001",
    [string]$DeployPath = (Join-Path (Get-Location) ""),
    [string]$HttpsPort = "443",
    [string]$FrontendDirName = "sql-dojo-react",
    [string]$FrontendBuildCandidates = "dist,build",
    [string]$ServiceName = "SQLdojoAPI",
    [string]$ServiceDisplayName = "SQLdojo API Service",
    [string]$ServiceDescription = "FastAPI backend for SQLdojo"
)

# カラー出力用関数
function Write-ColorOutput($ForegroundColor, $Message) {
    Write-Host -ForegroundColor $ForegroundColor $Message
}

Write-ColorOutput Green "==================================================="
Write-ColorOutput Green "SQLdojo IIS サーバー設定スクリプト開始"
Write-ColorOutput Green "前提：ファイルは $DeployPath に配置済み"
Write-ColorOutput Green "==================================================="

# 1. 管理者権限チェック
if (-NOT ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole] "Administrator")) {
    Write-ColorOutput Red "このスクリプトは管理者権限で実行してください。"
    Read-Host "Enterキーを押して終了..."
    exit 1
}

# 2. 必要なモジュールの確認
Write-ColorOutput Yellow "ステップ 1: 必要なIISモジュールの確認..."
if (!(Get-Module -ListAvailable -Name WebAdministration)) {
    Write-ColorOutput Red "IIS管理モジュールが見つかりません。IISの機能を有効化してください。"
    Read-Host "Enterキーを押して終了..."
    exit 1
}
Import-Module WebAdministration

# 3. デプロイディレクトリの確認
Write-ColorOutput Yellow "ステップ 2: デプロイディレクトリの確認..."
Write-ColorOutput Yellow "検出: DeployPath = $DeployPath"

# フロント/バックエンドの実レイアウト検出 (専用構成)
$FrontendRoot = Join-Path $DeployPath $FrontendDirName
if (-not (Test-Path $FrontendRoot)) {
    Write-ColorOutput Red "フロントエンドディレクトリが見つかりません: $FrontendRoot"
    Read-Host "Enterキーを押して終了..."; exit 1
}
$BackendDeploy = $DeployPath  # ルートをバックエンドとみなす

# 候補 (dist -> build)
$FrontendDeploy = $null
$candidates = $FrontendBuildCandidates.Split(',') | ForEach-Object { $_.Trim() } | Where-Object { $_ }
foreach ($c in $candidates) {
    $candPath = Join-Path $FrontendRoot $c
    if (Test-Path $candPath) { $FrontendDeploy = $candPath; break }
}
if (-not $FrontendDeploy) {
    Write-ColorOutput Red "ビルド成果物 ($FrontendBuildCandidates) が見つかりません。先にフロントエンドをビルドしてください。"
    Read-Host "Enterキーを押して終了..."; exit 1
}

Write-ColorOutput Yellow "フロントエンド成果物: $FrontendDeploy"
Write-ColorOutput Yellow "バックエンドルート: $BackendDeploy"
Write-ColorOutput Green  "検出完了: 実構成に基づきデプロイを続行します。"


# 4. バックエンドの環境設定
Write-ColorOutput Yellow "ステップ 3: バックエンドのPython環境を設定..."

# Pythonの確認
try {
    $pythonVersion = python --version 2>&1
    Write-ColorOutput Green "Python バージョン: $pythonVersion"
} catch {
    Write-ColorOutput Red "Pythonが見つかりません。Pythonをインストールしてください。"
    Read-Host "Enterキーを押して終了..."
    exit 1
}

# 仮想環境の作成とライブラリのインストール
Set-Location $BackendDeploy
if (-not (Test-Path ".venv")) {
    Write-ColorOutput Yellow "Python仮想環境を作成中... (.venv)"
    python -m venv .venv
}

Write-ColorOutput Yellow "仮想環境を有効化し、依存関係をインストール中..."
# PowerShellセッション内で直接有効化するのではなく、pipコマンドへのフルパスを指定して実行
$PipPath = Join-Path $BackendDeploy ".venv\Scripts\pip.exe"
& $PipPath install -r requirements.txt

Write-ColorOutput Green "バックエンドの環境設定が完了しました。"


# 5. IISサイトの作成
Write-ColorOutput Yellow "ステップ 4: IISサイトの作成..."
$siteFullName = "$SiteName-Frontend"

# 既存サイトの削除（存在する場合）
$existingSite = Get-Website -Name $siteFullName -ErrorAction SilentlyContinue
if ($existingSite) {
    Remove-Website -Name $siteFullName
    Write-ColorOutput Yellow "既存のフロントエンドサイトを削除しました。"
}

# フロントエンドサイトの作成
New-Website -Name $siteFullName -Port $FrontendPort -PhysicalPath $FrontendDeploy
Write-ColorOutput Green "フロントエンドサイトを作成しました: http://localhost:$FrontendPort"


# 6. アプリケーションプールの設定
Write-ColorOutput Yellow "ステップ 5: アプリケーションプールの設定..."

$poolName = "$SiteName-Pool"
$existingPool = Get-IISAppPool -Name $poolName -ErrorAction SilentlyContinue
if ($existingPool) {
    Write-ColorOutput Yellow "既存のアプリケーションプール '$poolName' を再利用します。"
} else {
    New-WebAppPool -Name $poolName
    Write-ColorOutput Green "アプリケーションプールを作成しました: $poolName"
}

# マネージドコードなし に設定
Set-ItemProperty -Path "IIS:\AppPools\$poolName" -Name "managedRuntimeVersion" -Value ""
Set-ItemProperty -Path "IIS:\AppPools\$poolName" -Name "enable32BitAppOnWin64" -Value $false

# フロントエンドサイトにアプリケーションプールを割り当て
Set-ItemProperty -Path "IIS:\Sites\$siteFullName" -Name "applicationPool" -Value $poolName
Write-ColorOutput Green "アプリケーションプール '$poolName' をサイトに設定しました。"


# 7. 権限設定
Write-ColorOutput Yellow "ステップ 6: ファイル権限の設定..."
icacls $FrontendDeploy /grant "IIS_IUSRS:(OI)(CI)RX" /T
icacls $BackendDeploy /grant "IIS_IUSRS:(OI)(CI)F" /T  # バックエンド(ルート)に書き込み
Write-ColorOutput Green "ファイル権限を設定しました。"

# 8. HTTPS設定 (自己署名証明書)
Write-ColorOutput Yellow "ステップ 7: HTTPS設定 (自己署名証明書)..."
$certName = "$SiteName Self-Signed Cert"
$serverIP = (Get-NetIPAddress -AddressFamily IPv4 | Where-Object { $_.IPAddress -notlike "127.*" -and $_.IPAddress -notlike "169.254.*" }).IPAddress | Select-Object -First 1
$dnsNames = @("localhost", $serverIP) # localhostとサーバーIPの両方を含める
$certStorePath = "Cert:\LocalMachine\My"

# 既存の同名証明書を削除
Get-ChildItem -Path $certStorePath | Where-Object { $_.FriendlyName -eq $certName } | ForEach-Object {
    Write-ColorOutput Yellow "  - 既存の証明書 '$_' を削除します。"
    Remove-Item -Path $_.PSPath -DeleteKey
}

# 自己署名証明書を作成
Write-ColorOutput Yellow "  - 自己署名証明書を作成中: $certName"
$newCert = New-SelfSignedCertificate -DnsName $dnsName -CertStoreLocation $certStorePath -FriendlyName $certName
$certThumbprint = $newCert.Thumbprint

# HTTPSバインドの作成
Write-ColorOutput Yellow "  - サイト '$siteFullName' に証明書をバインド中 (Port: $HttpsPort)..."
# 既存のHTTPSバインドを削除
Get-WebBinding -Name $siteFullName -Protocol "https" -Port $HttpsPort -ErrorAction SilentlyContinue | Remove-WebBinding
# 新しいHTTPSバインドを作成
New-WebBinding -Name $siteFullName -Protocol "https" -Port $HttpsPort -IPAddress "*"
# バインドに証明書を割り当て
$binding = Get-WebBinding -Name $siteFullName -Protocol "https" -Port $HttpsPort
$binding.AddSslCertificate($certThumbprint, "my")
Write-ColorOutput Green "  証明書のバインドが完了しました。"

# HTTPからHTTPSへのリダイレクトルールを設定
Write-ColorOutput Yellow "  - HTTPからHTTPSへのリダイレクトルールを設定中..."
# URL Rewriteモジュールの存在チェック
try {
    Get-WebConfigurationProperty -pspath 'MACHINE/WEBROOT/APPHOST' -filter "system.webServer/globalModules" -name "." | Where-Object { $_.name -eq 'RewriteModule' } -ErrorAction Stop | Out-Null
    $rewriteModuleInstalled = $true
} catch {
    $rewriteModuleInstalled = $false
}

if (-not $rewriteModuleInstalled) {
    Write-ColorOutput Red "    警告: URL書き換えモジュールがインストールされていません。リダイレクト設定をスキップします。"
} else {
    $siteConfigPath = "IIS:\Sites\$siteFullName"
    $ruleName = "Redirect to HTTPS"
    # 既存のルールをクリア
    Clear-WebConfiguration -pspath $siteConfigPath -filter "system.webServer/rewrite/rules" -ErrorAction SilentlyContinue
    
    # ルール全体を一度に追加する (修正箇所)
    Add-WebConfiguration -pspath $siteConfigPath -Filter "system.webServer/rewrite/rules" -Value @{
        name = $ruleName
        stopProcessing = $true
        match = @{
            url = '(.*)'
        }
        conditions = @(
            @{input = '{HTTPS}'; pattern = '^OFF$'}
        )
        action = @{
            type = 'Redirect'
            url = 'https://{HTTP_HOST}/{R:1}'
            redirectType = 'Permanent'
        }
    }
    Write-ColorOutput Green "  リダイレクトルール '$ruleName' を作成しました。"
}
Write-ColorOutput Green "HTTPS設定が完了しました。"


# 9. 逆プロキシ設定（/api/v1 → バックエンド）
Write-ColorOutput Yellow "ステップ 8: 逆プロキシ設定 (/api/v1 → http://127.0.0.1:$BackendPort) ..."

# --- 追加: グローバル（マシンレベル）で ARR/proxy を有効化しておく ---
Write-ColorOutput Yellow "  - ARR グローバル proxy を有効化（全サイト）..."
try {
    # グローバルに proxy セクションを作成/有効化
    Set-WebConfigurationProperty -pspath "MACHINE/WEBROOT/APPHOST" -filter "system.webServer/proxy" -name "enabled" -value "True"
    Write-ColorOutput Green "  ARR global proxy を有効化しました (MACHINE/WEBROOT/APPHOST)。"
} catch {
    Write-ColorOutput Yellow "  警告: ARR global proxy の有効化に失敗しました。手動で有効化してください。エラー: $_"
}

# ARR( Application Request Routing ) のプロキシ機能を有効化
try {
    Set-WebConfigurationProperty -pspath 'MACHINE/WEBROOT/APPHOST' -filter 'system.webServer/proxy' -name 'enabled' -value 'True' -ErrorAction Stop
    Write-ColorOutput Green "  ARR プロキシを有効化しました。"
} catch {
    Write-ColorOutput Red "  ARR (Application Request Routing) がインストールされていない可能性があります。IISの拡張機能から ARR をインストールしてください。"
}

# ARR（Application Request Routing）を有効化（サイト単位）
Write-ColorOutput Yellow "  - サイト単位でARR proxy を有効化..."
try {
    Set-WebConfigurationProperty -Filter "system.webServer/proxy" -PSPath "IIS:\Sites\$siteFullName" -Name "enabled" -Value "True"
    Write-ColorOutput Green "  サイト '$siteFullName' でARR proxy を有効化しました。"
} catch {
    Write-ColorOutput Yellow "  警告: サイト単位でのARR proxy 有効化に失敗しました。エラー: $_"
}

# サイト配下に /api/v1 のリバースプロキシルールを作成
Write-ColorOutput Yellow "  - /api/v1 リバースプロキシルールを作成..."
try {
    $siteConfigPath = "IIS:\\Sites\\$siteFullName"
    $ruleName = "ReverseProxy-ApiV1"

    # 既存の同名ルールがあれば削除
    Clear-WebConfiguration -pspath $siteConfigPath -filter "system.webServer/rewrite/rules/rule[@name='$ruleName']" -ErrorAction SilentlyContinue

    # /api/v1 以下をバックエンドへリライト（プロキシ）
    Add-WebConfiguration -pspath $siteConfigPath -Filter "system.webServer/rewrite/rules" -Value @{
        name = $ruleName
        stopProcessing = $true
        match = @{ url = '^api/v1/(.*)' }
        action = @{ type = 'Rewrite'; url = "http://127.0.0.1:$BackendPort/{R:0}"; logRewrittenUrl = $true }
    }
    Write-ColorOutput Green "  リバースプロキシルール '$ruleName' を作成しました。"
} catch {
    Write-ColorOutput Red "  逆プロキシルールの作成に失敗しました。URL Rewrite と ARR のインストール状況をご確認ください。"
}
# 10. Windowsサービスとしてバックエンドを起動（NSSM使用）
Write-ColorOutput Yellow "ステップ 9: バックエンドサービスの登録..."

# 既存サービスの停止・削除
$existingService = Get-Service -Name $ServiceName -ErrorAction SilentlyContinue
if ($existingService) {
    Write-ColorOutput Yellow "既存のサービス '$ServiceName' を停止・削除します..."
    Stop-Service -Name $ServiceName -Force -ErrorAction SilentlyContinue
    sc.exe delete $ServiceName
    Start-Sleep -Seconds 2 # 削除が反映されるまで少し待機
}

# NSSMを使用してサービス作成
try {
    # nssm.exeがPATH上にあるか確認
    $nssmPath = Get-Command nssm.exe -ErrorAction Stop
    
    # サービス作成に必要なパスと引数を定義
    # python 実行ファイルの決定
    if (Test-Path (Join-Path $BackendDeploy ".venv\Scripts\python.exe")) {
        $pythonPath = Join-Path $BackendDeploy ".venv\Scripts\python.exe"
    } else {
        $pythonPath = (Get-Command python -ErrorAction SilentlyContinue).Source
    }
    $startupDir = $BackendDeploy
    $arguments = "-m uvicorn app.main:app --host 127.0.0.1 --port $BackendPort"
    
    Write-ColorOutput Green "NSSM を使用してサービス '$ServiceName' を作成します。"
    & $nssmPath install $ServiceName $pythonPath $arguments
    & $nssmPath set $ServiceName AppDirectory $startupDir
    & $nssmPath set $ServiceName DisplayName $ServiceDisplayName
    & $nssmPath set $ServiceName Description $ServiceDescription
    & $nssmPath set $ServiceName Start SERVICE_AUTO_START
    
    # サービス開始
    Start-Service -Name $ServiceName
    Write-ColorOutput Green "バックエンドサービスを作成・開始しました: $ServiceName"
    
} catch {
    Write-ColorOutput Red "---------------------------------------------------"
    Write-ColorOutput Red "NSSM が見つかりませんでした。"
    Write-ColorOutput Red "バックエンドは手動で起動する必要があります。"
    Write-ColorOutput Yellow "手動起動コマンド:"
    Write-ColorOutput Yellow "cd $BackendDeploy"
    Write-ColorOutput Yellow ".\.venv\Scripts\Activate.ps1"
    Write-ColorOutput Yellow "python -m uvicorn app.main:app --host 127.0.0.1 --port $BackendPort"
    Write-ColorOutput Red "---------------------------------------------------"
}


# 11. 最終確認
Write-ColorOutput Green "==================================================="
Write-ColorOutput Green "デプロイメントスクリプトが完了しました！"
Write-ColorOutput Green "==================================================="
Write-ColorOutput White "フロントエンド URL (HTTPS): https://localhost:$HttpsPort"
Write-ColorOutput White "フロントエンド URL (HTTP):  http://localhost:$FrontendPort"
Write-ColorOutput White "バックエンドはサービスとして実行中です (http://localhost:$BackendPort)"
Write-ColorOutput White ""
Write-ColorOutput White "デプロイメント場所(ルート=Backend): $DeployPath"
Write-ColorOutput White "フロントエンド成果物: $FrontendDeploy"
Write-ColorOutput Green "==================================================="

Read-Host "Enterキーを押して終了..."
