import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class CrossBrowserHealing {
  constructor() {
    this.browserStrategies = new Map();
    this.browserQuirks = new Map();
    this.compatibilityMatrix = new Map();
    this.dataDir = path.join(__dirname, '../data/cross-browser');
    this.init();
  }

  async init() {
    try {
      await fs.mkdir(this.dataDir, { recursive: true });
      this.initializeBrowserStrategies();
      this.initializeBrowserQuirks();
      await this.loadCompatibilityData();
    } catch (error) {
      console.log('Initializing cross-browser healing engine');
    }
  }

  // Alias for compatibility
  async initialize() {
    return this.init();
  }

  // Initialize browser-specific healing strategies
  initializeBrowserStrategies() {
    // Chromium-based browsers (Chrome, Edge, etc.)
    this.browserStrategies.set('chromium', {
      name: 'chromium',
      preferredSelectors: [
        'data-testid',
        'id',
        'aria-label',
        'class',
        'css-selector'
      ],
      fallbackStrategies: [
        'javascript-click',
        'force-click',
        'coordinate-click'
      ],
      waitStrategies: [
        'networkidle',
        'domcontentloaded',
        'load'
      ],
      scrollBehavior: 'smooth',
      clickRetryDelay: 100,
      maxRetries: 3,
      supportedFeatures: [
        'shadow-dom',
        'web-components',
        'css-grid',
        'flexbox',
        'custom-elements'
      ],
      knownIssues: [
        'stale-element-reference',
        'element-not-interactable'
      ]
    });

    // Firefox
    this.browserStrategies.set('firefox', {
      name: 'firefox',
      preferredSelectors: [
        'id',
        'data-testid',
        'name',
        'xpath',
        'css-selector'
      ],
      fallbackStrategies: [
        'xpath-click',
        'javascript-click',
        'coordinate-click'
      ],
      waitStrategies: [
        'domcontentloaded',
        'load',
        'networkidle'
      ],
      scrollBehavior: 'auto',
      clickRetryDelay: 150,
      maxRetries: 4,
      supportedFeatures: [
        'css-grid',
        'flexbox',
        'web-components'
      ],
      knownIssues: [
        'element-click-intercepted',
        'element-not-visible',
        'gecko-driver-timeout'
      ]
    });

    // WebKit (Safari)
    this.browserStrategies.set('webkit', {
      name: 'webkit',
      preferredSelectors: [
        'id',
        'name',
        'data-testid',
        'text-content',
        'css-selector'
      ],
      fallbackStrategies: [
        'text-click',
        'coordinate-click',
        'javascript-click'
      ],
      waitStrategies: [
        'load',
        'domcontentloaded'
      ],
      scrollBehavior: 'auto',
      clickRetryDelay: 200,
      maxRetries: 5,
      supportedFeatures: [
        'flexbox',
        'css-grid'
      ],
      knownIssues: [
        'webkit-driver-instability',
        'element-timing-issues',
        'shadow-dom-limitations'
      ]
    });
  }

  // Initialize browser-specific quirks and workarounds
  initializeBrowserQuirks() {
    // Chromium quirks
    this.browserQuirks.set('chromium', {
      elementInteraction: {
        // Chrome sometimes needs explicit scrolling before click
        requiresScrollBeforeClick: true,
        // Chrome handles shadow DOM well
        shadowDomSupport: 'excellent',
        // Chrome may need force click for overlapping elements
        overlappingElementHandling: 'force-click'
      },
      selectorBehavior: {
        // Chrome prefers data attributes
        dataAttributePriority: 'high',
        // CSS selectors work reliably
        cssSelectorReliability: 'high',
        // XPath can be slower
        xpathPerformance: 'medium'
      },
      timingIssues: {
        // Chrome is generally fast
        defaultWaitTime: 1000,
        // Network idle detection works well
        networkIdleSupport: true,
        // Animation handling
        animationWaitRequired: false
      }
    });

    // Firefox quirks
    this.browserQuirks.set('firefox', {
      elementInteraction: {
        // Firefox may need longer waits
        requiresScrollBeforeClick: false,
        // Limited shadow DOM support
        shadowDomSupport: 'limited',
        // Firefox handles overlapping elements differently
        overlappingElementHandling: 'javascript-click'
      },
      selectorBehavior: {
        // Firefox works well with XPath
        dataAttributePriority: 'medium',
        cssSelectorReliability: 'high',
        xpathPerformance: 'high'
      },
      timingIssues: {
        // Firefox may need longer waits
        defaultWaitTime: 1500,
        networkIdleSupport: false,
        animationWaitRequired: true
      }
    });

    // WebKit quirks
    this.browserQuirks.set('webkit', {
      elementInteraction: {
        // Safari can be finicky with interactions
        requiresScrollBeforeClick: true,
        shadowDomSupport: 'poor',
        overlappingElementHandling: 'coordinate-click'
      },
      selectorBehavior: {
        // Safari prefers simple selectors
        dataAttributePriority: 'medium',
        cssSelectorReliability: 'medium',
        xpathPerformance: 'low'
      },
      timingIssues: {
        // Safari needs more time
        defaultWaitTime: 2000,
        networkIdleSupport: false,
        animationWaitRequired: true
      }
    });
  }

  // Get browser-specific healing strategy
  getBrowserStrategy(browserName, elementContext, errorType) {
    const normalizedBrowser = this.normalizeBrowserName(browserName);
    const strategy = this.browserStrategies.get(normalizedBrowser);
    const quirks = this.browserQuirks.get(normalizedBrowser);

    if (!strategy || !quirks) {
      return this.getDefaultStrategy();
    }

    return {
      browser: normalizedBrowser,
      strategy: this.selectOptimalStrategy(strategy, quirks, elementContext, errorType),
      quirks,
      waitTime: this.calculateWaitTime(quirks, elementContext),
      retryConfig: {
        maxRetries: strategy.maxRetries,
        retryDelay: strategy.clickRetryDelay
      }
    };
  }

  // Select optimal healing strategy based on browser and context
  selectOptimalStrategy(browserStrategy, browserQuirks, elementContext, errorType) {
    const strategies = [];

    // Primary strategy based on element context
    if (elementContext.hasDataTestId) {
      strategies.push({
        type: 'data-testid',
        selector: `[data-testid="${elementContext.dataTestId}"]`,
        priority: 0.9,
        browserCompatibility: this.getSelectorCompatibility('data-testid', browserStrategy.name)
      });
    }

    if (elementContext.hasId) {
      strategies.push({
        type: 'id',
        selector: `#${elementContext.id}`,
        priority: 0.85,
        browserCompatibility: this.getSelectorCompatibility('id', browserStrategy.name)
      });
    }

    if (elementContext.hasAriaLabel) {
      strategies.push({
        type: 'aria-label',
        selector: `[aria-label="${elementContext.ariaLabel}"]`,
        priority: 0.8,
        browserCompatibility: this.getSelectorCompatibility('aria-label', browserStrategy.name)
      });
    }

    if (elementContext.hasText) {
      strategies.push({
        type: 'text',
        selector: `text=${elementContext.text}`,
        priority: 0.7,
        browserCompatibility: this.getSelectorCompatibility('text', browserStrategy.name)
      });
    }

    // Fallback strategies based on error type and browser
    const fallbackStrategies = this.getFallbackStrategies(errorType, browserStrategy, browserQuirks);
    strategies.push(...fallbackStrategies);

    // Sort by priority and browser compatibility
    return strategies.sort((a, b) => {
      const scoreA = a.priority * a.browserCompatibility;
      const scoreB = b.priority * b.browserCompatibility;
      return scoreB - scoreA;
    });
  }

  // Get fallback strategies based on error type and browser
  getFallbackStrategies(errorType, browserStrategy, browserQuirks) {
    const fallbacks = [];

    switch (errorType) {
      case 'ElementNotFound':
        fallbacks.push(
          {
            type: 'xpath-fallback',
            action: 'xpath-search',
            priority: 0.6,
            browserCompatibility: browserQuirks.selectorBehavior.xpathPerformance === 'high' ? 0.9 : 0.5
          },
          {
            type: 'css-fallback',
            action: 'css-search',
            priority: 0.65,
            browserCompatibility: browserQuirks.selectorBehavior.cssSelectorReliability === 'high' ? 0.9 : 0.6
          }
        );
        break;

      case 'ElementNotClickable':
        if (browserQuirks.elementInteraction.overlappingElementHandling === 'force-click') {
          fallbacks.push({
            type: 'force-click',
            action: 'force-click',
            priority: 0.8,
            browserCompatibility: 0.9
          });
        }
        
        if (browserQuirks.elementInteraction.overlappingElementHandling === 'javascript-click') {
          fallbacks.push({
            type: 'javascript-click',
            action: 'javascript-click',
            priority: 0.85,
            browserCompatibility: 0.95
          });
        }
        
        if (browserQuirks.elementInteraction.overlappingElementHandling === 'coordinate-click') {
          fallbacks.push({
            type: 'coordinate-click',
            action: 'coordinate-click',
            priority: 0.7,
            browserCompatibility: 0.8
          });
        }
        break;

      case 'ElementNotVisible':
        fallbacks.push(
          {
            type: 'scroll-into-view',
            action: 'scroll-and-wait',
            priority: 0.8,
            browserCompatibility: 0.9,
            scrollBehavior: browserStrategy.scrollBehavior
          },
          {
            type: 'wait-for-visible',
            action: 'wait-for-element',
            priority: 0.75,
            browserCompatibility: 0.85,
            waitTime: browserQuirks.timingIssues.defaultWaitTime
          }
        );
        break;

      case 'StaleElementReference':
        fallbacks.push(
          {
            type: 'refetch-element',
            action: 'refetch-and-retry',
            priority: 0.9,
            browserCompatibility: 0.95
          },
          {
            type: 'page-refresh-fallback',
            action: 'soft-refresh',
            priority: 0.3,
            browserCompatibility: 0.8
          }
        );
        break;
    }

    return fallbacks;
  }

  // Get selector compatibility score for browser
  getSelectorCompatibility(selectorType, browserName) {
    const compatibilityMatrix = {
      'chromium': {
        'data-testid': 0.95,
        'id': 0.9,
        'aria-label': 0.9,
        'class': 0.85,
        'text': 0.8,
        'xpath': 0.75,
        'css': 0.9
      },
      'firefox': {
        'data-testid': 0.9,
        'id': 0.95,
        'aria-label': 0.85,
        'class': 0.8,
        'text': 0.75,
        'xpath': 0.9,
        'css': 0.85
      },
      'webkit': {
        'data-testid': 0.8,
        'id': 0.9,
        'aria-label': 0.75,
        'class': 0.7,
        'text': 0.8,
        'xpath': 0.6,
        'css': 0.75
      }
    };

    return compatibilityMatrix[browserName]?.[selectorType] || 0.5;
  }

  // Calculate optimal wait time based on browser quirks
  calculateWaitTime(browserQuirks, elementContext) {
    let baseWaitTime = browserQuirks.timingIssues.defaultWaitTime;

    // Adjust based on element complexity
    if (elementContext.isComplex) {
      baseWaitTime *= 1.5;
    }

    // Adjust for animations
    if (browserQuirks.timingIssues.animationWaitRequired && elementContext.hasAnimations) {
      baseWaitTime += 1000;
    }

    // Adjust for network dependencies
    if (elementContext.requiresNetworkData && !browserQuirks.timingIssues.networkIdleSupport) {
      baseWaitTime += 2000;
    }

    return Math.min(baseWaitTime, 10000); // Cap at 10 seconds
  }

  // Normalize browser name to standard format
  normalizeBrowserName(browserName) {
    const normalized = browserName.toLowerCase();
    
    if (normalized.includes('chrome') || normalized.includes('chromium') || normalized.includes('edge')) {
      return 'chromium';
    }
    
    if (normalized.includes('firefox') || normalized.includes('gecko')) {
      return 'firefox';
    }
    
    if (normalized.includes('safari') || normalized.includes('webkit')) {
      return 'webkit';
    }
    
    return 'chromium'; // Default fallback
  }

  // Get default strategy for unknown browsers
  getDefaultStrategy() {
    return {
      browser: 'unknown',
      strategy: [
        {
          type: 'id',
          priority: 0.8,
          browserCompatibility: 0.7
        },
        {
          type: 'data-testid',
          priority: 0.75,
          browserCompatibility: 0.7
        },
        {
          type: 'css-selector',
          priority: 0.6,
          browserCompatibility: 0.6
        }
      ],
      quirks: {
        elementInteraction: {
          requiresScrollBeforeClick: true,
          shadowDomSupport: 'limited',
          overlappingElementHandling: 'javascript-click'
        },
        timingIssues: {
          defaultWaitTime: 2000,
          animationWaitRequired: true
        }
      },
      waitTime: 2000,
      retryConfig: {
        maxRetries: 3,
        retryDelay: 150
      }
    };
  }

  // Generate browser-specific healing code
  generateHealingCode(browserStrategy, elementContext) {
    const { browser, strategy, quirks, waitTime, retryConfig } = browserStrategy;
    
    let healingCode = [];
    
    // Add browser-specific setup
    healingCode.push(`// Browser-specific healing for ${browser}`);
    
    if (quirks.elementInteraction.requiresScrollBeforeClick) {
      healingCode.push('await element.scrollIntoViewIfNeeded();');
    }
    
    // Add wait strategy
    healingCode.push(`await page.waitForTimeout(${waitTime});`);
    
    // Add retry logic with browser-specific strategies
    healingCode.push('let attempts = 0;');
    healingCode.push(`while (attempts < ${retryConfig.maxRetries}) {`);
    healingCode.push('  try {');
    
    // Primary strategy
    const primaryStrategy = strategy[0];
    if (primaryStrategy) {
      switch (primaryStrategy.type) {
        case 'force-click':
          healingCode.push('    await element.click({ force: true });');
          break;
        case 'javascript-click':
          healingCode.push('    await element.evaluate(el => el.click());');
          break;
        case 'coordinate-click':
          healingCode.push('    const box = await element.boundingBox();');
          healingCode.push('    await page.mouse.click(box.x + box.width/2, box.y + box.height/2);');
          break;
        default:
          healingCode.push('    await element.click();');
      }
    }
    
    healingCode.push('    break; // Success');
    healingCode.push('  } catch (error) {');
    healingCode.push('    attempts++;');
    healingCode.push(`    if (attempts < ${retryConfig.maxRetries}) {`);
    healingCode.push(`      await page.waitForTimeout(${retryConfig.retryDelay});`);
    healingCode.push('    } else {');
    healingCode.push('      throw error;');
    healingCode.push('    }');
    healingCode.push('  }');
    healingCode.push('}');
    
    return healingCode.join('\n');
  }

  // Learn from cross-browser execution results
  async learnFromCrossBrowserExecution(results) {
    for (const result of results) {
      const { browser, success, strategy, elementContext, errorType } = result;
      const normalizedBrowser = this.normalizeBrowserName(browser);
      
      // Update compatibility matrix
      if (!this.compatibilityMatrix.has(normalizedBrowser)) {
        this.compatibilityMatrix.set(normalizedBrowser, new Map());
      }
      
      const browserMatrix = this.compatibilityMatrix.get(normalizedBrowser);
      const strategyKey = `${strategy}_${elementContext.type}`;
      
      if (!browserMatrix.has(strategyKey)) {
        browserMatrix.set(strategyKey, { successes: 0, failures: 0, effectiveness: 0.5 });
      }
      
      const strategyData = browserMatrix.get(strategyKey);
      
      if (success) {
        strategyData.successes++;
      } else {
        strategyData.failures++;
      }
      
      strategyData.effectiveness = strategyData.successes / (strategyData.successes + strategyData.failures);
    }
    
    await this.saveCompatibilityData();
  }

  // Save compatibility data
  async saveCompatibilityData() {
    try {
      const data = {
        compatibilityMatrix: Array.from(this.compatibilityMatrix.entries()).map(([browser, strategies]) => [
          browser,
          Array.from(strategies.entries())
        ]),
        timestamp: Date.now()
      };
      
      await fs.writeFile(
        path.join(this.dataDir, 'compatibility-matrix.json'),
        JSON.stringify(data, null, 2)
      );
    } catch (error) {
      console.error('Error saving compatibility data:', error);
    }
  }

  // Load compatibility data
  async loadCompatibilityData() {
    try {
      const dataFile = path.join(this.dataDir, 'compatibility-matrix.json');
      const data = JSON.parse(await fs.readFile(dataFile, 'utf8'));
      
      this.compatibilityMatrix = new Map(
        data.compatibilityMatrix.map(([browser, strategies]) => [
          browser,
          new Map(strategies)
        ])
      );
      
      console.log('Cross-browser compatibility data loaded');
    } catch (error) {
      console.log('No existing compatibility data found');
    }
  }

  // Get cross-browser analytics
  getAnalytics() {
    const browserStats = {};
    
    for (const [browser, strategies] of this.compatibilityMatrix.entries()) {
      const strategyArray = Array.from(strategies.values());
      const totalExecutions = strategyArray.reduce((sum, s) => sum + s.successes + s.failures, 0);
      const totalSuccesses = strategyArray.reduce((sum, s) => sum + s.successes, 0);
      
      browserStats[browser] = {
        totalExecutions,
        totalSuccesses,
        successRate: totalExecutions > 0 ? (totalSuccesses / totalExecutions) * 100 : 0,
        strategiesCount: strategies.size,
        avgEffectiveness: strategyArray.length > 0 ? 
          strategyArray.reduce((sum, s) => sum + s.effectiveness, 0) / strategyArray.length : 0
      };
    }
    
    return {
      supportedBrowsers: Array.from(this.browserStrategies.keys()),
      browserStats,
      totalCompatibilityEntries: Array.from(this.compatibilityMatrix.values())
        .reduce((sum, strategies) => sum + strategies.size, 0)
    };
  }
}

export default CrossBrowserHealing;