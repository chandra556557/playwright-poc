/**
 * Self-Healing Locator
 * Advanced element location with predictive healing capabilities
 */

import { Logger } from '../utils/logger.js';

export class SelfHealingLocator {
    constructor(inspector, generator, options = {}) {
        this.inspector = inspector;
        this.generator = generator;
        this.options = {
            maxAttempts: 5,
            useMLSimilarity: true,
            enablePredictiveHealing: true,
            adaptiveLearning: true,
            ...options
        };

        this.logger = new Logger();
        this.healingHistory = new Map();
        this.selectorPerformance = new Map();
        this.adaptiveStrategies = new Map();
    }

    /**
     * Find element with self-healing capabilities
     */
    async findElement(primarySelector, elementId, options = {}) {
        const healingOptions = { ...this.options, ...options };
        const startTime = Date.now();

        try {
            this.logger.info(`Starting healing process for element: ${elementId}`);

            // Strategy 1: Try primary selector first
            let element = await this._trySelector(primarySelector, 'primary');
            if (element) {
                this._recordSuccess(primarySelector, Date.now() - startTime);
                return element;
            }

            // Strategy 2: Use cached successful selectors
            element = await this._tryCachedSelectors(elementId, healingOptions);
            if (element) {
                return element;
            }

            // Strategy 3: Generate new selectors from element history
            element = await this._tryHistoryBasedHealing(elementId, healingOptions);
            if (element) {
                return element;
            }

            // Strategy 4: Adaptive healing based on page context
            element = await this._tryAdaptiveHealing(elementId, healingOptions);
            if (element) {
                return element;
            }

            // Strategy 5: Predictive healing using ML patterns
            if (healingOptions.useMLSimilarity) {
                element = await this._tryPredictiveHealing(elementId, healingOptions);
                if (element) {
                    return element;
                }
            }

            // Strategy 6: Fallback to comprehensive search
            element = await this._tryComprehensiveSearch(elementId, healingOptions);
            if (element) {
                return element;
            }

            this.logger.warn(`All healing strategies failed for element: ${elementId}`);
            return null;

        } catch (error) {
            this.logger.error(`Healing process failed for ${elementId}:`, error);
            throw error;
        }
    }

    /**
     * Try a single selector with timeout and error handling
     */
    async _trySelector(selector, strategy = 'unknown', timeout = 2000) {
        try {
            const element = await this.inspector.page.waitForSelector(selector, { 
                timeout,
                state: 'attached'
            });
            
            if (element) {
                this.logger.debug(`Selector succeeded: ${selector} (${strategy})`);
                return element;
            }
        } catch (error) {
            this.logger.debug(`Selector failed: ${selector} (${strategy}) - ${error.message}`);
        }
        
        return null;
    }

    /**
     * Try cached successful selectors
     */
    async _tryCachedSelectors(elementId, options) {
        const cachedSelectors = this._getCachedSelectors(elementId);
        
        for (const { selector, performance } of cachedSelectors) {
            const element = await this._trySelector(selector, 'cached');
            if (element) {
                // Verify element similarity if we have history
                if (await this._verifyElementSimilarity(element, elementId, options)) {
                    this._updateSelectorPerformance(selector, true);
                    this.logger.info(`Element found using cached selector: ${selector}`);
                    return element;
                }
            }
            this._updateSelectorPerformance(selector, false);
        }
        
        return null;
    }

    /**
     * Try healing based on element history
     */
    async _tryHistoryBasedHealing(elementId, options) {
        const elementHistory = this.inspector.elementHistory.get(elementId);
        if (!elementHistory || elementHistory.length === 0) {
            return null;
        }

        const lastSignature = elementHistory[elementHistory.length - 1];
        const candidates = await this.generator.generateSelectors(lastSignature);

        // Sort candidates by performance and confidence
        const optimizedCandidates = this.generator.optimizeSelectors(
            candidates, 
            this._getSelectorPerformanceData()
        );

        for (const candidate of optimizedCandidates.slice(0, options.maxAttempts)) {
            const element = await this._trySelector(candidate.value, 'history-based');
            if (element) {
                // Verify similarity with historical signatures
                const currentSignature = await this.inspector.inspectElement(element);
                const similarity = lastSignature.calculateSimilarity(currentSignature);
                
                if (similarity >= options.similarityThreshold || 0.7) {
                    this.logger.info(`Element healed using history: ${candidate.value} (similarity: ${similarity.toFixed(2)})`);
                    this._recordHealingSuccess(elementId, candidate.value, 'history-based', similarity);
                    return element;
                }
            }
        }

        return null;
    }

