/**
 * AI Element Inspector Core Service
 * Enhanced JavaScript implementation with advanced element detection and self-healing
 */

import { v4 as uuidv4 } from 'uuid';
import crypto from 'crypto-js';
import _ from 'lodash';
import { ElementInspector } from './element-inspector.js';
import { SelectorGenerator } from './selector-generator.js';
import { SelfHealingLocator } from './self-healing-locator.js';
import { MLSimilarityEngine } from './ml-similarity-engine.js';
import { Logger } from '../utils/logger.js';

/**
 * Selector strategies enumeration
 */
export const SelectorStrategy = {
    ID: 'id',
    CLASS: 'class',
    CSS: 'css',
    XPATH: 'xpath',
    TEXT: 'text',
    ROLE: 'role',
    DATA_TESTID: 'data-testid',
    ARIA_LABEL: 'aria-label',
    ARIA_DESCRIBEDBY: 'aria-describedby',
    PSEUDO_ELEMENT: 'pseudo-element',
    CONTAINER_QUERY: 'container-query',
    STRUCTURAL: 'structural',
    STATE_BASED: 'state-based'
};

/**
 * Element signature class for comprehensive element identification
 */
export class ElementSignature {
    constructor({
        tagName,
        textContent = null,
        attributes = {},
        position = {},
        parentTag = null,
        siblingsCount = 0,
        computedStyles = {},
        shadowDomInfo = null,
        ariaRelationships = {},
        pseudoElements = {},
        structuralInfo = {},
        timestamp = new Date().toISOString(),
        confidenceScore = 1.0
    }) {
        this.tagName = tagName;
        this.textContent = textContent;
        this.attributes = attributes;
        this.position = position;
        this.parentTag = parentTag;
        this.siblingsCount = siblingsCount;
        this.computedStyles = computedStyles;
        this.shadowDomInfo = shadowDomInfo;
        this.ariaRelationships = ariaRelationships;
        this.pseudoElements = pseudoElements;
        this.structuralInfo = structuralInfo;
        this.timestamp = timestamp;
        this.confidenceScore = confidenceScore;
    }

    /**
     * Generate a unique hash for the element signature
     */
    generateHash() {
        const signatureData = {
            tagName: this.tagName,
            textContent: this.textContent,
            attributes: this.attributes,
            parentTag: this.parentTag
        };
        
        const signatureString = JSON.stringify(signatureData, Object.keys(signatureData).sort());
        return crypto.MD5(signatureString).toString();
    }

    /**
     * Calculate similarity with another signature
     */
    calculateSimilarity(otherSignature) {
        const weights = {
            tagName: 0.25,
            textContent: 0.20,
            attributes: 0.25,
            position: 0.10,
            structure: 0.10,
            styles: 0.10
        };

        let totalScore = 0;
        let totalWeight = 0;

        // Tag name comparison
        if (this.tagName === otherSignature.tagName) {
            totalScore += weights.tagName;
        }
        totalWeight += weights.tagName;

        // Text content comparison
        if (this.textContent && otherSignature.textContent) {
            const textSimilarity = this._calculateTextSimilarity(this.textContent, otherSignature.textContent);
            totalScore += textSimilarity * weights.textContent;
        } else if (this.textContent === otherSignature.textContent) {
            totalScore += weights.textContent;
        }
        totalWeight += weights.textContent;

        // Attributes comparison
        const attrSimilarity = this._calculateAttributeSimilarity(this.attributes, otherSignature.attributes);
        totalScore += attrSimilarity * weights.attributes;
        totalWeight += weights.attributes;

        // Position comparison (allow for reasonable movement)
        if (this.position && otherSignature.position) {
            const positionSimilarity = this._calculatePositionSimilarity(this.position, otherSignature.position);
            totalScore += positionSimilarity * weights.position;
        }
        totalWeight += weights.position;

        // Structural comparison
        const structuralSimilarity = this._calculateStructuralSimilarity(this.structuralInfo, otherSignature.structuralInfo);
        totalScore += structuralSimilarity * weights.structure;
        totalWeight += weights.structure;

        // Styles comparison
        const stylesSimilarity = this._calculateStylesSimilarity(this.computedStyles, otherSignature.computedStyles);
        totalScore += stylesSimilarity * weights.styles;
        totalWeight += weights.styles;

        return totalWeight > 0 ? totalScore / totalWeight : 0;
    }

