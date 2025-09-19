/**
 * Integration Test for AI Element Inspector
 * Tests the complete functionality of the enhanced JavaScript implementation
 */

import { chromium } from 'playwright';
import { AIElementInspectorService } from '../src/core/ai-element-inspector.js';
import { ScenarioManager } from '../src/scenarios/scenario-manager.js';
import { PerformanceMonitor } from '../src/core/performance-monitor.js';
import { DatabaseManager } from '../src/utils/config.js';
import { Logger } from '../src/utils/logger.js';

class IntegrationTest {
    constructor() {
        this.logger = new Logger();
        this.browser = null;
        this.page = null;
        this.inspector = null;
        this.scenarioManager = null;
        this.performanceMonitor = null;
        this.dbManager = null;
        this.testResults = [];
    }

    async setup() {
        try {
            this.logger.info('Setting up integration test environment...');

            // Launch browser
            this.browser = await chromium.launch({ headless: true });
            this.page = await browser.newPage();

            // Initialize components
            this.dbManager = new DatabaseManager({ dbPath: ':memory:' });
            await this.dbManager.initialize();

            this.performanceMonitor = new PerformanceMonitor();
            await this.performanceMonitor.initialize();

            this.scenarioManager = new ScenarioManager();
            await this.scenarioManager.initialize();

            this.inspector = new AIElementInspectorService(this.page, {
                enableMLSimilarity: true,
                enableShadowDOM: true,
                enableIframeSupport: true,
                enablePerformanceTracking: true
            });

            this.logger.info('Integration test environment setup completed');
        } catch (error) {
            this.logger.error('Failed to setup test environment:', error);
            throw error;
        }
    }

    async teardown() {
        try {
            if (this.browser) {
                await this.browser.close();
            }
            if (this.dbManager) {
                await this.dbManager.close();
            }
            if (this.performanceMonitor) {
                this.performanceMonitor.stop();
            }
            this.logger.info('Test environment cleaned up');
        } catch (error) {
            this.logger.error('Error during teardown:', error);
        }
    }

    async runAllTests() {
        try {
            await this.setup();

            // Run test suites
            await this.testBasicElementRegistration();
            await this.testSelfHealingCapabilities();
            await this.testScenarioExecution();
            await this.testPerformanceMonitoring();
            await this.testDatabaseOperations();
            await this.testAdvancedScenarios();

            // Generate test report
            this.generateTestReport();

        } catch (error) {
            this.logger.error('Integration test failed:', error);
            throw error;
        } finally {
            await this.teardown();
        }
    }

    async testBasicElementRegistration() {
        this.logger.info('Testing basic element registration...');
        
        try {
            // Navigate to a test page
            await this.page.goto('data:text/html,<html><body><h1 id="test-heading">Test Heading</h1><button class="btn primary" data-testid="submit">Submit</button></body></html>');

            // Test 1: Register element with ID
            const heading = await this.page.waitForSelector('#test-heading');
            const headingRegistration = await this.inspector.registerElement('test-heading', heading);
            
            this.addTestResult('Element Registration - ID', 
                headingRegistration.selectors.length > 0, 
                `Generated ${headingRegistration.selectors.length} selectors`);

            // Test 2: Register element with data-testid
            const button = await this.page.waitForSelector('[data-testid="submit"]');
            const buttonRegistration = await this.inspector.registerElement('submit-button', button);
            
            this.addTestResult('Element Registration - Data TestID', 
                buttonRegistration.selectors.length > 0, 
                `Generated ${buttonRegistration.selectors.length} selectors`);

            // Test 3: Verify element retrieval
            const retrievedElement = this.inspector.getElement('test-heading');
            this.addTestResult('Element Retrieval', 
                retrievedElement !== null, 
                'Element successfully retrieved from registry');

        } catch (error) {
            this.addTestResult('Basic Element Registration', false, error.message);
        }
    }

