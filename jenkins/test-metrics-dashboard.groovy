/**
 * Jenkins Test Metrics Dashboard Configuration
 * Provides comprehensive test metrics and reporting for Playwright tests
 */

@Library('jenkins-shared-library') _

class TestMetricsDashboard {
    def script
    def config
    
    TestMetricsDashboard(script, config = [:]) {
        this.script = script
        this.config = [
            metricsRetentionDays: config.metricsRetentionDays ?: 30,
            dashboardTitle: config.dashboardTitle ?: 'Playwright Test Metrics',
            enableTrendAnalysis: config.enableTrendAnalysis ?: true,
            alertThresholds: config.alertThresholds ?: [
                failureRate: 10.0,
                avgDuration: 300000, // 5 minutes in ms
                flakyTestRate: 5.0
            ]
        ]
    }
    
    /**
     * Collect and process test metrics
     */
    def collectMetrics() {
        def metrics = [:]
        
        try {
            // Collect basic test metrics
            metrics.basic = collectBasicMetrics()
            
            // Collect performance metrics
            metrics.performance = collectPerformanceMetrics()
            
            // Collect flaky test metrics
            metrics.flaky = collectFlakyTestMetrics()
            
            // Collect browser-specific metrics
            metrics.browsers = collectBrowserMetrics()
            
            // Collect historical trends
            if (config.enableTrendAnalysis) {
                metrics.trends = collectTrendMetrics()
            }
            
            // Store metrics
            storeMetrics(metrics)
            
            // Generate alerts if needed
            checkAlertThresholds(metrics)
            
            return metrics
            
        } catch (Exception e) {
            script.echo "Error collecting metrics: ${e.message}"
            return [:]
        }
    }
    
    /**
     * Collect basic test metrics
     */
    def collectBasicMetrics() {
        def metrics = [:]
        
        // Parse test results
        if (script.fileExists('test-results/results.json')) {
            def results = script.readJSON(file: 'test-results/results.json')
            
            metrics.totalTests = results.stats?.total ?: 0
            metrics.passedTests = results.stats?.passed ?: 0
            metrics.failedTests = results.stats?.failed ?: 0
            metrics.skippedTests = results.stats?.skipped ?: 0
            metrics.passRate = metrics.totalTests > 0 ? 
                (metrics.passedTests / metrics.totalTests * 100).round(2) : 0
            metrics.failureRate = metrics.totalTests > 0 ? 
                (metrics.failedTests / metrics.totalTests * 100).round(2) : 0
        }
        
        // Build information
        metrics.buildNumber = script.env.BUILD_NUMBER
        metrics.buildDuration = script.currentBuild.duration ?: 0
        metrics.buildStatus = script.currentBuild.result ?: 'SUCCESS'
        metrics.timestamp = new Date().format('yyyy-MM-dd HH:mm:ss')
        metrics.branch = script.env.BRANCH_NAME ?: 'main'
        
        return metrics
    }
    
    /**
     * Collect performance metrics
     */
    def collectPerformanceMetrics() {
        def metrics = [:]
        
        try {
            // Parse Allure results for timing data
            if (script.fileExists('allure-results')) {
                def allureFiles = script.sh(
                    script: 'find allure-results -name "*-result.json" | head -10',
                    returnStdout: true
                ).trim().split('\n')
                
                def durations = []
                allureFiles.each { file ->
                    if (file && script.fileExists(file)) {
                        def result = script.readJSON(file: file)
                        if (result.stop && result.start) {
                            durations.add(result.stop - result.start)
                        }
                    }
                }
                
                if (durations) {
                    metrics.avgDuration = durations.sum() / durations.size()
                    metrics.minDuration = durations.min()
                    metrics.maxDuration = durations.max()
                    metrics.medianDuration = durations.sort()[durations.size() / 2 as int]
                }
            }
            
            // Resource usage metrics
            metrics.memoryUsage = getMemoryUsage()
            metrics.cpuUsage = getCpuUsage()
            
        } catch (Exception e) {
            script.echo "Error collecting performance metrics: ${e.message}"
        }
        
        return metrics
    }
    
    /**
     * Collect flaky test metrics
     */
    def collectFlakyTestMetrics() {
        def metrics = [:]
        
        try {
            // Read historical test results to identify flaky tests
            def flakyTests = identifyFlakyTests()
            
            metrics.flakyTestCount = flakyTests.size()
            metrics.flakyTestRate = metrics.flakyTestCount > 0 ? 
                (metrics.flakyTestCount / (collectBasicMetrics().totalTests ?: 1) * 100).round(2) : 0
            metrics.flakyTests = flakyTests.take(10) // Top 10 flaky tests
            
        } catch (Exception e) {
            script.echo "Error collecting flaky test metrics: ${e.message}"
        }
        
        return metrics
    }
    