    _calculateTextSimilarity(text1, text2) {
        if (!text1 || !text2) return 0;
        
        const len1 = text1.length;
        const len2 = text2.length;
        const maxLen = Math.max(len1, len2);
        
        if (maxLen === 0) return 1;
        
        // Levenshtein distance calculation
        const matrix = Array(len2 + 1).fill().map(() => Array(len1 + 1).fill(0));
        
        for (let i = 0; i <= len1; i++) matrix[0][i] = i;
        for (let j = 0; j <= len2; j++) matrix[j][0] = j;
        
        for (let j = 1; j <= len2; j++) {
            for (let i = 1; i <= len1; i++) {
                const cost = text1[i - 1] === text2[j - 1] ? 0 : 1;
                matrix[j][i] = Math.min(
                    matrix[j - 1][i] + 1,
                    matrix[j][i - 1] + 1,
                    matrix[j - 1][i - 1] + cost
                );
            }
        }
        
        const distance = matrix[len2][len1];
        return 1 - (distance / maxLen);
    }

    _calculateAttributeSimilarity(attrs1, attrs2) {
        const allKeys = new Set([...Object.keys(attrs1), ...Object.keys(attrs2)]);
        if (allKeys.size === 0) return 1;
        
        let matches = 0;
        for (const key of allKeys) {
            if (attrs1[key] === attrs2[key]) {
                matches++;
            }
        }
        
        return matches / allKeys.size;
    }

    _calculatePositionSimilarity(pos1, pos2) {
        if (!pos1 || !pos2) return 0;
        
        const xDiff = Math.abs((pos1.x || 0) - (pos2.x || 0));
        const yDiff = Math.abs((pos1.y || 0) - (pos2.y || 0));
        
        // Allow for 100px movement before considering it different
        const threshold = 100;
        const xSimilarity = Math.max(0, 1 - xDiff / threshold);
        const ySimilarity = Math.max(0, 1 - yDiff / threshold);
        
        return (xSimilarity + ySimilarity) / 2;
    }

    _calculateStructuralSimilarity(struct1, struct2) {
        if (!struct1 || !struct2) return 0;
        
        let score = 0;
        let count = 0;
        
        if (struct1.depth !== undefined && struct2.depth !== undefined) {
            score += struct1.depth === struct2.depth ? 1 : 0;
            count++;
        }
        
        if (struct1.childrenCount !== undefined && struct2.childrenCount !== undefined) {
            const diff = Math.abs(struct1.childrenCount - struct2.childrenCount);
            score += Math.max(0, 1 - diff / 10); // Allow for some variation
            count++;
        }
        
        return count > 0 ? score / count : 0;
    }

    _calculateStylesSimilarity(styles1, styles2) {
        const importantStyles = ['display', 'visibility', 'opacity', 'fontSize', 'color'];
        let matches = 0;
        let total = 0;
        
        for (const style of importantStyles) {
            if (styles1[style] !== undefined && styles2[style] !== undefined) {
                if (styles1[style] === styles2[style]) {
                    matches++;
                }
                total++;
            }
        }
        
        return total > 0 ? matches / total : 0;
    }
}

/**
 * Selector candidate class for potential element selectors
 */
export class SelectorCandidate {
    constructor({
        strategy,
        value,
        confidence,
        specificity,
        stabilityScore = 1.0,
        performance = {},
        context = {}
    }) {
        this.strategy = strategy;
        this.value = value;
        this.confidence = confidence;
        this.specificity = specificity;
        this.stabilityScore = stabilityScore;
        this.performance = performance;
        this.context = context;
        this.id = uuidv4();
    }

    /**
     * Calculate overall score for selector ranking
     */
    getOverallScore() {
        return (this.confidence * 0.4) + 
               (this.specificity / 100 * 0.3) + 
               (this.stabilityScore * 0.3);
    }
}

