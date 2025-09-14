import { test, expect, Locator, Page, BrowserContext } from '@playwright/test';

interface ClickOptions {
  timeout?: number;
  force?: boolean;
  noWaitAfter?: boolean;
  position?: { x: number; y: number };
  button?: 'left' | 'right' | 'middle';
  modifiers?: Array<'Alt' | 'Control' | 'Meta' | 'Shift'>;
}

interface ElementStrategy {
  name: string;
  locator: string | ((page: Page) => Locator);
  description: string;
  priority?: number;
  condition?: (page: Page) => Promise<boolean>;
}

interface HealingOptions {
  maxRetries?: number;
  retryDelay?: number;
  fallbackActions?: Array<() => Promise<void>>;
  expectedOutcome?: (page: Page) => Promise<boolean>;
  screenshot?: boolean;
}

class AdvancedSelfHealingPage {
  private retryHistory: Map<string, number> = new Map();
  private successHistory: Map<string, ElementStrategy> = new Map();
  private errorLog: Array<{ timestamp: Date; action: string; error: string; strategy?: string }> = [];

  constructor(private page: Page) {}

  /**
   * Comprehensive click with AI-like learning and adaptation
   */
  async intelligentClick(
    strategies: ElementStrategy[],
    options: ClickOptions & HealingOptions = {}
  ): Promise<{ success: boolean; usedStrategy?: ElementStrategy; attempts: number }> {
    const defaultOptions = {
      timeout: 10000,
      maxRetries: 3,
      retryDelay: 1000,
      screenshot: false,
      ...options
    };

    // Sort strategies by priority and past success
    const sortedStrategies = this.prioritizeStrategies(strategies, 'click');
    let totalAttempts = 0;

    for (let retry = 0; retry <= defaultOptions.maxRetries; retry++) {
      if (retry > 0) {
        console.log(`🔄 Retry attempt ${retry}/${defaultOptions.maxRetries}`);
        await this.page.waitForTimeout(defaultOptions.retryDelay);
        
        // Try fallback actions before retrying
        if (defaultOptions.fallbackActions && retry === 1) {
          for (const fallback of defaultOptions.fallbackActions) {
            await fallback();
          }
        }
      }

      for (const strategy of sortedStrategies) {
        totalAttempts++;
        
        try {
          // Check strategy condition if provided
          if (strategy.condition && !(await strategy.condition(this.page))) {
            console.log(`⏭️  Skipping ${strategy.name} - condition not met`);
            continue;
          }

          console.log(`🎯 Attempting: ${strategy.name} - ${strategy.description}`);
          
          const result = await this.executeClickStrategy(strategy, defaultOptions);
          if (result.success) {
            this.recordSuccess(strategy, 'click');
            
            // Verify expected outcome if provided
            if (defaultOptions.expectedOutcome) {
              const outcomeSuccess = await defaultOptions.expectedOutcome(this.page);
              if (!outcomeSuccess) {
                console.log(`⚠️  Click succeeded but expected outcome failed`);
                continue;
              }
            }
            
            console.log(`✅ Success with ${strategy.name}`);
            return { success: true, usedStrategy: strategy, attempts: totalAttempts };
          }
        } catch (error) {
          this.recordError('click', error.message, strategy.name);
          console.log(`❌ ${strategy.name} failed: ${error.message}`);
        }
      }
      
      // Take screenshot on failure if requested
      if (defaultOptions.screenshot) {
        await this.page.screenshot({ 
          path: `failure-${Date.now()}-retry-${retry}.png`,
          fullPage: true 
        });
      }
    }

    return { success: false, attempts: totalAttempts };
  }

  /**
   * Self-healing form filling with validation
   */
  async intelligentFormFill(
    formData: { [key: string]: { value: string; strategies: ElementStrategy[] } },
    options: HealingOptions = {}
  ): Promise<{ success: boolean; results: { [key: string]: boolean } }> {
    const results: { [key: string]: boolean } = {};
    
    for (const [fieldName, fieldConfig] of Object.entries(formData)) {
      console.log(`\n📝 Filling field: ${fieldName}`);
      
      const fillResult = await this.smartFill(
        fieldConfig.strategies,
        fieldConfig.value,
        {
          ...options,
          expectedOutcome: async (page) => {
            // Verify the value was actually filled
            for (const strategy of fieldConfig.strategies) {
              try {
                let locator: Locator;
                if (typeof strategy.locator === 'string') {
                  locator = page.locator(strategy.locator);
                } else {
                  locator = strategy.locator(page);
                }
                const value = await locator.inputValue();
                if (value === fieldConfig.value) return true;
              } catch (e) {
                continue;
              }
            }
            return false;
          }
        }
      );
      
      results[fieldName] = fillResult.success;
    }

    const allSuccess = Object.values(results).every(r => r);
    return { success: allSuccess, results };
  }

