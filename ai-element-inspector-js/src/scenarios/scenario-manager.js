/**
 * Scenario Manager for AI Element Inspector
 * Handles different testing scenarios and use cases
 */

import { Logger } from '../utils/logger.js';
import { DynamicContentHandler } from './dynamic-content-handler.js';
import { ShadowDOMHandler } from './shadow-dom-handler.js';
import { IframeHandler } from './iframe-handler.js';
import { ResponsiveHandler } from './responsive-handler.js';
import { LazyLoadHandler } from './lazy-load-handler.js';
import { FormValidationHandler } from './form-validation-handler.js';
import { LocalizationHandler } from './localization-handler.js';
import { ThemeHandler } from './theme-handler.js';
import { FeatureFlagHandler } from './feature-flag-handler.js';
import { PWAHandler } from './pwa-handler.js';
import { AnimationHandler } from './animation-handler.js';
import { VirtualScrollHandler } from './virtual-scroll-handler.js';
import { InfiniteScrollHandler } from './infinite-scroll-handler.js';
import { ModalDialogHandler } from './modal-dialog-handler.js';
import { TooltipHandler } from './tooltip-handler.js';

/**
 * Scenario types enumeration
 */
export const ScenarioType = {
    DYNAMIC_CONTENT: 'dynamic-content',
    SHADOW_DOM: 'shadow-dom',
    IFRAME: 'iframe',
    RESPONSIVE: 'responsive',
    LAZY_LOAD: 'lazy-load',
    FORM_VALIDATION: 'form-validation',
    LOCALIZATION: 'localization',
    THEME: 'theme',
    FEATURE_FLAG: 'feature-flag',
    PWA: 'pwa',
    ANIMATION: 'animation',
    VIRTUAL_SCROLL: 'virtual-scroll',
    INFINITE_SCROLL: 'infinite-scroll',
    MODAL_DIALOG: 'modal-dialog',
    TOOLTIP: 'tooltip'
};

/**
 * Scenario configuration interface
 */
export class ScenarioConfig {
    constructor({
        type,
        enabled = true,
        priority = 1,
        timeout = 30000,
        retryAttempts = 3,
        customOptions = {}
    }) {
        this.type = type;
        this.enabled = enabled;
        this.priority = priority;
        this.timeout = timeout;
        this.retryAttempts = retryAttempts;
        this.customOptions = customOptions;
    }
}

/**
 * Scenario execution result
 */
export class ScenarioResult {
    constructor({
        scenarioType,
        success,
        elementFound = false,
        selector = null,
        confidence = 0,
        executionTime = 0,
        attempts = 1,
        error = null,
        metadata = {}
    }) {
        this.scenarioType = scenarioType;
        this.success = success;
        this.elementFound = elementFound;
        this.selector = selector;
        this.confidence = confidence;
        this.executionTime = executionTime;
        this.attempts = attempts;
        this.error = error;
        this.metadata = metadata;
        this.timestamp = new Date().toISOString();
    }
}

/**
 * Main Scenario Manager class
 */
export class ScenarioManager {
    constructor(options = {}) {
        this.options = {
            enableAllScenarios: true,
            defaultTimeout: 30000,
            maxConcurrentScenarios: 5,
            enablePerformanceTracking: true,
            ...options
        };

        this.logger = new Logger();
        this.handlers = new Map();
        this.scenarios = new Map();
        this.executionHistory = [];
        this.performanceMetrics = new Map();
        
        this._initializeHandlers();
        this._setupDefaultScenarios();
    }

