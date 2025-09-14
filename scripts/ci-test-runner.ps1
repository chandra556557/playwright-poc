# CI/CD Test Runner Script for Playwright Tests (PowerShell)
# This script handles test execution, reporting, and environment management on Windows

param(
    [string]$TestSuite = "all",
    [string]$Browser = "chromium",
    [bool]$Headless = $true,
    [string]$BaseUrl = "http://localhost:3000",
    [int]$ParallelWorkers = 4,
    [int]$Retries = 2,
    [int]$Timeout = 30000,
    [string]$ReportFormat = "html,junit,allure",
    [string]$Environment = "ci",
    [bool]$Cleanup = $true,
    [bool]$Notify = $false,
    [switch]$Help
)

# Configuration
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$ProjectRoot = Split-Path -Parent $ScriptDir
$TestResultsDir = Join-Path $ProjectRoot "test-results"
$AllureResultsDir = Join-Path $ProjectRoot "allure-results"
$AllureReportDir = Join-Path $ProjectRoot "allure-report"
$PlaywrightReportDir = Join-Path $ProjectRoot "playwright-report"

# Colors for output
$Colors = @{
    Red = "Red"
    Green = "Green"
    Yellow = "Yellow"
    Blue = "Blue"
    White = "White"
}

# Logging functions
function Write-LogInfo {
    param([string]$Message)
    Write-Host "[INFO] $Message" -ForegroundColor $Colors.Blue
}

function Write-LogSuccess {
    param([string]$Message)
    Write-Host "[SUCCESS] $Message" -ForegroundColor $Colors.Green
}

function Write-LogWarning {
    param([string]$Message)
    Write-Host "[WARNING] $Message" -ForegroundColor $Colors.Yellow
}

function Write-LogError {
    param([string]$Message)
    Write-Host "[ERROR] $Message" -ForegroundColor $Colors.Red
}

# Help function
function Show-Help {
    @"
CI/CD Test Runner for Playwright Tests (PowerShell)

Usage: .\ci-test-runner.ps1 [OPTIONS]

Parameters:
    -TestSuite SUITE           Test suite to run (all|smoke|regression|ai-enhanced|healing-metrics)
    -Browser BROWSER           Browser to use (chromium|firefox|webkit|all)
    -Headless BOOL             Run in headless mode (true|false)
    -BaseUrl URL               Base URL for testing
    -ParallelWorkers NUM       Number of parallel workers
    -Retries NUM               Number of retries for failed tests
    -Timeout MS                Test timeout in milliseconds
    -ReportFormat FORMAT       Report format (html,junit,allure)
    -Environment ENVIRONMENT   Environment (ci|local|staging|prod)
    -Cleanup BOOL              Cleanup after tests (true|false)
    -Notify BOOL               Send notifications (true|false)
    -Help                      Show this help message

Examples:
    .\ci-test-runner.ps1 -TestSuite smoke -Browser chromium -Headless `$true
    .\ci-test-runner.ps1 -TestSuite ai-enhanced -Browser all -ParallelWorkers 2
    .\ci-test-runner.ps1 -TestSuite regression -Environment staging -Notify `$true

"@
}

# Show help if requested
if ($Help) {
    Show-Help
    exit 0
}

# Validation functions
function Test-Environment {
    Write-LogInfo "Validating environment..."
    
    # Check Node.js
    try {
        $nodeVersion = node --version
        Write-LogInfo "Node.js version: $nodeVersion"
    }
    catch {
        Write-LogError "Node.js is not installed or not in PATH"
        exit 1
    }
    
    # Check npm
    try {
        $npmVersion = npm --version
        Write-LogInfo "npm version: $npmVersion"
    }
    catch {
        Write-LogError "npm is not installed or not in PATH"
        exit 1
    }
    
    # Check Playwright
    try {
        $playwrightVersion = npx playwright --version
        Write-LogInfo "Playwright version: $playwrightVersion"
    }
    catch {
        Write-LogError "Playwright is not installed"
        exit 1
    }
    
    Write-LogSuccess "Environment validation passed"
}

# Setup functions
function Initialize-Directories {
    Write-LogInfo "Setting up test directories..."
    
    # Create directories if they don't exist
    @($TestResultsDir, $AllureResultsDir, $AllureReportDir, $PlaywrightReportDir) | ForEach-Object {
        if (-not (Test-Path $_)) {
            New-Item -ItemType Directory -Path $_ -Force | Out-Null
        }
    }
    
    # Clean previous results if cleanup is enabled
    if ($Cleanup) {
        @($TestResultsDir, $AllureResultsDir, $AllureReportDir, $PlaywrightReportDir) | ForEach-Object {
            if (Test-Path $_) {
                Get-ChildItem -Path $_ -Recurse | Remove-Item -Force -Recurse -ErrorAction SilentlyContinue
            }
        }
    }
    
    Write-LogSuccess "Test directories setup completed"
}

