/**
 * Generated Test Code
 * Language: javascript
 * Generated at: 2025-09-19T04:01:17.644Z
 * Description: Generated test code
 */

import { test, expect } from '@playwright/test';

test('test', async ({ page }) => {
  await page.locator('div').filter({ hasText: 'HomeAI StudioAI Content' }).nth(2).click();
  await page.getByRole('button', { name: 'Login' }).click();
  await page.getByRole('textbox', { name: 'Enter your email...' }).click();
  await page.getByRole('textbox', { name: 'Enter your email...' }).click();
  await page.getByRole('textbox', { name: 'Enter your email...' }).click();
  await page.getByRole('textbox', { name: 'Enter your email...' }).click();
  await page.getByRole('textbox', { name: 'Enter your email...' }).fill('perform20@growstack.ai');
  await page.getByRole('textbox', { name: 'Enter your password...' }).click();
  await page.getByRole('textbox', { name: 'Enter your password...' }).fill('Growstack@123');
  await page.getByRole('button', { name: 'Login' }).click();
});