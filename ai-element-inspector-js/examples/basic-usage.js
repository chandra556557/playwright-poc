/**
 * Basic Usage Example for AI Element Inspector
 * Demonstrates how to use the enhanced JavaScript implementation
 */

import { chromium } from 'playwright';
import { AIElementInspectorService } from '../src/core/ai-element-inspector.js';
import { ScenarioManager } from '../src/scenarios/scenario-manager.js';

async function basicUsageExample() {
    console.log('🚀 Starting AI Element Inspector Basic Usage Example');

    // Launch browser
    const browser = await chromium.launch({ headless: false });
    const page = await browser.newPage();

    try {
        // Initialize the AI Element Inspector Service
        const inspectorService = new AIElementInspectorService(page, {
            enableMLSimilarity: true,
            enableShadowDOM: true,
            enableIframeSupport: true,
            similarityThreshold: 0.7
        });

        // Initialize Scenario Manager
        const scenarioManager = new ScenarioManager();
        await scenarioManager.initialize();

        console.log('📄 Navigating to test page...');
        await page.goto('https://example.com');

        // Example 1: Register a simple element
        console.log('\n📝 Example 1: Registering a simple element');
        const headingElement = await page.waitForSelector('h1');
        const registration = await inspectorService.registerElement('main-heading', headingElement, {
            description: 'Main page heading',
            importance: 'high'
        });
        
        console.log('✅ Element registered:', {
            elementId: registration.elementId,
            selectorsGenerated: registration.selectors.length,
            topSelector: registration.selectors[0]
        });

        // Example 2: Test self-healing capabilities
        console.log('\n🔧 Example 2: Testing self-healing capabilities');
        const healingResult = await inspectorService.findElementWithHealing(
            'main-heading',
            'h1', // Primary selector
            { maxAttempts: 3, useMLSimilarity: true }
        );

        if (healingResult) {
            console.log('✅ Element found with self-healing');
        } else {
            console.log('❌ Element not found after healing attempts');
        }

        // Example 3: Execute specific scenarios
        console.log('\n🎯 Example 3: Executing specific scenarios');
        
        // Dynamic content scenario
        const dynamicResult = await scenarioManager.executeScenario(
            'dynamic-content',
            page,
            'main-heading',
            'h1'
        );
        
        console.log('Dynamic content scenario result:', {
            success: dynamicResult.success,
            confidence: dynamicResult.confidence,
            executionTime: dynamicResult.executionTime
        });

        // Example 4: Execute multiple scenarios
        console.log('\n🔄 Example 4: Executing multiple scenarios');
        const multipleResults = await scenarioManager.executeMultipleScenarios(
            ['dynamic-content', 'shadow-dom', 'responsive'],
            page,
            'main-heading',
            'h1'
        );

        console.log('Multiple scenarios result:', {
            bestStrategy: multipleResults.bestResult?.scenarioType,
            successCount: multipleResults.successCount,
            totalCount: multipleResults.totalCount
        });

        // Example 5: Analyze page changes
        console.log('\n🔍 Example 5: Analyzing page changes');
        const pageAnalysis = await inspectorService.analyzePageChanges();
        
        console.log('Page analysis:', {
            totalElements: pageAnalysis.totalElements,
            found: pageAnalysis.found,
            changed: pageAnalysis.changed,
            missing: pageAnalysis.missing
        });

        // Example 6: Get performance report
        console.log('\n📊 Example 6: Getting performance report');
        const performanceReport = inspectorService.getHealingReport();
        
        console.log('Performance report:', {
            totalElements: performanceReport.totalElements,
            totalAttempts: performanceReport.totalAttempts,
            successfulHealing: performanceReport.successfulHealing,
            averageHealingTime: performanceReport.averageHealingTime
        });

        // Example 7: Advanced element registration with complex page
        console.log('\n🌐 Example 7: Testing with a more complex page');
        await page.goto('https://github.com');
        
        // Register multiple elements
        const elements = [
            { selector: 'input[name="q"]', id: 'search-input', description: 'Main search input' },
            { selector: '.Header-link', id: 'header-link', description: 'Header navigation link' },
            { selector: '.btn-primary', id: 'primary-button', description: 'Primary action button' }
        ];

        for (const { selector, id, description } of elements) {
            try {
                const element = await page.waitForSelector(selector, { timeout: 5000 });
                if (element) {
                    const reg = await inspectorService.registerElement(id, element, { description });
                    console.log(`✅ Registered ${id}: ${reg.selectors.length} selectors generated`);
                }
            } catch (error) {
                console.log(`❌ Failed to register ${id}: ${error.message}`);
            }
        }

        // Test healing on registered elements
        console.log('\n🔧 Testing healing on registered elements...');
        for (const { id, selector } of elements) {
            const healResult = await inspectorService.findElementWithHealing(id, selector);
            console.log(`${healResult ? '✅' : '❌'} Healing test for ${id}: ${healResult ? 'SUCCESS' : 'FAILED'}`);
        }

        // Example 8: Scenario recommendations
        console.log('\n💡 Example 8: Getting scenario recommendations');
        for (const { id } of elements) {
            const elementSignature = inspectorService.getElement(id);
            if (elementSignature) {
                const recommendations = scenarioManager.getRecommendedScenarios(elementSignature);
                console.log(`Recommendations for ${id}:`, 
                    recommendations.map(r => `${r.type} (${r.confidence})`).join(', ')
                );
            }
        }

        console.log('\n🎉 Basic usage example completed successfully!');

    } catch (error) {
        console.error('❌ Example failed:', error);
    } finally {
        await browser.close();
    }
}

