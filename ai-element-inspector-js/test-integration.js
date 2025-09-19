/**
 * Integration Test for AI Element Inspector
 * Tests the AI element inspector integration with the main project
 */

import { chromium } from 'playwright';
import { MainProjectIntegration } from './src/integration/main-project-integration.js';
import { Logger } from './src/utils/logger.js';

const logger = new Logger();

async function testAIIntegration() {
    console.log('🧪 Testing AI Element Inspector Integration...\n');

    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();

    try {
        // Initialize integration
        const integration = new MainProjectIntegration();
        await integration.initialize();
        console.log('✅ Integration initialized successfully');

        // Test 1: Basic element discovery
        console.log('\n📝 Test 1: Basic AI element discovery');
        const discoveryResult = await integration.discoverElementsWithAI(
            page,
            'https://example.com',
            'chromium',
            { testMode: true }
        );

        console.log('Discovery Results:', {
            totalElements: discoveryResult.summary.totalElements,
            aiEnhancedElements: discoveryResult.summary.aiEnhancedElements,
            confidenceScore: discoveryResult.summary.confidenceScore,
            scenarioSuccessRate: discoveryResult.summary.scenarioSuccessRate
        });

        // Test 2: Element analysis
        console.log('\n🔍 Test 2: Element analysis');
        await page.goto('https://example.com');
        const heading = await page.$('h1');
        
        if (heading) {
            const inspector = await integration.createInspectorForPage(page);
            const registration = await inspector.registerElement('test-heading', heading, {
                description: 'Test heading element'
            });

            console.log('Element Analysis:', {
                elementId: registration.elementId,
                selectorsGenerated: registration.selectors.length,
                topSelector: registration.selectors[0]
            });
        }

        // Test 3: Performance metrics
        console.log('\n📊 Test 3: Performance metrics');
        const performanceReport = integration.performanceMonitor.getMetrics();
        console.log('Performance Metrics:', {
            totalExecutions: performanceReport.totalExecutions || 0,
            averageTime: performanceReport.averageExecutionTime || 0
        });

        console.log('\n✅ All integration tests passed!');
        console.log('\n🎯 AI Element Inspector is ready for use!');
        console.log('\n📋 Available endpoints:');
        console.log('   POST /api/ai/discover-elements - AI-enhanced element discovery');
        console.log('   POST /api/ai/analyze-element - Analyze specific element');
        console.log('   POST /api/ai/heal-element - Heal broken selectors');
        console.log('   GET /api/ai/performance - Get performance metrics');
        console.log('   GET /api/ai/health - Health check');

    } catch (error) {
        console.error('❌ Integration test failed:', error);
        throw error;
    } finally {
        await browser.close();
    }
}

// Run the test
testAIIntegration().catch(error => {
    console.error('Test failed:', error);
    process.exit(1);
});
