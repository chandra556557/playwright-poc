import { test, expect } from '@playwright/test';
import { allure } from 'allure-playwright';

/**
 * Performance and Load Testing Suite
 * 
 * This test suite focuses on:
 * - Concurrent recording sessions
 * - WebSocket connection limits
 * - Memory usage under load
 * - API response times
 * - Browser resource management
 */

test.describe('Performance Load Testing', () => {
  const MAX_CONCURRENT_SESSIONS = 10;
  const LOAD_TEST_DURATION = 30000; // 30 seconds
  const baseURL = process.env.APP_BASE_URL || 'http://localhost:5173';
  
  let contexts = [];
  let pages = [];
  
  test.beforeAll(async ({ browser }) => {
    // Create multiple browser contexts for concurrent testing
    for (let i = 0; i < MAX_CONCURRENT_SESSIONS; i++) {
      const context = await browser.newContext({
        viewport: { width: 1280, height: 720 },
        extraHTTPHeaders: {
          'X-Test-Session': `load-test-${i}`,
          'X-Test-Type': 'performance'
        }
      });
      
      const page = await context.newPage();
      
      // Monitor performance for each page
      page.on('console', msg => {
        if (msg.type() === 'error') {
          console.error(`Session ${i} Console Error:`, msg.text());
        }
      });
      
      contexts.push(context);
      pages.push(page);
    }
  });
  
  test.afterAll(async () => {
    // Clean up all contexts
    for (const context of contexts) {
      await context.close();
    }
  });
  
  test.describe('Concurrent Recording Sessions', () => {
    test('Handle multiple simultaneous recording sessions', async () => {
      await allure.epic('Performance');
      await allure.feature('Concurrent Sessions');
      await allure.story('Multiple Recording Sessions');
      await allure.severity('critical');
      
      const sessionMetrics = [];
      const startTime = Date.now();
      
      // Step 1: Initialize all sessions
      await allure.step('Initialize concurrent recording sessions', async () => {
        const initPromises = pages.map(async (page, index) => {
          const sessionStart = Date.now();
          
          try {
            await page.goto(baseURL, { timeout: 30000 });
            await page.waitForLoadState('networkidle', { timeout: 20000 });
            
            const initTime = Date.now() - sessionStart;
            
            sessionMetrics.push({
              sessionId: index,
              initTime,
              status: 'initialized'
            });
            
            return { success: true, sessionId: index, initTime };
          } catch (error) {
            sessionMetrics.push({
              sessionId: index,
              initTime: Date.now() - sessionStart,
              status: 'failed',
              error: error.message
            });
            
            return { success: false, sessionId: index, error: error.message };
          }
        });
        
        const results = await Promise.allSettled(initPromises);
        const successfulSessions = results.filter(r => r.status === 'fulfilled' && r.value.success).length;
        
        expect(successfulSessions).toBeGreaterThan(MAX_CONCURRENT_SESSIONS * 0.8); // At least 80% should succeed
        
        await allure.attachment('Session Initialization Metrics', JSON.stringify(sessionMetrics, null, 2), 'application/json');
      });
      
      // Step 2: Start concurrent recording sessions
      await allure.step('Start concurrent recording operations', async () => {
        const recordingPromises = pages.map(async (page, index) => {
          const recordingStart = Date.now();
          
          try {
            // Look for recording start button
            const startSelectors = [
              '[data-testid="start-recording"]',
              'button:has-text("Start Recording")',
              '.start-recording-btn',
              '#start-recording'
            ];
            
            let startButton = null;
            for (const selector of startSelectors) {
              const element = page.locator(selector);
              if (await element.count() > 0) {
                startButton = element.first();
                break;
              }
            }
            
            if (startButton) {
              // Configure recording settings
              const languageSelect = page.locator('select[name="language"], #language-select');
              if (await languageSelect.count() > 0) {
                await languageSelect.selectOption('javascript');
              }
              
              const urlInput = page.locator('input[name="url"], #target-url');
              if (await urlInput.count() > 0) {
                await urlInput.fill(`https://example.com/session-${index}`);
              }
              
              // Start recording
              await startButton.click();
              
              // Wait for recording to start
              await page.waitForSelector('.recording-status, [data-testid="recording-active"]', { timeout: 10000 });
              
              const recordingTime = Date.now() - recordingStart;
              
              return {
                success: true,
                sessionId: index,
                recordingTime,
                status: 'recording'
              };
            } else {
              throw new Error('Recording start button not found');
            }
          } catch (error) {
            return {
              success: false,
              sessionId: index,
              recordingTime: Date.now() - recordingStart,
              error: error.message
            };
          }
        });
        
        const recordingResults = await Promise.allSettled(recordingPromises);
        const successfulRecordings = recordingResults.filter(r => r.status === 'fulfilled' && r.value.success).length;
        
        expect(successfulRecordings).toBeGreaterThan(MAX_CONCURRENT_SESSIONS * 0.7); // At least 70% should start recording
        
        const recordingMetrics = recordingResults.map(r => r.status === 'fulfilled' ? r.value : { error: r.reason });
        await allure.attachment('Recording Start Metrics', JSON.stringify(recordingMetrics, null, 2), 'application/json');
      });
      
      // Step 3: Simulate concurrent user actions
      await allure.step('Simulate concurrent user interactions', async () => {
        const actionPromises = pages.map(async (page, index) => {
          const actions = [];
          const actionStart = Date.now();
          
          try {
            // Simulate various user actions during recording
            const actionTypes = [
              { type: 'click', selector: 'button, a, .clickable' },
              { type: 'type', selector: 'input[type="text"], textarea', value: `test-data-${index}` },
              { type: 'select', selector: 'select', value: 'option-1' }
            ];
            
            for (const actionType of actionTypes) {
              try {
                const elements = page.locator(actionType.selector);
                const count = await elements.count();
                
                if (count > 0) {
                  const element = elements.first();
                  
                  switch (actionType.type) {
                    case 'click':
                      await element.click({ timeout: 5000 });
                      break;
                    case 'type':
                      await element.fill(actionType.value, { timeout: 5000 });
                      break;
                    case 'select':
                      await element.selectOption({ index: 0 }, { timeout: 5000 });
                      break;
                  }
                  
                  actions.push({ type: actionType.type, success: true });
                  await page.waitForTimeout(500); // Small delay between actions
                }
              } catch (actionError) {
                actions.push({ type: actionType.type, success: false, error: actionError.message });
              }
            }
            
            const actionTime = Date.now() - actionStart;
            
            return {
              sessionId: index,
              actions,
              actionTime,
              success: true
            };
          } catch (error) {
            return {
              sessionId: index,
              actions,
              actionTime: Date.now() - actionStart,
              success: false,
              error: error.message
            };
          }
        });
        
        const actionResults = await Promise.allSettled(actionPromises);
        const actionMetrics = actionResults.map(r => r.status === 'fulfilled' ? r.value : { error: r.reason });
        
        await allure.attachment('User Action Metrics', JSON.stringify(actionMetrics, null, 2), 'application/json');
      });
      
      // Step 4: Stop all recording sessions
      await allure.step('Stop concurrent recording sessions', async () => {
        const stopPromises = pages.map(async (page, index) => {
          const stopStart = Date.now();
          
          try {
            const stopButton = page.locator('[data-testid="stop-recording"], button:has-text("Stop Recording")');
            
            if (await stopButton.count() > 0) {
              await stopButton.click();
              
              // Wait for code generation
              await page.waitForSelector('.generated-code, [data-testid="generated-code"]', { timeout: 15000 });
              
              const stopTime = Date.now() - stopStart;
              
              return {
                sessionId: index,
                stopTime,
                success: true
              };
            } else {
              throw new Error('Stop button not found');
            }
          } catch (error) {
            return {
              sessionId: index,
              stopTime: Date.now() - stopStart,
              success: false,
              error: error.message
            };
          }
        });
        
        const stopResults = await Promise.allSettled(stopPromises);
        const stopMetrics = stopResults.map(r => r.status === 'fulfilled' ? r.value : { error: r.reason });
        
        await allure.attachment('Recording Stop Metrics', JSON.stringify(stopMetrics, null, 2), 'application/json');
      });
      
      const totalTime = Date.now() - startTime;
      expect(totalTime).toBeLessThan(120000); // Should complete within 2 minutes
      
      await allure.attachment('Total Test Duration', `${totalTime}ms`, 'text/plain');
    });
  });
  
  test.describe('WebSocket Connection Load', () => {
    test('Handle multiple WebSocket connections', async () => {
      await allure.epic('Performance');
      await allure.feature('WebSocket Load');
      await allure.story('Concurrent WebSocket Connections');
      await allure.severity('high');
      
      const wsConnections = [];
      const wsMetrics = [];
      
      // Step 1: Establish multiple WebSocket connections
      await allure.step('Establish concurrent WebSocket connections', async () => {
        const connectionPromises = pages.map(async (page, index) => {
          const connectionStart = Date.now();
          let wsConnected = false;
          let messageCount = 0;
          
          // Monitor WebSocket connections
          page.on('websocket', ws => {
            wsConnected = true;
            wsConnections.push({ sessionId: index, ws });
            
            ws.on('framereceived', () => {
              messageCount++;
            });
            
            ws.on('framesent', () => {
              messageCount++;
            });
          });
          
          try {
            await page.goto(baseURL);
            await page.waitForLoadState('networkidle');
            
            // Wait for WebSocket connection
            await page.waitForTimeout(3000);
            
            const connectionTime = Date.now() - connectionStart;
            
            wsMetrics.push({
              sessionId: index,
              connected: wsConnected,
              connectionTime,
              messageCount
            });
            
            return { success: wsConnected, sessionId: index };
          } catch (error) {
            wsMetrics.push({
              sessionId: index,
              connected: false,
              connectionTime: Date.now() - connectionStart,
              error: error.message
            });
            
            return { success: false, sessionId: index, error: error.message };
          }
        });
        
        await Promise.allSettled(connectionPromises);
        
        const connectedSessions = wsMetrics.filter(m => m.connected).length;
        expect(connectedSessions).toBeGreaterThan(MAX_CONCURRENT_SESSIONS * 0.8);
        
        await allure.attachment('WebSocket Connection Metrics', JSON.stringify(wsMetrics, null, 2), 'application/json');
      });
      
      // Step 2: Test message throughput
      await allure.step('Test WebSocket message throughput', async () => {
        const messagePromises = pages.map(async (page, index) => {
          const messageStart = Date.now();
          let sentMessages = 0;
          let receivedMessages = 0;
          
          try {
            // Simulate sending messages through UI interactions
            const interactiveElements = page.locator('button, input, select');
            const elementCount = await interactiveElements.count();
            
            if (elementCount > 0) {
              for (let i = 0; i < Math.min(5, elementCount); i++) {
                await interactiveElements.nth(i).click({ timeout: 2000 });
                sentMessages++;
                await page.waitForTimeout(200);
              }
            }
            
            const messageTime = Date.now() - messageStart;
            
            return {
              sessionId: index,
              sentMessages,
              receivedMessages,
              messageTime,
              throughput: sentMessages / (messageTime / 1000) // messages per second
            };
          } catch (error) {
            return {
              sessionId: index,
              sentMessages,
              receivedMessages,
              messageTime: Date.now() - messageStart,
              error: error.message
            };
          }
        });
        
        const messageResults = await Promise.allSettled(messagePromises);
        const throughputMetrics = messageResults.map(r => r.status === 'fulfilled' ? r.value : { error: r.reason });
        
        await allure.attachment('WebSocket Throughput Metrics', JSON.stringify(throughputMetrics, null, 2), 'application/json');
      });
    });
  });
  
  test.describe('Memory and Resource Usage', () => {
    test('Monitor memory usage under load', async () => {
      await allure.epic('Performance');
      await allure.feature('Resource Usage');
      await allure.story('Memory Usage Under Load');
      await allure.severity('high');
      
      const memorySnapshots = [];
      
      // Step 1: Baseline memory measurement
      await allure.step('Measure baseline memory usage', async () => {
        const baselinePromises = pages.slice(0, 3).map(async (page, index) => {
          await page.goto(baseURL);
          await page.waitForLoadState('networkidle');
          
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
            memorySnapshots.push({
              sessionId: index,
              phase: 'baseline',
              timestamp: Date.now(),
              ...memoryUsage
            });
          }
          
          return memoryUsage;
        });
        
        await Promise.all(baselinePromises);
        
        await allure.attachment('Baseline Memory Usage', JSON.stringify(memorySnapshots, null, 2), 'application/json');
      });
      
      // Step 2: Memory usage during load
      await allure.step('Monitor memory during concurrent operations', async () => {
        const loadTestPromises = pages.slice(0, 5).map(async (page, index) => {
          // Perform memory-intensive operations
          for (let i = 0; i < 10; i++) {
            try {
              // Simulate recording actions that might consume memory
              const buttons = page.locator('button');
              const buttonCount = await buttons.count();
              
              if (buttonCount > 0) {
                await buttons.nth(i % buttonCount).click({ timeout: 1000 });
              }
              
              // Take memory snapshot every few iterations
              if (i % 3 === 0) {
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
                  memorySnapshots.push({
                    sessionId: index,
                    phase: 'load',
                    iteration: i,
                    timestamp: Date.now(),
                    ...memoryUsage
                  });
                }
              }
              
              await page.waitForTimeout(500);
            } catch (error) {
              console.error(`Memory test error for session ${index}:`, error.message);
            }
          }
        });
        
        await Promise.allSettled(loadTestPromises);
        
        // Analyze memory growth
        const memoryGrowth = memorySnapshots.reduce((acc, snapshot) => {
          if (!acc[snapshot.sessionId]) {
            acc[snapshot.sessionId] = { baseline: null, peak: 0, growth: 0 };
          }
          
          if (snapshot.phase === 'baseline') {
            acc[snapshot.sessionId].baseline = snapshot.usedJSHeapSize;
          } else {
            acc[snapshot.sessionId].peak = Math.max(acc[snapshot.sessionId].peak, snapshot.usedJSHeapSize);
          }
          
          if (acc[snapshot.sessionId].baseline) {
            acc[snapshot.sessionId].growth = acc[snapshot.sessionId].peak - acc[snapshot.sessionId].baseline;
          }
          
          return acc;
        }, {});
        
        await allure.attachment('Memory Growth Analysis', JSON.stringify(memoryGrowth, null, 2), 'application/json');
        await allure.attachment('Memory Snapshots', JSON.stringify(memorySnapshots, null, 2), 'application/json');
        
        // Verify memory usage is within acceptable limits
        Object.values(memoryGrowth).forEach(growth => {
          if (growth.baseline && growth.growth > 0) {
            const growthPercentage = (growth.growth / growth.baseline) * 100;
            expect(growthPercentage).toBeLessThan(200); // Memory shouldn't grow more than 200%
          }
        });
      });
    });
  });
  
  test.describe('API Response Time Under Load', () => {
    test('Measure API performance with concurrent requests', async () => {
      await allure.epic('Performance');
      await allure.feature('API Performance');
      await allure.story('Concurrent API Requests');
      await allure.severity('high');
      
      const apiMetrics = [];
      
      // Step 1: Test API endpoints under load
      await allure.step('Concurrent API request testing', async () => {
        const apiEndpoints = [
          '/api/codegen/status',
          '/api/tests',
          '/api/test-suites',
          '/api/health'
        ];
        
        const requestPromises = [];
        
        // Create multiple concurrent requests to each endpoint
        for (const endpoint of apiEndpoints) {
          for (let i = 0; i < 5; i++) {
            requestPromises.push(
              (async () => {
                const requestStart = Date.now();
                
                try {
                  const response = await pages[0].request.get(`${baseURL}${endpoint}`, {
                    timeout: 10000
                  });
                  
                  const responseTime = Date.now() - requestStart;
                  
                  return {
                    endpoint,
                    requestId: i,
                    responseTime,
                    status: response.status(),
                    success: response.ok()
                  };
                } catch (error) {
                  return {
                    endpoint,
                    requestId: i,
                    responseTime: Date.now() - requestStart,
                    success: false,
                    error: error.message
                  };
                }
              })()
            );
          }
        }
        
        const results = await Promise.allSettled(requestPromises);
        const apiResults = results.map(r => r.status === 'fulfilled' ? r.value : { error: r.reason });
        
        // Analyze response times
        const responseTimeStats = apiResults.reduce((acc, result) => {
          if (result.success && result.responseTime) {
            if (!acc[result.endpoint]) {
              acc[result.endpoint] = { times: [], avg: 0, min: Infinity, max: 0 };
            }
            
            acc[result.endpoint].times.push(result.responseTime);
            acc[result.endpoint].min = Math.min(acc[result.endpoint].min, result.responseTime);
            acc[result.endpoint].max = Math.max(acc[result.endpoint].max, result.responseTime);
          }
          
          return acc;
        }, {});
        
        // Calculate averages
        Object.keys(responseTimeStats).forEach(endpoint => {
          const stats = responseTimeStats[endpoint];
          stats.avg = stats.times.reduce((sum, time) => sum + time, 0) / stats.times.length;
        });
        
        await allure.attachment('API Response Time Stats', JSON.stringify(responseTimeStats, null, 2), 'application/json');
        await allure.attachment('All API Results', JSON.stringify(apiResults, null, 2), 'application/json');
        
        // Verify response times are acceptable
        Object.values(responseTimeStats).forEach(stats => {
          expect(stats.avg).toBeLessThan(5000); // Average response time should be under 5 seconds
          expect(stats.max).toBeLessThan(10000); // Max response time should be under 10 seconds
        });
      });
    });
  });
});

