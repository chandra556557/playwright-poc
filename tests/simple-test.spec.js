import { test, expect } from '@playwright/test';

test('simple test to check if playwright works', async ({ page }) => {
  console.log('Starting simple test...');
  
  try {
    await page.goto('/');
    console.log('Page loaded successfully');
    
    // Wait for page to load
    await page.waitForLoadState('domcontentloaded');
    console.log('DOM content loaded');
    
    // Check if page has content
    const title = await page.title();
    console.log('Page title:', title);
    
    // Take a screenshot
    await page.screenshot({ path: 'test-results/simple-test.png' });
    console.log('Screenshot taken');
    
    expect(title).toBeTruthy();
    console.log('✅ Simple test passed!');
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    throw error;
  }
});