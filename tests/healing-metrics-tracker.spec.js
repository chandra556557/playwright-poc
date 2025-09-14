import { test, expect } from '@playwright/test';
import { allure } from 'allure-playwright';

// AI Healing Strategy Success Rate Tracker
test.describe('AI Healing Strategy Metrics & Success Rate Analysis', () => {
  let page;
  let context;
  let healingMetrics = {
    totalAttempts: 0,
    successfulHealing: 0,
    failedHealing: 0,
    strategySuccessRates: {
      SemanticTextStrategy: { attempts: 0, successes: 0 },
      AttributeRelaxationStrategy: { attempts: 0, successes: 0 },
      RoleAccessibleNameStrategy: { attempts: 0, successes: 0 },
      TextFuzzyMatchStrategy: { attempts: 0, successes: 0 },
      AnchorProximityStrategy: { attempts: 0, successes: 0 },
      VisualSimilarityStrategy: { attempts: 0, successes: 0 }
    },
    healingTimes: [],
    elementTypes: {}
  };
  
  test.beforeAll(async ({ browser }) => {
    context = await browser.newContext({
      viewport: { width: 1920, height: 1080 }
    });
    page = await context.newPage();
  });

  test.afterAll(async () => {
    // Generate comprehensive healing metrics report
    await generateHealingReport();
    await context.close();
  });

  // Enhanced healing strategy with detailed tracking
  async function applyHealingStrategyWithTracking(strategyName, page, originalSelector, context) {
    const startTime = Date.now();
    healingMetrics.strategySuccessRates[strategyName].attempts++;
    
    await allure.step(`Applying ${strategyName}`, async () => {
      console.log(`🔧 Applying ${strategyName} for selector: ${originalSelector}`);
    });
    
    let healedSelector = null;
    
    try {
      switch (strategyName) {
        case 'SemanticTextStrategy':
          if (context.expectedText) {
            const textSelectors = [
              `text=${context.expectedText}`,
              `[aria-label*="${context.expectedText}" i]`,
              `[title*="${context.expectedText}" i]`,
              `[placeholder*="${context.expectedText}" i]`,
              `*:has-text("${context.expectedText}")`
            ];
            
            for (const selector of textSelectors) {
              try {
                if (await page.locator(selector).count() > 0) {
                  healedSelector = selector;
                  break;
                }
              } catch (e) { /* ignore */ }
            }
          }
          break;
          
        case 'AttributeRelaxationStrategy':
          const relaxedSelectors = [
            originalSelector.replace(/\[([^=]+)="([^"]+)"\]/g, '[class*="$2" i]'),
            originalSelector.replace(/\[([^=]+)="([^"]+)"\]/g, '[id*="$2" i]'),
            originalSelector.replace(/\[([^=]+)="([^"]+)"\]/g, '[data-*="$2" i]'),
            originalSelector.replace(/#([\w-]+)/, '[id*="$1" i]'),
            originalSelector.replace(/\.([\w-]+)/, '[class*="$1" i]')
          ];
          
          for (const selector of relaxedSelectors) {
            try {
              if (await page.locator(selector).count() > 0) {
                healedSelector = selector;
                break;
              }
            } catch (e) { /* ignore */ }
          }
          break;
          
        case 'RoleAccessibleNameStrategy':
          if (context.role) {
            const roleSelectors = [
              `[role="${context.role}"]`,
              `${context.role}`,
              `[aria-label*="${context.role}" i]`
            ];
            
            for (const selector of roleSelectors) {
              try {
                if (await page.locator(selector).count() > 0) {
                  healedSelector = selector;
                  break;
                }
              } catch (e) { /* ignore */ }
            }
          }
          break;
          
        case 'TextFuzzyMatchStrategy':
          if (context.expectedText) {
            const fuzzySelectors = [
              `*:has-text("${context.expectedText.substring(0, 5)}")`,
              `[alt*="${context.expectedText}" i]`,
              `[value*="${context.expectedText}" i]`
            ];
            
            for (const selector of fuzzySelectors) {
              try {
                if (await page.locator(selector).count() > 0) {
                  healedSelector = selector;
                  break;
                }
              } catch (e) { /* ignore */ }
            }
          }
          break;
          
        case 'AnchorProximityStrategy':
          const proximitySelectors = [
            `${originalSelector} ~ *`,
            `${originalSelector} + *`,
            `* >> ${originalSelector}`,
            `${originalSelector}:visible`
          ];
          
          for (const selector of proximitySelectors) {
            try {
              if (await page.locator(selector).count() > 0) {
                healedSelector = selector;
                break;
              }
            } catch (e) { /* ignore */ }
          }
          break;
          
        case 'VisualSimilarityStrategy':
          const visualSelectors = [
            `${originalSelector}:visible`,
            `${originalSelector}[style*="display"]`,
            `${originalSelector}:not([hidden])`
          ];
          
          for (const selector of visualSelectors) {
            try {
              if (await page.locator(selector).count() > 0) {
                healedSelector = selector;
                break;
              }
            } catch (e) { /* ignore */ }
          }
          break;
      }
      
      const healingTime = Date.now() - startTime;
      healingMetrics.healingTimes.push(healingTime);
      
      if (healedSelector) {
        healingMetrics.strategySuccessRates[strategyName].successes++;
        healingMetrics.successfulHealing++;
        
        await allure.step(`✅ ${strategyName} SUCCESS`, async () => {
          await allure.attachment('Healed Selector', healedSelector, 'text/plain');
          await allure.attachment('Healing Time (ms)', healingTime.toString(), 'text/plain');
          console.log(`✅ ${strategyName} SUCCESS: ${healedSelector} (${healingTime}ms)`);
        });
        
        return healedSelector;
      } else {
        healingMetrics.failedHealing++;
        
        await allure.step(`❌ ${strategyName} FAILED`, async () => {
          await allure.attachment('Original Selector', originalSelector, 'text/plain');
          await allure.attachment('Healing Time (ms)', healingTime.toString(), 'text/plain');
          console.log(`❌ ${strategyName} FAILED for: ${originalSelector} (${healingTime}ms)`);
        });
      }
      
    } catch (error) {
      healingMetrics.failedHealing++;
      console.log(`❌ ${strategyName} ERROR: ${error.message}`);
    }
    
    return null;
  }

  // Enhanced element finder with comprehensive tracking
  async function findElementWithHealingTracking(originalSelector, context = {}) {
    healingMetrics.totalAttempts++;
    
    await allure.step(`🔍 AI Element Detection: ${originalSelector}`, async () => {
      console.log(`🔍 AI Element Detection: ${originalSelector}`);
    });
    
    // Track element type
    const elementType = originalSelector.split(/[\[\]#\.\s]/)[0] || 'unknown';
    healingMetrics.elementTypes[elementType] = (healingMetrics.elementTypes[elementType] || 0) + 1;
    
    // First try the original selector
    let element = page.locator(originalSelector);
    
    if (await element.count() > 0) {
      await allure.step('✅ Original selector worked', async () => {
        console.log('✅ Original selector worked - no healing needed');
      });
      return element;
    }
    
    await allure.step('🔄 Applying AI healing strategies', async () => {
      console.log('🔄 Original selector failed, applying AI healing strategies');
    });
    
    // Define healing strategies with priorities
    const healingStrategies = [
      { name: 'SemanticTextStrategy', priority: 1 },
      { name: 'AttributeRelaxationStrategy', priority: 2 },
      { name: 'RoleAccessibleNameStrategy', priority: 3 },
      { name: 'TextFuzzyMatchStrategy', priority: 4 },
      { name: 'AnchorProximityStrategy', priority: 5 },
      { name: 'VisualSimilarityStrategy', priority: 6 }
    ];
    
    // Apply healing strategies in order of priority
    for (const strategy of healingStrategies) {
      const healedSelector = await applyHealingStrategyWithTracking(
        strategy.name,
        page, 
        originalSelector, 
        context
      );
      
      if (healedSelector) {
        element = page.locator(healedSelector);
        if (await element.count() > 0) {
          return element;
        }
      }
    }
    
    await allure.step('❌ All healing strategies failed', async () => {
      console.log('❌ All healing strategies failed');
    });
    
    // Return original element for graceful handling
    return page.locator(originalSelector);
  }

  // Generate comprehensive healing metrics report
  async function generateHealingReport() {
    const overallSuccessRate = healingMetrics.totalAttempts > 0 
      ? ((healingMetrics.successfulHealing / healingMetrics.totalAttempts) * 100).toFixed(2)
      : 0;
    
    const avgHealingTime = healingMetrics.healingTimes.length > 0
      ? (healingMetrics.healingTimes.reduce((a, b) => a + b, 0) / healingMetrics.healingTimes.length).toFixed(2)
      : 0;
    
    const report = {
      summary: {
        totalAttempts: healingMetrics.totalAttempts,
        successfulHealing: healingMetrics.successfulHealing,
        failedHealing: healingMetrics.failedHealing,
        overallSuccessRate: `${overallSuccessRate}%`,
        averageHealingTime: `${avgHealingTime}ms`
      },
      strategyPerformance: {},
      elementTypeBreakdown: healingMetrics.elementTypes,
      healingTimeDistribution: {
        min: Math.min(...healingMetrics.healingTimes) || 0,
        max: Math.max(...healingMetrics.healingTimes) || 0,
        average: avgHealingTime
      }
    };
    
    // Calculate individual strategy success rates
    for (const [strategyName, stats] of Object.entries(healingMetrics.strategySuccessRates)) {
      const successRate = stats.attempts > 0 
        ? ((stats.successes / stats.attempts) * 100).toFixed(2)
        : 0;
      
      report.strategyPerformance[strategyName] = {
        attempts: stats.attempts,
        successes: stats.successes,
        successRate: `${successRate}%`
      };
    }
    
    await allure.step('📊 AI Healing Strategy Performance Report', async () => {
      await allure.attachment('Healing Metrics Report', JSON.stringify(report, null, 2), 'application/json');
      console.log('📊 AI HEALING STRATEGY PERFORMANCE REPORT');
      console.log('=' .repeat(50));
      console.log(`Overall Success Rate: ${overallSuccessRate}%`);
      console.log(`Total Healing Attempts: ${healingMetrics.totalAttempts}`);
      console.log(`Successful Healings: ${healingMetrics.successfulHealing}`);
      console.log(`Failed Healings: ${healingMetrics.failedHealing}`);
      console.log(`Average Healing Time: ${avgHealingTime}ms`);
      console.log('\nStrategy Performance:');
      
      for (const [strategy, performance] of Object.entries(report.strategyPerformance)) {
        console.log(`  ${strategy}: ${performance.successRate} (${performance.successes}/${performance.attempts})`);
      }
    });
  }

  test('Healing Strategy Success Rate Test - Search Elements', async () => {
    await allure.epic('AI Healing Metrics');
    await allure.feature('Search Element Healing');
    
    await page.goto('https://www.blazemeter.com/product-demos');
    
    // Test various search-related selectors
    const searchSelectors = [
      { selector: 'input[type="search"]', context: { expectedText: 'search', role: 'searchbox' } },
      { selector: '.search-input', context: { expectedText: 'search' } },
      { selector: '#search-field', context: { role: 'searchbox' } },
      { selector: '[placeholder*="search"]', context: { expectedText: 'search' } }
    ];
    
    for (const { selector, context } of searchSelectors) {
      const element = await findElementWithHealingTracking(selector, context);
      const count = await element.count();
      console.log(`Search element test: ${selector} -> ${count} elements found`);
    }
  });

  test('Healing Strategy Success Rate Test - Navigation Elements', async () => {
    await allure.epic('AI Healing Metrics');
    await allure.feature('Navigation Element Healing');
    
    await page.goto('https://www.blazemeter.com/product-demos');
    
    // Test various navigation-related selectors
    const navSelectors = [
      { selector: 'nav', context: { role: 'navigation' } },
      { selector: '.main-menu', context: { role: 'navigation' } },
      { selector: '[role="navigation"]', context: { role: 'navigation' } },
      { selector: '.navbar', context: { expectedText: 'menu' } }
    ];
    
    for (const { selector, context } of navSelectors) {
      const element = await findElementWithHealingTracking(selector, context);
      const count = await element.count();
      console.log(`Navigation element test: ${selector} -> ${count} elements found`);
    }
  });

  test('Healing Strategy Success Rate Test - Button Elements', async () => {
    await allure.epic('AI Healing Metrics');
    await allure.feature('Button Element Healing');
    
    await page.goto('https://www.blazemeter.com/product-demos');
    
    // Test various button-related selectors
    const buttonSelectors = [
      { selector: 'button[type="submit"]', context: { role: 'button', expectedText: 'submit' } },
      { selector: '.btn-primary', context: { role: 'button' } },
      { selector: '[role="button"]', context: { role: 'button' } },
      { selector: 'input[type="button"]', context: { role: 'button' } }
    ];
    
    for (const { selector, context } of buttonSelectors) {
      const element = await findElementWithHealingTracking(selector, context);
      const count = await element.count();
      console.log(`Button element test: ${selector} -> ${count} elements found`);
    }
  });
});