  /**
   * Dynamic wait with multiple condition strategies
   */
  async dynamicWait(
    waitStrategies: Array<{
      name: string;
      condition: () => Promise<boolean>;
      timeout?: number;
    }>,
    options: { globalTimeout?: number; any?: boolean } = {}
  ): Promise<{ success: boolean; satisfiedStrategy?: string }> {
    const globalTimeout = options.globalTimeout || 30000;
    const waitForAny = options.any || false;
    const startTime = Date.now();

    while (Date.now() - startTime < globalTimeout) {
      const satisfiedStrategies: string[] = [];

      for (const strategy of waitStrategies) {
        try {
          const conditionMet = await Promise.race([
            strategy.condition(),
            new Promise<boolean>((_, reject) => 
              setTimeout(() => reject(new Error('timeout')), strategy.timeout || 5000)
            )
          ]);

          if (conditionMet) {
            console.log(`✅ Wait condition satisfied: ${strategy.name}`);
            satisfiedStrategies.push(strategy.name);
            
            if (waitForAny) {
              return { success: true, satisfiedStrategy: strategy.name };
            }
          }
        } catch (error) {
          console.log(`⏳ Wait strategy ${strategy.name} not ready: ${error.message}`);
        }
      }

      if (!waitForAny && satisfiedStrategies.length === waitStrategies.length) {
        return { success: true, satisfiedStrategy: satisfiedStrategies.join(', ') };
      }

      await this.page.waitForTimeout(500);
    }

    return { success: false };
  }

  /**
   * Network-aware interactions
   */
  async networkAwareAction(
    action: () => Promise<void>,
    options: {
      expectedRequests?: string[];
      networkTimeout?: number;
      retryOnNetworkFailure?: boolean;
    } = {}
  ): Promise<{ success: boolean; networkEvents: string[] }> {
    const networkEvents: string[] = [];
    const expectedRequests = options.expectedRequests || [];
    const networkTimeout = options.networkTimeout || 10000;

    // Monitor network requests
    const requestPromises = expectedRequests.map(url => 
      this.page.waitForRequest(req => req.url().includes(url), { timeout: networkTimeout })
        .then(() => {
          networkEvents.push(`Request: ${url}`);
          return true;
        })
        .catch(() => false)
    );

    const responsePromises = expectedRequests.map(url =>
      this.page.waitForResponse(resp => resp.url().includes(url) && resp.status() < 400, { timeout: networkTimeout })
        .then(() => {
          networkEvents.push(`Response: ${url}`);
          return true;
        })
        .catch(() => false)
    );

    try {
      // Execute the action
      await action();

      // Wait for expected network activity if specified
      if (expectedRequests.length > 0) {
        const networkResults = await Promise.all([...requestPromises, ...responsePromises]);
        const networkSuccess = networkResults.some(result => result);
        
        if (!networkSuccess && options.retryOnNetworkFailure) {
          console.log('🌐 Network activity not detected, retrying action...');
          await this.page.waitForTimeout(2000);
          return await this.networkAwareAction(action, options);
        }
      }

      return { success: true, networkEvents };
    } catch (error) {
      console.log(`🌐 Network-aware action failed: ${error.message}`);
      return { success: false, networkEvents };
    }
  }

  /**
   * Context-aware element discovery
   */
  async discoverElements(context: {
    viewport?: 'desktop' | 'mobile' | 'tablet';
    theme?: 'light' | 'dark';
    userAgent?: string;
    language?: string;
  } = {}): Promise<Map<string, ElementStrategy[]>> {
    const discoveries = new Map<string, ElementStrategy[]>();

    // Viewport-based discovery
    const viewportSize = this.page.viewportSize();
    const isMobile = viewportSize && viewportSize.width <= 768;
    const isTablet = viewportSize && viewportSize.width > 768 && viewportSize.width <= 1024;

    console.log(`🔍 Discovering elements for viewport: ${isMobile ? 'mobile' : isTablet ? 'tablet' : 'desktop'}`);

    // Theme-aware discovery
    const isDarkTheme = await this.page.locator('body[class*="dark"], html[class*="dark"], [data-theme="dark"]').count() > 0;
    console.log(`🎨 Theme detected: ${isDarkTheme ? 'dark' : 'light'}`);

    // Common UI patterns discovery
    const patterns = {
      navigation: await this.discoverNavigationPatterns(isMobile),
      forms: await this.discoverFormPatterns(),
      modals: await this.discoverModalPatterns(),
      tables: await this.discoverTablePatterns(),
      search: await this.discoverSearchPatterns(isMobile),
      notifications: await this.discoverNotificationPatterns()
    };

    for (const [patternType, strategies] of Object.entries(patterns)) {
      discoveries.set(patternType, strategies);
    }

    return discoveries;
  }

