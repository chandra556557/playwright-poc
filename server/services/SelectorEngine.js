import { chromium } from 'playwright';

class SelectorEngine {
  constructor() {
    this.selectorStrategies = [
      'testId',
      'role',
      'label',
      'text',
      'placeholder',
      'title',
      'alt',
      'css',
      'xpath'
    ];
    
    this.selectorPriority = {
      'testId': 10,
      'role': 9,
      'label': 8,
      'text': 7,
      'placeholder': 6,
      'title': 5,
      'alt': 4,
      'css': 3,
      'xpath': 2
    };
    
    // Default configuration
    this.config = {
      testIdAttribute: 'data-testid',
      healingMode: false
    };
  }
  
  // Configure the selector engine
  configure(options = {}) {
    this.config = {
      ...this.config,
      ...options
    };
    return this;
  }

  // Generate multiple selector strategies for an element
  async generateSelectors(page, elementHandle, options = {}) {
    const {
      testIdAttribute = this.config.testIdAttribute,
      includeXPath = true,
      includeCSS = true,
      maxTextLength = 50,
      preferStableSelectors = true
    } = options;

    const selectors = [];
    
    try {
      // Get element properties
      const elementInfo = await page.evaluate((element, testIdAttr) => {
        if (!element) return null;
        
        const rect = element.getBoundingClientRect();
        const computedStyle = window.getComputedStyle(element);
        
        return {
          tagName: element.tagName.toLowerCase(),
          id: element.id,
          className: element.className,
          textContent: element.textContent?.trim(),
          innerText: element.innerText?.trim(),
          value: element.value,
          type: element.type,
          name: element.name,
          placeholder: element.placeholder,
          title: element.title,
          alt: element.alt,
          href: element.href,
          src: element.src,
          role: element.getAttribute('role'),
          ariaLabel: element.getAttribute('aria-label'),
          ariaLabelledBy: element.getAttribute('aria-labelledby'),
          ariaDescribedBy: element.getAttribute('aria-describedby'),
          testId: element.getAttribute(testIdAttr),
          dataAttributes: Array.from(element.attributes)
            .filter(attr => attr.name.startsWith('data-'))
            .reduce((acc, attr) => {
              acc[attr.name] = attr.value;
              return acc;
            }, {}),
          isVisible: rect.width > 0 && rect.height > 0 && computedStyle.visibility !== 'hidden',
          isEnabled: !element.disabled,
          parentTagName: element.parentElement?.tagName.toLowerCase(),
          parentId: element.parentElement?.id,
          parentClassName: element.parentElement?.className,
          siblingIndex: Array.from(element.parentElement?.children || []).indexOf(element),
          childrenCount: element.children.length
        };
      }, elementHandle, testIdAttribute);

      if (!elementInfo) {
        return [];
      }

      // Strategy 1: Test ID (highest priority)
      if (elementInfo.testId) {
        selectors.push({
          strategy: 'testId',
          selector: `[${testIdAttribute}="${elementInfo.testId}"]`,
          priority: this.selectorPriority.testId,
          stability: 'high',
          description: `Test ID: ${elementInfo.testId}`
        });
      }

      // Strategy 2: Role-based selectors
      if (elementInfo.role || this.getImplicitRole(elementInfo.tagName)) {
        const role = elementInfo.role || this.getImplicitRole(elementInfo.tagName);
        const name = elementInfo.ariaLabel || elementInfo.textContent || elementInfo.value || elementInfo.placeholder;
        
        if (name && name.length <= maxTextLength) {
          selectors.push({
            strategy: 'role',
            selector: `role=${role}[name="${this.escapeSelector(name)}"]`,
            priority: this.selectorPriority.role,
            stability: 'high',
            description: `Role: ${role}, Name: ${name}`
          });
        } else {
          selectors.push({
            strategy: 'role',
            selector: `role=${role}`,
            priority: this.selectorPriority.role - 1,
            stability: 'medium',
            description: `Role: ${role}`
          });
        }
      }

      // Strategy 3: Aria-label
      if (elementInfo.ariaLabel) {
        selectors.push({
          strategy: 'label',
          selector: `[aria-label="${this.escapeSelector(elementInfo.ariaLabel)}"]`,
          priority: this.selectorPriority.label,
          stability: 'high',
          description: `Aria Label: ${elementInfo.ariaLabel}`
        });
      }

      // Strategy 4: Text content
      if (elementInfo.textContent && elementInfo.textContent.length <= maxTextLength) {
        // Exact text match
        selectors.push({
          strategy: 'text',
          selector: `text="${this.escapeSelector(elementInfo.textContent)}"`,
          priority: this.selectorPriority.text,
          stability: 'medium',
          description: `Text: ${elementInfo.textContent}`
        });
        
        // Partial text match for longer text
        if (elementInfo.textContent.length > 20) {
          const shortText = elementInfo.textContent.substring(0, 20);
          selectors.push({
            strategy: 'text',
            selector: `text=/${this.escapeRegex(shortText)}/`,
            priority: this.selectorPriority.text - 1,
            stability: 'low',
            description: `Partial Text: ${shortText}...`
          });
        }
      }

      // Strategy 5: Placeholder
      if (elementInfo.placeholder) {
        selectors.push({
          strategy: 'placeholder',
          selector: `[placeholder="${this.escapeSelector(elementInfo.placeholder)}"]`,
          priority: this.selectorPriority.placeholder,
          stability: 'medium',
          description: `Placeholder: ${elementInfo.placeholder}`
        });
      }

      // Strategy 6: Title attribute
      if (elementInfo.title) {
        selectors.push({
          strategy: 'title',
          selector: `[title="${this.escapeSelector(elementInfo.title)}"]`,
          priority: this.selectorPriority.title,
          stability: 'medium',
          description: `Title: ${elementInfo.title}`
        });
      }

      // Strategy 7: Alt attribute (for images)
      if (elementInfo.alt) {
        selectors.push({
          strategy: 'alt',
          selector: `[alt="${this.escapeSelector(elementInfo.alt)}"]`,
          priority: this.selectorPriority.alt,
          stability: 'medium',
          description: `Alt: ${elementInfo.alt}`
        });
      }

      // Strategy 8: ID-based selector
      if (elementInfo.id) {
        selectors.push({
          strategy: 'css',
          selector: `#${elementInfo.id}`,
          priority: this.selectorPriority.css + 2,
          stability: 'high',
          description: `ID: ${elementInfo.id}`
        });
      }

      // Strategy 9: CSS class-based selectors
      if (includeCSS && elementInfo.className) {
        const classes = elementInfo.className.split(' ').filter(c => c.trim());
        if (classes.length > 0) {
          // Single class selector
          selectors.push({
            strategy: 'css',
            selector: `${elementInfo.tagName}.${classes[0]}`,
            priority: this.selectorPriority.css,
            stability: 'low',
            description: `CSS: ${elementInfo.tagName}.${classes[0]}`
          });
          
          // Multiple class selector for more specificity
          if (classes.length > 1) {
            selectors.push({
              strategy: 'css',
              selector: `${elementInfo.tagName}.${classes.join('.')}`,
              priority: this.selectorPriority.css + 1,
              stability: 'low',
              description: `CSS: ${elementInfo.tagName}.${classes.join('.')}`
            });
          }
        }
      }

      // Strategy 10: Name attribute
      if (elementInfo.name) {
        selectors.push({
          strategy: 'css',
          selector: `[name="${elementInfo.name}"]`,
          priority: this.selectorPriority.css + 1,
          stability: 'medium',
          description: `Name: ${elementInfo.name}`
        });
      }

      // Strategy 11: Type-specific selectors
      if (elementInfo.type) {
        selectors.push({
          strategy: 'css',
          selector: `${elementInfo.tagName}[type="${elementInfo.type}"]`,
          priority: this.selectorPriority.css,
          stability: 'medium',
          description: `Type: ${elementInfo.tagName}[type="${elementInfo.type}"]"`
        });
      }

      // Strategy 12: XPath selectors
      if (includeXPath) {
        const xpath = await this.generateXPath(page, elementHandle, elementInfo);
        if (xpath) {
          selectors.push({
            strategy: 'xpath',
            selector: xpath,
            priority: this.selectorPriority.xpath,
            stability: 'low',
            description: `XPath: ${xpath}`
          });
        }
      }

      // Strategy 13: Data attributes
      Object.entries(elementInfo.dataAttributes).forEach(([attr, value]) => {
        if (attr !== testIdAttribute) {
          selectors.push({
            strategy: 'css',
            selector: `[${attr}="${value}"]`,
            priority: this.selectorPriority.css,
            stability: 'medium',
            description: `Data Attribute: ${attr}="${value}"`
          });
        }
      });

      // Sort by priority and stability
      selectors.sort((a, b) => {
        if (preferStableSelectors) {
          const stabilityOrder = { 'high': 3, 'medium': 2, 'low': 1 };
          if (stabilityOrder[a.stability] !== stabilityOrder[b.stability]) {
            return stabilityOrder[b.stability] - stabilityOrder[a.stability];
          }
        }
        return b.priority - a.priority;
      });

      return selectors;
    } catch (error) {
      console.error('Error generating selectors:', error);
      return [];
    }
  }

