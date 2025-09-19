/**
 * Enhanced Selector Generator
 * Generates multiple selector candidates with advanced strategies
 */

import { SelectorStrategy, SelectorCandidate } from './ai-element-inspector.js';
import { Logger } from '../utils/logger.js';

export class SelectorGenerator {
    constructor(options = {}) {
        this.options = {
            enableModernCSS: true,
            enableStructuralSelectors: true,
            enableStateBasedSelectors: true,
            enableContainerQueries: true,
            maxSelectorComplexity: 5,
            ...options
        };

        this.logger = new Logger();
    }

    /**
     * Generate multiple selector candidates for an element signature
     */
    async generateSelectors(signature) {
        try {
            const candidates = [];

            // Strategy 1: ID selector (highest priority)
            if (signature.attributes.id) {
                candidates.push(new SelectorCandidate({
                    strategy: SelectorStrategy.ID,
                    value: `#${signature.attributes.id}`,
                    confidence: 0.95,
                    specificity: 100,
                    context: { attributeBased: true }
                }));
            }

            // Strategy 2: Data-testid selector (high priority for testing)
            if (signature.attributes['data-testid']) {
                candidates.push(new SelectorCandidate({
                    strategy: SelectorStrategy.DATA_TESTID,
                    value: `[data-testid="${signature.attributes['data-testid']}"]`,
                    confidence: 0.92,
                    specificity: 95,
                    context: { testingOptimized: true }
                }));
            }

            // Strategy 3: ARIA label selector
            if (signature.attributes['aria-label']) {
                candidates.push(new SelectorCandidate({
                    strategy: SelectorStrategy.ARIA_LABEL,
                    value: `[aria-label="${signature.attributes['aria-label']}"]`,
                    confidence: 0.88,
                    specificity: 85,
                    context: { accessibilityBased: true }
                }));
            }

            // Strategy 4: Role-based selector
            if (signature.ariaRelationships.role) {
                candidates.push(new SelectorCandidate({
                    strategy: SelectorStrategy.ROLE,
                    value: `[role="${signature.ariaRelationships.role}"]`,
                    confidence: 0.80,
                    specificity: 70,
                    context: { semanticBased: true }
                }));
            }

            // Strategy 5: Class-based selectors
            if (signature.attributes.class) {
                const classSelectors = this._generateClassSelectors(signature);
                candidates.push(...classSelectors);
            }

            // Strategy 6: Text content selectors
            if (signature.textContent && signature.textContent.length > 2) {
                const textSelectors = this._generateTextSelectors(signature);
                candidates.push(...textSelectors);
            }

            // Strategy 7: Structural selectors
            if (this.options.enableStructuralSelectors) {
                const structuralSelectors = this._generateStructuralSelectors(signature);
                candidates.push(...structuralSelectors);
            }

            // Strategy 8: State-based selectors
            if (this.options.enableStateBasedSelectors) {
                const stateSelectors = this._generateStateBasedSelectors(signature);
                candidates.push(...stateSelectors);
            }

            // Strategy 9: ARIA relationship selectors
            const ariaSelectors = this._generateAriaRelationshipSelectors(signature);
            candidates.push(...ariaSelectors);

            // Strategy 10: Form-specific selectors
            if (signature.formInfo) {
                const formSelectors = this._generateFormSelectors(signature);
                candidates.push(...formSelectors);
            }

            // Strategy 11: Pseudo-element aware selectors
            if (signature.pseudoElements && Object.keys(signature.pseudoElements).length > 0) {
                const pseudoSelectors = this._generatePseudoElementSelectors(signature);
                candidates.push(...pseudoSelectors);
            }

            // Strategy 12: XPath selectors (fallback)
            const xpathSelectors = this._generateXPathSelectors(signature);
            candidates.push(...xpathSelectors);

            // Sort candidates by overall score
            candidates.sort((a, b) => b.getOverallScore() - a.getOverallScore());

            this.logger.debug(`Generated ${candidates.length} selector candidates`);
            return candidates;

        } catch (error) {
            this.logger.error('Failed to generate selectors:', error);
            throw error;
        }
    }

