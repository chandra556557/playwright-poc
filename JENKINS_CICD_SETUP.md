# Jenkins CI/CD Integration for Playwright Tests

This documentation provides a comprehensive guide for setting up and using Jenkins CI/CD integration with Playwright tests.

## 📋 Table of Contents

- [Overview](#overview)
- [Prerequisites](#prerequisites)
- [Installation & Setup](#installation--setup)
- [Configuration](#configuration)
- [Usage](#usage)
- [Monitoring & Reporting](#monitoring--reporting)
- [Troubleshooting](#troubleshooting)
- [Best Practices](#best-practices)

## 🎯 Overview

This CI/CD integration provides:

- **Automated Test Execution**: Trigger Playwright tests on code changes
- **Multi-Browser Testing**: Support for Chromium, Firefox, and WebKit
- **Containerized Execution**: Docker-based test environment
- **Comprehensive Reporting**: Allure reports, HTML reports, and custom dashboards
- **Notification System**: Slack, email, and Teams notifications
- **Webhook Integration**: GitHub, GitLab, and Bitbucket webhook support
- **Test Metrics Dashboard**: Real-time test metrics and trends

## 🔧 Prerequisites

### Jenkins Requirements

- Jenkins 2.400+ with Blue Ocean plugin
- Docker plugin for Jenkins
- Pipeline plugin
- Allure Jenkins plugin
- HTML Publisher plugin
- Slack Notification plugin (optional)
- Email Extension plugin (optional)

### System Requirements

- Docker 20.10+
- Node.js 18+
- Git
- At least 4GB RAM for test execution
- 10GB+ disk space for artifacts

### Required Jenkins Plugins

```bash
# Install required plugins
jenkins-plugin-cli --plugins \
  workflow-aggregator \
  docker-workflow \
  allure-jenkins-plugin \
  htmlpublisher \
  slack \
  email-ext \
  build-timeout \
  timestamper
```

## 🚀 Installation & Setup

### Step 1: Clone Repository

```bash
git clone <your-repository-url>
cd <your-project>
```

### Step 2: Jenkins Environment Setup

1. **Run the Jenkins setup script**:
   ```groovy
   // Execute jenkins/jenkins-environment-setup.groovy in Jenkins Script Console
   load 'jenkins/jenkins-environment-setup.groovy'
   ```

2. **Configure Global Environment Variables**:
   - Go to `Manage Jenkins` → `Configure System` → `Global Properties`
   - Add the following environment variables:

   ```
   PLAYWRIGHT_BROWSERS_PATH=/ms-playwright
   NODE_ENV=test
   ALLURE_RESULTS_DIR=allure-results
   TEST_RESULTS_DIR=test-results
   ```

### Step 3: Docker Setup

1. **Build the Playwright Docker image**:
   ```bash
   docker build -f Dockerfile.playwright -t playwright-tests:latest .
   ```

2. **Test the Docker setup**:
   ```bash
   docker-compose -f docker-compose.ci.yml up --build
   ```

### Step 4: Create Jenkins Jobs

#### Option A: Using Job Templates (Recommended)

1. **Import job templates**:
   ```bash
   # Copy job templates to Jenkins
   cp jenkins/job-templates/*.xml $JENKINS_HOME/jobs/
   ```

2. **Reload Jenkins configuration**:
   ```bash
   curl -X POST http://jenkins-url/reload
   ```

#### Option B: Manual Job Creation

1. Create a new Pipeline job
2. Configure SCM to point to your repository
3. Set Pipeline script path to `Jenkinsfile`
4. Configure build triggers as needed

## ⚙️ Configuration

### Environment Variables

Configure these environment variables in Jenkins:

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `BROWSER` | Browser to run tests | `chromium` | No |
| `TEST_SUITE` | Test suite to execute | `smoke` | No |
| `HEADLESS` | Run tests in headless mode | `true` | No |
| `BASE_URL` | Application base URL | `http://localhost:3000` | No |
| `PARALLEL_WORKERS` | Number of parallel workers | `2` | No |
| `TEST_TIMEOUT` | Test timeout in milliseconds | `30000` | No |
| `SLACK_CHANNEL` | Slack notification channel | `#playwright-tests` | No |
| `EMAIL_RECIPIENTS` | Email notification recipients | - | No |

### Webhook Configuration

#### GitHub Webhook

1. Go to your GitHub repository → Settings → Webhooks
2. Add webhook URL: `http://your-jenkins-url/github-webhook/`
3. Select events: `Push`, `Pull requests`
4. Content type: `application/json`

#### GitLab Webhook

1. Go to your GitLab project → Settings → Webhooks
2. Add webhook URL: `http://your-jenkins-url/gitlab/build_now`
3. Select triggers: `Push events`, `Merge request events`

### Notification Setup

#### Slack Integration

1. Create a Slack app and get the bot token
2. Add credentials in Jenkins:
   - Go to `Manage Jenkins` → `Manage Credentials`
   - Add `Secret text` with ID `slack-token`
3. Configure in pipeline:
   ```groovy
   environment {
       SLACK_TOKEN = credentials('slack-token')
       SLACK_CHANNEL = '#playwright-tests'
   }
   ```

#### Email Integration

1. Configure SMTP in Jenkins:
   - Go to `Manage Jenkins` → `Configure System` → `Extended E-mail Notification`
   - Set SMTP server, port, and authentication
2. Add email recipients in job configuration

## 🎮 Usage

### Running Tests Manually

#### Via Jenkins UI

1. Navigate to your Jenkins job
2. Click "Build with Parameters"
3. Configure test parameters:
   - Browser: `chromium`, `firefox`, or `webkit`
   - Test Suite: `smoke`, `regression`, or `all`
   - Environment: `development`, `staging`, or `production`
4. Click "Build"

#### Via Jenkins CLI

```bash
# Run smoke tests
java -jar jenkins-cli.jar -s http://jenkins-url build playwright-smoke-tests

# Run regression tests with parameters
java -jar jenkins-cli.jar -s http://jenkins-url build playwright-regression-tests \
  -p BROWSER=firefox \
  -p TEST_ENVIRONMENT=staging
```

### Running Tests via API

```bash
# Trigger build via REST API
curl -X POST "http://jenkins-url/job/playwright-smoke-tests/buildWithParameters" \
  --data "BROWSER=chromium&TEST_SUITE=smoke&HEADLESS=true"
```

### Automated Triggers

#### Git Push Triggers

- **Main/Master Branch**: Triggers full regression tests
- **Feature Branches**: Triggers smoke tests
- **Pull Requests**: Triggers smoke tests with PR context

#### Scheduled Triggers

```groovy
// In Jenkinsfile
triggers {
    // Run regression tests daily at 2 AM
    cron('0 2 * * *')
    
    // Run smoke tests every 4 hours
    cron('0 */4 * * *')
}
```

## 📊 Monitoring & Reporting

### Test Reports

#### Allure Reports

- **URL**: `http://jenkins-url/job/your-job/allure/`
- **Features**: Test results, trends, categories, and detailed test information
- **Retention**: Configurable (default: 30 builds)

#### HTML Reports

- **URL**: `http://jenkins-url/job/your-job/Playwright_Test_Report/`
- **Features**: Playwright native HTML report with traces and screenshots

#### Test Metrics Dashboard

- **URL**: `http://jenkins-url/job/your-job/Test_Metrics_Dashboard/`
- **Features**: 
  - Pass/fail rates
  - Test duration trends
  - Flaky test identification
  - Browser-specific metrics
  - Historical trends

### Monitoring Alerts

Alerts are triggered when:

- **Failure Rate** > 10%
- **Average Test Duration** > 5 minutes
- **Flaky Test Rate** > 5%
- **Build Duration** > 30 minutes

### Artifacts

The following artifacts are archived:

- Test results (JSON, XML)
- Screenshots and videos
- Trace files
- Allure results
- HTML reports
- Test metrics

## 🔍 Troubleshooting

### Common Issues

#### 1. Docker Build Failures

**Problem**: Docker image build fails

**Solution**:
```bash
# Check Docker daemon
sudo systemctl status docker

# Clean Docker cache
docker system prune -a

# Rebuild with no cache
docker build --no-cache -f Dockerfile.playwright -t playwright-tests:latest .
```

#### 2. Browser Installation Issues

**Problem**: Playwright browsers not installed

**Solution**:
```bash
# Install browsers in Docker container
docker run --rm playwright-tests:latest npx playwright install

# Or rebuild Docker image
docker build -f Dockerfile.playwright -t playwright-tests:latest .
```

#### 3. Test Timeouts

**Problem**: Tests timing out frequently

**Solution**:
```groovy
// Increase timeout in Jenkinsfile
options {
    timeout(time: 60, unit: 'MINUTES')
}

// Or in test configuration
test.setTimeout(60000); // 60 seconds
```

#### 4. Memory Issues

**Problem**: Out of memory errors during test execution

**Solution**:
```yaml
# In docker-compose.ci.yml
services:
  playwright-tests:
    mem_limit: 4g
    environment:
      - NODE_OPTIONS=--max-old-space-size=4096
```

#### 5. Webhook Not Triggering

**Problem**: Git webhooks not triggering builds

**Solution**:
1. Check webhook URL is accessible
2. Verify webhook payload format
3. Check Jenkins logs for webhook processing
4. Ensure proper authentication

### Debug Mode

Enable debug mode for troubleshooting:

```groovy
// In Jenkinsfile
environment {
    DEBUG = 'pw:*'
    PLAYWRIGHT_DEBUG = '1'
}
```

### Log Analysis

#### Jenkins Logs

```bash
# View Jenkins system logs
tail -f $JENKINS_HOME/logs/jenkins.log

# View job-specific logs
tail -f $JENKINS_HOME/jobs/your-job/builds/*/log
```

#### Test Logs

```bash
# View test execution logs
cat test-results/test-output.log

# View Playwright debug logs
cat playwright-debug.log
```

## 🏆 Best Practices

### Test Organization

1. **Separate Test Suites**:
   - Smoke tests: Critical user journeys (5-10 tests)
   - Regression tests: Comprehensive test coverage
   - API tests: Backend functionality

2. **Test Categorization**:
   ```javascript
   // Use test tags for categorization
   test.describe('Login @smoke @critical', () => {
     // Critical login tests
   });
   ```

3. **Parallel Execution**:
   ```javascript
   // Configure parallel workers
   export default {
     workers: process.env.CI ? 4 : 2,
     fullyParallel: true
   };
   ```

### CI/CD Pipeline Optimization

1. **Build Caching**:
   ```dockerfile
   # Cache npm dependencies
   COPY package*.json ./
   RUN npm ci --only=production
   ```

2. **Conditional Execution**:
   ```groovy
   // Run tests only if relevant files changed
   when {
       anyOf {
           changeset "src/**"
           changeset "tests/**"
           changeset "playwright.config.*"
       }
   }
   ```

3. **Resource Management**:
   ```groovy
   // Limit concurrent builds
   options {
       disableConcurrentBuilds()
       buildDiscarder(logRotator(numToKeepStr: '10'))
   }
   ```

### Monitoring & Alerting

1. **Set Appropriate Thresholds**:
   - Failure rate: < 5% for critical paths
   - Test duration: < 2 minutes average
   - Flaky test rate: < 3%

2. **Regular Maintenance**:
   - Review flaky tests weekly
   - Update browser versions monthly
   - Clean up old artifacts regularly

3. **Performance Monitoring**:
   - Track test execution trends
   - Monitor resource usage
   - Identify performance bottlenecks

### Security Considerations

1. **Credential Management**:
   ```groovy
   // Use Jenkins credentials
   environment {
       API_KEY = credentials('api-key')
       DB_PASSWORD = credentials('db-password')
   }
   ```

2. **Network Security**:
   - Use HTTPS for webhook URLs
   - Implement proper authentication
   - Restrict Jenkins access

3. **Container Security**:
   - Use official base images
   - Regularly update dependencies
   - Scan images for vulnerabilities

## 📚 Additional Resources

- [Playwright Documentation](https://playwright.dev/)
- [Jenkins Pipeline Documentation](https://www.jenkins.io/doc/book/pipeline/)
- [Docker Best Practices](https://docs.docker.com/develop/dev-best-practices/)
- [Allure Framework](https://docs.qameta.io/allure/)

## 🤝 Support

For issues and questions:

1. Check the troubleshooting section
2. Review Jenkins and test logs
3. Consult team documentation
4. Create an issue in the project repository

---

**Last Updated**: $(date)
**Version**: 1.0.0
**Maintainer**: DevOps Team