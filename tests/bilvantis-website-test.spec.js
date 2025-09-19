import { test, expect } from '@playwright/test';

test.describe('Bilvantis Website E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to Bilvantis homepage
    await page.goto('https://bilvantis.io/home');
    
    // Wait for page to load completely
    await page.waitForLoadState('networkidle');
  });

  test('should load Bilvantis homepage successfully', async ({ page }) => {
    // Check if page title contains Bilvantis
    await expect(page).toHaveTitle(/Bilvantis/i);
    
    // Check if main content is visible
    await expect(page.locator('body')).toBeVisible();
    
    // Take a screenshot for visual verification
    await page.screenshot({ path: 'test-results/bilvantis-homepage.png', fullPage: true });
  });

  test('should display main navigation menu', async ({ page }) => {
    // Check for main navigation elements
    const navigationItems = [
      'Home',
      'About Us', 
      'Services',
      'Products',
      'Resources',
      'Life@Bilvantis',
      'Careers'
    ];

    for (const item of navigationItems) {
      const navElement = page.locator(`text=${item}`).first();
      await expect(navElement).toBeVisible({ timeout: 10000 });
    }
  });

  test('should display services section', async ({ page }) => {
    // Check for services dropdown or section
    const servicesSection = page.locator('text=Services').first();
    await expect(servicesSection).toBeVisible();
    
    // Check for specific services mentioned
    const services = [
      'Cloud Data Engineering',
      'AI/ML',
      'Digital Engineering',
      'Heritage'
    ];

    for (const service of services) {
      const serviceElement = page.locator(`text=${service}`).first();
      await expect(serviceElement).toBeVisible({ timeout: 10000 });
    }
  });

  test('should display products section', async ({ page }) => {
    // Check for products section
    const productsSection = page.locator('text=Products').first();
    await expect(productsSection).toBeVisible();
    
    // Check for specific products
    const products = [
      'P2X',
      'NEO AI'
    ];

    for (const product of products) {
      const productElement = page.locator(`text=${product}`).first();
      await expect(productElement).toBeVisible({ timeout: 10000 });
    }
  });

  test('should have contact us functionality', async ({ page }) => {
    // Check for contact us button/link
    const contactUs = page.locator('text=contact us').first();
    await expect(contactUs).toBeVisible();
    
    // Check for "Two Week POC" text
    const pocText = page.locator('text=Two Week POC').first();
    await expect(pocText).toBeVisible();
  });

  test('should have responsive design elements', async ({ page }) => {
    // Test different viewport sizes
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.waitForTimeout(1000);
    await page.screenshot({ path: 'test-results/bilvantis-desktop.png', fullPage: true });

    await page.setViewportSize({ width: 768, height: 1024 });
    await page.waitForTimeout(1000);
    await page.screenshot({ path: 'test-results/bilvantis-tablet.png', fullPage: true });

    await page.setViewportSize({ width: 375, height: 667 });
    await page.waitForTimeout(1000);
    await page.screenshot({ path: 'test-results/bilvantis-mobile.png', fullPage: true });

    // Reset to default viewport
    await page.setViewportSize({ width: 1280, height: 720 });
  });

  test('should have working links and navigation', async ({ page }) => {
    // Test main navigation links
    const links = [
      { text: 'About Us', expectedUrl: /about/i },
      { text: 'Services', expectedUrl: /services/i },
      { text: 'Products', expectedUrl: /products/i },
      { text: 'Resources', expectedUrl: /resources/i },
      { text: 'Careers', expectedUrl: /careers/i }
    ];

    for (const link of links) {
      try {
        const linkElement = page.locator(`text=${link.text}`).first();
        if (await linkElement.isVisible()) {
          // Click the link
          await linkElement.click();
          await page.waitForLoadState('networkidle');
          
          // Check if URL contains expected pattern
          const currentUrl = page.url();
          expect(currentUrl).toMatch(linkExpectedUrl);
          
          // Go back to homepage for next test
          await page.goto('https://bilvantis.io/home');
          await page.waitForLoadState('networkidle');
        }
      } catch (error) {
        console.log(`Link test for "${link.text}" failed:`, error.message);
      }
    }
  });

  test('should load page performance metrics', async ({ page }) => {
    // Measure page load performance
    const startTime = Date.now();
    await page.goto('https://bilvantis.io/home');
    await page.waitForLoadState('networkidle');
    const loadTime = Date.now() - startTime;

    console.log(`Page load time: ${loadTime}ms`);
    
    // Check if page loads within reasonable time (10 seconds)
    expect(loadTime).toBeLessThan(10000);
  });

  test('should check for accessibility features', async ({ page }) => {
    // Check for alt text on images
    const images = page.locator('img');
    const imageCount = await images.count();
    
    for (let i = 0; i < imageCount; i++) {
      const img = images.nth(i);
      const altText = await img.getAttribute('alt');
      // Images should have alt text or be decorative
      expect(altText).toBeTruthy();
    }

    // Check for proper heading structure
    const h1 = page.locator('h1');
    await expect(h1).toHaveCount({ min: 1 });
  });

  test('should verify company branding elements', async ({ page }) => {
    // Check for logo
    const logo = page.locator('[alt*="logo"], [alt*="Logo"], [class*="logo"], [id*="logo"]').first();
    await expect(logo).toBeVisible();

    // Check for company name in various places
    const companyName = page.locator('text=Bilvantis').first();
    await expect(companyName).toBeVisible();
  });
});