    /**
     * Initialize all scenario handlers
     */
    _initializeHandlers() {
        this.handlers.set(ScenarioType.DYNAMIC_CONTENT, new DynamicContentHandler());
        this.handlers.set(ScenarioType.SHADOW_DOM, new ShadowDOMHandler());
        this.handlers.set(ScenarioType.IFRAME, new IframeHandler());
        this.handlers.set(ScenarioType.RESPONSIVE, new ResponsiveHandler());
        this.handlers.set(ScenarioType.LAZY_LOAD, new LazyLoadHandler());
        this.handlers.set(ScenarioType.FORM_VALIDATION, new FormValidationHandler());
        this.handlers.set(ScenarioType.LOCALIZATION, new LocalizationHandler());
        this.handlers.set(ScenarioType.THEME, new ThemeHandler());
        this.handlers.set(ScenarioType.FEATURE_FLAG, new FeatureFlagHandler());
        this.handlers.set(ScenarioType.PWA, new PWAHandler());
        this.handlers.set(ScenarioType.ANIMATION, new AnimationHandler());
        this.handlers.set(ScenarioType.VIRTUAL_SCROLL, new VirtualScrollHandler());
        this.handlers.set(ScenarioType.INFINITE_SCROLL, new InfiniteScrollHandler());
        this.handlers.set(ScenarioType.MODAL_DIALOG, new ModalDialogHandler());
        this.handlers.set(ScenarioType.TOOLTIP, new TooltipHandler());

        this.logger.info(`Initialized ${this.handlers.size} scenario handlers`);
    }

    /**
     * Setup default scenario configurations
     */
    _setupDefaultScenarios() {
        const defaultScenarios = [
            new ScenarioConfig({
                type: ScenarioType.DYNAMIC_CONTENT,
                priority: 5,
                customOptions: {
                    waitForStability: true,
                    stabilityTimeout: 2000
                }
            }),
            new ScenarioConfig({
                type: ScenarioType.SHADOW_DOM,
                priority: 4,
                customOptions: {
                    deepTraversal: true,
                    maxDepth: 5
                }
            }),
            new ScenarioConfig({
                type: ScenarioType.IFRAME,
                priority: 3,
                customOptions: {
                    crossOriginSupport: false,
                    waitForLoad: true
                }
            }),
            new ScenarioConfig({
                type: ScenarioType.RESPONSIVE,
                priority: 2,
                customOptions: {
                    breakpoints: [320, 768, 1024, 1440],
                    testAllBreakpoints: false
                }
            }),
            new ScenarioConfig({
                type: ScenarioType.LAZY_LOAD,
                priority: 4,
                customOptions: {
                    scrollTrigger: true,
                    intersectionThreshold: 0.1
                }
            }),
            new ScenarioConfig({
                type: ScenarioType.FORM_VALIDATION,
                priority: 3,
                customOptions: {
                    triggerValidation: true,
                    checkAllStates: true
                }
            }),
            new ScenarioConfig({
                type: ScenarioType.ANIMATION,
                priority: 2,
                customOptions: {
                    waitForCompletion: true,
                    maxAnimationTime: 5000
                }
            }),
            new ScenarioConfig({
                type: ScenarioType.MODAL_DIALOG,
                priority: 4,
                customOptions: {
                    handleOverlay: true,
                    escapeKeySupport: true
                }
            }),
            new ScenarioConfig({
                type: ScenarioType.TOOLTIP,
                priority: 1,
                customOptions: {
                    hoverTrigger: true,
                    focusTrigger: true
                }
            })
        ];

        for (const scenario of defaultScenarios) {
            this.scenarios.set(scenario.type, scenario);
        }

        this.logger.info(`Configured ${defaultScenarios.length} default scenarios`);
    }

    /**
     * Initialize the scenario manager
     */
    async initialize() {
        try {
            // Initialize all handlers
            for (const [type, handler] of this.handlers) {
                if (typeof handler.initialize === 'function') {
                    await handler.initialize();
                    this.logger.debug(`Initialized handler: ${type}`);
                }
            }

            this.logger.info('Scenario manager initialized successfully');
        } catch (error) {
            this.logger.error('Failed to initialize scenario manager:', error);
            throw error;
        }
    }

