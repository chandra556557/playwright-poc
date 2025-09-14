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

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server });

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));

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
app.use('/api/codegen', codegenRoutes);

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

// Legacy routes (kept for backward compatibility)
// Get all test suites
app.get('/api/test-suites', async (req, res) => {
  try {
    const testSuites = await testRunner.getTestSuites();
    res.json(testSuites);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create new test suite
app.post('/api/test-suites', async (req, res) => {
  try {
    const { name, description, tests } = req.body;
    const testSuite = await testRunner.createTestSuite({
      id: uuidv4(),
      name,
      description,
      tests,
      createdAt: new Date().toISOString(),
      status: 'draft'
    });
    
    broadcast({ type: 'testSuiteCreated', data: testSuite });
    res.json(testSuite);
  } catch (error) {
    res.status(500).json({ error: error.message });
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

// Browser management
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
app.post('/api/discover-elements', async (req, res) => {
  try {
    const { url, browser = 'chromium', context = {} } = req.body;
    const elements = await playwrightService.discoverElements(url, browser, context);
    res.json(elements);
  } catch (error) {
    res.status(500).json({ error: error.message });
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

// Health check
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

server.listen(PORT, () => {
  console.log(`🚀 Playwright Wrapper Server running on port ${PORT}`);
  console.log(`📊 WebSocket server ready for real-time updates`);
  
  // Initialize services
  playwrightService.initialize();
  testRunner.initialize();
  healingEngine.initialize();
  
  // Pass services to routes for dependency injection
  app.locals.playwrightService = playwrightService;
  app.locals.testRunner = testRunner;
  app.locals.healingEngine = healingEngine;
  app.locals.broadcast = broadcast;
});

export { app, server, wss };