import { chromium, firefox, webkit } from 'playwright';

class PlaywrightService {
  constructor() {
    this.browsers = new Map();
    this.ready = false;
  }

  async initialize() {
    try {
      console.log('🎭 Initializing Playwright Service...');
      this.ready = true;
      console.log('✅ Playwright Service ready');
    } catch (error) {
      console.error('❌ Failed to initialize Playwright Service:', error);
      this.ready = false;
    }
  }

  isReady() {
    return this.ready;
  }

  async getAvailableBrowsers() {
    return [
      { name: 'chromium', displayName: 'Chromium', installed: true },
      { name: 'firefox', displayName: 'Firefox', installed: true },
      { name: 'webkit', displayName: 'WebKit (Safari)', installed: true }
    ];
  }

  async getBrowser(browserName = 'chromium') {
    if (this.browsers.has(browserName)) {
      return this.browsers.get(browserName);
    }

    let browser;
    switch (browserName) {
      case 'firefox':
        browser = await firefox.launch({ headless: true });
        break;
      case 'webkit':
        browser = await webkit.launch({ headless: true });
        break;
      default:
        browser = await chromium.launch({ headless: true });
    }

    this.browsers.set(browserName, browser);
    return browser;
  }

  async launchBrowser(browserName = 'chromium', options = {}) {
    return await this.getBrowser(browserName);
  }

  async inspectPage(url, browserName = 'chromium') {
    const browser = await this.getBrowser(browserName);
    const context = await browser.newContext();
    const page = await context.newPage();

    try {
      await page.goto(url, { waitUntil: 'networkidle' });
      
      const inspection = {
        url,
        title: await page.title(),
        viewport: page.viewportSize(),
        elements: await this.extractElements(page),
        forms: await this.extractForms(page),
        navigation: await this.extractNavigation(page),
        interactions: await this.extractInteractiveElements(page),
        accessibility: await this.extractAccessibilityInfo(page),
        performance: await this.getPerformanceMetrics(page)
      };

      return inspection;
    } finally {
      await context.close();
    }
  }

  async discoverElements(url, browserName = 'chromium', context = {}) {
    const browser = await this.getBrowser(browserName);
    const browserContext = await browser.newContext({
      viewport: context.viewport || { width: 1920, height: 1080 },
      userAgent: context.userAgent,
      locale: context.language || 'en-US',
      ignoreHTTPSErrors: true,
      extraHTTPHeaders: context.headers || undefined,
    });
    const page = await browserContext.newPage();

    // Allow configurable timeouts and wait strategies via context
    const navTimeout = Number(context.navigationTimeout) || 45000;
    const waitUntil = context.waitUntil || 'domcontentloaded';
    const waitForNetworkIdle = context.waitForNetworkIdle !== false; // default true
    const networkIdleTimeout = Number(context.networkIdleTimeout) || 10000;

    page.setDefaultNavigationTimeout(navTimeout);

    // Optionally block heavy resources to speed up/load simpler DOM
    if (context.blockHeavy) {
      await page.route('**/*', (route) => {
        const type = route.request().resourceType();
        if (type === 'image' || type === 'media' || type === 'font' || type === 'stylesheet') {
          return route.abort();
        }
        return route.continue();
      });
    }

    try {
      // First attempt: more permissive waitUntil
      await page.goto(url, { waitUntil, timeout: navTimeout });
      if (waitForNetworkIdle) {
        try {
          await page.waitForLoadState('networkidle', { timeout: networkIdleTimeout });
        } catch (_) {
          // networkidle may not settle on some modern SPAs; proceed anyway
        }
      }

      // Optional pre-consent clicks (cookie banners etc.)
      if (Array.isArray(context.preClickSelectors)) {
        for (const sel of context.preClickSelectors) {
          try {
            const loc = page.locator(sel).first();
            await loc.waitFor({ state: 'visible', timeout: 1500 });
            await loc.click({ timeout: 1500 });
          } catch (_) {}
        }
      }

      // Optional readiness gate: wait for a stable element to appear
      if (context.readySelector) {
        try {
          await page.waitForSelector(context.readySelector, { state: 'visible', timeout: Math.min(navTimeout, 20000) });
        } catch (_) {}
      }

      const discoveries = {
        buttons: await this.discoverButtons(page),
        inputs: await this.discoverInputs(page),
        links: await this.discoverLinks(page),
        forms: await this.discoverForms(page),
        modals: await this.discoverModals(page),
        tables: await this.discoverTables(page),
        navigation: await this.discoverNavigation(page, context.viewport?.width <= 768),
        search: await this.discoverSearch(page),
        notifications: await this.discoverNotifications(page),
        jquery: await this.discoverJQueryComponents(page)
      };

      return discoveries;
    } catch (err) {
      // Retry once on navigation timeout with a different strategy
      const isTimeout = err && (err.name === 'TimeoutError' || /Timeout/i.test(err.message || ''));
      if (isTimeout) {
        try {
          await page.goto(url, { waitUntil: 'load', timeout: navTimeout + 15000 });
          if (waitForNetworkIdle) {
            try {
              await page.waitForLoadState('networkidle', { timeout: networkIdleTimeout });
            } catch (_) {}
          }
          if (Array.isArray(context.preClickSelectors)) {
            for (const sel of context.preClickSelectors) {
              try {
                const loc = page.locator(sel).first();
                await loc.waitFor({ state: 'visible', timeout: 1500 });
                await loc.click({ timeout: 1500 });
              } catch (_) {}
            }
          }
          if (context.readySelector) {
            try {
              await page.waitForSelector(context.readySelector, { state: 'visible', timeout: Math.min(navTimeout, 20000) });
            } catch (_) {}
          }
          const discoveries = {
            buttons: await this.discoverButtons(page),
            inputs: await this.discoverInputs(page),
            links: await this.discoverLinks(page),
            forms: await this.discoverForms(page),
            modals: await this.discoverModals(page),
            tables: await this.discoverTables(page),
            navigation: await this.discoverNavigation(page, context.viewport?.width <= 768),
            search: await this.discoverSearch(page),
            notifications: await this.discoverNotifications(page),
            jquery: await this.discoverJQueryComponents(page)
          };
          return discoveries;
        } catch (retryErr) {
          throw retryErr;
        }
      }
      throw err;
    } finally {
      await browserContext.close();
    }
  }