    /**
     * Execute a specific scenario
     */
    async executeScenario(scenarioType, page, elementId, selector, options = {}) {
        const startTime = Date.now();
        
        try {
            this.logger.info(`Executing scenario: ${scenarioType} for element: ${elementId}`);

            // Get scenario configuration
            const config = this.scenarios.get(scenarioType);
            if (!config) {
                throw new Error(`Unknown scenario type: ${scenarioType}`);
            }

            if (!config.enabled) {
                return new ScenarioResult({
                    scenarioType,
                    success: false,
                    error: 'Scenario is disabled'
                });
            }

            // Get handler
            const handler = this.handlers.get(scenarioType);
            if (!handler) {
                throw new Error(`No handler found for scenario: ${scenarioType}`);
            }

            // Merge options
            const executionOptions = {
                ...config.customOptions,
                ...options,
                timeout: options.timeout || config.timeout,
                retryAttempts: options.retryAttempts || config.retryAttempts
            };

            // Execute scenario with retries
            let lastError = null;
            let attempts = 0;
            const maxAttempts = executionOptions.retryAttempts;

            while (attempts < maxAttempts) {
                attempts++;
                
                try {
                    const result = await this._executeWithTimeout(
                        handler.execute(page, elementId, selector, executionOptions),
                        executionOptions.timeout
                    );

                    const executionTime = Date.now() - startTime;
                    
                    const scenarioResult = new ScenarioResult({
                        scenarioType,
                        success: true,
                        elementFound: result.elementFound,
                        selector: result.selector,
                        confidence: result.confidence || 1.0,
                        executionTime,
                        attempts,
                        metadata: result.metadata || {}
                    });

                    this._recordExecution(scenarioResult);
                    this.logger.info(`Scenario executed successfully: ${scenarioType} (${executionTime}ms)`);
                    
                    return scenarioResult;

                } catch (error) {
                    lastError = error;
                    this.logger.warn(`Scenario attempt ${attempts} failed: ${scenarioType}`, error.message);
                    
                    if (attempts < maxAttempts) {
                        // Wait before retry
                        await this._delay(1000 * attempts);
                    }
                }
            }

            // All attempts failed
            const executionTime = Date.now() - startTime;
            const scenarioResult = new ScenarioResult({
                scenarioType,
                success: false,
                executionTime,
                attempts,
                error: lastError?.message || 'Unknown error'
            });

            this._recordExecution(scenarioResult);
            this.logger.error(`Scenario failed after ${attempts} attempts: ${scenarioType}`);
            
            return scenarioResult;

        } catch (error) {
            const executionTime = Date.now() - startTime;
            const scenarioResult = new ScenarioResult({
                scenarioType,
                success: false,
                executionTime,
                attempts: 1,
                error: error.message
            });

            this._recordExecution(scenarioResult);
            this.logger.error(`Scenario execution error: ${scenarioType}`, error);
            
            return scenarioResult;
        }
    }

    /**
     * Execute multiple scenarios in parallel
     */
    async executeMultipleScenarios(scenarios, page, elementId, selector, options = {}) {
        try {
            this.logger.info(`Executing ${scenarios.length} scenarios for element: ${elementId}`);

            const promises = scenarios.map(scenarioType => 
                this.executeScenario(scenarioType, page, elementId, selector, options)
            );

            const results = await Promise.allSettled(promises);
            
            const scenarioResults = results.map((result, index) => {
                if (result.status === 'fulfilled') {
                    return result.value;
                } else {
                    return new ScenarioResult({
                        scenarioType: scenarios[index],
                        success: false,
                        error: result.reason?.message || 'Promise rejected'
                    });
                }
            });

            // Find the best result
            const successfulResults = scenarioResults.filter(r => r.success && r.elementFound);
            
            if (successfulResults.length > 0) {
                // Sort by confidence and execution time
                successfulResults.sort((a, b) => {
                    if (a.confidence !== b.confidence) {
                        return b.confidence - a.confidence;
                    }
                    return a.executionTime - b.executionTime;
                });

                this.logger.info(`Best scenario result: ${successfulResults[0].scenarioType}`);
                return {
                    bestResult: successfulResults[0],
                    allResults: scenarioResults,
                    successCount: successfulResults.length,
                    totalCount: scenarios.length
                };
            }

            this.logger.warn(`No successful scenarios for element: ${elementId}`);
            return {
                bestResult: null,
                allResults: scenarioResults,
                successCount: 0,
                totalCount: scenarios.length
            };

        } catch (error) {
            this.logger.error('Failed to execute multiple scenarios:', error);
            throw error;
        }
    }

