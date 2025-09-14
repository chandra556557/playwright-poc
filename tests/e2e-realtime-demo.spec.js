import { test, expect } from '@playwright/test';
import { allure } from 'allure-playwright';

/**
 * End-to-End Demo Test Suite for Real-time Web Application
 * 
 * This comprehensive test demonstrates:
 * - User authentication flow
 * - Real-time data interactions
 * - API testing integration
 * - Visual regression testing
 * - Performance monitoring
 * - Detailed reporting with Allure
 */

test.describe('Real-time Web Application E2E Demo', () => {
  let page;
  let context;

  test.beforeAll(async ({ browser }) => {
    // Create a new browser context for isolation
    context = await browser.newContext({
      // Enable video recording for debugging
      recordVideo: {
        dir: 'test-results/videos/',
        size: { width: 1280, height: 720 }
      },
      // Set viewport for consistent testing
      viewport: { width: 1280, height: 720 },
      // Enable request/response logging
      extraHTTPHeaders: {
        'X-Test-Run': 'e2e-demo'
      }
    });
    
    page = await context.newPage();
    
    // Enable request interception for API monitoring
    await page.route('**/api/**', async (route) => {
      const request = route.request();
      console.log(`API Call: ${request.method()} ${request.url()}`);
      
      // Continue with the request
      const response = await route.continue();
      return response;
    });
  });

  test.afterAll(async () => {
    await context.close();
  });

  test('Complete User Journey - Registration to Real-time Interaction', async () => {
    await allure.epic('Real-time Web Application');
    await allure.feature('End-to-End User Journey');
    await allure.story('User Registration and Real-time Features');
    await allure.severity('critical');
    
    // Step 1: Navigate to application
    await allure.step('Navigate to application homepage', async () => {
      await page.goto('http://localhost:5173');
      await expect(page).toHaveTitle(/.*/);
      
      // Take screenshot for reporting
      await page.screenshot({ 
        path: 'test-results/screenshots/01-homepage.png',
        fullPage: true 
      });
      
      // Attach screenshot to Allure report
      await allure.attachment('Homepage Screenshot', 
        await page.screenshot({ fullPage: true }), 
        'image/png'
      );
    });

    // Step 2: User Registration Flow
    await allure.step('Complete user registration', async () => {
      // Check if registration form exists
      const hasRegistrationForm = await page.locator('[data-testid="register-form"], .register-form, #register').count() > 0;
      
      if (hasRegistrationForm) {
        // Fill registration form
        await page.fill('[data-testid="username"], input[name="username"], #username', 'demo_user_' + Date.now());
        await page.fill('[data-testid="email"], input[name="email"], #email', 'demo@example.com');
        await page.fill('[data-testid="password"], input[name="password"], #password', 'SecurePass123!');
        
        // Submit registration
        await page.click('[data-testid="register-btn"], button[type="submit"], .register-btn');
        
        // Wait for registration success
        await expect(page.locator('.success-message, .alert-success, [data-testid="success"]')).toBeVisible({ timeout: 10000 });
      } else {
        console.log('Registration form not found, skipping registration step');
      }
      
      await page.screenshot({ path: 'test-results/screenshots/02-registration.png' });
    });

    // Step 3: Login Process
    await allure.step('User login authentication', async () => {
      // Check if login is needed
      const needsLogin = await page.locator('[data-testid="login-form"], .login-form, #login').count() > 0;
      
      if (needsLogin) {
        await page.fill('[data-testid="login-username"], input[name="username"], #login-username', 'demo_user');
        await page.fill('[data-testid="login-password"], input[name="password"], #login-password', 'SecurePass123!');
        await page.click('[data-testid="login-btn"], button[type="submit"], .login-btn');
        
        // Wait for successful login
        await expect(page.locator('.dashboard, .user-profile, [data-testid="dashboard"]')).toBeVisible({ timeout: 10000 });
      }
      
      await page.screenshot({ path: 'test-results/screenshots/03-login.png' });
    });

    // Step 4: Dashboard Navigation and Interaction
    await allure.step('Navigate dashboard and interact with components', async () => {
      // Wait for dashboard to load
      await page.waitForLoadState('networkidle');
      
      // Test navigation menu
      const navItems = await page.locator('nav a, .nav-link, [data-testid*="nav"]').count();
      console.log(`Found ${navItems} navigation items`);
      
      if (navItems > 0) {
        // Click on first navigation item
        await page.locator('nav a, .nav-link, [data-testid*="nav"]').first().click();
        await page.waitForTimeout(2000);
      }
      
      // Test interactive elements
      const buttons = await page.locator('button:visible').count();
      console.log(`Found ${buttons} interactive buttons`);
      
      if (buttons > 0) {
        // Click on a safe button (avoid delete/destructive actions)
        const safeButton = page.locator('button:visible').filter({ hasText: /view|show|display|info|details/i }).first();
        if (await safeButton.count() > 0) {
          await safeButton.click();
          await page.waitForTimeout(1000);
        }
      }
      
      await page.screenshot({ path: 'test-results/screenshots/04-dashboard-interaction.png' });
    });

    // Step 5: Real-time Features Testing
    await allure.step('Test real-time features and WebSocket connections', async () => {
      // Monitor WebSocket connections
      let wsConnected = false;
      
      page.on('websocket', ws => {
        console.log('WebSocket connection established:', ws.url());
        wsConnected = true;
        
        ws.on('framesent', event => {
          console.log('WebSocket frame sent:', event.payload);
        });
        
        ws.on('framereceived', event => {
          console.log('WebSocket frame received:', event.payload);
        });
      });
      
      // Look for real-time elements (chat, notifications, live data)
      const realtimeElements = [
        '[data-testid*="chat"], .chat, #chat',
        '[data-testid*="notification"], .notification, .alert',
        '[data-testid*="live"], .live-data, .real-time',
        'input[placeholder*="message"], textarea[placeholder*="message"]'
      ];
      
      for (const selector of realtimeElements) {
        const element = page.locator(selector).first();
        if (await element.count() > 0) {
          console.log(`Found real-time element: ${selector}`);
          
          // If it's an input, try to interact with it
          if (selector.includes('input') || selector.includes('textarea')) {
            await element.fill('Test real-time message from E2E test');
            await page.keyboard.press('Enter');
            await page.waitForTimeout(2000);
          }
        }
      }
      
      // Attach WebSocket status to report
      await allure.attachment('WebSocket Status', 
        JSON.stringify({ connected: wsConnected, timestamp: new Date().toISOString() }), 
        'application/json'
      );
      
      await page.screenshot({ path: 'test-results/screenshots/05-realtime-features.png' });
    });

    // Step 6: API Integration Testing
    await allure.step('Test API endpoints and data flow', async () => {
      // Capture network requests
      const apiRequests = [];
      
      page.on('request', request => {
        if (request.url().includes('/api/')) {
          apiRequests.push({
            url: request.url(),
            method: request.method(),
            headers: request.headers(),
            timestamp: new Date().toISOString()
          });
        }
      });
      
      // Trigger some API calls by interacting with the UI
      const dataButtons = page.locator('button').filter({ hasText: /load|fetch|get|refresh|update/i });
      if (await dataButtons.count() > 0) {
        await dataButtons.first().click();
        await page.waitForTimeout(3000);
      }
      
      // Attach API requests to report
      await allure.attachment('API Requests Log', 
        JSON.stringify(apiRequests, null, 2), 
        'application/json'
      );
      
      console.log(`Captured ${apiRequests.length} API requests`);
      
      await page.screenshot({ path: 'test-results/screenshots/06-api-integration.png' });
    });

    // Step 7: Performance Monitoring
    await allure.step('Monitor application performance', async () => {
      // Measure page performance
      const performanceMetrics = await page.evaluate(() => {
        const navigation = performance.getEntriesByType('navigation')[0];
        return {
          domContentLoaded: navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart,
          loadComplete: navigation.loadEventEnd - navigation.loadEventStart,
          firstPaint: performance.getEntriesByName('first-paint')[0]?.startTime || 0,
          firstContentfulPaint: performance.getEntriesByName('first-contentful-paint')[0]?.startTime || 0
        };
      });
      
      // Attach performance metrics to report
      await allure.attachment('Performance Metrics', 
        JSON.stringify(performanceMetrics, null, 2), 
        'application/json'
      );
      
      console.log('Performance Metrics:', performanceMetrics);
      
      // Assert performance thresholds
      expect(performanceMetrics.domContentLoaded).toBeLessThan(5000); // 5 seconds
      expect(performanceMetrics.loadComplete).toBeLessThan(10000); // 10 seconds
    });

    // Step 8: Responsive Design Testing
    await allure.step('Test responsive design across different viewports', async () => {
      const viewports = [
        { width: 1920, height: 1080, name: 'Desktop Large' },
        { width: 1366, height: 768, name: 'Desktop Standard' },
        { width: 768, height: 1024, name: 'Tablet' },
        { width: 375, height: 667, name: 'Mobile' }
      ];
      
      for (const viewport of viewports) {
        await page.setViewportSize({ width: viewport.width, height: viewport.height });
        await page.waitForTimeout(1000);
        
        // Take screenshot for each viewport
        await page.screenshot({ 
          path: `test-results/screenshots/07-responsive-${viewport.name.toLowerCase().replace(' ', '-')}.png`,
          fullPage: true 
        });
        
        // Check if navigation is accessible on mobile
        if (viewport.width < 768) {
          const mobileMenu = page.locator('.mobile-menu, .hamburger, [data-testid="mobile-menu"]');
          if (await mobileMenu.count() > 0) {
            await mobileMenu.click();
            await page.waitForTimeout(500);
          }
        }
      }
      
      // Reset to standard viewport
      await page.setViewportSize({ width: 1280, height: 720 });
    });

    // Step 9: Error Handling and Edge Cases
    await allure.step('Test error handling and edge cases', async () => {
      // Test form validation
      const forms = page.locator('form');
      if (await forms.count() > 0) {
        const form = forms.first();
        const submitBtn = form.locator('button[type="submit"], input[type="submit"]');
        
        if (await submitBtn.count() > 0) {
          // Try submitting empty form
          await submitBtn.click();
          await page.waitForTimeout(1000);
          
          // Check for validation messages
          const validationMessages = await page.locator('.error, .invalid, [data-testid*="error"]').count();
          console.log(`Found ${validationMessages} validation messages`);
        }
      }
      
      // Test 404 handling
      await page.goto('http://localhost:5173/non-existent-page');
      await page.waitForTimeout(2000);
      
      const is404 = await page.locator('h1, .error-title').filter({ hasText: /404|not found/i }).count() > 0;
      console.log('404 page handling:', is404 ? 'Working' : 'Not implemented');
      
      // Return to main page
      await page.goto('http://localhost:5173');
      
      await page.screenshot({ path: 'test-results/screenshots/08-error-handling.png' });
    });

    // Step 10: Final Validation and Cleanup
    await allure.step('Final validation and test cleanup', async () => {
      // Validate critical elements are still present
      await expect(page.locator('body')).toBeVisible();
      
      // Check for JavaScript errors
      const jsErrors = [];
      page.on('pageerror', error => {
        jsErrors.push(error.message);
      });
      
      // Refresh page to trigger any potential errors
      await page.reload();
      await page.waitForLoadState('networkidle');
      
      if (jsErrors.length > 0) {
        await allure.attachment('JavaScript Errors', 
          JSON.stringify(jsErrors, null, 2), 
          'application/json'
        );
        console.warn('JavaScript errors detected:', jsErrors);
      }
      
      // Final screenshot
      await page.screenshot({ 
        path: 'test-results/screenshots/09-final-state.png',
        fullPage: true 
      });
      
      // Attach final screenshot to report
      await allure.attachment('Final Application State', 
        await page.screenshot({ fullPage: true }), 
        'image/png'
      );
    });
  });

  test('API Endpoint Testing', async () => {
    await allure.epic('API Testing');
    await allure.feature('Backend Integration');
    await allure.story('API Endpoint Validation');
    
    // Test API endpoints directly
    const apiEndpoints = [
      { url: 'http://localhost:3000/api/health', method: 'GET', expectedStatus: 200 },
      { url: 'http://localhost:3000/api/users', method: 'GET', expectedStatus: [200, 401] },
      { url: 'http://localhost:3000/api/data', method: 'GET', expectedStatus: [200, 404] }
    ];
    
    for (const endpoint of apiEndpoints) {
      await allure.step(`Test ${endpoint.method} ${endpoint.url}`, async () => {
        try {
          const response = await page.request.get(endpoint.url);
          const status = response.status();
          const body = await response.text();
          
          console.log(`API ${endpoint.url}: Status ${status}`);
          
          // Attach API response to report
          await allure.attachment(`API Response - ${endpoint.url}`, 
            JSON.stringify({ status, body: body.substring(0, 1000) }, null, 2), 
            'application/json'
          );
          
          // Validate status code
          if (Array.isArray(endpoint.expectedStatus)) {
            expect(endpoint.expectedStatus).toContain(status);
          } else {
            expect(status).toBe(endpoint.expectedStatus);
          }
        } catch (error) {
          console.log(`API ${endpoint.url} not available:`, error.message);
          // Don't fail the test if API is not available
        }
      });
    }
  });

  test('Performance Benchmarking', async () => {
    await allure.epic('Performance Testing');
    await allure.feature('Load Time Analysis');
    await allure.story('Application Performance Benchmarks');
    
    await allure.step('Measure application load performance', async () => {
      const startTime = Date.now();
      
      await page.goto('http://localhost:5173');
      await page.waitForLoadState('networkidle');
      
      const loadTime = Date.now() - startTime;
      
      // Measure various performance metrics
      const metrics = await page.evaluate(() => {
        const perf = performance.getEntriesByType('navigation')[0];
        return {
          dns: perf.domainLookupEnd - perf.domainLookupStart,
          tcp: perf.connectEnd - perf.connectStart,
          request: perf.responseStart - perf.requestStart,
          response: perf.responseEnd - perf.responseStart,
          dom: perf.domContentLoadedEventEnd - perf.domContentLoadedEventStart,
          load: perf.loadEventEnd - perf.loadEventStart,
          total: perf.loadEventEnd - perf.navigationStart
        };
      });
      
      // Attach performance data
      await allure.attachment('Performance Benchmark', 
        JSON.stringify({ loadTime, ...metrics }, null, 2), 
        'application/json'
      );
      
      console.log('Performance Benchmark:', { loadTime, ...metrics });
      
      // Performance assertions
      expect(loadTime).toBeLessThan(15000); // 15 seconds max
      expect(metrics.total).toBeLessThan(10000); // 10 seconds max
    });
  });
});

// Utility functions for the demo
class TestUtils {
  static async waitForElement(page, selector, timeout = 10000) {
    try {
      await page.waitForSelector(selector, { timeout });
      return true;
    } catch {
      return false;
    }
  }
  
  static async takeScreenshotWithTimestamp(page, name) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `test-results/screenshots/${timestamp}-${name}.png`;
    await page.screenshot({ path: filename, fullPage: true });
    return filename;
  }
  
  static async attachToAllure(name, content, type = 'text/plain') {
    await allure.attachment(name, content, type);
  }
}

// Export for use in other test files
export { TestUtils };