import { test, expect } from '@playwright/test';

test.describe('Ecommerce Login Test', () => {
  test('Valid Login Test', async ({ page }) => {
    // Navigate to the application
    await page.goto('http://localhost:5174/');
    
    // Wait for the page to load
    await page.waitForLoadState('networkidle');
    
    // Verify the dashboard is loaded
    await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();
    
    // Verify navigation elements are present
    await expect(page.locator('nav')).toBeVisible();
    
    // Check that test suites link is available
    await expect(page.locator('a[href="/test-suites"]')).toBeVisible();
  });
});