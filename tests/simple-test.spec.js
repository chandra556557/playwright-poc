import { test, expect } from '@playwright/test';

test('simple test to check if playwright works', async ({ page }) => {
  console.log('Starting simple test...');
  
  try {
    // Test with external website instead of local server
    await page.goto('https://example.com');
    console.log('Page loaded successfully');
    
    // Wait for page to load
    await page.waitForLoadState('domcontentloaded');
    console.log('DOM content loaded');
    
    // Check if page has content
    const title = await page.title();
    console.log('Page title:', title);
    
    // Verify we can interact with elements
    const heading = await page.textContent('h1');
    console.log('Page heading:', heading);
    
    // Take a screenshot
    await page.screenshot({ path: 'test-results/simple-test.png' });
    console.log('Screenshot taken');
    
    // Basic assertions
    expect(title).toBe('Example Domain');
    expect(heading).toBe('Example Domain');
    console.log('✅ Simple test passed!');
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    throw error;
  }
});