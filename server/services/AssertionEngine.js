import { chromium } from 'playwright';

class AssertionEngine {
  constructor() {
    this.assertionTypes = {
      visibility: 'toBeVisible',
      text: 'toHaveText',
      value: 'toHaveValue',
      attribute: 'toHaveAttribute',
      count: 'toHaveCount',
      url: 'toHaveURL',
      title: 'toHaveTitle',
      class: 'toHaveClass',
      css: 'toHaveCSS',
      screenshot: 'toHaveScreenshot',
      enabled: 'toBeEnabled',
      disabled: 'toBeDisabled',
      checked: 'toBeChecked',
      focused: 'toBeFocused',
      hidden: 'toBeHidden',
      empty: 'toBeEmpty',
      editable: 'toBeEditable'
    };

    this.verificationStrategies = [
      'auto-detect',
      'explicit',
      'visual',
      'content',
      'state',
      'performance'
    ];
  }

  // Auto-detect verification points based on user interactions
  async detectVerificationPoints(page, action, elementHandle, context = {}) {
    const verificationPoints = [];

    try {
      // Get element information
      const elementInfo = await this.getElementInfo(page, elementHandle);
      
      // Detect based on action type
      switch (action.type) {
        case 'click':
          verificationPoints.push(...await this.detectClickVerifications(page, elementInfo, context));
          break;
        case 'fill':
        case 'type':
          verificationPoints.push(...await this.detectInputVerifications(page, elementInfo, action.value, context));
          break;
        case 'select':
          verificationPoints.push(...await this.detectSelectVerifications(page, elementInfo, action.value, context));
          break;
        case 'check':
        case 'uncheck':
          verificationPoints.push(...await this.detectCheckboxVerifications(page, elementInfo, action.type, context));
          break;
        case 'navigate':
          verificationPoints.push(...await this.detectNavigationVerifications(page, action.url, context));
          break;
        default:
          verificationPoints.push(...await this.detectGenericVerifications(page, elementInfo, context));
      }

      // Add contextual verifications
      verificationPoints.push(...await this.detectContextualVerifications(page, context));

      // Filter and prioritize verifications
      return this.prioritizeVerifications(verificationPoints);
    } catch (error) {
      console.error('Error detecting verification points:', error);
      return [];
    }
  }

