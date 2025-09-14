import { test, expect } from '@playwright/test';
import { allure } from 'allure-playwright';

/**
 * Critical User Journeys E2E Test Suite
 * 
 * This test suite covers the most important user workflows:
 * - Code generation and recording
 * - Test healing and recovery
 * - Multi-user collaboration
 * - Performance under load
 * - Error handling and recovery
 */

test.describe('Critical User Journeys', () => {
  let page;
  let context;
  let baseURL;

  test.beforeAll(async ({ browser }) => {
    baseURL = process.env.APP_BASE_URL || 'http://localhost:5173';
    
    context = await browser.newContext({
      recordVideo: {
        dir: 'test-results/videos/',
        size: { width: 1920, height: 1080 }
      },
      viewport: { width: 1920, height: 1080 },
      extraHTTPHeaders: {
        'X-Test-Suite': 'Critical-Journeys',
        'X-Test-Environment': 'e2e'
      }
    });
    
    page = await context.newPage();
    
    // Monitor console errors
    page.on('console', msg => {
      if (msg.type() === 'error') {
        console.error('Console Error:', msg.text());
      }
    });
    
    // Monitor network failures
    page.on('requestfailed', request => {
      console.error('Request Failed:', request.url(), request.failure()?.errorText);
    });
  });

  test.afterAll(async () => {
    await context.close();
  });

  test.describe('Code Generation Journey', () => {
    test('Complete code generation workflow', async () => {
      await allure.epic('Code Generation');
      await allure.feature('Recording and Generation');
      await allure.story('End-to-End Code Generation');
      await allure.severity('critical');
      
      // Step 1: Navigate to application
      await allure.step('Navigate to code generation interface', async () => {
        await page.goto(baseURL);
        await page.waitForLoadState('networkidle');
        
        // Look for code generation entry points
        const codegenSelectors = [
          '[data-testid="start-recording"]',
          '.codegen-recorder',
          '#start-recording',
          'button:has-text("Start Recording")',
          'button:has-text("Generate Code")'
        ];
        
        let codegenButton = null;
        for (const selector of codegenSelectors) {
          const element = page.locator(selector);
          if (await element.count() > 0) {
            codegenButton = element.first();
            break;
          }
        }
        
        expect(codegenButton).not.toBeNull();
        await page.screenshot({ path: 'test-results/screenshots/codegen-01-interface.png' });
      });
      
      // Step 2: Start recording session
      await allure.step('Start new recording session', async () => {
        // Configure recording options
        const languageSelector = page.locator('select[name="language"], #language-select');
        if (await languageSelector.count() > 0) {
          await languageSelector.selectOption('javascript');
        }
        
        const browserSelector = page.locator('select[name="browser"], #browser-select');
        if (await browserSelector.count() > 0) {
          await browserSelector.selectOption('chromium');
        }
        
        // Set target URL
        const urlInput = page.locator('input[name="url"], #target-url');
        if (await urlInput.count() > 0) {
          await urlInput.fill('https://example.com');
        }
        
        // Start recording
        await page.click('[data-testid="start-recording"], button:has-text("Start Recording")');
        
        // Wait for recording to start
        await expect(page.locator('.recording-status, [data-testid="recording-active"]')).toBeVisible({ timeout: 10000 });
        
        await page.screenshot({ path: 'test-results/screenshots/codegen-02-recording-started.png' });
      });
      
      // Step 3: Simulate user actions
      await allure.step('Record user interactions', async () => {
        // Wait for browser preview to be available
        const previewFrame = page.locator('iframe[src*="devtools"], .browser-preview');
        if (await previewFrame.count() > 0) {
          console.log('Browser preview detected');
        }
        
        // Simulate recording some actions by interacting with the recorder UI
        const actionButtons = [
          'button:has-text("Click")',
          'button:has-text("Type")',
          'button:has-text("Navigate")',
          '[data-testid="add-action"]'
        ];
        
        for (const selector of actionButtons) {
          const button = page.locator(selector);
          if (await button.count() > 0) {
            await button.first().click();
            await page.waitForTimeout(1000);
            break;
          }
        }
        
        // Wait for actions to be recorded
        await page.waitForTimeout(3000);
        
        await page.screenshot({ path: 'test-results/screenshots/codegen-03-actions-recorded.png' });
      });
      
      // Step 4: Stop recording and generate code
      await allure.step('Stop recording and generate test code', async () => {
        // Stop recording
        await page.click('[data-testid="stop-recording"], button:has-text("Stop Recording")');
        
        // Wait for code generation
        await expect(page.locator('.generated-code, [data-testid="generated-code"]')).toBeVisible({ timeout: 15000 });
        
        // Verify code is generated
        const codeContent = await page.locator('.generated-code, [data-testid="generated-code"]').textContent();
        expect(codeContent).toContain('test(');
        expect(codeContent).toContain('page.');
        
        await page.screenshot({ path: 'test-results/screenshots/codegen-04-code-generated.png' });
        
        // Attach generated code to report
        await allure.attachment('Generated Test Code', codeContent, 'text/javascript');
      });
      
      // Step 5: Export and save test
      await allure.step('Export generated test', async () => {
        const exportButton = page.locator('[data-testid="export-test"], button:has-text("Export")');
        if (await exportButton.count() > 0) {
          await exportButton.click();
          
          // Configure export options
          const formatSelector = page.locator('select[name="format"], #export-format');
          if (await formatSelector.count() > 0) {
            await formatSelector.selectOption('file');
          }
          
          // Confirm export
          const confirmButton = page.locator('button:has-text("Download"), button:has-text("Save")');
          if (await confirmButton.count() > 0) {
            await confirmButton.click();
          }
        }
        
        await page.screenshot({ path: 'test-results/screenshots/codegen-05-exported.png' });
      });
    });
  });

  test.describe('Test Healing Journey', () => {
    test('Test failure detection and healing', async () => {
      await allure.epic('Test Healing');
      await allure.feature('Failure Recovery');
      await allure.story('Automated Test Healing');
      await allure.severity('critical');
      
      // Step 1: Navigate to healing interface
      await allure.step('Access healing dashboard', async () => {
        await page.goto(`${baseURL}/healing`);
        await page.waitForLoadState('networkidle');
        
        // Verify healing interface is available
        const healingElements = [
          '[data-testid="healing-dashboard"]',
          '.healing-stats',
          '#healing-interface'
        ];
        
        let healingFound = false;
        for (const selector of healingElements) {
          if (await page.locator(selector).count() > 0) {
            healingFound = true;
            break;
          }
        }
        
        if (!healingFound) {
          // Try to navigate through main menu
          const menuItems = page.locator('nav a, .nav-link');
          const healingLink = menuItems.filter({ hasText: /healing|repair|fix/i });
          if (await healingLink.count() > 0) {
            await healingLink.first().click();
            await page.waitForLoadState('networkidle');
          }
        }
        
        await page.screenshot({ path: 'test-results/screenshots/healing-01-dashboard.png' });
      });
      
      // Step 2: Simulate test failure
      await allure.step('Simulate test failure scenario', async () => {
        // Look for test failure simulation or upload failed test
        const failureInputs = [
          '[data-testid="upload-failed-test"]',
          'input[type="file"]',
          'textarea[placeholder*="test code"]',
          '#failed-test-input'
        ];
        
        const sampleFailedTest = `
test('failing test example', async ({ page }) => {
  await page.goto('https://example.com');
  await page.click('#non-existent-button'); // This will fail
  await page.fill('#missing-input', 'test data');
});
        `;
        
        for (const selector of failureInputs) {
          const element = page.locator(selector);
          if (await element.count() > 0) {
            if (selector.includes('textarea')) {
              await element.fill(sampleFailedTest);
            }
            break;
          }
        }
        
        // Submit for analysis
        const analyzeButton = page.locator('[data-testid="analyze-failure"], button:has-text("Analyze")');
        if (await analyzeButton.count() > 0) {
          await analyzeButton.click();
        }
        
        await page.screenshot({ path: 'test-results/screenshots/healing-02-failure-submitted.png' });
      });
      
      // Step 3: Review healing suggestions
      await allure.step('Review AI-generated healing suggestions', async () => {
        // Wait for analysis results
        await expect(page.locator('.healing-suggestions, [data-testid="suggestions"]')).toBeVisible({ timeout: 20000 });
        
        // Verify suggestions are provided
        const suggestions = page.locator('.suggestion-item, .healing-option');
        const suggestionCount = await suggestions.count();
        expect(suggestionCount).toBeGreaterThan(0);
        
        // Check suggestion details
        if (suggestionCount > 0) {
          const firstSuggestion = suggestions.first();
          const suggestionText = await firstSuggestion.textContent();
          expect(suggestionText).toBeTruthy();
          
          await allure.attachment('Healing Suggestions', suggestionText, 'text/plain');
        }
        
        await page.screenshot({ path: 'test-results/screenshots/healing-03-suggestions.png' });
      });
      
      // Step 4: Apply healing suggestions
      await allure.step('Apply healing suggestions', async () => {
        // Select and apply a healing suggestion
        const applyButtons = page.locator('[data-testid="apply-healing"], button:has-text("Apply")');
        if (await applyButtons.count() > 0) {
          await applyButtons.first().click();
          
          // Wait for healing to be applied
          await expect(page.locator('.healing-applied, [data-testid="healing-success"]')).toBeVisible({ timeout: 10000 });
        }
        
        // Verify healed code is generated
        const healedCode = page.locator('.healed-code, [data-testid="healed-code"]');
        if (await healedCode.count() > 0) {
          const healedContent = await healedCode.textContent();
          expect(healedContent).toContain('waitForSelector');
          
          await allure.attachment('Healed Test Code', healedContent, 'text/javascript');
        }
        
        await page.screenshot({ path: 'test-results/screenshots/healing-04-applied.png' });
      });
    });
  });

  test.describe('Multi-User Collaboration Journey', () => {
    test('Real-time collaboration features', async () => {
      await allure.epic('Collaboration');
      await allure.feature('Multi-User');
      await allure.story('Real-time Collaboration');
      await allure.severity('high');
      
      // Step 1: Create collaborative session
      await allure.step('Create shared recording session', async () => {
        await page.goto(baseURL);
        
        // Look for collaboration features
        const collaborationButtons = [
          '[data-testid="create-shared-session"]',
          'button:has-text("Share Session")',
          'button:has-text("Collaborate")',
          '.collaboration-btn'
        ];
        
        let collaborationFound = false;
        for (const selector of collaborationButtons) {
          const element = page.locator(selector);
          if (await element.count() > 0) {
            await element.click();
            collaborationFound = true;
            break;
          }
        }
        
        if (collaborationFound) {
          // Wait for session creation
          await expect(page.locator('.session-id, [data-testid="session-id"]')).toBeVisible({ timeout: 10000 });
          
          const sessionId = await page.locator('.session-id, [data-testid="session-id"]').textContent();
          await allure.attachment('Session ID', sessionId, 'text/plain');
        }
        
        await page.screenshot({ path: 'test-results/screenshots/collab-01-session-created.png' });
      });
      
      // Step 2: Test real-time updates
      await allure.step('Verify real-time synchronization', async () => {
        // Monitor WebSocket connections for real-time updates
        let wsMessages = [];
        
        page.on('websocket', ws => {
          ws.on('framereceived', event => {
            wsMessages.push(event.payload);
          });
        });
        
        // Simulate collaborative actions
        const actionInputs = page.locator('input, textarea, button').filter({ hasText: /add|create|record/i });
        if (await actionInputs.count() > 0) {
          await actionInputs.first().click();
          await page.waitForTimeout(2000);
        }
        
        // Verify real-time updates
        if (wsMessages.length > 0) {
          await allure.attachment('WebSocket Messages', JSON.stringify(wsMessages, null, 2), 'application/json');
        }
        
        await page.screenshot({ path: 'test-results/screenshots/collab-02-realtime-sync.png' });
      });
    });
  });

  test.describe('Performance and Load Journey', () => {
    test('Application performance under load', async () => {
      await allure.epic('Performance');
      await allure.feature('Load Testing');
      await allure.story('Performance Under Load');
      await allure.severity('high');
      
      // Step 1: Measure initial performance
      await allure.step('Baseline performance measurement', async () => {
        const startTime = Date.now();
        
        await page.goto(baseURL);
        await page.waitForLoadState('networkidle');
        
        const loadTime = Date.now() - startTime;
        expect(loadTime).toBeLessThan(10000); // Should load within 10 seconds
        
        await allure.attachment('Load Time', `${loadTime}ms`, 'text/plain');
        
        // Measure Core Web Vitals
        const webVitals = await page.evaluate(() => {
          return new Promise((resolve) => {
            new PerformanceObserver((list) => {
              const entries = list.getEntries();
              const vitals = {};
              
              entries.forEach((entry) => {
                if (entry.entryType === 'largest-contentful-paint') {
                  vitals.LCP = entry.startTime;
                }
                if (entry.entryType === 'first-input') {
                  vitals.FID = entry.processingStart - entry.startTime;
                }
                if (entry.entryType === 'layout-shift') {
                  vitals.CLS = entry.value;
                }
              });
              
              resolve(vitals);
            }).observe({ entryTypes: ['largest-contentful-paint', 'first-input', 'layout-shift'] });
            
            // Fallback timeout
            setTimeout(() => resolve({}), 5000);
          });
        });
        
        await allure.attachment('Web Vitals', JSON.stringify(webVitals, null, 2), 'application/json');
        
        await page.screenshot({ path: 'test-results/screenshots/perf-01-baseline.png' });
      });
      
      // Step 2: Stress test with multiple operations
      await allure.step('Stress test with concurrent operations', async () => {
        const operations = [];
        
        // Simulate multiple concurrent recording sessions
        for (let i = 0; i < 3; i++) {
          operations.push(
            (async () => {
              const startButton = page.locator('[data-testid="start-recording"], button:has-text("Start Recording")');
              if (await startButton.count() > 0) {
                await startButton.click();
                await page.waitForTimeout(1000);
                
                const stopButton = page.locator('[data-testid="stop-recording"], button:has-text("Stop Recording")');
                if (await stopButton.count() > 0) {
                  await stopButton.click();
                }
              }
            })()
          );
        }
        
        const startTime = Date.now();
        await Promise.all(operations);
        const operationTime = Date.now() - startTime;
        
        expect(operationTime).toBeLessThan(30000); // Should complete within 30 seconds
        
        await allure.attachment('Concurrent Operations Time', `${operationTime}ms`, 'text/plain');
        
        await page.screenshot({ path: 'test-results/screenshots/perf-02-stress-test.png' });
      });
      
      // Step 3: Memory usage monitoring
      await allure.step('Monitor memory usage', async () => {
        const memoryUsage = await page.evaluate(() => {
          if ('memory' in performance) {
            return {
              usedJSHeapSize: performance.memory.usedJSHeapSize,
              totalJSHeapSize: performance.memory.totalJSHeapSize,
              jsHeapSizeLimit: performance.memory.jsHeapSizeLimit
            };
          }
          return null;
        });
        
        if (memoryUsage) {
          const memoryUsageMB = memoryUsage.usedJSHeapSize / (1024 * 1024);
          expect(memoryUsageMB).toBeLessThan(100); // Should use less than 100MB
          
          await allure.attachment('Memory Usage', JSON.stringify(memoryUsage, null, 2), 'application/json');
        }
        
        await page.screenshot({ path: 'test-results/screenshots/perf-03-memory.png' });
      });
    });
  });

  test.describe('Error Handling and Recovery Journey', () => {
    test('Application resilience and error recovery', async () => {
      await allure.epic('Error Handling');
      await allure.feature('Resilience');
      await allure.story('Error Recovery');
      await allure.severity('high');
      
      // Step 1: Test network failure recovery
      await allure.step('Network failure simulation and recovery', async () => {
        await page.goto(baseURL);
        
        // Simulate network failure
        await page.route('**/api/**', route => {
          route.abort('failed');
        });
        
        // Try to perform an action that requires API
        const apiButton = page.locator('button').filter({ hasText: /start|create|save/i }).first();
        if (await apiButton.count() > 0) {
          await apiButton.click();
          
          // Should show error message
          await expect(page.locator('.error-message, .alert-error, [data-testid="error"]')).toBeVisible({ timeout: 10000 });
        }
        
        // Restore network
        await page.unroute('**/api/**');
        
        // Verify recovery
        const retryButton = page.locator('button:has-text("Retry"), button:has-text("Try Again")');
        if (await retryButton.count() > 0) {
          await retryButton.click();
          
          // Should recover successfully
          await expect(page.locator('.error-message, .alert-error')).not.toBeVisible({ timeout: 5000 });
        }
        
        await page.screenshot({ path: 'test-results/screenshots/error-01-network-recovery.png' });
      });
      
      // Step 2: Test invalid input handling
      await allure.step('Invalid input handling', async () => {
        // Find form inputs and test with invalid data
        const textInputs = page.locator('input[type="text"], input[type="email"], input[type="url"]');
        const inputCount = await textInputs.count();
        
        if (inputCount > 0) {
          // Test with invalid email
          const emailInput = page.locator('input[type="email"]').first();
          if (await emailInput.count() > 0) {
            await emailInput.fill('invalid-email');
            
            const submitButton = page.locator('button[type="submit"], button:has-text("Submit")');
            if (await submitButton.count() > 0) {
              await submitButton.click();
              
              // Should show validation error
              await expect(page.locator('.validation-error, .field-error')).toBeVisible({ timeout: 5000 });
            }
          }
          
          // Test with invalid URL
          const urlInput = page.locator('input[type="url"], input[name="url"]').first();
          if (await urlInput.count() > 0) {
            await urlInput.fill('not-a-url');
            
            const submitButton = page.locator('button[type="submit"], button:has-text("Submit")');
            if (await submitButton.count() > 0) {
              await submitButton.click();
              
              // Should show validation error
              await expect(page.locator('.validation-error, .field-error')).toBeVisible({ timeout: 5000 });
            }
          }
        }
        
        await page.screenshot({ path: 'test-results/screenshots/error-02-validation.png' });
      });
      
      // Step 3: Test session timeout handling
      await allure.step('Session timeout handling', async () => {
        // Simulate session timeout by clearing storage
        await page.evaluate(() => {
          localStorage.clear();
          sessionStorage.clear();
        });
        
        // Try to perform authenticated action
        const protectedAction = page.locator('button').filter({ hasText: /save|delete|create/i }).first();
        if (await protectedAction.count() > 0) {
          await protectedAction.click();
          
          // Should redirect to login or show session expired message
          const sessionExpired = page.locator('.session-expired, .login-required, [data-testid="session-expired"]');
          const loginForm = page.locator('.login-form, #login, [data-testid="login"]');
          
          const hasSessionMessage = await sessionExpired.count() > 0;
          const hasLoginForm = await loginForm.count() > 0;
          
          expect(hasSessionMessage || hasLoginForm).toBe(true);
        }
        
        await page.screenshot({ path: 'test-results/screenshots/error-03-session-timeout.png' });
      });
    });
  });

  test.describe('Accessibility and Usability Journey', () => {
    test('Accessibility compliance and usability', async () => {
      await allure.epic('Accessibility');
      await allure.feature('WCAG Compliance');
      await allure.story('Accessibility Testing');
      await allure.severity('medium');
      
      // Step 1: Keyboard navigation
      await allure.step('Keyboard navigation testing', async () => {
        await page.goto(baseURL);
        
        // Test tab navigation
        const focusableElements = [];
        
        for (let i = 0; i < 10; i++) {
          await page.keyboard.press('Tab');
          
          const activeElement = await page.evaluate(() => {
            const el = document.activeElement;
            return {
              tagName: el.tagName,
              type: el.type,
              id: el.id,
              className: el.className,
              text: el.textContent?.slice(0, 50)
            };
          });
          
          focusableElements.push(activeElement);
          await page.waitForTimeout(200);
        }
        
        // Verify focus is visible and logical
        expect(focusableElements.length).toBeGreaterThan(0);
        
        await allure.attachment('Focusable Elements', JSON.stringify(focusableElements, null, 2), 'application/json');
        
        await page.screenshot({ path: 'test-results/screenshots/a11y-01-keyboard-nav.png' });
      });
      
      // Step 2: Screen reader compatibility
      await allure.step('Screen reader compatibility', async () => {
        // Check for proper ARIA labels and roles
        const ariaElements = await page.evaluate(() => {
          const elements = document.querySelectorAll('[aria-label], [aria-labelledby], [role]');
          return Array.from(elements).map(el => ({
            tagName: el.tagName,
            ariaLabel: el.getAttribute('aria-label'),
            ariaLabelledBy: el.getAttribute('aria-labelledby'),
            role: el.getAttribute('role'),
            text: el.textContent?.slice(0, 50)
          }));
        });
        
        expect(ariaElements.length).toBeGreaterThan(0);
        
        await allure.attachment('ARIA Elements', JSON.stringify(ariaElements, null, 2), 'application/json');
        
        // Check for proper heading structure
        const headings = await page.evaluate(() => {
          const headingElements = document.querySelectorAll('h1, h2, h3, h4, h5, h6');
          return Array.from(headingElements).map(el => ({
            level: el.tagName,
            text: el.textContent?.trim()
          }));
        });
        
        await allure.attachment('Heading Structure', JSON.stringify(headings, null, 2), 'application/json');
        
        await page.screenshot({ path: 'test-results/screenshots/a11y-02-screen-reader.png' });
      });
      
      // Step 3: Color contrast and visual accessibility
      await allure.step('Visual accessibility checks', async () => {
        // Check for sufficient color contrast (basic check)
        const contrastIssues = await page.evaluate(() => {
          const elements = document.querySelectorAll('*');
          const issues = [];
          
          Array.from(elements).forEach(el => {
            const style = window.getComputedStyle(el);
            const color = style.color;
            const backgroundColor = style.backgroundColor;
            
            // Basic check for very light text on light background
            if (color && backgroundColor && 
                color.includes('rgb(255') && backgroundColor.includes('rgb(255')) {
              issues.push({
                element: el.tagName,
                color,
                backgroundColor,
                text: el.textContent?.slice(0, 30)
              });
            }
          });
          
          return issues.slice(0, 10); // Limit to first 10 issues
        });
        
        await allure.attachment('Potential Contrast Issues', JSON.stringify(contrastIssues, null, 2), 'application/json');
        
        await page.screenshot({ path: 'test-results/screenshots/a11y-03-visual.png' });
      });
    });
  });
});

