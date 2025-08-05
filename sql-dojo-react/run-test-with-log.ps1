# Test execution with complete logging
# Rule_of_coding.md準拠のテストログ管理スクリプト

param(
    [string]$TestFile = "src/features/templates/__tests__/TemplateDropdown.test.tsx",
    [string]$LogFile = "test-execution-log.txt"
)

Write-Host "=== Test Execution Log Management Script ===" -ForegroundColor Green
Write-Host "Target Test: $TestFile" -ForegroundColor Yellow
Write-Host "Log File: $LogFile" -ForegroundColor Yellow
Write-Host "Date: $(Get-Date)" -ForegroundColor Yellow
Write-Host ""

# ログファイルにヘッダーを書き込み
@"
=== Test Execution Summary ===
Date: $(Get-Date -Format "yyyy-MM-dd HH:mm:ss")
Test File: $TestFile
Working Directory: $(Get-Location)
PowerShell Version: $($PSVersionTable.PSVersion)

=== Test Output ===
"@ | Out-File -FilePath $LogFile -Encoding UTF8

# テストを実行し、出力をキャプチャ
Write-Host "Executing test..." -ForegroundColor Cyan
$output = & npx vitest run $TestFile --reporter=default --no-color 2>&1

# 出力をコンソールに表示
$output | Write-Host

# 出力をログファイルに追記
$output | Out-File -FilePath $LogFile -Append -Encoding UTF8

# フッターを追加
@"

=== Test Execution Completed ===
End Time: $(Get-Date -Format "yyyy-MM-dd HH:mm:ss")
"@ | Out-File -FilePath $LogFile -Append -Encoding UTF8

Write-Host ""
Write-Host "Test execution completed. Log saved to: $LogFile" -ForegroundColor Green