    /**
     * Get recommended scenarios for an element
     */
    getRecommendedScenarios(elementSignature, context = {}) {
        const recommendations = [];

        // Analyze element characteristics
        const { tagName, attributes, computedStyles, position } = elementSignature;

        // Dynamic content scenarios
        if (this._hasDataAttributes(attributes) || this._hasAsyncIndicators(attributes)) {
            recommendations.push({
                type: ScenarioType.DYNAMIC_CONTENT,
                confidence: 0.8,
                reason: 'Element has dynamic content indicators'
            });
        }

        // Shadow DOM scenarios
        if (this._hasShadowDOMIndicators(tagName, attributes)) {
            recommendations.push({
                type: ScenarioType.SHADOW_DOM,
                confidence: 0.9,
                reason: 'Element likely uses Shadow DOM'
            });
        }

        // Form validation scenarios
        if (this._isFormElement(tagName) || this._hasValidationAttributes(attributes)) {
            recommendations.push({
                type: ScenarioType.FORM_VALIDATION,
                confidence: 0.85,
                reason: 'Element is a form control with validation'
            });
        }

        // Animation scenarios
        if (this._hasAnimationStyles(computedStyles) || this._hasTransitionStyles(computedStyles)) {
            recommendations.push({
                type: ScenarioType.ANIMATION,
                confidence: 0.7,
                reason: 'Element has animation or transition styles'
            });
        }

        // Modal dialog scenarios
        if (this._isModalElement(tagName, attributes, computedStyles)) {
            recommendations.push({
                type: ScenarioType.MODAL_DIALOG,
                confidence: 0.9,
                reason: 'Element appears to be a modal dialog'
            });
        }

        // Lazy load scenarios
        if (this._hasLazyLoadIndicators(tagName, attributes)) {
            recommendations.push({
                type: ScenarioType.LAZY_LOAD,
                confidence: 0.8,
                reason: 'Element has lazy loading indicators'
            });
        }

        // Responsive scenarios
        if (this._hasResponsiveIndicators(attributes, computedStyles)) {
            recommendations.push({
                type: ScenarioType.RESPONSIVE,
                confidence: 0.6,
                reason: 'Element has responsive design indicators'
            });
        }

        // Sort by confidence
        recommendations.sort((a, b) => b.confidence - a.confidence);

        return recommendations.slice(0, 5); // Return top 5 recommendations
    }

    /**
     * Configure a scenario
     */
    configureScenario(scenarioType, config) {
        if (!this.handlers.has(scenarioType)) {
            throw new Error(`Unknown scenario type: ${scenarioType}`);
        }

        this.scenarios.set(scenarioType, new ScenarioConfig(config));
        this.logger.info(`Configured scenario: ${scenarioType}`);
    }

    /**
     * Enable/disable a scenario
     */
    setScenarioEnabled(scenarioType, enabled) {
        const config = this.scenarios.get(scenarioType);
        if (config) {
            config.enabled = enabled;
            this.logger.info(`Scenario ${scenarioType} ${enabled ? 'enabled' : 'disabled'}`);
        }
    }

