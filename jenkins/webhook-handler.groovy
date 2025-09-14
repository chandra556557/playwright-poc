/**
 * Jenkins Webhook Handler for Playwright Test Integration
 * Handles incoming webhooks and triggers appropriate test jobs
 */

@Library('jenkins-shared-library') _

class WebhookHandler {
    def script
    def config
    
    WebhookHandler(script, config = [:]) {
        this.script = script
        this.config = [
            allowedSources: config.allowedSources ?: ['github', 'gitlab', 'bitbucket'],
            testJobMapping: config.testJobMapping ?: [:],
            defaultTestJob: config.defaultTestJob ?: 'playwright-smoke-tests',
            enableAutoTrigger: config.enableAutoTrigger ?: true,
            branchFilters: config.branchFilters ?: ['main', 'develop', 'release/*']
        ]
    }
    
    /**
     * Main webhook processing method
     */
    def processWebhook(webhookData) {
        try {
            script.echo "Processing webhook from ${webhookData.source}"
            
            // Validate webhook source
            if (!isValidSource(webhookData.source)) {
                script.echo "Webhook source '${webhookData.source}' not allowed"
                return false
            }
            
            // Parse webhook payload
            def parsedData = parseWebhookPayload(webhookData)
            
            // Determine if tests should be triggered
            if (shouldTriggerTests(parsedData)) {
                triggerTestJobs(parsedData)
                return true
            } else {
                script.echo "Tests not triggered based on webhook criteria"
                return false
            }
            
        } catch (Exception e) {
            script.echo "Error processing webhook: ${e.message}"
            return false
        }
    }
    
    /**
     * Validate webhook source
     */
    def isValidSource(source) {
        return config.allowedSources.contains(source?.toLowerCase())
    }
    
    /**
     * Parse webhook payload based on source
     */
    def parseWebhookPayload(webhookData) {
        def parsedData = [:]
        
        switch (webhookData.source?.toLowerCase()) {
            case 'github':
                parsedData = parseGitHubWebhook(webhookData.payload)
                break
            case 'gitlab':
                parsedData = parseGitLabWebhook(webhookData.payload)
                break
            case 'bitbucket':
                parsedData = parseBitbucketWebhook(webhookData.payload)
                break
            default:
                parsedData = parseGenericWebhook(webhookData.payload)
        }
        
        return parsedData
    }
    
    /**
     * Parse GitHub webhook payload
     */
    def parseGitHubWebhook(payload) {
        return [
            eventType: payload.action ?: 'unknown',
            repository: payload.repository?.name,
            branch: payload.ref?.replaceAll('refs/heads/', ''),
            commit: payload.head_commit?.id,
            author: payload.head_commit?.author?.name,
            message: payload.head_commit?.message,
            pullRequest: payload.pull_request ? [
                number: payload.pull_request.number,
                title: payload.pull_request.title,
                sourceBranch: payload.pull_request.head?.ref,
                targetBranch: payload.pull_request.base?.ref
            ] : null,
            changedFiles: payload.head_commit?.modified ?: []
        ]
    }
    
    /**
     * Parse GitLab webhook payload
     */
    def parseGitLabWebhook(payload) {
        return [
            eventType: payload.object_kind ?: 'unknown',
            repository: payload.project?.name,
            branch: payload.ref?.replaceAll('refs/heads/', ''),
            commit: payload.checkout_sha ?: payload.after,
            author: payload.user_name,
            message: payload.commits?.first()?.message,
            pullRequest: payload.object_kind == 'merge_request' ? [
                number: payload.object_attributes?.iid,
                title: payload.object_attributes?.title,
                sourceBranch: payload.object_attributes?.source_branch,
                targetBranch: payload.object_attributes?.target_branch
            ] : null,
            changedFiles: payload.commits?.collectMany { it.modified ?: [] } ?: []
        ]
    }
    
