/**
 * Main Project Integration Service
 * Integrates AI Element Inspector with the main Playwright testing suite
 */

import { AIElementInspectorService } from '../core/ai-element-inspector.js';
import { ScenarioManager } from '../scenarios/scenario-manager.js';
import { PerformanceMonitor } from '../core/performance-monitor.js';
import { Logger } from '../utils/logger.js';
import integrationConfig from '../../config/integration-config.js';

export class MainProjectIntegration {
    constructor() {
        this.logger = new Logger();
        this.inspectorService = null;
        this.scenarioManager = null;
        this.performanceMonitor = new PerformanceMonitor();
        this.isInitialized = false;
        this.activePages = new Map();
    }

    async initialize() {
        try {
            this.logger.info('Initializing Main Project Integration...');

            // Initialize scenario manager
            this.scenarioManager = new ScenarioManager(integrationConfig.scenarios);
            await this.scenarioManager.initialize();

            // Initialize performance monitoring
            await this.performanceMonitor.initialize();

            this.isInitialized = true;
            this.logger.info('Main Project Integration initialized successfully');
        } catch (error) {
            this.logger.error('Failed to initialize Main Project Integration:', error);
            throw error;
        }
    }

    /**
     * Create AI Element Inspector for a specific page
     */
    async createInspectorForPage(page, options = {}) {
        if (!this.isInitialized) {
            await this.initialize();
        }

        const pageId = this.generatePageId(page);
        
        const inspectorOptions = {
            ...integrationConfig.aiInspector,
            ...options
        };

        const inspector = new AIElementInspectorService(page, inspectorOptions);
        this.activePages.set(pageId, inspector);

        this.logger.info(`Created AI Element Inspector for page: ${pageId}`);
        return inspector;
    }

    /**
     * Enhanced element discovery with AI capabilities
     */
    async discoverElementsWithAI(page, url, browserName = 'chromium', context = {}) {
        try {
            const inspector = await this.createInspectorForPage(page);
            
            // Navigate to the page if URL is provided
            if (url) {
                await page.goto(url, { waitUntil: 'networkidle' });
            }

            // Get basic element discovery
            const basicDiscovery = await this.getBasicElementDiscovery(page);
            
            // Enhance with AI analysis
            const aiEnhancedDiscovery = await this.enhanceWithAIAnalysis(inspector, basicDiscovery);
            
            // Execute relevant scenarios
            const scenarioResults = await this.executeRelevantScenarios(inspector, page, aiEnhancedDiscovery);

            return {
                elements: aiEnhancedDiscovery,
                scenarios: scenarioResults,
                aiInsights: await this.generateAIInsights(inspector, aiEnhancedDiscovery),
                summary: {
                    totalElements: Object.values(aiEnhancedDiscovery).flat().length,
                    aiEnhancedElements: this.countAIEnhancedElements(aiEnhancedDiscovery),
                    scenarioSuccessRate: this.calculateScenarioSuccessRate(scenarioResults),
                    confidenceScore: this.calculateOverallConfidence(aiEnhancedDiscovery, scenarioResults)
                },
                timestamp: new Date().toISOString()
            };
        } catch (error) {
            this.logger.error('AI element discovery failed:', error);
            throw error;
        }
    }

