# Testing & Quality Assurance Guide

This document provides comprehensive information about the testing infrastructure and quality assurance processes for the project.

## 📋 Table of Contents

- [Overview](#overview)
- [Test Types](#test-types)
- [Getting Started](#getting-started)
- [Running Tests](#running-tests)
- [Test Coverage](#test-coverage)
- [Continuous Integration](#continuous-integration)
- [Writing Tests](#writing-tests)
- [Performance Testing](#performance-testing)
- [Visual Testing](#visual-testing)
- [Troubleshooting](#troubleshooting)

## 🎯 Overview

Our testing strategy includes multiple layers of testing to ensure code quality, functionality, and performance:

- **Unit Tests**: Test individual components and functions
- **Integration Tests**: Test API endpoints and service interactions
- **End-to-End Tests**: Test complete user workflows
- **Performance Tests**: Test application performance under load
- **Visual Tests**: Test UI consistency and visual regressions

## 🧪 Test Types

### Unit Tests
- **Framework**: Vitest with React Testing Library
- **Location**: `src/**/*.test.{js,jsx,ts,tsx}` and `server/**/*.test.{js,ts}`
- **Purpose**: Test individual components, functions, and services
- **Coverage**: Components, utilities, services, and business logic

### Integration Tests
- **Framework**: Vitest with Supertest
- **Location**: `server/__tests__/integration/`
- **Purpose**: Test API endpoints, WebSocket connections, and service interactions
- **Coverage**: REST APIs, WebSocket communication, database operations

### End-to-End Tests
- **Framework**: Playwright
- **Location**: `tests/`
- **Purpose**: Test complete user journeys and workflows
- **Coverage**: Critical user paths, cross-browser compatibility

### Performance Tests
- **Framework**: Playwright + Artillery
- **Location**: `tests/performance/`
- **Purpose**: Test application performance under various load conditions
- **Coverage**: Concurrent sessions, memory usage, response times

### Visual Tests
- **Framework**: Percy + Playwright
- **Location**: Visual regression tests integrated with E2E tests
- **Purpose**: Detect visual changes and UI regressions
- **Coverage**: UI components, responsive design, cross-browser rendering

## 🚀 Getting Started

### Prerequisites

```bash
# Install dependencies
npm install

# Install Playwright browsers
npx playwright install

# Install server dependencies (if separate)
npm run install:server
```

### Environment Setup

1. **Environment Variables**: Create `.env.test` file:
```env
NODE_ENV=test
APP_BASE_URL=http://localhost:3000
TEST_DATABASE_URL=your_test_database_url
```

2. **Test Database**: Set up a separate test database for integration tests

3. **Browser Setup**: Ensure Playwright browsers are installed

## 🏃‍♂️ Running Tests

### Quick Commands

```bash
# Run all tests
npm run test:all

# Run only unit tests
npm run test:unit

# Run only integration tests
npm run test:integration

# Run only E2E tests
npm run test:e2e

# Run performance tests
npm run test:performance

# Run with coverage
npm run test:coverage
```

### Development Workflow

```bash
# Watch mode for unit tests
npm run test:unit:watch

# Interactive UI for tests
npm run test:ui

# Debug E2E tests
npm run test:e2e:debug

# Run specific test file
npm test -- CodegenRecorder.test.jsx
```

### CI/CD Commands

```bash
# Full CI test suite
npm run test:ci

# Quick smoke tests
npm run test:quick
```

## 📊 Test Coverage

### Coverage Reports

Generate comprehensive coverage reports:

```bash
# Generate coverage report
npm run test:coverage

# Open coverage report in browser
npm run coverage:open

# Serve coverage report
npm run coverage:serve
```

### Coverage Thresholds

- **Global**: 85% lines, 80% branches, 85% functions, 85% statements
- **Critical Components**: 95% lines, 90% branches, 95% functions, 95% statements
- **Services**: 90% lines, 85% branches, 90% functions, 90% statements

### Coverage Configuration

Coverage settings are defined in `vitest.coverage.config.js`:

- **Included**: `src/**`, `server/**`
- **Excluded**: Test files, configuration files, build artifacts
- **Formats**: HTML, LCOV, JSON, Cobertura, Clover

## 🔄 Continuous Integration

### GitHub Actions Workflow

Our CI pipeline (`.github/workflows/ci-testing.yml`) includes:

1. **Unit & Integration Tests**: Run on Node.js 16, 18, 20
2. **E2E Tests**: Run on Chromium, Firefox, WebKit
3. **Performance Tests**: Load testing and performance monitoring
4. **Security Checks**: Dependency auditing and vulnerability scanning
5. **Coverage Reporting**: Upload to Codecov and generate reports
6. **Preview Deployment**: Deploy PR previews for testing

### Workflow Triggers

- **Push**: `main`, `develop` branches
- **Pull Request**: All PRs to `main`, `develop`
- **Schedule**: Daily at 2 AM UTC
- **Manual**: Workflow dispatch

### Artifacts

- Test results (JUnit XML)
- Coverage reports (LCOV, HTML)
- E2E test videos and screenshots
- Performance metrics
- Allure reports

## ✍️ Writing Tests

### Unit Test Example

```javascript
// src/components/__tests__/Button.test.jsx
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import Button from '../Button';

describe('Button Component', () => {
  it('renders with correct text', () => {
    render(<Button>Click me</Button>);
    expect(screen.getByText('Click me')).toBeInTheDocument();
  });

  it('calls onClick handler when clicked', () => {
    const handleClick = vi.fn();
    render(<Button onClick={handleClick}>Click me</Button>);
    
    fireEvent.click(screen.getByText('Click me'));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });
});
```

### Integration Test Example

```javascript
// server/__tests__/integration/api.test.js
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import app from '../../app.js';

describe('API Integration Tests', () => {
  beforeAll(async () => {
    // Setup test database
  });

  afterAll(async () => {
    // Cleanup
  });

  it('should create a new recording session', async () => {
    const response = await request(app)
      .post('/api/codegen/start')
      .send({
        language: 'javascript',
        browser: 'chromium',
        url: 'https://example.com'
      })
      .expect(200);

    expect(response.body).toHaveProperty('sessionId');
    expect(response.body.status).toBe('started');
  });
});
```

### E2E Test Example

```javascript
// tests/e2e/codegen-workflow.spec.js
import { test, expect } from '@playwright/test';

test('complete code generation workflow', async ({ page }) => {
  await page.goto('/');
  
  // Start recording
  await page.click('[data-testid="start-recording"]');
  await expect(page.locator('.recording-status')).toBeVisible();
  
  // Perform actions
  await page.fill('#target-url', 'https://example.com');
  await page.selectOption('#language-select', 'javascript');
  
  // Stop recording
  await page.click('[data-testid="stop-recording"]');
  
  // Verify code generation
  await expect(page.locator('.generated-code')).toBeVisible();
  const code = await page.locator('.generated-code').textContent();
  expect(code).toContain('test(');
});
```

## ⚡ Performance Testing

### Load Testing

```bash
# Run performance tests
npm run test:performance

# Run load tests with Artillery
npm run test:load
```

### Performance Metrics

- **Response Time**: API endpoint response times
- **Throughput**: Requests per second
- **Memory Usage**: JavaScript heap size monitoring
- **Concurrent Sessions**: Multiple recording sessions
- **WebSocket Performance**: Real-time communication load

### Performance Thresholds

- Page load time: < 3 seconds
- API response time: < 1 second
- Memory usage: < 100MB per session
- Concurrent sessions: Support 10+ simultaneous users

## 👁️ Visual Testing

### Percy Integration

```bash
# Run visual tests
npm run test:visual

# Update visual baselines
npm run test:visual:update

# Debug visual differences
npm run test:visual:debug
```

### Visual Test Coverage

- Component library
- Responsive design breakpoints
- Cross-browser rendering
- Dark/light theme variations
- Error states and loading states

## 🔧 Troubleshooting

### Common Issues

#### Test Failures

```bash
# Clear test cache
npm run clean
npm install

# Update snapshots
npm run test:visual:update

# Debug specific test
npm run test:e2e:debug -- --grep "test name"
```

#### Performance Issues

```bash
# Check memory usage
npm run test:performance:headed

# Profile test execution
npm run test -- --reporter=verbose
```

#### CI/CD Issues

- Check environment variables
- Verify browser installations
- Review artifact uploads
- Check test timeouts

### Debug Commands

```bash
# Debug unit tests
npm run test:unit -- --reporter=verbose

# Debug E2E tests with UI
npm run test:e2e:ui

# Debug with headed browser
npm run test:e2e:headed

# Debug specific test file
npm run test:e2e:debug -- tests/specific-test.spec.js
```

### Environment Issues

```bash
# Reset dependencies
npm run clean:deps

# Reinstall Playwright browsers
npx playwright install --force

# Check system requirements
npx playwright install-deps
```

## 📈 Reporting

### Test Reports

- **Vitest**: HTML and JSON reports
- **Playwright**: HTML report with videos and traces
- **Allure**: Comprehensive test reporting
- **Coverage**: Multi-format coverage reports

### Accessing Reports

```bash
# Open test reports
npm run coverage:open
npm run allure:open

# Generate Allure report
npm run allure:generate
npm run allure:serve
```

### CI Reports

- GitHub Actions artifacts
- Codecov integration
- PR comments with test results
- Performance metrics tracking

## 🎯 Best Practices

### Test Organization

- Group related tests in `describe` blocks
- Use descriptive test names
- Follow AAA pattern (Arrange, Act, Assert)
- Keep tests independent and isolated

### Test Data

- Use factories for test data generation
- Clean up test data after each test
- Use realistic but safe test data
- Avoid hardcoded values

### Performance

- Run tests in parallel when possible
- Use appropriate timeouts
- Mock external dependencies
- Clean up resources properly

### Maintenance

- Regular dependency updates
- Monitor test execution times
- Review and update test coverage
- Refactor tests as code evolves

---

## 📚 Additional Resources

- [Vitest Documentation](https://vitest.dev/)
- [Playwright Documentation](https://playwright.dev/)
- [React Testing Library](https://testing-library.com/docs/react-testing-library/intro/)
- [Percy Visual Testing](https://percy.io/)
- [Artillery Load Testing](https://artillery.io/)

For questions or issues, please check the troubleshooting section or create an issue in the project repository.