    /**
     * Get scenario performance metrics
     */
    getPerformanceMetrics() {
        const metrics = {
            totalExecutions: this.executionHistory.length,
            successRate: 0,
            averageExecutionTime: 0,
            scenarioBreakdown: {},
            recentExecutions: this.executionHistory.slice(-10)
        };

        if (this.executionHistory.length > 0) {
            const successful = this.executionHistory.filter(r => r.success).length;
            metrics.successRate = successful / this.executionHistory.length;

            const totalTime = this.executionHistory.reduce((sum, r) => sum + r.executionTime, 0);
            metrics.averageExecutionTime = totalTime / this.executionHistory.length;

            // Scenario breakdown
            const scenarioStats = {};
            for (const result of this.executionHistory) {
                if (!scenarioStats[result.scenarioType]) {
                    scenarioStats[result.scenarioType] = {
                        total: 0,
                        successful: 0,
                        totalTime: 0
                    };
                }
                
                const stats = scenarioStats[result.scenarioType];
                stats.total++;
                if (result.success) stats.successful++;
                stats.totalTime += result.executionTime;
            }

            for (const [type, stats] of Object.entries(scenarioStats)) {
                metrics.scenarioBreakdown[type] = {
                    executions: stats.total,
                    successRate: stats.successful / stats.total,
                    averageTime: stats.totalTime / stats.total
                };
            }
        }

        return metrics;
    }

    // Private helper methods

    async _executeWithTimeout(promise, timeout) {
        return Promise.race([
            promise,
            new Promise((_, reject) => 
                setTimeout(() => reject(new Error('Scenario execution timeout')), timeout)
            )
        ]);
    }

    _delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    _recordExecution(result) {
        this.executionHistory.push(result);
        
        // Keep only last 1000 executions
        if (this.executionHistory.length > 1000) {
            this.executionHistory.splice(0, this.executionHistory.length - 1000);
        }
    }

    // Element analysis helper methods

    _hasDataAttributes(attributes) {
        return Object.keys(attributes).some(key => key.startsWith('data-'));
    }

    _hasAsyncIndicators(attributes) {
        const asyncIndicators = ['loading', 'async', 'defer', 'lazy'];
        return Object.keys(attributes).some(key => 
            asyncIndicators.some(indicator => key.includes(indicator))
        );
    }

    _hasShadowDOMIndicators(tagName, attributes) {
        const customElementPattern = /^[a-z]+-[a-z-]+$/;
        return customElementPattern.test(tagName) || 
               attributes.is || 
               tagName.includes('-');
    }

    _isFormElement(tagName) {
        const formElements = ['input', 'select', 'textarea', 'button', 'form'];
        return formElements.includes(tagName);
    }

    _hasValidationAttributes(attributes) {
        const validationAttrs = ['required', 'pattern', 'min', 'max', 'minlength', 'maxlength'];
        return validationAttrs.some(attr => attributes.hasOwnProperty(attr));
    }

    _hasAnimationStyles(styles) {
        const animationProps = ['animation', 'animationName', 'animationDuration'];
        return animationProps.some(prop => styles[prop] && styles[prop] !== 'none');
    }

    _hasTransitionStyles(styles) {
        const transitionProps = ['transition', 'transitionProperty', 'transitionDuration'];
        return transitionProps.some(prop => styles[prop] && styles[prop] !== 'none');
    }

    _isModalElement(tagName, attributes, styles) {
        return (attributes.role === 'dialog' || 
                attributes.role === 'alertdialog' ||
                tagName === 'dialog' ||
                (styles.position === 'fixed' && styles.zIndex > 1000));
    }

    _hasLazyLoadIndicators(tagName, attributes) {
        return (tagName === 'img' && attributes.loading === 'lazy') ||
               attributes.hasOwnProperty('data-src') ||
               attributes.class?.includes('lazy');
    }

    _hasResponsiveIndicators(attributes, styles) {
        return attributes.class?.includes('responsive') ||
               attributes.class?.includes('col-') ||
               styles.display === 'flex' ||
               styles.display === 'grid';
    }
}