  // Test selector reliability
  async testSelector(page, selector, expectedCount = 1) {
    try {
      const elements = await page.locator(selector).all();
      const count = elements.length;
      
      if (count === 0) {
        return { valid: false, reason: 'No elements found', count: 0 };
      }
      
      if (count > expectedCount) {
        return { valid: false, reason: 'Multiple elements found', count };
      }
      
      // Test if element is visible and interactable
      const element = elements[0];
      const isVisible = await element.isVisible();
      const isEnabled = await element.isEnabled();
      
      return {
        valid: true,
        count,
        isVisible,
        isEnabled,
        score: this.calculateSelectorScore(selector, count, isVisible, isEnabled)
      };
    } catch (error) {
      return { valid: false, reason: error.message, count: 0 };
    }
  }

  // Calculate selector reliability score
  calculateSelectorScore(selector, count, isVisible, isEnabled) {
    let score = 100;
    
    // Penalize multiple matches
    if (count > 1) {
      score -= (count - 1) * 20;
    }
    
    // Penalize invisible elements
    if (!isVisible) {
      score -= 30;
    }
    
    // Penalize disabled elements
    if (!isEnabled) {
      score -= 10;
    }
    
    // Bonus for stable selector types
    if (selector.includes('data-testid') || selector.includes('[data-test')) {
      score += 20;
    } else if (selector.startsWith('role=')) {
      score += 15;
    } else if (selector.includes('aria-label')) {
      score += 10;
    } else if (selector.startsWith('#')) {
      score += 5;
    }
    
    // Penalize complex selectors
    const complexity = (selector.match(/[>\+~\s]/g) || []).length;
    score -= complexity * 5;
    
    return Math.max(0, Math.min(100, score));
  }