  // Get comprehensive element information
  async getElementInfo(page, elementHandle) {
    return await page.evaluate((element) => {
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
        ariaDescribedBy: element.getAttribute('aria-describedby'),
        testId: element.getAttribute('data-testid'),
        checked: element.checked,
        disabled: element.disabled,
        readOnly: element.readOnly,
        required: element.required,
        selected: element.selected,
        hidden: element.hidden,
        isVisible: rect.width > 0 && rect.height > 0 && computedStyle.visibility !== 'hidden',
        isEnabled: !element.disabled,
        isFocused: document.activeElement === element,
        hasChildren: element.children.length > 0,
        parentTagName: element.parentElement?.tagName.toLowerCase(),
        siblingCount: element.parentElement?.children.length || 0,
        position: {
          x: rect.x,
          y: rect.y,
          width: rect.width,
          height: rect.height
        },
        styles: {
          display: computedStyle.display,
          visibility: computedStyle.visibility,
          opacity: computedStyle.opacity,
          color: computedStyle.color,
          backgroundColor: computedStyle.backgroundColor,
          fontSize: computedStyle.fontSize,
          fontWeight: computedStyle.fontWeight
        }
      };
    }, elementHandle);
  }

  // Detect verifications for click actions
  async detectClickVerifications(page, elementInfo, context) {
    const verifications = [];

    // Wait for potential navigation or state changes
    await page.waitForTimeout(500);

    // Check for URL changes (navigation)
    const currentUrl = page.url();
    if (context.previousUrl && currentUrl !== context.previousUrl) {
      verifications.push({
        type: 'url',
        assertion: 'toHaveURL',
        expected: currentUrl,
        description: `URL should be ${currentUrl}`,
        priority: 'high',
        confidence: 0.9
      });
    }

    // Check for page title changes
    const currentTitle = await page.title();
    if (context.previousTitle && currentTitle !== context.previousTitle) {
      verifications.push({
        type: 'title',
        assertion: 'toHaveTitle',
        expected: currentTitle,
        description: `Page title should be "${currentTitle}"`,
        priority: 'medium',
        confidence: 0.8
      });
    }

    // Check for modal or dialog appearances
    const modals = await page.locator('[role="dialog"], .modal, .popup, [data-testid*="modal"]').all();
    if (modals.length > 0) {
      for (const modal of modals) {
        const isVisible = await modal.isVisible();
        if (isVisible) {
          verifications.push({
            type: 'visibility',
            selector: await this.generateSelectorForElement(page, modal),
            assertion: 'toBeVisible',
            description: 'Modal/dialog should be visible',
            priority: 'high',
            confidence: 0.85
          });
        }
      }
    }

    // Check for form submissions (look for success messages, redirects)
    if (elementInfo.type === 'submit' || elementInfo.tagName === 'button') {
      const successMessages = await page.locator('.success, .alert-success, [data-testid*="success"], [class*="success"]').all();
      for (const message of successMessages) {
        const isVisible = await message.isVisible();
        if (isVisible) {
          const text = await message.textContent();
          verifications.push({
            type: 'text',
            selector: await this.generateSelectorForElement(page, message),
            assertion: 'toBeVisible',
            description: `Success message should be visible: "${text}"`,
            priority: 'high',
            confidence: 0.9
          });
        }
      }
    }

    // Check for loading states
    const loadingElements = await page.locator('.loading, .spinner, [data-testid*="loading"]').all();
    for (const loader of loadingElements) {
      const isVisible = await loader.isVisible();
      if (!isVisible) {
        verifications.push({
          type: 'visibility',
          selector: await this.generateSelectorForElement(page, loader),
          assertion: 'toBeHidden',
          description: 'Loading indicator should be hidden',
          priority: 'medium',
          confidence: 0.7
        });
      }
    }

    return verifications;
  }

  // Detect verifications for input actions
  async detectInputVerifications(page, elementInfo, inputValue, context) {
    const verifications = [];

    // Verify the input value was set correctly
    if (inputValue) {
      verifications.push({
        type: 'value',
        selector: context.selector,
        assertion: 'toHaveValue',
        expected: inputValue,
        description: `Input should have value "${inputValue}"`,
        priority: 'high',
        confidence: 0.95
      });
    }

    // Check for validation messages
    await page.waitForTimeout(300); // Wait for validation
    
    const validationSelectors = [
      '.error', '.invalid', '.validation-error',
      '[data-testid*="error"]', '[class*="error"]',
      '.field-error', '.form-error'
    ];

    for (const selector of validationSelectors) {
      const errorElements = await page.locator(selector).all();
      for (const error of errorElements) {
        const isVisible = await error.isVisible();
        if (isVisible) {
          const errorText = await error.textContent();
          verifications.push({
            type: 'text',
            selector: await this.generateSelectorForElement(page, error),
            assertion: 'toBeVisible',
            expected: errorText,
            description: `Validation error should be visible: "${errorText}"`,
            priority: 'high',
            confidence: 0.8
          });
        }
      }
    }

    // Check for character count indicators
    const charCounters = await page.locator('[data-testid*="char-count"], .char-count, .character-count').all();
    for (const counter of charCounters) {
      const isVisible = await counter.isVisible();
      if (isVisible) {
        const countText = await counter.textContent();
        verifications.push({
          type: 'text',
          selector: await this.generateSelectorForElement(page, counter),
          assertion: 'toContainText',
          expected: inputValue.length.toString(),
          description: `Character count should reflect input length`,
          priority: 'low',
          confidence: 0.6
        });
      }
    }

    return verifications;
  }

  // Detect verifications for select actions
  async detectSelectVerifications(page, elementInfo, selectedValue, context) {
    const verifications = [];

    // Verify the selected value
    verifications.push({
      type: 'value',
      selector: context.selector,
      assertion: 'toHaveValue',
      expected: selectedValue,
      description: `Select should have value "${selectedValue}"`,
      priority: 'high',
      confidence: 0.95
    });

    // Check for dependent fields that might be enabled/disabled
    await page.waitForTimeout(300);
    
    const dependentFields = await page.locator('input, select, textarea').all();
    for (const field of dependentFields) {
      const isEnabled = await field.isEnabled();
      const fieldSelector = await this.generateSelectorForElement(page, field);
      
      if (fieldSelector !== context.selector) {
        verifications.push({
          type: 'state',
          selector: fieldSelector,
          assertion: isEnabled ? 'toBeEnabled' : 'toBeDisabled',
          description: `Dependent field should be ${isEnabled ? 'enabled' : 'disabled'}`,
          priority: 'medium',
          confidence: 0.6
        });
      }
    }

    return verifications;
  }

  // Detect verifications for checkbox actions
  async detectCheckboxVerifications(page, elementInfo, actionType, context) {
    const verifications = [];

    const expectedState = actionType === 'check';
    
    verifications.push({
      type: 'state',
      selector: context.selector,
      assertion: expectedState ? 'toBeChecked' : 'not.toBeChecked',
      description: `Checkbox should be ${expectedState ? 'checked' : 'unchecked'}`,
      priority: 'high',
      confidence: 0.95
    });

    // Check for related UI changes
    await page.waitForTimeout(200);
    
    // Look for conditional content that appears/disappears
    const conditionalElements = await page.locator('[data-show-when], [data-hide-when]').all();
    for (const element of conditionalElements) {
      const isVisible = await element.isVisible();
      verifications.push({
        type: 'visibility',
        selector: await this.generateSelectorForElement(page, element),
        assertion: isVisible ? 'toBeVisible' : 'toBeHidden',
        description: `Conditional element should be ${isVisible ? 'visible' : 'hidden'}`,
        priority: 'medium',
        confidence: 0.7
      });
    }

    return verifications;
  }

  // Detect verifications for navigation actions
  async detectNavigationVerifications(page, targetUrl, context) {
    const verifications = [];

    // Wait for navigation to complete
    await page.waitForLoadState('networkidle', { timeout: 5000 }).catch(() => {});

    const currentUrl = page.url();
    const currentTitle = await page.title();

    verifications.push({
      type: 'url',
      assertion: 'toHaveURL',
      expected: currentUrl,
      description: `Should navigate to ${currentUrl}`,
      priority: 'high',
      confidence: 0.9
    });

    verifications.push({
      type: 'title',
      assertion: 'toHaveTitle',
      expected: currentTitle,
      description: `Page title should be "${currentTitle}"`,
      priority: 'medium',
      confidence: 0.8
    });

    // Check for key page elements
    const keyElements = await page.locator('h1, [data-testid*="heading"], .page-title, main').all();
    for (const element of keyElements) {
      const isVisible = await element.isVisible();
      if (isVisible) {
        const text = await element.textContent();
        verifications.push({
          type: 'visibility',
          selector: await this.generateSelectorForElement(page, element),
          assertion: 'toBeVisible',
          description: `Key page element should be visible: "${text?.trim()}"`,
          priority: 'medium',
          confidence: 0.7
        });
      }
    }

    return verifications;
  }

  // Detect generic verifications
  async detectGenericVerifications(page, elementInfo, context) {
    const verifications = [];

    // Basic visibility check
    if (elementInfo.isVisible) {
      verifications.push({
        type: 'visibility',
        selector: context.selector,
        assertion: 'toBeVisible',
        description: 'Element should be visible',
        priority: 'medium',
        confidence: 0.8
      });
    }

    // Text content verification
    if (elementInfo.textContent && elementInfo.textContent.length > 0) {
      verifications.push({
        type: 'text',
        selector: context.selector,
        assertion: 'toHaveText',
        expected: elementInfo.textContent,
        description: `Should have text "${elementInfo.textContent}"`,
        priority: 'low',
        confidence: 0.6
      });
    }

    return verifications;
  }

  // Detect contextual verifications based on page state
  async detectContextualVerifications(page, context) {
    const verifications = [];

    try {
      // Check for error states
      const errorElements = await page.locator('.error, .alert-danger, [role="alert"]').all();
      for (const error of errorElements) {
        const isVisible = await error.isVisible();
        if (isVisible) {
          const errorText = await error.textContent();
          verifications.push({
            type: 'error',
            selector: await this.generateSelectorForElement(page, error),
            assertion: 'toBeVisible',
            expected: errorText,
            description: `Error message should be visible: "${errorText}"`,
            priority: 'high',
            confidence: 0.9
          });
        }
      }

      // Check for success states
      const successElements = await page.locator('.success, .alert-success, [data-testid*="success"]').all();
      for (const success of successElements) {
        const isVisible = await success.isVisible();
        if (isVisible) {
          const successText = await success.textContent();
          verifications.push({
            type: 'success',
            selector: await this.generateSelectorForElement(page, success),
            assertion: 'toBeVisible',
            expected: successText,
            description: `Success message should be visible: "${successText}"`,
            priority: 'high',
            confidence: 0.9
          });
        }
      }

      // Check for loading states
      const loadingElements = await page.locator('.loading, .spinner, [aria-busy="true"]').all();
      for (const loader of loadingElements) {
        const isVisible = await loader.isVisible();
        verifications.push({
          type: 'loading',
          selector: await this.generateSelectorForElement(page, loader),
          assertion: isVisible ? 'toBeVisible' : 'toBeHidden',
          description: `Loading state should be ${isVisible ? 'visible' : 'hidden'}`,
          priority: 'medium',
          confidence: 0.7
        });
      }

    } catch (error) {
      console.error('Error detecting contextual verifications:', error);
    }

    return verifications;
  }

  // Generate selector for an element
  async generateSelectorForElement(page, element) {
    try {
      const elementInfo = await page.evaluate((el) => {
        if (!el) return null;
        return {
          testId: el.getAttribute('data-testid'),
          id: el.id,
          className: el.className,
          tagName: el.tagName.toLowerCase(),
          textContent: el.textContent?.trim()
        };
      }, element);

      if (elementInfo.testId) {
        return `[data-testid="${elementInfo.testId}"]`;
      }
      if (elementInfo.id) {
        return `#${elementInfo.id}`;
      }
      if (elementInfo.className) {
        const classes = elementInfo.className.split(' ').filter(c => c.trim());
        if (classes.length > 0) {
          return `${elementInfo.tagName}.${classes[0]}`;
        }
      }
      if (elementInfo.textContent && elementInfo.textContent.length < 50) {
        return `text="${elementInfo.textContent}"`;
      }
      
      return elementInfo.tagName;
    } catch (error) {
      console.error('Error generating selector:', error);
      return 'body';
    }
  }

  // Prioritize verifications based on importance and confidence
  prioritizeVerifications(verifications) {
    const priorityOrder = { 'high': 3, 'medium': 2, 'low': 1 };
    
    return verifications
      .filter(v => v.confidence >= 0.5) // Filter out low-confidence verifications
      .sort((a, b) => {
        // Sort by priority first, then by confidence
        const priorityDiff = priorityOrder[b.priority] - priorityOrder[a.priority];
        if (priorityDiff !== 0) return priorityDiff;
        return b.confidence - a.confidence;
      })
      .slice(0, 5); // Limit to top 5 verifications
  }

  // Generate assertion code for different languages
  generateAssertionCode(verification, language = 'javascript', framework = 'playwright') {
    const { type, selector, assertion, expected, description } = verification;

    switch (language) {
      case 'javascript':
      case 'typescript':
        return this.generateJavaScriptAssertion(verification, framework);
      case 'python':
        return this.generatePythonAssertion(verification, framework);
      case 'java':
        return this.generateJavaAssertion(verification, framework);
      case 'csharp':
        return this.generateCSharpAssertion(verification, framework);
      default:
        return this.generateJavaScriptAssertion(verification, framework);
    }
  }

  // Generate JavaScript/TypeScript assertions
  generateJavaScriptAssertion(verification, framework) {
    const { selector, assertion, expected, description } = verification;
    
    let code = `  // ${description}\n`;
    
    if (framework === 'playwright') {
      if (selector) {
        if (assertion.startsWith('not.')) {
          const actualAssertion = assertion.replace('not.', '');
          code += `  await expect(page.locator('${selector}')).not.${actualAssertion}()`;
        } else {
          code += `  await expect(page.locator('${selector}')).${assertion}()`;
        }
        
        if (expected !== undefined) {
          code += `('${expected}')`;
        }
      } else {
        // Page-level assertions
        if (assertion === 'toHaveURL') {
          code += `  await expect(page).toHaveURL('${expected}')`;
        } else if (assertion === 'toHaveTitle') {
          code += `  await expect(page).toHaveTitle('${expected}')`;
        }
      }
    }
    
    code += ';\n';
    return code;
  }

  // Generate Python assertions
  generatePythonAssertion(verification, framework) {
    const { selector, assertion, expected, description } = verification;
    
    let code = `    # ${description}\n`;
    
    if (framework === 'playwright') {
      if (selector) {
        const pythonAssertion = this.convertToPythonAssertion(assertion);
        code += `    expect(page.locator('${selector}')).${pythonAssertion}()`;
        
        if (expected !== undefined) {
          code += `('${expected}')`;
        }
      } else {
        if (assertion === 'toHaveURL') {
          code += `    expect(page).to_have_url('${expected}')`;
        } else if (assertion === 'toHaveTitle') {
          code += `    expect(page).to_have_title('${expected}')`;
        }
      }
    }
    
    code += '\n';
    return code;
  }

  // Generate Java assertions
  generateJavaAssertion(verification, framework) {
    const { selector, assertion, expected, description } = verification;
    
    let code = `        // ${description}\n`;
    
    if (framework === 'playwright') {
      if (selector) {
        const javaAssertion = this.convertToJavaAssertion(assertion);
        code += `        assertThat(page.locator("${selector}")).${javaAssertion}()`;
        
        if (expected !== undefined) {
          code += `("${expected}")`;
        }
      } else {
        if (assertion === 'toHaveURL') {
          code += `        assertThat(page).hasURL("${expected}")`;
        } else if (assertion === 'toHaveTitle') {
          code += `        assertThat(page).hasTitle("${expected}")`;
        }
      }
    }
    
    code += ';\n';
    return code;
  }

  // Generate C# assertions
  generateCSharpAssertion(verification, framework) {
    const { selector, assertion, expected, description } = verification;
    
    let code = `            // ${description}\n`;
    
    if (framework === 'playwright') {
      if (selector) {
        const csharpAssertion = this.convertToCSharpAssertion(assertion);
        code += `            await Expect(Page.Locator("${selector}")).${csharpAssertion}()`;
        
        if (expected !== undefined) {
          code += `("${expected}")`;
        }
      } else {
        if (assertion === 'toHaveURL') {
          code += `            await Expect(Page).ToHaveURLAsync("${expected}")`;
        } else if (assertion === 'toHaveTitle') {
          code += `            await Expect(Page).ToHaveTitleAsync("${expected}")`;
        }
      }
    }
    
    code += ';\n';
    return code;
  }

  // Convert assertion names to different language conventions
  convertToPythonAssertion(assertion) {
    const conversionMap = {
      'toBeVisible': 'to_be_visible',
      'toHaveText': 'to_have_text',
      'toHaveValue': 'to_have_value',
      'toHaveAttribute': 'to_have_attribute',
      'toHaveCount': 'to_have_count',
      'toBeEnabled': 'to_be_enabled',
      'toBeDisabled': 'to_be_disabled',
      'toBeChecked': 'to_be_checked',
      'toBeFocused': 'to_be_focused',
      'toBeHidden': 'to_be_hidden'
    };
    
    return conversionMap[assertion] || assertion.toLowerCase();
  }

  convertToJavaAssertion(assertion) {
    const conversionMap = {
      'toBeVisible': 'isVisible',
      'toHaveText': 'hasText',
      'toHaveValue': 'hasValue',
      'toHaveAttribute': 'hasAttribute',
      'toHaveCount': 'hasCount',
      'toBeEnabled': 'isEnabled',
      'toBeDisabled': 'isDisabled',
      'toBeChecked': 'isChecked',
      'toBeFocused': 'isFocused',
      'toBeHidden': 'isHidden'
    };
    
    return conversionMap[assertion] || assertion;
  }

  convertToCSharpAssertion(assertion) {
    const conversionMap = {
      'toBeVisible': 'ToBeVisibleAsync',
      'toHaveText': 'ToHaveTextAsync',
      'toHaveValue': 'ToHaveValueAsync',
      'toHaveAttribute': 'ToHaveAttributeAsync',
      'toHaveCount': 'ToHaveCountAsync',
      'toBeEnabled': 'ToBeEnabledAsync',
      'toBeDisabled': 'ToBeDisabledAsync',
      'toBeChecked': 'ToBeCheckedAsync',
      'toBeFocused': 'ToBeFocusedAsync',
      'toBeHidden': 'ToBeHiddenAsync'
    };
    
    return conversionMap[assertion] || assertion;
  }

  // Validate assertion against current page state
  async validateAssertion(page, verification) {
    try {
      const { selector, assertion, expected } = verification;
      
      if (selector) {
        const locator = page.locator(selector);
        const count = await locator.count();
        
        if (count === 0) {
          return { valid: false, error: 'Element not found' };
        }
        
        // Test the assertion
        switch (assertion) {
          case 'toBeVisible':
            return { valid: await locator.isVisible(), actual: await locator.isVisible() };
          case 'toHaveText':
            const text = await locator.textContent();
            return { valid: text === expected, actual: text, expected };
          case 'toHaveValue':
            const value = await locator.inputValue();
            return { valid: value === expected, actual: value, expected };
          case 'toBeEnabled':
            return { valid: await locator.isEnabled(), actual: await locator.isEnabled() };
          case 'toBeChecked':
            return { valid: await locator.isChecked(), actual: await locator.isChecked() };
          default:
            return { valid: true, note: 'Assertion type not validated' };
        }
      } else {
        // Page-level assertions
        if (assertion === 'toHaveURL') {
          const currentUrl = page.url();
          return { valid: currentUrl === expected, actual: currentUrl, expected };
        } else if (assertion === 'toHaveTitle') {
          const currentTitle = await page.title();
          return { valid: currentTitle === expected, actual: currentTitle, expected };
        }
      }
      
      return { valid: true };
    } catch (error) {
      return { valid: false, error: error.message };
    }
  }

  // Generate smart assertions based on element analysis
  async generateSmartAssertions(page, elementHandle, options = {}) {
    const {
      includeVisibility = true,
      includeContent = true,
      includeState = true,
      maxAssertions = 3
    } = options;

    const assertions = [];
    const elementInfo = await this.getElementInfo(page, elementHandle);

    if (!elementInfo) return assertions;

    // Visibility assertion
    if (includeVisibility && elementInfo.isVisible) {
      assertions.push({
        type: 'visibility',
        assertion: 'toBeVisible',
        description: 'Element should be visible',
        priority: 'high',
        confidence: 0.9
      });
    }

    // Content assertions
    if (includeContent) {
      if (elementInfo.textContent && elementInfo.textContent.length > 0) {
        assertions.push({
          type: 'text',
          assertion: 'toHaveText',
          expected: elementInfo.textContent,
          description: `Should have text "${elementInfo.textContent}"`,
          priority: 'medium',
          confidence: 0.8
        });
      }

      if (elementInfo.value !== undefined && elementInfo.value !== '') {
        assertions.push({
          type: 'value',
          assertion: 'toHaveValue',
          expected: elementInfo.value,
          description: `Should have value "${elementInfo.value}"`,
          priority: 'high',
          confidence: 0.9
        });
      }
    }

    // State assertions
    if (includeState) {
      if (elementInfo.type === 'checkbox' || elementInfo.type === 'radio') {
        assertions.push({
          type: 'state',
          assertion: elementInfo.checked ? 'toBeChecked' : 'not.toBeChecked',
          description: `Should be ${elementInfo.checked ? 'checked' : 'unchecked'}`,
          priority: 'high',
          confidence: 0.95
        });
      }

      if (elementInfo.disabled !== undefined) {
        assertions.push({
          type: 'state',
          assertion: elementInfo.disabled ? 'toBeDisabled' : 'toBeEnabled',
          description: `Should be ${elementInfo.disabled ? 'disabled' : 'enabled'}`,
          priority: 'medium',
          confidence: 0.8
        });
      }
    }

    return this.prioritizeVerifications(assertions).slice(0, maxAssertions);
  }
}

export default AssertionEngine;