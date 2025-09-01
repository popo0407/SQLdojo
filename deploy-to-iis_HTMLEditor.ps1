# HTMLエディタ IIS デプロイメント自動化スクリプト
# サーバー設定専用バージョン (HTTPS対応)
#
# 前提条件:
# 1. 開発PCでビルドされたフロントエンドと、バックエンドのソースが $DeployPath に配置済みであること。
#    - $DeployPath\frontend : フロントエンドのビルド成果物 (index.htmlなど)
#    - $DeployPath\backend  : バックエンドのソースコード (main.pyなど)
# 2. このスクリプトは管理者権限で実行してください。
# 3. HTTPSリダイレクト機能には「URL Rewrite」モジュールが必要です。
# 4. PowerShellを管理者権限で開いて、以下を実行
#    PowerShell.exe -ExecutionPolicy Bypass -File "C:\webapp\HTMLEditor\deploy-to-iis.ps1"

param(
    [string]$SiteName = "HTMLEditor",
    [string]$FrontendPort = "82",
    [string]$BackendPort = "8002",
    [string]$DeployPath = "C:\webapp\HTMLEditor",
    [string]$HttpsPort = "443"
)

# カラー出力用関数
function Write-ColorOutput($ForegroundColor, $Message) {
    Write-Host -ForegroundColor $ForegroundColor $Message
}

Write-ColorOutput Green "==================================================="
Write-ColorOutput Green "HTMLエディタ IIS サーバー設定スクリプト開始"
Write-ColorOutput Green "前提：ファイルは C:\webapp\HTMLEditor に配置済み"
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
$FrontendDeploy = Join-Path $DeployPath "frontend"
$BackendDeploy = Join-Path $DeployPath "backend"

if (!(Test-Path $FrontendDeploy) -or !(Test-Path $BackendDeploy)) {
    Write-ColorOutput Red "デプロイディレクトリが見つかりません。以下パスを確認してください:"
    Write-ColorOutput Red "  - $FrontendDeploy"
    Write-ColorOutput Red "  - $BackendDeploy"
    Write-ColorOutput Red "導入ガイドに従い、先に公開用パッケージを展開してください。"
    Read-Host "Enterキーを押して終了..."
    exit 1
}
Write-ColorOutput Green "デプロイディレクトリを確認しました: $DeployPath"


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
icacls $DeployPath /grant "IIS_IUSRS:(OI)(CI)RX" /T
icacls $BackendDeploy /grant "IIS_IUSRS:(OI)(CI)F" /T # バックエンドには書き込み権限(F)も付与
Write-ColorOutput Green "ファイル権限を設定しました。"

# 8. HTTPS設定 (自己署名証明書)
Write-ColorOutput Yellow "ステップ 7: HTTPS設定 (自己署名証明書)..."
$certName = "$SiteName Self-Signed Cert"
$serverIP = (Get-NetIPAddress -AddressFamily IPv4 | Where-Object { $_.IPAddress -notlike "127.*" -and $_.IPAddress -notlike "169.254.*" }).IPAddress | Select-Object -First 1
$dnsNames = @("localhost", $serverIP) # localhostとサーバーIPの両方を含める
$certStorePath = "Cert:\LocalMachine\My"

# 既存の同名証明書を削除
Get-ChildItem -Path $certStorePath | Where-Object { $_.FriendlyName -eq $certName } | ForEach-Object {
    Write-ColorOutput Yellow "  - 既存の証明書 '$_' を削除します。"
    Remove-Item -Path $_.PSPath -DeleteKey
}

# 自己署名証明書を作成
Write-ColorOutput Yellow "  - 自己署名証明書を作成中: $certName (DNS: $($dnsNames -join ', '))"
$newCert = New-SelfSignedCertificate -DnsName $dnsNames -CertStoreLocation $certStorePath -FriendlyName $certName
$certThumbprint = $newCert.Thumbprint

# HTTPSバインドの作成
Write-ColorOutput Yellow "  - サイト '$siteFullName' に証明書をバインド中 (Port: $HttpsPort)..."
# 既存のHTTPSバインドを削除
Get-WebBinding -Name $siteFullName -Protocol "https" -Port $HttpsPort -ErrorAction SilentlyContinue | Remove-WebBinding
# 新しいHTTPSバインドを作成
New-WebBinding -Name $siteFullName -Protocol "https" -Port $HttpsPort -IPAddress "*"
# バインドに証明書を割り当て
$binding = Get-WebBinding -Name $siteFullName -Protocol "https" -Port $HttpsPort
$binding.AddSslCertificate($certThumbprint, "my")
Write-ColorOutput Green "  証明書のバインドが完了しました。"

# HTTPからHTTPSへのリダイレクトルールを設定
Write-ColorOutput Yellow "  - HTTPからHTTPSへのリダイレクトルールを設定中..."
# URL Rewriteモジュールの存在チェック
try {
    Get-WebConfigurationProperty -pspath 'MACHINE/WEBROOT/APPHOST' -filter "system.webServer/globalModules" -name "." | Where-Object { $_.name -eq 'RewriteModule' } -ErrorAction Stop | Out-Null
    $rewriteModuleInstalled = $true
} catch {
    $rewriteModuleInstalled = $false
}

if (-not $rewriteModuleInstalled) {
    Write-ColorOutput Red "    警告: URL書き換えモジュールがインストールされていません。リダイレクト設定をスキップします。"
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
    Write-ColorOutput Green "  リダイレクトルール '$ruleName' を作成しました。"
}
Write-ColorOutput Green "HTTPS設定が完了しました。"

