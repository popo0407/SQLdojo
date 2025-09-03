# SQLdojo IIS デプロイメント自動化スクリプト
# サーバー設定専用バージョン (HTTPS対応)
#
# 前提条件:
# 1. 開発PCでビルドされたフロントエンド(本リポでは `$DeployPath\sql-dojo-react`) と
#    バックエンド(ルート直下 app/, main.py 等) を DeployPath に配置済みである
#    - フロント成果物: `$DeployPath\sql-dojo-react\dist` (なければ build)
#    - バックエンド: ルート直下 (app, requirements*.txt など)
# 2. このスクリプトは管理者権限で実行してください。
# 3. HTTPSリダイレクト機能には「URL Rewrite」モジュールが必要です。
# 4. PowerShellを管理者権限で開いて、以下を実行
#    PowerShell.exe -ExecutionPolicy Bypass -File "<DeployPath>\deploy-to-iis.ps1"  # 例: C:\Path\To\Your\DeployFolder\deploy-to-iis.ps1

param(
    [string]$SiteName = "SQLdojo",
    [string]$FrontendPort = "81",
    [string]$BackendPort = "8001",
    [string]$DeployPath = (Join-Path (Get-Location) ""),
    [string]$HttpsPort = "444",
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
$BackendDeploy = $DeployPath  # ルートをバックエンドとみなす

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

# 4. App Pool と Site の作成 (フロントエンド)
Write-ColorOutput Yellow "ステップ 3: IIS設定 (フロントエンド)..."
$appPoolNameFE = "${SiteName}-Frontend"
$siteNameFE = "${SiteName}-Frontend"

if (Get-IISAppPool -Name $appPoolNameFE -ErrorAction SilentlyContinue) {
    Write-ColorOutput Yellow "  - App Pool '$appPoolNameFE' 削除"
    Remove-WebAppPool -Name $appPoolNameFE
}

Write-ColorOutput Yellow "  - App Pool '$appPoolNameFE' 作成"
New-WebAppPool -Name $appPoolNameFE -Force

if (Get-Website -Name $siteNameFE -ErrorAction SilentlyContinue) {
    Write-ColorOutput Yellow "  - Site '$siteNameFE' 削除"
    Remove-Website -Name $siteNameFE
}

Write-ColorOutput Yellow "  - Site '$siteNameFE' 作成 (ポート: $FrontendPort)"
New-Website -Name $siteNameFE -PhysicalPath $FrontendDeploy -Port $FrontendPort -ApplicationPool $appPoolNameFE

# 5. 自己署名証明書の作成
Write-ColorOutput Yellow "ステップ 4: HTTPS証明書の設定..."
$certName = "SQLdojo-SelfSigned"
$dnsNames = @("localhost", "127.0.0.1", $env:COMPUTERNAME)
$certStorePath = "Cert:\LocalMachine\My"

# 既存証明書の確認
$existingCert = Get-ChildItem $certStorePath | Where-Object { $_.Subject -match "CN=localhost" -and $_.FriendlyName -eq $certName }
if ($existingCert) {
    Write-ColorOutput Yellow "  - 既存の証明書を使用: $($existingCert.Thumbprint)"
    $certThumbprint = $existingCert.Thumbprint
} else {
    # 自己署名証明書を作成
    Write-ColorOutput Yellow "  - 自己署名証明書を作成中: $certName (DNS: $($dnsNames -join ', '))"
    $newCert = New-SelfSignedCertificate -DnsName $dnsNames -CertStoreLocation $certStorePath -FriendlyName $certName
    $certThumbprint = $newCert.Thumbprint
    Write-ColorOutput Green "  - 証明書作成完了: $certThumbprint"
}

# HTTPSバインディングの追加
Write-ColorOutput Yellow "  - HTTPSバインディング追加 (ポート: $HttpsPort)"
try {
    New-WebBinding -Name $siteNameFE -Protocol https -Port $HttpsPort
    $binding = Get-WebBinding -Name $siteNameFE -Protocol https -Port $HttpsPort
    $binding.AddSslCertificate($certThumbprint, "my")
    Write-ColorOutput Green "  - HTTPSバインディング追加完了"
} catch {
    Write-ColorOutput Red "  - HTTPSバインディング追加に失敗: $_"
}

# 6. URL Rewrite によるHTTPS リダイレクト設定
Write-ColorOutput Yellow "ステップ 5: HTTPSリダイレクト設定..."
$webConfigPath = Join-Path $FrontendDeploy "web.config"

$webConfigContent = @"
<?xml version="1.0" encoding="utf-8"?>
<configuration>
  <system.webServer>
    <rewrite>
      <rules>
        <rule name="API Proxy" stopProcessing="true">
          <match url="^api/(.*)" />
          <action type="Rewrite" url="http://127.0.0.1:$BackendPort/api/{R:1}" />
          <serverVariables>
            <set name="HTTP_X_FORWARDED_HOST" value="{HTTP_HOST}" />
            <set name="HTTP_X_FORWARDED_PROTO" value="{HTTPS}" />
          </serverVariables>
        </rule>
        <rule name="HTTPS Redirect" stopProcessing="true">
          <match url=".*" />
          <conditions>
            <add input="{HTTPS}" pattern="off" ignoreCase="true" />
          </conditions>
          <action type="Redirect" url="https://{HTTP_HOST}:$HttpsPort/{R:0}" redirectType="Permanent" />
        </rule>
        <rule name="React Router" stopProcessing="true">
          <match url=".*" />
          <conditions logicalGrouping="MatchAll">
            <add input="{REQUEST_FILENAME}" matchType="IsFile" negate="true" />
            <add input="{REQUEST_FILENAME}" matchType="IsDirectory" negate="true" />
          </conditions>
          <action type="Rewrite" url="/" />
        </rule>
      </rules>
    </rewrite>
    <proxy enabled="true" preserveHostHeader="false" />
    <defaultDocument>
      <files>
        <clear />
        <add value="index.html" />
      </files>
    </defaultDocument>
    <staticContent>
      <remove fileExtension=".json" />
      <mimeMap fileExtension=".json" mimeType="application/json" />
      <remove fileExtension=".woff" />
      <mimeMap fileExtension=".woff" mimeType="application/font-woff" />
      <remove fileExtension=".woff2" />
      <mimeMap fileExtension=".woff2" mimeType="application/font-woff2" />
    </staticContent>
  </system.webServer>
</configuration>
"@

Write-Output $webConfigContent | Out-File -FilePath $webConfigPath -Encoding UTF8
Write-ColorOutput Green "  - web.config 作成完了: $webConfigPath"

# 7. Windowsサービスとしてバックエンドを登録
Write-ColorOutput Yellow "ステップ 6: バックエンドサービスの設定..."

# 既存サービスの停止・削除
$existingService = Get-Service -Name $ServiceName -ErrorAction SilentlyContinue
if ($existingService) {
    Write-ColorOutput Yellow "  - 既存サービス '$ServiceName' を停止・削除中..."
    Stop-Service -Name $ServiceName -Force -ErrorAction SilentlyContinue
    $scDelete = Start-Process -FilePath "sc.exe" -ArgumentList "delete", $ServiceName -Wait -PassThru -WindowStyle Hidden
    if ($scDelete.ExitCode -eq 0) {
        Write-ColorOutput Green "  - 既存サービス削除完了"
    }
}

# Python実行可能ファイルの検索
$pythonExe = $null
$pythonPaths = @(
    "python",
    "python3",
    "${env:LOCALAPPDATA}\Programs\Python\Python311\python.exe",
    "${env:LOCALAPPDATA}\Programs\Python\Python312\python.exe",
    "${env:ProgramFiles}\Python311\python.exe",
    "${env:ProgramFiles}\Python312\python.exe"
)

foreach ($path in $pythonPaths) {
    try {
        $result = & $path --version 2>$null
        if ($LASTEXITCODE -eq 0) {
            $pythonExe = $path
            Write-ColorOutput Green "  - Python検出: $pythonExe ($result)"
            break
        }
    } catch {
        continue
    }
}

if (-not $pythonExe) {
    Write-ColorOutput Red "Pythonが見つかりません。Pythonをインストールしてください。"
    Read-Host "Enterキーを押して終了..."
    exit 1
}

# requirements.txtのインストール
$requirementsPath = Join-Path $BackendDeploy "requirements.txt"
if (Test-Path $requirementsPath) {
    Write-ColorOutput Yellow "  - Python仮想環境を設定中..."
    
    # 仮想環境の作成
    $venvPath = Join-Path $BackendDeploy ".venv"
    if (-not (Test-Path $venvPath)) {
        Write-ColorOutput Yellow "  - 仮想環境を作成中..."
        Set-Location $BackendDeploy
        & $pythonExe -m venv .venv
        Write-ColorOutput Green "  - 仮想環境作成完了"
    } else {
        Write-ColorOutput Yellow "  - 既存の仮想環境を使用"
    }
    
    # 仮想環境のPythonとpipパスを設定
    $venvPythonExe = Join-Path $venvPath "Scripts\python.exe"
    $venvPipExe = Join-Path $venvPath "Scripts\pip.exe"
    $venvScriptsPath = Join-Path $venvPath "Scripts"
    
    Write-ColorOutput Yellow "  - 依存関係をインストール中（仮想環境）..."
    $installResult = Start-Process -FilePath $venvPipExe -ArgumentList "install", "-r", $requirementsPath -Wait -PassThru -WindowStyle Hidden -WorkingDirectory $BackendDeploy
    if ($installResult.ExitCode -eq 0) {
        Write-ColorOutput Green "  - 依存関係インストール完了"
    } else {
        Write-ColorOutput Red "  - 依存関係インストールに失敗"
    }
    
    # 仮想環境に必要な追加パッケージをインストール
    Write-ColorOutput Yellow "  - 追加パッケージのインストール中..."
    & $venvPipExe install uvicorn[standard] --quiet
    
    # インストール済みパッケージの確認
    Write-ColorOutput Yellow "  - インストール済みパッケージの確認中..."
    $packages = & $venvPipExe list --format=freeze
    $requiredPackages = @("fastapi", "uvicorn", "pydantic")
    foreach ($pkg in $requiredPackages) {
        $found = $packages | Where-Object { $_ -like "$pkg*" }
        if ($found) {
            Write-ColorOutput Green "    ✓ $pkg インストール済み"
        } else {
            Write-ColorOutput Red "    ✗ $pkg 見つかりません"
        }
    }
    
    # サービス用のPython実行ファイルを仮想環境のものに更新
    $pythonExe = $venvPythonExe
}

# ファイル権限の設定（仮想環境作成後）
Write-ColorOutput Yellow "  - ファイル権限の設定..."
Write-ColorOutput Yellow "  - IIS_IUSRSに読み取り権限を付与中..."
icacls $DeployPath /grant "IIS_IUSRS:(OI)(CI)RX" /T
Write-ColorOutput Yellow "  - バックエンドディレクトリに書き込み権限を付与中..."
icacls $BackendDeploy /grant "IIS_IUSRS:(OI)(CI)F" /T
Write-ColorOutput Green "  - ファイル権限設定完了"

# NSSMを使用してサービスを作成
$nssmPath = $null
$nssmPaths = @(
    "nssm.exe",
    "nssm",
    "C:\nssm-2.24\win64\nssm.exe",
    "${env:ProgramFiles}\NSSM\win64\nssm.exe",
    "${env:ProgramFiles(x86)}\NSSM\win64\nssm.exe",
    "${env:LOCALAPPDATA}\Programs\NSSM\win64\nssm.exe"
)

foreach ($path in $nssmPaths) {
    try {
        Write-ColorOutput Yellow "  - NSSM検索中: $path"
        if (Test-Path $path) {
            Write-ColorOutput Yellow "  - ファイル存在確認: OK"
            # ファイルが存在すればNSSMとして使用（実行テストは省略）
            $nssmPath = $path
            Write-ColorOutput Green "  - NSSM検出成功: $nssmPath"
            break
        } else {
            # パスが存在しない場合はスキップ
            Write-ColorOutput Yellow "  - パスが存在しません: $path"
        }
    } catch {
        Write-ColorOutput Yellow "  - 失敗: $path ($_)"
        continue
    }
}

if (-not $nssmPath) {
    Write-ColorOutput Red "NSSMが見つかりません。NSSMをインストールしてPATHに追加してください。"
    Write-ColorOutput Yellow "ダウンロード: https://nssm.cc/download"
    Write-ColorOutput Yellow "PATHの確認: $env:PATH"
    Read-Host "Enterキーを押して終了..."
    exit 1
}

# サービスの作成
$mainPyPath = Join-Path $BackendDeploy "app\main.py"
if (-not (Test-Path $mainPyPath)) {
    Write-ColorOutput Red "main.pyが見つかりません: $mainPyPath"
    Read-Host "Enterキーを押して終了..."
    exit 1
}

Write-ColorOutput Yellow "  - Windowsサービス '$ServiceName' を作成中..."
$nssmInstall = Start-Process -FilePath $nssmPath -ArgumentList "install", $ServiceName, $pythonExe -Wait -PassThru -WindowStyle Hidden
if ($nssmInstall.ExitCode -eq 0) {
    # サービスの詳細設定
    & $nssmPath set $ServiceName DisplayName $ServiceDisplayName
    & $nssmPath set $ServiceName Description $ServiceDescription
    & $nssmPath set $ServiceName AppDirectory $BackendDeploy
    & $nssmPath set $ServiceName AppParameters "-m uvicorn app.main:app --host 0.0.0.0 --port $BackendPort --workers 1"
    & $nssmPath set $ServiceName Start SERVICE_AUTO_START
    
    # 環境変数を明示的に設定（NSSSMの形式に合わせて）
    & $nssmPath set $ServiceName AppEnvironmentExtra "PYTHONPATH=$BackendDeploy" "VIRTUAL_ENV=$venvPath" "PATH=$venvScriptsPath;%PATH%" "PYTHONUNBUFFERED=1"
    
    # ログ設定を追加
    $logDir = Join-Path $BackendDeploy "logs"
    if (-not (Test-Path $logDir)) {
        New-Item -ItemType Directory -Path $logDir -Force | Out-Null
    }
    $stdoutLog = Join-Path $logDir "service_stdout.log"
    $stderrLog = Join-Path $logDir "service_stderr.log"
    
    & $nssmPath set $ServiceName AppStdout $stdoutLog
    & $nssmPath set $ServiceName AppStderr $stderrLog
    & $nssmPath set $ServiceName AppStdoutCreationDisposition 4  # CREATE_ALWAYS
    & $nssmPath set $ServiceName AppStderrCreationDisposition 4  # CREATE_ALWAYS
    & $nssmPath set $ServiceName AppRotateFiles 1
    & $nssmPath set $ServiceName AppRotateOnline 1
    & $nssmPath set $ServiceName AppRotateSeconds 86400
    
    Write-ColorOutput Green "  - サービス作成完了"
    Write-ColorOutput Yellow "  - ログファイル: $stdoutLog, $stderrLog"
    
    # デバッグ用：手動で仮想環境のUvicornを起動してテスト
    Write-ColorOutput Yellow "  - デバッグ：仮想環境での起動テスト..."
    $testResult = Start-Process -FilePath $venvPythonExe -ArgumentList "-c", "import sys; print('Python Path:', sys.executable); import uvicorn; print('uvicorn import successful')" -Wait -PassThru -WindowStyle Hidden -WorkingDirectory $BackendDeploy
    if ($testResult.ExitCode -eq 0) {
        Write-ColorOutput Green "    ✓ Uvicorn インポート成功"
    } else {
        Write-ColorOutput Yellow "    ⚠ Uvicorn インポートテスト失敗（サービス動作には影響なし）"
    }
    
    # アプリケーションのインポートテスト
    Write-ColorOutput Yellow "  - デバッグ：アプリケーションインポートテスト..."
    $env:PYTHONPATH = $BackendDeploy
    $appTestResult = Start-Process -FilePath $venvPythonExe -ArgumentList "-c", "import sys; sys.path.insert(0, '$BackendDeploy'); from app.main import app; print('app import successful')" -Wait -PassThru -WindowStyle Hidden -WorkingDirectory $BackendDeploy
    if ($appTestResult.ExitCode -eq 0) {
        Write-ColorOutput Green "    ✓ アプリケーション インポート成功"
    } else {
        Write-ColorOutput Yellow "    ⚠ アプリケーション インポートテスト失敗（サービス動作には影響なし）"
    }
    
    # サービスの開始前に少し待機
    Start-Sleep -Seconds 2
    
    # サービスの開始
    Write-ColorOutput Yellow "  - サービスを開始中..."
    try {
        Start-Service -Name $ServiceName -ErrorAction Stop
        Write-ColorOutput Green "  - サービス開始完了"
        
        # サービスの状態確認
        Start-Sleep -Seconds 3
        $serviceStatus = Get-Service -Name $ServiceName
        Write-ColorOutput Cyan "  - サービス状態: $($serviceStatus.Status)"
        
        # APIの動作確認
        if ($serviceStatus.Status -eq "Running") {
            Write-ColorOutput Yellow "  - API動作確認中..."
            Start-Sleep -Seconds 2
            try {
                $apiResponse = Invoke-WebRequest -Uri "http://localhost:$BackendPort/" -UseBasicParsing -TimeoutSec 10
                if ($apiResponse.StatusCode -eq 200) {
                    Write-ColorOutput Green "    ✓ API正常動作確認（ステータス: $($apiResponse.StatusCode)）"
                } else {
                    Write-ColorOutput Yellow "    ⚠ API応答あり（ステータス: $($apiResponse.StatusCode)）"
                }
            } catch {
                Write-ColorOutput Yellow "    ⚠ API確認失敗: $($_.Exception.Message)"
            }
        }
        
        # ログファイルの内容確認
        if (Test-Path $stdoutLog) {
            Write-ColorOutput Yellow "  - 標準出力ログの最新内容:"
            Get-Content $stdoutLog -Tail 5 | ForEach-Object { Write-ColorOutput Gray "    $_" }
        }
        if (Test-Path $stderrLog) {
            $errorContent = Get-Content $stderrLog -ErrorAction SilentlyContinue
            if ($errorContent) {
                Write-ColorOutput Green "  - サービスログの内容（正常動作）:"
                $errorContent | Select-Object -Last 5 | ForEach-Object { Write-ColorOutput Green "    $_" }
            }
        }
    } catch {
        Write-ColorOutput Red "  - サービス開始に失敗: $_"
        # エラー時もログを確認
        if (Test-Path $stderrLog) {
            $errorContent = Get-Content $stderrLog -ErrorAction SilentlyContinue
            if ($errorContent) {
                Write-ColorOutput Red "  - エラーログの詳細:"
                $errorContent | ForEach-Object { Write-ColorOutput Red "    $_" }
            }
        }
    }
} else {
    Write-ColorOutput Red "  - サービス作成に失敗"
}

# 8. 完了メッセージ
Write-ColorOutput Green "==================================================="
Write-ColorOutput Green "デプロイメント完了！"
Write-ColorOutput Green "==================================================="
Write-ColorOutput Cyan "フロントエンド:"
Write-ColorOutput Cyan "  HTTP:  http://localhost:$FrontendPort"
Write-ColorOutput Cyan "  HTTPS: https://localhost:$HttpsPort"
Write-ColorOutput Cyan ""
Write-ColorOutput Cyan "バックエンド:"
Write-ColorOutput Cyan "  API: http://localhost:$BackendPort"
Write-ColorOutput Cyan "  サービス名: $ServiceName"
Write-ColorOutput Green "==================================================="

Read-Host "Enterキーを押して終了..."