    /**
     * Try adaptive healing based on page context
     */
    async _tryAdaptiveHealing(elementId, options) {
        try {
            // Analyze current page context
            const pageContext = await this._analyzePageContext();
            
            // Get adaptive strategies for this context
            const strategies = this._getAdaptiveStrategies(elementId, pageContext);
            
            for (const strategy of strategies) {
                const element = await this._executeAdaptiveStrategy(strategy, elementId, options);
                if (element) {
                    this.logger.info(`Element found using adaptive strategy: ${strategy.name}`);
                    this._recordAdaptiveSuccess(elementId, strategy);
                    return element;
                }
            }

            return null;
        } catch (error) {
            this.logger.debug('Adaptive healing failed:', error.message);
            return null;
        }
    }

    /**
     * Try predictive healing using ML patterns
     */
    async _tryPredictiveHealing(elementId, options) {
        try {
            // Get predictive selectors based on ML patterns
            const predictiveSelectors = await this._getPredictiveSelectors(elementId);
            
            for (const { selector, confidence } of predictiveSelectors) {
                if (confidence < 0.5) continue; // Skip low-confidence predictions
                
                const element = await this._trySelector(selector, 'predictive');
                if (element) {
                    // Verify with ML similarity
                    const isValid = await this._verifyMLSimilarity(element, elementId);
                    if (isValid) {
                        this.logger.info(`Element found using predictive healing: ${selector} (confidence: ${confidence.toFixed(2)})`);
                        this._recordPredictiveSuccess(elementId, selector, confidence);
                        return element;
                    }
                }
            }

            return null;
        } catch (error) {
            this.logger.debug('Predictive healing failed:', error.message);
            return null;
        }
    }

    /**
     * Try comprehensive search as last resort
     */
    async _tryComprehensiveSearch(elementId, options) {
        try {
            this.logger.debug(`Starting comprehensive search for: ${elementId}`);
            
            // Search strategies in order of likelihood
            const searchStrategies = [
                () => this._searchByAttributes(elementId),
                () => this._searchByTextContent(elementId),
                () => this._searchByPosition(elementId),
                () => this._searchByStructure(elementId),
                () => this._searchByStyles(elementId)
            ];

            for (const strategy of searchStrategies) {
                const element = await strategy();
                if (element) {
                    const isValid = await this._verifyElementSimilarity(element, elementId, options);
                    if (isValid) {
                        this.logger.info(`Element found using comprehensive search`);
                        return element;
                    }
                }
            }

            return null;
        } catch (error) {
            this.logger.debug('Comprehensive search failed:', error.message);
            return null;
        }
    }

    /**
     * Verify element similarity with historical data
     */
    async _verifyElementSimilarity(element, elementId, options) {
        try {
            const elementHistory = this.inspector.elementHistory.get(elementId);
            if (!elementHistory || elementHistory.length === 0) {
                return true; // No history to compare against
            }

            const currentSignature = await this.inspector.inspectElement(element);
            const lastSignature = elementHistory[elementHistory.length - 1];
            
            const similarity = lastSignature.calculateSimilarity(currentSignature);
            const threshold = options.similarityThreshold || 0.7;
            
            return similarity >= threshold;
        } catch (error) {
            this.logger.debug('Similarity verification failed:', error.message);
            return false;
        }
    }

