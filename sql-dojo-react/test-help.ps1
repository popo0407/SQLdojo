# Test Execution Helper Script
# Quick commands for efficient testing with character encoding fixes

Write-Host "=== Efficient Test Helper ===" -ForegroundColor Green
Write-Host "Available commands:" -ForegroundColor Yellow
Write-Host ""

Write-Host "1. Quick summary test (recommended for most cases):" -ForegroundColor Cyan
Write-Host "   .\run-efficient-test.ps1 -TestPath 'path/to/test.tsx' -Mode 'summary'"
Write-Host ""

Write-Host "2. Error-only analysis (when you have many errors):" -ForegroundColor Red
Write-Host "   .\run-efficient-test.ps1 -TestPath 'path/to/test.tsx' -Mode 'error'"
Write-Host ""

Write-Host "3. Detailed analysis (when you need full output):" -ForegroundColor Magenta
Write-Host "   .\run-efficient-test.ps1 -TestPath 'path/to/test.tsx' -Mode 'detail'"
Write-Host ""

Write-Host "4. All tests summary:" -ForegroundColor Blue
Write-Host "   .\run-efficient-test.ps1 -Mode 'summary'"
Write-Host ""

Write-Host "Benefits:" -ForegroundColor Green
Write-Host "- No character encoding issues (UTF-8 compliant)" -ForegroundColor White
Write-Host "- Faster execution with filtered output" -ForegroundColor White
Write-Host "- Automatic log cleanup" -ForegroundColor White
Write-Host "- Organized log files by timestamp and type" -ForegroundColor White
Write-Host ""

Write-Host "Example for current ErrorBoundary issue:" -ForegroundColor Yellow
Write-Host ".\run-efficient-test.ps1 -TestPath 'src/components/common/__tests__/ErrorBoundary.test.tsx' -Mode 'error'" -ForegroundColor White