  async discoverJQueryComponents(page) {
    return await page.evaluate(() => {
      const generateSelector = (element) => {
        if (element.id) return `#${element.id}`;
        if (element.className && typeof element.className === 'string') {
          const classes = element.className.split(' ').filter(c => c && !c.match(/^\d/));
          if (classes.length > 0) return `.${classes[0]}`;
        }
        const tagName = element.tagName.toLowerCase();
        const parent = element.parentElement;
        if (parent) {
          const siblings = Array.from(parent.children).filter(el => el.tagName === element.tagName);
          if (siblings.length > 1) {
            const index = siblings.indexOf(element) + 1;
            return `${tagName}:nth-of-type(${index})`;
          }
        }
        return tagName;
      };

      const components = [];
      const push = (type, el, extra = {}) => {
        const rect = el.getBoundingClientRect();
        if (rect.width <= 0 || rect.height <= 0) return;
        components.push({
          type,
          name: `${type}-${components.length}`,
          locator: generateSelector(el),
          description: `${type} (${el.tagName.toLowerCase()})`,
          position: { x: rect.x, y: rect.y, width: rect.width, height: rect.height },
          ...extra
        });
      };

      // Detect presence/version
      let jqueryVersion = null;
      try { if (window.jQuery && window.jQuery.fn && window.jQuery.fn.jquery) { jqueryVersion = window.jQuery.fn.jquery; } } catch {}

      // jQuery UI core widgets
      document.querySelectorAll('.ui-accordion').forEach(el => push('jquery-ui-accordion', el));
      document.querySelectorAll('.ui-tabs').forEach(el => push('jquery-ui-tabs', el));
      document.querySelectorAll('.ui-dialog, [role="dialog"].ui-dialog-content').forEach(el => push('jquery-ui-dialog', el));
      document.querySelectorAll('.ui-datepicker, .hasDatepicker, input.datepicker').forEach(el => push('jquery-ui-datepicker', el));
      document.querySelectorAll('.ui-slider').forEach(el => push('jquery-ui-slider', el));
      document.querySelectorAll('.ui-progressbar').forEach(el => push('jquery-ui-progressbar', el));
      document.querySelectorAll('.ui-autocomplete, input[role="combobox"]').forEach(el => push('jquery-ui-autocomplete', el));
      document.querySelectorAll('.ui-tooltip').forEach(el => push('jquery-ui-tooltip', el));
      document.querySelectorAll('.ui-menu, .ui-selectmenu-menu').forEach(el => push('jquery-ui-menu', el));
      document.querySelectorAll('.ui-draggable').forEach(el => push('jquery-ui-draggable', el));
      document.querySelectorAll('.ui-droppable').forEach(el => push('jquery-ui-droppable', el));
      document.querySelectorAll('.ui-sortable').forEach(el => push('jquery-ui-sortable', el));
      document.querySelectorAll('.ui-resizable').forEach(el => push('jquery-ui-resizable', el));

      // Common jQuery plugin patterns (Bootstrap 3 legacy data-api, etc.)
      document.querySelectorAll('[data-toggle="modal"]').forEach(el => push('jquery-bs-modal-toggle', el));
      document.querySelectorAll('[data-toggle="dropdown"], .dropdown-toggle').forEach(el => push('jquery-bs-dropdown-toggle', el));
      document.querySelectorAll('[data-toggle="collapse"], .navbar-toggler').forEach(el => push('jquery-bs-collapse-toggle', el));
      document.querySelectorAll('[data-slide], .carousel').forEach(el => push('jquery-bs-carousel', el));

      return { version: jqueryVersion, components };
    });
  }