// Performance testing utilities
class PerformanceTestUtils {
  static async measurePageLoadTime(page, url) {
    const startTime = Date.now();
    
    await page.goto(url);
    await page.waitForLoadState('networkidle');
    
    const loadTime = Date.now() - startTime;
    
    const performanceMetrics = await page.evaluate(() => {
      const navigation = performance.getEntriesByType('navigation')[0];
      return {
        domContentLoaded: navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart,
        loadComplete: navigation.loadEventEnd - navigation.loadEventStart,
        firstByte: navigation.responseStart - navigation.requestStart,
        domInteractive: navigation.domInteractive - navigation.navigationStart
      };
    });
    
    return {
      totalLoadTime: loadTime,
      ...performanceMetrics
    };
  }
  
  static async monitorResourceUsage(page, duration = 10000) {
    const snapshots = [];
    const startTime = Date.now();
    
    while (Date.now() - startTime < duration) {
      const snapshot = await page.evaluate(() => {
        const memory = 'memory' in performance ? {
          usedJSHeapSize: performance.memory.usedJSHeapSize,
          totalJSHeapSize: performance.memory.totalJSHeapSize
        } : null;
        
        const resources = performance.getEntriesByType('resource').length;
        
        return {
          timestamp: Date.now(),
          memory,
          resourceCount: resources
        };
      });
      
      snapshots.push(snapshot);
      await page.waitForTimeout(1000);
    }
    
    return snapshots;
  }
  
  static calculateThroughput(operations, duration) {
    return {
      operationsPerSecond: operations / (duration / 1000),
      averageOperationTime: duration / operations
    };
  }
  
  static analyzeResponseTimes(responseTimes) {
    const sorted = responseTimes.sort((a, b) => a - b);
    const length = sorted.length;
    
    return {
      min: sorted[0],
      max: sorted[length - 1],
      avg: sorted.reduce((sum, time) => sum + time, 0) / length,
      median: length % 2 === 0 
        ? (sorted[length / 2 - 1] + sorted[length / 2]) / 2
        : sorted[Math.floor(length / 2)],
      p95: sorted[Math.floor(length * 0.95)],
      p99: sorted[Math.floor(length * 0.99)]
    };
  }
}

export { PerformanceTestUtils };