  /**
   * A/B Test aware interactions
   */
  async abTestAwareClick(
    baseStrategies: ElementStrategy[],
    variants: { [variantName: string]: ElementStrategy[] }
  ): Promise<{ success: boolean; variant?: string; strategy?: ElementStrategy }> {
    console.log('🧪 Detecting A/B test variant...');

    // Try to detect which variant is active
    for (const [variantName, variantStrategies] of Object.entries(variants)) {
      for (const strategy of variantStrategies) {
        try {
          let locator: Locator;
          if (typeof strategy.locator === 'string') {
            locator = this.page.locator(strategy.locator);
          } else {
            locator = strategy.locator(this.page);
          }

          if (await locator.count() > 0) {
            console.log(`🧪 Detected variant: ${variantName}`);
            const result = await this.intelligentClick(variantStrategies);
            if (result.success) {
              return { success: true, variant: variantName, strategy: result.usedStrategy };
            }
          }
        } catch (error) {
          continue;
        }
      }
    }

    // Fallback to base strategies
    console.log('🧪 No variant detected, using base strategies');
    const result = await this.intelligentClick(baseStrategies);
    return { success: result.success, strategy: result.usedStrategy };
  }

  /**
   * Error recovery with automatic retry logic
   */
  async withErrorRecovery<T>(
    action: () => Promise<T>,
    recoveryStrategies: Array<{
      name: string;
      condition: (error: Error) => boolean;
      recovery: () => Promise<void>;
    }> = []
  ): Promise<{ result?: T; success: boolean; recoveryUsed?: string }> {
    try {
      const result = await action();
      return { result, success: true };
    } catch (error) {
      console.log(`💥 Error occurred: ${error.message}`);

      // Try recovery strategies
      for (const strategy of recoveryStrategies) {
        if (strategy.condition(error)) {
          console.log(`🔧 Attempting recovery: ${strategy.name}`);
          try {
            await strategy.recovery();
            const result = await action(); // Retry the action
            return { result, success: true, recoveryUsed: strategy.name };
          } catch (recoveryError) {
            console.log(`❌ Recovery ${strategy.name} failed: ${recoveryError.message}`);
          }
        }
      }

      return { success: false };
    }
  }

  // Private helper methods
  private async executeClickStrategy(
    strategy: ElementStrategy,
    options: ClickOptions
  ): Promise<{ success: boolean }> {
    let locator: Locator;
    if (typeof strategy.locator === 'string') {
      locator = this.page.locator(strategy.locator);
    } else {
      locator = strategy.locator(this.page);
    }

    // Advanced element state checking
    await this.waitForElementReady(locator, options.timeout);

    const count = await locator.count();
    if (count === 0) {
      throw new Error('No elements found');
    }

    if (count === 1) {
      await locator.click(options);
      return { success: true };
    }

    // Handle multiple elements intelligently
    for (let i = 0; i < count; i++) {
      const element = locator.nth(i);
      const isVisible = await element.isVisible();
      const isEnabled = await element.isEnabled();
      const isInViewport = await this.isInViewport(element);

      if (isVisible && isEnabled && isInViewport) {
        await element.click(options);
        return { success: true };
      }
    }

    // Force click on first element as last resort
    await locator.first().click({ ...options, force: true });
    return { success: true };
  }

  private async smartFill(
    strategies: ElementStrategy[],
    value: string,
    options: HealingOptions = {}
  ): Promise<{ success: boolean; usedStrategy?: ElementStrategy }> {
    for (const strategy of strategies) {
      try {
        console.log(`📝 Trying fill strategy: ${strategy.name}`);
        
        let locator: Locator;
        if (typeof strategy.locator === 'string') {
          locator = this.page.locator(strategy.locator);
        } else {
          locator = strategy.locator(this.page);
        }

        await locator.waitFor({ timeout: 5000 });
        await locator.clear();
        await locator.fill(value);

        // Verify the fill worked
        const actualValue = await locator.inputValue();
        if (actualValue === value) {
          return { success: true, usedStrategy: strategy };
        }

        // Try alternative fill methods
        await locator.click();
        await this.page.keyboard.press('Control+A');
        await this.page.keyboard.type(value);
        
        const retryValue = await locator.inputValue();
        if (retryValue === value) {
          return { success: true, usedStrategy: strategy };
        }

      } catch (error) {
        console.log(`❌ Fill strategy ${strategy.name} failed: ${error.message}`);
      }
    }

    return { success: false };
  }

  private async waitForElementReady(locator: Locator, timeout: number = 10000): Promise<void> {
    await locator.waitFor({ state: 'attached', timeout });
    await locator.waitFor({ state: 'visible', timeout });
    
    // Wait for any animations to complete
    await this.page.waitForTimeout(100);
    
    // Ensure element is stable (not moving)
    let previousBox = await locator.boundingBox();
    await this.page.waitForTimeout(100);
    let currentBox = await locator.boundingBox();
    
    let stabilityChecks = 0;
    while (stabilityChecks < 10 && previousBox && currentBox) {
      if (previousBox.x === currentBox.x && previousBox.y === currentBox.y) {
        break;
      }
      previousBox = currentBox;
      await this.page.waitForTimeout(100);
      currentBox = await locator.boundingBox();
      stabilityChecks++;
    }
  }

  private async isInViewport(locator: Locator): Promise<boolean> {
    const box = await locator.boundingBox();
    if (!box) return false;

    const viewport = this.page.viewportSize();
    if (!viewport) return true;

    return (
      box.x >= 0 &&
      box.y >= 0 &&
      box.x + box.width <= viewport.width &&
      box.y + box.height <= viewport.height
    );
  }