    /**
     * Collect browser-specific metrics
     */
    def collectBrowserMetrics() {
        def metrics = [:]
        
        try {
            ['chromium', 'firefox', 'webkit'].each { browser ->
                def browserResults = getBrowserResults(browser)
                if (browserResults) {
                    metrics[browser] = [
                        totalTests: browserResults.total ?: 0,
                        passedTests: browserResults.passed ?: 0,
                        failedTests: browserResults.failed ?: 0,
                        passRate: browserResults.total > 0 ? 
                            (browserResults.passed / browserResults.total * 100).round(2) : 0
                    ]
                }
            }
        } catch (Exception e) {
            script.echo "Error collecting browser metrics: ${e.message}"
        }
        
        return metrics
    }
    
    /**
     * Collect trend metrics
     */
    def collectTrendMetrics() {
        def metrics = [:]
        
        try {
            // Get historical data from previous builds
            def historicalData = getHistoricalMetrics(10) // Last 10 builds
            
            if (historicalData) {
                metrics.passRateTrend = calculateTrend(historicalData.collect { it.passRate })
                metrics.durationTrend = calculateTrend(historicalData.collect { it.avgDuration })
                metrics.flakyTestTrend = calculateTrend(historicalData.collect { it.flakyTestRate })
            }
            
        } catch (Exception e) {
            script.echo "Error collecting trend metrics: ${e.message}"
        }
        
        return metrics
    }
    
    /**
     * Store metrics for historical analysis
     */
    def storeMetrics(metrics) {
        try {
            def metricsFile = "test-metrics-${script.env.BUILD_NUMBER}.json"
            script.writeJSON(file: metricsFile, json: metrics)
            
            // Archive metrics file
            script.archiveArtifacts(
                artifacts: metricsFile,
                allowEmptyArchive: true
            )
            
            // Store in database if configured
            if (config.databaseUrl) {
                storeMetricsInDatabase(metrics)
            }
            
        } catch (Exception e) {
            script.echo "Error storing metrics: ${e.message}"
        }
    }
    
    /**
     * Check alert thresholds and send notifications
     */
    def checkAlertThresholds(metrics) {
        def alerts = []
        
        // Check failure rate
        if (metrics.basic?.failureRate > config.alertThresholds.failureRate) {
            alerts.add([
                type: 'HIGH_FAILURE_RATE',
                message: "Failure rate (${metrics.basic.failureRate}%) exceeds threshold (${config.alertThresholds.failureRate}%)",
                severity: 'HIGH'
            ])
        }
        
        // Check average duration
        if (metrics.performance?.avgDuration > config.alertThresholds.avgDuration) {
            alerts.add([
                type: 'SLOW_TESTS',
                message: "Average test duration (${metrics.performance.avgDuration}ms) exceeds threshold (${config.alertThresholds.avgDuration}ms)",
                severity: 'MEDIUM'
            ])
        }
        
        // Check flaky test rate
        if (metrics.flaky?.flakyTestRate > config.alertThresholds.flakyTestRate) {
            alerts.add([
                type: 'HIGH_FLAKY_RATE',
                message: "Flaky test rate (${metrics.flaky.flakyTestRate}%) exceeds threshold (${config.alertThresholds.flakyTestRate}%)",
                severity: 'MEDIUM'
            ])
        }
        
        // Send alerts if any
        if (alerts) {
            sendAlerts(alerts)
        }
    }
    
    /**
     * Generate HTML dashboard
     */
    def generateDashboard(metrics) {
        def html = """
<!DOCTYPE html>
<html>
<head>
    <title>${config.dashboardTitle}</title>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
    <style>
        body { font-family: Arial, sans-serif; margin: 0; padding: 20px; background-color: #f5f5f5; }
        .container { max-width: 1200px; margin: 0 auto; }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; border-radius: 10px; margin-bottom: 20px; }
        .metrics-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 20px; margin-bottom: 20px; }
        .metric-card { background: white; padding: 20px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        .metric-value { font-size: 2em; font-weight: bold; color: #333; }
        .metric-label { color: #666; margin-top: 5px; }
        .chart-container { background: white; padding: 20px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); margin-bottom: 20px; }
        .success { color: #28a745; }
        .warning { color: #ffc107; }
        .danger { color: #dc3545; }
        .trend-up { color: #28a745; }
        .trend-down { color: #dc3545; }
        .flaky-tests { max-height: 200px; overflow-y: auto; }
        .test-item { padding: 5px 0; border-bottom: 1px solid #eee; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>${config.dashboardTitle}</h1>
            <p>Build #${metrics.basic?.buildNumber} - ${metrics.basic?.timestamp}</p>
            <p>Branch: ${metrics.basic?.branch} | Status: ${metrics.basic?.buildStatus}</p>
        </div>
        
        <div class="metrics-grid">
            <div class="metric-card">
                <div class="metric-value ${getStatusClass(metrics.basic?.passRate)}">${metrics.basic?.passRate ?: 0}%</div>
                <div class="metric-label">Pass Rate</div>
            </div>
            <div class="metric-card">
                <div class="metric-value">${metrics.basic?.totalTests ?: 0}</div>
                <div class="metric-label">Total Tests</div>
            </div>
            <div class="metric-card">
                <div class="metric-value ${metrics.basic?.failedTests > 0 ? 'danger' : 'success'}">${metrics.basic?.failedTests ?: 0}</div>
                <div class="metric-label">Failed Tests</div>
            </div>
            <div class="metric-card">
                <div class="metric-value">${formatDuration(metrics.performance?.avgDuration)}</div>
                <div class="metric-label">Avg Duration</div>
            </div>
            <div class="metric-card">
                <div class="metric-value ${getStatusClass(100 - (metrics.flaky?.flakyTestRate ?: 0))}">${metrics.flaky?.flakyTestRate ?: 0}%</div>
                <div class="metric-label">Flaky Test Rate</div>
            </div>
            <div class="metric-card">
                <div class="metric-value">${formatDuration(metrics.basic?.buildDuration)}</div>
                <div class="metric-label">Build Duration</div>
            </div>
        </div>
        
        ${generateBrowserMetricsChart(metrics.browsers)}
        ${generateTrendChart(metrics.trends)}
        ${generateFlakyTestsList(metrics.flaky?.flakyTests)}
    </div>
    
    <script>
        // Chart configurations will be inserted here
        ${generateChartScripts(metrics)}
    </script>
</body>
</html>
        """.stripIndent()
        
        // Write dashboard HTML
        script.writeFile(file: 'test-metrics-dashboard.html', text: html)
        
        // Publish HTML report
        script.publishHTML([
            allowMissing: false,
            alwaysLinkToLastBuild: true,
            keepAll: true,
            reportDir: '.',
            reportFiles: 'test-metrics-dashboard.html',
            reportName: 'Test Metrics Dashboard'
        ])
    }
    