    /**
     * Generate class-based selectors
     */
    _generateClassSelectors(signature) {
        const candidates = [];
        const classes = signature.attributes.class.split(/\s+/).filter(c => c.length > 0);

        if (classes.length === 0) return candidates;

        // Single class selector
        if (classes.length === 1) {
            candidates.push(new SelectorCandidate({
                strategy: SelectorStrategy.CLASS,
                value: `${signature.tagName}.${classes[0]}`,
                confidence: 0.75,
                specificity: 60,
                context: { singleClass: true }
            }));
        }

        // Multiple class selector (up to 3 classes)
        if (classes.length > 1) {
            const classSelector = classes.slice(0, 3).join('.');
            candidates.push(new SelectorCandidate({
                strategy: SelectorStrategy.CLASS,
                value: `${signature.tagName}.${classSelector}`,
                confidence: 0.80,
                specificity: 70,
                context: { multipleClasses: true, classCount: classes.length }
            }));
        }

        // Most specific class (longest or most unique)
        const specificClass = classes.reduce((longest, current) => 
            current.length > longest.length ? current : longest
        );
        
        if (specificClass !== classes[0]) {
            candidates.push(new SelectorCandidate({
                strategy: SelectorStrategy.CLASS,
                value: `${signature.tagName}.${specificClass}`,
                confidence: 0.70,
                specificity: 65,
                context: { specificClass: true }
            }));
        }

        return candidates;
    }

    /**
     * Generate text content selectors
     */
    _generateTextSelectors(signature) {
        const candidates = [];
        const text = signature.textContent.trim();

        if (text.length < 3 || text.length > 100) return candidates;

        // Exact text match
        candidates.push(new SelectorCandidate({
            strategy: SelectorStrategy.TEXT,
            value: `text="${text}"`,
            confidence: 0.65,
            specificity: 40,
            context: { exactText: true, textLength: text.length }
        }));

        // Partial text match (first 30 characters)
        if (text.length > 30) {
            const partialText = text.substring(0, 30);
            candidates.push(new SelectorCandidate({
                strategy: SelectorStrategy.TEXT,
                value: `text*="${partialText}"`,
                confidence: 0.55,
                specificity: 35,
                context: { partialText: true }
            }));
        }

        // Text with tag name
        candidates.push(new SelectorCandidate({
            strategy: SelectorStrategy.TEXT,
            value: `${signature.tagName}:has-text("${text}")`,
            confidence: 0.70,
            specificity: 45,
            context: { tagWithText: true }
        }));

        return candidates;
    }

    /**
     * Generate structural selectors
     */
    _generateStructuralSelectors(signature) {
        const candidates = [];

        // nth-child selector
        if (signature.structuralInfo.depth > 0 && signature.siblingsCount > 1) {
            // This would need to be calculated based on element position among siblings
            candidates.push(new SelectorCandidate({
                strategy: SelectorStrategy.STRUCTURAL,
                value: `${signature.parentTag} > ${signature.tagName}:nth-child(n)`, // Placeholder
                confidence: 0.60,
                specificity: 50,
                context: { structural: true, type: 'nth-child' }
            }));
        }

        // First/last child selectors
        if (signature.siblingsCount > 1) {
            candidates.push(new SelectorCandidate({
                strategy: SelectorStrategy.STRUCTURAL,
                value: `${signature.parentTag} > ${signature.tagName}:first-child`,
                confidence: 0.65,
                specificity: 55,
                context: { structural: true, type: 'first-child' }
            }));

            candidates.push(new SelectorCandidate({
                strategy: SelectorStrategy.STRUCTURAL,
                value: `${signature.parentTag} > ${signature.tagName}:last-child`,
                confidence: 0.65,
                specificity: 55,
                context: { structural: true, type: 'last-child' }
            }));
        }

        // Only child selector
        if (signature.siblingsCount === 1) {
            candidates.push(new SelectorCandidate({
                strategy: SelectorStrategy.STRUCTURAL,
                value: `${signature.parentTag} > ${signature.tagName}:only-child`,
                confidence: 0.85,
                specificity: 80,
                context: { structural: true, type: 'only-child' }
            }));
        }

        return candidates;
    }

