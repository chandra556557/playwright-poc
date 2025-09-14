import { chromium, firefox, webkit } from 'playwright';
import EventEmitter from 'events';
import path from 'path';
import fs from 'fs/promises';
import SelectorEngine from './SelectorEngine.js';
import AssertionEngine from './AssertionEngine.js';
import TemplateEngine from './TemplateEngine.js';
import HealingEngine from './HealingEngine.js';
import ExportService from './ExportService.js';

class CodegenService extends EventEmitter {
  constructor() {
    super();
    this.browsers = new Map();
    this.recorderSessions = new Map();
    this.ready = false;
    this.selectorEngine = new SelectorEngine();
    this.assertionEngine = new AssertionEngine();
    this.templateEngine = new TemplateEngine();
    this.healingEngine = new HealingEngine();
    this.exportService = new ExportService();
    
    // Initialize healing engine
    this.healingEngine.initialize().catch(console.error);
    this.supportedLanguages = [
      'javascript',
      'typescript', 
      'python',
      'python-async',
      'java',
      'csharp'
    ];
  }

  async initialize() {
    try {
      console.log('🎬 Initializing Codegen Service...');
      this.ready = true;
      console.log('✅ Codegen Service ready');
    } catch (error) {
      console.error('❌ Failed to initialize Codegen Service:', error);
      this.ready = false;
    }
  }

  isReady() {
    return this.ready;
  }

  // Start a new recording session with Playwright's native recording capabilities
  async startRecording(options = {}) {
    const sessionId = this.generateSessionId();
    const {
      browserName = 'chromium',
      language = 'javascript',
      url = 'about:blank',
      viewport = { width: 1280, height: 720 },
      testIdAttribute = 'data-testid',
      template = 'javascript-playwright',
      generateAssertions = true,
      autoDetectAssertions = true,
      assertionStrategy = 'smart',
      healingMode = true,
      useNativeRecording = true // New option to use Playwright's native recording
    } = options;

    try {
      const browser = await this.getBrowser(browserName);
      const context = await browser.newContext({
        viewport,
        recordVideo: {
          dir: path.join(process.cwd(), 'recordings', sessionId)
        }
      });
      
      // Configure selector engine for this session
      this.selectorEngine.configure({
        testIdAttribute,
        healingMode
      });
      
      const page = await context.newPage();
      
      // Navigate to initial URL with extended timeout
      if (url !== 'about:blank') {
        try {
          await page.goto(url, { 
            waitUntil: 'domcontentloaded', 
            timeout: 60000 // 60 seconds timeout
          });
        } catch (error) {
          console.warn(`Failed to navigate to ${url}, continuing with blank page:`, error.message);
          // Continue with recording even if initial navigation fails
        }
      }

      const session = {
        id: sessionId,
        browser,
        context,
        page,
        language,
        testIdAttribute,
        generateAssertions,
        autoDetectAssertions,
        assertionStrategy,
        healingMode,
        useNativeRecording,
        actions: [],
        generatedCode: '',
        startTime: Date.now(),
        status: 'recording',
        nativeRecorderActive: false
      };

      // Choose recording method based on useNativeRecording option
      if (useNativeRecording) {
        await this.setupNativeRecording(session);
      } else {
        await this.setupRecordingListeners(session);
      }
      
      this.recorderSessions.set(sessionId, session);
      
      this.emit('recordingStarted', {
        sessionId,
        url,
        language,
        viewport,
        recordingMethod: useNativeRecording ? 'native' : 'custom'
      });

      return {
        sessionId,
        status: 'started',
        previewUrl: `http://localhost:${process.env.PORT || 5173}/recorder/${sessionId}`,
        recordingMethod: useNativeRecording ? 'native' : 'custom'
      };
    } catch (error) {
      console.error('Failed to start recording:', error);
      throw new Error(`Failed to start recording: ${error.message}`);
    }
  }