/**
 * Main AI Element Inspector Service
 */
export class AIElementInspectorService {
    constructor(page, options = {}) {
        this.page = page;
        this.options = {
            enableMLSimilarity: true,
            enableShadowDOM: true,
            enableIframeSupport: true,
            enablePerformanceTracking: true,
            similarityThreshold: 0.7,
            maxHealingAttempts: 5,
            cacheTimeout: 300000, // 5 minutes
            ...options
        };

        this.logger = new Logger();
        this.inspector = new ElementInspector(page, this.options);
        this.generator = new SelectorGenerator(this.options);
        this.healer = new SelfHealingLocator(this.inspector, this.generator, this.options);
        this.mlEngine = new MLSimilarityEngine(this.options);
        
        this.elementRegistry = new Map();
        this.elementHistory = new Map();
        this.performanceMetrics = new Map();
        this.cache = new Map();
        
        this._setupCacheCleanup();
    }

    /**
     * Register an element for tracking and self-healing
     */
    async registerElement(elementId, elementHandle, metadata = {}) {
        try {
            this.logger.info(`Registering element: ${elementId}`);
            
            const signatureData = await this.inspector.inspectElement(elementHandle);
            const signature = new ElementSignature({
                ...signatureData,
                metadata: metadata
            });
            
            // Store in registry
            this.elementRegistry.set(elementId, signature);
            
            // Add to history
            if (!this.elementHistory.has(elementId)) {
                this.elementHistory.set(elementId, []);
            }
            this.elementHistory.get(elementId).push(signature);
            
            // Generate selector candidates
            const candidates = await this.generator.generateSelectors(signature);
            
            // Train ML model if enabled
            if (this.options.enableMLSimilarity) {
                await this.mlEngine.trainOnElement(signature, candidates);
            }
            
            const result = {
                elementId,
                signatureHash: signature.generateHash(),
                selectors: candidates.slice(0, 10).map(c => ({
                    id: c.id,
                    strategy: c.strategy,
                    value: c.value,
                    confidence: c.confidence,
                    specificity: c.specificity,
                    overallScore: c.getOverallScore()
                })),
                timestamp: signature.timestamp,
                metadata: signature.metadata
            };
            
            this.logger.info(`Element registered successfully: ${elementId}`);
            return result;
            
        } catch (error) {
            this.logger.error(`Failed to register element ${elementId}:`, error);
            throw error;
        }
    }

    /**
     * Find element with self-healing capabilities
     */
    async findElementWithHealing(elementId, primarySelector, options = {}) {
        try {
            const startTime = Date.now();
            this.logger.info(`Finding element with healing: ${elementId}`);
            
            const healingOptions = {
                maxAttempts: this.options.maxHealingAttempts,
                useMLSimilarity: this.options.enableMLSimilarity,
                ...options
            };
            
            const element = await this.healer.findElement(primarySelector, elementId, healingOptions);
            
            // Record performance metrics
            const duration = Date.now() - startTime;
            this._recordPerformance(elementId, primarySelector, !!element, duration);
            
            if (element) {
                // Update element signature if found
                const newSignature = await this.inspector.inspectElement(element);
                this._updateElementHistory(elementId, newSignature);
                
                this.logger.info(`Element found successfully: ${elementId}`);
            } else {
                this.logger.warn(`Element not found after healing attempts: ${elementId}`);
            }
            
            return element;
            
        } catch (error) {
            this.logger.error(`Failed to find element ${elementId}:`, error);
            throw error;
        }
    }

