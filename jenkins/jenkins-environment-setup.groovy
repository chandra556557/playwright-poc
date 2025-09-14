// Jenkins Environment Setup Script
// This script configures Jenkins for Playwright CI/CD integration

import jenkins.model.*
import hudson.model.*
import hudson.plugins.git.*
import org.jenkinsci.plugins.workflow.job.*
import org.jenkinsci.plugins.workflow.cps.*
import hudson.triggers.*
import hudson.plugins.timestamper.*
import hudson.plugins.ws_cleanup.*
import org.jenkinsci.plugins.docker.workflow.*

// Jenkins instance
def jenkins = Jenkins.getInstance()

// Global configuration
def configureGlobalSettings() {
    println "Configuring global Jenkins settings..."
    
    // Set global properties
    def globalProps = jenkins.getGlobalNodeProperties()
    def envVarsProps = globalProps.get(EnvironmentVariablesNodeProperty.class)
    
    if (envVarsProps == null) {
        envVarsProps = new EnvironmentVariablesNodeProperty()
        globalProps.add(envVarsProps)
    }
    
    // Add global environment variables
    def envVars = envVarsProps.getEnvVars()
    envVars.put("PLAYWRIGHT_BROWSERS_PATH", "/ms-playwright")
    envVars.put("NODE_ENV", "test")
    envVars.put("CI", "true")
    envVars.put("FORCE_COLOR", "1")
    
    jenkins.save()
    println "Global settings configured successfully"
}

// Configure Docker settings
def configureDockerSettings() {
    println "Configuring Docker settings..."
    
    // Docker configuration would go here
    // This is typically done through the Jenkins UI or system configuration
    
    println "Docker settings configured"
}

// Create folder structure
def createFolderStructure() {
    println "Creating folder structure..."
    
    def folders = [
        "Playwright-Tests",
        "Playwright-Tests/Smoke-Tests",
        "Playwright-Tests/Regression-Tests",
        "Playwright-Tests/AI-Enhanced-Tests",
        "Playwright-Tests/Performance-Tests"
    ]
    
    folders.each { folderPath ->
        def folder = jenkins.getItemByFullName(folderPath)
        if (folder == null) {
            def parts = folderPath.split('/')
            def parent = jenkins
            
            parts.each { part ->
                def existing = parent.getItem(part)
                if (existing == null) {
                    def newFolder = parent.createProject(com.cloudbees.hudson.plugins.folder.Folder.class, part)
                    newFolder.setDescription("Folder for ${part} related jobs")
                    parent = newFolder
                } else {
                    parent = existing
                }
            }
            println "Created folder: ${folderPath}"
        } else {
            println "Folder already exists: ${folderPath}"
        }
    }
}

// Create Playwright jobs
def createPlaywrightJobs() {
    println "Creating Playwright jobs..."
    
    // Job configurations
    def jobs = [
        [
            name: "Playwright-Smoke-Tests",
            folder: "Playwright-Tests/Smoke-Tests",
            description: "Quick smoke tests for critical functionality",
            schedule: "H/15 * * * *",
            script: readJobScript("smoke-tests")
        ],
        [
            name: "Playwright-Regression-Tests",
            folder: "Playwright-Tests/Regression-Tests",
            description: "Comprehensive regression test suite",
            schedule: "H 2 * * *",
            script: readJobScript("regression-tests")
        ],
        [
            name: "Playwright-AI-Enhanced-Tests",
            folder: "Playwright-Tests/AI-Enhanced-Tests",
            description: "AI-enhanced tests with healing strategies",
            schedule: "H 4 * * *",
            script: readJobScript("ai-enhanced-tests")
        ]
    ]
    
    jobs.each { jobConfig ->
        createJob(jobConfig)
    }
}

