// @ts-check
import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright configuration for visual regression tests with Percy
 * @see https://playwright.dev/docs/test-configuration
 */
export default defineConfig({
  testDir: './tests',
  testMatch: '**/visual-regression.spec.js',
  
  /* Run tests in files in parallel */
  fullyParallel: true,
  
  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: !!process.env.CI,
  
  /* Retry on CI only */
  retries: process.env.CI ? 2 : 0,
  
  /* Opt out of parallel tests on CI for Percy */
  workers: process.env.CI ? 1 : 2,
  
  /* Timeout for visual tests */
  timeout: parseInt(process.env.VISUAL_TEST_TIMEOUT) || 30000,
  
  /* Expect timeout for assertions */
  expect: {
    timeout: 10000,
  },
  
  /* Reporter to use */
  reporter: [
    ['html', { outputFolder: 'playwright-report-visual' }],
    ['json', { outputFile: 'test-results/visual-results.json' }],
    ['allure-playwright', {
      outputFolder: 'allure-results-visual',
      suiteTitle: false,
      detail: true,
      environmentInfo: {
        framework: 'Playwright + Percy',
        node_version: process.version,
        os: process.platform,
        percy_enabled: !!process.env.PERCY_TOKEN
      }
    }]
  ],
  
  /* Shared settings for all projects */
  use: {
    /* Base URL to use in actions like `await page.goto('/')` */
    baseURL: process.env.APP_BASE_URL || 'http://localhost:5173',
    
    /* Collect trace when retrying the failed test */
    trace: 'on-first-retry',
    
    /* Screenshot settings */
    screenshot: 'only-on-failure',
    
    /* Video settings */
    video: 'retain-on-failure',
    
    /* Viewport settings - will be overridden by responsive tests */
    viewport: { width: 1280, height: 720 },
    
    /* Ignore HTTPS errors */
    ignoreHTTPSErrors: true,
    
    /* Wait for network idle by default */
    waitForTimeout: parseInt(process.env.NETWORK_IDLE_TIMEOUT) || 750,
  },
  
  /* Configure projects for visual testing */
  projects: [
    {
      name: 'visual-chromium',
      use: { 
        ...devices['Desktop Chrome'],
        // Consistent browser settings for visual testing
        launchOptions: {
          args: [
            '--disable-web-security',
            '--disable-features=TranslateUI',
            '--disable-ipc-flooding-protection',
            '--disable-renderer-backgrounding',
            '--disable-backgrounding-occluded-windows',
            '--disable-field-trial-config',
            '--disable-back-forward-cache',
            '--disable-component-extensions-with-background-pages',
            '--no-default-browser-check',
            '--no-first-run',
            '--force-color-profile=srgb',
            '--disable-background-timer-throttling'
          ]
        }
      },
    },
    
    // Uncomment for cross-browser visual testing
    // {
    //   name: 'visual-firefox',
    //   use: { 
    //     ...devices['Desktop Firefox'],
    //     launchOptions: {
    //       firefoxUserPrefs: {
    //         'gfx.canvas.azure.backends': 'cairo',
    //         'gfx.content.azure.backends': 'cairo'
    //       }
    //     }
    //   },
    // },
    
    // {
    //   name: 'visual-webkit',
    //   use: { 
    //     ...devices['Desktop Safari'],
    //   },
    // },
    
    // Mobile visual testing
    {
      name: 'visual-mobile-chrome',
      use: { 
        ...devices['Pixel 5'],
      },
    },
    
    {
      name: 'visual-mobile-safari',
      use: { 
        ...devices['iPhone 12'],
      },
    },
  ],
  
  /* Global setup and teardown */
  globalSetup: './tests/visual-setup.js',
  
  /* Run your local dev server before starting the tests */
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:5173',
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000,
    stdout: 'ignore',
    stderr: 'pipe',
  },
});