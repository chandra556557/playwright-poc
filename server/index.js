import express from 'express';
import cors from 'cors';
import { WebSocketServer, WebSocket } from 'ws';
import http from 'http';
import path from 'path';
import { promises as fs } from 'fs';
import { v4 as uuidv4 } from 'uuid';
import { fileURLToPath } from 'url';
import PlaywrightService from './services/PlaywrightService.js';
import TestRunner from './services/TestRunner.js';
import HealingEngine from './services/HealingEngine.js';
import codegenRoutes, { setupCodegenWebSocket } from './routes/codegen.js';
import testsRoutes from './routes/tests.js';
import testRunnerConfigRoutes from './routes/testRunnerConfig.js';
import aiModelsRoutes from './routes/ai-models.js';
import allureRoutes from './routes/allure.js';
import pomRoutes from './routes/pom.js';
import { specs, swaggerUi } from './swagger.js';
import * as yup from 'yup';
import { initializeDatabase, getDb } from './services/database.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = http.createServer(app);
// Create WebSocket server for codegen
const wss = new WebSocketServer({ noServer: true });

// Handle WebSocket upgrade requests
server.on('upgrade', (request, socket, head) => {
  const pathname = new URL(request.url, `http://${request.headers.host}`).pathname;
  
  if (pathname === '/codegen') {
    wss.handleUpgrade(request, socket, head, (ws) => {
      setupCodegenWebSocket(ws, request);
    });
  } else {
    socket.destroy();
  }
});

// Save AI elements explicitly
app.post('/api/ai/elements/save', async (req, res) => {
  try {
    const { suiteId = null, url, elements } = req.body || {};
    if (!url || !Array.isArray(elements)) {
      return res.status(400).json({ error: 'url and elements[] are required' });
    }
    const db = getDb();
    const updatedAt = new Date().toISOString();
    for (const el of elements) {
      if (!el?.name) continue;
      const id = `${suiteId || 'global'}:${url}:${el.name}`;
      await db.run(
        `INSERT INTO ai_elements (id, suite_id, url, name, category, locator, selectors, aiSelectors, fallbackSelectors, aiConfidence, metadata, updatedAt)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(id) DO UPDATE SET
           locator = excluded.locator,
           selectors = excluded.selectors,
           aiSelectors = excluded.aiSelectors,
           fallbackSelectors = excluded.fallbackSelectors,
           aiConfidence = excluded.aiConfidence,
           metadata = excluded.metadata,
           updatedAt = excluded.updatedAt`,
        [
          id,
          suiteId,
          url,
          el.name,
          el.category || null,
          el.locator || '',
          JSON.stringify(el.selectors || []),
          JSON.stringify(el.aiSelectors || []),
          JSON.stringify(el.fallbackSelectors || []),
          typeof el.aiConfidence === 'number' ? el.aiConfidence : null,
          JSON.stringify(el.metadata || {}),
          updatedAt,
        ]
      );
    }
    res.json({ status: 'ok' });
  } catch (error) {
    console.error('Failed to save AI elements:', error);
    res.status(500).json({ error: 'Failed to save AI elements' });
  }
});

// Fetch AI elements for a URL (and optional suiteId)
app.get('/api/ai/elements', async (req, res) => {
  try {
    const { url, suiteId } = req.query;
    if (!url) return res.status(400).json({ error: 'url is required' });
    const db = getDb();
    let rows;
    if (suiteId) {
      rows = await db.all('SELECT * FROM ai_elements WHERE url = ? AND suite_id = ? ORDER BY updatedAt DESC', [url, suiteId]);
    } else {
      // Prefer suite-specific, else fall back to global
      rows = await db.all('SELECT * FROM ai_elements WHERE url = ? ORDER BY updatedAt DESC', [url]);
    }
    const elements = rows.map(r => ({
      id: r.id,
      name: r.name,
      category: r.category,
      locator: r.locator,
      selectors: JSON.parse(r.selectors || '[]'),
      aiSelectors: JSON.parse(r.aiSelectors || '[]'),
      fallbackSelectors: JSON.parse(r.fallbackSelectors || '[]'),
      aiConfidence: r.aiConfidence,
      metadata: JSON.parse(r.metadata || '{}'),
      updatedAt: r.updatedAt,
    }));
    res.json({ url, suiteId: suiteId || null, elements });
  } catch (error) {
    console.error('Failed to get AI elements:', error);
    res.status(500).json({ error: 'Failed to get AI elements' });
  }
});

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
// Serve Allure HTML reports (generated under process.cwd()/allure-report/<executionId>)
app.use('/allure-report', express.static(path.join(process.cwd(), 'allure-report')));