  // Set up event listeners to capture user interactions
  async setupRecordingListeners(session) {
    const { page, language, testIdAttribute, generateAssertions, healingMode } = session;

    // Inject recorder script into the page
    await page.addInitScript(() => {
      window.__playwrightRecorder = {
        actions: [],
        recordAction: (action) => {
          window.__playwrightRecorder.actions.push({
            ...action,
            timestamp: Date.now(),
            url: window.location.href
          });
        }
      };

      // Record clicks
      document.addEventListener('click', (event) => {
        const element = event.target;
        const selector = window.__playwrightRecorder.generateSelector(element);
        
        window.__playwrightRecorder.recordAction({
          type: 'click',
          selector,
          element: {
            tagName: element.tagName,
            text: element.textContent?.trim(),
            attributes: Array.from(element.attributes).reduce((acc, attr) => {
              acc[attr.name] = attr.value;
              return acc;
            }, {})
          }
        });
      }, true);

      // Record input changes
      document.addEventListener('input', (event) => {
        const element = event.target;
        if (element.tagName === 'INPUT' || element.tagName === 'TEXTAREA') {
          const selector = window.__playwrightRecorder.generateSelector(element);
          
          window.__playwrightRecorder.recordAction({
            type: 'fill',
            selector,
            value: element.value,
            element: {
              tagName: element.tagName,
              type: element.type,
              attributes: Array.from(element.attributes).reduce((acc, attr) => {
                acc[attr.name] = attr.value;
                return acc;
              }, {})
            }
          });
        }
      });

      // Record navigation
      let lastUrl = window.location.href;
      setInterval(() => {
        if (window.location.href !== lastUrl) {
          window.__playwrightRecorder.recordAction({
            type: 'navigation',
            url: window.location.href,
            previousUrl: lastUrl
          });
          lastUrl = window.location.href;
        }
      }, 100);

      // Enhanced smart selector generation with SelectorEngine integration
      window.__playwrightRecorder.generateSelector = (element) => {
        // Priority order for selector strategies with enhanced options
        const strategies = [
          () => element.getAttribute(window.__playwrightRecorder.testIdAttribute || 'data-testid') ? `[${window.__playwrightRecorder.testIdAttribute || 'data-testid'}="${element.getAttribute(window.__playwrightRecorder.testIdAttribute || 'data-testid')}"]` : null,
          () => element.id ? `#${element.id}` : null,
          () => element.getAttribute('aria-label') ? `[aria-label="${element.getAttribute('aria-label')}"]` : null,
          () => element.textContent?.trim() && element.textContent.trim().length < 50 ? `text=${JSON.stringify(element.textContent.trim())}` : null,
          () => element.getAttribute('placeholder') ? `[placeholder="${element.getAttribute('placeholder')}"]` : null,
          () => {
            const role = element.getAttribute('role') || element.tagName.toLowerCase();
            const name = element.textContent?.trim() || element.getAttribute('aria-label') || element.getAttribute('title');
            return name && name.length < 50 ? `role=${role}[name="${name}"]` : null;
          },
          () => {
            // Generate stable CSS selector as fallback
            let selector = element.tagName.toLowerCase();
            if (element.className) {
              const stableClasses = element.className.split(' ').filter(c => 
                c.trim() && !c.match(/^(active|selected|hover|focus|disabled)$/)
              );
              if (stableClasses.length > 0) {
                selector += '.' + stableClasses[0];
              }
            }
            return selector;
          }
        ];

        for (const strategy of strategies) {
          const selector = strategy();
          if (selector) {
            return {
              primary: selector,
              alternatives: [],
              strategy: 'client-side',
              description: 'Generated on client-side'
            };
          }
        }
        
        return {
          primary: element.tagName.toLowerCase(),
          alternatives: [],
          strategy: 'fallback',
          description: 'Fallback selector'
        };
      };
    });

    // Poll for recorded actions and generate code
    const pollActions = async () => {
      try {
        const actions = await page.evaluate(() => {
          if (!window.__playwrightRecorder) {
            return [];
          }
          const recorded = window.__playwrightRecorder.actions || [];
          window.__playwrightRecorder.actions = []; // Clear recorded actions
          return recorded;
        });

        if (actions.length > 0) {
          session.actions.push(...actions);
          await this.generateCodeFromActions(session);
          
          this.emit('actionsRecorded', {
            sessionId: session.id,
            actions,
            generatedCode: session.generatedCode
          });
        }
      } catch (error) {
        console.error('Error polling actions:', error);
      }
    };

    // Poll every 500ms for new actions
    session.pollInterval = setInterval(pollActions, 500);
  }