  async extractElements(page) {
    return await page.evaluate(() => {
      const elements = [];
      const selectors = [
        'button', 'input', 'select', 'textarea', 'a[href]',
        '[role="button"]', '[role="link"]', '[role="textbox"]',
        '.btn', '.button', '.link', '.nav-link'
      ];

      selectors.forEach(selector => {
        document.querySelectorAll(selector).forEach((el, index) => {
          const rect = el.getBoundingClientRect();
          if (rect.width > 0 && rect.height > 0) {
            elements.push({
              tagName: el.tagName.toLowerCase(),
              selector: selector,
              text: el.textContent?.trim().substring(0, 100) || '',
              id: el.id || null,
              className: el.className || null,
              type: el.type || null,
              href: el.href || null,
              role: el.getAttribute('role') || null,
              ariaLabel: el.getAttribute('aria-label') || null,
              position: { x: rect.x, y: rect.y, width: rect.width, height: rect.height },
              visible: rect.width > 0 && rect.height > 0,
              index
            });
          }
        });
      });

      return elements;
    });
  }

  async extractForms(page) {
    return await page.evaluate(() => {
      const forms = [];
      document.querySelectorAll('form').forEach((form, index) => {
        const fields = [];
        form.querySelectorAll('input, select, textarea').forEach(field => {
          fields.push({
            name: field.name || null,
            type: field.type || 'text',
            id: field.id || null,
            placeholder: field.placeholder || null,
            required: field.required || false,
            value: field.value || ''
          });
        });

        forms.push({
          index,
          action: form.action || null,
          method: form.method || 'get',
          fields,
          submitButton: form.querySelector('[type="submit"], button:not([type])') ? true : false
        });
      });

      return forms;
    });
  }

  async extractNavigation(page) {
    return await page.evaluate(() => {
      const navigation = {
        mainNav: [],
        breadcrumbs: [],
        sidebar: [],
        footer: []
      };

      // Main navigation
      const navSelectors = ['nav', '.navbar', '.navigation', '.main-nav', '.header-nav'];
      navSelectors.forEach(selector => {
        document.querySelectorAll(`${selector} a`).forEach(link => {
          navigation.mainNav.push({
            text: link.textContent?.trim() || '',
            href: link.href || null,
            active: link.classList.contains('active') || link.getAttribute('aria-current') === 'page'
          });
        });
      });

      // Breadcrumbs
      document.querySelectorAll('.breadcrumb a, .breadcrumbs a, [aria-label="breadcrumb"] a').forEach(link => {
        navigation.breadcrumbs.push({
          text: link.textContent?.trim() || '',
          href: link.href || null
        });
      });

      return navigation;
    });
  }

  generateSelector(element) {
    // Generate a unique selector for an element
    if (element.id) {
      return `#${element.id}`;
    }
    
    if (element.className && typeof element.className === 'string') {
      const classes = element.className.split(' ').filter(c => c && !c.match(/^\d/));
      if (classes.length > 0) {
        return `.${classes[0]}`;
      }
    }
    
    const tagName = element.tagName.toLowerCase();
    const parent = element.parentElement;
    if (parent) {
      const siblings = Array.from(parent.children).filter(el => el.tagName === element.tagName);
      if (siblings.length > 1) {
        const index = siblings.indexOf(element) + 1;
        return `${tagName}:nth-of-type(${index})`;
      }
    }
    
    return tagName;
  }

  getInteractionType(element) {
    const tagName = element.tagName.toLowerCase();
    const type = element.type?.toLowerCase();
    
    if (tagName === 'button' || element.getAttribute('role') === 'button') return 'click';
    if (tagName === 'a') return 'click';
    if (tagName === 'input') {
      if (['button', 'submit', 'reset'].includes(type)) return 'click';
      if (['text', 'email', 'password', 'search'].includes(type)) return 'fill';
      if (type === 'checkbox' || type === 'radio') return 'check';
    }
    if (tagName === 'select') return 'select';
    if (tagName === 'textarea') return 'fill';
    
    return 'click';
  }

  calculatePriority(element, selector) {
    let priority = 1;
    
    if (element.id) priority += 3;
    if (element.className) priority += 2;
    if (element.getAttribute('data-testid')) priority += 4;
    if (element.getAttribute('aria-label')) priority += 2;
    if (selector.includes('btn') || selector.includes('button')) priority += 2;
    
    return Math.min(priority, 10);
  }

