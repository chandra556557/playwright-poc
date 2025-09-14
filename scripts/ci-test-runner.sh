#!/bin/bash

# CI/CD Test Runner Script for Playwright Tests
# This script handles test execution, reporting, and environment management

set -e  # Exit on any error

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
TEST_RESULTS_DIR="$PROJECT_ROOT/test-results"
ALLURE_RESULTS_DIR="$PROJECT_ROOT/allure-results"
ALLURE_REPORT_DIR="$PROJECT_ROOT/allure-report"
PLAYWRIGHT_REPORT_DIR="$PROJECT_ROOT/playwright-report"

# Default values
TEST_SUITE="all"
BROWSER="chromium"
HEADLESS="true"
BASE_URL="http://localhost:3000"
PARALLEL_WORKERS="4"
RETRIES="2"
TIMEOUT="30000"
REPORT_FORMAT="html,junit,allure"
ENVIRONMENT="ci"
CLEANUP="true"
NOTIFY="false"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Help function
show_help() {
    cat << EOF
CI/CD Test Runner for Playwright Tests

Usage: $0 [OPTIONS]

Options:
    -s, --suite SUITE           Test suite to run (all|smoke|regression|ai-enhanced|healing-metrics)
    -b, --browser BROWSER       Browser to use (chromium|firefox|webkit|all)
    -h, --headless BOOL         Run in headless mode (true|false)
    -u, --url URL               Base URL for testing
    -w, --workers NUM           Number of parallel workers
    -r, --retries NUM           Number of retries for failed tests
    -t, --timeout MS            Test timeout in milliseconds
    -f, --format FORMAT         Report format (html,junit,allure)
    -e, --env ENVIRONMENT       Environment (ci|local|staging|prod)
    -c, --cleanup BOOL          Cleanup after tests (true|false)
    -n, --notify BOOL           Send notifications (true|false)
    --help                      Show this help message

Examples:
    $0 --suite smoke --browser chromium --headless true
    $0 --suite ai-enhanced --browser all --workers 2
    $0 --suite regression --env staging --notify true

EOF
}

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        -s|--suite)
            TEST_SUITE="$2"
            shift 2
            ;;
        -b|--browser)
            BROWSER="$2"
            shift 2
            ;;
        -h|--headless)
            HEADLESS="$2"
            shift 2
            ;;
        -u|--url)
            BASE_URL="$2"
            shift 2
            ;;
        -w|--workers)
            PARALLEL_WORKERS="$2"
            shift 2
            ;;
        -r|--retries)
            RETRIES="$2"
            shift 2
            ;;
        -t|--timeout)
            TIMEOUT="$2"
            shift 2
            ;;
        -f|--format)
            REPORT_FORMAT="$2"
            shift 2
            ;;
        -e|--env)
            ENVIRONMENT="$2"
            shift 2
            ;;
        -c|--cleanup)
            CLEANUP="$2"
            shift 2
            ;;
        -n|--notify)
            NOTIFY="$2"
            shift 2
            ;;
        --help)
            show_help
            exit 0
            ;;
        *)
            log_error "Unknown option: $1"
            show_help
            exit 1
            ;;
    esac
done

# Validation functions
validate_environment() {
    log_info "Validating environment..."
    
    # Check Node.js
    if ! command -v node &> /dev/null; then
        log_error "Node.js is not installed"
        exit 1
    fi
    
    # Check npm
    if ! command -v npm &> /dev/null; then
        log_error "npm is not installed"
        exit 1
    fi
    
    # Check Playwright
    if ! npx playwright --version &> /dev/null; then
        log_error "Playwright is not installed"
        exit 1
    fi
    
    log_success "Environment validation passed"
}