    /**
     * Analyze page for changes in registered elements
     */
    async analyzePageChanges() {
        try {
            this.logger.info('Analyzing page changes for registered elements');
            
            const analysis = {
                totalElements: this.elementRegistry.size,
                found: 0,
                missing: 0,
                changed: 0,
                details: [],
                timestamp: new Date().toISOString()
            };
            
            for (const [elementId, signature] of this.elementRegistry) {
                try {
                    const candidates = await this.generator.generateSelectors(signature);
                    let elementFound = false;
                    let bestMatch = null;
                    let bestSimilarity = 0;
                    
                    // Try to find element with top candidates
                    for (const candidate of candidates.slice(0, 5)) {
                        try {
                            const element = await this.page.waitForSelector(candidate.value, { timeout: 1000 });
                            if (element) {
                                const newSignature = await this.inspector.inspectElement(element);
                                const similarity = signature.calculateSimilarity(newSignature);
                                
                                if (similarity > bestSimilarity) {
                                    bestSimilarity = similarity;
                                    bestMatch = {
                                        element,
                                        signature: newSignature,
                                        selector: candidate.value
                                    };
                                }
                                
                                if (similarity > this.options.similarityThreshold) {
                                    elementFound = true;
                                    break;
                                }
                            }
                        } catch (e) {
                            // Selector failed, continue to next
                        }
                    }
                    
                    if (elementFound) {
                        if (bestSimilarity > 0.95) {
                            analysis.found++;
                        } else {
                            analysis.changed++;
                            analysis.details.push({
                                elementId,
                                status: 'changed',
                                similarity: bestSimilarity,
                                selector: bestMatch.selector,
                                changes: this._detectChanges(signature, bestMatch.signature)
                            });
                        }
                    } else {
                        analysis.missing++;
                        analysis.details.push({
                            elementId,
                            status: 'missing',
                            lastSeen: signature.timestamp
                        });
                    }
                    
                } catch (error) {
                    this.logger.error(`Error analyzing element ${elementId}:`, error);
                    analysis.missing++;
                    analysis.details.push({
                        elementId,
                        status: 'error',
                        error: error.message
                    });
                }
            }
            
            this.logger.info(`Page analysis completed: ${analysis.found} found, ${analysis.changed} changed, ${analysis.missing} missing`);
            return analysis;
            
        } catch (error) {
            this.logger.error('Failed to analyze page changes:', error);
            throw error;
        }
    }

    /**
     * Get healing performance report
     */
    getHealingReport() {
        const report = {
            totalElements: this.elementRegistry.size,
            totalAttempts: 0,
            successfulHealing: 0,
            failedHealing: 0,
            averageHealingTime: 0,
            topPerformingSelectors: [],
            frequentlyFailingSelectors: [],
            elementPerformance: [],
            timestamp: new Date().toISOString()
        };

        let totalTime = 0;
        const selectorPerformance = new Map();

        for (const [elementId, metrics] of this.performanceMetrics) {
            report.totalAttempts += metrics.attempts;
            report.successfulHealing += metrics.successes;
            report.failedHealing += metrics.failures;
            totalTime += metrics.totalTime;

            report.elementPerformance.push({
                elementId,
                attempts: metrics.attempts,
                successRate: metrics.attempts > 0 ? metrics.successes / metrics.attempts : 0,
                averageTime: metrics.attempts > 0 ? metrics.totalTime / metrics.attempts : 0,
                lastAttempt: metrics.lastAttempt
            });

            // Aggregate selector performance
            for (const [selector, selectorMetrics] of metrics.selectors) {
                if (!selectorPerformance.has(selector)) {
                    selectorPerformance.set(selector, { successes: 0, failures: 0, totalTime: 0 });
                }
                const perf = selectorPerformance.get(selector);
                perf.successes += selectorMetrics.successes;
                perf.failures += selectorMetrics.failures;
                perf.totalTime += selectorMetrics.totalTime;
            }
        }

        report.averageHealingTime = report.totalAttempts > 0 ? totalTime / report.totalAttempts : 0;

        // Sort selectors by performance
        const sortedSelectors = Array.from(selectorPerformance.entries())
            .map(([selector, perf]) => ({
                selector,
                successRate: (perf.successes + perf.failures) > 0 ? perf.successes / (perf.successes + perf.failures) : 0,
                totalAttempts: perf.successes + perf.failures,
                averageTime: (perf.successes + perf.failures) > 0 ? perf.totalTime / (perf.successes + perf.failures) : 0
            }))
            .filter(item => item.totalAttempts > 0);

        report.topPerformingSelectors = sortedSelectors
            .sort((a, b) => b.successRate - a.successRate)
            .slice(0, 10);

        report.frequentlyFailingSelectors = sortedSelectors
            .sort((a, b) => a.successRate - b.successRate)
            .slice(0, 10);

        return report;
    }