    /**
     * Generate state-based selectors
     */
    _generateStateBasedSelectors(signature) {
        const candidates = [];

        // Form element states
        if (signature.formInfo) {
            const states = [];
            
            if (signature.formInfo.disabled) states.push(':disabled');
            if (signature.formInfo.required) states.push(':required');
            if (signature.formInfo.readonly) states.push(':read-only');
            if (signature.formInfo.validation && signature.formInfo.validation.valid === false) {
                states.push(':invalid');
            }

            for (const state of states) {
                candidates.push(new SelectorCandidate({
                    strategy: SelectorStrategy.STATE_BASED,
                    value: `${signature.tagName}${state}`,
                    confidence: 0.75,
                    specificity: 60,
                    context: { stateBased: true, state: state.substring(1) }
                }));
            }
        }

        // Visibility states
        if (signature.structuralInfo.isVisible) {
            candidates.push(new SelectorCandidate({
                strategy: SelectorStrategy.STATE_BASED,
                value: `${signature.tagName}:visible`,
                confidence: 0.60,
                specificity: 40,
                context: { stateBased: true, state: 'visible' }
            }));
        }

        // Interactive states
        if (signature.structuralInfo.isInteractive) {
            candidates.push(new SelectorCandidate({
                strategy: SelectorStrategy.STATE_BASED,
                value: `${signature.tagName}:enabled`,
                confidence: 0.65,
                specificity: 45,
                context: { stateBased: true, state: 'enabled' }
            }));
        }

        return candidates;
    }

    /**
     * Generate ARIA relationship selectors
     */
    _generateAriaRelationshipSelectors(signature) {
        const candidates = [];
        const aria = signature.ariaRelationships;

        // ARIA described-by
        if (aria.describedBy) {
            candidates.push(new SelectorCandidate({
                strategy: SelectorStrategy.ARIA_DESCRIBEDBY,
                value: `[aria-describedby="${aria.describedBy}"]`,
                confidence: 0.82,
                specificity: 75,
                context: { ariaRelationship: true, type: 'describedby' }
            }));
        }

        // ARIA labelled-by
        if (aria.labelledBy) {
            candidates.push(new SelectorCandidate({
                strategy: SelectorStrategy.ARIA_LABEL,
                value: `[aria-labelledby="${aria.labelledBy}"]`,
                confidence: 0.85,
                specificity: 80,
                context: { ariaRelationship: true, type: 'labelledby' }
            }));
        }

        // ARIA controls
        if (aria.controls) {
            candidates.push(new SelectorCandidate({
                strategy: SelectorStrategy.ROLE,
                value: `[aria-controls="${aria.controls}"]`,
                confidence: 0.78,
                specificity: 70,
                context: { ariaRelationship: true, type: 'controls' }
            }));
        }

        // ARIA expanded state
        if (aria.expanded !== null) {
            candidates.push(new SelectorCandidate({
                strategy: SelectorStrategy.STATE_BASED,
                value: `[aria-expanded="${aria.expanded}"]`,
                confidence: 0.70,
                specificity: 60,
                context: { ariaState: true, state: 'expanded' }
            }));
        }

        return candidates;
    }

    /**
     * Generate form-specific selectors
     */
    _generateFormSelectors(signature) {
        const candidates = [];
        const form = signature.formInfo;

        if (!form) return candidates;

        // Name attribute
        if (form.name) {
            candidates.push(new SelectorCandidate({
                strategy: SelectorStrategy.CSS,
                value: `${signature.tagName}[name="${form.name}"]`,
                confidence: 0.88,
                specificity: 85,
                context: { formElement: true, attribute: 'name' }
            }));
        }

        // Type attribute for inputs
        if (form.type) {
            candidates.push(new SelectorCandidate({
                strategy: SelectorStrategy.CSS,
                value: `${signature.tagName}[type="${form.type}"]`,
                confidence: 0.70,
                specificity: 55,
                context: { formElement: true, attribute: 'type' }
            }));
        }

        // Placeholder attribute
        if (form.placeholder) {
            candidates.push(new SelectorCandidate({
                strategy: SelectorStrategy.CSS,
                value: `${signature.tagName}[placeholder="${form.placeholder}"]`,
                confidence: 0.75,
                specificity: 60,
                context: { formElement: true, attribute: 'placeholder' }
            }));
        }

        // Form association
        if (form.form) {
            candidates.push(new SelectorCandidate({
                strategy: SelectorStrategy.CSS,
                value: `form#${form.form} ${signature.tagName}`,
                confidence: 0.80,
                specificity: 70,
                context: { formElement: true, formAssociated: true }
            }));
        }

        return candidates;
    }

