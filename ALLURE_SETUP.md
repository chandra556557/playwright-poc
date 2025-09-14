# Allure Reports Integration

This project is configured to generate beautiful Allure reports for Playwright tests.

## Prerequisites

Before using Allure reports, you need to install the required dependencies:

```bash
npm install
```

**Note**: If you encounter issues with opencv dependencies during installation, you can skip optional dependencies:

```bash
npm install --no-optional
```

Then manually install the Allure packages:

```bash
npm install --save-dev allure-playwright allure-commandline
```

## Available Scripts

### Running Tests with Allure

```bash
# Run tests with Allure reporting (uses config settings)
npm run test

# Run tests with only Allure reporter
npm run test:allure
```

### Generating and Viewing Reports

```bash
# Generate Allure report from results
npm run allure:generate

# Open the generated report in browser
npm run allure:open

# Generate and serve report in one command
npm run allure:serve
```

## Configuration

Allure is configured in both `playwright.config.js` and `playwright.tests.config.js` with the following settings:

- **Output Folder**: `allure-results`
- **Detail Level**: Full details enabled
- **Environment Info**: Includes framework, Node.js version, and OS
- **Suite Title**: Disabled for cleaner reports

## Report Features

Allure reports provide:

- **Test Results Overview**: Pass/fail statistics, execution time
- **Test Suites**: Organized by test files and describe blocks
- **Timeline**: Execution timeline with parallel test visualization
- **Behaviors**: Tests organized by features and stories
- **Environment**: System information and test configuration
- **History**: Trend analysis across test runs
- **Screenshots**: Automatic screenshot capture on failures
- **Traces**: Playwright trace files attached to failed tests

## Customizing Reports

You can customize the Allure configuration in the Playwright config files:

```javascript
['allure-playwright', {
  outputFolder: 'allure-results',
  suiteTitle: false,
  detail: true,
  environmentInfo: {
    framework: 'Playwright',
    node_version: process.version,
    os: process.platform,
    // Add custom environment variables
    custom_field: 'custom_value'
  }
}]
```

## Adding Annotations to Tests

Enhance your test reports with Allure annotations:

```javascript
import { test } from '@playwright/test';
import { allure } from 'allure-playwright';

test('Login functionality', async ({ page }) => {
  await allure.description('Test user login with valid credentials');
  await allure.owner('QA Team');
  await allure.tags('smoke', 'login');
  await allure.severity('critical');
  await allure.feature('Authentication');
  await allure.story('User Login');
  
  // Your test code here
});
```

## Troubleshooting

### Installation Issues

If you encounter cmake or opencv build errors:

1. Install dependencies without optional packages: `npm install --no-optional`
2. Manually install Allure packages: `npm install --save-dev allure-playwright allure-commandline`
3. Or use yarn: `yarn add -D allure-playwright allure-commandline`

### Report Generation Issues

- Ensure tests have been run at least once to generate `allure-results`
- Check that Java is installed (required for Allure commandline)
- Verify the `allure-results` directory exists and contains JSON files

### Missing Screenshots or Traces

- Screenshots are automatically captured on test failures
- Traces are captured based on the `trace` setting in Playwright config
- Ensure proper `use` configuration in your Playwright config files