# Complete Cache API Test Script with Login
Write-Host "=== Complete Cache API Test with Login ===" -ForegroundColor Green

# Login credentials
$user_id = "hint0530"

try {
    # Step 1: Login
    Write-Host "1. Login..." -ForegroundColor Yellow
    $loginBody = @{
        user_id = $user_id
    } | ConvertTo-Json
    
    $loginResponse = Invoke-WebRequest -Uri "http://localhost:8001/api/v1/login" -Method POST -Body $loginBody -ContentType "application/json"
    Write-Host "Login Success" -ForegroundColor Green
    
    # Get cookies for session
    $cookies = $loginResponse.Cookies
    
    # Step 2: SQL Execution and Cache Creation
    Write-Host "`n2. SQL Execution and Cache Creation..." -ForegroundColor Yellow
    $executeBody = @{
        sql = "SELECT * FROM TRA_3 WHERE 1=1"
        limit = 1000
        editor_id = "test_editor"
    } | ConvertTo-Json
    
    $executeResponse = Invoke-WebRequest -Uri "http://localhost:8001/api/v1/sql/cache/execute" -Method POST -Body $executeBody -ContentType "application/json" -WebSession $cookies
    $executeResult = $executeResponse.Content | ConvertFrom-Json
    Write-Host "SQL Execution Success" -ForegroundColor Green
    Write-Host "Session ID: $($executeResult.session_id)" -ForegroundColor Cyan
    Write-Host "Total Count: $($executeResult.total_count)" -ForegroundColor Cyan
    Write-Host "Processed Rows: $($executeResult.processed_rows)" -ForegroundColor Cyan
    
    $session_id = $executeResult.session_id
    
    # Step 3: Cache Data Read Test
    Write-Host "`n3. Cache Data Read..." -ForegroundColor Yellow
    $readBody = @{
        session_id = $session_id
        page = 1
        page_size = 100
    } | ConvertTo-Json
    
    $readResponse = Invoke-WebRequest -Uri "http://localhost:8001/api/v1/sql/cache/read" -Method POST -Body $readBody -ContentType "application/json" -WebSession $cookies
    $readResult = $readResponse.Content | ConvertFrom-Json
    Write-Host "Data Read Success" -ForegroundColor Green
    Write-Host "Total Count: $($readResult.total_count)" -ForegroundColor Cyan
    Write-Host "Data Rows: $($readResult.data.Count)" -ForegroundColor Cyan
    
    # Step 4: Session Status Check
    Write-Host "`n4. Session Status Check..." -ForegroundColor Yellow
    $statusResponse = Invoke-WebRequest -Uri "http://localhost:8001/api/v1/sql/cache/status/$session_id" -Method GET -WebSession $cookies
    $statusResult = $statusResponse.Content | ConvertFrom-Json
    Write-Host "Status Check Success" -ForegroundColor Green
    Write-Host "Status: $($statusResult.status)" -ForegroundColor Cyan
    Write-Host "Progress: $($statusResult.progress_percentage)%" -ForegroundColor Cyan
    
    # Step 5: Filter and Sort Test
    Write-Host "`n5. Filter and Sort Test..." -ForegroundColor Yellow
    $filterBody = @{
        session_id = $session_id
        page = 1
        page_size = 50
        filters = @{
            "column_name" = "test"
        }
        sort_by = "column_name"
        sort_order = "ASC"
    } | ConvertTo-Json
    
    try {
        $filterResponse = Invoke-WebRequest -Uri "http://localhost:8001/api/v1/sql/cache/read" -Method POST -Body $filterBody -ContentType "application/json" -WebSession $cookies
        $filterResult = $filterResponse.Content | ConvertFrom-Json
        Write-Host "Filter and Sort Success" -ForegroundColor Green
        Write-Host "Filtered Count: $($filterResult.total_count)" -ForegroundColor Cyan
    } catch {
        Write-Host "Filter and Sort Test Failed (may not be implemented yet)" -ForegroundColor Yellow
    }
    
    # Step 6: Session Cleanup
    Write-Host "`n6. Session Cleanup..." -ForegroundColor Yellow
    $cleanupResponse = Invoke-WebRequest -Uri "http://localhost:8001/api/v1/sql/cache/session/$session_id" -Method DELETE -WebSession $cookies
    Write-Host "Cleanup Success" -ForegroundColor Green
    
    # Step 7: Verify Cleanup
    Write-Host "`n7. Verify Cleanup..." -ForegroundColor Yellow
    try {
        $verifyResponse = Invoke-WebRequest -Uri "http://localhost:8001/api/v1/sql/cache/read" -Method POST -Body $readBody -ContentType "application/json" -WebSession $cookies
        Write-Host "Warning: Session still exists after cleanup" -ForegroundColor Yellow
    } catch {
        Write-Host "Cleanup Verification Success: Session not found" -ForegroundColor Green
    }
    
} catch {
    Write-Host "Error occurred: $($_.Exception.Message)" -ForegroundColor Red
    if ($_.Exception.Response) {
        Write-Host "Status Code: $($_.Exception.Response.StatusCode)" -ForegroundColor Red
        $errorContent = $_.Exception.Response.GetResponseStream()
        $reader = New-Object System.IO.StreamReader($errorContent)
        $errorBody = $reader.ReadToEnd()
        Write-Host "Error Body: $errorBody" -ForegroundColor Red
    }
}

Write-Host "`n=== Complete Test Finished ===" -ForegroundColor Green 