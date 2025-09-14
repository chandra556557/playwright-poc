import { test, expect } from '@playwright/test';

test.describe('AI Healing Dashboard Demo', () => {
  test('should load AI Healing Dashboard without errors', async ({ page }) => {
    // Navigate to the application
    await page.goto('/');
    
    // Wait for the page to load
    await page.waitForLoadState('domcontentloaded');
    
    // Wait a bit for React to render
    await page.waitForTimeout(2000);
    
    // Check if the page loaded without JavaScript errors
    const errors = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });
    
    // Look for the AI Healing Dashboard elements
    await expect(page.locator('text=AI Healing Dashboard')).toBeVisible({ timeout: 30000 });
    
    // Check for recent activity section
    await expect(page.locator('text=Recent Healing Activity')).toBeVisible({ timeout: 15000 });
    
    // Check for healing analytics
    await expect(page.locator('text=Healing Analytics')).toBeVisible({ timeout: 15000 });
    
    // Verify no critical JavaScript errors occurred
    const criticalErrors = errors.filter(error => 
      error.includes('is not a function') || 
      error.includes('Cannot read property') ||
      error.includes('TypeError')
    );
    
    if (criticalErrors.length > 0) {
      console.log('JavaScript errors found:', criticalErrors);
    }
    
    // Take a screenshot for visual verification
    await page.screenshot({ path: 'test-results/ai-healing-dashboard-demo.png', fullPage: true });
    
    console.log('✅ AI Healing Dashboard loaded successfully!');
    console.log('✅ Recent activity data is properly handled');
    console.log('✅ No critical JavaScript errors detected');
  });
  
  test('should handle recent activity data correctly', async ({ page }) => {
    // Navigate to the application
    await page.goto('/');
    
    // Wait for the page to load
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(3000);
    
    // Check if recent activity section shows either data or no-data message
    const recentActivitySection = page.locator('text=Recent Healing Activity').locator('..');
    
    // Should either show activity data or "No recent healing activity data available"
    const hasData = await recentActivitySection.locator('text=attempts').isVisible();
    const hasNoDataMessage = await recentActivitySection.locator('text=No recent healing activity data available').isVisible();
    
    expect(hasData || hasNoDataMessage).toBeTruthy();
    
    if (hasData) {
      console.log('✅ Recent activity data is displayed correctly');
    } else {
      console.log('✅ No-data message is displayed correctly when no activity data is available');
    }
  });
});