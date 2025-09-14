/**
 * Jenkins Notification System for Playwright Test Results
 * Handles test result publishing and notifications via Slack, Email, and Teams
 */

@Library('jenkins-shared-library') _

class NotificationSystem {
    def script
    def config
    
    NotificationSystem(script, config = [:]) {
        this.script = script
        this.config = [
            slackChannel: config.slackChannel ?: '#playwright-tests',
            emailRecipients: config.emailRecipients ?: 'team@company.com',
            teamsWebhook: config.teamsWebhook ?: '',
            includeTestDetails: config.includeTestDetails ?: true,
            attachReports: config.attachReports ?: true
        ]
    }
    
    /**
     * Main method to publish test results and send notifications
     */
    def publishAndNotify(testResults) {
        try {
            // Publish test results
            publishTestResults(testResults)
            
            // Archive artifacts
            archiveArtifacts()
            
            // Send notifications based on build status
            def buildStatus = script.currentBuild.result ?: 'SUCCESS'
            sendNotifications(buildStatus, testResults)
            
        } catch (Exception e) {
            script.echo "Error in notification system: ${e.message}"
            script.currentBuild.result = 'UNSTABLE'
        }
    }
    
    /**
     * Publish test results to Jenkins
     */
    def publishTestResults(testResults) {
        script.echo "Publishing test results..."
        
        // Publish JUnit test results
        if (script.fileExists('test-results/junit-results.xml')) {
            script.publishTestResults([
                testResultsPattern: 'test-results/junit-results.xml',
                allowEmptyResults: false,
                keepLongStdio: true
            ])
        }
        
        // Publish Allure reports
        if (script.fileExists('allure-results')) {
            script.allure([
                includeProperties: false,
                jdk: '',
                properties: [],
                reportBuildPolicy: 'ALWAYS',
                results: [[
                    path: 'allure-results'
                ]]
            ])
        }
        
        // Publish HTML reports
        if (script.fileExists('playwright-report')) {
            script.publishHTML([
                allowMissing: false,
                alwaysLinkToLastBuild: true,
                keepAll: true,
                reportDir: 'playwright-report',
                reportFiles: 'index.html',
                reportName: 'Playwright Test Report',
                reportTitles: ''
            ])
        }
    }
    
    /**
     * Archive test artifacts
     */
    def archiveArtifacts() {
        script.echo "Archiving test artifacts..."
        
        def artifacts = [
            'test-results/**/*',
            'allure-results/**/*',
            'playwright-report/**/*',
            'screenshots/**/*',
            'videos/**/*',
            'traces/**/*'
        ]
        
        artifacts.each { pattern ->
            if (script.fileExists(pattern.split('/')[0])) {
                script.archiveArtifacts(
                    artifacts: pattern,
                    allowEmptyArchive: true,
                    fingerprint: true
                )
            }
        }
    }
    
    /**
     * Send notifications based on build status
     */
    def sendNotifications(buildStatus, testResults) {
        def message = buildNotificationMessage(buildStatus, testResults)
        def color = getStatusColor(buildStatus)
        
        // Send Slack notification
        sendSlackNotification(message, color, testResults)
        
        // Send email notification
        sendEmailNotification(message, buildStatus, testResults)
        
        // Send Teams notification if webhook is configured
        if (config.teamsWebhook) {
            sendTeamsNotification(message, color, testResults)
        }
    }
    