function Install-Dependencies {
    Write-LogInfo "Installing dependencies..."
    
    Set-Location $ProjectRoot
    
    try {
        if ($Environment -eq "ci") {
            npm ci
        }
        else {
            npm install
        }
        
        # Install Playwright browsers if needed
        npx playwright install --with-deps
        
        Write-LogSuccess "Dependencies installed successfully"
    }
    catch {
        Write-LogError "Failed to install dependencies: $($_.Exception.Message)"
        exit 1
    }
}

# Test execution functions
function Build-TestCommand {
    $cmd = "npx playwright test"
    
    # Add browser selection
    if ($Browser -ne "all") {
        $cmd += " --project=$Browser"
    }
    
    # Add test suite selection
    switch ($TestSuite) {
        "smoke" {
            $cmd += " --grep '@smoke'"
        }
        "regression" {
            $cmd += " --grep '@regression'"
        }
        "ai-enhanced" {
            $cmd += " blazemeter-ai-enhanced-simple.spec.js"
        }
        "healing-metrics" {
            $cmd += " healing-metrics-tracker.spec.js"
        }
        "all" {
            # Run all tests
        }
        default {
            Write-LogError "Unknown test suite: $TestSuite"
            exit 1
        }
    }
    
    # Add configuration options
    $cmd += " --workers=$ParallelWorkers"
    $cmd += " --retries=$Retries"
    $cmd += " --timeout=$Timeout"
    
    # Add headless mode
    if ($Headless) {
        $cmd += " --headed=false"
    }
    else {
        $cmd += " --headed=true"
    }
    
    # Add reporters
    if ($ReportFormat -like "*html*") {
        $cmd += " --reporter=html"
    }
    if ($ReportFormat -like "*junit*") {
        $cmd += " --reporter=junit"
    }
    if ($ReportFormat -like "*allure*") {
        $cmd += " --reporter=allure-playwright"
    }
    
    return $cmd
}

function Invoke-Tests {
    Write-LogInfo "Starting Playwright tests..."
    Write-LogInfo "Test Suite: $TestSuite"
    Write-LogInfo "Browser: $Browser"
    Write-LogInfo "Base URL: $BaseUrl"
    Write-LogInfo "Workers: $ParallelWorkers"
    Write-LogInfo "Headless: $Headless"
    
    Set-Location $ProjectRoot
    
    # Set environment variables
    $env:NODE_ENV = "test"
    $env:CI = "true"
    $env:BASE_URL = $BaseUrl
    
    # Build and execute test command
    $testCmd = Build-TestCommand
    
    Write-LogInfo "Executing: $testCmd"
    
    # Run tests with error handling
    $exitCode = 0
    try {
        Invoke-Expression $testCmd
    }
    catch {
        $exitCode = $LASTEXITCODE
        if ($exitCode -eq 0) { $exitCode = 1 }
    }
    
    if ($exitCode -eq 0) {
        Write-LogSuccess "All tests passed successfully"
    }
    else {
        Write-LogWarning "Some tests failed (exit code: $exitCode)"
    }
    
    return $exitCode
}

# Report generation functions
function New-Reports {
    Write-LogInfo "Generating test reports..."
    
    Set-Location $ProjectRoot
    
    # Generate Allure report if results exist
    if ((Test-Path $AllureResultsDir) -and (Get-ChildItem $AllureResultsDir -ErrorAction SilentlyContinue)) {
        Write-LogInfo "Generating Allure report..."
        try {
            # Try using allure command first
            if (Get-Command allure -ErrorAction SilentlyContinue) {
                allure generate $AllureResultsDir -o $AllureReportDir --clean
                Write-LogSuccess "Allure report generated at: $AllureReportDir"
            }
            else {
                # Fallback to npm script
                npm run allure:generate
            }
        }
        catch {
            Write-LogWarning "Failed to generate Allure report: $($_.Exception.Message)"
        }
    }
    
    # Generate test summary
    New-TestSummary
}