  async extractInteractiveElements(page) {
    return await page.evaluate(() => {
      const generateSelector = (element) => {
        if (element.id) {
          return `#${element.id}`;
        }
        
        if (element.className && typeof element.className === 'string') {
          const classes = element.className.split(' ').filter(c => c && !c.match(/^\d/));
          if (classes.length > 0) {
            return `.${classes[0]}`;
          }
        }
        
        const tagName = element.tagName.toLowerCase();
        const parent = element.parentElement;
        if (parent) {
          const siblings = Array.from(parent.children).filter(el => el.tagName === element.tagName);
          if (siblings.length > 1) {
            const index = siblings.indexOf(element) + 1;
            return `${tagName}:nth-of-type(${index})`;
          }
        }
        
        return tagName;
      };
      
      const getInteractionType = (element) => {
        const tagName = element.tagName.toLowerCase();
        const type = element.type?.toLowerCase();
        
        if (tagName === 'button' || element.getAttribute('role') === 'button') return 'click';
        if (tagName === 'a') return 'click';
        if (tagName === 'input') {
          if (['button', 'submit', 'reset'].includes(type)) return 'click';
          if (['text', 'email', 'password', 'search'].includes(type)) return 'fill';
          if (type === 'checkbox' || type === 'radio') return 'check';
        }
        if (tagName === 'select') return 'select';
        if (tagName === 'textarea') return 'fill';
        
        return 'click';
      };
      
      const interactive = [];
      const selectors = [
        'button:not([disabled])',
        'input:not([disabled])',
        'select:not([disabled])',
        'textarea:not([disabled])',
        'a[href]',
        '[role="button"]:not([aria-disabled="true"])',
        '[tabindex]:not([tabindex="-1"])',
        '[onclick]'
      ];

      selectors.forEach(selector => {
        document.querySelectorAll(selector).forEach(el => {
          const rect = el.getBoundingClientRect();
          if (rect.width > 0 && rect.height > 0) {
            interactive.push({
              selector: generateSelector(el),
              type: el.tagName.toLowerCase(),
              interactionType: getInteractionType(el),
              text: el.textContent?.trim().substring(0, 50) || '',
              position: { x: rect.x, y: rect.y },
              visible: true,
              enabled: !el.disabled && el.getAttribute('aria-disabled') !== 'true'
            });
          }
        });
      });

      return interactive;
    });
  }

  async extractAccessibilityInfo(page) {
    return await page.evaluate(() => {
      const generateSelector = (element) => {
        if (element.id) return `#${element.id}`;
        if (element.className && typeof element.className === 'string') {
          const classes = element.className.split(' ').filter(c => c && !c.match(/^\d/));
          if (classes.length > 0) return `.${classes[0]}`;
        }
        const tagName = element.tagName.toLowerCase();
        const parent = element.parentElement;
        if (parent) {
          const siblings = Array.from(parent.children).filter(el => el.tagName === element.tagName);
          if (siblings.length > 1) {
            const index = siblings.indexOf(element) + 1;
            return `${tagName}:nth-of-type(${index})`;
          }
        }
        return tagName;
      };
      
      const accessibility = {
        landmarks: [],
        headings: [],
        ariaElements: [],
        focusableElements: []
      };

      // Landmarks
      document.querySelectorAll('[role="main"], [role="navigation"], [role="banner"], [role="contentinfo"], [role="complementary"]').forEach(el => {
        accessibility.landmarks.push({
          role: el.getAttribute('role'),
          label: el.getAttribute('aria-label') || el.getAttribute('aria-labelledby') || '',
          selector: generateSelector(el)
        });
      });

      // Headings
      document.querySelectorAll('h1, h2, h3, h4, h5, h6').forEach(heading => {
        accessibility.headings.push({
          level: parseInt(heading.tagName.charAt(1)),
          text: heading.textContent?.trim() || '',
          selector: generateSelector(heading)
        });
      });

      return accessibility;
    });
  }

  async getPerformanceMetrics(page) {
    return await page.evaluate(() => {
      const navigation = performance.getEntriesByType('navigation')[0];
      return {
        loadTime: navigation ? navigation.loadEventEnd - navigation.loadEventStart : 0,
        domContentLoaded: navigation ? navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart : 0,
        firstPaint: performance.getEntriesByName('first-paint')[0]?.startTime || 0,
        firstContentfulPaint: performance.getEntriesByName('first-contentful-paint')[0]?.startTime || 0
      };
    });
  }

  // Discovery methods for different element types
  async discoverButtons(page) {
    return await page.evaluate(() => {
      const generateSelector = (element) => {
        if (element.id) return `#${element.id}`;
        if (element.className && typeof element.className === 'string') {
          const classes = element.className.split(' ').filter(c => c && !c.match(/^\d/));
          if (classes.length > 0) return `.${classes[0]}`;
        }
        const tagName = element.tagName.toLowerCase();
        const parent = element.parentElement;
        if (parent) {
          const siblings = Array.from(parent.children).filter(el => el.tagName === element.tagName);
          if (siblings.length > 1) {
            const index = siblings.indexOf(element) + 1;
            return `${tagName}:nth-of-type(${index})`;
          }
        }
        return tagName;
      };
      
      const calculatePriority = (element, selector) => {
        let priority = 1;
        if (element.id) priority += 3;
        if (element.className) priority += 2;
        if (element.getAttribute('data-testid')) priority += 4;
        if (element.getAttribute('aria-label')) priority += 2;
        if (selector.includes('btn') || selector.includes('button')) priority += 2;
        return Math.min(priority, 10);
      };
      
      const buttons = [];
      const selectors = [
        'button',
        'input[type="button"]',
        'input[type="submit"]',
        '[role="button"]',
        '.btn',
        '.button',
        'a.btn'
      ];

      selectors.forEach(selector => {
        document.querySelectorAll(selector).forEach((btn, index) => {
          const rect = btn.getBoundingClientRect();
          if (rect.width > 0 && rect.height > 0) {
            buttons.push({
              name: `${selector.replace(/[^\w]/g, '-')}-${index}`,
              locator: generateSelector(btn),
              description: `${btn.textContent?.trim() || 'Button'} (${selector})`,
              priority: calculatePriority(btn, selector),
              text: btn.textContent?.trim() || '',
              type: btn.type || 'button',
              disabled: btn.disabled || btn.getAttribute('aria-disabled') === 'true'
            });
          }
        });
      });

      return buttons.sort((a, b) => b.priority - a.priority);
    });
  }