    /**
     * Build notification message
     */
    def buildNotificationMessage(buildStatus, testResults) {
        def jobName = script.env.JOB_NAME
        def buildNumber = script.env.BUILD_NUMBER
        def buildUrl = script.env.BUILD_URL
        def duration = script.currentBuild.durationString
        
        def message = """
*${jobName} - Build #${buildNumber}*
*Status:* ${buildStatus}
*Duration:* ${duration}
*Build URL:* ${buildUrl}
        """.stripIndent()
        
        if (config.includeTestDetails && testResults) {
            message += "\n\n*Test Results:*\n"
            message += "• Total Tests: ${testResults.total ?: 'N/A'}\n"
            message += "• Passed: ${testResults.passed ?: 'N/A'}\n"
            message += "• Failed: ${testResults.failed ?: 'N/A'}\n"
            message += "• Skipped: ${testResults.skipped ?: 'N/A'}\n"
            
            if (testResults.failed > 0) {
                message += "\n*Failed Tests:*\n"
                testResults.failedTests?.take(5)?.each { test ->
                    message += "• ${test}\n"
                }
                if (testResults.failedTests?.size() > 5) {
                    message += "• ... and ${testResults.failedTests.size() - 5} more\n"
                }
            }
        }
        
        return message
    }
    
    /**
     * Send Slack notification
     */
    def sendSlackNotification(message, color, testResults) {
        try {
            script.slackSend(
                channel: config.slackChannel,
                color: color,
                message: message,
                teamDomain: script.env.SLACK_TEAM_DOMAIN,
                token: script.env.SLACK_TOKEN
            )
            script.echo "Slack notification sent successfully"
        } catch (Exception e) {
            script.echo "Failed to send Slack notification: ${e.message}"
        }
    }
    
    /**
     * Send email notification
     */
    def sendEmailNotification(message, buildStatus, testResults) {
        try {
            def subject = "[${buildStatus}] ${script.env.JOB_NAME} - Build #${script.env.BUILD_NUMBER}"
            def body = buildEmailBody(message, testResults)
            
            script.emailext(
                subject: subject,
                body: body,
                to: config.emailRecipients,
                mimeType: 'text/html',
                attachmentsPattern: config.attachReports ? 'test-results/**/*' : ''
            )
            script.echo "Email notification sent successfully"
        } catch (Exception e) {
            script.echo "Failed to send email notification: ${e.message}"
        }
    }
    
    /**
     * Send Teams notification
     */
    def sendTeamsNotification(message, color, testResults) {
        try {
            def payload = [
                '@type': 'MessageCard',
                '@context': 'http://schema.org/extensions',
                'themeColor': color,
                'summary': "${script.env.JOB_NAME} - Build #${script.env.BUILD_NUMBER}",
                'sections': [[
                    'activityTitle': "${script.env.JOB_NAME}",
                    'activitySubtitle': "Build #${script.env.BUILD_NUMBER}",
                    'text': message.replaceAll('\*', '**'),
                    'facts': buildTeamsFacts(testResults)
                ]],
                'potentialAction': [[
                    '@type': 'OpenUri',
                    'name': 'View Build',
                    'targets': [[
                        'os': 'default',
                        'uri': script.env.BUILD_URL
                    ]]
                ]]
            ]
            
            script.httpRequest(
                httpMode: 'POST',
                url: config.teamsWebhook,
                contentType: 'APPLICATION_JSON',
                requestBody: script.writeJSON(returnText: true, json: payload)
            )
            script.echo "Teams notification sent successfully"
        } catch (Exception e) {
            script.echo "Failed to send Teams notification: ${e.message}"
        }
    }
    
    /**
     * Build email body with HTML formatting
     */
    def buildEmailBody(message, testResults) {
        return """
<!DOCTYPE html>
<html>
<head>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .header { background-color: #f4f4f4; padding: 10px; border-radius: 5px; }
        .content { margin: 20px 0; }
        .test-results { background-color: #f9f9f9; padding: 15px; border-radius: 5px; }
        .success { color: #28a745; }
        .failure { color: #dc3545; }
        .warning { color: #ffc107; }
        table { border-collapse: collapse; width: 100%; }
        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
        th { background-color: #f2f2f2; }
    </style>
</head>
<body>
    <div class="header">
        <h2>Playwright Test Results</h2>
        <p><strong>Job:</strong> ${script.env.JOB_NAME}</p>
        <p><strong>Build:</strong> #${script.env.BUILD_NUMBER}</p>
        <p><strong>Status:</strong> <span class="${script.currentBuild.result?.toLowerCase()}">${script.currentBuild.result}</span></p>
    </div>
    
    <div class="content">
        <pre>${message}</pre>
    </div>
    
    ${testResults ? buildTestResultsTable(testResults) : ''}
    
    <div class="content">
        <p><a href="${script.env.BUILD_URL}">View Full Build Details</a></p>
        <p><a href="${script.env.BUILD_URL}allure">View Allure Report</a></p>
        <p><a href="${script.env.BUILD_URL}Playwright_Test_Report">View Playwright Report</a></p>
    </div>
</body>
</html>
        """.stripIndent()
    }
    