    /**
     * Generate pseudo-element aware selectors
     */
    _generatePseudoElementSelectors(signature) {
        const candidates = [];
        const pseudo = signature.pseudoElements;

        // If element has ::before or ::after content, create selectors that account for this
        if (pseudo.before || pseudo.after) {
            candidates.push(new SelectorCandidate({
                strategy: SelectorStrategy.PSEUDO_ELEMENT,
                value: `${signature.tagName}:has-pseudo-element`,
                confidence: 0.60,
                specificity: 45,
                context: { 
                    pseudoElement: true, 
                    hasBefore: !!pseudo.before,
                    hasAfter: !!pseudo.after 
                }
            }));
        }

        return candidates;
    }

    /**
     * Generate XPath selectors as fallback
     */
    _generateXPathSelectors(signature) {
        const candidates = [];

        // Simple XPath by tag
        candidates.push(new SelectorCandidate({
            strategy: SelectorStrategy.XPATH,
            value: `//${signature.tagName}`,
            confidence: 0.30,
            specificity: 20,
            context: { xpath: true, type: 'simple' }
        }));

        // XPath with attributes
        if (signature.attributes.class) {
            const classes = signature.attributes.class.split(/\s+/);
            if (classes.length > 0) {
                candidates.push(new SelectorCandidate({
                    strategy: SelectorStrategy.XPATH,
                    value: `//${signature.tagName}[contains(@class, '${classes[0]}')]`,
                    confidence: 0.40,
                    specificity: 30,
                    context: { xpath: true, type: 'class-based' }
                }));
            }
        }

        // XPath with text content
        if (signature.textContent && signature.textContent.length < 50) {
            candidates.push(new SelectorCandidate({
                strategy: SelectorStrategy.XPATH,
                value: `//${signature.tagName}[contains(text(), '${signature.textContent.substring(0, 30)}')]`,
                confidence: 0.45,
                specificity: 35,
                context: { xpath: true, type: 'text-based' }
            }));
        }

        // XPath with parent context
        if (signature.parentTag) {
            candidates.push(new SelectorCandidate({
                strategy: SelectorStrategy.XPATH,
                value: `//${signature.parentTag}/${signature.tagName}`,
                confidence: 0.50,
                specificity: 40,
                context: { xpath: true, type: 'parent-child' }
            }));
        }

        return candidates;
    }

    /**
     * Optimize selector performance based on historical data
     */
    optimizeSelectors(candidates, performanceData = {}) {
        return candidates.map(candidate => {
            const selectorPerf = performanceData[candidate.value];
            if (selectorPerf) {
                // Adjust confidence based on historical performance
                const successRate = selectorPerf.successes / (selectorPerf.successes + selectorPerf.failures);
                const avgTime = selectorPerf.totalTime / (selectorPerf.successes + selectorPerf.failures);
                
                // Boost confidence for fast, reliable selectors
                if (successRate > 0.8 && avgTime < 100) {
                    candidate.confidence = Math.min(0.98, candidate.confidence + 0.1);
                    candidate.stabilityScore = Math.min(1.0, candidate.stabilityScore + 0.1);
                }
                
                // Reduce confidence for slow or unreliable selectors
                if (successRate < 0.5 || avgTime > 1000) {
                    candidate.confidence = Math.max(0.1, candidate.confidence - 0.2);
                    candidate.stabilityScore = Math.max(0.1, candidate.stabilityScore - 0.2);
                }

                candidate.performance = {
                    successRate,
                    averageTime: avgTime,
                    totalAttempts: selectorPerf.successes + selectorPerf.failures
                };
            }

            return candidate;
        });
    }
}