    /**
     * Get basic element discovery (similar to PlaywrightService)
     */
    async getBasicElementDiscovery(page) {
        return await page.evaluate(() => {
            function firstNonEmpty(...vals) {
                return vals.find(v => typeof v === 'string' && v.trim().length > 0) || '';
            }

            function buildSelectors(el) {
                const sels = [];
                const testid = el.getAttribute('data-testid');
                const ariaLabel = el.getAttribute('aria-label');
                const nameAttr = el.getAttribute('name');
                const role = el.getAttribute('role');
                const text = (el.textContent || '').trim();
                const id = el.id;
                const classList = (el.className || '').toString().split(/\s+/).filter(Boolean);

                if (testid) sels.push(`[data-testid="${CSS.escape(testid)}"]`);
                if (id) sels.push(`#${CSS.escape(id)}`);
                if (nameAttr) sels.push(`[name="${CSS.escape(nameAttr)}"]`);
                if (ariaLabel) sels.push(`[aria-label="${CSS.escape(ariaLabel)}"]`);
                if (role && ariaLabel) sels.push(`${role}[aria-label="${CSS.escape(ariaLabel)}"]`);
                if (classList.length > 0) sels.push(`.${CSS.escape(classList[0])}`);
                if (text) sels.push(`text=${text.substring(0, 80)}`);

                // Fallback nth-of-type path
                try {
                    const pathParts = [];
                    let node = el;
                    while (node && node.nodeType === 1 && pathParts.length < 5) {
                        let idx = 1;
                        let sib = node.previousElementSibling;
                        while (sib) { if (sib.tagName === node.tagName) idx++; sib = sib.previousElementSibling; }
                        pathParts.unshift(`${node.tagName.toLowerCase()}:nth-of-type(${idx})`);
                        node = node.parentElement;
                    }
                    if (pathParts.length) sels.push(pathParts.join(' > '));
                } catch (e) {}

                // Deduplicate while preserving order
                const seen = new Set();
                return sels.filter(s => {
                    if (!s || seen.has(s)) return false; seen.add(s); return true;
                });
            }

            const discoveries = {
                buttons: [],
                inputs: [],
                links: [],
                forms: [],
                modals: [],
                tables: [],
                navigation: [],
                search: [],
                notifications: []
            };

            // Buttons
            document.querySelectorAll('button, input[type="button"], input[type="submit"], [role="button"]').forEach((btn, index) => {
                const rect = btn.getBoundingClientRect();
                if (rect.width > 0 && rect.height > 0) {
                    const selectors = buildSelectors(btn);
                    const locator = selectors[0] || '';
                    discoveries.buttons.push({
                        name: `button-${index}`,
                        locator,
                        selectors,
                        description: `${btn.textContent?.trim() || 'Button'} (${btn.tagName})`,
                        priority: btn.id ? 10 : (btn.className ? 7 : 5),
                        text: btn.textContent?.trim() || '',
                        type: btn.type || 'button',
                        disabled: btn.disabled || btn.getAttribute('aria-disabled') === 'true',
                        position: { x: rect.x, y: rect.y, width: rect.width, height: rect.height }
                    });
                }
            });

            // Inputs
            document.querySelectorAll('input:not([type="hidden"]), textarea, select').forEach((input, index) => {
                const rect = input.getBoundingClientRect();
                if (rect.width > 0 && rect.height > 0) {
                    const selectors = buildSelectors(input);
                    const locator = selectors[0] || '';
                    discoveries.inputs.push({
                        name: `input-${index}`,
                        locator,
                        selectors,
                        description: `${input.placeholder || input.name || 'Input'} (${input.type || 'text'})`,
                        priority: input.id ? 10 : (input.name ? 8 : 5),
                        type: input.type || 'text',
                        placeholder: input.placeholder || '',
                        required: input.required || false,
                        name: input.name || '',
                        position: { x: rect.x, y: rect.y, width: rect.width, height: rect.height }
                    });
                }
            });

            // Links
            document.querySelectorAll('a[href]').forEach((link, index) => {
                const rect = link.getBoundingClientRect();
                if (rect.width > 0 && rect.height > 0) {
                    const selectors = buildSelectors(link);
                    const locator = selectors[0] || `a[href="${link.href}"]`;
                    discoveries.links.push({
                        name: `link-${index}`,
                        locator,
                        selectors,
                        description: `${link.textContent?.trim() || 'Link'} (${link.href})`,
                        priority: link.id ? 10 : 7,
                        text: link.textContent?.trim() || '',
                        href: link.href,
                        external: !link.href.startsWith(window.location.origin),
                        position: { x: rect.x, y: rect.y, width: rect.width, height: rect.height }
                    });
                }
            });

            return discoveries;
        });
    }