# Setup functions
setup_directories() {
    log_info "Setting up test directories..."
    
    mkdir -p "$TEST_RESULTS_DIR"
    mkdir -p "$ALLURE_RESULTS_DIR"
    mkdir -p "$ALLURE_REPORT_DIR"
    mkdir -p "$PLAYWRIGHT_REPORT_DIR"
    
    # Clean previous results if cleanup is enabled
    if [[ "$CLEANUP" == "true" ]]; then
        rm -rf "$TEST_RESULTS_DIR"/*
        rm -rf "$ALLURE_RESULTS_DIR"/*
        rm -rf "$ALLURE_REPORT_DIR"/*
        rm -rf "$PLAYWRIGHT_REPORT_DIR"/*
    fi
    
    log_success "Test directories setup completed"
}

install_dependencies() {
    log_info "Installing dependencies..."
    
    cd "$PROJECT_ROOT"
    
    if [[ "$ENVIRONMENT" == "ci" ]]; then
        npm ci
    else
        npm install
    fi
    
    # Install Playwright browsers if needed
    npx playwright install --with-deps
    
    log_success "Dependencies installed successfully"
}

# Test execution functions
build_test_command() {
    local cmd="npx playwright test"
    
    # Add browser selection
    if [[ "$BROWSER" != "all" ]]; then
        cmd+=" --project=$BROWSER"
    fi
    
    # Add test suite selection
    case "$TEST_SUITE" in
        "smoke")
            cmd+=" --grep '@smoke'"
            ;;
        "regression")
            cmd+=" --grep '@regression'"
            ;;
        "ai-enhanced")
            cmd+=" blazemeter-ai-enhanced-simple.spec.js"
            ;;
        "healing-metrics")
            cmd+=" healing-metrics-tracker.spec.js"
            ;;
        "all")
            # Run all tests
            ;;
        *)
            log_error "Unknown test suite: $TEST_SUITE"
            exit 1
            ;;
    esac
    
    # Add configuration options
    cmd+=" --workers=$PARALLEL_WORKERS"
    cmd+=" --retries=$RETRIES"
    cmd+=" --timeout=$TIMEOUT"
    
    # Add headless mode
    if [[ "$HEADLESS" == "true" ]]; then
        cmd+=" --headed=false"
    else
        cmd+=" --headed=true"
    fi
    
    # Add reporters
    if [[ "$REPORT_FORMAT" == *"html"* ]]; then
        cmd+=" --reporter=html"
    fi
    if [[ "$REPORT_FORMAT" == *"junit"* ]]; then
        cmd+=" --reporter=junit"
    fi
    if [[ "$REPORT_FORMAT" == *"allure"* ]]; then
        cmd+=" --reporter=allure-playwright"
    fi
    
    echo "$cmd"
}

run_tests() {
    log_info "Starting Playwright tests..."
    log_info "Test Suite: $TEST_SUITE"
    log_info "Browser: $BROWSER"
    log_info "Base URL: $BASE_URL"
    log_info "Workers: $PARALLEL_WORKERS"
    log_info "Headless: $HEADLESS"
    
    cd "$PROJECT_ROOT"
    
    # Set environment variables
    export NODE_ENV="test"
    export CI="true"
    export BASE_URL="$BASE_URL"
    
    # Build and execute test command
    local test_cmd
    test_cmd=$(build_test_command)
    
    log_info "Executing: $test_cmd"
    
    # Run tests with error handling
    local exit_code=0
    eval "$test_cmd" || exit_code=$?
    
    if [[ $exit_code -eq 0 ]]; then
        log_success "All tests passed successfully"
    else
        log_warning "Some tests failed (exit code: $exit_code)"
    fi
    
    return $exit_code
}

# Report generation functions
generate_reports() {
    log_info "Generating test reports..."
    
    cd "$PROJECT_ROOT"
    
    # Generate Allure report if results exist
    if [[ -d "$ALLURE_RESULTS_DIR" ]] && [[ -n "$(ls -A "$ALLURE_RESULTS_DIR")" ]]; then
        log_info "Generating Allure report..."
        if command -v allure &> /dev/null; then
            allure generate "$ALLURE_RESULTS_DIR" -o "$ALLURE_REPORT_DIR" --clean
            log_success "Allure report generated at: $ALLURE_REPORT_DIR"
        else
            npm run allure:generate || log_warning "Failed to generate Allure report"
        fi
    fi
    
    # Generate test summary
    generate_test_summary
}

generate_test_summary() {
    log_info "Generating test summary..."
    
    local summary_file="$TEST_RESULTS_DIR/test-summary.json"
    local junit_file="$TEST_RESULTS_DIR/junit.xml"
    
    if [[ -f "$junit_file" ]]; then
        # Parse JUnit results
        local total_tests
        local failed_tests
        local error_tests
        local passed_tests
        
        total_tests=$(grep -o 'tests="[0-9]*"' "$junit_file" | grep -o '[0-9]*' || echo "0")
        failed_tests=$(grep -o 'failures="[0-9]*"' "$junit_file" | grep -o '[0-9]*' || echo "0")
        error_tests=$(grep -o 'errors="[0-9]*"' "$junit_file" | grep -o '[0-9]*' || echo "0")
        passed_tests=$((total_tests - failed_tests - error_tests))
        
        # Create summary JSON
        cat > "$summary_file" << EOF
{
    "timestamp": "$(date -u +"%Y-%m-%dT%H:%M:%SZ")",
    "environment": "$ENVIRONMENT",
    "testSuite": "$TEST_SUITE",
    "browser": "$BROWSER",
    "baseUrl": "$BASE_URL",
    "results": {
        "total": $total_tests,
        "passed": $passed_tests,
        "failed": $failed_tests,
        "errors": $error_tests,
        "successRate": $(echo "scale=2; $passed_tests * 100 / $total_tests" | bc -l 2>/dev/null || echo "0")
    },
    "configuration": {
        "workers": $PARALLEL_WORKERS,
        "retries": $RETRIES,
        "timeout": $TIMEOUT,
        "headless": $HEADLESS
    }
}
EOF
        
        log_success "Test summary generated at: $summary_file"
        
        # Display summary
        echo
        log_info "=== TEST SUMMARY ==="
        echo "Total Tests: $total_tests"
        echo "Passed: $passed_tests"
        echo "Failed: $failed_tests"
        echo "Errors: $error_tests"
        echo "Success Rate: $(echo "scale=1; $passed_tests * 100 / $total_tests" | bc -l 2>/dev/null || echo "0")%"
        echo "==================="
        echo
    fi
}

# Notification functions
send_notifications() {
    if [[ "$NOTIFY" != "true" ]]; then
        return 0
    fi
    
    log_info "Sending notifications..."
    
    local summary_file="$TEST_RESULTS_DIR/test-summary.json"
    
    if [[ -f "$summary_file" ]]; then
        # Send Slack notification (if configured)
        if [[ -n "$SLACK_WEBHOOK_URL" ]]; then
            send_slack_notification "$summary_file"
        fi
        
        # Send email notification (if configured)
        if [[ -n "$EMAIL_RECIPIENTS" ]]; then
            send_email_notification "$summary_file"
        fi
    fi
}

send_slack_notification() {
    local summary_file="$1"
    
    if ! command -v jq &> /dev/null; then
        log_warning "jq not found, skipping Slack notification"
        return 1
    fi
    
    local total passed failed success_rate
    total=$(jq -r '.results.total' "$summary_file")
    passed=$(jq -r '.results.passed' "$summary_file")
    failed=$(jq -r '.results.failed' "$summary_file")
    success_rate=$(jq -r '.results.successRate' "$summary_file")
    
    local color="good"
    if [[ "$failed" -gt 0 ]]; then
        color="warning"
    fi
    if [[ "$success_rate" < 80 ]]; then
        color="danger"
    fi
    
    local payload
    payload=$(cat << EOF
{
    "attachments": [{
        "color": "$color",
        "title": "Playwright Test Results - $TEST_SUITE",
        "fields": [
            {"title": "Total Tests", "value": "$total", "short": true},
            {"title": "Passed", "value": "$passed", "short": true},
            {"title": "Failed", "value": "$failed", "short": true},
            {"title": "Success Rate", "value": "$success_rate%", "short": true},
            {"title": "Browser", "value": "$BROWSER", "short": true},
            {"title": "Environment", "value": "$ENVIRONMENT", "short": true}
        ],
        "footer": "Playwright CI/CD",
        "ts": $(date +%s)
    }]
}
EOF
)
    
    curl -X POST -H 'Content-type: application/json' \
        --data "$payload" \
        "$SLACK_WEBHOOK_URL" || log_warning "Failed to send Slack notification"
}

# Cleanup function
cleanup_environment() {
    if [[ "$CLEANUP" == "true" ]]; then
        log_info "Cleaning up environment..."
        
        # Kill any remaining processes
        pkill -f "playwright" || true
        pkill -f "chromium" || true
        pkill -f "firefox" || true
        pkill -f "webkit" || true
        
        log_success "Environment cleanup completed"
    fi
}

# Main execution function
main() {
    log_info "Starting CI/CD Test Runner"
    log_info "Project Root: $PROJECT_ROOT"
    
    # Trap cleanup on exit
    trap cleanup_environment EXIT
    
    # Execute pipeline
    validate_environment
    setup_directories
    install_dependencies
    
    local test_exit_code=0
    run_tests || test_exit_code=$?
    
    generate_reports
    send_notifications
    
    if [[ $test_exit_code -eq 0 ]]; then
        log_success "CI/CD Test Runner completed successfully"
    else
        log_error "CI/CD Test Runner completed with failures"
    fi
    
    exit $test_exit_code
}

# Execute main function
main "$@"