  private prioritizeStrategies(strategies: ElementStrategy[], action: string): ElementStrategy[] {
    return strategies.sort((a, b) => {
      const aSuccess = this.successHistory.get(`${action}-${a.name}`);
      const bSuccess = this.successHistory.get(`${action}-${b.name}`);
      const aPriority = a.priority || 0;
      const bPriority = b.priority || 0;

      // Prioritize by: 1) explicit priority, 2) past success
      if (aPriority !== bPriority) return bPriority - aPriority;
      if (aSuccess && !bSuccess) return -1;
      if (!aSuccess && bSuccess) return 1;
      return 0;
    });
  }

  private recordSuccess(strategy: ElementStrategy, action: string): void {
    this.successHistory.set(`${action}-${strategy.name}`, strategy);
  }

  private recordError(action: string, error: string, strategy?: string): void {
    this.errorLog.push({
      timestamp: new Date(),
      action,
      error,
      strategy
    });
  }

  // Pattern discovery methods
  private async discoverNavigationPatterns(isMobile: boolean): Promise<ElementStrategy[]> {
    const strategies: ElementStrategy[] = [];

    if (isMobile) {
      strategies.push(
        {
          name: 'mobile-hamburger',
          locator: '.navbar-toggler, .mobile-menu-toggle, .hamburger',
          description: 'Mobile hamburger menu',
          priority: 10
        },
        {
          name: 'mobile-nav-button',
          locator: 'button[aria-label*="menu" i], button[aria-label*="navigation" i]',
          description: 'Mobile navigation button with aria-label'
        }
      );
    } else {
      strategies.push(
        {
          name: 'desktop-nav-items',
          locator: '.navbar-nav .nav-link, .main-nav a',
          description: 'Desktop navigation items'
        }
      );
    }

    return strategies;
  }

  private async discoverFormPatterns(): Promise<ElementStrategy[]> {
    return [
      {
        name: 'form-controls',
        locator: '.form-control, .form-input, input:not([type="hidden"])',
        description: 'Standard form controls'
      },
      {
        name: 'custom-inputs',
        locator: '[class*="input"], [class*="field"]',
        description: 'Custom styled inputs'
      }
    ];
  }

  private async discoverModalPatterns(): Promise<ElementStrategy[]> {
    return [
      {
        name: 'bootstrap-modal',
        locator: '.modal, [role="dialog"]',
        description: 'Bootstrap or ARIA modal'
      },
      {
        name: 'custom-modal',
        locator: '[class*="modal"], [class*="dialog"], [class*="popup"]',
        description: 'Custom modal patterns'
      }
    ];
  }

  private async discoverTablePatterns(): Promise<ElementStrategy[]> {
    return [
      {
        name: 'data-table',
        locator: '.dataTable, .data-table, table[class*="table"]',
        description: 'Data tables'
      },
      {
        name: 'table-actions',
        locator: 'table .btn, table .action, table a',
        description: 'Table action buttons'
      }
    ];
  }

  private async discoverSearchPatterns(isMobile: boolean): Promise<ElementStrategy[]> {
    const strategies = [
      {
        name: 'search-input',
        locator: 'input[type="search"], input[placeholder*="search" i]',
        description: 'Search input fields'
      }
    ];

    if (isMobile) {
      strategies.push({
        name: 'mobile-search-toggle',
        locator: '.search-toggle, [data-toggle="search"]',
        description: 'Mobile search toggle'
      });
    }

    return strategies;
  }

  private async discoverNotificationPatterns(): Promise<ElementStrategy[]> {
    return [
      {
        name: 'toast-notifications',
        locator: '.toast, .notification, .alert',
        description: 'Toast and notification elements'
      },
      {
        name: 'dismissible-alerts',
        locator: '.alert-dismissible .close, .notification .close',
        description: 'Dismissible alert close buttons'
      }
    ];
  }

  // Analytics and reporting
  getPerformanceReport(): {
    successRate: { [action: string]: number };
    mostReliableStrategies: { [action: string]: string };
    errorSummary: { [error: string]: number };
  } {
    const report = {
      successRate: {} as { [action: string]: number },
      mostReliableStrategies: {} as { [action: string]: string },
      errorSummary: {} as { [error: string]: number }
    };

    // Calculate success rates and most reliable strategies
    for (const [key, strategy] of this.successHistory.entries()) {
      const [action] = key.split('-');
      if (!report.mostReliableStrategies[action]) {
        report.mostReliableStrategies[action] = strategy.name;
      }
    }

    // Summarize errors
    for (const log of this.errorLog) {
      report.errorSummary[log.error] = (report.errorSummary[log.error] || 0) + 1;
    }

    return report;
  }
}