  async discoverInputs(page) {
    return await page.evaluate(() => {
      const generateSelector = (element) => {
        if (element.id) return `#${element.id}`;
        if (element.className && typeof element.className === 'string') {
          const classes = element.className.split(' ').filter(c => c && !c.match(/^\d/));
          if (classes.length > 0) return `.${classes[0]}`;
        }
        const tagName = element.tagName.toLowerCase();
        const parent = element.parentElement;
        if (parent) {
          const siblings = Array.from(parent.children).filter(el => el.tagName === element.tagName);
          if (siblings.length > 1) {
            const index = siblings.indexOf(element) + 1;
            return `${tagName}:nth-of-type(${index})`;
          }
        }
        return tagName;
      };
      
      const calculatePriority = (element, selector) => {
        let priority = 1;
        if (element.id) priority += 3;
        if (element.className) priority += 2;
        if (element.getAttribute('data-testid')) priority += 4;
        if (element.getAttribute('aria-label')) priority += 2;
        if (selector.includes('input') || selector.includes('textarea')) priority += 2;
        return Math.min(priority, 10);
      };
      
      const inputs = [];
      const selectors = [
        'input:not([type="hidden"])',
        'textarea',
        'select',
        '[role="textbox"]',
        '[contenteditable="true"]'
      ];

      selectors.forEach(selector => {
        document.querySelectorAll(selector).forEach((input, index) => {
          const rect = input.getBoundingClientRect();
          if (rect.width > 0 && rect.height > 0) {
            inputs.push({
              name: `${selector.replace(/[^\w]/g, '-')}-${index}`,
              locator: generateSelector(input),
              description: `${input.placeholder || input.name || 'Input'} (${selector})`,
              priority: calculatePriority(input, selector),
              type: input.type || 'text',
              placeholder: input.placeholder || '',
              required: input.required || false,
              name: input.name || ''
            });
          }
        });
      });

      return inputs.sort((a, b) => b.priority - a.priority);
    });
  }

  async discoverLinks(page) {
    return await page.evaluate(() => {
      const generateSelector = (element) => {
        if (element.id) return `#${element.id}`;
        if (element.className && typeof element.className === 'string') {
          const classes = element.className.split(' ').filter(c => c && !c.match(/^\d/));
          if (classes.length > 0) return `.${classes[0]}`;
        }
        const tagName = element.tagName.toLowerCase();
        const parent = element.parentElement;
        if (parent) {
          const siblings = Array.from(parent.children).filter(el => el.tagName === element.tagName);
          if (siblings.length > 1) {
            const index = siblings.indexOf(element) + 1;
            return `${tagName}:nth-of-type(${index})`;
          }
        }
        return tagName;
      };
      
      const calculatePriority = (element, selector) => {
        let priority = 1;
        if (element.id) priority += 3;
        if (element.className) priority += 2;
        if (element.getAttribute('data-testid')) priority += 4;
        if (element.getAttribute('aria-label')) priority += 2;
        if (selector.includes('link') || selector.includes('nav')) priority += 2;
        return Math.min(priority, 10);
      };
      
      const links = [];
      document.querySelectorAll('a[href]').forEach((link, index) => {
        const rect = link.getBoundingClientRect();
        if (rect.width > 0 && rect.height > 0) {
          links.push({
            name: `link-${index}`,
            locator: generateSelector(link),
            description: `${link.textContent?.trim() || 'Link'} (${link.href})`,
            priority: calculatePriority(link, 'a[href]'),
            text: link.textContent?.trim() || '',
            href: link.href,
            external: !link.href.startsWith(window.location.origin)
          });
        }
      });

      return links.sort((a, b) => b.priority - a.priority);
    });
  }

  async discoverForms(page) {
    return await page.evaluate(() => {
      const generateSelector = (element) => {
        if (element.id) return `#${element.id}`;
        if (element.className && typeof element.className === 'string') {
          const classes = element.className.split(' ').filter(c => c && !c.match(/^\d/));
          if (classes.length > 0) return `.${classes[0]}`;
        }
        const tagName = element.tagName.toLowerCase();
        const parent = element.parentElement;
        if (parent) {
          const siblings = Array.from(parent.children).filter(el => el.tagName === element.tagName);
          if (siblings.length > 1) {
            const index = siblings.indexOf(element) + 1;
            return `${tagName}:nth-of-type(${index})`;
          }
        }
        return tagName;
      };
      
      const forms = [];
      document.querySelectorAll('form').forEach((form, index) => {
        forms.push({
          name: `form-${index}`,
          locator: generateSelector(form),
          description: `Form ${index + 1} (${form.action || 'no action'})`,
          priority: 5,
          action: form.action || '',
          method: form.method || 'get',
          fieldCount: form.querySelectorAll('input, textarea, select').length
        });
      });

      return forms;
    });
  }

