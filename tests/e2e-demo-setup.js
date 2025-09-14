/**
 * Global Setup for E2E Demo Tests
 * Handles environment preparation, database seeding, and cleanup
 */

import { chromium } from '@playwright/test';
import fs from 'fs';
import path from 'path';

/**
 * Global setup function
 * @param {import('@playwright/test').FullConfig} config
 */
async function globalSetup(config) {
  console.log('🚀 Starting E2E Demo Test Suite Global Setup...');
  
  // Create necessary directories
  const directories = [
    'test-results',
    'test-results/e2e-demo-artifacts',
    'allure-results-e2e-demo',
    'playwright-report-e2e-demo',
    'test-data',
    'test-screenshots'
  ];
  
  directories.forEach(dir => {
    const fullPath = path.join(process.cwd(), dir);
    if (!fs.existsSync(fullPath)) {
      fs.mkdirSync(fullPath, { recursive: true });
      console.log(`📁 Created directory: ${dir}`);
    }
  });
  
  // Environment validation
  console.log('🔍 Validating environment...');
  
  const requiredEnvVars = {
    NODE_ENV: process.env.NODE_ENV || 'test',
    APP_BASE_URL: process.env.APP_BASE_URL || 'http://localhost:5173',
    API_BASE_URL: process.env.API_BASE_URL || 'http://localhost:3000'
  };
  
  console.log('Environment Variables:');
  Object.entries(requiredEnvVars).forEach(([key, value]) => {
    console.log(`  ${key}: ${value}`);
  });
  
  // Wait for services to be ready
  console.log('⏳ Waiting for services to be ready...');
  
  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();
  
  try {
    // Check if frontend is ready
    console.log('🌐 Checking frontend availability...');
    await page.goto(requiredEnvVars.APP_BASE_URL, { 
      waitUntil: 'networkidle',
      timeout: 60000 
    });
    console.log('✅ Frontend is ready');
    
    // Check if API is ready
    console.log('🔌 Checking API availability...');
    const apiResponse = await page.request.get(`${requiredEnvVars.API_BASE_URL}/health`, {
      timeout: 30000
    }).catch(() => null);
    
    if (apiResponse && apiResponse.ok()) {
      console.log('✅ API is ready');
    } else {
      console.log('⚠️  API health check failed, but continuing with tests');
    }
    
  } catch (error) {
    console.error('❌ Service readiness check failed:', error.message);
    throw new Error(`Services are not ready: ${error.message}`);
  } finally {
    await context.close();
    await browser.close();
  }
  
  // Create test data
  console.log('📊 Setting up test data...');
  
  const testData = {
    users: [
      {
        id: 'demo-user-1',
        username: 'testuser1',
        email: 'testuser1@example.com',
        password: 'TestPassword123!',
        role: 'user'
      },
      {
        id: 'demo-user-2',
        username: 'testuser2',
        email: 'testuser2@example.com',
        password: 'TestPassword123!',
        role: 'admin'
      }
    ],
    products: [
      {
        id: 'product-1',
        name: 'Demo Product 1',
        price: 29.99,
        category: 'Electronics',
        inStock: true
      },
      {
        id: 'product-2',
        name: 'Demo Product 2',
        price: 49.99,
        category: 'Books',
        inStock: false
      }
    ],
    settings: {
      theme: 'light',
      language: 'en',
      notifications: true,
      realTimeUpdates: true
    }
  };
  
  // Save test data to file
  const testDataPath = path.join(process.cwd(), 'test-data', 'demo-data.json');
  fs.writeFileSync(testDataPath, JSON.stringify(testData, null, 2));
  console.log('✅ Test data created');
  
  // Create authentication state
  console.log('🔐 Setting up authentication states...');
  
  const authStates = {
    user: {
      cookies: [],
      origins: [{
        origin: requiredEnvVars.APP_BASE_URL,
        localStorage: [{
          name: 'demo-auth-token',
          value: 'demo-user-token-12345'
        }]
      }]
    },
    admin: {
      cookies: [],
      origins: [{
        origin: requiredEnvVars.APP_BASE_URL,
        localStorage: [{
          name: 'demo-auth-token',
          value: 'demo-admin-token-67890'
        }]
      }]
    }
  };
  
  // Save auth states
  Object.entries(authStates).forEach(([role, state]) => {
    const authPath = path.join(process.cwd(), 'test-data', `${role}-auth.json`);
    fs.writeFileSync(authPath, JSON.stringify(state, null, 2));
  });
  
  console.log('✅ Authentication states created');
  
  // Performance baseline setup
  console.log('📈 Setting up performance baselines...');
  
  const performanceBaselines = {
    pageLoadTime: 3000, // 3 seconds
    apiResponseTime: 1000, // 1 second
    firstContentfulPaint: 1500, // 1.5 seconds
    largestContentfulPaint: 2500, // 2.5 seconds
    cumulativeLayoutShift: 0.1,
    firstInputDelay: 100 // 100ms
  };
  
  const baselinesPath = path.join(process.cwd(), 'test-data', 'performance-baselines.json');
  fs.writeFileSync(baselinesPath, JSON.stringify(performanceBaselines, null, 2));
  console.log('✅ Performance baselines set');
  
  // Create test configuration summary
  const setupSummary = {
    timestamp: new Date().toISOString(),
    environment: requiredEnvVars,
    testDataCreated: true,
    authStatesCreated: true,
    performanceBaselinesSet: true,
    directoriesCreated: directories,
    setupDuration: Date.now() - setupStartTime
  };
  
  const summaryPath = path.join(process.cwd(), 'test-results', 'setup-summary.json');
  fs.writeFileSync(summaryPath, JSON.stringify(setupSummary, null, 2));
  
  console.log('🎉 E2E Demo Test Suite Global Setup Complete!');
  console.log(`⏱️  Setup completed in ${setupSummary.setupDuration}ms`);
  
  return setupSummary;
}

/**
 * Global teardown function
 * @param {import('@playwright/test').FullConfig} config
 */
async function globalTeardown(config) {
  console.log('🧹 Starting E2E Demo Test Suite Global Teardown...');
  
  // Clean up temporary files if needed
  const tempFiles = [
    'test-data/temp-*.json',
    'test-screenshots/temp-*.png'
  ];
  
  // Note: In a real scenario, you might want to clean up test data
  // from databases, reset services, etc.
  
  console.log('✅ E2E Demo Test Suite Global Teardown Complete!');
}

// Track setup start time
const setupStartTime = Date.now();

export default globalSetup;
export { globalTeardown };