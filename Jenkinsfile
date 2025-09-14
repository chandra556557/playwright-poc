pipeline {
    agent {
        docker {
            image 'mcr.microsoft.com/playwright:v1.40.0-jammy'
            args '--user root --privileged -v /var/run/docker.sock:/var/run/docker.sock'
        }
    }
    
    environment {
        NODE_ENV = 'test'
        CI = 'true'
        PLAYWRIGHT_BROWSERS_PATH = '/ms-playwright'
        ALLURE_RESULTS_PATH = 'allure-results'
        ALLURE_REPORT_PATH = 'allure-report'
    }
    
    parameters {
        choice(
            name: 'TEST_SUITE',
            choices: ['all', 'smoke', 'regression', 'ai-enhanced', 'healing-metrics'],
            description: 'Select test suite to run'
        )
        choice(
            name: 'BROWSER',
            choices: ['chromium', 'firefox', 'webkit', 'all'],
            description: 'Select browser for testing'
        )
        booleanParam(
            name: 'HEADLESS',
            defaultValue: true,
            description: 'Run tests in headless mode'
        )
        string(
            name: 'BASE_URL',
            defaultValue: 'http://localhost:3000',
            description: 'Base URL for testing'
        )
    }
    
    stages {
        stage('Checkout') {
            steps {
                checkout scm
                script {
                    env.BUILD_TIMESTAMP = sh(returnStdout: true, script: 'date +"%Y%m%d_%H%M%S"').trim()
                }
            }
        }
        
        stage('Setup Environment') {
            steps {
                sh '''
                    echo "Setting up Node.js environment..."
                    node --version
                    npm --version
                    
                    echo "Installing dependencies..."
                    npm ci
                    
                    echo "Installing Playwright browsers..."
                    npx playwright install --with-deps
                    
                    echo "Verifying Playwright installation..."
                    npx playwright --version
                '''
            }
        }
        
        stage('Lint & Type Check') {
            parallel {
                stage('ESLint') {
                    steps {
                        sh 'npm run lint || true'
                    }
                }
                stage('TypeScript Check') {
                    steps {
                        sh 'npx tsc --noEmit || true'
                    }
                }
            }
        }
        
        stage('Start Application') {
            when {
                expression { params.BASE_URL.contains('localhost') }
            }
            steps {
                script {
                    sh '''
                        echo "Starting application server..."
                        npm run build
                        nohup npm run start > app.log 2>&1 &
                        echo $! > app.pid
                        
                        echo "Waiting for application to be ready..."
                        timeout 60 bash -c 'until curl -f http://localhost:3000/health || curl -f http://localhost:3000; do sleep 2; done'
                    '''
                }
            }
        }
        
        stage('Run Playwright Tests') {
            steps {
                script {
                    def testCommand = buildTestCommand()
                    sh """${testCommand}"""
                }
            }
            post {
                always {
                    // Capture screenshots and videos on failure
                    archiveArtifacts artifacts: 'test-results/**/*', allowEmptyArchive: true
                    archiveArtifacts artifacts: 'playwright-report/**/*', allowEmptyArchive: true
                }
            }
        }
        
        stage('Generate Test Reports') {
            parallel {
                stage('Allure Report') {
                    steps {
                        sh '''
                            echo "Generating Allure report..."
                            npm run allure:generate || true
                            
                            if [ -d "allure-report" ]; then
                                echo "Allure report generated successfully"
                                ls -la allure-report/
                            else
                                echo "Allure report generation failed"
                            fi
                        '''
                        
                        publishHTML([
                            allowMissing: false,
                            alwaysLinkToLastBuild: true,
                            keepAll: true,
                            reportDir: 'allure-report',
                            reportFiles: 'index.html',
                            reportName: 'Allure Test Report',
                            reportTitles: 'Playwright Test Results'
                        ])
                    }
                }
                
                stage('Playwright HTML Report') {
                    steps {
                        publishHTML([
                            allowMissing: true,
                            alwaysLinkToLastBuild: true,
                            keepAll: true,
                            reportDir: 'playwright-report',
                            reportFiles: 'index.html',
                            reportName: 'Playwright HTML Report',
                            reportTitles: 'Playwright Test Results'
                        ])
                    }
                }
            }
        }
        
        stage('Publish Test Results') {
            steps {
                // Publish JUnit test results
                publishTestResults testResultsPattern: 'test-results/junit.xml'
                
                // Archive test artifacts
                archiveArtifacts artifacts: 'allure-results/**/*', allowEmptyArchive: true
                
                script {
                    // Generate test summary
                    def testSummary = generateTestSummary()
                    currentBuild.description = testSummary
                }
            }
        }
    }
    
    post {
        always {
            script {
                // Stop application if it was started
                sh '''
                    if [ -f app.pid ]; then
                        echo "Stopping application..."
                        kill $(cat app.pid) || true
                        rm -f app.pid
                    fi
                '''
            }
            
            // Clean up workspace
            cleanWs()
        }
        
        success {
            script {
                sendNotification('SUCCESS')
            }
        }
        
        failure {
            script {
                sendNotification('FAILURE')
            }
        }
        
        unstable {
            script {
                sendNotification('UNSTABLE')
            }
        }
    }
}

