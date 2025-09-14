/**
 * Generated Test Code
 * Language: javascript
 * Generated at: 2025-09-10T18:24:17.385Z
 * Description: Generated test code
 */

import { test, expect } from '@playwright/test';

test('test', async ({ page }) => {
  // Navigate to the application
  await page.goto('/');
  
  // Wait for the page to load
  await page.waitForLoadState('domcontentloaded');
  
  // Check if the page loaded successfully
  await expect(page).toHaveTitle(/.*/);
  
  // Basic test to verify the application is running
  const body = await page.locator('body');
  await expect(body).toBeVisible();
  
  console.log('Test completed successfully - application is running');
});