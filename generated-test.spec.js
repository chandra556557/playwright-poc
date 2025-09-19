
// Generated Playwright test
const { test, expect } = require('@playwright/test');

test('generated test', async ({ page }) => {
  await page.goto('https://playwright.dev/docs/intro');
  await expect(page).toHaveTitle('Installation | Playwright');
});