    /**
     * Helper methods
     */
    def getStatusClass(value) {
        if (value >= 90) return 'success'
        if (value >= 70) return 'warning'
        return 'danger'
    }
    
    def formatDuration(duration) {
        if (!duration) return 'N/A'
        def seconds = duration / 1000
        if (seconds < 60) return "${seconds.round(1)}s"
        def minutes = seconds / 60
        return "${minutes.round(1)}m"
    }
    
    def generateBrowserMetricsChart(browserMetrics) {
        if (!browserMetrics) return ''
        
        return """
        <div class="chart-container">
            <h3>Browser Test Results</h3>
            <canvas id="browserChart" width="400" height="200"></canvas>
        </div>
        """.stripIndent()
    }
    
    def generateTrendChart(trends) {
        if (!trends) return ''
        
        return """
        <div class="chart-container">
            <h3>Test Trends</h3>
            <canvas id="trendChart" width="400" height="200"></canvas>
        </div>
        """.stripIndent()
    }
    
    def generateFlakyTestsList(flakyTests) {
        if (!flakyTests) return ''
        
        def listItems = flakyTests.collect { test ->
            "<div class='test-item'>${test.name} (${test.failureRate}% failure rate)</div>"
        }.join('')
        
        return """
        <div class="chart-container">
            <h3>Top Flaky Tests</h3>
            <div class="flaky-tests">
                ${listItems}
            </div>
        </div>
        """.stripIndent()
    }
    
    def generateChartScripts(metrics) {
        return """
        // Browser metrics chart
        if (document.getElementById('browserChart')) {
            new Chart(document.getElementById('browserChart'), {
                type: 'bar',
                data: {
                    labels: ['Chromium', 'Firefox', 'WebKit'],
                    datasets: [{
                        label: 'Pass Rate (%)',
                        data: [${metrics.browsers?.chromium?.passRate ?: 0}, ${metrics.browsers?.firefox?.passRate ?: 0}, ${metrics.browsers?.webkit?.passRate ?: 0}],
                        backgroundColor: ['#4CAF50', '#2196F3', '#FF9800']
                    }]
                },
                options: {
                    responsive: true,
                    scales: {
                        y: {
                            beginAtZero: true,
                            max: 100
                        }
                    }
                }
            });
        }
        """.stripIndent()
    }
    
    // Additional helper methods for data collection
    def identifyFlakyTests() {
        // Implementation to identify flaky tests from historical data
        return []
    }
    
    def getBrowserResults(browser) {
        // Implementation to get browser-specific results
        return null
    }
    
    def getHistoricalMetrics(buildCount) {
        // Implementation to get historical metrics
        return []
    }
    
    def calculateTrend(values) {
        // Implementation to calculate trend direction
        return 'stable'
    }
    
    def getMemoryUsage() {
        // Implementation to get memory usage
        return 0
    }
    
    def getCpuUsage() {
        // Implementation to get CPU usage
        return 0
    }
    
    def storeMetricsInDatabase(metrics) {
        // Implementation to store metrics in database
    }
    
    def sendAlerts(alerts) {
        // Implementation to send alerts
        alerts.each { alert ->
            script.echo "ALERT [${alert.severity}]: ${alert.message}"
        }
    }
}

// Usage example:
// def dashboard = new TestMetricsDashboard(this, [
//     dashboardTitle: 'Playwright Test Metrics',
//     enableTrendAnalysis: true
// ])
// 
// def metrics = dashboard.collectMetrics()
// dashboard.generateDashboard(metrics)

return this