// Simple body validation middleware using yup
function validateBody(schema) {
  return async (req, res, next) => {
    try {
      // allow unknown fields but validate what we care about
      const validated = await schema.validate(req.body, { abortEarly: false, stripUnknown: false });
      req.validatedBody = validated;
      return next();
    } catch (err) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Request validation failed',
        details: err.errors || err.message,
        timestamp: new Date().toISOString()
      });
    }
  };
}

// Schemas
const discoverElementsSchema = yup.object({
  url: yup.string().url('url must be a valid URL').required('url is required'),
  browserName: yup.string().oneOf(['chromium', 'firefox', 'webkit']).default('chromium'),
  browser: yup.string().oneOf(['chromium', 'firefox', 'webkit']).notRequired(), // backward compat, will be normalized
  context: yup.object().notRequired(),
});

// Swagger Documentation
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(specs, {
  explorer: true,
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: 'Playwright Testing Suite API Documentation'
}));

// Services
const playwrightService = new PlaywrightService();
const testRunner = new TestRunner();
const healingEngine = new HealingEngine();

// WebSocket connections for real-time updates
const clients = new Map();

wss.on('connection', (ws, req) => {
  const url = req.url || '';
  
  if (url.startsWith('/codegen')) {
    // Handle codegen WebSocket connections
    setupCodegenWebSocket(ws, req);
  } else {
    // Handle general WebSocket connections
    const clientId = uuidv4();
    clients.set(clientId, ws);
    
    ws.on('close', () => {
      clients.delete(clientId);
    });
    
    ws.send(JSON.stringify({ type: 'connected', clientId }));
  }
});

// Broadcast to all connected clients
function broadcast(data) {
  clients.forEach((ws) => {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(data));
    }
  });
}

// API Routes (must come before static middleware)

// Routes
app.use('/api/codegen', (req, res, next) => {
  req.testRunner = testRunner;
  req.broadcast = broadcast;
  next();
}, codegenRoutes);

// Test routes
app.use('/api/tests', testsRoutes);

// Test runner configuration routes
app.use('/api/test-runner', (req, res, next) => {
  req.testRunner = testRunner;
  req.broadcast = broadcast;
  next();
}, testRunnerConfigRoutes);

// AI Models routes
app.use('/api/ai-models', aiModelsRoutes);

// Allure routes
app.use('/api/allure', allureRoutes);

// POM conversion routes
app.use('/api/pom', pomRoutes);