// Create individual job
def createJob(config) {
    def folder = jenkins.getItemByFullName(config.folder)
    if (folder == null) {
        println "Folder not found: ${config.folder}"
        return
    }
    
    def existingJob = folder.getItem(config.name)
    if (existingJob != null) {
        println "Job already exists: ${config.folder}/${config.name}"
        return
    }
    
    def job = folder.createProject(WorkflowJob.class, config.name)
    job.setDescription(config.description)
    
    // Set pipeline script
    def definition = new CpsFlowDefinition(config.script, true)
    job.setDefinition(definition)
    
    // Add build triggers
    if (config.schedule) {
        def triggers = job.getTriggers()
        triggers.put(TimerTrigger.DESCRIPTOR, new TimerTrigger(config.schedule))
        job.save()
    }
    
    // Configure build retention
    def logRotator = new LogRotator(-1, 30, -1, 10)
    job.setBuildDiscarder(logRotator)
    
    job.save()
    println "Created job: ${config.folder}/${config.name}"
}

// Read job script templates
def readJobScript(type) {
    switch(type) {
        case "smoke-tests":
            return '''
pipeline {
    agent {
        docker {
            image 'mcr.microsoft.com/playwright:v1.40.0-jammy'
            args '--user root --privileged'
        }
    }
    
    environment {
        NODE_ENV = 'test'
        CI = 'true'
        TEST_SUITE = 'smoke'
    }
    
    stages {
        stage('Checkout') {
            steps {
                checkout scm
            }
        }
        
        stage('Setup') {
            steps {
                sh 'npm ci'
                sh 'npx playwright install --with-deps chromium'
            }
        }
        
        stage('Smoke Tests') {
            steps {
                sh 'npx playwright test --grep "@smoke" --project=chromium --reporter=html,junit,allure-playwright'
            }
        }
    }
    
    post {
        always {
            publishTestResults testResultsPattern: 'test-results/junit.xml'
            publishHTML([
                allowMissing: false,
                alwaysLinkToLastBuild: true,
                keepAll: true,
                reportDir: 'playwright-report',
                reportFiles: 'index.html',
                reportName: 'Smoke Test Report'
            ])
            cleanWs()
        }
    }
}
'''
        
        case "regression-tests":
            return '''
pipeline {
    agent {
        docker {
            image 'mcr.microsoft.com/playwright:v1.40.0-jammy'
            args '--user root --privileged'
        }
    }
    
    parameters {
        choice(name: 'BROWSER', choices: ['all', 'chromium', 'firefox', 'webkit'], description: 'Browser selection')
        choice(name: 'ENVIRONMENT', choices: ['staging', 'production'], description: 'Test environment')
    }
    
    environment {
        NODE_ENV = 'test'
        CI = 'true'
        TEST_SUITE = 'regression'
    }
    
    stages {
        stage('Checkout') {
            steps {
                checkout scm
            }
        }
        
        stage('Setup') {
            steps {
                sh 'npm ci'
                sh 'npx playwright install --with-deps'
            }
        }
        
        stage('Regression Tests') {
            steps {
                script {
                    if (params.BROWSER == 'all') {
                        sh 'npx playwright test --grep "@regression" --reporter=html,junit,allure-playwright'
                    } else {
                        sh "npx playwright test --grep '@regression' --project=${params.BROWSER} --reporter=html,junit,allure-playwright"
                    }
                }
            }
        }
    }
    
    post {
        always {
            publishTestResults testResultsPattern: 'test-results/junit.xml'
            publishHTML([
                allowMissing: false,
                alwaysLinkToLastBuild: true,
                keepAll: true,
                reportDir: 'allure-report',
                reportFiles: 'index.html',
                reportName: 'Allure Report'
            ])
            cleanWs()
        }
    }
}
'''
        
        case "ai-enhanced-tests":
            return '''
pipeline {
    agent {
        docker {
            image 'mcr.microsoft.com/playwright:v1.40.0-jammy'
            args '--user root --privileged'
        }
    }
    
    environment {
        NODE_ENV = 'test'
        CI = 'true'
        TEST_SUITE = 'ai-enhanced'
    }
    
    stages {
        stage('Checkout') {
            steps {
                checkout scm
            }
        }
        
        stage('Setup') {
            steps {
                sh 'npm ci'
                sh 'npx playwright install --with-deps'
            }
        }
        
        stage('AI Enhanced Tests') {
            parallel {
                stage('Healing Strategy Tests') {
                    steps {
                        sh 'npx playwright test healing-metrics-tracker.spec.js --reporter=html,junit,allure-playwright'
                    }
                }
                stage('AI Enhanced Tests') {
                    steps {
                        sh 'npx playwright test blazemeter-ai-enhanced-simple.spec.js --reporter=html,junit,allure-playwright'
                    }
                }
            }
        }
    }
    
    post {
        always {
            publishTestResults testResultsPattern: 'test-results/junit.xml'
            publishHTML([
                allowMissing: false,
                alwaysLinkToLastBuild: true,
                keepAll: true,
                reportDir: 'allure-report',
                reportFiles: 'index.html',
                reportName: 'AI Enhanced Test Report'
            ])
            cleanWs()
        }
    }
}
'''
        
        default:
            return "echo 'No script defined for ${type}'"
    }
}