function New-TestSummary {
    Write-LogInfo "Generating test summary..."
    
    $summaryFile = Join-Path $TestResultsDir "test-summary.json"
    $junitFile = Join-Path $TestResultsDir "junit.xml"
    
    if (Test-Path $junitFile) {
        try {
            # Parse JUnit results
            [xml]$junitXml = Get-Content $junitFile
            $testSuite = $junitXml.testsuites.testsuite
            
            $totalTests = [int]$testSuite.tests
            $failedTests = [int]$testSuite.failures
            $errorTests = [int]$testSuite.errors
            $passedTests = $totalTests - $failedTests - $errorTests
            $successRate = if ($totalTests -gt 0) { [math]::Round(($passedTests / $totalTests) * 100, 2) } else { 0 }
            
            # Create summary object
            $summary = @{
                timestamp = (Get-Date).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ssZ")
                environment = $Environment
                testSuite = $TestSuite
                browser = $Browser
                baseUrl = $BaseUrl
                results = @{
                    total = $totalTests
                    passed = $passedTests
                    failed = $failedTests
                    errors = $errorTests
                    successRate = $successRate
                }
                configuration = @{
                    workers = $ParallelWorkers
                    retries = $Retries
                    timeout = $Timeout
                    headless = $Headless
                }
            }
            
            # Save summary to JSON file
            $summary | ConvertTo-Json -Depth 3 | Set-Content $summaryFile
            
            Write-LogSuccess "Test summary generated at: $summaryFile"
            
            # Display summary
            Write-Host ""
            Write-LogInfo "=== TEST SUMMARY ==="
            Write-Host "Total Tests: $totalTests"
            Write-Host "Passed: $passedTests"
            Write-Host "Failed: $failedTests"
            Write-Host "Errors: $errorTests"
            Write-Host "Success Rate: $successRate%"
            Write-Host "==================="
            Write-Host ""
        }
        catch {
            Write-LogWarning "Failed to parse JUnit results: $($_.Exception.Message)"
        }
    }
}

# Notification functions
function Send-Notifications {
    if (-not $Notify) {
        return
    }
    
    Write-LogInfo "Sending notifications..."
    
    $summaryFile = Join-Path $TestResultsDir "test-summary.json"
    
    if (Test-Path $summaryFile) {
        # Send Slack notification (if configured)
        if ($env:SLACK_WEBHOOK_URL) {
            Send-SlackNotification $summaryFile
        }
        
        # Send email notification (if configured)
        if ($env:EMAIL_RECIPIENTS) {
            Send-EmailNotification $summaryFile
        }
    }
}

function Send-SlackNotification {
    param([string]$SummaryFile)
    
    try {
        $summary = Get-Content $SummaryFile | ConvertFrom-Json
        
        $color = "good"
        if ($summary.results.failed -gt 0) {
            $color = "warning"
        }
        if ($summary.results.successRate -lt 80) {
            $color = "danger"
        }
        
        $payload = @{
            attachments = @(
                @{
                    color = $color
                    title = "Playwright Test Results - $($summary.testSuite)"
                    fields = @(
                        @{ title = "Total Tests"; value = $summary.results.total; short = $true },
                        @{ title = "Passed"; value = $summary.results.passed; short = $true },
                        @{ title = "Failed"; value = $summary.results.failed; short = $true },
                        @{ title = "Success Rate"; value = "$($summary.results.successRate)%"; short = $true },
                        @{ title = "Browser"; value = $summary.browser; short = $true },
                        @{ title = "Environment"; value = $summary.environment; short = $true }
                    )
                    footer = "Playwright CI/CD"
                    ts = [int][double]::Parse((Get-Date -UFormat %s))
                }
            )
        } | ConvertTo-Json -Depth 4
        
        Invoke-RestMethod -Uri $env:SLACK_WEBHOOK_URL -Method Post -Body $payload -ContentType "application/json"
        Write-LogSuccess "Slack notification sent successfully"
    }
    catch {
        Write-LogWarning "Failed to send Slack notification: $($_.Exception.Message)"
    }
}

# Cleanup function
function Clear-Environment {
    if ($Cleanup) {
        Write-LogInfo "Cleaning up environment..."
        
        # Kill any remaining processes
        Get-Process | Where-Object { $_.ProcessName -match "(playwright|chromium|firefox|webkit)" } | Stop-Process -Force -ErrorAction SilentlyContinue
        
        Write-LogSuccess "Environment cleanup completed"
    }
}

# Main execution function
function Main {
    Write-LogInfo "Starting CI/CD Test Runner (PowerShell)"
    Write-LogInfo "Project Root: $ProjectRoot"
    
    try {
        # Execute pipeline
        Test-Environment
        Initialize-Directories
        Install-Dependencies
        
        $testExitCode = Invoke-Tests
        
        New-Reports
        Send-Notifications
        
        if ($testExitCode -eq 0) {
            Write-LogSuccess "CI/CD Test Runner completed successfully"
        }
        else {
            Write-LogError "CI/CD Test Runner completed with failures"
        }
        
        return $testExitCode
    }
    catch {
        Write-LogError "CI/CD Test Runner failed: $($_.Exception.Message)"
        return 1
    }
    finally {
        Clear-Environment
    }
}

# Execute main function and exit with appropriate code
$exitCode = Main
exit $exitCode