  // Generate XPath for element
  async generateXPath(page, elementHandle, elementInfo) {
    try {
      const xpath = await page.evaluate((element) => {
        function getElementXPath(el) {
          if (!el || el.nodeType !== Node.ELEMENT_NODE) {
            return '';
          }
          
          if (el.id) {
            return `//*[@id="${el.id}"]`;
          }
          
          const parts = [];
          while (el && el.nodeType === Node.ELEMENT_NODE) {
            let nbOfPreviousSiblings = 0;
            let hasNextSiblings = false;
            let sibling = el.previousSibling;
            
            while (sibling) {
              if (sibling.nodeType === Node.ELEMENT_NODE && sibling.nodeName === el.nodeName) {
                nbOfPreviousSiblings++;
              }
              sibling = sibling.previousSibling;
            }
            
            sibling = el.nextSibling;
            while (sibling) {
              if (sibling.nodeType === Node.ELEMENT_NODE && sibling.nodeName === el.nodeName) {
                hasNextSiblings = true;
                break;
              }
              sibling = sibling.nextSibling;
            }
            
            const prefix = el.nodeName.toLowerCase();
            const nth = nbOfPreviousSiblings || hasNextSiblings ? `[${nbOfPreviousSiblings + 1}]` : '';
            parts.push(prefix + nth);
            el = el.parentNode;
          }
          
          return parts.length ? '/' + parts.reverse().join('/') : '';
        }
        
        return getElementXPath(element);
      }, elementHandle);
      
      return xpath;
    } catch (error) {
      console.error('Error generating XPath:', error);
      return null;
    }
  }

  // Get implicit ARIA role for HTML elements
  getImplicitRole(tagName) {
    const roleMap = {
      'button': 'button',
      'a': 'link',
      'input': 'textbox',
      'textarea': 'textbox',
      'select': 'combobox',
      'img': 'img',
      'h1': 'heading',
      'h2': 'heading',
      'h3': 'heading',
      'h4': 'heading',
      'h5': 'heading',
      'h6': 'heading',
      'nav': 'navigation',
      'main': 'main',
      'section': 'region',
      'article': 'article',
      'aside': 'complementary',
      'header': 'banner',
      'footer': 'contentinfo',
      'form': 'form',
      'table': 'table',
      'ul': 'list',
      'ol': 'list',
      'li': 'listitem'
    };
    
    return roleMap[tagName] || null;
  }

