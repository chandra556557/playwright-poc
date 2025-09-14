import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import CodegenService from '../CodegenService.js';
import { chromium } from 'playwright';
import EventEmitter from 'events';

// Mock Playwright
vi.mock('playwright', () => ({
  chromium: {
    launch: vi.fn(),
  },
  firefox: {
    launch: vi.fn(),
  },
  webkit: {
    launch: vi.fn(),
  },
}));

// Mock other services
vi.mock('../SelectorEngine.js', () => ({
  default: class MockSelectorEngine {
    configure = vi.fn();
    generateSelector = vi.fn().mockReturnValue('#test-selector');
  }
}));

vi.mock('../AssertionEngine.js', () => ({
  default: class MockAssertionEngine {
    generateAssertions = vi.fn().mockReturnValue([]);
  }
}));

vi.mock('../TemplateEngine.js', () => ({
  default: class MockTemplateEngine {
    getTemplate = vi.fn().mockReturnValue({ content: 'test template' });
    getAvailableTemplates = vi.fn().mockReturnValue(['javascript-playwright']);
  }
}));

vi.mock('../HealingEngine.js', () => ({
  default: class MockHealingEngine {
    initialize = vi.fn().mockResolvedValue();
    getStats = vi.fn().mockReturnValue({ totalAttempts: 0, successfulHealing: 0 });
  }
}));

vi.mock('../ExportService.js', () => ({
  default: class MockExportService {
    export = vi.fn().mockResolvedValue('exported code');
    getSupportedFormats = vi.fn().mockReturnValue(['file', 'clipboard']);
  }
}));

// Mock fs/promises
vi.mock('fs/promises', () => ({
  mkdir: vi.fn().mockResolvedValue(),
  writeFile: vi.fn().mockResolvedValue(),
  readFile: vi.fn().mockResolvedValue('test content'),
}));

