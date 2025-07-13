# Cache API Test Script
Write-Host "=== Cache API Test ===" -ForegroundColor Green

# 1. SQL Execution Test
Write-Host "1. SQL Execution and Cache Creation..." -ForegroundColor Yellow
$body = @{
    sql = "SELECT * FROM TRA_3 WHERE 1=1"
    limit = 1000
    editor_id = "test_editor"
} | ConvertTo-Json

try {
    $response = Invoke-WebRequest -Uri "http://localhost:8001/sql/cache/execute" -Method POST -Body $body -ContentType "application/json"
    $result = $response.Content | ConvertFrom-Json
    Write-Host "SQL Execution Success" -ForegroundColor Green
    Write-Host "Session ID: $($result.session_id)" -ForegroundColor Cyan
    Write-Host "Total Count: $($result.total_count)" -ForegroundColor Cyan
    Write-Host "Processed Rows: $($result.processed_rows)" -ForegroundColor Cyan
    
    $session_id = $result.session_id
    
    # 2. Cache Data Read Test
    Write-Host "`n2. Cache Data Read..." -ForegroundColor Yellow
    $readBody = @{
        session_id = $session_id
        page = 1
        page_size = 100
    } | ConvertTo-Json
    
    $readResponse = Invoke-WebRequest -Uri "http://localhost:8001/sql/cache/read" -Method POST -Body $readBody -ContentType "application/json"
    $readResult = $readResponse.Content | ConvertFrom-Json
    Write-Host "Data Read Success" -ForegroundColor Green
    Write-Host "Total Count: $($readResult.total_count)" -ForegroundColor Cyan
    Write-Host "Data Rows: $($readResult.data.Count)" -ForegroundColor Cyan
    
    # 3. Session Status Check
    Write-Host "`n3. Session Status Check..." -ForegroundColor Yellow
    $statusResponse = Invoke-WebRequest -Uri "http://localhost:8001/sql/cache/status/$session_id" -Method GET
    $statusResult = $statusResponse.Content | ConvertFrom-Json
    Write-Host "Status Check Success" -ForegroundColor Green
    Write-Host "Status: $($statusResult.status)" -ForegroundColor Cyan
    Write-Host "Progress: $($statusResult.progress_percentage)%" -ForegroundColor Cyan
    
    # 4. Session Cleanup
    Write-Host "`n4. Session Cleanup..." -ForegroundColor Yellow
    $cleanupResponse = Invoke-WebRequest -Uri "http://localhost:8001/sql/cache/session/$session_id" -Method DELETE
    Write-Host "Cleanup Success" -ForegroundColor Green
    
} catch {
    Write-Host "Error occurred: $($_.Exception.Message)" -ForegroundColor Red
    if ($_.Exception.Response) {
        Write-Host "Response: $($_.Exception.Response)" -ForegroundColor Red
    }
}

Write-Host "`n=== Test Complete ===" -ForegroundColor Green