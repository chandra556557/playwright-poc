import express from 'express';
import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();

// Configuration file path
const configPath = path.join(__dirname, '../data/test-runner-config.json');

// Default configuration
const defaultConfig = {
  testDir: './exports',
  fullyParallel: true,
  retries: 0,
  workers: undefined,
  reporter: 'html',
  timeout: 30000,
  baseURL: 'http://localhost:5174',
  headless: true,
  trace: 'on-first-retry',
  screenshot: 'only-on-failure',
  video: 'retain-on-failure',
  browsers: ['chromium'],
  viewport: {
    width: 1280,
    height: 720
  }
};

// Get current configuration
router.get('/config', async (req, res) => {
  try {
    let config = defaultConfig;
    
    try {
      const configData = await fs.readFile(configPath, 'utf8');
      config = { ...defaultConfig, ...JSON.parse(configData) };
    } catch (error) {
      // Config file doesn't exist, use defaults
      console.log('Using default test runner configuration');
    }
    
    res.json(config);
  } catch (error) {
    console.error('Error getting test runner config:', error);
    res.status(500).json({ error: 'Failed to get configuration' });
  }
});

// Save configuration
router.post('/config', async (req, res) => {
  try {
    const config = { ...defaultConfig, ...req.body };
    
    // Ensure data directory exists
    const dataDir = path.dirname(configPath);
    await fs.mkdir(dataDir, { recursive: true });
    
    // Save configuration
    await fs.writeFile(configPath, JSON.stringify(config, null, 2));
    
    // Generate Playwright config file
    await generatePlaywrightConfig(config);
    
    res.json({ success: true, config });
  } catch (error) {
    console.error('Error saving test runner config:', error);
    res.status(500).json({ error: 'Failed to save configuration' });
  }
});

// Generate dynamic Playwright configuration
router.post('/generate-config', async (req, res) => {
  try {
    const config = req.body;
    const playwrightConfig = await generatePlaywrightConfig(config);
    
    res.json({ 
      success: true, 
      configPath: playwrightConfig.configPath,
      config: playwrightConfig.content 
    });
  } catch (error) {
    console.error('Error generating Playwright config:', error);
    res.status(500).json({ error: 'Failed to generate configuration' });
  }
});

// Execute tests with custom configuration
router.post('/execute', async (req, res) => {
  try {
    const { config, testSuiteIds = [], options = {} } = req.body;
    
    if (!req.testRunner?.isReady()) {
      return res.status(503).json({ error: 'Test Runner not ready' });
    }
    
    // Generate temporary Playwright config
    const playwrightConfig = await generatePlaywrightConfig(config);
    
    // Create execution with custom config
    const executionId = await req.testRunner.createExecution({
      testSuiteIds,
      config: playwrightConfig.content,
      configPath: playwrightConfig.configPath,
      options: {
        ...options,
        useCustomConfig: true
      }
    });
    
    // Start execution
    const progressCallback = (progress) => {
      req.broadcast?.('test-progress', progress);
    };
    
    // Execute tests asynchronously
    setImmediate(async () => {
      try {
        for (const testSuiteId of testSuiteIds) {
          await req.testRunner.runTestSuiteWithConfig(
            testSuiteId, 
            executionId, 
            playwrightConfig.configPath,
            options, 
            progressCallback
          );
        }
      } catch (error) {
        console.error('Test execution error:', error);
        progressCallback({
          executionId,
          status: 'error',
          message: `Test execution failed: ${error.message}`,
          error: error.message
        });
      }
    });
    
    res.json({ 
      executionId,
      status: 'started',
      message: 'Test execution started with custom configuration',
      configPath: playwrightConfig.configPath
    });
  } catch (error) {
    console.error('Error executing tests with config:', error);
    res.status(500).json({ error: 'Failed to execute tests' });
  }
});

// Generate Playwright configuration file
async function generatePlaywrightConfig(config) {
  const timestamp = Date.now();
  const configFileName = `playwright.config.${timestamp}.js`;
  const configPath = path.join(process.cwd(), configFileName);
  
  const playwrightConfigContent = `
// Auto-generated Playwright configuration
// Generated at: ${new Date().toISOString()}

import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: '${config.testDir}',
  fullyParallel: ${config.fullyParallel},
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : ${config.retries},
  workers: process.env.CI ? 1 : ${config.workers || 'undefined'},
  reporter: '${config.reporter}',
  timeout: ${config.timeout},
  
  use: {
    baseURL: '${config.baseURL}',
    trace: '${config.trace}',
    screenshot: '${config.screenshot}',
    video: '${config.video}',
    headless: ${config.headless},
    viewport: {
      width: ${config.viewport.width},
      height: ${config.viewport.height}
    },
  },
  
  projects: [
${config.browsers.map(browser => `    {
      name: '${browser}',
      use: { ...devices['Desktop ${browser === 'chromium' ? 'Chrome' : browser === 'firefox' ? 'Firefox' : 'Safari'}'] },
    }`).join(',\n')}
  ],
  
  // Output directories
  outputDir: 'test-results/',
  
  // Global setup and teardown
  // globalSetup: require.resolve('./global-setup'),
  // globalTeardown: require.resolve('./global-teardown'),
});
`;
  
  await fs.writeFile(configPath, playwrightConfigContent);
  
  return {
    configPath,
    content: playwrightConfigContent
  };
}

// Get available presets
router.get('/presets', (req, res) => {
  const presets = {
    'fast-feedback': {
      name: 'Fast Feedback',
      description: 'Quick tests for development',
      config: {
        ...defaultConfig,
        fullyParallel: true,
        workers: 4,
        retries: 0,
        headless: true,
        browsers: ['chromium'],
        trace: 'off',
        screenshot: 'only-on-failure',
        video: 'off'
      }
    },
    'comprehensive': {
      name: 'Comprehensive Testing',
      description: 'Full cross-browser testing',
      config: {
        ...defaultConfig,
        fullyParallel: true,
        workers: 2,
        retries: 2,
        headless: true,
        browsers: ['chromium', 'firefox', 'webkit'],
        trace: 'on-first-retry',
        screenshot: 'only-on-failure',
        video: 'retain-on-failure'
      }
    },
    'debugging': {
      name: 'Debug Mode',
      description: 'Detailed debugging with traces',
      config: {
        ...defaultConfig,
        fullyParallel: false,
        workers: 1,
        retries: 0,
        headless: false,
        browsers: ['chromium'],
        trace: 'on',
        screenshot: 'on',
        video: 'on'
      }
    },
    'ci-pipeline': {
      name: 'CI Pipeline',
      description: 'Optimized for CI/CD',
      config: {
        ...defaultConfig,
        fullyParallel: true,
        workers: 2,
        retries: 3,
        headless: true,
        browsers: ['chromium', 'firefox'],
        trace: 'retain-on-failure',
        screenshot: 'only-on-failure',
        video: 'retain-on-failure'
      }
    }
  };
  
  res.json(presets);
});

export default router;