# 8.5. ARRリバースプロキシ設定
Write-ColorOutput Yellow "ステップ 7.5: ARRリバースプロキシ設定..."

# --- 追加: グローバル（マシンレベル）で ARR/proxy を有効化しておく ---
Write-ColorOutput Yellow "ステップ 7.4: ARR グローバル proxy を有効化（全サイト）..."
try {
    # グローバルに proxy セクションを作成/有効化
    Set-WebConfigurationProperty -pspath "MACHINE/WEBROOT/APPHOST" -filter "system.webServer/proxy" -name "enabled" -value "True"
    Write-ColorOutput Green "ARR global proxy を有効化しました (MACHINE/WEBROOT/APPHOST)。"
} catch {
    Write-ColorOutput Yellow "警告: ARR global proxy の有効化に失敗しました。手動で有効化してください。エラー: $_"
}

# ARR（Application Request Routing）を有効化（サイト単位）
Set-WebConfigurationProperty -Filter "system.webServer/proxy" -PSPath "IIS:\Sites\$siteFullName" -Name "enabled" -Value "True"

# URL Rewriteルール追加（/api/pdf/* → backend）
# サイト単位でハッシュ形式の Add-WebConfiguration を使い、安全に追加する
$siteConfigPath = "IIS:\Sites\$siteFullName"
$ruleName = 'ReverseProxyApi'
try {
    # 既に同名ルールがあれば削除（衝突回避）
    Clear-WebConfiguration -pspath $siteConfigPath -filter "system.webServer/rewrite/rules/rule[@name='$ruleName']" -ErrorAction SilentlyContinue

    $ruleValue = @{
        name = $ruleName
        stopProcessing = $true
        # /api/ 以下のすべてをバックエンドにリライトルールで転送
        match = @{ url = '^api/(.*)' }
        action = @{ type = 'Rewrite'; url = "http://localhost:$BackendPort/api/{R:1}"; logRewrittenUrl = $true }
    }

    Add-WebConfiguration -pspath $siteConfigPath -Filter "system.webServer/rewrite/rules" -Value $ruleValue
    Write-ColorOutput Green "ARRリバースプロキシルール（/api/* → バックエンド）をサイト単位で追加しました: $ruleName"
} catch {
    Write-ColorOutput Yellow "ARRリバースプロキシルールの追加に失敗しました: $_"
}

# 9. Windowsサービスとしてバックエンドを起動（NSSM使用）
Write-ColorOutput Yellow "ステップ 8: バックエンドサービスの登録..."

$serviceName = "HTMLEditorAPI"
$serviceDisplayName = "HTML Editor API Service"
$serviceDescription = "FastAPI backend for HTML Editor"

# 既存サービスの停止・削除
$existingService = Get-Service -Name $serviceName -ErrorAction SilentlyContinue
if ($existingService) {
    Write-ColorOutput Yellow "既存のサービス '$serviceName' を停止・削除します..."
    Stop-Service -Name $serviceName -Force -ErrorAction SilentlyContinue
    sc.exe delete $serviceName
    Start-Sleep -Seconds 2 # 削除が反映されるまで少し待機
}

# NSSMを使用してサービス作成
try {
    # nssm.exeがPATH上にあるか確認
    $nssmPath = Get-Command nssm.exe -ErrorAction Stop
    
    # サービス作成に必要なパスと引数を定義
    $pythonPath = Join-Path $BackendDeploy ".venv\Scripts\python.exe"
    $startupDir = $BackendDeploy
    $arguments = "-m uvicorn main:app --host 127.0.0.1 --port $BackendPort"
    
    Write-ColorOutput Green "NSSM を使用してサービス '$serviceName' を作成します。"
    & $nssmPath install $serviceName $pythonPath $arguments
    & $nssmPath set $serviceName AppDirectory $startupDir
    & $nssmPath set $serviceName DisplayName $serviceDisplayName
    & $nssmPath set $serviceName Description $serviceDescription
    & $nssmPath set $serviceName Start SERVICE_AUTO_START
    
    # サービス開始
    Start-Service -Name $serviceName
    Write-ColorOutput Green "バックエンドサービスを作成・開始しました: $serviceName"
    
} catch {
    Write-ColorOutput Red "---------------------------------------------------"
    Write-ColorOutput Red "NSSM が見つかりませんでした。"
    Write-ColorOutput Red "バックエンドは手動で起動する必要があります。"
    Write-ColorOutput Yellow "手動起動コマンド:"
    Write-ColorOutput Yellow "cd $BackendDeploy"
    Write-ColorOutput Yellow ".\.venv\Scripts\Activate.ps1"
    Write-ColorOutput Yellow "python -m uvicorn main:app --host 127.0.0.1 --port $BackendPort"
    Write-ColorOutput Red "---------------------------------------------------"
}


# 10. 最終確認
Write-ColorOutput Green "==================================================="
Write-ColorOutput Green "デプロイメントスクリプトが完了しました！"
Write-ColorOutput Green "==================================================="
Write-ColorOutput White "フロントエンド URL (HTTPS): https://localhost:$HttpsPort"
Write-ColorOutput White "フロントエンド URL (HTTP):  http://localhost:$FrontendPort"
Write-ColorOutput White "バックエンドはサービスとして実行中です (http://localhost:$BackendPort)"
Write-ColorOutput White ""
Write-ColorOutput White "デプロイメント場所: $DeployPath"
Write-ColorOutput Green "==================================================="

Read-Host "Enterキーを押して終了..."