# Efficient Test Execution Script (Character encoding fix & time optimization)
# Compliant with Rule_of_coding.md test execution strategy

param(
    [string]$TestPath = "",
    [string]$Mode = "summary",  # summary, detail, error, full
    [switch]$SkipCleanup,
    [int]$MaxErrors = 10
)

# Character encoding fix
$OutputEncoding = [System.Text.Encoding]::UTF8
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$env:FORCE_COLOR = "0"  # Disable ANSI color codes
$env:NODE_OPTIONS = "--max-old-space-size=4096"

# Generate timestamp
$timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$componentName = if ($TestPath) { (Split-Path $TestPath -Leaf).Replace('.test.tsx','').Replace('.test.ts','') } else { "all" }

Write-Host "=== Efficient Test Execution Start ===" -ForegroundColor Green
Write-Host "Mode: $Mode, Component: $componentName, Time: $timestamp" -ForegroundColor Yellow

switch ($Mode) {
    "summary" {
        # Stage 1: Fast summary check (within 30 seconds)
        $logFile = "$componentName-$timestamp-summary-test.log"
        Write-Host "Running fast summary test..." -ForegroundColor Blue
        
        $testCommand = if ($TestPath) { 
            "npx vitest run $TestPath --reporter=basic --no-color --silent --bail=$MaxErrors"
        } else { 
            "npx vitest run --reporter=basic --no-color --silent --bail=$MaxErrors"
        }
        
        Invoke-Expression "$testCommand > $logFile 2>&1"
        
        echo "Log file check"
        if (Test-Path $logFile) {
            Write-Host "=== Test Result Summary ===" -ForegroundColor Green
            $summary = Get-Content $logFile | Select-String "PASS|FAIL|passed|failed|Test Files|Tests|Time|Error"
            $summary | Select-Object -First 15 | ForEach-Object { Write-Host $_ }
            
            # Result statistics
            $passCount = ($summary | Select-String "passed|PASS" | Measure-Object).Count
            $failCount = ($summary | Select-String "failed|FAIL" | Measure-Object).Count
            Write-Host "Summary: Passed=$passCount, Failed=$failCount" -ForegroundColor Yellow
            Write-Host "Detail log: $logFile" -ForegroundColor Cyan
        } else {
            Write-Error "Log file was not created: $logFile"
        }
    }
    
    "error" {
        # Stage 2: Error-only detailed investigation
        $logFile = "$componentName-$timestamp-error-test.log"
        Write-Host "Running error-focused test..." -ForegroundColor Red
        
        $testCommand = if ($TestPath) { 
            "npx vitest run $TestPath --reporter=verbose --no-color --run"
        } else { 
            "npx vitest run --reporter=verbose --no-color --run"
        }
        
        # Filter and save errors only
        Invoke-Expression $testCommand 2>&1 | 
            Select-String "FAIL|Error|failed|TypeError|ReferenceError|AssertionError" |
            Select-Object -First 50 |
            Out-File -FilePath $logFile -Encoding UTF8
        
        echo "Log file check"
        if (Test-Path $logFile) {
            Write-Host "=== Error Details ===" -ForegroundColor Red
            Get-Content $logFile | Select-Object -First 20 | ForEach-Object { Write-Host $_ -ForegroundColor Red }
            Write-Host "Error log: $logFile" -ForegroundColor Cyan
        }
    }
    
    "detail" {
        # Stage 3: Detailed test (when needed only)
        $logFile = "$componentName-$timestamp-detail-test.log"
        Write-Host "Running detailed test..." -ForegroundColor Magenta
        
        $testCommand = if ($TestPath) { 
            "npx vitest run $TestPath --reporter=verbose --no-color --run"
        } else { 
            "npx vitest run --reporter=verbose --no-color --run"
        }
        
        # UTF8 encoding support
        Invoke-Expression $testCommand 2>&1 | 
            Out-File -FilePath $logFile -Encoding UTF8
        
        echo "Log file check"
        if (Test-Path $logFile) {
            Write-Host "=== Detailed Test Results ===" -ForegroundColor Magenta
            Get-Content $logFile | Select-Object -First 10 -Last 10 | ForEach-Object { Write-Host $_ }
            Write-Host "Detail log: $logFile" -ForegroundColor Cyan
        }
    }
    
    "full" {
        # Stage 4: Complete test (final confirmation only)
        $logFile = "$componentName-$timestamp-full-test.log"
        Write-Host "Running full test (this may take time)..." -ForegroundColor DarkYellow
        
        $testCommand = if ($TestPath) { 
            "npx vitest run $TestPath --reporter=verbose --no-color"
        } else { 
            "npx vitest run --reporter=verbose --no-color"
        }
        
        Invoke-Expression "$testCommand > $logFile 2>&1"
        
        echo "Log file check"
        if (Test-Path $logFile) {
            $fileSize = (Get-Item $logFile).Length / 1MB
            Write-Host "Full test completed. File size: $($fileSize.ToString('F2'))MB" -ForegroundColor Green
            Write-Host "Full log: $logFile" -ForegroundColor Cyan
        }
    }
}

# Auto cleanup (unless --SkipCleanup is specified)
if (-not $SkipCleanup) {
    Write-Host "=== Log Cleanup Execution ===" -ForegroundColor Gray
    
    # Remove old log files
    Get-ChildItem *-summary-test.log | Where-Object {$_.LastWriteTime -lt (Get-Date).AddDays(-7)} | Remove-Item -ErrorAction SilentlyContinue
    Get-ChildItem *-detail-test.log | Where-Object {$_.LastWriteTime -lt (Get-Date).AddDays(-1)} | Remove-Item -ErrorAction SilentlyContinue
    Get-ChildItem *-error-test.log | Where-Object {$_.LastWriteTime -lt (Get-Date).AddDays(-3)} | Remove-Item -ErrorAction SilentlyContinue
    
    # Remove large log files (over 5MB and older than 6 hours)
    Get-ChildItem *.log | Where-Object {$_.Length -gt 5MB -and $_.LastWriteTime -lt (Get-Date).AddHours(-6)} | Remove-Item -ErrorAction SilentlyContinue
    
    Write-Host "Cleanup completed" -ForegroundColor Gray
}

Write-Host "=== Test Execution Complete ===" -ForegroundColor Green
