import { percySnapshot } from '@percy/playwright';

/**
 * Visual Testing Utilities for Percy Integration
 * Provides helper functions for consistent visual regression testing
 */

// Responsive breakpoints configuration
export const BREAKPOINTS = {
  mobile: { width: 375, height: 812 },
  tablet: { width: 768, height: 1024 },
  desktop: { width: 1024, height: 768 },
  largeDesktop: { width: 1440, height: 900 }
};

// Common wait conditions
export const WAIT_CONDITIONS = {
  networkIdle: { waitUntil: 'networkidle' },
  domContentLoaded: { waitUntil: 'domcontentloaded' },
  load: { waitUntil: 'load' }
};

/**
 * Take a Percy snapshot with enhanced options
 * @param {Page} page - Playwright page object
 * @param {string} name - Snapshot name
 * @param {Object} options - Percy snapshot options
 */
export async function takePercySnapshot(page, name, options = {}) {
  const defaultOptions = {
    widths: [375, 768, 1024, 1440],
    minHeight: 1024,
    percyCSS: `
      /* Hide dynamic content */
      .timestamp, .current-time, .random-id, .loading-spinner {
        visibility: hidden !important;
      }
      
      /* Disable animations */
      *, *::before, *::after {
        animation-duration: 0s !important;
        animation-delay: 0s !important;
        transition-duration: 0s !important;
        transition-delay: 0s !important;
      }
      
      /* Hide scrollbars */
      ::-webkit-scrollbar {
        display: none;
      }
    `,
    ...options
  };

  await percySnapshot(page, name, defaultOptions);
}

/**
 * Take responsive snapshots across multiple breakpoints
 * @param {Page} page - Playwright page object
 * @param {string} baseName - Base name for snapshots
 * @param {Object} options - Additional options
 */
export async function takeResponsiveSnapshots(page, baseName, options = {}) {
  const breakpoints = options.breakpoints || Object.keys(BREAKPOINTS);
  
  for (const breakpoint of breakpoints) {
    const { width, height } = BREAKPOINTS[breakpoint];
    
    // Set viewport size
    await page.setViewportSize({ width, height });
    
    // Wait for layout to stabilize
    await page.waitForTimeout(500);
    
    // Take snapshot
    await takePercySnapshot(page, `${baseName} - ${breakpoint}`, {
      widths: [width],
      minHeight: height,
      ...options
    });
  }
}

/**
 * Take a snapshot of a specific element
 * @param {Page} page - Playwright page object
 * @param {string} selector - Element selector
 * @param {string} name - Snapshot name
 * @param {Object} options - Percy options
 */
export async function takeElementSnapshot(page, selector, name, options = {}) {
  // Wait for element to be visible
  await page.waitForSelector(selector, { state: 'visible' });
  
  // Scroll element into view
  await page.locator(selector).scrollIntoViewIfNeeded();
  
  // Wait for any animations to complete
  await page.waitForTimeout(300);
  
  // Take snapshot with element-specific CSS
  await takePercySnapshot(page, name, {
    percyCSS: `
      /* Hide everything except target element */
      body > *:not(:has(${selector})) {
        opacity: 0.1;
      }
      
      /* Highlight target element */
      ${selector} {
        box-shadow: 0 0 0 2px #007acc;
      }
    `,
    ...options
  });
}

/**
 * Wait for page to be ready for visual testing
 * @param {Page} page - Playwright page object
 * @param {Object} options - Wait options
 */
export async function waitForVisualReady(page, options = {}) {
  const {
    waitForSelector = null,
    waitForFunction = null,
    networkIdle = true,
    timeout = 30000
  } = options;

  // Wait for network idle if requested
  if (networkIdle) {
    await page.waitForLoadState('networkidle', { timeout });
  }

  // Wait for specific selector if provided
  if (waitForSelector) {
    await page.waitForSelector(waitForSelector, { state: 'visible', timeout });
  }

  // Wait for custom function if provided
  if (waitForFunction) {
    await page.waitForFunction(waitForFunction, { timeout });
  }

  // Wait for fonts to load
  await page.waitForFunction(() => document.fonts.ready);

  // Additional stabilization wait
  await page.waitForTimeout(500);
}

/**
 * Hide dynamic elements that can cause flaky tests
 * @param {Page} page - Playwright page object
 * @param {Array} selectors - Array of selectors to hide
 */
export async function hideDynamicElements(page, selectors = []) {
  const defaultSelectors = [
    '.timestamp',
    '.current-time',
    '.random-id',
    '.loading-spinner',
    '.progress-bar',
    '[data-testid="dynamic-content"]'
  ];

  const allSelectors = [...defaultSelectors, ...selectors];

  await page.addStyleTag({
    content: `
      ${allSelectors.join(', ')} {
        visibility: hidden !important;
      }
    `
  });
}

/**
 * Disable animations for consistent screenshots
 * @param {Page} page - Playwright page object
 */
export async function disableAnimations(page) {
  await page.addStyleTag({
    content: `
      *, *::before, *::after {
        animation-duration: 0s !important;
        animation-delay: 0s !important;
        transition-duration: 0s !important;
        transition-delay: 0s !important;
      }
      
      .loading, .spinner {
        animation: none !important;
      }
    `
  });
}

/**
 * Take a full page screenshot with Percy
 * @param {Page} page - Playwright page object
 * @param {string} name - Snapshot name
 * @param {Object} options - Percy options
 */
export async function takeFullPageSnapshot(page, name, options = {}) {
  // Prepare page for visual testing
  await waitForVisualReady(page);
  await disableAnimations(page);
  await hideDynamicElements(page);

  // Take full page snapshot
  await takePercySnapshot(page, name, {
    fullPage: true,
    ...options
  });
}

/**
 * Compare visual states before and after an action
 * @param {Page} page - Playwright page object
 * @param {string} baseName - Base name for snapshots
 * @param {Function} action - Action to perform between snapshots
 * @param {Object} options - Percy options
 */
export async function compareBeforeAfter(page, baseName, action, options = {}) {
  // Take before snapshot
  await takePercySnapshot(page, `${baseName} - Before`, options);

  // Perform action
  await action();

  // Wait for changes to settle
  await page.waitForTimeout(500);

  // Take after snapshot
  await takePercySnapshot(page, `${baseName} - After`, options);
}

/**
 * Test component in different states
 * @param {Page} page - Playwright page object
 * @param {string} componentName - Component name
 * @param {Object} states - Object with state names and setup functions
 * @param {Object} options - Percy options
 */
export async function testComponentStates(page, componentName, states, options = {}) {
  for (const [stateName, setupFunction] of Object.entries(states)) {
    // Setup component state
    await setupFunction(page);
    
    // Wait for state to stabilize
    await waitForVisualReady(page);
    
    // Take snapshot
    await takePercySnapshot(page, `${componentName} - ${stateName}`, options);
  }
}