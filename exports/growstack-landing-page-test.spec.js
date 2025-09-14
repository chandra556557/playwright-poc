import { test, expect } from '@playwright/test';

test.describe('GrowStack AI Landing Page E2E Tests', () => {
  test('Landing page loads and displays key elements', async ({ page }) => {
    // Set longer timeout for external site
    test.setTimeout(90000);
    
    try {
      // Navigate to GrowStack AI landing page
      await page.goto('https://www.growstack.ai/', { 
        waitUntil: 'domcontentloaded', 
        timeout: 45000 
      });
      
      // Wait for the page to load with a more flexible approach
      await page.waitForLoadState('domcontentloaded');
      await page.waitForTimeout(5000); // Give additional time for dynamic content
      
      // Verify page title contains GrowStack
      await expect(page).toHaveTitle(/GrowStack/i);
      
      // Verify at least one heading is present
      const headings = page.locator('h1, h2, h3');
      await expect(headings.first()).toBeVisible();
      
      // Check for key messaging (more flexible approach)
      const pageContent = await page.textContent('body');
      const hasKeyContent = pageContent && (
        pageContent.toLowerCase().includes('ai') ||
        pageContent.toLowerCase().includes('growth') ||
        pageContent.toLowerCase().includes('marketing') ||
        pageContent.toLowerCase().includes('automation')
      );
      expect(hasKeyContent).toBeTruthy();
      
      // Verify some interactive elements exist
      const buttons = page.locator('button, a, input[type="submit"]');
      const buttonCount = await buttons.count();
      expect(buttonCount).toBeGreaterThan(0);
      
    } catch (error) {
      console.log('Test failed with error:', error.message);
      // Take a screenshot for debugging
      await page.screenshot({ path: 'test-results/growstack-error.png', fullPage: true });
      throw error;
    }
  });
  
  test('Basic responsiveness and scrolling', async ({ page }) => {
    test.setTimeout(90000);
    
    try {
      await page.goto('https://www.growstack.ai/', { 
        waitUntil: 'domcontentloaded', 
        timeout: 45000 
      });
      await page.waitForLoadState('domcontentloaded');
      await page.waitForTimeout(3000);
      
      // Test basic scrolling
      await page.evaluate(() => window.scrollTo(0, 500));
      await page.waitForTimeout(1000);
      
      // Test mobile viewport
      await page.setViewportSize({ width: 375, height: 667 });
      await page.waitForTimeout(1000);
      
      // Verify content is still visible on mobile
      const headings = page.locator('h1, h2, h3');
      await expect(headings.first()).toBeVisible();
      
      // Reset to desktop viewport
      await page.setViewportSize({ width: 1280, height: 720 });
      await page.waitForTimeout(1000);
      
    } catch (error) {
      console.log('Responsiveness test failed:', error.message);
      await page.screenshot({ path: 'test-results/growstack-responsive-error.png' });
      throw error;
    }
  });
  
  test('Basic performance and structure check', async ({ page }) => {
    test.setTimeout(90000);
    
    try {
      const startTime = Date.now();
      
      await page.goto('https://www.growstack.ai/', { 
        waitUntil: 'domcontentloaded', 
        timeout: 45000 
      });
      
      await page.waitForLoadState('domcontentloaded');
      const loadTime = Date.now() - startTime;
      
      // Expect page to load within reasonable time (45 seconds for external site)
      expect(loadTime).toBeLessThan(45000);
      
      // Basic structure checks
      const headings = page.locator('h1, h2, h3');
      const headingCount = await headings.count();
      expect(headingCount).toBeGreaterThan(0);
      
      // Check for images
      const images = page.locator('img');
      const imageCount = await images.count();
      expect(imageCount).toBeGreaterThan(0);
      
      // Verify page has some content
      const bodyText = await page.textContent('body');
      expect(bodyText && bodyText.length > 100).toBeTruthy();
      
    } catch (error) {
      console.log('Performance test failed:', error.message);
      await page.screenshot({ path: 'test-results/growstack-performance-error.png' });
      throw error;
    }
  });
});