    /**
     * Analyze current page context for adaptive healing
     */
    async _analyzePageContext() {
        try {
            const context = await this.inspector.page.evaluate(() => {
                return {
                    url: window.location.href,
                    title: document.title,
                    hasFrameworks: {
                        react: !!window.React,
                        angular: !!window.angular,
                        vue: !!window.Vue,
                        jquery: !!window.jQuery
                    },
                    viewport: {
                        width: window.innerWidth,
                        height: window.innerHeight
                    },
                    theme: document.documentElement.getAttribute('data-theme') || 
                           (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'),
                    language: document.documentElement.lang || 'en',
                    hasModals: document.querySelectorAll('[role="dialog"], .modal').length > 0,
                    hasAnimations: document.getAnimations().length > 0
                };
            });

            return context;
        } catch (error) {
            this.logger.debug('Page context analysis failed:', error.message);
            return {};
        }
    }

    /**
     * Get adaptive strategies for current context
     */
    _getAdaptiveStrategies(elementId, pageContext) {
        const strategies = [];

        // Framework-specific strategies
        if (pageContext.hasFrameworks?.react) {
            strategies.push({
                name: 'react-component',
                priority: 8,
                execute: () => this._searchByReactComponent(elementId)
            });
        }

        if (pageContext.hasFrameworks?.angular) {
            strategies.push({
                name: 'angular-component',
                priority: 8,
                execute: () => this._searchByAngularComponent(elementId)
            });
        }

        // Theme-based strategies
        if (pageContext.theme === 'dark') {
            strategies.push({
                name: 'dark-theme-selectors',
                priority: 6,
                execute: () => this._searchByThemeSelectors(elementId, 'dark')
            });
        }

        // Modal-specific strategies
        if (pageContext.hasModals) {
            strategies.push({
                name: 'modal-aware-search',
                priority: 7,
                execute: () => this._searchInModals(elementId)
            });
        }

        // Animation-aware strategies
        if (pageContext.hasAnimations) {
            strategies.push({
                name: 'animation-aware-search',
                priority: 5,
                execute: () => this._searchWithAnimationWait(elementId)
            });
        }

        // Sort by priority
        return strategies.sort((a, b) => b.priority - a.priority);
    }

    /**
     * Execute adaptive strategy
     */
    async _executeAdaptiveStrategy(strategy, elementId, options) {
        try {
            return await strategy.execute();
        } catch (error) {
            this.logger.debug(`Adaptive strategy ${strategy.name} failed:`, error.message);
            return null;
        }
    }

    /**
     * Search by React component patterns
     */
    async _searchByReactComponent(elementId) {
        return this.inspector.page.evaluate((id) => {
            // Look for React component patterns
            const reactSelectors = [
                `[data-reactid*="${id}"]`,
                `[data-react-component*="${id}"]`,
                `.${id}-component`,
                `[class*="${id}"]`
            ];

            for (const selector of reactSelectors) {
                const element = document.querySelector(selector);
                if (element) return element;
            }
            return null;
        }, elementId);
    }

    /**
     * Search in modals
     */
    async _searchInModals(elementId) {
        return this.inspector.page.evaluate((id) => {
            const modals = document.querySelectorAll('[role="dialog"], .modal, .modal-dialog');
            for (const modal of modals) {
                const element = modal.querySelector(`#${id}, [data-testid="${id}"], .${id}`);
                if (element) return element;
            }
            return null;
        }, elementId);
    }

    /**
     * Get cached selectors sorted by performance
     */
    _getCachedSelectors(elementId) {
        const performance = this.selectorPerformance.get(elementId) || new Map();
        
        return Array.from(performance.entries())
            .map(([selector, perf]) => ({ selector, performance: perf }))
            .sort((a, b) => b.performance.successRate - a.performance.successRate)
            .slice(0, 5); // Top 5 performers
    }

    /**
     * Update selector performance metrics
     */
    _updateSelectorPerformance(selector, success) {
        if (!this.selectorPerformance.has(selector)) {
            this.selectorPerformance.set(selector, {
                attempts: 0,
                successes: 0,
                failures: 0,
                successRate: 0,
                lastUsed: Date.now()
            });
        }

        const perf = this.selectorPerformance.get(selector);
        perf.attempts++;
        perf.lastUsed = Date.now();

        if (success) {
            perf.successes++;
        } else {
            perf.failures++;
        }

        perf.successRate = perf.successes / perf.attempts;
    }

    /**
     * Record successful healing
     */
    _recordHealingSuccess(elementId, selector, strategy, similarity) {
        if (!this.healingHistory.has(elementId)) {
            this.healingHistory.set(elementId, []);
        }

        this.healingHistory.get(elementId).push({
            selector,
            strategy,
            similarity,
            timestamp: Date.now(),
            success: true
        });

        this._updateSelectorPerformance(selector, true);
    }

    /**
     * Record success for primary selector
     */
    _recordSuccess(selector, executionTime) {
        this._updateSelectorPerformance(selector, true);
        this.logger.debug(`Primary selector succeeded: ${selector} (${executionTime}ms)`);
    }

    /**
     * Get selector performance data for optimization
     */
    _getSelectorPerformanceData() {
        const performanceData = {};
        
        for (const [selector, perf] of this.selectorPerformance) {
            performanceData[selector] = {
                successes: perf.successes,
                failures: perf.failures,
                totalTime: perf.attempts * 100 // Estimated time
            };
        }

        return performanceData;
    }

    /**
     * Get predictive selectors (placeholder for ML implementation)
     */
    async _getPredictiveSelectors(elementId) {
        // This would integrate with an ML model
        // For now, return empty array
        return [];
    }

    /**
     * Verify ML similarity (placeholder for ML implementation)
     */
    async _verifyMLSimilarity(element, elementId) {
        // This would use ML-based similarity matching
        // For now, return true
        return true;
    }

    /**
     * Search strategies for comprehensive search
     */
    async _searchByAttributes(elementId) {
        return this.inspector.page.$(`[id*="${elementId}"], [data-testid*="${elementId}"], [name*="${elementId}"]`);
    }

    async _searchByTextContent(elementId) {
        return this.inspector.page.evaluate((id) => {
            const walker = document.createTreeWalker(
                document.body,
                NodeFilter.SHOW_ELEMENT,
                null,
                false
            );

            let node;
            while (node = walker.nextNode()) {
                if (node.textContent && node.textContent.includes(id)) {
                    return node;
                }
            }
            return null;
        }, elementId);
    }

    async _searchByPosition(elementId) {
        // This would search based on historical position data
        return null;
    }

    async _searchByStructure(elementId) {
        // This would search based on DOM structure patterns
        return null;
    }

    async _searchByStyles(elementId) {
        // This would search based on computed styles
        return null;
    }

    /**
     * Record adaptive strategy success
     */
    _recordAdaptiveSuccess(elementId, strategy) {
        if (!this.adaptiveStrategies.has(elementId)) {
            this.adaptiveStrategies.set(elementId, new Map());
        }

        const strategies = this.adaptiveStrategies.get(elementId);
        if (!strategies.has(strategy.name)) {
            strategies.set(strategy.name, { successes: 0, attempts: 0 });
        }

        const strategyPerf = strategies.get(strategy.name);
        strategyPerf.attempts++;
        strategyPerf.successes++;
    }

    /**
     * Record predictive healing success
     */
    _recordPredictiveSuccess(elementId, selector, confidence) {
        this._recordHealingSuccess(elementId, selector, 'predictive', confidence);
    }

    /**
     * Get healing statistics
     */
    getHealingStatistics() {
        const stats = {
            totalElements: this.healingHistory.size,
            totalAttempts: 0,
            successfulHealing: 0,
            strategies: {},
            topSelectors: []
        };

        for (const [elementId, history] of this.healingHistory) {
            stats.totalAttempts += history.length;
            stats.successfulHealing += history.filter(h => h.success).length;

            for (const entry of history) {
                if (!stats.strategies[entry.strategy]) {
                    stats.strategies[entry.strategy] = { attempts: 0, successes: 0 };
                }
                stats.strategies[entry.strategy].attempts++;
                if (entry.success) {
                    stats.strategies[entry.strategy].successes++;
                }
            }
        }

        // Get top performing selectors
        stats.topSelectors = Array.from(this.selectorPerformance.entries())
            .map(([selector, perf]) => ({ selector, ...perf }))
            .sort((a, b) => b.successRate - a.successRate)
            .slice(0, 10);

        return stats;
    }
}
