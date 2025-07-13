# Basic API Test Script
Write-Host "=== Basic API Test ===" -ForegroundColor Green

try {
    # 1. Health Check
    Write-Host "1. Health Check..." -ForegroundColor Yellow
    $healthResponse = Invoke-WebRequest -Uri "http://localhost:8001/health" -Method GET
    Write-Host "Health Check Success" -ForegroundColor Green
    Write-Host "Response: $($healthResponse.Content)" -ForegroundColor Cyan
    
    # 2. Root Endpoint
    Write-Host "`n2. Root Endpoint..." -ForegroundColor Yellow
    $rootResponse = Invoke-WebRequest -Uri "http://localhost:8001/" -Method GET
    Write-Host "Root Endpoint Success" -ForegroundColor Green
    Write-Host "Response: $($rootResponse.Content)" -ForegroundColor Cyan
    
    # 3. Available Routes Check
    Write-Host "`n3. Checking available routes..." -ForegroundColor Yellow
    $routesResponse = Invoke-WebRequest -Uri "http://localhost:8001/docs" -Method GET
    Write-Host "API Documentation accessible" -ForegroundColor Green
    
} catch {
    Write-Host "Error occurred: $($_.Exception.Message)" -ForegroundColor Red
    if ($_.Exception.Response) {
        Write-Host "Status Code: $($_.Exception.Response.StatusCode)" -ForegroundColor Red
    }
}

Write-Host "`n=== Basic Test Complete ===" -ForegroundColor Green 