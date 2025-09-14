# Jenkins CI/CD Quick Start Guide

🚀 **Get your Playwright tests running in Jenkins in 15 minutes!**

## ⚡ Quick Setup Steps

### 1. Prerequisites Check

```bash
# Verify installations
docker --version          # Should be 20.10+
node --version            # Should be 18+
git --version            # Any recent version
```

### 2. Jenkins Plugin Installation

**Install these plugins in Jenkins:**

- Pipeline
- Docker Pipeline
- Allure Jenkins Plugin
- HTML Publisher
- Slack Notification (optional)
- Email Extension (optional)

**Via Jenkins CLI:**
```bash
jenkins-plugin-cli --plugins workflow-aggregator docker-workflow allure-jenkins-plugin htmlpublisher slack email-ext
```

### 3. Environment Setup

**Add these Global Environment Variables in Jenkins:**

```
PLAYWRIGHT_BROWSERS_PATH=/ms-playwright
NODE_ENV=test
ALLURE_RESULTS_DIR=allure-results
TEST_RESULTS_DIR=test-results
```

**Path:** `Manage Jenkins` → `Configure System` → `Global Properties` → `Environment variables`

### 4. Create Your First Job

#### Option A: Import Job Template (Recommended)

1. **Copy job template:**
   ```bash
   cp jenkins/job-templates/playwright-smoke-tests.xml $JENKINS_HOME/jobs/
   ```

2. **Reload Jenkins:**
   ```bash
   curl -X POST http://your-jenkins-url/reload
   ```

#### Option B: Manual Creation

1. **New Item** → **Pipeline**
2. **Pipeline Definition:** Pipeline script from SCM
3. **SCM:** Git
4. **Repository URL:** Your repo URL
5. **Script Path:** `Jenkinsfile`
6. **Save**

### 5. Test Docker Setup

```bash
# Build the Docker image
docker build -f Dockerfile.playwright -t playwright-tests:latest .

# Test the setup
docker run --rm playwright-tests:latest npm test
```

### 6. Run Your First Build

1. Go to your Jenkins job
2. Click **"Build Now"**
3. Watch the console output
4. Check the generated reports

## 🎯 Essential Commands

### Build Commands

```bash
# Manual build trigger
curl -X POST "http://jenkins-url/job/playwright-smoke-tests/build"

# Build with parameters
curl -X POST "http://jenkins-url/job/playwright-smoke-tests/buildWithParameters" \
  --data "BROWSER=chromium&TEST_SUITE=smoke"
```

### Docker Commands

```bash
# Build image
docker build -f Dockerfile.playwright -t playwright-tests .

# Run tests locally
docker run --rm -v $(pwd):/app playwright-tests npm test

# Run with environment
docker-compose -f docker-compose.ci.yml up
```

### Test Commands

```bash
# Run smoke tests
npm run test:smoke

# Run with specific browser
npm run test -- --project=chromium

# Generate reports
npm run test:report
```

## 🔧 Common Parameters

| Parameter | Values | Default | Description |
|-----------|--------|---------|-------------|
| `BROWSER` | `chromium`, `firefox`, `webkit` | `chromium` | Browser to test |
| `TEST_SUITE` | `smoke`, `regression`, `all` | `smoke` | Test suite |
| `HEADLESS` | `true`, `false` | `true` | Headless mode |
| `PARALLEL_WORKERS` | `1-8` | `2` | Parallel workers |
| `TEST_ENVIRONMENT` | `dev`, `staging`, `prod` | `dev` | Target environment |

## 📊 Quick Access Links

**After your first successful build:**

- **Allure Report:** `http://jenkins-url/job/your-job/allure/`
- **HTML Report:** `http://jenkins-url/job/your-job/Playwright_Test_Report/`
- **Test Metrics:** `http://jenkins-url/job/your-job/Test_Metrics_Dashboard/`
- **Build Console:** `http://jenkins-url/job/your-job/lastBuild/console`

## 🚨 Quick Troubleshooting

### Build Fails Immediately

```bash
# Check Jenkins logs
tail -f $JENKINS_HOME/logs/jenkins.log

# Check job workspace
ls -la $JENKINS_HOME/workspace/your-job/
```

### Docker Issues

```bash
# Clean Docker
docker system prune -a

# Rebuild image
docker build --no-cache -f Dockerfile.playwright -t playwright-tests .
```

### Test Failures

```bash
# Check test output
cat test-results/test-output.log

# View screenshots
ls -la test-results/screenshots/
```

## 🎉 Success Checklist

- [ ] Jenkins job created and configured
- [ ] Docker image builds successfully
- [ ] First test run completes
- [ ] Allure report generates
- [ ] HTML report accessible
- [ ] Artifacts archived properly
- [ ] Notifications working (if configured)

## 🔄 Next Steps

1. **Set up webhooks** for automatic triggering
2. **Configure notifications** (Slack/Email)
3. **Add more test suites** (regression, API tests)
4. **Set up scheduled builds**
5. **Configure cross-browser testing**

## 📞 Need Help?

**Common Issues:**
- Docker permission errors → Add user to docker group
- Port conflicts → Change ports in docker-compose.ci.yml
- Memory issues → Increase Docker memory limits

**Resources:**
- Full documentation: `JENKINS_CICD_SETUP.md`
- Playwright docs: https://playwright.dev/
- Jenkins docs: https://www.jenkins.io/doc/

---

**🎯 Goal:** Get from zero to running Playwright tests in Jenkins in under 15 minutes!

**✅ You're ready when:** Your first Jenkins build shows green with test reports generated.