  // Escape special characters in selectors
  escapeSelector(str) {
    return str.replace(/["\\]/g, '\\$&');
  }

  // Escape special characters in regex
  escapeRegex(str) {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  // Find best selector from a list
  async findBestSelector(page, selectors) {
    const results = [];
    
    for (const selectorInfo of selectors) {
      const testResult = await this.testSelector(page, selectorInfo.selector);
      results.push({
        ...selectorInfo,
        testResult,
        finalScore: testResult.valid ? testResult.score : 0
      });
    }
    
    // Sort by final score
    results.sort((a, b) => b.finalScore - a.finalScore);
    
    return results;
  }

  // Generate healing-aware selectors
  async generateHealingSelectors(page, elementHandle, options = {}) {
    const selectors = await this.generateSelectors(page, elementHandle, options);
    const testedSelectors = await this.findBestSelector(page, selectors);
    
    // Return top 3 selectors for healing fallback
    return testedSelectors.slice(0, 3).map(s => ({
      selector: s.selector,
      strategy: s.strategy,
      priority: s.priority,
      stability: s.stability,
      score: s.finalScore,
      description: s.description
    }));
  }

  // Validate selector against page
  async validateSelector(page, selector) {
    try {
      const locator = page.locator(selector);
      const count = await locator.count();
      
      if (count === 0) {
        return { valid: false, error: 'Selector matches no elements' };
      }
      
      if (count > 1) {
        return { valid: false, error: `Selector matches ${count} elements, expected 1` };
      }
      
      const isVisible = await locator.isVisible();
      const isEnabled = await locator.isEnabled();
      
      return {
        valid: true,
        count,
        isVisible,
        isEnabled,
        element: await locator.first().innerHTML()
      };
    } catch (error) {
      return { valid: false, error: error.message };
    }
  }

  // Generate selector suggestions for failed selectors
  async suggestAlternativeSelectors(page, failedSelector, context = {}) {
    try {
      // Try to find similar elements
      const suggestions = [];
      
      // Extract selector parts
      const selectorParts = this.parseSelectorParts(failedSelector);
      
      // Generate variations
      for (const part of selectorParts) {
        const variations = await this.generateSelectorVariations(page, part, context);
        suggestions.push(...variations);
      }
      
      // Test all suggestions
      const validSuggestions = [];
      for (const suggestion of suggestions) {
        const validation = await this.validateSelector(page, suggestion.selector);
        if (validation.valid) {
          validSuggestions.push({
            ...suggestion,
            validation
          });
        }
      }
      
      return validSuggestions.slice(0, 5); // Return top 5 suggestions
    } catch (error) {
      console.error('Error generating alternative selectors:', error);
      return [];
    }
  }

  // Parse selector into parts for analysis
  parseSelectorParts(selector) {
    const parts = [];
    
    // Extract different selector types
    if (selector.includes('[data-testid')) {
      const match = selector.match(/\[data-testid="([^"]+)"\]/);
      if (match) parts.push({ type: 'testid', value: match[1] });
    }
    
    if (selector.startsWith('role=')) {
      const match = selector.match(/role=([^\[]+)(?:\[name="([^"]+)"\])?/);
      if (match) {
        parts.push({ type: 'role', value: match[1], name: match[2] });
      }
    }
    
    if (selector.includes('text=')) {
      const match = selector.match(/text="([^"]+)"/);
      if (match) parts.push({ type: 'text', value: match[1] });
    }
    
    if (selector.startsWith('#')) {
      parts.push({ type: 'id', value: selector.substring(1) });
    }
    
    return parts;
  }

  // Generate variations of selector parts
  async generateSelectorVariations(page, part, context) {
    const variations = [];
    
    switch (part.type) {
      case 'text':
        // Try partial text matches
        const words = part.value.split(' ');
        if (words.length > 1) {
          variations.push({
            selector: `text="${words[0]}"`,
            description: `Partial text: ${words[0]}`
          });
          variations.push({
            selector: `text=/${words[0]}/`,
            description: `Regex text: ${words[0]}`
          });
        }
        break;
        
      case 'role':
        // Try role without name
        variations.push({
          selector: `role=${part.value}`,
          description: `Role only: ${part.value}`
        });
        break;
        
      case 'testid':
        // Try similar test IDs
        const similarIds = await this.findSimilarTestIds(page, part.value);
        similarIds.forEach(id => {
          variations.push({
            selector: `[data-testid="${id}"]`,
            description: `Similar test ID: ${id}`
          });
        });
        break;
    }
    
    return variations;
  }

  // Find similar test IDs on the page
  async findSimilarTestIds(page, targetId) {
    try {
      const testIds = await page.evaluate((target) => {
        const elements = document.querySelectorAll('[data-testid]');
        const ids = Array.from(elements).map(el => el.getAttribute('data-testid'));
        
        // Find similar IDs using simple string similarity
        return ids.filter(id => {
          if (id === target) return false;
          
          // Check for partial matches
          const targetWords = target.toLowerCase().split(/[-_\s]/);
          const idWords = id.toLowerCase().split(/[-_\s]/);
          
          return targetWords.some(word => 
            idWords.some(idWord => 
              idWord.includes(word) || word.includes(idWord)
            )
          );
        });
      }, targetId);
      
      return testIds.slice(0, 3); // Return top 3 similar IDs
    } catch (error) {
      console.error('Error finding similar test IDs:', error);
      return [];
    }
  }
}

export default SelectorEngine;