  async discoverModals(page) {
    return await page.evaluate(() => {
      const generateSelector = (element) => {
        if (element.id) return `#${element.id}`;
        if (element.className && typeof element.className === 'string') {
          const classes = element.className.split(' ').filter(c => c && !c.match(/^\d/));
          if (classes.length > 0) return `.${classes[0]}`;
        }
        const tagName = element.tagName.toLowerCase();
        const parent = element.parentElement;
        if (parent) {
          const siblings = Array.from(parent.children).filter(el => el.tagName === element.tagName);
          if (siblings.length > 1) {
            const index = siblings.indexOf(element) + 1;
            return `${tagName}:nth-of-type(${index})`;
          }
        }
        return tagName;
      };
      
      const calculatePriority = (element, selector) => {
        let priority = 1;
        if (element.id) priority += 3;
        if (element.className) priority += 2;
        if (element.getAttribute('data-testid')) priority += 4;
        if (element.getAttribute('aria-label')) priority += 2;
        if (selector.includes('modal') || selector.includes('dialog')) priority += 2;
        return Math.min(priority, 10);
      };
      
      const modals = [];
      const selectors = [
        '.modal',
        '[role="dialog"]',
        '[role="alertdialog"]',
        '.dialog',
        '.popup',
        '.overlay'
      ];

      selectors.forEach(selector => {
        document.querySelectorAll(selector).forEach((modal, index) => {
          modals.push({
            name: `${selector.replace(/[^\w]/g, '-')}-${index}`,
            locator: generateSelector(modal),
            description: `Modal dialog (${selector})`,
            priority: calculatePriority(modal, selector),
            visible: modal.style.display !== 'none' && !modal.hidden,
            hasCloseButton: modal.querySelector('.close, [aria-label*="close" i], [data-dismiss]') !== null
          });
        });
      });

      return modals;
    });
  }

  async discoverTables(page) {
    return await page.evaluate(() => {
      const generateSelector = (element) => {
        if (element.id) return `#${element.id}`;
        if (element.className && typeof element.className === 'string') {
          const classes = element.className.split(' ').filter(c => c && !c.match(/^\d/));
          if (classes.length > 0) return `.${classes[0]}`;
        }
        const tagName = element.tagName.toLowerCase();
        const parent = element.parentElement;
        if (parent) {
          const siblings = Array.from(parent.children).filter(el => el.tagName === element.tagName);
          if (siblings.length > 1) {
            const index = siblings.indexOf(element) + 1;
            return `${tagName}:nth-of-type(${index})`;
          }
        }
        return tagName;
      };
      
      const tables = [];
      document.querySelectorAll('table').forEach((table, index) => {
        const headers = Array.from(table.querySelectorAll('th')).map(th => th.textContent?.trim() || '');
        tables.push({
          name: `table-${index}`,
          locator: generateSelector(table),
          description: `Data table with ${headers.length} columns`,
          priority: 5,
          headers,
          rowCount: table.querySelectorAll('tbody tr, tr').length,
          sortable: table.querySelector('th.sortable, th[data-sort]') !== null
        });
      });

      return tables;
    });
  }

  async discoverNavigation(page, isMobile = false) {
    return await page.evaluate((isMobile) => {
      const generateSelector = (element) => {
        if (element.id) return `#${element.id}`;
        if (element.className && typeof element.className === 'string') {
          const classes = element.className.split(' ').filter(c => c && !c.match(/^\d/));
          if (classes.length > 0) return `.${classes[0]}`;
        }
        const tagName = element.tagName.toLowerCase();
        const parent = element.parentElement;
        if (parent) {
          const siblings = Array.from(parent.children).filter(el => el.tagName === element.tagName);
          if (siblings.length > 1) {
            const index = siblings.indexOf(element) + 1;
            return `${tagName}:nth-of-type(${index})`;
          }
        }
        return tagName;
      };
      
      const navigation = [];
      
      if (isMobile) {
        // Mobile-specific navigation patterns
        const mobileSelectors = [
          '.navbar-toggler',
          '.mobile-menu-toggle',
          '.hamburger',
          'button[aria-label*="menu" i]',
          '[data-toggle="collapse"]'
        ];

        mobileSelectors.forEach(selector => {
          document.querySelectorAll(selector).forEach((nav, index) => {
            navigation.push({
              name: `mobile-nav-${selector.replace(/[^\w]/g, '-')}-${index}`,
              locator: generateSelector(nav),
              description: `Mobile navigation trigger (${selector})`,
              priority: 10,
              type: 'mobile-trigger'
            });
          });
        });
      } else {
        // Desktop navigation patterns
        const desktopSelectors = [
          '.navbar-nav .nav-link',
          '.main-nav a',
          'nav a',
          '.navigation a'
        ];

        desktopSelectors.forEach(selector => {
          document.querySelectorAll(selector).forEach((nav, index) => {
            navigation.push({
              name: `desktop-nav-${selector.replace(/[^\w]/g, '-')}-${index}`,
              locator: generateSelector(nav),
              description: `Desktop navigation item (${nav.textContent?.trim() || 'Nav Item'})`,
              priority: 7,
              type: 'desktop-nav',
              text: nav.textContent?.trim() || ''
            });
          });
        });
      }

      return navigation.sort((a, b) => b.priority - a.priority);
    }, isMobile);
  }