def buildTestCommand() {
    def command = 'npx playwright test'
    
    // Add browser selection
    if (params.BROWSER != 'all') {
        command += " --project=${params.BROWSER}"
    }
    
    // Add test suite selection
    switch(params.TEST_SUITE) {
        case 'smoke':
            command += ' --grep "@smoke"'
            break
        case 'regression':
            command += ' --grep "@regression"'
            break
        case 'ai-enhanced':
            command += ' blazemeter-ai-enhanced-simple.spec.js'
            break
        case 'healing-metrics':
            command += ' healing-metrics-tracker.spec.js'
            break
        default:
            // Run all tests
            break
    }
    
    // Add headless mode
    if (params.HEADLESS) {
        command += ' --headed=false'
    } else {
        command += ' --headed=true'
    }
    
    // Add reporters
    command += ' --reporter=html,junit,allure-playwright'
    
    // Add base URL
    command += " --config playwright.config.js"
    
    return command
}

def generateTestSummary() {
    try {
        def junitResults = readFile('test-results/junit.xml')
        def testCount = (junitResults =~ /tests="(\d+)"/)[0][1]
        def failureCount = (junitResults =~ /failures="(\d+)"/)[0][1]
        def errorCount = (junitResults =~ /errors="(\d+)"/)[0][1]
        def passCount = testCount.toInteger() - failureCount.toInteger() - errorCount.toInteger()
        
        return "Tests: ${testCount} | Passed: ${passCount} | Failed: ${failureCount} | Errors: ${errorCount}"
    } catch (Exception e) {
        return "Test results summary not available"
    }
}

def sendNotification(String status) {
    def color = status == 'SUCCESS' ? 'good' : (status == 'UNSTABLE' ? 'warning' : 'danger')
    def message = """
        *Playwright Test Pipeline ${status}*
        
        *Job:* ${env.JOB_NAME}
        *Build:* ${env.BUILD_NUMBER}
        *Branch:* ${env.BRANCH_NAME ?: 'main'}
        *Test Suite:* ${params.TEST_SUITE}
        *Browser:* ${params.BROWSER}
        *Duration:* ${currentBuild.durationString}
        
        *Build URL:* ${env.BUILD_URL}
        *Test Report:* ${env.BUILD_URL}Allure_Test_Report/
    """.stripIndent()
    
    // Slack notification (if configured)
    try {
        slackSend(
            channel: '#qa-automation',
            color: color,
            message: message,
            teamDomain: 'your-team',
            token: 'your-slack-token'
        )
    } catch (Exception e) {
        echo "Slack notification failed: ${e.message}"
    }
    
    // Email notification
    try {
        emailext(
            subject: "Playwright Tests ${status} - ${env.JOB_NAME} #${env.BUILD_NUMBER}",
            body: message,
            to: '${DEFAULT_RECIPIENTS}',
            attachLog: status != 'SUCCESS'
        )
    } catch (Exception e) {
        echo "Email notification failed: ${e.message}"
    }
}