/**
 * Global setup for visual regression tests
 * Handles Percy initialization and environment preparation
 */

import { chromium } from '@playwright/test';
import fs from 'fs';
import path from 'path';

/**
 * Global setup function that runs before all visual tests
 */
export default async function globalSetup() {
  console.log('🎭 Setting up visual regression testing environment...');
  
  // Check Percy token
  if (!process.env.PERCY_TOKEN) {
    console.warn('⚠️  PERCY_TOKEN not found. Visual comparisons will be skipped.');
    console.warn('   Set PERCY_TOKEN environment variable to enable Percy integration.');
    console.warn('   See VISUAL_TESTING.md for setup instructions.');
  } else {
    console.log('✅ Percy token found - visual comparisons enabled');
  }
  
  // Create necessary directories
  const directories = [
    'test-results',
    'allure-results-visual',
    'playwright-report-visual',
    'screenshots'
  ];
  
  for (const dir of directories) {
    const dirPath = path.join(process.cwd(), dir);
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
      console.log(`📁 Created directory: ${dir}`);
    }
  }
  
  // Verify application server is running
  const baseURL = process.env.APP_BASE_URL || 'http://localhost:5173';
  
  try {
    console.log(`🌐 Checking application server at ${baseURL}...`);
    
    const browser = await chromium.launch();
    const page = await browser.newPage();
    
    // Try to navigate to the application
    const response = await page.goto(baseURL, { 
      waitUntil: 'networkidle',
      timeout: 30000 
    });
    
    if (response && response.ok()) {
      console.log('✅ Application server is running and accessible');
    } else {
      console.error(`❌ Application server returned status: ${response?.status()}`);
      throw new Error(`Server not accessible at ${baseURL}`);
    }
    
    await browser.close();
    
  } catch (error) {
    console.error('❌ Failed to connect to application server:');
    console.error(`   ${error.message}`);
    console.error('   Make sure your development server is running:');
    console.error('   npm run dev');
    throw error;
  }
  
  // Log environment information
  console.log('\n📊 Visual Testing Environment:');
  console.log(`   Base URL: ${baseURL}`);
  console.log(`   Percy Token: ${process.env.PERCY_TOKEN ? '✅ Set' : '❌ Not set'}`);
  console.log(`   Node Version: ${process.version}`);
  console.log(`   Platform: ${process.platform}`);
  console.log(`   CI Environment: ${process.env.CI ? 'Yes' : 'No'}`);
  
  // Percy-specific environment variables
  if (process.env.PERCY_TOKEN) {
    console.log('\n🎯 Percy Configuration:');
    console.log(`   Project: ${process.env.PERCY_PROJECT || 'From percy.config.yml'}`);
    console.log(`   Branch: ${process.env.PERCY_BRANCH || 'Current git branch'}`);
    console.log(`   Target Branch: ${process.env.PERCY_TARGET_BRANCH || 'main'}`);
    
    if (process.env.PERCY_PARALLEL_TOTAL) {
      console.log(`   Parallel Total: ${process.env.PERCY_PARALLEL_TOTAL}`);
      console.log(`   Parallel Nonce: ${process.env.PERCY_PARALLEL_NONCE || 'Auto-generated'}`);
    }
  }
  
  // Set default environment variables if not set
  if (!process.env.APP_BASE_URL) {
    process.env.APP_BASE_URL = baseURL;
  }
  
  if (!process.env.VISUAL_TEST_TIMEOUT) {
    process.env.VISUAL_TEST_TIMEOUT = '30000';
  }
  
  if (!process.env.NETWORK_IDLE_TIMEOUT) {
    process.env.NETWORK_IDLE_TIMEOUT = '750';
  }
  
  // Disable animations by default
  if (process.env.DISABLE_ANIMATIONS !== 'false') {
    process.env.DISABLE_ANIMATIONS = 'true';
  }
  
  console.log('\n🚀 Visual regression testing setup complete!');
  console.log('   Run tests with: npm run test:visual\n');
}