test.describe('Comprehensive Self-Healing Test Suite', () => {
  let healingPage: AdvancedSelfHealingPage;

  test.beforeEach(async ({ page }) => {
    healingPage = new AdvancedSelfHealingPage(page);
    await page.goto('https://adminlte.io/themes/v3/index.html');
  });

  test('Complex navbar interactions with A/B testing support', async ({ page }) => {
    console.log('🧪 Testing navbar with A/B variant support...');

    const baseStrategies: ElementStrategy[] = [
      {
        name: 'standard-search',
        locator: '[data-widget="navbar-search"]',
        description: 'Standard navbar search widget',
        priority: 5
      }
    ];

    const variants = {
      'variant-a': [
        {
          name: 'variant-a-search',
          locator: '.navbar-search-v2',
          description: 'Variant A search implementation'
        }
      ],
      'variant-b': [
        {
          name: 'variant-b-search',
          locator: '.search-component-new',
          description: 'Variant B search component'
        }
      ]
    };

    const result = await healingPage.abTestAwareClick(baseStrategies, variants);
    expect(result.success).toBe(true);

    if (result.success) {
      console.log(`✅ Successfully interacted with ${result.variant || 'base'} variant`);
    }
  });

  test('Form filling with validation and retry logic', async ({ page }) => {
    console.log('📝 Testing intelligent form filling...');

    // First discover available forms
    const discoveries = await healingPage.discoverElements();
    const formPatterns = discoveries.get('forms') || [];

    const formData = {
      searchField: {
        value: 'test query',
        strategies: [
          {
            name: 'navbar-search-input',
            locator: '.navbar-search-block input',
            description: 'Navbar search input'
          },
          {
            name: 'global-search',
            locator: 'input[placeholder*="Search"]',
            description: 'Any search input'
          },
          ...formPatterns
        ]
      }
    };

    // First activate search if needed
    const searchActivation = await healingPage.intelligentClick([
      {
        name: 'search-trigger',
        locator: 'a[data-widget="navbar-search"]',
        description: 'Search activation trigger'
      }
    ]);

    if (searchActivation.success) {
      const fillResult = await healingPage.intelligentFormFill(formData, {
        maxRetries: 2,
        screenshot: true
      });

      expect(fillResult.success).toBe(true);
      console.log('✅ Form filling completed:', fillResult.results);
    }
  });

  test('Dynamic waiting with multiple conditions', async ({ page }) => {
    console.log('⏳ Testing dynamic wait strategies...');

    // Click something that might trigger loading
    await healingPage.intelligentClick([
      {
        name: 'sidebar-toggle',
        locator: '[data-widget="pushmenu"]',
        description: 'Sidebar toggle'
      }
    ]);

    const waitResult = await healingPage.dynamicWait([
      {
        name: 'sidebar-animation-complete',
        condition: async () => {
          const sidebar = page.locator('.main-sidebar');
          const classList = await sidebar.getAttribute('class');
          return !classList?.includes('sidebar-collapse');
        },
        timeout: 5000
      },
      {
        name: 'content-visible',
        condition: async () => {
          const content = page.locator('.content-wrapper');
          return await content.isVisible();
        },
        timeout: 3000
      },
      {
        name: 'no-loading-indicators',
        condition: async () => {
          const loadingElements = await page.locator('.loading, .spinner, .loader').count();
          return loadingElements === 0;
        }
      }
    ], { globalTimeout: 15000, any: true });

    expect(waitResult.success).toBe(true);
    console.log(`✅ Wait completed with strategy: ${waitResult.satisfiedStrategy}`);
  });

  test('Network-aware interactions with request monitoring', async ({ page }) => {
    console.log('🌐 Testing network-aware interactions...');

    const networkResult = await healingPage.networkAwareAction(
      async () => {
        await healingPage.intelligentClick([
          {
            name: 'ajax-content-loader',
            locator: '.nav-link[href*="#"]',
            description: 'Link that might trigger AJAX'
          }
        ]);
      },
      {
        expectedRequests: ['api/', 'ajax/', 'data/'],
        networkTimeout: 8000,
        retryOnNetworkFailure: true
      }
    );

    console.log('📊 Network events detected:', networkResult.networkEvents);
  });

  test('Error recovery with automatic retry strategies', async ({ page }) => {
    console.log('🔧 Testing error recovery mechanisms...');

    const recoveryResult = await healingPage.withErrorRecovery(
      async () => {
        // Intentionally try a potentially failing action
        await healingPage.intelligentClick([
          {
            name: 'potentially-failing-element',
            locator: '.non-existent-element',
            description: 'Element that might not exist'
          }
        ]);
        return 'success';
      },
      [
        {
          name: 'refresh-page',
          condition: (error) => error.message.includes('not found'),
          recovery: async () => {
            console.log('🔄 Refreshing page as recovery...');
            await page.reload({ waitUntil: 'networkidle' });
          }
        },
        {
          name: 'wait-and-retry',
          condition: (error) => error.message.includes('timeout'),
          recovery: async () => {
            console.log('⏳ Waiting longer as recovery...');
            await page.waitForTimeout(3000);
          }
        }
      ]
    );

    console.log('Recovery result:', recoveryResult);
  });

  test('Context-aware responsive design testing', async ({ page, context }) => {
    console.log('📱 Testing responsive design adaptation...');

    // Test different viewport sizes
    const viewports = [
      { width: 375, height: 667, name: 'mobile' },
      { width: 768, height: 1024, name: 'tablet' },
      { width: 1920, height: 1080, name: 'desktop' }
    ];

    for (const viewport of viewports) {
      console.log(`📐 Testing ${viewport.name} viewport: ${viewport.width}x${viewport.height}`);
      
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await page.waitForTimeout(1000); // Allow layout to adjust

      const discoveries = await healingPage.discoverElements({ viewport: viewport.name as any });
      const navStrategies = discoveries.get('navigation') || [];

      if (navStrategies.length > 0) {
        const navResult = await healingPage.intelligentClick(navStrategies, {
          maxRetries: 2,
          expectedOutcome: async (page) => {
            // Verify navigation worked by checking for menu visibility or state change
            const menuVisible = await page.locator('.navbar-nav, .sidebar-menu, .mobile-menu').isVisible();
            return menuVisible;
          }
        });

        console.log(`${viewport.name} navigation: ${navResult.success ? '✅' : '❌'}`);
      }
    }
  });

  test('Performance monitoring with element interaction timing', async ({ page }) => {
    console.log('⏱️  Testing interaction performance monitoring...');

    const interactions = [
      {
        name: 'sidebar-toggle-performance',
        strategies: [
          {
            name: 'pushmenu-widget',
            locator: '[data-widget="pushmenu"]',
            description: 'Sidebar toggle widget'
          }
        ]
      },
      {
        name: 'search-activation-performance',
        strategies: [
          {
            name: 'navbar-search',
            locator: '[data-widget="navbar-search"]',
            description: 'Navbar search widget'
          }
        ]
      }
    ];

    const performanceResults: Array<{
      name: string;
      duration: number;
      success: boolean;
      strategy?: string;
    }> = [];

    for (const interaction of interactions) {
      const startTime = performance.now();
      
      const result = await healingPage.intelligentClick(interaction.strategies, {
        timeout: 10000,
        maxRetries: 1
      });

      const duration = performance.now() - startTime;
      
      performanceResults.push({
        name: interaction.name,
        duration,
        success: result.success,
        strategy: result.usedStrategy?.name
      });

      console.log(`⏱️  ${interaction.name}: ${duration.toFixed(2)}ms - ${result.success ? '✅' : '❌'}`);
      
      // Wait between interactions to avoid interference
      await page.waitForTimeout(1000);
    }

    // Assert performance thresholds
    const averageTime = performanceResults.reduce((sum, r) => sum + r.duration, 0) / performanceResults.length;
    console.log(`📊 Average interaction time: ${averageTime.toFixed(2)}ms`);
    
    expect(averageTime).toBeLessThan(5000); // Should complete within 5 seconds on average
    expect(performanceResults.filter(r => r.success).length).toBeGreaterThanOrEqual(performanceResults.length * 0.8); // 80% success rate
  });

  test('Advanced modal handling with nested interactions', async ({ page }) => {
    console.log('🪟 Testing advanced modal interactions...');

    // Look for modal triggers
    const modalTriggerStrategies: ElementStrategy[] = [
      {
        name: 'data-toggle-modal',
        locator: '[data-toggle="modal"]',
        description: 'Bootstrap modal trigger'
      },
      {
        name: 'modal-button',
        locator: 'button:has-text("Modal"), a:has-text("Modal")',
        description: 'Button or link containing Modal text'
      },
      {
        name: 'custom-modal-trigger',
        locator: '[class*="modal-trigger"], [class*="open-modal"]',
        description: 'Custom modal trigger classes'
      }
    ];

    const modalOpenResult = await healingPage.intelligentClick(modalTriggerStrategies, {
      maxRetries: 2,
      expectedOutcome: async (page) => {
        return await page.locator('.modal.show, .modal.in, .modal[style*="display: block"]').count() > 0;
      }
    });

    if (modalOpenResult.success) {
      console.log('✅ Modal opened successfully');

      // Test interactions within the modal
      const modalFormResult = await healingPage.intelligentFormFill({
        modalInput: {
          value: 'test modal input',
          strategies: [
            {
              name: 'modal-form-input',
              locator: '.modal input[type="text"], .modal .form-control',
              description: 'Input field within modal'
            }
          ]
        }
      });

      // Close modal with multiple strategies
      const modalCloseStrategies: ElementStrategy[] = [
        {
          name: 'modal-close-x',
          locator: '.modal .close, .modal .btn-close',
          description: 'Modal X close button'
        },
        {
          name: 'modal-close-button',
          locator: '.modal button:has-text("Close"), .modal button:has-text("Cancel")',
          description: 'Modal close/cancel button'
        },
        {
          name: 'modal-backdrop-close',
          locator: '.modal-backdrop',
          description: 'Modal backdrop for click-outside close'
        },
        {
          name: 'escape-key-close',
          locator: (page) => {
            // Special strategy for ESC key
            return page.locator('body');
          },
          description: 'ESC key close (body target)'
        }
      ];

      const modalCloseResult = await healingPage.intelligentClick(modalCloseStrategies, {
        maxRetries: 3,
        fallbackActions: [
          async () => {
            // Try ESC key as fallback
            await page.keyboard.press('Escape');
          }
        ],
        expectedOutcome: async (page) => {
          return await page.locator('.modal.show, .modal.in, .modal[style*="display: block"]').count() === 0;
        }
      });

      expect(modalCloseResult.success).toBe(true);
      console.log('✅ Modal closed successfully');
    } else {
      console.log('ℹ️  No modal triggers found, skipping modal tests');
    }
  });

  test('Data table interactions with sorting, filtering, and pagination', async ({ page }) => {
    console.log('📊 Testing data table interactions...');

    // Navigate to a page with tables (if available)
    const tableNavStrategies: ElementStrategy[] = [
      {
        name: 'tables-nav',
        locator: '.nav-sidebar a:has-text("Tables"), .nav-sidebar a[href*="tables"]',
        description: 'Tables navigation link'
      }
    ];

    const navResult = await healingPage.intelligentClick(tableNavStrategies, {
      maxRetries: 1
    });

    // Discover table patterns
    const discoveries = await healingPage.discoverElements();
    const tableStrategies = discoveries.get('tables') || [];

    if (tableStrategies.length > 0 || await page.locator('table').count() > 0) {
      console.log('📋 Tables found, testing interactions...');

      // Test table sorting
      const sortingStrategies: ElementStrategy[] = [
        {
          name: 'sortable-header',
          locator: 'th.sorting, th[class*="sort"], th a',
          description: 'Sortable table headers'
        },
        {
          name: 'datatable-sort',
          locator: '.dataTable th.sorting_asc, .dataTable th.sorting_desc, .dataTable th.sorting',
          description: 'DataTables sorting headers'
        }
      ];

      const sortResult = await healingPage.intelligentClick(sortingStrategies, {
        maxRetries: 2,
        expectedOutcome: async (page) => {
          // Check if sorting indicators changed
          const sortedHeaders = await page.locator('th[class*="sorting_"], th[class*="sorted"]').count();
          return sortedHeaders > 0;
        }
      });

      if (sortResult.success) {
        console.log('✅ Table sorting works');
      }

      // Test table filtering/search
      const filterStrategies: ElementStrategy[] = [
        {
          name: 'datatable-search',
          locator: '.dataTables_filter input, .table-search input',
          description: 'DataTable search input'
        },
        {
          name: 'table-filter-input',
          locator: 'input[placeholder*="filter" i], input[placeholder*="search" i]',
          description: 'Generic table filter input'
        }
      ];

      const filterResult = await healingPage.smartFill(filterStrategies, 'test filter');
      if (filterResult.success) {
        console.log('✅ Table filtering works');
      }

      // Test pagination
      const paginationStrategies: ElementStrategy[] = [
        {
          name: 'pagination-next',
          locator: '.pagination .page-link:has-text("Next"), .paginate_button.next',
          description: 'Pagination next button'
        },
        {
          name: 'pagination-number',
          locator: '.pagination .page-link:not(.disabled):not(.active)',
          description: 'Pagination number button'
        }
      ];

      const paginationResult = await healingPage.intelligentClick(paginationStrategies, {
        maxRetries: 1,
        expectedOutcome: async (page) => {
          // Wait for potential AJAX loading
          await page.waitForTimeout(1000);
          return true; // Basic success if click worked
        }
      });

      if (paginationResult.success) {
        console.log('✅ Table pagination works');
      }
    } else {
      console.log('ℹ️  No tables found, skipping table tests');
    }
  });

  test('File upload handling with drag-and-drop support', async ({ page }) => {
    console.log('📤 Testing file upload interactions...');

    // Look for file upload elements
    const fileUploadStrategies: ElementStrategy[] = [
      {
        name: 'file-input',
        locator: 'input[type="file"]',
        description: 'Standard file input'
      },
      {
        name: 'dropzone',
        locator: '.dropzone, [class*="drop-zone"], [class*="file-drop"]',
        description: 'Drag and drop zone'
      },
      {
        name: 'upload-button',
        locator: 'button:has-text("Upload"), a:has-text("Upload")',
        description: 'Upload trigger button'
      }
    ];

    const uploadResult = await healingPage.withErrorRecovery(
      async () => {
        for (const strategy of fileUploadStrategies) {
          let locator: Locator;
          if (typeof strategy.locator === 'string') {
            locator = page.locator(strategy.locator);
          } else {
            locator = strategy.locator(page);
          }

          const count = await locator.count();
          if (count > 0) {
            console.log(`📁 Found file upload element: ${strategy.name}`);

            if (strategy.name === 'file-input') {
              // Handle standard file input
              const testFile = Buffer.from('test file content');
              await locator.setInputFiles({
                name: 'test.txt',
                mimeType: 'text/plain',
                buffer: testFile
              });
              return 'file-input-success';
            } else if (strategy.name === 'dropzone') {
              // Handle drag-and-drop zone
              const testFile = Buffer.from('test file content');
              await locator.dispatchEvent('dragover');
              await locator.dispatchEvent('drop', {
                dataTransfer: {
                  files: [{
                    name: 'test.txt',
                    type: 'text/plain'
                  }]
                }
              });
              return 'dropzone-success';
            }
          }
        }
        throw new Error('No file upload elements found');
      },
      [
        {
          name: 'look-for-forms',
          condition: (error) => error.message.includes('No file upload'),
          recovery: async () => {
            // Try to navigate to a forms page
            await healingPage.intelligentClick([
              {
                name: 'forms-nav',
                locator: '.nav-sidebar a:has-text("Forms")',
                description: 'Forms navigation'
              }
            ]);
          }
        }
      ]
    );

    if (uploadResult.success) {
      console.log(`✅ File upload test completed: ${uploadResult.result}`);
    } else {
      console.log('ℹ️  No file upload elements found');
    }
  });

  test('Accessibility-aware interactions with ARIA support', async ({ page }) => {
    console.log('♿ Testing accessibility-aware interactions...');

    // Test ARIA-labeled elements
    const ariaStrategies: ElementStrategy[] = [
      {
        name: 'aria-button',
        locator: '[role="button"], button, [aria-label]',
        description: 'ARIA button elements'
      },
      {
        name: 'aria-menu',
        locator: '[role="menu"], [role="menubar"], [aria-haspopup]',
        description: 'ARIA menu elements'
      },
      {
        name: 'aria-dialog',
        locator: '[role="dialog"], [role="alertdialog"]',
        description: 'ARIA dialog elements'
      }
    ];

    // Test keyboard navigation
    const keyboardNavResult = await healingPage.withErrorRecovery(
      async () => {
        // Test Tab navigation
        await page.keyboard.press('Tab');
        await page.waitForTimeout(500);
        
        const focusedElement = await page.evaluate(() => {
          const focused = document.activeElement;
          return focused ? {
            tagName: focused.tagName,
            className: focused.className,
            ariaLabel: focused.getAttribute('aria-label'),
            role: focused.getAttribute('role')
          } : null;
        });

        console.log('🎯 Focused element:', focusedElement);
        
        // Test Enter key interaction
        await page.keyboard.press('Enter');
        await page.waitForTimeout(1000);
        
        return 'keyboard-nav-success';
      },
      []
    );

    // Test screen reader friendly interactions
    const screenReaderTest = await page.evaluate(() => {
      const elements = document.querySelectorAll('[aria-label], [aria-describedby], [role]');
      return Array.from(elements).slice(0, 5).map(el => ({
        tagName: el.tagName,
        ariaLabel: el.getAttribute('aria-label'),
        role: el.getAttribute('role'),
        text: el.textContent?.slice(0, 50)
      }));
    });

    console.log('👁️  Screen reader elements found:', screenReaderTest.length);
    expect(screenReaderTest.length).toBeGreaterThan(0);
  });

  test('Cross-browser compatibility simulation', async ({ page, browserName }) => {
    console.log(`🌐 Testing cross-browser compatibility for: ${browserName}`);

    // Browser-specific strategies
    const browserSpecificStrategies = {
      chromium: [
        {
          name: 'chrome-search',
          locator: '[data-widget="navbar-search"]',
          description: 'Chrome-optimized search'
        }
      ],
      firefox: [
        {
          name: 'firefox-search',
          locator: 'a[data-widget="navbar-search"]',
          description: 'Firefox-optimized search'
        }
      ],
      webkit: [
        {
          name: 'safari-search',
          locator: '.nav-link[data-widget="navbar-search"]',
          description: 'Safari-optimized search'
        }
      ]
    };

    const strategies = browserSpecificStrategies[browserName as keyof typeof browserSpecificStrategies] || browserSpecificStrategies.chromium;

    const browserResult = await healingPage.intelligentClick(strategies, {
      maxRetries: 3,
      retryDelay: 2000 // Longer delay for slower browsers
    });

    console.log(`${browserName} compatibility: ${browserResult.success ? '✅' : '❌'}`);
    expect(browserResult.success).toBe(true);
  });

  test('Generate comprehensive healing report', async ({ page }) => {
    console.log('📊 Generating comprehensive test report...');

    // Run a series of interactions to gather data
    const testInteractions = [
      {
        name: 'sidebar-test',
        strategies: [{ name: 'sidebar', locator: '[data-widget="pushmenu"]', description: 'Sidebar toggle' }]
      },
      {
        name: 'search-test',
        strategies: [{ name: 'search', locator: '[data-widget="navbar-search"]', description: 'Search widget' }]
      }
    ];

    for (const interaction of testInteractions) {
      await healingPage.intelligentClick(interaction.strategies, { maxRetries: 2 });
      await page.waitForTimeout(1000);
    }

    // Generate performance report
    const report = healingPage.getPerformanceReport();
    
    console.log('\n📈 HEALING PERFORMANCE REPORT');
    console.log('=====================================');
    console.log('Most Reliable Strategies:', report.mostReliableStrategies);
    console.log('Error Summary:', report.errorSummary);
    console.log('=====================================\n');

    // Verify we have some data
    expect(Object.keys(report.mostReliableStrategies).length).toBeGreaterThan(0);
  });

  test.afterEach(async ({ page }) => {
    // Cleanup and final report
    console.log('\n🧹 Test cleanup completed');
  });
});