    /**
     * Enhance basic discovery with AI analysis
     */
    async enhanceWithAIAnalysis(inspector, basicDiscovery) {
        const enhancedDiscovery = { ...basicDiscovery };

        for (const [category, elements] of Object.entries(basicDiscovery)) {
            enhancedDiscovery[category] = await Promise.all(
                elements.map(async (element) => {
                    try {
                        // Find the actual element on the page
                        let pageElement = null;
                        const locatorCandidates = [element.locator, ...(element.selectors || [])].filter(Boolean);
                        for (const cand of locatorCandidates) {
                            pageElement = await inspector.page.$(cand);
                            if (pageElement) break;
                        }
                        if (!pageElement) {
                            return {
                                ...element,
                                aiEnhanced: false,
                                aiError: 'Element not found on page'
                            };
                        }

                        // Register element with AI inspector
                        const registration = await inspector.registerElement(
                            element.name,
                            pageElement,
                            {
                                description: element.description,
                                category: category,
                                priority: element.priority
                            }
                        );

                        // Get AI analysis
                        const aiAnalysis = await inspector.getElementAnalysis(element.name);

                        return {
                            ...element,
                            aiEnhanced: true,
                            aiSelectors: registration.selectors,
                            fallbackSelectors: locatorCandidates,
                            aiConfidence: aiAnalysis.prediction?.confidence || 0.5,
                            aiFeatures: aiAnalysis.features,
                            aiAnalysis: aiAnalysis.analysis,
                            recommendedScenarios: this.getRecommendedScenarios(element, category)
                        };
                    } catch (error) {
                        this.logger.warn(`Failed to enhance element ${element.name}:`, error.message);
                        return {
                            ...element,
                            aiEnhanced: false,
                            aiError: error.message
                        };
                    }
                })
            );
        }

        return enhancedDiscovery;
    }

    /**
     * Execute relevant scenarios for discovered elements
     */
    async executeRelevantScenarios(inspector, page, enhancedDiscovery) {
        const scenarioResults = {};

        for (const [category, elements] of Object.entries(enhancedDiscovery)) {
            scenarioResults[category] = [];

            for (const element of elements) {
                if (element.aiEnhanced && element.recommendedScenarios) {
                    const elementScenarios = await Promise.all(
                        element.recommendedScenarios.map(async (scenarioType) => {
                            try {
                                const result = await this.scenarioManager.executeScenario(
                                    scenarioType,
                                    page,
                                    element.name,
                                    element.locator
                                );
                                return {
                                    scenarioType,
                                    ...result
                                };
                            } catch (error) {
                                return {
                                    scenarioType,
                                    success: false,
                                    error: error.message
                                };
                            }
                        })
                    );

                    scenarioResults[category].push({
                        elementName: element.name,
                        scenarios: elementScenarios
                    });
                }
            }
        }

        return scenarioResults;
    }

