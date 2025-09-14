// @ts-check
import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright Configuration for E2E Demo Tests
 * Optimized for comprehensive testing with detailed reporting
 */
export default defineConfig({
  // Test directory for E2E demo tests
  testDir: './tests',
  testMatch: '**/e2e-realtime-demo.spec.js',
  
  // Global test timeout
  timeout: 120000, // 2 minutes per test
  
  // Expect timeout for assertions
  expect: {
    timeout: 15000 // 15 seconds for assertions
  },
  
  // Run tests in parallel
  fullyParallel: false, // Sequential for demo to avoid conflicts
  
  // Fail the build on CI if you accidentally left test.only in the source code
  forbidOnly: !!process.env.CI,
  
  // Retry on CI only
  retries: process.env.CI ? 2 : 1,
  
  // Opt out of parallel tests on CI
  workers: process.env.CI ? 1 : 1, // Single worker for demo
  
  // Enhanced reporting configuration
  reporter: [
    // HTML report for interactive viewing
    ['html', { 
      outputFolder: 'playwright-report-e2e-demo',
      open: 'never'
    }],
    
    // JSON report for programmatic access
    ['json', { 
      outputFile: 'test-results/e2e-demo-results.json' 
    }],
    
    // Allure report for comprehensive test reporting
    ['allure-playwright', {
      resultsDir: 'allure-results-e2e-demo',
      suiteTitle: 'E2E Real-time Web App Demo Tests',
      categories: [
        {
          name: 'Critical Features',
          matchedStatuses: ['failed'],
          messageRegex: '.*critical.*'
        },
        {
          name: 'Performance Issues',
          matchedStatuses: ['failed'],
          messageRegex: '.*performance.*|.*timeout.*'
        },
        {
          name: 'API Issues',
          matchedStatuses: ['failed'],
          messageRegex: '.*api.*|.*request.*'
        }
      ]
    }],
    
    // Console output for CI/CD
    ['list'],
    
    // JUnit for CI integration
    ['junit', { outputFile: 'test-results/e2e-demo-junit.xml' }]
  ],
  
  // Shared settings for all projects
  use: {
    // Base URL for the application
    baseURL: process.env.APP_BASE_URL || 'http://localhost:5173',
    
    // Collect trace when retrying the failed test
    trace: 'retain-on-failure',
    
    // Capture screenshot on failure
    screenshot: 'only-on-failure',
    
    // Record video on failure
    video: 'retain-on-failure',
    
    // Global timeout for actions
    actionTimeout: 15000,
    
    // Navigation timeout
    navigationTimeout: 30000,
    
    // Ignore HTTPS errors
    ignoreHTTPSErrors: true,
    
    // Accept downloads
    acceptDownloads: true,
    
    // Viewport size
    viewport: { width: 1280, height: 720 },
    
    // User agent
    userAgent: 'Playwright E2E Demo Test Suite',
    
    // Extra HTTP headers
    extraHTTPHeaders: {
      'X-Test-Suite': 'E2E-Demo',
      'X-Test-Environment': process.env.NODE_ENV || 'test'
    },
    
    // Locale
    locale: 'en-US',
    
    // Timezone
    timezoneId: 'America/New_York'
  },
  
  // Configure projects for major browsers
  projects: [
    {
      name: 'chromium-desktop',
      use: { 
        ...devices['Desktop Chrome'],
        viewport: { width: 1920, height: 1080 },
        launchOptions: {
          args: [
            '--disable-web-security',
            '--disable-features=VizDisplayCompositor',
            '--no-sandbox'
          ]
        }
      },
    },
    
    {
      name: 'firefox-desktop',
      use: { 
        ...devices['Desktop Firefox'],
        viewport: { width: 1920, height: 1080 }
      },
    },
    
    {
      name: 'webkit-desktop',
      use: { 
        ...devices['Desktop Safari'],
        viewport: { width: 1920, height: 1080 }
      },
    },
    
    // Mobile testing
    {
      name: 'mobile-chrome',
      use: { 
        ...devices['Pixel 5']
      },
    },
    
    {
      name: 'mobile-safari',
      use: { 
        ...devices['iPhone 12']
      },
    },
    
    // Tablet testing
    {
      name: 'tablet-chrome',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1024, height: 768 }
      },
    }
  ],
  
  // Global setup and teardown
  globalSetup: './tests/e2e-demo-setup.js',
  
  // Output directory for test artifacts
  outputDir: 'test-results/e2e-demo-artifacts',
  
  // Web server configuration
  webServer: [
    {
      command: 'npm run dev',
      port: 5173,
      timeout: 120000,
      reuseExistingServer: !process.env.CI,
      stdout: 'pipe',
      stderr: 'pipe',
      env: {
        NODE_ENV: 'test'
      }
    },
    {
      command: 'npm run dev:server',
      port: 3000,
      timeout: 60000,
      reuseExistingServer: !process.env.CI,
      stdout: 'pipe',
      stderr: 'pipe'
    }
  ],
  
  // Test metadata
  metadata: {
    testSuite: 'E2E Real-time Web Application Demo',
    version: '1.0.0',
    environment: process.env.NODE_ENV || 'test',
    timestamp: new Date().toISOString(),
    author: 'Playwright E2E Demo Suite',
    description: 'Comprehensive end-to-end testing demonstration for real-time web applications'
  }
});