  async discoverSearch(page) {
    return await page.evaluate(() => {
      const generateSelector = (element) => {
        if (element.id) return `#${element.id}`;
        if (element.className && typeof element.className === 'string') {
          const classes = element.className.split(' ').filter(c => c && !c.match(/^\d/));
          if (classes.length > 0) return `.${classes[0]}`;
        }
        const tagName = element.tagName.toLowerCase();
        const parent = element.parentElement;
        if (parent) {
          const siblings = Array.from(parent.children).filter(el => el.tagName === element.tagName);
          if (siblings.length > 1) {
            const index = siblings.indexOf(element) + 1;
            return `${tagName}:nth-of-type(${index})`;
          }
        }
        return tagName;
      };
      
      const calculatePriority = (element, selector) => {
        let priority = 1;
        if (element.id) priority += 3;
        if (element.className) priority += 2;
        if (element.getAttribute('data-testid')) priority += 4;
        if (element.getAttribute('aria-label')) priority += 2;
        if (selector.includes('search')) priority += 2;
        return Math.min(priority, 10);
      };
      
      const search = [];
      const selectors = [
        'input[type="search"]',
        'input[placeholder*="search" i]',
        '.search-input',
        '[data-widget="navbar-search"]',
        '.search-toggle'
      ];

      selectors.forEach(selector => {
        document.querySelectorAll(selector).forEach((searchEl, index) => {
          search.push({
            name: `search-${selector.replace(/[^\w]/g, '-')}-${index}`,
            locator: generateSelector(searchEl),
            description: `Search element (${selector})`,
            priority: calculatePriority(searchEl, selector),
            type: searchEl.tagName.toLowerCase(),
            placeholder: searchEl.placeholder || ''
          });
        });
      });

      return search.sort((a, b) => b.priority - a.priority);
    });
  }

  async discoverNotifications(page) {
    return await page.evaluate(() => {
      const generateSelector = (element) => {
        if (element.id) return `#${element.id}`;
        if (element.className && typeof element.className === 'string') {
          const classes = element.className.split(' ').filter(c => c && !c.match(/^\d/));
          if (classes.length > 0) return `.${classes[0]}`;
        }
        const tagName = element.tagName.toLowerCase();
        const parent = element.parentElement;
        if (parent) {
          const siblings = Array.from(parent.children).filter(el => el.tagName === element.tagName);
          if (siblings.length > 1) {
            const index = siblings.indexOf(element) + 1;
            return `${tagName}:nth-of-type(${index})`;
          }
        }
        return tagName;
      };
      
      const calculatePriority = (element, selector) => {
        let priority = 1;
        if (element.id) priority += 3;
        if (element.className) priority += 2;
        if (element.getAttribute('data-testid')) priority += 4;
        if (element.getAttribute('aria-label')) priority += 2;
        if (selector.includes('alert') || selector.includes('notification')) priority += 2;
        return Math.min(priority, 10);
      };
      
      const notifications = [];
      const selectors = [
        '.toast',
        '.notification',
        '.alert',
        '.message',
        '[role="alert"]',
        '.alert-dismissible'
      ];

      selectors.forEach(selector => {
        document.querySelectorAll(selector).forEach((notif, index) => {
          notifications.push({
            name: `notification-${selector.replace(/[^\w]/g, '-')}-${index}`,
            locator: generateSelector(notif),
            description: `Notification element (${selector})`,
            priority: calculatePriority(notif, selector),
            visible: notif.style.display !== 'none' && !notif.hidden,
            dismissible: notif.querySelector('.close, [data-dismiss]') !== null,
            text: notif.textContent?.trim().substring(0, 100) || ''
          });
        });
      });

      return notifications;
    });
  }

  async closeBrowser(browserName) {
    if (this.browsers.has(browserName)) {
      const browser = this.browsers.get(browserName);
      await browser.close();
      this.browsers.delete(browserName);
    }
  }

  async closeAllBrowsers() {
    for (const [name, browser] of this.browsers) {
      await browser.close();
    }
    this.browsers.clear();
  }