    /**
     * Generate AI insights for the discovered elements
     */
    async generateAIInsights(inspector, enhancedDiscovery) {
        const insights = {
            recommendations: [],
            warnings: [],
            optimizations: []
        };

        // Analyze element patterns
        const allElements = Object.values(enhancedDiscovery).flat();
        const aiEnhancedElements = allElements.filter(el => el.aiEnhanced);
        const lowConfidenceElements = aiEnhancedElements.filter(el => el.aiConfidence < 0.6);

        if (lowConfidenceElements.length > 0) {
            insights.warnings.push({
                type: 'low_confidence',
                message: `${lowConfidenceElements.length} elements have low AI confidence scores`,
                elements: lowConfidenceElements.map(el => el.name)
            });
        }

        // Check for missing test IDs
        const elementsWithoutTestIds = allElements.filter(el => 
            !el.locator.includes('data-testid') && !el.locator.includes('id')
        );

        if (elementsWithoutTestIds.length > 0) {
            insights.recommendations.push({
                type: 'test_ids',
                message: 'Consider adding data-testid attributes for better element stability',
                count: elementsWithoutTestIds.length
            });
        }

        // Accessibility insights
        try {
            const a11y = await inspector.page.evaluate(() => {
                const issues = { missingAlt: 0, inputsWithoutLabel: 0 };
                document.querySelectorAll('img').forEach(img => { if (!img.alt || !img.alt.trim()) issues.missingAlt++; });
                document.querySelectorAll('input, select, textarea').forEach(inp => {
                    const id = inp.id;
                    const hasLabel = (id && document.querySelector(`label[for="${CSS.escape(id)}"]`)) || inp.closest('label');
                    if (!hasLabel) issues.inputsWithoutLabel++;
                });
                return issues;
            });
            if (a11y.missingAlt > 0) insights.warnings.push({ type: 'accessibility', message: `${a11y.missingAlt} images missing alt text` });
            if (a11y.inputsWithoutLabel > 0) insights.warnings.push({ type: 'accessibility', message: `${a11y.inputsWithoutLabel} inputs without associated labels` });
        } catch {}

        // Performance insights (network-level quick check)
        try {
            const perf = await inspector.page.evaluate(async () => {
                const resources = performance.getEntriesByType('resource') || [];
                const largeImages = resources.filter(r => r.initiatorType === 'img' && r.transferSize > 300 * 1024).length;
                const longScripts = resources.filter(r => r.initiatorType === 'script' && r.duration > 2000).length;
                return { largeImages, longScripts };
            });
            if (perf.largeImages > 0) insights.optimizations.push({ type: 'performance', message: `${perf.largeImages} large images detected (>300KB)` });
            if (perf.longScripts > 0) insights.optimizations.push({ type: 'performance', message: `${perf.longScripts} long-running scripts detected (>2s)` });
        } catch {}

        return insights;
    }

    /**
     * Get recommended scenarios for an element
     */
    getRecommendedScenarios(element, category) {
        const scenarioMap = {
            buttons: ['dynamic-content', 'animation', 'responsive'],
            inputs: ['form-validation', 'dynamic-content', 'responsive'],
            links: ['dynamic-content', 'responsive'],
            forms: ['form-validation', 'dynamic-content'],
            modals: ['modal-dialogs', 'animation'],
            tables: ['dynamic-content', 'responsive'],
            navigation: ['responsive', 'dynamic-content'],
            search: ['dynamic-content', 'form-validation'],
            notifications: ['dynamic-content', 'animation']
        };

        return scenarioMap[category] || ['dynamic-content'];
    }

    /**
     * Count AI enhanced elements
     */
    countAIEnhancedElements(enhancedDiscovery) {
        return Object.values(enhancedDiscovery)
            .flat()
            .filter(el => el.aiEnhanced).length;
    }

    /**
     * Calculate scenario success rate
     */
    calculateScenarioSuccessRate(scenarioResults) {
        const allScenarios = Object.values(scenarioResults)
            .flat()
            .flatMap(category => category.scenarios || [])
            .flat();

        if (allScenarios.length === 0) return 0;

        const successfulScenarios = allScenarios.filter(s => s.success).length;
        return (successfulScenarios / allScenarios.length) * 100;
    }

    /**
     * Calculate overall confidence score
     */
    calculateOverallConfidence(enhancedDiscovery, scenarioResults) {
        const allElements = Object.values(enhancedDiscovery).flat();
        const aiEnhancedElements = allElements.filter(el => el.aiEnhanced);

        if (aiEnhancedElements.length === 0) return 0;

        const avgConfidence = aiEnhancedElements.reduce((sum, el) => sum + el.aiConfidence, 0) / aiEnhancedElements.length;
        const scenarioSuccessRate = this.calculateScenarioSuccessRate(scenarioResults) / 100;

        return (avgConfidence + scenarioSuccessRate) / 2;
    }

    /**
     * Generate page ID for tracking
     */
    generatePageId(page) {
        return `page_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * Clean up resources
     */
    async cleanup() {
        this.activePages.clear();
        if (this.scenarioManager) {
            await this.scenarioManager.cleanup();
        }
        if (this.performanceMonitor) {
            this.performanceMonitor.stop();
        }
    }
}

export default MainProjectIntegration;