// Legacy routes (kept for backward compatibility)
/**
 * @swagger
 * /api/test-suites:
 *   get:
 *     summary: Get all test suites
 *     description: Retrieve all available test suites
 *     tags: [Test Suites]
 *     responses:
 *       200:
 *         description: List of test suites
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/TestSuite'
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
app.get('/api/test-suites', async (req, res) => {
  try {
    const db = getDb();
    const suites = await db.all('SELECT * FROM test_suites ORDER BY updatedAt DESC');

    for (const suite of suites) {
      suite.tags = JSON.parse(suite.tags || '[]');
      const testCases = await db.all('SELECT * FROM test_cases WHERE suite_id = ?', suite.id);
      suite.tests = testCases;

      for (const testCase of testCases) {
        const steps = await db.all('SELECT * FROM test_steps WHERE case_id = ?', testCase.id);
        testCase.steps = steps;
      }
    }

    res.json(suites);
  } catch (error) {
    console.error('Failed to get test suites:', error);
    res.status(500).json({ error: 'Failed to get test suites' });
  }
});

/**
 * @swagger
 * /api/test-suites:
 *   post:
 *     summary: Create a new test suite
 *     description: Create a new test suite with the provided configuration
 *     tags: [Test Suites]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *             properties:
 *               name:
 *                 type: string
 *                 description: Name of the test suite
 *                 example: "E-commerce Test Suite"
 *               description:
 *                 type: string
 *                 description: Description of the test suite
 *                 example: "Tests for e-commerce functionality"
 *               tests:
 *                 type: array
 *                 items:
 *                   $ref: '#/components/schemas/Test'
 *                 description: Array of test cases
 *     responses:
 *       200:
 *         description: Test suite created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/TestSuite'
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
app.post('/api/test-suites', async (req, res) => {
  try {
    const db = getDb();
    const testSuiteData = {
      id: req.body.id || uuidv4(),
      name: req.body.name,
      description: req.body.description,
      tags: JSON.stringify(req.body.tags),
      createdAt: req.body.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await db.run(
      `INSERT INTO test_suites (id, name, description, tags, createdAt, updatedAt) 
       VALUES (?, ?, ?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET
         name = excluded.name,
         description = excluded.description,
         tags = excluded.tags,
         updatedAt = excluded.updatedAt`,
      [
        testSuiteData.id,
        testSuiteData.name,
        testSuiteData.description,
        testSuiteData.tags,
        testSuiteData.createdAt,
        testSuiteData.updatedAt,
      ]
    );

    // Save test cases and steps
    if (req.body.tests) {
      for (const testCase of req.body.tests) {
        const caseId = testCase.id || uuidv4();
        await db.run(
          'INSERT OR REPLACE INTO test_cases (id, suite_id, name, url, browser) VALUES (?, ?, ?, ?, ?)',
          [caseId, testSuiteData.id, testCase.name, testCase.url, testCase.browser]
        );

        if (testCase.steps) {
          for (const step of testCase.steps) {
            await db.run(
              'INSERT OR REPLACE INTO test_steps (id, case_id, type, target, value, description) VALUES (?, ?, ?, ?, ?, ?)',
              [step.id || uuidv4(), caseId, step.type, step.target, step.value, step.description]
            );
          }
        }
      }
    }

    broadcast({ type: 'testSuiteCreated', data: testSuiteData });
    res.json(testSuiteData);
  } catch (error) {
    console.error('Failed to save test suite:', error);
    res.status(500).json({ error: 'Failed to save test suite' });
  }
});

// Run test suite
app.post('/api/test-suites/:id/run', async (req, res) => {
  try {
    const { id } = req.params;
    const { options = {} } = req.body;
    
    const executionId = uuidv4();
    
    // Start test execution in background
    testRunner.runTestSuite(id, executionId, options, (update) => {
      broadcast({ type: 'testExecution', data: update });
    });
    
    res.json({ executionId, status: 'started' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get all executions
app.get('/api/executions', async (req, res) => {
  try {
    const executions = await testRunner.getExecutionHistory();
    console.log('Executions found:', executions.length);
    res.json(executions);
  } catch (error) {
    console.error('Error getting executions:', error);
    res.status(500).json({ error: error.message });
  }
});

// Debug endpoint to check executions map
app.get('/api/debug/executions', async (req, res) => {
  try {
    const executionsMap = testRunner.executions;
    const executionsArray = Array.from(executionsMap.values());
    res.json({
      mapSize: executionsMap.size,
      executions: executionsArray
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get test execution results
app.get('/api/executions/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const execution = await testRunner.getExecution(id);
    if (!execution) {
      return res.status(404).json({ error: 'Execution not found' });
    }
    res.json(execution);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get healing suggestions
app.post('/api/healing/analyze', async (req, res) => {
  try {
    const { testFailures, pageContent } = req.body;
    const suggestions = await healingEngine.analyzeFailures(testFailures, pageContent);
    res.json(suggestions);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Apply healing suggestions
app.post('/api/healing/apply', async (req, res) => {
  try {
    const { testId, suggestions } = req.body;
    const result = await healingEngine.applySuggestions(testId, suggestions);
    
    broadcast({ type: 'healingApplied', data: { testId, result } });
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get healing analytics
app.get('/api/healing/analytics', async (req, res) => {
  try {
    const analytics = await healingEngine.getAnalytics();
    res.json(analytics);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * @swagger
 * /api/browsers:
 *   get:
 *     summary: Get available browsers
 *     description: Retrieve information about all available browser instances
 *     tags: [Browser Management]
 *     responses:
 *       200:
 *         description: List of available browsers
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/BrowserInfo'
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
app.get('/api/browsers', async (req, res) => {
  try {
    const browsers = await playwrightService.getAvailableBrowsers();
    res.json(browsers);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Page inspection
app.post('/api/inspect', async (req, res) => {
  try {
    const { url, browser = 'chromium' } = req.body;
    const inspection = await playwrightService.inspectPage(url, browser);
    res.json(inspection);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Element discovery
app.post('/api/discover-elements', validateBody(discoverElementsSchema), async (req, res) => {
  try {
    // Prefer browserName if provided, else fallback to browser for backward compat
    const body = req.validatedBody || req.body;
    const browserSel = body.browserName || body.browser || 'chromium';
    const { url, context = {} } = body;
    
    if (!url) {
      return res.status(400).json({ error: 'URL is required' });
    }
    
    if (!playwrightService.isReady()) {
      return res.status(503).json({ error: 'Playwright service is not ready. Please try again in a moment.' });
    }
    
    console.log(`🔍 Discovering elements for URL: ${url}`);
    const elements = await playwrightService.discoverElements(url, browserSel, context);

    // Optional auto-persist for self-healing if requested
    if (context.saveElements) {
      try {
        const db = getDb();
        const suiteId = context.suiteId || null;
        const updatedAt = new Date().toISOString();
        // elements is an object with categories -> array
        for (const [category, items] of Object.entries(elements)) {
          for (const el of items) {
            const id = `${suiteId || 'global'}:${url}:${el.name}`;
            await db.run(
              `INSERT INTO ai_elements (id, suite_id, url, name, category, locator, selectors, aiSelectors, fallbackSelectors, aiConfidence, metadata, updatedAt)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
               ON CONFLICT(id) DO UPDATE SET
                 locator = excluded.locator,
                 selectors = excluded.selectors,
                 aiSelectors = excluded.aiSelectors,
                 fallbackSelectors = excluded.fallbackSelectors,
                 aiConfidence = excluded.aiConfidence,
                 metadata = excluded.metadata,
                 updatedAt = excluded.updatedAt`,
              [
                id,
                suiteId,
                url,
                el.name,
                category,
                el.locator || '',
                JSON.stringify(el.selectors || []),
                JSON.stringify(el.aiSelectors || []),
                JSON.stringify(el.fallbackSelectors || []),
                typeof el.aiConfidence === 'number' ? el.aiConfidence : null,
                JSON.stringify({ description: el.description, position: el.position, priority: el.priority }),
                updatedAt,
              ]
            );
          }
        }
      } catch (persistErr) {
        console.warn('Failed to auto-save AI elements:', persistErr.message);
      }
    }
    
    // Format response to match frontend expectations
    const response = {
      elements: elements,
      summary: {
        totalElements: Object.values(elements).flat().length,
        categories: Object.keys(elements).map(key => ({
          name: key,
          count: elements[key].length
        }))
      },
      timestamp: new Date().toISOString()
    };
    
    res.json(response);
  } catch (error) {
    console.error('❌ Element discovery failed:', error);
    res.status(500).json({ 
      error: error.message,
      details: 'Failed to discover elements on the page. Please check the URL and try again.'
    });
  }
});

// Dashboard statistics
app.get('/api/dashboard/stats', async (req, res) => {
  try {
    const executions = await testRunner.getExecutionHistory();
    const healingAnalytics = await healingEngine.getAnalytics();
    
    // Calculate statistics from real data
    const totalTestSuites = await testRunner.getTestSuites().then(suites => suites.length).catch(() => 0);
    const totalExecutions = executions.length;
    const passedExecutions = executions.filter(e => e.status === 'passed').length;
    const failedExecutions = executions.filter(e => e.status === 'failed').length;
    const passRate = totalExecutions > 0 ? Math.round((passedExecutions / totalExecutions) * 100) : 0;
    
    // Recent executions (last 24 hours)
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const recentExecutions = executions.filter(e => new Date(e.startTime) > oneDayAgo);
    const activeExecutions = executions.filter(e => e.status === 'running').length;
    
    // Healing statistics
    const totalHealingActions = healingAnalytics.totalAttempts || 0;
    const successfulHealings = healingAnalytics.successfulHealings || 0;
    const failedHealings = healingAnalytics.failedHealings || 0;
    const healingSuccessRate = totalHealingActions > 0 ? Math.round((successfulHealings / totalHealingActions) * 100) : 0;
    
    // Test distribution by status
    const testDistribution = [
      { name: 'Passed', value: passedExecutions, color: '#10B981' },
      { name: 'Failed', value: failedExecutions, color: '#EF4444' },
      { name: 'Running', value: activeExecutions, color: '#F59E0B' }
    ];
    
    // Healing trends (last 7 days)
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const recentHealingData = executions
      .filter(e => new Date(e.startTime) > sevenDaysAgo)
      .reduce((acc, execution) => {
        const date = new Date(execution.startTime).toISOString().split('T')[0];
        if (!acc[date]) acc[date] = { date, attempts: 0, successful: 0 };
        if (execution.summary?.healing) {
          acc[date].attempts += execution.summary.healing.attempts || 0;
          acc[date].successful += execution.summary.healing.successful || 0;
        }
        return acc;
      }, {});
    
    const healingTrends = Object.values(recentHealingData).sort((a, b) => a.date.localeCompare(b.date));
    
    // System health
    const systemHealth = {
      cpu: Math.floor(Math.random() * 30) + 20, // Mock for now
      memory: Math.floor(Math.random() * 40) + 30,
      disk: Math.floor(Math.random() * 20) + 15,
      network: activeExecutions > 0 ? 'Active' : 'Idle'
    };
    
    res.json({
      stats: {
        totalTestSuites,
        passRate,
        activeExecutions,
        totalHealingActions
      },
      testDistribution,
      healingTrends,
      recentExecutions: recentExecutions.slice(0, 5).map(e => ({
        id: e.id,
        name: e.testSuite?.name || 'Unknown Test',
        status: e.status,
        duration: e.duration || 0,
        timestamp: e.startTime
      })),
      systemHealth,
      healingStats: {
        totalAttempts: totalHealingActions,
        successfulHealings,
        failedHealings,
        successRate: healingSuccessRate
      }
    });
  } catch (error) {
    console.error('Error getting dashboard stats:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * @swagger
 * /api/health:
 *   get:
 *     summary: Health check endpoint
 *     description: Returns the health status of all services
 *     tags: [Health & Monitoring]
 *     responses:
 *       200:
 *         description: System is healthy
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: healthy
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *                 services:
 *                   type: object
 *                   properties:
 *                     playwright:
 *                       type: boolean
 *                     testRunner:
 *                       type: boolean
 *                     healingEngine:
 *                       type: boolean
 *                     codegen:
 *                       type: boolean
 */
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    services: {
      playwright: playwrightService.isReady(),
      testRunner: testRunner.isReady(),
      healingEngine: healingEngine.isReady(),
      codegen: true
    }
  });
});

const PORT = process.env.PORT || 3001;

// Static files (must come after API routes)
app.use(express.static(path.join(__dirname, '../dist')));

// Serve React app for all other routes (must be last)
app.use((req, res, next) => {
  if (!req.path.startsWith('/api')) {
    res.sendFile(path.join(__dirname, '../dist/index.html'));
  } else {
    next();
  }
});

server.listen(PORT, async () => {
  console.log(`🚀 Playwright Wrapper Server running on port ${PORT}`);
  console.log(`📊 WebSocket server ready for real-time updates`);
  
  // Initialize services
  try {
    await playwrightService.initialize();
    await testRunner.initialize();
    await healingEngine.initialize();
    await initializeDatabase();
    console.log('✅ All services initialized successfully');
  } catch (error) {
    console.error('❌ Failed to initialize services:', error);
  }
  
  // Pass services to routes for dependency injection
  app.locals.playwrightService = playwrightService;
  app.locals.testRunner = testRunner;
  app.locals.healingEngine = healingEngine;
  app.locals.broadcast = broadcast;
});

export { app, server, wss };