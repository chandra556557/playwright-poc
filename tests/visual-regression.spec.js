import { test, expect } from '@playwright/test';
import {
  takePercySnapshot,
  takeResponsiveSnapshots,
  takeElementSnapshot,
  takeFullPageSnapshot,
  compareBeforeAfter,
  testComponentStates,
  waitForVisualReady,
  hideDynamicElements,
  disableAnimations
} from './visual-utils.js';

/**
 * Visual Regression Tests using Percy
 * These tests capture screenshots and compare them against baseline images
 */

test.describe('Visual Regression Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the application
    await page.goto('http://localhost:5173');
    
    // Wait for the page to be ready for visual testing
    await waitForVisualReady(page, {
      waitForSelector: 'body',
      networkIdle: true
    });
    
    // Disable animations for consistent screenshots
    await disableAnimations(page);
  });

  test('Homepage - Full Page Visual Test', async ({ page }) => {
    // Hide any dynamic elements that might cause flaky tests
    await hideDynamicElements(page, ['.live-clock', '.user-avatar']);
    
    // Take full page screenshot
    await takeFullPageSnapshot(page, 'Homepage - Full Page');
  });

  test('Homepage - Responsive Visual Test', async ({ page }) => {
    // Test across multiple breakpoints
    await takeResponsiveSnapshots(page, 'Homepage', {
      breakpoints: ['mobile', 'tablet', 'desktop']
    });
  });

  test('Navigation Component Visual Test', async ({ page }) => {
    // Test navigation component specifically
    await takeElementSnapshot(
      page,
      'nav, header, [role="navigation"]',
      'Navigation Component'
    );
  });

  test('Button States Visual Test', async ({ page }) => {
    // Test different button states
    await testComponentStates(page, 'Button Component', {
      'Default': async (page) => {
        // Default state - no action needed
      },
      'Hover': async (page) => {
        const button = page.locator('button').first();
        if (await button.isVisible()) {
          await button.hover();
        }
      },
      'Focus': async (page) => {
        const button = page.locator('button').first();
        if (await button.isVisible()) {
          await button.focus();
        }
      },
      'Disabled': async (page) => {
        // Add disabled attribute if button exists
        await page.evaluate(() => {
          const button = document.querySelector('button');
          if (button) {
            button.disabled = true;
          }
        });
      }
    });
  });

  test('Form Components Visual Test', async ({ page }) => {
    // Navigate to a page with forms if it exists
    const formExists = await page.locator('form, input, textarea, select').count() > 0;
    
    if (formExists) {
      await takeElementSnapshot(page, 'form', 'Form Component - Empty');
      
      // Fill form and take another snapshot
      const inputs = page.locator('input[type="text"], input[type="email"], textarea');
      const inputCount = await inputs.count();
      
      for (let i = 0; i < inputCount; i++) {
        await inputs.nth(i).fill(`Test value ${i + 1}`);
      }
      
      await takeElementSnapshot(page, 'form', 'Form Component - Filled');
    }
  });

  test('Modal/Dialog Visual Test', async ({ page }) => {
    // Look for modal triggers
    const modalTrigger = page.locator('[data-testid="modal-trigger"], .modal-trigger, button:has-text("Open"), button:has-text("Show")');
    
    if (await modalTrigger.count() > 0) {
      // Take before snapshot
      await takePercySnapshot(page, 'Modal - Before Opening');
      
      // Open modal
      await modalTrigger.first().click();
      
      // Wait for modal to appear
      await page.waitForSelector('[role="dialog"], .modal, .popup', { state: 'visible', timeout: 5000 }).catch(() => {});
      
      // Take after snapshot
      await takePercySnapshot(page, 'Modal - After Opening');
    }
  });

  test('Dark Mode Toggle Visual Test', async ({ page }) => {
    // Look for dark mode toggle
    const darkModeToggle = page.locator('[data-testid="dark-mode-toggle"], .dark-mode-toggle, button:has-text("Dark"), button:has-text("Theme")');
    
    if (await darkModeToggle.count() > 0) {
      await compareBeforeAfter(
        page,
        'Dark Mode Toggle',
        async () => {
          await darkModeToggle.first().click();
          await page.waitForTimeout(500); // Wait for theme transition
        }
      );
    }
  });

  test('Loading States Visual Test', async ({ page }) => {
    // Test loading states if they exist
    const loadingTrigger = page.locator('button:has-text("Load"), button:has-text("Submit"), button:has-text("Save")');
    
    if (await loadingTrigger.count() > 0) {
      await compareBeforeAfter(
        page,
        'Loading State',
        async () => {
          await loadingTrigger.first().click();
          // Wait briefly to capture loading state
          await page.waitForTimeout(200);
        }
      );
    }
  });

  test('Error States Visual Test', async ({ page }) => {
    // Test error states by triggering validation errors
    const form = page.locator('form').first();
    
    if (await form.count() > 0) {
      // Try to submit empty form to trigger validation errors
      const submitButton = form.locator('button[type="submit"], input[type="submit"]');
      
      if (await submitButton.count() > 0) {
        await compareBeforeAfter(
          page,
          'Form Validation Errors',
          async () => {
            await submitButton.click();
            await page.waitForTimeout(500);
          }
        );
      }
    }
  });

  test('Responsive Navigation Visual Test', async ({ page }) => {
    // Test navigation at different screen sizes
    const breakpoints = {
      'Mobile': { width: 375, height: 812 },
      'Tablet': { width: 768, height: 1024 },
      'Desktop': { width: 1440, height: 900 }
    };

    for (const [name, viewport] of Object.entries(breakpoints)) {
      await page.setViewportSize(viewport);
      await page.waitForTimeout(500);
      
      // Take screenshot of navigation area
      await takeElementSnapshot(
        page,
        'nav, header, [role="navigation"]',
        `Navigation - ${name}`,
        { widths: [viewport.width] }
      );
    }
  });

  test('Component Hover Effects Visual Test', async ({ page }) => {
    // Test hover effects on interactive elements
    const interactiveElements = [
      'button',
      'a',
      '.card',
      '.interactive',
      '[role="button"]'
    ];

    for (const selector of interactiveElements) {
      const elements = page.locator(selector);
      const count = await elements.count();
      
      if (count > 0) {
        // Take screenshot of first element in normal state
        await takeElementSnapshot(page, selector, `${selector.replace(/[^a-zA-Z0-9]/g, '_')} - Normal`);
        
        // Hover and take screenshot
        await elements.first().hover();
        await page.waitForTimeout(200);
        await takeElementSnapshot(page, selector, `${selector.replace(/[^a-zA-Z0-9]/g, '_')} - Hover`);
        
        // Move mouse away to reset state
        await page.mouse.move(0, 0);
        await page.waitForTimeout(200);
      }
    }
  });

  test('Print Styles Visual Test', async ({ page }) => {
    // Test print styles
    await page.emulateMedia({ media: 'print' });
    await takePercySnapshot(page, 'Print Styles', {
      percyCSS: `
        @media print {
          body {
            background: white !important;
          }
        }
      `
    });
    
    // Reset to screen media
    await page.emulateMedia({ media: 'screen' });
  });
});

// Test for specific pages if they exist
test.describe('Page-Specific Visual Tests', () => {
  const testPages = [
    { path: '/', name: 'Home' },
    { path: '/about', name: 'About' },
    { path: '/contact', name: 'Contact' },
    { path: '/dashboard', name: 'Dashboard' },
    { path: '/profile', name: 'Profile' }
  ];

  for (const { path, name } of testPages) {
    test(`${name} Page Visual Test`, async ({ page }) => {
      // Try to navigate to the page
      const response = await page.goto(`http://localhost:5173${path}`, { 
        waitUntil: 'networkidle',
        timeout: 10000 
      }).catch(() => null);
      
      // Skip if page doesn't exist (404)
      if (!response || response.status() === 404) {
        test.skip(`${name} page not found`);
        return;
      }
      
      // Wait for page to be ready
      await waitForVisualReady(page);
      await disableAnimations(page);
      await hideDynamicElements(page);
      
      // Take full page screenshot
      await takeFullPageSnapshot(page, `${name} Page`);
      
      // Take responsive screenshots
      await takeResponsiveSnapshots(page, `${name} Page`, {
        breakpoints: ['mobile', 'desktop']
      });
    });
  }
});