    /**
     * Parse Bitbucket webhook payload
     */
    def parseBitbucketWebhook(payload) {
        return [
            eventType: payload.eventKey ?: 'unknown',
            repository: payload.repository?.name,
            branch: payload.changes?.first()?.ref?.displayId,
            commit: payload.changes?.first()?.toHash,
            author: payload.actor?.displayName,
            message: payload.changes?.first()?.commits?.first()?.message,
            pullRequest: payload.pullRequest ? [
                number: payload.pullRequest.id,
                title: payload.pullRequest.title,
                sourceBranch: payload.pullRequest.fromRef?.displayId,
                targetBranch: payload.pullRequest.toRef?.displayId
            ] : null,
            changedFiles: []
        ]
    }
    
    /**
     * Parse generic webhook payload
     */
    def parseGenericWebhook(payload) {
        return [
            eventType: payload.event_type ?: 'unknown',
            repository: payload.repository,
            branch: payload.branch,
            commit: payload.commit,
            author: payload.author,
            message: payload.message,
            pullRequest: null,
            changedFiles: payload.changed_files ?: []
        ]
    }
    
    /**
     * Determine if tests should be triggered
     */
    def shouldTriggerTests(parsedData) {
        // Check if auto-trigger is enabled
        if (!config.enableAutoTrigger) {
            script.echo "Auto-trigger is disabled"
            return false
        }
        
        // Check branch filters
        if (!matchesBranchFilter(parsedData.branch)) {
            script.echo "Branch '${parsedData.branch}' does not match filters"
            return false
        }
        
        // Check event type
        def triggerEvents = ['push', 'pull_request', 'merge_request']
        if (!triggerEvents.contains(parsedData.eventType)) {
            script.echo "Event type '${parsedData.eventType}' does not trigger tests"
            return false
        }
        
        // Check if test-related files were changed
        if (parsedData.changedFiles && !hasTestRelevantChanges(parsedData.changedFiles)) {
            script.echo "No test-relevant files were changed"
            return false
        }
        
        return true
    }
    
    /**
     * Check if branch matches filters
     */
    def matchesBranchFilter(branch) {
        if (!branch) return false
        
        return config.branchFilters.any { filter ->
            if (filter.endsWith('*')) {
                return branch.startsWith(filter.replaceAll('\\*', ''))
            } else {
                return branch == filter
            }
        }
    }
    
    /**
     * Check if changed files are test-relevant
     */
    def hasTestRelevantChanges(changedFiles) {
        def testRelevantPatterns = [
            '.*\\.(js|ts|jsx|tsx)$',
            '.*\\.(spec|test)\\.(js|ts)$',
            'playwright\\.config\\.(js|ts)$',
            'package\\.json$',
            'Dockerfile.*',
            'docker-compose.*\\.yml$'
        ]
        
        return changedFiles.any { file ->
            testRelevantPatterns.any { pattern ->
                file.matches(pattern)
            }
        }
    }
    
    /**
     * Trigger appropriate test jobs
     */
    def triggerTestJobs(parsedData) {
        def jobsToTrigger = determineTestJobs(parsedData)
        
        jobsToTrigger.each { jobConfig ->
            script.echo "Triggering job: ${jobConfig.name}"
            
            try {
                script.build(
                    job: jobConfig.name,
                    parameters: buildJobParameters(parsedData, jobConfig),
                    wait: false,
                    propagate: false
                )
                
                script.echo "Successfully triggered ${jobConfig.name}"
            } catch (Exception e) {
                script.echo "Failed to trigger ${jobConfig.name}: ${e.message}"
            }
        }
    }
    
    /**
     * Determine which test jobs to trigger
     */
    def determineTestJobs(parsedData) {
        def jobs = []
        
        // Determine job based on branch and event type
        if (parsedData.branch == 'main' || parsedData.branch == 'master') {
            jobs.add([
                name: 'playwright-regression-tests',
                priority: 'high',
                browser: 'chromium',
                environment: 'production'
            ])
        } else if (parsedData.pullRequest) {
            jobs.add([
                name: 'playwright-smoke-tests',
                priority: 'medium',
                browser: 'chromium',
                environment: 'staging'
            ])
        } else {
            jobs.add([
                name: config.defaultTestJob,
                priority: 'low',
                browser: 'chromium',
                environment: 'development'
            ])
        }
        
        // Add cross-browser tests for important branches
        if (parsedData.branch in ['main', 'master', 'release']) {
            ['firefox', 'webkit'].each { browser ->
                jobs.add([
                    name: 'playwright-cross-browser-tests',
                    priority: 'medium',
                    browser: browser,
                    environment: 'staging'
                ])
            }
        }
        
        return jobs
    }
    
