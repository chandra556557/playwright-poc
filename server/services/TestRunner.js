import * as fs from 'fs';
import { promises as fsp } from 'fs';
import path from 'path';
import { spawn } from 'child_process';
import { v4 as uuidv4 } from 'uuid';
import { getDb } from './database.js';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class TestRunner {
  constructor() {
    this.testSuites = new Map();
    this.executions = new Map();
    this.ready = false;
    this.dataDir = path.join(__dirname, '../data');
  }

  async initialize() {
    try {
      console.log('🧪 Initializing Test Runner...');
      
      // Ensure data directory exists
      await fsp.mkdir(this.dataDir, { recursive: true });
      await fsp.mkdir(path.join(this.dataDir, 'test-suites'), { recursive: true });
      await fsp.mkdir(path.join(this.dataDir, 'executions'), { recursive: true });
      
      // Load existing test suites
      await this.loadTestSuites();
      
      
      this.ready = true;
      console.log('✅ Test Runner ready');
    } catch (error) {
      console.error('❌ Failed to initialize Test Runner:', error);
      this.ready = false;
    }
  }

  isReady() {
    return this.ready;
  }

  async loadTestSuites() {
    try {
      const testSuitesDir = path.join(this.dataDir, 'test-suites');
      const files = await fs.readdir(testSuitesDir);
      
      for (const file of files) {
        if (file.endsWith('.json')) {
          const content = await fs.readFile(path.join(testSuitesDir, file), 'utf8');
          const testSuite = JSON.parse(content);
          this.testSuites.set(testSuite.id, testSuite);
        }
      }
      
      console.log(`📚 Loaded ${this.testSuites.size} test suites`);
    } catch (error) {
      console.log('📚 No existing test suites found, starting fresh');
    }
  }


  async getTestSuites() {
    const suites = Array.from(this.testSuites.values());
    const results = [];
    for (const suite of suites) {
      let last = null;
      try {
        last = await this.getLastExecution(suite.id);
      } catch {}
      results.push({
        ...suite,
        testCount: suite.tests?.length || 0,
        lastRun: last?.startTime || null
      });
    }
    return results;
  }

  async createTestSuite(testSuiteData) {
    const testSuite = {
      ...testSuiteData,
      id: testSuiteData.id || uuidv4(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      version: 1
    };

    this.testSuites.set(testSuite.id, testSuite);
    
    // Save to file
    await this.saveTestSuite(testSuite);
    
    return testSuite;
  }

  async updateTestSuite(id, updates) {
    const testSuite = this.testSuites.get(id);
    if (!testSuite) {
      throw new Error(`Test suite ${id} not found`);
    }

    const updatedSuite = {
      ...testSuite,
      ...updates,
      id, // Ensure ID doesn't change
      updatedAt: new Date().toISOString(),
      version: (testSuite.version || 1) + 1
    };

    this.testSuites.set(id, updatedSuite);
    await this.saveTestSuite(updatedSuite);
    
    return updatedSuite;
  }

  async saveTestSuite(testSuite) {
    const filePath = path.join(this.dataDir, 'test-suites', `${testSuite.id}.json`);
    await fs.writeFile(filePath, JSON.stringify(testSuite, null, 2));
  }

  async runTestSuite(testSuiteId, executionId, options = {}, progressCallback) {
    const testSuite = this.testSuites.get(testSuiteId);
    if (!testSuite) {
      throw new Error(`Test suite ${testSuiteId} not found`);
    }

    const execution = {
      id: executionId,
      testSuiteId,
      startTime: new Date().toISOString(),
      status: 'running',
      options,
      results: [],
      summary: {
        total: testSuite.tests?.length || 0,
        passed: 0,
        failed: 0,
        skipped: 0,
        healing: 0
      },
      healingActions: [],
      screenshots: [],
      logs: []
    };

    this.executions.set(executionId, execution);
  // Persist initial execution row (running)
  try { await this.saveExecution(execution); } catch (_) {}

    try {
      // Update status
      progressCallback?.({
        executionId,
        status: 'running',
        message: 'Starting test execution...',
        progress: 0
      });

      // Generate Playwright test file
      const testFilePath = await this.generatePlaywrightTest(testSuite, execution);
      
      // Run the test
      await this.executePlaywrightTest(testFilePath, execution, progressCallback);
      
      // Finalize execution
      execution.endTime = new Date().toISOString();
      execution.duration = new Date(execution.endTime) - new Date(execution.startTime);
      execution.status = execution.summary.failed > 0 ? 'failed' : 'passed';
      
      // Update test suite status based on execution results
      const updatedStatus = execution.summary.failed > 0 ? 'failed' : 'passed';
      await this.updateTestSuite(testSuiteId, {
        status: updatedStatus,
        lastRun: execution.endTime,
        passRate: execution.summary.total > 0 ? 
          Math.round((execution.summary.passed / execution.summary.total) * 100) : 0
      });
      
      await this.saveExecution(execution);
      
      progressCallback?.({
        executionId,
        status: execution.status,
        message: 'Test execution completed',
        progress: 100,
        summary: execution.summary
      });

    } catch (error) {
      execution.status = 'error';
      execution.error = error.message;
      execution.endTime = new Date().toISOString();
      
      // Update test suite status to failed when execution errors
      await this.updateTestSuite(testSuiteId, {
        status: 'failed',
        lastRun: execution.endTime,
        passRate: 0
      });
      
      await this.saveExecution(execution);
      
      progressCallback?.({
        executionId,
        status: 'error',
        message: `Test execution failed: ${error.message}`,
        error: error.message
      });
    }

    return execution;
  }

  async generatePlaywrightTest(testSuite, execution) {
    const testContent = this.generateTestContent(testSuite, execution);
    const testFilePath = path.join(this.dataDir, 'executions', `${execution.id}.spec.js`);
    
    await fs.writeFile(testFilePath, testContent);
    return testFilePath;
  }

  // Execute raw Playwright code provided by the client (ad-hoc run)
  async runAdhocCode(code, options = {}, progressCallback) {
    // Use the provided progressCallback or fall back to options.progressCallback
    progressCallback = progressCallback || (options && options.progressCallback);
    const { progressCallback: _, ...otherOptions } = options || {};
    const executionId = uuidv4();
    const execution = {
      id: executionId,
      testSuiteId: null,
      startTime: new Date().toISOString(),
      status: 'running',
      options,
      results: [],
      summary: { total: 1, passed: 0, failed: 0, skipped: 0, healing: 0 },
      healingActions: [],
      screenshots: [],
      logs: []
    };
    this.executions.set(executionId, execution);
    
    // Ensure required directories exist
    await fs.mkdir(path.join(this.dataDir, 'executions'), { recursive: true });
    
    try { 
      await this.saveExecution(execution); 
    } catch (error) {
      console.error('Error saving execution:', error);
      throw error;
    }

    // Write the incoming code to a temp spec file
    const executionsDir = path.join(this.dataDir, 'executions');
    await fs.mkdir(executionsDir, { recursive: true });
    const specPath = path.join(executionsDir, `${executionId}.spec.js`);
    await fs.writeFile(specPath, code);

    try {
      // Ensure progressCallback is a function
      const safeProgressCallback = (update) => {
        if (typeof progressCallback === 'function') {
          try {
            progressCallback(update);
          } catch (e) {
            console.error('Error in progress callback:', e);
          }
        }
      };

      safeProgressCallback({ executionId, status: 'running', message: 'Starting ad-hoc test...', progress: 0 });

      // Pass the safe callback to executePlaywrightTest
      await this.executePlaywrightTest(specPath, execution, safeProgressCallback);

      execution.endTime = new Date().toISOString();
      execution.duration = new Date(execution.endTime) - new Date(execution.startTime);
      execution.status = execution.summary.failed > 0 ? 'failed' : 'passed';
      await this.saveExecution(execution);

      safeProgressCallback({ 
        executionId, 
        status: execution.status, 
        message: 'Ad-hoc test completed', 
        progress: 100, 
        summary: execution.summary 
      });
    } catch (error) {
      execution.status = 'error';
      execution.error = error.message;
      execution.endTime = new Date().toISOString();
      await this.saveExecution(execution);

      progressCallback?.({ executionId, status: 'error', message: `Ad-hoc test failed: ${error.message}`, error: error.message });
      throw error;
    }

    return executionId;
  }

  generateTestContent(testSuite, execution) {
    const { tests } = testSuite;
    
    let testContent = `
const { test, expect, Page, BrowserContext } = require('@playwright/test');
const fs = require('fs');
const path = require('path');
const axios = require('axios');

// Suite context for selector vault operations
const SUITE_URL = '${tests?.[0]?.url || ''}';
const SUITE_ID = '${testSuite.id || ''}';

// Self-healing utilities
class SelfHealingPage {
  constructor(page) {
    this.page = page;
    this.healingActions = [];
    this.persisted = {};
  }

  async loadPersisted(url, suiteId) {
    try {
      const params = new URLSearchParams({ url });
      if (suiteId) params.append('suiteId', suiteId);
      const { data } = await axios.get('http://localhost:3001/api/ai/elements?' + params.toString());
      const map = {};
      (data.elements || []).forEach(el => { map[el.name] = el; });
      this.persisted = map;
    } catch (e) {
      this.persisted = {};
    }
  }

  buildCandidates(strategyName, strategies) {
    const persisted = this.persisted[strategyName];
    const ordered = [];
    if (persisted) {
      ordered.push(
        persisted.locator,
        ...(persisted.aiSelectors || []),
        ...(persisted.selectors || []),
        ...(persisted.fallbackSelectors || [])
      );
    }
    // Also include incoming strategy.locator(s)
    (strategies || []).forEach(s => { if (s.locator) ordered.push(s.locator); });
    // Deduplicate
    const seen = new Set();
    return ordered.filter(s => s && !seen.has(s) && seen.add(s));
  }

  async persistWorkingSelector(strategyName, workingLocator, url, suiteId) {
    try {
      if (!strategyName || !workingLocator || !url) return;
      const existing = this.persisted[strategyName] || {};
      // Build selectors with the working one first
      const mergedSelectors = [
        workingLocator,
        existing.locator,
        ...(existing.aiSelectors || []),
        ...(existing.selectors || []),
        ...(existing.fallbackSelectors || [])
      ].filter(Boolean);
      const seen = new Set();
      const unique = mergedSelectors.filter(s => !seen.has(s) && seen.add(s));
      const body = {
        suiteId: suiteId || null,
        url,
        elements: [
          {
            name: strategyName,
            locator: workingLocator,
            selectors: unique,
            aiSelectors: existing.aiSelectors || [],
            fallbackSelectors: existing.fallbackSelectors || [],
            metadata: existing.metadata || {}
          }
        ]
      };
      await axios.post('http://localhost:3001/api/ai/elements/save', body, { timeout: 5000 });
      // Update local cache so subsequent steps benefit immediately
      this.persisted[strategyName] = Object.assign({}, existing, { locator: workingLocator, selectors: unique });
    } catch (e) {
      // Non-fatal: log and continue
      console.log('ℹ️ Persist selector failed: ' + (e && e.message ? e.message : String(e)));
    }
  }

  async intelligentClick(strategies, options = {}) {
    const maxRetries = options.maxRetries || 3;
    const timeout = options.timeout || 10000;
    const strategyName = (strategies && strategies[0] && strategies[0].name) || undefined;
    const candidates = this.buildCandidates(strategyName, strategies);
    
    for (let retry = 0; retry <= maxRetries; retry++) {
      for (const cand of candidates) {
        try {
          console.log('🎯 Attempting locator: ' + cand);
          const locator = this.page.locator(cand);

          await locator.waitFor({ timeout: 5000 });
          await locator.click(options);
          
          // Record successful strategy
          this.healingActions.push({
            type: 'click',
            strategy: strategyName || 'inline',
            success: true,
            timestamp: new Date().toISOString()
          });
          
          // Persist the working selector for future runs
          try {
            await this.persistWorkingSelector(strategyName, cand, SUITE_URL, SUITE_ID);
          } catch (e) {}
          return { success: true, usedStrategy: strategy };
        } catch (error) {
          console.log('❌ locator failed: ' + error.message);
          this.healingActions.push({
            type: 'click',
            strategy: strategyName || 'inline',
            success: false,
            error: error.message,
            timestamp: new Date().toISOString()
          });
        }
      }
      
      if (retry < maxRetries) {
        console.log('🔄 Retry attempt ' + (retry + 1) + '/' + maxRetries);
        await this.page.waitForTimeout(1000);
      }
    }
    
    return { success: false };
  }

  async intelligentFill(strategies, value, options = {}) {
    const strategyName = (strategies && strategies[0] && strategies[0].name) || undefined;
    const candidates = this.buildCandidates(strategyName, strategies);
    for (const cand of candidates) {
      try {
        console.log('📝 Trying fill locator: ' + cand);
        const locator = this.page.locator(cand);

        await locator.waitFor({ timeout: 5000 });
        await locator.clear();
        await locator.fill(value);
        
        // Verify the fill worked
        const actualValue = await locator.inputValue();
        if (actualValue === value) {
          this.healingActions.push({
            type: 'fill',
            strategy: strategyName || 'inline',
            success: true,
            value,
            timestamp: new Date().toISOString()
          });
          try {
            await this.persistWorkingSelector(strategyName, cand, SUITE_URL, SUITE_ID);
          } catch (e) {}
          return { success: true, usedStrategy: strategy };
        }
      } catch (error) {
        console.log('❌ Fill locator failed: ' + error.message);
        this.healingActions.push({
          type: 'fill',
          strategy: strategyName || 'inline',
          success: false,
          error: error.message,
          timestamp: new Date().toISOString()
        });
      }
    }
    
    return { success: false };
  }

  getHealingActions() {
    return this.healingActions;
  }
}

test.describe('${testSuite.name}', () => {
  let healingPage;

  test.beforeEach(async ({ page }) => {
    healingPage = new SelfHealingPage(page);
    try {
      await healingPage.loadPersisted('${testSuite.tests?.[0]?.url || ''}', '${testSuite.id || ''}');
    } catch {}
  });

`;

    // Generate individual tests
    tests?.forEach((testCase, index) => {
      testContent += this.generateTestCase(testCase, index);
    });

    testContent += `
  test.afterEach(async ({ page }, testInfo) => {
    // Save healing actions and screenshots
    const healingActions = healingPage.getHealingActions();
    const executionData = {
      testName: testInfo.title,
      status: testInfo.status,
      healingActions,
      duration: testInfo.duration,
      timestamp: new Date().toISOString()
    };

    // Save execution data
    const dataPath = path.join(__dirname, '${execution.id}-results.json');
    let results = [];
    try {
      const existing = fs.readFileSync(dataPath, 'utf8');
      results = JSON.parse(existing);
    } catch (e) {
      // File doesn't exist yet
    }
    
    results.push(executionData);
    fs.writeFileSync(dataPath, JSON.stringify(results, null, 2));

    // Take screenshot on failure
    if (testInfo.status === 'failed') {
      await page.screenshot({ 
        path: path.join(__dirname, \`\${testInfo.title.replace(/[^a-zA-Z0-9]/g, '-')}-failure.png\`),
        fullPage: true 
      });
    }
  });
});
`;

    return testContent;
  }

  generateTestCase(testCase, index) {
    const { name, steps, url, browser = 'chromium' } = testCase;
    
    let testContent = `
  test('${name}', async ({ page }) => {
    console.log('🧪 Starting test: ${name}');
    
    // Navigate to the page
    await page.goto('${url}', { waitUntil: 'networkidle' });
    
`;

    // Generate steps
    steps?.forEach((step, stepIndex) => {
      testContent += this.generateTestStep(step, stepIndex);
    });

    testContent += `
    console.log('✅ Test completed: ${name}');
  });
`;

    return testContent;
  }

  generateTestStep(step, stepIndex) {
    const { type, target, value, strategies = [] } = step;
    
    switch (type) {
      case 'click':
        return `
    // Step ${stepIndex + 1}: Click ${target}
    const clickResult${stepIndex} = await healingPage.intelligentClick([
      ${strategies.map(s => `{
        name: '${s.name}',
        locator: '${s.locator}',
        description: '${s.description}',
        priority: ${s.priority || 5}
      }`).join(',\n      ')}
    ], { timeout: 10000 });
    
    expect(clickResult${stepIndex}.success).toBe(true);
`;

      case 'fill':
        return `
    // Step ${stepIndex + 1}: Fill ${target} with "${value}"
    const fillResult${stepIndex} = await healingPage.intelligentFill([
      ${strategies.map(s => `{
        name: '${s.name}',
        locator: '${s.locator}',
        description: '${s.description}',
        priority: ${s.priority || 5}
      }`).join(',\n      ')}
    ], '${value}');
    
    expect(fillResult${stepIndex}.success).toBe(true);
`;

      case 'wait':
        return `
    // Step ${stepIndex + 1}: Wait for ${target}
    await page.waitForSelector('${target}', { timeout: ${value || 10000} });
`;

      case 'assert':
        return `
    // Step ${stepIndex + 1}: Assert ${target}
    await expect(page.locator('${target}')).${value || 'toBeVisible()'};
`;

      default:
        return `
    // Step ${stepIndex + 1}: ${type} - ${target}
    console.log('⚠️ Unknown step type: ${type}');
`;
    }
  }

  async executePlaywrightTest(testFilePath, execution, progressCallback) {
    return new Promise((resolve, reject) => {
      // Verify test file exists using fs.existsSync
      if (!fs.existsSync(testFilePath)) {
        const errorMsg = `Test file not found: ${testFilePath}`;
        console.error(errorMsg);
        return reject(new Error(errorMsg));
      }

      // Verify Playwright is installed
      try {
        require.resolve('@playwright/test');
      } catch (e) {
        const error = new Error('Playwright is not installed. Please run: npm install @playwright/test');
        console.error(error.message);
        return reject(error);
      }

      const args = [
        'playwright',
        'test',
        testFilePath,
        '--reporter=json,allure-playwright',
        '--timeout=30000'  // Add a timeout to prevent hanging
      ];

      console.log(`Executing: npx ${args.join(' ')}`);
      
      const playwrightProcess = spawn('npx', args, {
        cwd: process.cwd(),
        stdio: ['pipe', 'pipe', 'pipe'],
        shell: true  // Use shell for better Windows compatibility
      });

      let stdout = '';
      let stderr = '';
      let hasError = false;

      const updateProgress = (message, isError = false) => {
        if (isError) hasError = true;
        if (typeof progressCallback === 'function') {
          try {
            progressCallback({
              executionId: execution.id,
              status: isError ? 'error' : 'running',
              message: message ? String(message).trim() : '',
              progress: isError ? 100 : Math.min(90, (execution.results.length / (execution.summary.total || 1)) * 100)
            });
          } catch (e) {
            console.error('Error in progress callback:', e);
          }
        }
      };

      playwrightProcess.stdout.on('data', (data) => {
        const output = data.toString();
        console.log(`[Playwright] ${output}`);
        stdout += output;
        
        // Parse progress if possible
        try {
          const lines = output.split('\n');
          lines.forEach(line => {
            if (line.includes('Running') || line.includes('✅') || line.includes('❌')) {
              updateProgress(line);
            }
          });
        } catch (e) {
          console.error('Error parsing progress:', e);
        }
      });

      playwrightProcess.stderr.on('data', (data) => {
        const errorOutput = data.toString();
        console.error(`[Playwright Error] ${errorOutput}`);
        stderr += errorOutput;
        updateProgress(`Error: ${errorOutput}`, true);
      });

      playwrightProcess.on('close', async (code) => {
        try {
          // Parse results
          await this.parseTestResults(execution, stdout, stderr);
          
          // Load additional results from generated files
          await this.loadExecutionResults(execution);
          
          // Generate Allure report after test execution
          await this.generateAllureReport(execution.id);
          // Attach report URL for UI consumption
          execution.reportUrl = `/allure-report/${execution.id}/index.html`;
          
          resolve();
        } catch (error) {
          reject(error);
        }
      });

      playwrightProcess.on('error', (error) => {
        reject(error);
      });
    });
  }

  async parseTestResults(execution, stdout, stderr) {
    try {
      // Try to parse JSON output
      const jsonMatch = stdout.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const results = JSON.parse(jsonMatch[0]);
        
        if (results.suites) {
          results.suites.forEach(suite => {
            suite.specs?.forEach(spec => {
              spec.tests?.forEach(test => {
                const result = {
                  name: test.title,
                  status: test.outcome,
                  duration: test.results?.[0]?.duration || 0,
                  error: test.results?.[0]?.error?.message || null,
                  steps: test.results?.[0]?.steps || []
                };

                execution.results.push(result);
                
                // Update summary
                switch (result.status) {
                  case 'passed':
                    execution.summary.passed++;
                    break;
                  case 'failed':
                    execution.summary.failed++;
                    break;
                  case 'skipped':
                    execution.summary.skipped++;
                    break;
                }
              });
            });
          });
        }
      }
    } catch (error) {
      console.log('⚠️ Could not parse JSON results, using fallback parsing');
      
      // Fallback: parse text output
      const lines = stdout.split('\n');
      lines.forEach(line => {
        if (line.includes('✅') || line.includes('❌')) {
          const isPass = line.includes('✅');
          execution.summary[isPass ? 'passed' : 'failed']++;
        }
      });
    }

    // Add logs
    execution.logs.push({
      type: 'stdout',
      content: stdout,
      timestamp: new Date().toISOString()
    });

    if (stderr) {
      execution.logs.push({
        type: 'stderr',
        content: stderr,
        timestamp: new Date().toISOString()
      });
    }
  }

  async loadExecutionResults(execution) {
    try {
      const resultsPath = path.join(this.dataDir, 'executions', `${execution.id}-results.json`);
      const content = await fs.readFile(resultsPath, 'utf8');
      const additionalResults = JSON.parse(content);
      
      // Merge healing actions
      additionalResults.forEach(result => {
        if (result.healingActions) {
          execution.healingActions.push(...result.healingActions);
        }
      });
      
      // Count healing actions
      execution.summary.healing = execution.healingActions.filter(action => action.success).length;
      
    } catch (error) {
      console.log('ℹ️ No additional results file found');
    }
  }

  async getExecution(executionId) {
    try {
      const db = getDb();
      const execution = await db.get('SELECT * FROM executions WHERE id = ?', executionId);
      if (execution) {
        return {
          ...execution,
          options: JSON.parse(execution.options || '{}'),
          summary: JSON.parse(execution.summary || '{}')
        };
      }
      return null;
    } catch (error) {
      console.error('Error fetching execution from database:', error);
      // Fallback to in-memory execution
      const execution = this.executions.get(executionId);
      if (execution) {
        return {
          ...execution,
          options: execution.options || {},
          summary: execution.summary || {}
        };
      }
      return null;
    }
  }

  async getLastExecution(testSuiteId) {
    try {
      const db = getDb();
      const execution = await db.get('SELECT * FROM executions WHERE suite_id = ? ORDER BY startTime DESC LIMIT 1', testSuiteId);
      if (execution) {
        return {
          ...execution,
          options: JSON.parse(execution.options || '{}'),
          summary: JSON.parse(execution.summary || '{}')
        };
      }
      return null;
    } catch (error) {
      console.error('Error fetching last execution:', error);
      return null;
    }
  }

  async getTestSuite(testSuiteId) {
    return this.testSuites.get(testSuiteId);
  }

  async updateTestSuite(testSuiteId, updates) {
    const testSuite = this.testSuites.get(testSuiteId);
    if (!testSuite) {
      throw new Error(`Test suite ${testSuiteId} not found`);
    }

    const updatedTestSuite = {
      ...testSuite,
      ...updates,
      id: testSuiteId, // Ensure ID doesn't change
      updatedAt: new Date().toISOString(),
      version: (testSuite.version || 1) + 1
    };

    this.testSuites.set(testSuiteId, updatedTestSuite);
    await this.saveTestSuite(updatedTestSuite);
    return updatedTestSuite;
  }

  async deleteTestSuite(testSuiteId) {
    const testSuite = this.testSuites.get(testSuiteId);
    if (!testSuite) {
      throw new Error(`Test suite ${testSuiteId} not found`);
    }

    this.testSuites.delete(testSuiteId);
    
    // Delete the file
    try {
      const filePath = path.join(this.dataDir, 'test-suites', `${testSuiteId}.json`);
      await fs.unlink(filePath);
    } catch (error) {
      console.warn(`Failed to delete test suite file: ${error.message}`);
    }

    return true;
  }

  async getExecutions() {
    try {
      const db = getDb();
      const rows = await db.all('SELECT * FROM executions ORDER BY startTime DESC');
      return rows.map(row => ({
        ...row,
        summary: JSON.parse(row.summary || '{}'),
        options: JSON.parse(row.options || '{}')
      }));
    } catch (error) {
      console.error('Error fetching executions:', error);
      // Return in-memory executions as fallback
      return Array.from(this.executions.values()).map(execution => ({
        ...execution,
        summary: execution.summary || {},
        options: execution.options || {}
      }));
    }
  }

  // Persist or update an execution row
  async saveExecution(execution) {
    try {
      const db = getDb();
      const summaryJson = JSON.stringify(execution.summary || {});

      await db.run(
        `INSERT INTO executions (id, suite_id, status, startTime, endTime, duration, summary, reportUrl)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(id) DO UPDATE SET
           status = excluded.status,
           endTime = excluded.endTime,
           duration = excluded.duration,
           summary = excluded.summary,
           reportUrl = excluded.reportUrl`,
        [
          execution.id,
          execution.testSuiteId || null,
          execution.status,
          execution.startTime,
          execution.endTime || null,
          execution.duration || null,
          summaryJson,
          execution.reportUrl || null,
        ]
      );
      return;
    } catch (error) {
      console.error('Database error in saveExecution:', error);
      // If database is not available, just log and continue
      console.log('Continuing without database persistence...');
      return;
    }
  }

  async stopExecution(executionId) {
    const execution = this.executions.get(executionId);
    if (!execution) {
      throw new Error(`Execution ${executionId} not found`);
    }

    if (execution.status === 'running') {
      execution.status = 'stopped';
      execution.endTime = new Date().toISOString();
      execution.duration = new Date(execution.endTime) - new Date(execution.startTime);
      
      // If there's a process running, try to kill it
      if (execution.processId) {
        try {
          process.kill(execution.processId, 'SIGTERM');
        } catch (error) {
          console.warn(`Failed to kill process ${execution.processId}: ${error.message}`);
        }
      }

      await this.saveExecution(execution);
    }

    return execution;
  }

  async getExecutionLogs(executionId) {
    const execution = this.executions.get(executionId);
    if (!execution) {
      throw new Error(`Execution ${executionId} not found`);
    }

    return execution.logs || [];
  }

  // Enhanced test execution with PlaywrightService integration
  async runTestSuiteWithPlaywright(testSuiteId, executionId, options = {}, progressCallback, playwrightService) {
    const testSuite = this.testSuites.get(testSuiteId);
    if (!testSuite) {
      throw new Error(`Test suite ${testSuiteId} not found`);
    }

    if (!playwrightService || !playwrightService.isReady()) {
      throw new Error('Playwright Service not available');
    }

    const execution = {
      id: executionId,
      testSuiteId,
      startTime: new Date().toISOString(),
      status: 'running',
      options,
      results: [],
      summary: {
        total: testSuite.tests?.length || 0,
        passed: 0,
        failed: 0,
        skipped: 0,
        healing: 0
      },
      healingActions: [],
      screenshots: [],
      logs: []
    };

    this.executions.set(executionId, execution);

    try {
      progressCallback?.({
        executionId,
        status: 'running',
        message: 'Starting test execution with Playwright Service...',
        progress: 0
      });

      // Use PlaywrightService for execution
      const result = await playwrightService.executeTestSuite({
        testSuite,
        browser: options.browser || 'chromium',
        options,
        executionId,
        progressCallback
      });

      // Update execution with results
      execution.results = result.results;
      execution.summary = {
        ...execution.summary,
        ...result.summary
      };
      
      // Collect screenshots and logs from results
      result.results.forEach(testResult => {
        if (testResult.screenshots) {
          execution.screenshots.push(...testResult.screenshots);
        }
        if (testResult.logs) {
          execution.logs.push(...testResult.logs);
        }
      });

      execution.endTime = new Date().toISOString();
      execution.duration = new Date(execution.endTime) - new Date(execution.startTime);
      execution.status = result.success ? 'passed' : 'failed';
      
      await this.saveExecution(execution);
      
      progressCallback?.({
        executionId,
        status: execution.status,
        message: 'Test execution completed with Playwright Service',
        progress: 100,
        summary: execution.summary
      });

    } catch (error) {
      execution.status = 'error';
      execution.error = error.message;
      execution.endTime = new Date().toISOString();
      execution.duration = new Date(execution.endTime) - new Date(execution.startTime);
      
      await this.saveExecution(execution);
      
      progressCallback?.({
        executionId,
        status: 'error',
        message: `Test execution failed: ${error.message}`,
        error: error.message
      });

      throw error;
    }

    return execution;
  }


  async deleteTestSuite(id) {
    this.testSuites.delete(id);
    
    try {
      const filePath = path.join(this.dataDir, 'test-suites', `${id}.json`);
      await fs.unlink(filePath);
    } catch (error) {
      // File might not exist
    }
  }

  async getExecutionHistory(testSuiteId, limit = 10) {
    const db = getDb();
    if (testSuiteId) {
      return await db.all('SELECT * FROM executions WHERE suite_id = ? ORDER BY startTime DESC LIMIT ?', [testSuiteId, limit]);
    } else {
      return await db.all('SELECT * FROM executions ORDER BY startTime DESC LIMIT ?', limit);
    }
  }

  // Create execution with custom configuration
  async createExecution(options = {}) {
    const executionId = uuidv4();
    const execution = {
      id: executionId,
      testSuiteIds: options.testSuiteIds || [],
      startTime: new Date().toISOString(),
      status: 'pending',
      options: options.options || {},
      config: options.config || null,
      configPath: options.configPath || null,
      useCustomConfig: options.options?.useCustomConfig || false,
      results: [],
      summary: {
        total: 0,
        passed: 0,
        failed: 0,
        skipped: 0,
        healing: 0
      },
      healingActions: [],
      screenshots: [],
      logs: []
    };

    this.executions.set(executionId, execution);
    return executionId;
  }

  // Run test suite with custom configuration
  async runTestSuiteWithConfig(testSuiteId, executionId, configPath, options = {}, progressCallback) {
    const testSuite = this.testSuites.get(testSuiteId);
    if (!testSuite) {
      throw new Error(`Test suite ${testSuiteId} not found`);
    }

    const execution = this.executions.get(executionId);
    if (!execution) {
      throw new Error(`Execution ${executionId} not found`);
    }

    try {
      // Update execution status
      execution.status = 'running';
      execution.summary.total += testSuite.tests?.length || 0;
      
      progressCallback?.({
         executionId,
         status: 'running',
         message: `Starting test suite: ${testSuite.name}`,
         progress: 0
       });

      // Generate Playwright test file
      const testFilePath = await this.generatePlaywrightTest(testSuite, execution);
      
      // Run the test with custom config
      await this.executePlaywrightTestWithConfig(testFilePath, configPath, execution, progressCallback);
      
      // Update execution summary
      execution.endTime = new Date().toISOString();
      execution.duration = new Date(execution.endTime) - new Date(execution.startTime);
      execution.status = execution.summary.failed > 0 ? 'failed' : 'passed';
      
      await this.saveExecution(execution);
      
      progressCallback?.({
         executionId,
         status: execution.status,
         message: `Test suite completed: ${testSuite.name}`,
         progress: 100,
         summary: execution.summary
       });

    } catch (error) {
      execution.status = 'error';
      execution.error = error.message;
      execution.endTime = new Date().toISOString();
      
      await this.saveExecution(execution);
      
      progressCallback?.({
         executionId,
         status: 'error',
         message: `Test suite failed: ${error.message}`,
         error: error.message
       });
      
      throw error;
    }
  }

  // Execute Playwright test with custom configuration
  async executePlaywrightTestWithConfig(testFilePath, configPath, execution, progressCallback) {
    return new Promise((resolve, reject) => {
      const args = [
        'playwright',
        'test',
        testFilePath,
        '--config',
        configPath,
        '--reporter=json,allure-playwright'
      ];

      console.log(`Running: npx ${args.join(' ')}`);
      
      const testProcess = spawn('npx', args, {
        cwd: process.cwd(),
        stdio: ['pipe', 'pipe', 'pipe']
      });

      let output = '';
      let errorOutput = '';

      testProcess.stdout.on('data', (data) => {
        const chunk = data.toString();
        output += chunk;
        
        // Parse progress from Playwright output
        try {
          const lines = chunk.split('\n').filter(line => line.trim());
          for (const line of lines) {
            if (line.includes('Running') || line.includes('✓') || line.includes('✗')) {
              execution.logs.push({
                timestamp: new Date().toISOString(),
                level: 'info',
                message: line.trim()
              });
              
              progressCallback?.({
                 executionId: execution.id,
                 status: 'running',
                 message: line.trim(),
                 logs: execution.logs.slice(-5) // Last 5 logs
               });
            }
          }
        } catch (e) {
          // Ignore parsing errors
        }
      });

      testProcess.stderr.on('data', (data) => {
        errorOutput += data.toString();
        execution.logs.push({
          timestamp: new Date().toISOString(),
          level: 'error',
          message: data.toString().trim()
        });
      });

      testProcess.on('close', async (code) => {
        try {
          // Parse JSON output from Playwright
          const jsonMatch = output.match(/\{[\s\S]*"stats"[\s\S]*\}/g);
          if (jsonMatch) {
            const result = JSON.parse(jsonMatch[jsonMatch.length - 1]);
            
            // Update execution summary
            if (result.stats) {
              execution.summary.passed += result.stats.passed || 0;
              execution.summary.failed += result.stats.failed || 0;
              execution.summary.skipped += result.stats.skipped || 0;
            }
            
            // Store test results
            if (result.suites) {
              execution.results.push(...result.suites);
            }
          }
          
          // Generate Allure report after test execution
          try {
            await this.generateAllureReport(execution.id);
            execution.reportUrl = `/allure-report/${execution.id}/index.html`;
          } catch (allureError) {
            console.warn('Failed to generate Allure report:', allureError.message);
          }
          
          if (code === 0) {
            resolve(execution);
          } else {
            const error = new Error(`Test execution failed with code ${code}`);
            error.output = output;
            error.errorOutput = errorOutput;
            reject(error);
          }
        } catch (parseError) {
          console.error('Error parsing test results:', parseError);
          if (code === 0) {
            resolve(execution);
          } else {
            reject(new Error(`Test execution failed with code ${code}`));
          }
        }
      });

      testProcess.on('error', (error) => {
        reject(error);
      });
    });
  }

  async generateAllureReport(executionId) {
    try {
      console.log(`Generating Allure report for execution: ${executionId}`);
      
      const allureResultsDir = path.join(process.cwd(), 'allure-results');
      const allureReportDir = path.join(process.cwd(), 'allure-report', executionId);
      
      // Check if allure-results directory exists
      try {
        await fs.access(allureResultsDir);
      } catch (error) {
        console.warn(`Allure results directory not found: ${allureResultsDir}`);
        return;
      }
      
      // Generate Allure report
      return new Promise((resolve, reject) => {
        const allureProcess = spawn('npx', ['allure', 'generate', allureResultsDir, '-o', allureReportDir, '--clean'], {
          cwd: process.cwd(),
          stdio: ['pipe', 'pipe', 'pipe']
        });
        
        let stdout = '';
        let stderr = '';
        
        allureProcess.stdout.on('data', (data) => {
          stdout += data.toString();
        });
        
        allureProcess.stderr.on('data', (data) => {
          stderr += data.toString();
        });
        
        allureProcess.on('close', (code) => {
          if (code === 0) {
            console.log(`Allure report generated successfully for execution: ${executionId}`);
            resolve();
          } else {
            console.error(`Allure report generation failed with code ${code}:`, stderr);
            reject(new Error(`Allure generation failed: ${stderr}`));
          }
        });
        
        allureProcess.on('error', (error) => {
          console.error('Error running Allure command:', error);
          reject(error);
        });
      });
    } catch (error) {
      console.error('Error in generateAllureReport:', error);
      throw error;
    }
  }
}

export default TestRunner;