  // Setup native Playwright recording using page.pause()
  async setupNativeRecording(session) {
    const { page, language, testIdAttribute } = session;

    try {
      // Configure Playwright's test ID attribute if specified
      if (testIdAttribute && testIdAttribute !== 'data-testid') {
        await page.evaluate((attr) => {
          if (window.playwright && window.playwright.selectors) {
            window.playwright.selectors.setTestIdAttribute(attr);
          }
        }, testIdAttribute);
      }

      // Set up event listeners to capture generated code from Playwright's recorder
      await page.exposeFunction('__playwrightRecorderCodeGenerated', (code) => {
        session.generatedCode = this.convertPlaywrightCodeToTargetLanguage(code, language);
        session.lastCodeUpdate = Date.now();
        
        this.emit('actionsRecorded', {
          sessionId: session.id,
          generatedCode: session.generatedCode,
          source: 'native-playwright'
        });
      });

      // Inject script to monitor Playwright's recorder and extract generated code
      await page.addInitScript(() => {
        // Monitor for Playwright inspector/recorder
        const checkForRecorder = () => {
          if (window.playwright && window.playwright.recorder) {
            // Hook into Playwright's code generation
            const originalSetCode = window.playwright.recorder.setCode;
            if (originalSetCode && !window.__playwrightHooked) {
              window.__playwrightHooked = true;
              window.playwright.recorder.setCode = function(code) {
                originalSetCode.call(this, code);
                if (window.__playwrightRecorderCodeGenerated) {
                  window.__playwrightRecorderCodeGenerated(code);
                }
              };
            }
          }
        };
        
        // Check periodically for recorder availability
        const interval = setInterval(checkForRecorder, 1000);
        
        // Clean up after 30 seconds if recorder not found
        setTimeout(() => clearInterval(interval), 30000);
      });

      // Start Playwright's native recording by calling page.pause()
      // This will open the Playwright Inspector with recording capabilities
      console.log(`🎬 Starting native Playwright recording for session ${session.id}`);
      
      // Use setTimeout to call pause() after a brief delay to ensure page is ready
      setTimeout(async () => {
        try {
          session.nativeRecorderActive = true;
          await page.pause();
        } catch (error) {
          console.error('Error starting native recording:', error);
          // Fallback to custom recording if native fails
          session.useNativeRecording = false;
          await this.setupRecordingListeners(session);
        }
      }, 1000);

    } catch (error) {
      console.error('Failed to setup native recording:', error);
      // Fallback to custom recording
      session.useNativeRecording = false;
      await this.setupRecordingListeners(session);
    }
  }

  // Convert Playwright's native generated code to target language
  convertPlaywrightCodeToTargetLanguage(playwrightCode, targetLanguage) {
    if (!playwrightCode || typeof playwrightCode !== 'string') {
      return '';
    }

    // If target language is JavaScript/TypeScript, return as-is (Playwright generates JS by default)
    if (targetLanguage === 'javascript' || targetLanguage === 'typescript') {
      return playwrightCode;
    }

    // For other languages, use template engine to convert
    try {
      // Parse the Playwright JavaScript code to extract actions
      const actions = this.parsePlaywrightCode(playwrightCode);
      
      // Generate code using template engine
      if (this.templateEngine.hasTemplate(targetLanguage)) {
        return this.generateCodeFromTemplate(actions, {
          template: targetLanguage,
          generateAssertions: true,
          healingMode: true
        });
      }
      
      // Fallback: return original code with language comment
      return `// Generated by Playwright (JavaScript)\n// Convert to ${targetLanguage} manually\n\n${playwrightCode}`;
    } catch (error) {
      console.error('Error converting Playwright code:', error);
      return playwrightCode;
    }
  }