describe('CodegenService', () => {
  let codegenService;
  let mockBrowser;
  let mockContext;
  let mockPage;

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Setup mock browser, context, and page
    mockPage = {
      goto: vi.fn().mockResolvedValue(),
      pause: vi.fn().mockResolvedValue(),
      addInitScript: vi.fn().mockResolvedValue(),
      on: vi.fn(),
      off: vi.fn(),
      close: vi.fn().mockResolvedValue(),
      screenshot: vi.fn().mockResolvedValue(),
      evaluate: vi.fn().mockResolvedValue(),
    };

    mockContext = {
      newPage: vi.fn().mockResolvedValue(mockPage),
      close: vi.fn().mockResolvedValue(),
    };

    mockBrowser = {
      newContext: vi.fn().mockResolvedValue(mockContext),
      close: vi.fn().mockResolvedValue(),
      isConnected: vi.fn().mockReturnValue(true),
    };

    chromium.launch.mockResolvedValue(mockBrowser);
    
    codegenService = new CodegenService();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Initialization', () => {
    it('creates a new CodegenService instance', () => {
      expect(codegenService).toBeInstanceOf(CodegenService);
      expect(codegenService).toBeInstanceOf(EventEmitter);
    });

    it('initializes with default properties', () => {
      expect(codegenService.browsers).toBeInstanceOf(Map);
      expect(codegenService.recorderSessions).toBeInstanceOf(Map);
      expect(codegenService.ready).toBe(false);
      expect(codegenService.supportedLanguages).toEqual([
        'javascript',
        'typescript',
        'python',
        'python-async',
        'java',
        'csharp'
      ]);
    });

    it('initializes successfully', async () => {
      await codegenService.initialize();
      expect(codegenService.isReady()).toBe(true);
    });

    it('handles initialization errors', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      
      // Force an error during initialization
      codegenService.healingEngine.initialize.mockRejectedValue(new Error('Init failed'));
      
      await codegenService.initialize();
      expect(codegenService.isReady()).toBe(true); // Should still be ready despite healing engine error
      
      consoleSpy.mockRestore();
    });
  });

  describe('Recording Session Management', () => {
    beforeEach(async () => {
      await codegenService.initialize();
    });

    it('starts a new recording session with default options', async () => {
      const result = await codegenService.startRecording();
      
      expect(result).toHaveProperty('sessionId');
      expect(result).toHaveProperty('status', 'started');
      expect(result).toHaveProperty('previewUrl');
      expect(result).toHaveProperty('recordingMethod');
      
      expect(chromium.launch).toHaveBeenCalled();
      expect(mockBrowser.newContext).toHaveBeenCalledWith({
        viewport: { width: 1280, height: 720 },
        recordVideo: {
          dir: expect.stringContaining('recordings')
        }
      });
    });

    it('starts recording with custom options', async () => {
      const options = {
        browserName: 'chromium',
        language: 'typescript',
        url: 'https://example.com',
        viewport: { width: 1920, height: 1080 },
        testIdAttribute: 'data-cy',
        generateAssertions: false,
        healingMode: false,
        useNativeRecording: false
      };

      const result = await codegenService.startRecording(options);
      
      expect(result.sessionId).toBeDefined();
      expect(mockPage.goto).toHaveBeenCalledWith('https://example.com', {
        waitUntil: 'domcontentloaded',
        timeout: 60000
      });
    });

    it('handles navigation errors gracefully', async () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      mockPage.goto.mockRejectedValue(new Error('Navigation failed'));

      const result = await codegenService.startRecording({
        url: 'https://invalid-url.com'
      });
      
      expect(result.sessionId).toBeDefined();
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Failed to navigate to https://invalid-url.com'),
        expect.any(String)
      );
      
      consoleSpy.mockRestore();
    });

    it('stops a recording session', async () => {
      const startResult = await codegenService.startRecording();
      const sessionId = startResult.sessionId;
      
      const stopResult = await codegenService.stopRecording(sessionId);
      
      expect(stopResult).toHaveProperty('sessionId', sessionId);
      expect(stopResult).toHaveProperty('status', 'stopped');
      expect(stopResult).toHaveProperty('generatedCode');
      expect(mockContext.close).toHaveBeenCalled();
    });

    it('throws error when stopping non-existent session', async () => {
      await expect(codegenService.stopRecording('invalid-session'))
        .rejects.toThrow('Recording session not found');
    });

    it('gets recording status', async () => {
      const startResult = await codegenService.startRecording();
      const sessionId = startResult.sessionId;
      
      const status = codegenService.getRecordingStatus(sessionId);
      
      expect(status).toHaveProperty('sessionId', sessionId);
      expect(status).toHaveProperty('status', 'recording');
      expect(status).toHaveProperty('startTime');
    });

    it('returns null for non-existent session status', () => {
      const status = codegenService.getRecordingStatus('invalid-session');
      expect(status).toBeNull();
    });
  });

  describe('Code Generation', () => {
    let sessionId;

    beforeEach(async () => {
      await codegenService.initialize();
      const result = await codegenService.startRecording();
      sessionId = result.sessionId;
    });

    it('generates code from actions', async () => {
      const session = codegenService.recorderSessions.get(sessionId);
      session.actions = [
        { type: 'click', selector: '#button', timestamp: Date.now() },
        { type: 'fill', selector: '#input', value: 'test', timestamp: Date.now() }
      ];

      const code = await codegenService.generateCodeFromActions(session);
      
      expect(code).toBeDefined();
      expect(typeof code).toBe('string');
    });

    it('generates code from template', async () => {
      const actions = [
        { type: 'click', selector: '#button' },
        { type: 'fill', selector: '#input', value: 'test' }
      ];

      const code = await codegenService.generateCodeFromTemplate(actions, {
        language: 'javascript',
        template: 'javascript-playwright'
      });
      
      expect(code).toBeDefined();
      expect(typeof code).toBe('string');
    });

    it('gets generated code for session', () => {
      const session = codegenService.recorderSessions.get(sessionId);
      session.generatedCode = 'test code';
      
      const code = codegenService.getGeneratedCode(sessionId);
      
      expect(code).toHaveProperty('sessionId', sessionId);
      expect(code).toHaveProperty('code', 'test code');
      expect(code).toHaveProperty('language');
    });

    it('returns null for non-existent session code', () => {
      const code = codegenService.getGeneratedCode('invalid-session');
      expect(code).toBeNull();
    });
  });

  describe('Language Generators', () => {
    beforeEach(async () => {
      await codegenService.initialize();
    });

    it('gets JavaScript language generator', () => {
      const generator = codegenService.getLanguageGenerator('javascript');
      expect(generator).toBeDefined();
      expect(generator.getFileExtension()).toBe('.js');
    });

    it('gets TypeScript language generator', () => {
      const generator = codegenService.getLanguageGenerator('typescript');
      expect(generator).toBeDefined();
      expect(generator.getFileExtension()).toBe('.ts');
    });

    it('gets Python language generator', () => {
      const generator = codegenService.getLanguageGenerator('python');
      expect(generator).toBeDefined();
      expect(generator.getFileExtension()).toBe('.py');
    });

    it('gets Python async language generator', () => {
      const generator = codegenService.getLanguageGenerator('python-async');
      expect(generator).toBeDefined();
      expect(generator.getFileExtension()).toBe('.py');
    });

    it('gets Java language generator', () => {
      const generator = codegenService.getLanguageGenerator('java');
      expect(generator).toBeDefined();
      expect(generator.getFileExtension()).toBe('.java');
    });

    it('gets C# language generator', () => {
      const generator = codegenService.getLanguageGenerator('csharp');
      expect(generator).toBeDefined();
      expect(generator.getFileExtension()).toBe('.cs');
    });

    it('throws error for unsupported language', () => {
      expect(() => codegenService.getLanguageGenerator('unsupported'))
        .toThrow('Unsupported language: unsupported');
    });
  });

  describe('Browser Management', () => {
    beforeEach(async () => {
      await codegenService.initialize();
    });

    it('gets chromium browser', async () => {
      const browser = await codegenService.getBrowser('chromium');
      expect(browser).toBe(mockBrowser);
      expect(chromium.launch).toHaveBeenCalledWith({
        headless: false,
        args: ['--disable-web-security', '--disable-features=VizDisplayCompositor']
      });
    });

    it('reuses existing browser instance', async () => {
      await codegenService.getBrowser('chromium');
      await codegenService.getBrowser('chromium');
      
      expect(chromium.launch).toHaveBeenCalledTimes(1);
    });

    it('handles browser launch failure', async () => {
      chromium.launch.mockRejectedValue(new Error('Browser launch failed'));
      
      await expect(codegenService.getBrowser('chromium'))
        .rejects.toThrow('Failed to launch browser: Browser launch failed');
    });
  });

  describe('Template Management', () => {
    beforeEach(async () => {
      await codegenService.initialize();
    });

    it('gets available templates', () => {
      const templates = codegenService.getAvailableTemplates();
      expect(templates).toEqual(['javascript-playwright']);
    });

    it('adds custom template', () => {
      const template = { name: 'custom', content: 'custom template' };
      codegenService.addCustomTemplate('custom', template);
      
      expect(codegenService.templateEngine.addTemplate).toHaveBeenCalledWith('custom', template);
    });

    it('removes template', () => {
      codegenService.removeTemplate('custom');
      expect(codegenService.templateEngine.removeTemplate).toHaveBeenCalledWith('custom');
    });

    it('gets specific template', () => {
      const template = codegenService.getTemplate('javascript-playwright');
      expect(template).toEqual({ content: 'test template' });
    });
  });

  describe('Export Functionality', () => {
    let sessionId;

    beforeEach(async () => {
      await codegenService.initialize();
      const result = await codegenService.startRecording();
      sessionId = result.sessionId;
    });

    it('exports test code', async () => {
      const session = codegenService.recorderSessions.get(sessionId);
      session.generatedCode = 'test code';
      
      const result = await codegenService.exportTest(sessionId, {
        format: 'file',
        filename: 'test.js'
      });
      
      expect(result).toHaveProperty('success', true);
      expect(result).toHaveProperty('data');
    });

    it('gets supported export formats', () => {
      const formats = codegenService.getSupportedExportFormats();
      expect(formats).toEqual(['file', 'clipboard']);
    });
  });

  describe('Healing Integration', () => {
    beforeEach(async () => {
      await codegenService.initialize();
    });

    it('gets healing stats', () => {
      const stats = codegenService.getHealingStats();
      expect(stats).toEqual({ totalAttempts: 0, successfulHealing: 0 });
    });

    it('sets healing mode', () => {
      codegenService.setHealingMode(true);
      expect(codegenService.healingEngine.setEnabled).toHaveBeenCalledWith(true);
    });

    it('generates healing-aware code', () => {
      const testSteps = [
        { type: 'click', selector: '#button' },
        { type: 'fill', selector: '#input', value: 'test' }
      ];
      
      const code = codegenService.generateHealingAwareCode(testSteps, 'javascript');
      expect(code).toBeDefined();
      expect(typeof code).toBe('string');
    });
  });

  describe('Session ID Generation', () => {
    it('generates unique session IDs', () => {
      const id1 = codegenService.generateSessionId();
      const id2 = codegenService.generateSessionId();
      
      expect(id1).toBeDefined();
      expect(id2).toBeDefined();
      expect(id1).not.toBe(id2);
      expect(typeof id1).toBe('string');
      expect(typeof id2).toBe('string');
    });
  });

  describe('Cleanup', () => {
    beforeEach(async () => {
      await codegenService.initialize();
    });

    it('cleans up resources', async () => {
      // Start a session to have something to clean up
      await codegenService.startRecording();
      
      await codegenService.cleanup();
      
      expect(mockBrowser.close).toHaveBeenCalled();
      expect(codegenService.browsers.size).toBe(0);
      expect(codegenService.recorderSessions.size).toBe(0);
    });

    it('handles cleanup errors gracefully', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      mockBrowser.close.mockRejectedValue(new Error('Close failed'));
      
      await codegenService.startRecording();
      await codegenService.cleanup();
      
      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });
  });

  describe('Event Emission', () => {
    beforeEach(async () => {
      await codegenService.initialize();
    });

    it('emits recordingStarted event', async () => {
      const eventSpy = vi.fn();
      codegenService.on('recordingStarted', eventSpy);
      
      await codegenService.startRecording();
      
      expect(eventSpy).toHaveBeenCalledWith(expect.objectContaining({
        sessionId: expect.any(String),
        url: 'about:blank',
        language: 'javascript'
      }));
    });

    it('emits recordingStopped event', async () => {
      const eventSpy = vi.fn();
      codegenService.on('recordingStopped', eventSpy);
      
      const result = await codegenService.startRecording();
      await codegenService.stopRecording(result.sessionId);
      
      expect(eventSpy).toHaveBeenCalledWith(expect.objectContaining({
        sessionId: result.sessionId,
        status: 'stopped'
      }));
    });
  });
});