// Advanced usage example
async function advancedUsageExample() {
    console.log('\n🚀 Starting Advanced Usage Example');

    const browser = await chromium.launch({ headless: false });
    const page = await browser.newPage();

    try {
        const inspectorService = new AIElementInspectorService(page, {
            enableMLSimilarity: true,
            enableShadowDOM: true,
            enableIframeSupport: true,
            enablePerformanceTracking: true,
            similarityThreshold: 0.8,
            maxHealingAttempts: 5
        });

        const scenarioManager = new ScenarioManager({
            enableAllScenarios: true,
            maxConcurrentScenarios: 3
        });
        await scenarioManager.initialize();

        // Test with a complex SPA
        console.log('📄 Navigating to complex SPA...');
        await page.goto('https://react-shopping-cart-67954.firebaseapp.com/');

        // Wait for the app to load
        await page.waitForTimeout(2000);

        // Register elements in a dynamic application
        const dynamicElements = [
            { selector: '.shelf-item', id: 'product-item', description: 'Product item in shelf' },
            { selector: '.float-cart__close-btn', id: 'cart-close', description: 'Cart close button' },
            { selector: '.shelf-item__buy-btn', id: 'buy-button', description: 'Product buy button' }
        ];

        console.log('\n📝 Registering elements in dynamic application...');
        for (const { selector, id, description } of dynamicElements) {
            try {
                const elements = await page.$$(selector);
                if (elements.length > 0) {
                    const reg = await inspectorService.registerElement(id, elements[0], { description });
                    console.log(`✅ Registered ${id}: ${reg.selectors.length} selectors`);
                }
            } catch (error) {
                console.log(`❌ Failed to register ${id}: ${error.message}`);
            }
        }

        // Test interaction-based scenarios
        console.log('\n🎯 Testing interaction-based scenarios...');
        
        // Simulate user interactions that might change the DOM
        try {
            const buyButton = await page.$('.shelf-item__buy-btn');
            if (buyButton) {
                await buyButton.click();
                await page.waitForTimeout(1000);
                
                // Test if we can still find elements after DOM changes
                const healingTest = await inspectorService.findElementWithHealing(
                    'buy-button',
                    '.shelf-item__buy-btn'
                );
                console.log(`🔧 Post-interaction healing test: ${healingTest ? 'SUCCESS' : 'FAILED'}`);
            }
        } catch (error) {
            console.log('⚠️ Interaction test skipped:', error.message);
        }

        // Test multiple scenarios simultaneously
        console.log('\n🔄 Testing multiple scenarios simultaneously...');
        const concurrentResults = await Promise.all([
            scenarioManager.executeScenario('dynamic-content', page, 'product-item', '.shelf-item'),
            scenarioManager.executeScenario('animation', page, 'cart-close', '.float-cart__close-btn'),
            scenarioManager.executeScenario('responsive', page, 'buy-button', '.shelf-item__buy-btn')
        ]);

        concurrentResults.forEach((result, index) => {
            console.log(`Scenario ${index + 1}: ${result.scenarioType} - ${result.success ? 'SUCCESS' : 'FAILED'}`);
        });

        // Performance analysis
        console.log('\n📊 Performance analysis...');
        const metrics = scenarioManager.getPerformanceMetrics();
        console.log('Scenario performance:', {
            totalExecutions: metrics.totalExecutions,
            successRate: (metrics.successRate * 100).toFixed(1) + '%',
            averageTime: metrics.averageExecutionTime.toFixed(0) + 'ms'
        });

        console.log('\n🎉 Advanced usage example completed!');

    } catch (error) {
        console.error('❌ Advanced example failed:', error);
    } finally {
        await browser.close();
    }
}

// Run examples
async function runExamples() {
    console.log('🎯 AI Element Inspector - Enhanced JavaScript Implementation Examples\n');
    
    try {
        await basicUsageExample();
        await advancedUsageExample();
        
        console.log('\n✨ All examples completed successfully!');
        console.log('\n📚 Next steps:');
        console.log('1. Explore the API documentation at /api-docs');
        console.log('2. Try the WebSocket real-time monitoring');
        console.log('3. Customize scenarios for your specific use cases');
        console.log('4. Integrate with your existing test automation framework');
        
    } catch (error) {
        console.error('❌ Examples failed:', error);
        process.exit(1);
    }
}

// Run if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
    runExamples();
}

export { basicUsageExample, advancedUsageExample };
