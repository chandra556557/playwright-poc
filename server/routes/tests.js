import express from 'express';
import { v4 as uuidv4 } from 'uuid';

const router = express.Router();

// Middleware to inject services from app.locals
router.use((req, res, next) => {
  req.testRunner = req.app.locals.testRunner;
  req.playwrightService = req.app.locals.playwrightService;
  req.broadcast = req.app.locals.broadcast;
  next();
});

// Get all test suites
router.get('/suites', async (req, res) => {
  try {
    if (!req.testRunner?.isReady()) {
      return res.status(503).json({ error: 'Test Runner not ready' });
    }

    const testSuites = await req.testRunner.getTestSuites();
    res.json({ testSuites });
  } catch (error) {
    console.error('Error getting test suites:', error);
    res.status(500).json({ error: 'Failed to get test suites' });
  }
});

// Create a new test suite
router.post('/suites', async (req, res) => {
  try {
    if (!req.testRunner?.isReady()) {
      return res.status(503).json({ error: 'Test Runner not ready' });
    }

    const testSuite = await req.testRunner.createTestSuite(req.body);
    res.json({ testSuite });
  } catch (error) {
    console.error('Error creating test suite:', error);
    res.status(500).json({ error: 'Failed to create test suite' });
  }
});

// Get a specific test suite
router.get('/suites/:id', async (req, res) => {
  try {
    if (!req.testRunner?.isReady()) {
      return res.status(503).json({ error: 'Test Runner not ready' });
    }

    const testSuite = await req.testRunner.getTestSuite(req.params.id);
    if (!testSuite) {
      return res.status(404).json({ error: 'Test suite not found' });
    }

    res.json({ testSuite });
  } catch (error) {
    console.error('Error getting test suite:', error);
    res.status(500).json({ error: 'Failed to get test suite' });
  }
});

// Update a test suite
router.put('/suites/:id', async (req, res) => {
  try {
    if (!req.testRunner?.isReady()) {
      return res.status(503).json({ error: 'Test Runner not ready' });
    }

    const testSuite = await req.testRunner.updateTestSuite(req.params.id, req.body);
    res.json({ testSuite });
  } catch (error) {
    console.error('Error updating test suite:', error);
    res.status(500).json({ error: 'Failed to update test suite' });
  }
});

// Delete a test suite
router.delete('/suites/:id', async (req, res) => {
  try {
    if (!req.testRunner?.isReady()) {
      return res.status(503).json({ error: 'Test Runner not ready' });
    }

    await req.testRunner.deleteTestSuite(req.params.id);
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting test suite:', error);
    res.status(500).json({ error: 'Failed to delete test suite' });
  }
});

// Run tests - Main execution endpoint
router.post('/run', async (req, res) => {
  try {
    if (!req.testRunner?.isReady() || !req.playwrightService?.isReady()) {
      return res.status(503).json({ error: 'Services not ready' });
    }
    


    const { testSuiteIds, options = {} } = req.body;
    
    if (!testSuiteIds || !Array.isArray(testSuiteIds) || testSuiteIds.length === 0) {
      return res.status(400).json({ error: 'testSuiteIds array is required' });
    }

    const executionId = uuidv4();
    const wsClients = req.app.get('wsClients') || new Set();

    // Progress callback for real-time updates
    const progressCallback = (progress) => {
      // Send progress to WebSocket clients
      wsClients.forEach(client => {
        if (client.readyState === 1) { // WebSocket.OPEN
          client.send(JSON.stringify({
            type: 'test-progress',
            data: progress
          }));
        }
      });
    };

    // Start test execution asynchronously
    setImmediate(async () => {
      try {
        for (const testSuiteId of testSuiteIds) {
          await req.testRunner.runTestSuite(testSuiteId, executionId, options, progressCallback);
        }
      } catch (error) {
        console.error('Test execution error:', error);
        progressCallback({
          executionId,
          status: 'error',
          message: `Test execution failed: ${error.message}`,
          error: error.message
        });
      }
    });

    res.json({ 
      executionId,
      status: 'started',
      message: 'Test execution started'
    });
  } catch (error) {
    console.error('Error starting test run:', error);
    res.status(500).json({ error: 'Failed to start test run' });
  }
});

// Get all executions
router.get('/executions', async (req, res) => {
  try {
    if (!req.testRunner?.isReady()) {
      return res.status(503).json({ error: 'Test Runner not ready' });
    }

    const executions = await req.testRunner.getExecutions();
    res.json({ executions });
  } catch (error) {
    console.error('Error getting executions:', error);
    res.status(500).json({ error: 'Failed to get executions' });
  }
});

// Get a specific execution
router.get('/executions/:id', async (req, res) => {
  try {
    if (!req.testRunner?.isReady()) {
      return res.status(503).json({ error: 'Test Runner not ready' });
    }

    const execution = await req.testRunner.getExecution(req.params.id);
    if (!execution) {
      return res.status(404).json({ error: 'Execution not found' });
    }

    res.json({ execution });
  } catch (error) {
    console.error('Error getting execution:', error);
    res.status(500).json({ error: 'Failed to get execution' });
  }
});

// Stop a running execution
router.post('/executions/:id/stop', async (req, res) => {
  try {
    if (!req.testRunner?.isReady()) {
      return res.status(503).json({ error: 'Test Runner not ready' });
    }

    await req.testRunner.stopExecution(req.params.id);
    res.json({ success: true });
  } catch (error) {
    console.error('Error stopping execution:', error);
    res.status(500).json({ error: 'Failed to stop execution' });
  }
});

// Get execution logs
router.get('/executions/:id/logs', async (req, res) => {
  try {
    if (!req.testRunner?.isReady()) {
      return res.status(503).json({ error: 'Test Runner not ready' });
    }

    const logs = await req.testRunner.getExecutionLogs(req.params.id);
    res.json({ logs });
  } catch (error) {
    console.error('Error getting execution logs:', error);
    res.status(500).json({ error: 'Failed to get execution logs' });
  }
});

// Run a single test with Playwright Service integration
router.post('/run-single', async (req, res) => {
  try {
    if (!req.playwrightService?.isReady()) {
      return res.status(503).json({ error: 'Playwright Service not ready' });
    }

    const { testCode, browser = 'chromium', options = {} } = req.body;
    
    if (!testCode) {
      return res.status(400).json({ error: 'testCode is required' });
    }

    const executionId = uuidv4();
    const wsClients = req.app.get('wsClients') || new Set();

    // Progress callback for real-time updates
    const progressCallback = (progress) => {
      wsClients.forEach(client => {
        if (client.readyState === 1) {
          client.send(JSON.stringify({
            type: 'test-progress',
            data: progress
          }));
        }
      });
    };

    // Execute single test with Playwright Service
    setImmediate(async () => {
      try {
        const result = await req.playwrightService.executeSingleTest({
          testCode,
          browser,
          options,
          executionId,
          progressCallback
        });
        
        progressCallback({
          executionId,
          status: result.success ? 'passed' : 'failed',
          message: 'Single test execution completed',
          result
        });
      } catch (error) {
        console.error('Single test execution error:', error);
        progressCallback({
          executionId,
          status: 'error',
          message: `Single test execution failed: ${error.message}`,
          error: error.message
        });
      }
    });

    res.json({ 
      executionId,
      status: 'started',
      message: 'Single test execution started'
    });
  } catch (error) {
    console.error('Error starting single test run:', error);
    res.status(500).json({ error: 'Failed to start single test run' });
  }
});

export default router;