// Configure global tools
def configureGlobalTools() {
    println "Configuring global tools..."
    
    // Node.js configuration
    def nodeInstallations = jenkins.getDescriptor("hudson.plugins.nodejs.tools.NodeJSInstallation")
    if (nodeInstallations) {
        def installations = nodeInstallations.getInstallations()
        def nodeExists = installations.find { it.name == "NodeJS-18" }
        
        if (!nodeExists) {
            def newInstallations = installations + new hudson.plugins.nodejs.tools.NodeJSInstallation(
                "NodeJS-18",
                null,
                [new hudson.plugins.nodejs.tools.NodeJSInstaller("18.17.0")]
            )
            nodeInstallations.setInstallations(newInstallations as hudson.plugins.nodejs.tools.NodeJSInstallation[])
            nodeInstallations.save()
            println "Added NodeJS-18 installation"
        }
    }
    
    println "Global tools configured"
}

// Setup credentials
def setupCredentials() {
    println "Setting up credentials..."
    
    def credentialsStore = jenkins.getExtensionList('com.cloudbees.plugins.credentials.SystemCredentialsProvider')[0].getStore()
    
    // Example: Add GitHub credentials (replace with actual values)
    def githubCredentials = new com.cloudbees.plugins.credentials.impl.UsernamePasswordCredentialsImpl(
        com.cloudbees.plugins.credentials.CredentialsScope.GLOBAL,
        "github-credentials",
        "GitHub Credentials for Playwright Tests",
        "your-github-username",
        "your-github-token"
    )
    
    // Check if credentials already exist
    def existingCreds = credentialsStore.getCredentials(com.cloudbees.plugins.credentials.common.StandardCredentials.class)
    def credExists = existingCreds.find { it.id == "github-credentials" }
    
    if (!credExists) {
        credentialsStore.addCredentials(com.cloudbees.plugins.credentials.domains.Domain.global(), githubCredentials)
        println "Added GitHub credentials"
    } else {
        println "GitHub credentials already exist"
    }
    
    println "Credentials setup completed"
}

// Configure system settings
def configureSystemSettings() {
    println "Configuring system settings..."
    
    // Configure Jenkins URL
    def jlc = JenkinsLocationConfiguration.get()
    if (jlc.getUrl() == null) {
        jlc.setUrl("http://localhost:8080/")
        jlc.save()
        println "Set Jenkins URL"
    }
    
    // Configure admin email
    if (jlc.getAdminAddress() == null) {
        jlc.setAdminAddress("admin@example.com")
        jlc.save()
        println "Set admin email"
    }
    
    println "System settings configured"
}

// Main execution
def main() {
    println "Starting Jenkins environment setup for Playwright CI/CD..."
    
    try {
        configureGlobalSettings()
        configureDockerSettings()
        configureGlobalTools()
        setupCredentials()
        configureSystemSettings()
        createFolderStructure()
        createPlaywrightJobs()
        
        println "Jenkins environment setup completed successfully!"
        println ""
        println "Next steps:"
        println "1. Configure Docker in Jenkins (Manage Jenkins > Configure System > Docker)"
        println "2. Install required plugins: Docker Pipeline, Allure, HTML Publisher"
        println "3. Update credentials with actual values"
        println "4. Configure Slack/Email notifications"
        println "5. Set up webhook triggers for your repository"
        
    } catch (Exception e) {
        println "Error during setup: ${e.message}"
        e.printStackTrace()
    }
}

// Execute main function
main()

return "Jenkins environment setup script completed"