    /**
     * Build job parameters
     */
    def buildJobParameters(parsedData, jobConfig) {
        def parameters = []
        
        // Standard parameters
        parameters.add(script.string(name: 'BRANCH_NAME', value: parsedData.branch ?: 'main'))
        parameters.add(script.string(name: 'COMMIT_SHA', value: parsedData.commit ?: ''))
        parameters.add(script.string(name: 'BROWSER', value: jobConfig.browser ?: 'chromium'))
        parameters.add(script.string(name: 'TEST_ENVIRONMENT', value: jobConfig.environment ?: 'development'))
        parameters.add(script.booleanParam(name: 'HEADLESS', value: true))
        
        // Pull request specific parameters
        if (parsedData.pullRequest) {
            parameters.add(script.string(name: 'PR_NUMBER', value: parsedData.pullRequest.number?.toString() ?: ''))
            parameters.add(script.string(name: 'PR_TITLE', value: parsedData.pullRequest.title ?: ''))
            parameters.add(script.string(name: 'SOURCE_BRANCH', value: parsedData.pullRequest.sourceBranch ?: ''))
            parameters.add(script.string(name: 'TARGET_BRANCH', value: parsedData.pullRequest.targetBranch ?: ''))
        }
        
        // Repository information
        parameters.add(script.string(name: 'REPOSITORY', value: parsedData.repository ?: ''))
        parameters.add(script.string(name: 'AUTHOR', value: parsedData.author ?: ''))
        
        // Webhook metadata
        parameters.add(script.string(name: 'TRIGGER_SOURCE', value: 'webhook'))
        parameters.add(script.string(name: 'EVENT_TYPE', value: parsedData.eventType ?: ''))
        
        return parameters
    }
    
    /**
     * Send webhook response
     */
    def sendWebhookResponse(success, message = '') {
        def response = [
            success: success,
            message: message,
            timestamp: new Date().format('yyyy-MM-dd HH:mm:ss'),
            jenkins_url: script.env.JENKINS_URL
        ]
        
        script.echo "Webhook response: ${script.writeJSON(returnText: true, json: response)}"
        return response
    }
    
    /**
     * Log webhook activity
     */
    def logWebhookActivity(parsedData, triggered) {
        def logEntry = [
            timestamp: new Date().format('yyyy-MM-dd HH:mm:ss'),
            repository: parsedData.repository,
            branch: parsedData.branch,
            commit: parsedData.commit,
            author: parsedData.author,
            event_type: parsedData.eventType,
            triggered: triggered,
            build_number: script.env.BUILD_NUMBER
        ]
        
        // Write to webhook activity log
        def logFile = 'webhook-activity.log'
        def logLine = script.writeJSON(returnText: true, json: logEntry)
        
        try {
            script.writeFile(file: logFile, text: "${logLine}\n", append: true)
        } catch (Exception e) {
            script.echo "Failed to write webhook log: ${e.message}"
        }
    }
}

// Usage example in Jenkins pipeline:
// def webhookHandler = new WebhookHandler(this, [
//     allowedSources: ['github', 'gitlab'],
//     defaultTestJob: 'playwright-smoke-tests',
//     branchFilters: ['main', 'develop', 'feature/*']
// ])
// 
// def webhookData = [
//     source: 'github',
//     payload: readJSON(text: env.WEBHOOK_PAYLOAD)
// ]
// 
// def success = webhookHandler.processWebhook(webhookData)
// webhookHandler.sendWebhookResponse(success)

return this