    /**
     * Build test results table for email
     */
    def buildTestResultsTable(testResults) {
        if (!testResults) return ''
        
        return """
    <div class="test-results">
        <h3>Test Summary</h3>
        <table>
            <tr><th>Metric</th><th>Count</th></tr>
            <tr><td>Total Tests</td><td>${testResults.total ?: 0}</td></tr>
            <tr><td>Passed</td><td class="success">${testResults.passed ?: 0}</td></tr>
            <tr><td>Failed</td><td class="failure">${testResults.failed ?: 0}</td></tr>
            <tr><td>Skipped</td><td class="warning">${testResults.skipped ?: 0}</td></tr>
        </table>
    </div>
        """.stripIndent()
    }
    
    /**
     * Build Teams facts array
     */
    def buildTeamsFacts(testResults) {
        def facts = [
            ['name': 'Duration', 'value': script.currentBuild.durationString],
            ['name': 'Branch', 'value': script.env.BRANCH_NAME ?: 'main']
        ]
        
        if (testResults) {
            facts.addAll([
                ['name': 'Total Tests', 'value': testResults.total?.toString() ?: '0'],
                ['name': 'Passed', 'value': testResults.passed?.toString() ?: '0'],
                ['name': 'Failed', 'value': testResults.failed?.toString() ?: '0']
            ])
        }
        
        return facts
    }
    
    /**
     * Get status color for notifications
     */
    def getStatusColor(buildStatus) {
        switch (buildStatus) {
            case 'SUCCESS':
                return '#28a745'
            case 'FAILURE':
                return '#dc3545'
            case 'UNSTABLE':
                return '#ffc107'
            case 'ABORTED':
                return '#6c757d'
            default:
                return '#17a2b8'
        }
    }
    
    /**
     * Parse test results from various sources
     */
    def parseTestResults() {
        def results = [:]
        
        try {
            // Parse JUnit results
            if (script.fileExists('test-results/junit-results.xml')) {
                def junitResults = script.readFile('test-results/junit-results.xml')
                // Parse XML and extract test counts
                // Implementation depends on XML structure
            }
            
            // Parse Playwright JSON results
            if (script.fileExists('test-results/results.json')) {
                def jsonResults = script.readJSON(file: 'test-results/results.json')
                results.total = jsonResults.stats?.total ?: 0
                results.passed = jsonResults.stats?.passed ?: 0
                results.failed = jsonResults.stats?.failed ?: 0
                results.skipped = jsonResults.stats?.skipped ?: 0
                results.failedTests = jsonResults.failures?.collect { it.title } ?: []
            }
            
        } catch (Exception e) {
            script.echo "Error parsing test results: ${e.message}"
            results = [total: 0, passed: 0, failed: 0, skipped: 0, failedTests: []]
        }
        
        return results
    }
}

// Usage example in Jenkinsfile:
// def notificationSystem = new NotificationSystem(this, [
//     slackChannel: '#playwright-tests',
//     emailRecipients: 'team@company.com',
//     includeTestDetails: true
// ])
// 
// def testResults = notificationSystem.parseTestResults()
// notificationSystem.publishAndNotify(testResults)

return this