    async testSelfHealingCapabilities() {
        this.logger.info('Testing self-healing capabilities...');

        try {
            // Create a page with elements that will change
            await this.page.goto('data:text/html,<html><body><div id="container"><button id="original-btn">Original Button</button></div></body></html>');

            // Register the original button
            const originalButton = await this.page.waitForSelector('#original-btn');
            await this.inspector.registerElement('dynamic-button', originalButton);

            // Simulate DOM change - remove ID and change structure
            await this.page.evaluate(() => {
                const button = document.querySelector('#original-btn');
                button.removeAttribute('id');
                button.className = 'changed-button';
                button.textContent = 'Changed Button';
            });

            // Test healing
            const healedElement = await this.inspector.findElementWithHealing(
                'dynamic-button', 
                '#original-btn'
            );

            this.addTestResult('Self-Healing - DOM Changes', 
                healedElement !== null, 
                'Element found after DOM structure change');

            // Test with completely missing element
            await this.page.evaluate(() => {
                const button = document.querySelector('.changed-button');
                if (button) button.remove();
            });

            const missingElement = await this.inspector.findElementWithHealing(
                'dynamic-button', 
                '#original-btn'
            );

            this.addTestResult('Self-Healing - Missing Element', 
                missingElement === null, 
                'Correctly identified missing element');

        } catch (error) {
            this.addTestResult('Self-Healing Capabilities', false, error.message);
        }
    }

    async testScenarioExecution() {
        this.logger.info('Testing scenario execution...');

        try {
            // Test dynamic content scenario
            await this.page.goto('data:text/html,<html><body><div id="dynamic-container"></div><script>setTimeout(() => { document.getElementById("dynamic-container").innerHTML = "<p id=\\"dynamic-content\\">Dynamic Content</p>"; }, 1000);</script></body></html>');

            const dynamicResult = await this.scenarioManager.executeScenario(
                'dynamic-content',
                this.page,
                'dynamic-element',
                '#dynamic-content'
            );

            this.addTestResult('Scenario - Dynamic Content', 
                dynamicResult.success, 
                `Execution time: ${dynamicResult.executionTime}ms`);

            // Test multiple scenarios
            const multipleResults = await this.scenarioManager.executeMultipleScenarios(
                ['dynamic-content', 'responsive', 'modal-dialogs'],
                this.page,
                'test-element',
                '#test-selector'
            );

            this.addTestResult('Scenario - Multiple Execution', 
                multipleResults.totalCount === 3, 
                `Executed ${multipleResults.totalCount} scenarios, ${multipleResults.successCount} successful`);

        } catch (error) {
            this.addTestResult('Scenario Execution', false, error.message);
        }
    }

    async testPerformanceMonitoring() {
        this.logger.info('Testing performance monitoring...');

        try {
            // Record some performance metrics
            this.performanceMonitor.recordSelectorPerformance('#test-selector', true, 150);
            this.performanceMonitor.recordSelectorPerformance('.test-class', false, 800);
            this.performanceMonitor.recordScenarioPerformance('dynamic-content', true, 1200, 0.85);

            // Get metrics
            const metrics = this.performanceMonitor.getMetrics();
            
            this.addTestResult('Performance Monitoring - Metrics Collection', 
                metrics.selectors.totalAttempts > 0, 
                `Collected metrics for ${metrics.selectors.totalSelectors} selectors`);

            // Test performance report generation
            const report = this.performanceMonitor.generateReport();
            
            this.addTestResult('Performance Monitoring - Report Generation', 
                report.summary && report.performance, 
                'Performance report generated successfully');

        } catch (error) {
            this.addTestResult('Performance Monitoring', false, error.message);
        }
    }

    async testDatabaseOperations() {
        this.logger.info('Testing database operations...');

        try {
            // Test element saving
            const testSignature = {
                tagName: 'button',
                attributes: { id: 'test-btn', class: 'btn primary' },
                textContent: 'Test Button'
            };

            const testSelectors = [
                { strategy: 'id', value: '#test-btn', confidence: 0.9 }
            ];

            await this.dbManager.saveElement('test-element', testSignature, testSelectors);
            
            // Test element retrieval
            const retrievedElement = await this.dbManager.getElement('test-element');
            
            this.addTestResult('Database - Element Storage', 
                retrievedElement && retrievedElement.id === 'test-element', 
                'Element saved and retrieved successfully');

            // Test performance metrics storage
            await this.dbManager.savePerformanceMetric('test-element', '#test-btn', true, 200);
            const metrics = await this.dbManager.getPerformanceMetrics('test-element');
            
            this.addTestResult('Database - Performance Metrics', 
                metrics.length > 0, 
                `Stored and retrieved ${metrics.length} performance metrics`);

        } catch (error) {
            this.addTestResult('Database Operations', false, error.message);
        }
    }

