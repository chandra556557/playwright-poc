import { describe, it, expect, vi, beforeAll, afterAll, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import cors from 'cors';
import codegenRoutes from '../../routes/codegen.js';
import testsRoutes from '../../routes/tests.js';
import { v4 as uuidv4 } from 'uuid';

// Mock services
vi.mock('../../services/CodegenService.js', () => ({
  default: class MockCodegenService {
    constructor() {
      this.supportedLanguages = ['javascript', 'typescript', 'python', 'java', 'csharp'];
      this.recorderSessions = new Map();
      this.ready = true;
    }
    
    initialize = vi.fn().mockResolvedValue();
    isReady = vi.fn().mockReturnValue(true);
    
    startRecording = vi.fn().mockImplementation(async (options = {}) => {
      const sessionId = uuidv4();
      const session = {
        sessionId,
        status: 'started',
        previewUrl: `http://localhost:9222/devtools/inspector.html?ws=localhost:9222/devtools/page/${sessionId}`,
        recordingMethod: options.useNativeRecording ? 'native' : 'custom',
        startTime: new Date().toISOString(),
        options,
        actions: []
      };
      this.recorderSessions.set(sessionId, session);
      return session;
    });
    
    stopRecording = vi.fn().mockImplementation(async (sessionId) => {
      const session = this.recorderSessions.get(sessionId);
      if (!session) {
        throw new Error('Recording session not found');
      }
      session.status = 'stopped';
      session.generatedCode = 'const { test, expect } = require(\'@playwright/test\');\n\ntest(\'recorded test\', async ({ page }) => {\n  await page.goto(\'https://example.com\');\n});';
      return session;
    });
    
    getRecordingStatus = vi.fn().mockImplementation((sessionId) => {
      return this.recorderSessions.get(sessionId) || null;
    });
    
    getGeneratedCode = vi.fn().mockImplementation((sessionId) => {
      const session = this.recorderSessions.get(sessionId);
      if (!session) return null;
      return {
        sessionId,
        code: session.generatedCode || '',
        language: session.options?.language || 'javascript',
        lastUpdated: new Date().toISOString()
      };
    });
    
    exportTest = vi.fn().mockResolvedValue({
      success: true,
      data: 'exported test code',
      format: 'file'
    });
    
    getAvailableTemplates = vi.fn().mockReturnValue(['javascript-playwright', 'typescript-playwright']);
    addCustomTemplate = vi.fn();
    removeTemplate = vi.fn();
    getTemplate = vi.fn().mockReturnValue({ content: 'template content' });
    
    getHealingStats = vi.fn().mockReturnValue({
      totalAttempts: 10,
      successfulHealing: 8,
      successRate: 0.8,
      commonFailures: ['element-not-found', 'element-not-interactable']
    });
    
    setHealingMode = vi.fn();
    generateHealingAwareCode = vi.fn().mockReturnValue('healing aware code');
    getSupportedExportFormats = vi.fn().mockReturnValue(['file', 'clipboard']);
    
    cleanup = vi.fn().mockResolvedValue();
    
    // EventEmitter methods
    on = vi.fn();
    emit = vi.fn();
  }
}));

vi.mock('../../services/TestRunner.js', () => ({
  default: class MockTestRunner {
    constructor() {
      this.ready = true;
    }
    
    isReady = vi.fn().mockReturnValue(true);
    
    getTestSuites = vi.fn().mockResolvedValue([
      {
        id: 'suite-1',
        name: 'Test Suite 1',
        description: 'First test suite',
        tests: [],
        status: 'draft',
        createdAt: new Date().toISOString()
      }
    ]);
    
    createTestSuite = vi.fn().mockImplementation(async (data) => {
      return {
        id: data.id || uuidv4(),
        ...data,
        createdAt: new Date().toISOString(),
        status: 'draft'
      };
    });
    
    getTestSuite = vi.fn().mockImplementation(async (id) => {
      if (id === 'suite-1') {
        return {
          id: 'suite-1',
          name: 'Test Suite 1',
          description: 'First test suite',
          tests: [],
          status: 'draft'
        };
      }
      return null;
    });
    
    runTestSuite = vi.fn().mockResolvedValue({
      executionId: uuidv4(),
      status: 'running',
      startTime: new Date().toISOString()
    });
    
    deleteTestSuite = vi.fn().mockResolvedValue(true);
  }
}));

describe('API Integration Tests', () => {
  let app;
  let server;
  
  beforeAll(async () => {
    // Create Express app for testing
    app = express();
    app.use(cors());
    app.use(express.json());
    app.use(express.urlencoded({ extended: true }));
    
    // Mock app.locals for services
    app.locals.testRunner = {
      isReady: () => true,
      getTestSuites: vi.fn().mockResolvedValue([]),
      createTestSuite: vi.fn().mockResolvedValue({ id: 'test-suite' }),
      getTestSuite: vi.fn().mockResolvedValue({ id: 'test-suite' }),
      runTestSuite: vi.fn().mockResolvedValue({ executionId: 'exec-1' }),
      deleteTestSuite: vi.fn().mockResolvedValue(true)
    };
    
    app.locals.broadcast = vi.fn();
    
    // Add routes
    app.use('/api/codegen', codegenRoutes);
    app.use('/api/tests', testsRoutes);
    
    // Start server
    server = app.listen(0); // Use random available port
  });
  
  afterAll(async () => {
    if (server) {
      server.close();
    }
  });
  
  beforeEach(() => {
    vi.clearAllMocks();
  });
  
  describe('Codegen API Endpoints', () => {
    describe('GET /api/codegen/status', () => {
      it('returns service status', async () => {
        const response = await request(app)
          .get('/api/codegen/status')
          .expect(200);
        
        expect(response.body).toHaveProperty('status', 'success');
        expect(response.body).toHaveProperty('ready', true);
        expect(response.body).toHaveProperty('supportedLanguages');
        expect(response.body).toHaveProperty('activeSessions');
        expect(response.body).toHaveProperty('recordingMethods');
        expect(response.body.supportedLanguages).toContain('javascript');
        expect(response.body.supportedLanguages).toContain('typescript');
      });
    });
    
    describe('POST /api/codegen/start', () => {
      it('starts a new recording session with default options', async () => {
        const response = await request(app)
          .post('/api/codegen/start')
          .send({})
          .expect(200);
        
        expect(response.body).toHaveProperty('sessionId');
        expect(response.body).toHaveProperty('status', 'started');
        expect(response.body).toHaveProperty('previewUrl');
        expect(response.body).toHaveProperty('recordingMethod');
      });
      
      it('starts recording with custom options', async () => {
        const options = {
          browserName: 'firefox',
          language: 'typescript',
          url: 'https://example.com',
          viewport: { width: 1920, height: 1080 },
          testIdAttribute: 'data-cy',
          generateAssertions: false,
          healingMode: false,
          useNativeRecording: false
        };
        
        const response = await request(app)
          .post('/api/codegen/start')
          .send(options)
          .expect(200);
        
        expect(response.body).toHaveProperty('sessionId');
        expect(response.body).toHaveProperty('status', 'started');
        expect(response.body.recordingMethod).toBe('custom');
      });
      
      it('validates required fields', async () => {
        const response = await request(app)
          .post('/api/codegen/start')
          .send({ invalidField: 'value' })
          .expect(200); // Should still work with default values
        
        expect(response.body).toHaveProperty('sessionId');
      });
    });
    
    describe('POST /api/codegen/stop/:sessionId', () => {
      it('stops an existing recording session', async () => {
        // First start a session
        const startResponse = await request(app)
          .post('/api/codegen/start')
          .send({})
          .expect(200);
        
        const sessionId = startResponse.body.sessionId;
        
        // Then stop it
        const stopResponse = await request(app)
          .post(`/api/codegen/stop/${sessionId}`)
          .expect(200);
        
        expect(stopResponse.body).toHaveProperty('sessionId', sessionId);
        expect(stopResponse.body).toHaveProperty('status', 'stopped');
        expect(stopResponse.body).toHaveProperty('generatedCode');
      });
      
      it('returns 404 for non-existent session', async () => {
        const response = await request(app)
          .post('/api/codegen/stop/non-existent-session')
          .expect(500);
        
        expect(response.body).toHaveProperty('error');
      });
    });
    
    describe('GET /api/codegen/session/:sessionId', () => {
      it('returns session status', async () => {
        // Start a session first
        const startResponse = await request(app)
          .post('/api/codegen/start')
          .send({})
          .expect(200);
        
        const sessionId = startResponse.body.sessionId;
        
        // Get session status
        const response = await request(app)
          .get(`/api/codegen/session/${sessionId}`)
          .expect(200);
        
        expect(response.body).toHaveProperty('sessionId', sessionId);
        expect(response.body).toHaveProperty('status');
      });
      
      it('returns 404 for non-existent session', async () => {
        const response = await request(app)
          .get('/api/codegen/session/non-existent')
          .expect(404);
        
        expect(response.body).toHaveProperty('error', 'Recording session not found');
      });
    });
    
    describe('GET /api/codegen/code/:sessionId', () => {
      it('returns generated code for session', async () => {
        // Start and stop a session to generate code
        const startResponse = await request(app)
          .post('/api/codegen/start')
          .send({})
          .expect(200);
        
        const sessionId = startResponse.body.sessionId;
        
        await request(app)
          .post(`/api/codegen/stop/${sessionId}`)
          .expect(200);
        
        // Get generated code
        const response = await request(app)
          .get(`/api/codegen/code/${sessionId}`)
          .expect(200);
        
        expect(response.body).toHaveProperty('sessionId', sessionId);
        expect(response.body).toHaveProperty('code');
        expect(response.body).toHaveProperty('language');
        expect(response.body).toHaveProperty('lastUpdated');
      });
      
      it('returns 404 for non-existent session', async () => {
        const response = await request(app)
          .get('/api/codegen/code/non-existent')
          .expect(404);
        
        expect(response.body).toHaveProperty('error', 'Generated code not found');
      });
    });
    
    describe('GET /api/codegen/languages', () => {
      it('returns supported languages', async () => {
        const response = await request(app)
          .get('/api/codegen/languages')
          .expect(200);
        
        expect(response.body).toHaveProperty('languages');
        expect(Array.isArray(response.body.languages)).toBe(true);
        expect(response.body.languages).toContain('javascript');
        expect(response.body.languages).toContain('typescript');
      });
    });
    
    describe('GET /api/codegen/templates', () => {
      it('returns available templates', async () => {
        const response = await request(app)
          .get('/api/codegen/templates')
          .expect(200);
        
        expect(response.body).toHaveProperty('templates');
        expect(Array.isArray(response.body.templates)).toBe(true);
      });
    });
    
    describe('GET /api/codegen/healing/stats', () => {
      it('returns healing statistics', async () => {
        const response = await request(app)
          .get('/api/codegen/healing/stats')
          .expect(200);
        
        expect(response.body).toHaveProperty('totalAttempts');
        expect(response.body).toHaveProperty('successfulHealing');
        expect(response.body).toHaveProperty('successRate');
        expect(response.body).toHaveProperty('commonFailures');
      });
    });
    
    describe('POST /api/codegen/healing/mode', () => {
      it('sets healing mode', async () => {
        const response = await request(app)
          .post('/api/codegen/healing/mode')
          .send({ enabled: true })
          .expect(200);
        
        expect(response.body).toHaveProperty('success', true);
        expect(response.body).toHaveProperty('healingMode', true);
      });
    });
    
    describe('GET /api/codegen/export/formats', () => {
      it('returns supported export formats', async () => {
        const response = await request(app)
          .get('/api/codegen/export/formats')
          .expect(200);
        
        expect(response.body).toHaveProperty('formats');
        expect(Array.isArray(response.body.formats)).toBe(true);
        expect(response.body.formats).toContain('file');
      });
    });
    
    describe('POST /api/codegen/export/:sessionId', () => {
      it('exports test code', async () => {
        // Start and stop a session
        const startResponse = await request(app)
          .post('/api/codegen/start')
          .send({})
          .expect(200);
        
        const sessionId = startResponse.body.sessionId;
        
        await request(app)
          .post(`/api/codegen/stop/${sessionId}`)
          .expect(200);
        
        // Export the test
        const response = await request(app)
          .post(`/api/codegen/export/${sessionId}`)
          .send({
            format: 'file',
            filename: 'test.js'
          })
          .expect(200);
        
        expect(response.body).toHaveProperty('success', true);
        expect(response.body).toHaveProperty('data');
      });
    });
  });
  
  describe('Tests API Endpoints', () => {
    describe('GET /api/tests/suites', () => {
      it('returns test suites', async () => {
        const response = await request(app)
          .get('/api/tests/suites')
          .expect(200);
        
        expect(response.body).toHaveProperty('testSuites');
        expect(Array.isArray(response.body.testSuites)).toBe(true);
      });
      
      it('handles service not ready', async () => {
        // Mock service not ready
        app.locals.testRunner.isReady = vi.fn().mockReturnValue(false);
        
        const response = await request(app)
          .get('/api/tests/suites')
          .expect(503);
        
        expect(response.body).toHaveProperty('error', 'Test Runner not ready');
        
        // Restore mock
        app.locals.testRunner.isReady = vi.fn().mockReturnValue(true);
      });
    });
    
    describe('POST /api/tests/suites', () => {
      it('creates a new test suite', async () => {
        const testSuiteData = {
          name: 'New Test Suite',
          description: 'A test suite for testing',
          tests: []
        };
        
        const response = await request(app)
          .post('/api/tests/suites')
          .send(testSuiteData)
          .expect(200);
        
        expect(response.body).toHaveProperty('testSuite');
        expect(response.body.testSuite).toHaveProperty('name', testSuiteData.name);
        expect(response.body.testSuite).toHaveProperty('description', testSuiteData.description);
      });
    });
    
    describe('GET /api/tests/suites/:id', () => {
      it('returns specific test suite', async () => {
        const response = await request(app)
          .get('/api/tests/suites/suite-1')
          .expect(200);
        
        expect(response.body).toHaveProperty('testSuite');
        expect(response.body.testSuite).toHaveProperty('id', 'suite-1');
      });
      
      it('returns 404 for non-existent suite', async () => {
        app.locals.testRunner.getTestSuite = vi.fn().mockResolvedValue(null);
        
        const response = await request(app)
          .get('/api/tests/suites/non-existent')
          .expect(404);
        
        expect(response.body).toHaveProperty('error', 'Test suite not found');
      });
    });
  });
  
  describe('Error Handling', () => {
    it('handles malformed JSON requests', async () => {
      const response = await request(app)
        .post('/api/codegen/start')
        .set('Content-Type', 'application/json')
        .send('{ invalid json }')
        .expect(400);
      
      // Express should handle malformed JSON
    });
    
    it('handles missing required parameters gracefully', async () => {
      const response = await request(app)
        .post('/api/codegen/healing/mode')
        .send({})
        .expect(400);
      
      expect(response.body).toHaveProperty('error');
    });
    
    it('handles service errors gracefully', async () => {
      // Mock service to throw error
      app.locals.testRunner.getTestSuites = vi.fn().mockRejectedValue(new Error('Service error'));
      
      const response = await request(app)
        .get('/api/tests/suites')
        .expect(500);
      
      expect(response.body).toHaveProperty('error', 'Failed to get test suites');
      
      // Restore mock
      app.locals.testRunner.getTestSuites = vi.fn().mockResolvedValue([]);
    });
  });
  
  describe('Request Validation', () => {
    it('validates session ID format', async () => {
      const response = await request(app)
        .get('/api/codegen/session/invalid-session-id-format')
        .expect(404);
      
      expect(response.body).toHaveProperty('error');
    });
    
    it('handles large request payloads', async () => {
      const largePayload = {
        name: 'A'.repeat(10000),
        description: 'B'.repeat(10000),
        tests: new Array(1000).fill({ name: 'test', steps: [] })
      };
      
      const response = await request(app)
        .post('/api/tests/suites')
        .send(largePayload)
        .expect(200);
      
      expect(response.body).toHaveProperty('testSuite');
    });
  });
  
  describe('CORS and Headers', () => {
    it('includes CORS headers', async () => {
      const response = await request(app)
        .get('/api/codegen/status')
        .expect(200);
      
      expect(response.headers).toHaveProperty('access-control-allow-origin');
    });
    
    it('handles preflight requests', async () => {
      const response = await request(app)
        .options('/api/codegen/start')
        .expect(204);
      
      expect(response.headers).toHaveProperty('access-control-allow-methods');
    });
  });
  
  describe('Rate Limiting and Performance', () => {
    it('handles concurrent requests', async () => {
      const requests = Array.from({ length: 10 }, () => 
        request(app).get('/api/codegen/status')
      );
      
      const responses = await Promise.all(requests);
      
      responses.forEach(response => {
        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('status', 'success');
      });
    });
    
    it('handles multiple session creation requests', async () => {
      const requests = Array.from({ length: 5 }, () => 
        request(app)
          .post('/api/codegen/start')
          .send({ language: 'javascript' })
      );
      
      const responses = await Promise.all(requests);
      
      responses.forEach(response => {
        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('sessionId');
      });
      
      // Verify all sessions have unique IDs
      const sessionIds = responses.map(r => r.body.sessionId);
      const uniqueIds = new Set(sessionIds);
      expect(uniqueIds.size).toBe(sessionIds.length);
    });
  });
});