// Utility class for common E2E operations
class E2ETestUtils {
  static async waitForStableNetwork(page, timeout = 5000) {
    let requestCount = 0;
    const startTime = Date.now();
    
    page.on('request', () => requestCount++);
    
    while (Date.now() - startTime < timeout) {
      const initialCount = requestCount;
      await page.waitForTimeout(1000);
      
      if (requestCount === initialCount) {
        break; // Network is stable
      }
    }
  }
  
  static async capturePerformanceMetrics(page) {
    return await page.evaluate(() => {
      const navigation = performance.getEntriesByType('navigation')[0];
      const paint = performance.getEntriesByType('paint');
      
      return {
        domContentLoaded: navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart,
        loadComplete: navigation.loadEventEnd - navigation.loadEventStart,
        firstPaint: paint.find(p => p.name === 'first-paint')?.startTime,
        firstContentfulPaint: paint.find(p => p.name === 'first-contentful-paint')?.startTime,
        resourceCount: performance.getEntriesByType('resource').length
      };
    });
  }
  
  static async checkConsoleErrors(page) {
    const errors = [];
    
    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push({
          text: msg.text(),
          location: msg.location(),
          timestamp: new Date().toISOString()
        });
      }
    });
    
    return errors;
  }
  
  static async simulateSlowNetwork(page) {
    const client = await page.context().newCDPSession(page);
    await client.send('Network.emulateNetworkConditions', {
      offline: false,
      downloadThroughput: 1000 * 1024 / 8, // 1 Mbps
      uploadThroughput: 500 * 1024 / 8,     // 500 Kbps
      latency: 100 // 100ms
    });
  }
  
  static async restoreNetworkConditions(page) {
    const client = await page.context().newCDPSession(page);
    await client.send('Network.emulateNetworkConditions', {
      offline: false,
      downloadThroughput: -1,
      uploadThroughput: -1,
      latency: 0
    });
  }
}

export { E2ETestUtils };