    async testAdvancedScenarios() {
        this.logger.info('Testing advanced scenarios...');

        try {
            // Test Shadow DOM scenario
            await this.page.goto('data:text/html,<html><body><div id="shadow-host"></div><script>const host = document.getElementById("shadow-host"); const shadow = host.attachShadow({mode: "open"}); shadow.innerHTML = "<button id=\\"shadow-btn\\">Shadow Button</button>";</script></body></html>');

            const shadowResult = await this.scenarioManager.executeScenario(
                'shadow-dom',
                this.page,
                'shadow-element',
                '#shadow-btn'
            );

            this.addTestResult('Advanced Scenario - Shadow DOM', 
                shadowResult.success, 
                `Shadow DOM scenario executed with confidence: ${shadowResult.confidence}`);

            // Test responsive scenario
            const responsiveResult = await this.scenarioManager.executeScenario(
                'responsive',
                this.page,
                'responsive-element',
                '.responsive-element'
            );

            this.addTestResult('Advanced Scenario - Responsive', 
                responsiveResult !== null, 
                'Responsive scenario executed successfully');

            // Test scenario recommendations
            const elementSignature = {
                tagName: 'input',
                attributes: { type: 'text', required: true },
                formInfo: { type: 'text', required: true }
            };

            const recommendations = this.scenarioManager.getRecommendedScenarios(elementSignature);
            
            this.addTestResult('Advanced Scenario - Recommendations', 
                recommendations.length > 0, 
                `Generated ${recommendations.length} scenario recommendations`);

        } catch (error) {
            this.addTestResult('Advanced Scenarios', false, error.message);
        }
    }

    addTestResult(testName, passed, details) {
        this.testResults.push({
            name: testName,
            passed,
            details,
            timestamp: new Date().toISOString()
        });

        const status = passed ? '✅ PASS' : '❌ FAIL';
        this.logger.info(`${status}: ${testName} - ${details}`);
    }

    generateTestReport() {
        const totalTests = this.testResults.length;
        const passedTests = this.testResults.filter(r => r.passed).length;
        const failedTests = totalTests - passedTests;
        const successRate = totalTests > 0 ? (passedTests / totalTests * 100).toFixed(1) : 0;

        const report = {
            summary: {
                totalTests,
                passedTests,
                failedTests,
                successRate: `${successRate}%`,
                timestamp: new Date().toISOString()
            },
            results: this.testResults,
            categories: {
                'Element Registration': this.testResults.filter(r => r.name.includes('Element Registration')),
                'Self-Healing': this.testResults.filter(r => r.name.includes('Self-Healing')),
                'Scenarios': this.testResults.filter(r => r.name.includes('Scenario')),
                'Performance': this.testResults.filter(r => r.name.includes('Performance')),
                'Database': this.testResults.filter(r => r.name.includes('Database')),
                'Advanced': this.testResults.filter(r => r.name.includes('Advanced'))
            }
        };

        // Log summary
        this.logger.info('\n' + '='.repeat(60));
        this.logger.info('AI ELEMENT INSPECTOR - INTEGRATION TEST REPORT');
        this.logger.info('='.repeat(60));
        this.logger.info(`Total Tests: ${totalTests}`);
        this.logger.info(`Passed: ${passedTests}`);
        this.logger.info(`Failed: ${failedTests}`);
        this.logger.info(`Success Rate: ${successRate}%`);
        this.logger.info('='.repeat(60));

        // Log failed tests
        if (failedTests > 0) {
            this.logger.info('\nFAILED TESTS:');
            this.testResults.filter(r => !r.passed).forEach(test => {
                this.logger.info(`❌ ${test.name}: ${test.details}`);
            });
        }

        // Log category breakdown
        this.logger.info('\nCATEGORY BREAKDOWN:');
        Object.entries(report.categories).forEach(([category, tests]) => {
            const categoryPassed = tests.filter(t => t.passed).length;
            const categoryTotal = tests.length;
            const categoryRate = categoryTotal > 0 ? (categoryPassed / categoryTotal * 100).toFixed(1) : 0;
            this.logger.info(`${category}: ${categoryPassed}/${categoryTotal} (${categoryRate}%)`);
        });

        this.logger.info('\n' + '='.repeat(60));

        return report;
    }
}

// Run tests if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
    const test = new IntegrationTest();
    test.runAllTests()
        .then(() => {
            console.log('\n🎉 Integration tests completed!');
            process.exit(0);
        })
        .catch((error) => {
            console.error('\n❌ Integration tests failed:', error);
            process.exit(1);
        });
}

export { IntegrationTest };