  // Test execution methods
  async executeSingleTest({ testCode, browser = 'chromium', options = {}, executionId, progressCallback }) {
    const browserInstance = await this.launchBrowser(browser, {
      headless: options.headless !== false,
      ...options.launchOptions
    });

    const context = await browserInstance.newContext({
      viewport: options.viewport || { width: 1280, height: 720 },
      ...options.contextOptions
    });

    const page = await context.newPage();
    
    let testResult = {
      success: false,
      error: null,
      duration: 0,
      screenshots: [],
      logs: [],
      steps: []
    };

    const startTime = Date.now();

    try {
      progressCallback?.({
        executionId,
        status: 'running',
        message: 'Starting test execution...',
        progress: 10
      });

      // Set up page event listeners for logging
      page.on('console', msg => {
        testResult.logs.push({
          type: 'console',
          level: msg.type(),
          text: msg.text(),
          timestamp: new Date().toISOString()
        });
      });

      page.on('pageerror', error => {
        testResult.logs.push({
          type: 'error',
          text: error.message,
          timestamp: new Date().toISOString()
        });
      });

      progressCallback?.({
        executionId,
        status: 'running',
        message: 'Executing test code...',
        progress: 30
      });

      // Execute the test code
      const testFunction = new Function('page', 'context', 'browser', 'expect', testCode);
      
      // Simple expect implementation for basic assertions
      const expect = (actual) => ({
        toBe: (expected) => {
          if (actual !== expected) {
            throw new Error(`Expected ${actual} to be ${expected}`);
          }
        },
        toContain: (expected) => {
          if (!actual.includes(expected)) {
            throw new Error(`Expected ${actual} to contain ${expected}`);
          }
        },
        toBeTruthy: () => {
          if (!actual) {
            throw new Error(`Expected ${actual} to be truthy`);
          }
        },
        toBeFalsy: () => {
          if (actual) {
            throw new Error(`Expected ${actual} to be falsy`);
          }
        }
      });

      await testFunction(page, context, browserInstance, expect);

      progressCallback?.({
        executionId,
        status: 'running',
        message: 'Test completed successfully',
        progress: 90
      });

      testResult.success = true;
      
    } catch (error) {
      testResult.success = false;
      testResult.error = error.message;
      
      progressCallback?.({
        executionId,
        status: 'running',
        message: `Test failed: ${error.message}`,
        progress: 90
      });
    } finally {
      testResult.duration = Date.now() - startTime;
      
      // Take screenshot on completion
      try {
        const screenshot = await page.screenshot({ fullPage: true });
        testResult.screenshots.push({
          name: 'final-state',
          data: screenshot.toString('base64'),
          timestamp: new Date().toISOString()
        });
      } catch (screenshotError) {
        console.warn('Failed to take screenshot:', screenshotError.message);
      }

      await context.close();
    }

    return testResult;
  }

  async executeTestSuite({ testSuite, browser = 'chromium', options = {}, executionId, progressCallback }) {
    const results = [];
    const totalTests = testSuite.tests?.length || 0;
    
    if (totalTests === 0) {
      return { success: true, results: [], summary: { total: 0, passed: 0, failed: 0 } };
    }

    for (let i = 0; i < totalTests; i++) {
      const test = testSuite.tests[i];
      const progress = Math.floor((i / totalTests) * 80) + 10; // 10-90% range
      
      progressCallback?.({
        executionId,
        status: 'running',
        message: `Running test ${i + 1}/${totalTests}: ${test.name}`,
        progress
      });

      try {
        const testResult = await this.executeSingleTest({
          testCode: test.code,
          browser,
          options,
          executionId: `${executionId}-${i}`,
          progressCallback: (subProgress) => {
            // Don't forward sub-progress to avoid spam
          }
        });

        results.push({
          name: test.name,
          ...testResult
        });
      } catch (error) {
        results.push({
          name: test.name,
          success: false,
          error: error.message,
          duration: 0,
          screenshots: [],
          logs: [],
          steps: []
        });
      }
    }

    const summary = {
      total: totalTests,
      passed: results.filter(r => r.success).length,
      failed: results.filter(r => !r.success).length
    };

    return {
      success: summary.failed === 0,
      results,
      summary
    };
  }

  async validateTestCode(testCode) {
    try {
      // Basic syntax validation
      new Function('page', 'context', 'browser', 'expect', testCode);
      return { valid: true };
    } catch (error) {
      return { 
        valid: false, 
        error: error.message,
        suggestion: 'Check your test code syntax and ensure it uses valid JavaScript'
      };
    }
  }

  async getBrowserCapabilities(browserName = 'chromium') {
    try {
      const browser = await this.launchBrowser(browserName);
      const context = await browser.newContext();
      const page = await context.newPage();
      
      const capabilities = await page.evaluate(() => ({
        userAgent: navigator.userAgent,
        viewport: { width: window.innerWidth, height: window.innerHeight },
        devicePixelRatio: window.devicePixelRatio,
        languages: navigator.languages,
        platform: navigator.platform,
        cookieEnabled: navigator.cookieEnabled,
        onLine: navigator.onLine
      }));
      
      await context.close();
      return capabilities;
    } catch (error) {
      throw new Error(`Failed to get browser capabilities: ${error.message}`);
    }
  }
}

export default PlaywrightService;