    /**
     * Get element by ID
     */
    getElement(elementId) {
        return this.elementRegistry.get(elementId);
    }

    /**
     * Get element history
     */
    getElementHistory(elementId) {
        return this.elementHistory.get(elementId) || [];
    }

    /**
     * Remove element from tracking
     */
    unregisterElement(elementId) {
        this.elementRegistry.delete(elementId);
        this.elementHistory.delete(elementId);
        this.performanceMetrics.delete(elementId);
        this.logger.info(`Element unregistered: ${elementId}`);
    }

    /**
     * Clear all registered elements
     */
    clearRegistry() {
        this.elementRegistry.clear();
        this.elementHistory.clear();
        this.performanceMetrics.clear();
        this.cache.clear();
        this.logger.info('Element registry cleared');
    }

    // Private methods

    _updateElementHistory(elementId, signature) {
        if (!this.elementHistory.has(elementId)) {
            this.elementHistory.set(elementId, []);
        }
        
        const history = this.elementHistory.get(elementId);
        history.push(signature);
        
        // Keep only last 10 signatures
        if (history.length > 10) {
            history.splice(0, history.length - 10);
        }
    }

    _recordPerformance(elementId, selector, success, duration) {
        if (!this.performanceMetrics.has(elementId)) {
            this.performanceMetrics.set(elementId, {
                attempts: 0,
                successes: 0,
                failures: 0,
                totalTime: 0,
                lastAttempt: null,
                selectors: new Map()
            });
        }

        const metrics = this.performanceMetrics.get(elementId);
        metrics.attempts++;
        metrics.totalTime += duration;
        metrics.lastAttempt = new Date().toISOString();

        if (success) {
            metrics.successes++;
        } else {
            metrics.failures++;
        }

        // Record selector-specific metrics
        if (!metrics.selectors.has(selector)) {
            metrics.selectors.set(selector, {
                successes: 0,
                failures: 0,
                totalTime: 0
            });
        }

        const selectorMetrics = metrics.selectors.get(selector);
        selectorMetrics.totalTime += duration;
        if (success) {
            selectorMetrics.successes++;
        } else {
            selectorMetrics.failures++;
        }
    }

    _detectChanges(oldSignature, newSignature) {
        const changes = [];

        if (oldSignature.tagName !== newSignature.tagName) {
            changes.push({ type: 'tagName', old: oldSignature.tagName, new: newSignature.tagName });
        }

        if (oldSignature.textContent !== newSignature.textContent) {
            changes.push({ type: 'textContent', old: oldSignature.textContent, new: newSignature.textContent });
        }

        // Check attribute changes
        const oldAttrs = oldSignature.attributes;
        const newAttrs = newSignature.attributes;
        const allAttrKeys = new Set([...Object.keys(oldAttrs), ...Object.keys(newAttrs)]);

        for (const key of allAttrKeys) {
            if (oldAttrs[key] !== newAttrs[key]) {
                changes.push({
                    type: 'attribute',
                    attribute: key,
                    old: oldAttrs[key],
                    new: newAttrs[key]
                });
            }
        }

        // Check position changes
        if (oldSignature.position && newSignature.position) {
            const xDiff = Math.abs((oldSignature.position.x || 0) - (newSignature.position.x || 0));
            const yDiff = Math.abs((oldSignature.position.y || 0) - (newSignature.position.y || 0));
            
            if (xDiff > 10 || yDiff > 10) {
                changes.push({
                    type: 'position',
                    old: oldSignature.position,
                    new: newSignature.position
                });
            }
        }

        return changes;
    }

    _setupCacheCleanup() {
        // Clean up cache every 5 minutes
        setInterval(() => {
            const now = Date.now();
            for (const [key, entry] of this.cache) {
                if (now - entry.timestamp > this.options.cacheTimeout) {
                    this.cache.delete(key);
                }
            }
        }, 300000);
    }
}