  // Parse Playwright generated JavaScript code to extract actions
  parsePlaywrightCode(code) {
    const actions = [];
    const lines = code.split('\n');
    
    for (const line of lines) {
      const trimmed = line.trim();
      
      // Parse common Playwright actions
      if (trimmed.includes('.goto(')) {
        const urlMatch = trimmed.match(/\.goto\(['"](.*?)['"]\)/);
        if (urlMatch) {
          actions.push({
            type: 'navigation',
            url: urlMatch[1],
            timestamp: Date.now()
          });
        }
      } else if (trimmed.includes('.click(')) {
        const selectorMatch = trimmed.match(/\.click\(['"](.*?)['"]\)/);
        if (selectorMatch) {
          actions.push({
            type: 'click',
            selector: { primary: selectorMatch[1] },
            timestamp: Date.now()
          });
        }
      } else if (trimmed.includes('.fill(')) {
        const fillMatch = trimmed.match(/\.fill\(['"](.*?)['"],\s*['"](.*?)['"]\)/);
        if (fillMatch) {
          actions.push({
            type: 'fill',
            selector: { primary: fillMatch[1] },
            value: fillMatch[2],
            timestamp: Date.now()
          });
        }
      }
    }
    
    return actions;
  }

  // Generate code from recorded actions
  async generateCodeFromActions(session) {
    const { actions, language, generateAssertions, healingMode } = session;
    
    // Use template engine if available
    if (this.templateEngine.hasTemplate(language)) {
      const code = await this.generateCodeFromTemplate(actions, {
        template: language,
        generateAssertions,
        healingMode
      });
      session.generatedCode = code;
      return code;
    }
    
    // Fallback to legacy generators
    const generator = this.getLanguageGenerator(language);
    
    let code = generator.generateHeader();
    
    // Group actions by page/context
    const actionGroups = this.groupActionsByContext(actions);
    
    for (const group of actionGroups) {
      code += generator.generateTestCase(group, {
        generateAssertions,
        healingMode
      });
    }
    
    code += generator.generateFooter();
    
    session.generatedCode = code;
    return code;
  }

  // Generate code using template engine
   async generateCodeFromTemplate(actions, options = {}) {
     const {
       template = 'javascript-playwright',
       testName = 'Generated Test',
       generateAssertions = true,
       healingMode = true
     } = options;
 
     // Convert actions to template format with healing-aware selectors
   const testSteps = await Promise.all(actions.map(async (action) => {
     let selector;
     
     if (healingMode && this.healingEngine.isReady()) {
       // Use healing engine for resilient selector generation
       try {
         const healingResult = await this.healingEngine.generateHealingSelectors(action.element, {
           strategy: 'comprehensive',
           maxAlternatives: 3,
           includeXPath: true,
           contextAware: true
         });
         
         selector = {
           primary: healingResult.primary,
           alternatives: healingResult.alternatives,
           healingCode: healingResult.healingCode,
           confidence: healingResult.confidence
         };
       } catch (error) {
         console.warn('Healing engine failed, falling back to selector engine:', error);
         selector = await this.selectorEngine.generateSelector(action.element, {
           strategy: 'comprehensive',
           healingMode: false
         });
       }
     } else {
       // Use standard selector engine
       selector = await this.selectorEngine.generateSelector(action.element, {
         strategy: 'comprehensive',
         healingMode
       });
     }
     
     return {
       action: action.type,
       selector: selector.primary,
       selectorAlternatives: selector.alternatives || [],
       healingCode: selector.healingCode,
       confidence: selector.confidence || 0.8,
       value: action.value,
       options: action.options
     };
   }));
 
     const testData = {
       testSuite: {
         name: testName,
         tests: [{
           name: testName,
           steps: testSteps
         }]
       }
     };
     
     return this.templateEngine.generateCode(template, testData);
   }

  // Template management methods
   getAvailableTemplates() {
     return this.templateEngine.getAllTemplates();
   }
 
   addCustomTemplate(name, template) {
     return this.templateEngine.addCustomTemplate(name, template);
   }
 
   removeTemplate(name) {
     return this.templateEngine.removeTemplate(name);
   }
 
   getTemplate(name) {
     return this.templateEngine.getTemplate(name);
   }

   // Helper method to group actions by context
    groupActionsByContext(actions) {
      const groups = [];
      let currentGroup = [];
      
      for (const action of actions) {
        if (action.type === 'navigate' && currentGroup.length > 0) {
          groups.push(currentGroup);
          currentGroup = [action];
        } else {
          currentGroup.push(action);
        }
      }
      
      if (currentGroup.length > 0) {
        groups.push(currentGroup);
      }
      
      return groups;
    }

    // Generate healing-aware code with fallback strategies
    generateHealingAwareCode(testSteps, language = 'javascript') {
      const healingCode = [];
      
      for (const step of testSteps) {
        if (step.healingCode && step.healingCode[language]) {
          healingCode.push(`// Healing-aware locator for ${step.action}`);
          healingCode.push(step.healingCode[language]);
          healingCode.push(`// Use the healing function: await findElementWithHealing(page)`);
          healingCode.push('');
        }
      }
      
      return healingCode.join('\n');
    }

    // Get healing statistics for reporting
    getHealingStats() {
      if (this.healingEngine.isReady()) {
        return this.healingEngine.getAnalytics();
      }
      return null;
    }

    // Enable/disable healing mode
    setHealingMode(enabled) {
      this.healingMode = enabled;
      return this.healingMode;
    }

    // Export functionality
    async exportCode(testCode, language, format, options = {}) {
      try {
        return await this.exportService.exportCode(testCode, language, format, options);
      } catch (error) {
        console.error('Export error:', error);
        throw error;
      }
    }

    getSupportedExportFormats() {
      return this.exportService.getSupportedFormats();
    }

  // Get language-specific code generator
  getLanguageGenerator(language) {
    switch (language) {
      case 'javascript':
        return new JavaScriptGenerator();
      case 'typescript':
        return new TypeScriptGenerator();
      case 'python':
        return new PythonGenerator();
      case 'python-async':
        return new PythonAsyncGenerator();
      case 'java':
        return new JavaGenerator();
      case 'csharp':
        return new CSharpGenerator();
      default:
        return new JavaScriptGenerator();
    }
  }

  // Group actions by context for better test organization
  groupActionsByContext(actions) {
    const groups = [];
    let currentGroup = [];
    let currentUrl = null;

    for (const action of actions) {
      if (action.type === 'navigation' && action.url !== currentUrl) {
        if (currentGroup.length > 0) {
          groups.push({
            url: currentUrl,
            actions: currentGroup
          });
        }
        currentGroup = [];
        currentUrl = action.url;
      }
      currentGroup.push(action);
    }

    if (currentGroup.length > 0) {
      groups.push({
        url: currentUrl,
        actions: currentGroup
      });
    }

    return groups;
  }

  // Stop recording session
  async stopRecording(sessionId) {
    const session = this.recorderSessions.get(sessionId);
    if (!session) {
      throw new Error(`Recording session ${sessionId} not found`);
    }

    try {
      // Handle native recording sessions
      if (session.useNativeRecording && session.nativeRecorderActive) {
        console.log(`🛑 Stopping native Playwright recording for session ${sessionId}`);
        
        // For native recording, we need to resume the page to exit pause mode
        try {
          await session.page.evaluate(() => {
            if (window.playwright && window.playwright.resume) {
              window.playwright.resume();
            }
          });
        } catch (error) {
          console.warn('Could not resume page programmatically:', error);
        }
        
        session.nativeRecorderActive = false;
      } else {
        // Handle custom recording sessions
        if (session.pollInterval) {
          clearInterval(session.pollInterval);
        }
        
        // Generate final code for custom recording
        await this.generateCodeFromActions(session);
      }
      
      // Close browser context
      await session.context.close();
      
      session.status = 'completed';
      session.endTime = Date.now();
      session.duration = session.endTime - session.startTime;

      this.emit('recordingStopped', {
        sessionId,
        duration: session.duration,
        actionsCount: session.actions.length,
        generatedCode: session.generatedCode,
        recordingMethod: session.useNativeRecording ? 'native' : 'custom'
      });

      return {
        sessionId,
        status: 'completed',
        duration: session.duration,
        actionsCount: session.actions.length,
        generatedCode: session.generatedCode,
        recordingMethod: session.useNativeRecording ? 'native' : 'custom'
      };
    } catch (error) {
      console.error('Error stopping recording:', error);
      throw new Error(`Failed to stop recording: ${error.message}`);
    }
  }

  // Get recording session status
  getRecordingStatus(sessionId) {
    const session = this.recorderSessions.get(sessionId);
    if (!session) {
      return { status: 'not_found' };
    }

    return {
      sessionId: session.id,
      status: session.status,
      language: session.language,
      actionsCount: session.actions.length,
      duration: session.status === 'completed' 
        ? session.duration 
        : Date.now() - session.startTime,
      generatedCode: session.generatedCode
    };
  }

  // Get generated code for session
  getGeneratedCode(sessionId, language = null) {
    const session = this.recorderSessions.get(sessionId);
    if (!session) {
      throw new Error(`Recording session ${sessionId} not found`);
    }

    if (language && language !== session.language) {
      // Generate code in different language
      const generator = this.getLanguageGenerator(language);
      const actionGroups = this.groupActionsByContext(session.actions);
      
      let code = generator.generateHeader();
      for (const group of actionGroups) {
        code += generator.generateTestCase(group, {
          generateAssertions: session.generateAssertions,
          healingMode: session.healingMode
        });
      }
      code += generator.generateFooter();
      
      return code;
    }

    return session.generatedCode;
  }

  // Export generated test code
  async exportTest(sessionId, options = {}) {
    const session = this.recorderSessions.get(sessionId);
    if (!session) {
      throw new Error(`Recording session ${sessionId} not found`);
    }

    const {
      language = session.language,
      filename = `recorded-test-${sessionId}`,
      includeComments = true,
      includeHealing = session.healingMode
    } = options;

    const code = this.getGeneratedCode(sessionId, language);
    const generator = this.getLanguageGenerator(language);
    const fileExtension = generator.getFileExtension();
    const fullFilename = `${filename}.${fileExtension}`;
    
    const exportPath = path.join(process.cwd(), 'exports', fullFilename);
    await fs.mkdir(path.dirname(exportPath), { recursive: true });
    await fs.writeFile(exportPath, code);

    return {
      filename: fullFilename,
      path: exportPath,
      language,
      size: code.length,
      actionsCount: session.actions.length
    };
  }

  // Utility methods
  async getBrowser(browserName = 'chromium') {
    if (this.browsers.has(browserName)) {
      return this.browsers.get(browserName);
    }

    let browser;
    switch (browserName) {
      case 'firefox':
        browser = await firefox.launch({ 
          headless: false,
          args: ['--start-maximized']
        });
        break;
      case 'webkit':
        browser = await webkit.launch({ 
          headless: false
        });
        break;
      default:
        browser = await chromium.launch({ 
          headless: false,
          args: ['--start-maximized']
        });
    }

    this.browsers.set(browserName, browser);
    return browser;
  }

  generateSessionId() {
    return `rec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // Clean up resources
  async cleanup() {
    for (const [sessionId, session] of this.recorderSessions) {
      try {
        if (session.pollInterval) {
          clearInterval(session.pollInterval);
        }
        if (session.context) {
          await session.context.close();
        }
      } catch (error) {
        console.error(`Error cleaning up session ${sessionId}:`, error);
      }
    }
    
    for (const [browserName, browser] of this.browsers) {
      try {
        await browser.close();
      } catch (error) {
        console.error(`Error closing browser ${browserName}:`, error);
      }
    }
    
    this.recorderSessions.clear();
    this.browsers.clear();
  }
}

// Base class for language generators
class LanguageGenerator {
  generateHeader() {
    throw new Error('generateHeader must be implemented');
  }

  generateTestCase(actionGroup, options) {
    throw new Error('generateTestCase must be implemented');
  }

  generateFooter() {
    return '';
  }

  getFileExtension() {
    throw new Error('getFileExtension must be implemented');
  }
}

// JavaScript generator
class JavaScriptGenerator extends LanguageGenerator {
  generateHeader() {
    return `const { test, expect } = require('@playwright/test');

test.describe('Recorded Test', () => {
`;
  }

  generateTestCase(actionGroup, options) {
    const { generateAssertions, healingMode } = options;
    let code = `  test('test case', async ({ page }) => {
`;
    
    if (actionGroup.url) {
      code += `    await page.goto('${actionGroup.url}');
`;
    }

    for (const action of actionGroup.actions) {
      code += this.generateActionCode(action, { generateAssertions, healingMode });
    }

    code += `  });

`;
    return code;
  }

  generateActionCode(action, options) {
    const { healingMode, generateAssertions } = options;
    let code = '';
    
    switch (action.type) {
      case 'click':
        if (healingMode) {
          code += `    // Smart click with healing
    await page.locator('${action.selector}').click();
`;
        } else {
          code += `    await page.locator('${action.selector}').click();
`;
        }
        break;
      
      case 'fill':
        if (healingMode) {
          code += `    // Smart fill with healing
    await page.locator('${action.selector}').fill('${action.value}');
`;
        } else {
          code += `    await page.locator('${action.selector}').fill('${action.value}');
`;
        }
        break;
      
      case 'navigation':
        code += `    await page.goto('${action.url}');
`;
        break;
      
      default:
        code += `    // ${action.type}: ${JSON.stringify(action)}
`;
        break;
    }

    // Add auto-generated assertions
    if (generateAssertions && action.assertions && action.assertions.length > 0) {
      code += '\n';
      action.assertions.forEach(assertion => {
        const assertionCode = this.assertionEngine.generateAssertionCode(
          assertion, 
          'javascript', 
          'playwright'
        );
        code += assertionCode;
      });
      code += '\n';
    }

    return code;
  }

  generateFooter() {
    return `});
`;
  }

  getFileExtension() {
    return 'spec.js';
  }
}

// TypeScript generator
class TypeScriptGenerator extends JavaScriptGenerator {
  generateHeader() {
    return `import { test, expect } from '@playwright/test';

test.describe('Recorded Test', () => {
`;
  }

  getFileExtension() {
    return 'spec.ts';
  }
}

// Python generator
class PythonGenerator extends LanguageGenerator {
  generateHeader() {
    return `import pytest
from playwright.sync_api import Page, expect

def test_recorded_test(page: Page):
`;
  }

  generateTestCase(actionGroup, options) {
    let code = '';
    
    if (actionGroup.url) {
      code += `    page.goto("${actionGroup.url}")
`;
    }

    for (const action of actionGroup.actions) {
      code += this.generateActionCode(action, options);
    }

    return code;
  }

  generateActionCode(action, options) {
    const { generateAssertions } = options;
    let code = '';
    
    switch (action.type) {
      case 'click':
        code += `    page.locator("${action.selector}").click()
`;
        break;
      case 'fill':
        code += `    page.locator("${action.selector}").fill("${action.value}")
`;
        break;
      case 'navigation':
        code += `    page.goto("${action.url}")
`;
        break;
      default:
        code += `    # ${action.type}: ${JSON.stringify(action)}
`;
        break;
    }

    // Add auto-generated assertions
    if (generateAssertions && action.assertions && action.assertions.length > 0) {
      code += '\n';
      action.assertions.forEach(assertion => {
        const assertionCode = this.assertionEngine.generateAssertionCode(
          assertion, 
          'python', 
          'playwright'
        );
        code += assertionCode;
      });
      code += '\n';
    }

    return code;
  }

  getFileExtension() {
    return 'py';
  }
}

// Python Async generator
class PythonAsyncGenerator extends PythonGenerator {
  generateHeader() {
    return `import pytest
from playwright.async_api import Page, expect

async def test_recorded_test(page: Page):
`;
  }

  generateActionCode(action, options) {
    const { generateAssertions } = options;
    let code = '';
    
    switch (action.type) {
      case 'click':
        code += `    await page.locator("${action.selector}").click()
`;
        break;
      case 'fill':
        code += `    await page.locator("${action.selector}").fill("${action.value}")
`;
        break;
      case 'navigation':
        code += `    await page.goto("${action.url}")
`;
        break;
      default:
        code += `    # ${action.type}: ${JSON.stringify(action)}
`;
        break;
    }

    // Add auto-generated assertions
    if (generateAssertions && action.assertions && action.assertions.length > 0) {
      code += '\n';
      action.assertions.forEach(assertion => {
        const assertionCode = this.assertionEngine.generateAssertionCode(
          assertion, 
          'python-async', 
          'playwright'
        );
        code += assertionCode;
      });
      code += '\n';
    }

    return code;
  }
}

// Java generator
class JavaGenerator extends LanguageGenerator {
  generateHeader() {
    return `import com.microsoft.playwright.*;
import org.junit.jupiter.api.Test;

public class RecordedTest {
    @Test
    void testRecordedTest() {
        try (Playwright playwright = Playwright.create()) {
            Browser browser = playwright.chromium().launch();
            Page page = browser.newPage();
`;
  }

  generateTestCase(actionGroup, options) {
    let code = '';
    
    if (actionGroup.url) {
      code += `            page.navigate("${actionGroup.url}");
`;
    }

    for (const action of actionGroup.actions) {
      code += this.generateActionCode(action, options);
    }

    return code;
  }

  generateActionCode(action, options) {
    const { generateAssertions } = options;
    let code = '';
    
    switch (action.type) {
      case 'click':
        code += `            page.locator("${action.selector}").click();
`;
        break;
      case 'fill':
        code += `            page.locator("${action.selector}").fill("${action.value}");
`;
        break;
      case 'navigation':
        code += `            page.navigate("${action.url}");
`;
        break;
      default:
        code += `            // ${action.type}: ${JSON.stringify(action)}
`;
        break;
    }

    // Add auto-generated assertions
    if (generateAssertions && action.assertions && action.assertions.length > 0) {
      code += '\n';
      action.assertions.forEach(assertion => {
        const assertionCode = this.assertionEngine.generateAssertionCode(
          assertion, 
          'java', 
          'playwright'
        );
        code += assertionCode;
      });
      code += '\n';
    }

    return code;
  }

  generateFooter() {
    return `        }
    }
}
`;
  }

  getFileExtension() {
    return 'java';
  }
}

// C# generator
class CSharpGenerator extends LanguageGenerator {
  generateHeader() {
    return `using Microsoft.Playwright;
using Microsoft.Playwright.NUnit;
using NUnit.Framework;

[TestFixture]
public class RecordedTest : PageTest
{
    [Test]
    public async Task TestRecordedTest()
    {
`;
  }

  generateTestCase(actionGroup, options) {
    let code = '';
    
    if (actionGroup.url) {
      code += `        await Page.GotoAsync("${actionGroup.url}");
`;
    }

    for (const action of actionGroup.actions) {
      code += this.generateActionCode(action, options);
    }

    return code;
  }

  generateActionCode(action, options) {
    const { generateAssertions } = options;
    let code = '';
    
    switch (action.type) {
      case 'click':
        code += `        await Page.Locator("${action.selector}").ClickAsync();
`;
        break;
      case 'fill':
        code += `        await Page.Locator("${action.selector}").FillAsync("${action.value}");
`;
        break;
      case 'navigation':
        code += `        await Page.GotoAsync("${action.url}");
`;
        break;
      default:
        code += `        // ${action.type}: ${JSON.stringify(action)}
`;
        break;
    }

    // Add auto-generated assertions
    if (generateAssertions && action.assertions && action.assertions.length > 0) {
      code += '\n';
      action.assertions.forEach(assertion => {
        const assertionCode = this.assertionEngine.generateAssertionCode(
          assertion, 
          'csharp', 
          'playwright'
        );
        code += assertionCode;
      });
      code += '\n';
    }

    return code;
  }

  generateFooter() {
    return `    }
}
`;
  }

  getFileExtension() {
    return 'cs';
  }
}

export default CodegenService;