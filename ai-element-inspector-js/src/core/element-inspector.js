/**
 * Enhanced Element Inspector
 * Core element inspection with advanced capabilities
 */

import { Logger } from '../utils/logger.js';

export class ElementInspector {
    constructor(page, options = {}) {
        this.page = page;
        this.options = {
            enableShadowDOM: true,
            enableIframeSupport: true,
            enablePseudoElements: true,
            enableAriaRelationships: true,
            enablePerformanceMetrics: true,
            maxInspectionDepth: 10,
            ...options
        };

        this.logger = new Logger();
        this.inspectionCache = new Map();
    }

    /**
     * Inspect an element and extract comprehensive signature
     */
    async inspectElement(elementHandle) {
        try {
            const signature = await elementHandle.evaluate((element) => {
                // Basic element information
                const tagName = element.tagName.toLowerCase();
                const textContent = element.textContent?.trim() || null;
                
                // Extract all attributes
                const attributes = {};
                for (const attr of element.attributes) {
                    attributes[attr.name] = attr.value;
                }

                // Get position and dimensions
                const rect = element.getBoundingClientRect();
                const position = {
                    x: rect.x,
                    y: rect.y,
                    width: rect.width,
                    height: rect.height,
                    top: rect.top,
                    left: rect.left,
                    right: rect.right,
                    bottom: rect.bottom
                };

                // Get parent information
                const parentTag = element.parentElement?.tagName.toLowerCase() || null;
                const siblingsCount = element.parentElement?.children.length || 0;

                // Get computed styles (comprehensive set)
                const styles = window.getComputedStyle(element);
                const computedStyles = {
                    display: styles.display,
                    visibility: styles.visibility,
                    opacity: styles.opacity,
                    position: styles.position,
                    zIndex: styles.zIndex,
                    fontSize: styles.fontSize,
                    fontWeight: styles.fontWeight,
                    fontFamily: styles.fontFamily,
                    color: styles.color,
                    backgroundColor: styles.backgroundColor,
                    border: styles.border,
                    borderRadius: styles.borderRadius,
                    margin: styles.margin,
                    padding: styles.padding,
                    width: styles.width,
                    height: styles.height,
                    overflow: styles.overflow,
                    transform: styles.transform,
                    transition: styles.transition,
                    animation: styles.animation,
                    boxShadow: styles.boxShadow,
                    textAlign: styles.textAlign,
                    lineHeight: styles.lineHeight,
                    cursor: styles.cursor
                };

                // Shadow DOM information
                const shadowDomInfo = element.shadowRoot ? {
                    hasShadowRoot: true,
                    mode: element.shadowRoot.mode,
                    childElementCount: element.shadowRoot.childElementCount
                } : null;

                // ARIA relationships
                const ariaRelationships = {
                    labelledBy: attributes['aria-labelledby'] || null,
                    describedBy: attributes['aria-describedby'] || null,
                    controls: attributes['aria-controls'] || null,
                    owns: attributes['aria-owns'] || null,
                    flowTo: attributes['aria-flowto'] || null,
                    role: attributes['role'] || null,
                    label: attributes['aria-label'] || null,
                    expanded: attributes['aria-expanded'] || null,
                    selected: attributes['aria-selected'] || null,
                    checked: attributes['aria-checked'] || null,
                    disabled: attributes['aria-disabled'] || null,
                    hidden: attributes['aria-hidden'] || null
                };

                // Pseudo-elements information
                const pseudoElements = {};
                try {
                    const beforeStyles = window.getComputedStyle(element, '::before');
                    const afterStyles = window.getComputedStyle(element, '::after');
                    
                    if (beforeStyles.content && beforeStyles.content !== 'none') {
                        pseudoElements.before = {
                            content: beforeStyles.content,
                            display: beforeStyles.display,
                            position: beforeStyles.position,
                            width: beforeStyles.width,
                            height: beforeStyles.height
                        };
                    }
                    
                    if (afterStyles.content && afterStyles.content !== 'none') {
                        pseudoElements.after = {
                            content: afterStyles.content,
                            display: afterStyles.display,
                            position: afterStyles.position,
                            width: afterStyles.width,
                            height: afterStyles.height
                        };
                    }
                } catch (e) {
                    // Pseudo-element access might fail in some browsers
                }

                // Helper functions
                function getElementDepth(el) {
                    let depth = 0;
                    let current = el;
                    while (current.parentElement) {
                        depth++;
                        current = current.parentElement;
                    }
                    return depth;
                }

                function isInteractiveElement(el) {
                    const interactiveTags = ['button', 'a', 'input', 'select', 'textarea', 'details', 'summary'];
                    const interactiveRoles = ['button', 'link', 'textbox', 'checkbox', 'radio', 'menuitem', 'tab'];
                    
                    if (interactiveTags.includes(el.tagName.toLowerCase())) return true;
                    if (interactiveRoles.includes(el.getAttribute('role'))) return true;
                    if (el.hasAttribute('onclick') || el.hasAttribute('onmousedown')) return true;
                    if (el.style.cursor === 'pointer') return true;
                    
                    return false;
                }

                function isElementVisible(el) {
                    const style = window.getComputedStyle(el);
                    return style.display !== 'none' && 
                           style.visibility !== 'hidden' && 
                           style.opacity !== '0' &&
                           el.offsetWidth > 0 && 
                           el.offsetHeight > 0;
                }

                function isElementInViewport(el) {
                    const rect = el.getBoundingClientRect();
                    return rect.top >= 0 && 
                           rect.left >= 0 && 
                           rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) && 
                           rect.right <= (window.innerWidth || document.documentElement.clientWidth);
                }

                // Structural information
                const structuralInfo = {
                    depth: getElementDepth(element),
                    childrenCount: element.children.length,
                    hasText: !!element.textContent?.trim(),
                    hasImages: element.querySelectorAll('img').length > 0,
                    hasLinks: element.querySelectorAll('a').length > 0,
                    hasInputs: element.querySelectorAll('input, textarea, select').length > 0,
                    isInteractive: isInteractiveElement(element),
                    isVisible: isElementVisible(element),
                    isInViewport: isElementInViewport(element),
                    hasEventListeners: false // Simplified for now
                };

                // Form-specific information
                const formInfo = {
                    isFormElement: ['form', 'input', 'textarea', 'select', 'button'].includes(element.tagName.toLowerCase()),
                    formId: element.closest('form')?.id || null,
                    inputType: element.type || null,
                    isRequired: element.required || false,
                    hasValidation: element.checkValidity ? !element.checkValidity() : false
                };

                // Performance metrics
                const performanceInfo = {
                    renderTime: performance.now(),
                    isLazyLoaded: attributes.loading === 'lazy' || attributes.hasOwnProperty('data-src'),
                    hasAsyncContent: element.hasAttribute('data-src') || element.hasAttribute('data-lazy')
                };

                return {
                    tagName,
                    textContent,
                    attributes,
                    position,
                    parentTag,
                    siblingsCount,
                    computedStyles,
                    shadowDomInfo,
                    ariaRelationships,
                    pseudoElements,
                    structuralInfo,
                    formInfo,
                    performanceInfo,
                    timestamp: new Date().toISOString()
                };

                // Helper functions (defined within the evaluate context)
                function _getElementDepth(el) {
                    let depth = 0;
                    let parent = el.parentElement;
                    while (parent) {
                        depth++;
                        parent = parent.parentElement;
                    }
                    return depth;
                }

                function _isInteractiveElement(el) {
                    const interactiveTags = ['a', 'button', 'input', 'textarea', 'select', 'details', 'summary'];
                    const interactiveRoles = ['button', 'link', 'menuitem', 'option', 'radio', 'checkbox', 'tab'];
                    
                    return interactiveTags.includes(el.tagName.toLowerCase()) ||
                           interactiveRoles.includes(el.getAttribute('role')) ||
                           el.hasAttribute('onclick') ||
                           el.hasAttribute('tabindex') ||
                           el.style.cursor === 'pointer';
                }

                function _isElementVisible(el) {
                    const style = window.getComputedStyle(el);
                    return style.display !== 'none' &&
                           style.visibility !== 'hidden' &&
                           style.opacity !== '0' &&
                           el.offsetWidth > 0 &&
                           el.offsetHeight > 0;
                }

                function _isElementInViewport(el) {
                    const rect = el.getBoundingClientRect();
                    return rect.top >= 0 &&
                           rect.left >= 0 &&
                           rect.bottom <= window.innerHeight &&
                           rect.right <= window.innerWidth;
                }

                function _hasEventListeners(el) {
                    // This is a simplified check - actual event listener detection is complex
                    const eventAttributes = ['onclick', 'onmouseover', 'onmouseout', 'onfocus', 'onblur', 'onchange', 'onsubmit'];
                    return eventAttributes.some(attr => el.hasAttribute(attr)) ||
                           el.style.cursor === 'pointer';
                }

                function _getFormInfo(el) {
                    const formTags = ['input', 'textarea', 'select', 'button', 'form'];
                    if (!formTags.includes(el.tagName.toLowerCase())) {
                        return null;
                    }

                    const info = {
                        type: el.type || null,
                        name: el.name || null,
                        value: el.value || null,
                        placeholder: el.placeholder || null,
                        required: el.required || false,
                        disabled: el.disabled || false,
                        readonly: el.readOnly || false,
                        form: el.form?.id || null
                    };

                    // Validation information
                    if (el.validity) {
                        info.validation = {
                            valid: el.validity.valid,
                            valueMissing: el.validity.valueMissing,
                            typeMismatch: el.validity.typeMismatch,
                            patternMismatch: el.validity.patternMismatch,
                            tooLong: el.validity.tooLong,
                            tooShort: el.validity.tooShort,
                            rangeUnderflow: el.validity.rangeUnderflow,
                            rangeOverflow: el.validity.rangeOverflow,
                            stepMismatch: el.validity.stepMismatch,
                            badInput: el.validity.badInput,
                            customError: el.validity.customError
                        };
                    }

                    return info;
                }

                function _hasAsyncContent(el) {
                    return el.hasAttribute('data-src') ||
                           el.hasAttribute('data-lazy') ||
                           el.classList.contains('lazy') ||
                           el.classList.contains('async') ||
                           el.loading === 'lazy';
                }
            });

            // Add iframe information if applicable
            if (this.options.enableIframeSupport) {
                signature.iframeInfo = await this._getIframeInfo(elementHandle);
            }

            // Add shadow DOM children information if applicable
            if (this.options.enableShadowDOM && signature.shadowDomInfo?.hasShadowRoot) {
                signature.shadowDomChildren = await this._getShadowDomChildren(elementHandle);
            }

            // Cache the signature
            const elementId = await elementHandle.evaluate(el => el.getAttribute('data-element-id') || Math.random().toString(36));
            this.inspectionCache.set(elementId, signature);

            this.logger.debug(`Element inspected: ${signature.tagName}`, {
                elementId,
                hasAttributes: Object.keys(signature.attributes).length,
                isVisible: signature.structuralInfo.isVisible,
                isInteractive: signature.structuralInfo.isInteractive
            });

            return signature;

        } catch (error) {
            this.logger.error('Failed to inspect element:', error);
            throw error;
        }
    }

    /**
     * Get iframe information for an element
     */
    async _getIframeInfo(elementHandle) {
        try {
            const iframeInfo = await elementHandle.evaluate((element) => {
                // Check if element is inside an iframe
                let currentWindow = window;
                let iframeDepth = 0;
                const iframes = [];

                while (currentWindow !== currentWindow.parent) {
                    iframeDepth++;
                    try {
                        const iframe = currentWindow.frameElement;
                        if (iframe) {
                            iframes.push({
                                src: iframe.src,
                                name: iframe.name,
                                id: iframe.id,
                                width: iframe.width,
                                height: iframe.height
                            });
                        }
                        currentWindow = currentWindow.parent;
                    } catch (e) {
                        // Cross-origin iframe access denied
                        break;
                    }
                }

                return {
                    isInIframe: iframeDepth > 0,
                    iframeDepth,
                    iframes: iframes.reverse() // Reverse to get top-level first
                };
            });

            return iframeInfo;
        } catch (error) {
            return { isInIframe: false, iframeDepth: 0, iframes: [] };
        }
    }

    /**
     * Get shadow DOM children information
     */
    async _getShadowDomChildren(elementHandle) {
        try {
            const shadowInfo = await elementHandle.evaluate((element) => {
                if (!element.shadowRoot) return null;

                const children = Array.from(element.shadowRoot.children).map(child => ({
                    tagName: child.tagName.toLowerCase(),
                    id: child.id,
                    className: child.className,
                    textContent: child.textContent?.trim()?.substring(0, 100) // Limit text length
                }));

                return {
                    childrenCount: children.length,
                    children: children.slice(0, 10) // Limit to first 10 children
                };
            });

            return shadowInfo;
        } catch (error) {
            return null;
        }
    }

    /**
     * Compare two element signatures for similarity
     */
    compareSignatures(signature1, signature2) {
        if (!signature1 || !signature2) return 0;

        const weights = {
            tagName: 0.25,
            textContent: 0.15,
            attributes: 0.20,
            position: 0.10,
            structure: 0.15,
            styles: 0.10,
            aria: 0.05
        };

        let totalScore = 0;
        let totalWeight = 0;

        // Tag name comparison
        if (signature1.tagName === signature2.tagName) {
            totalScore += weights.tagName;
        }
        totalWeight += weights.tagName;

        // Text content comparison
        if (signature1.textContent && signature2.textContent) {
            const textSimilarity = this._calculateTextSimilarity(signature1.textContent, signature2.textContent);
            totalScore += textSimilarity * weights.textContent;
        } else if (signature1.textContent === signature2.textContent) {
            totalScore += weights.textContent;
        }
        totalWeight += weights.textContent;

        // Attributes comparison
        const attrSimilarity = this._calculateAttributeSimilarity(signature1.attributes, signature2.attributes);
        totalScore += attrSimilarity * weights.attributes;
        totalWeight += weights.attributes;

        // Position comparison
        if (signature1.position && signature2.position) {
            const positionSimilarity = this._calculatePositionSimilarity(signature1.position, signature2.position);
            totalScore += positionSimilarity * weights.position;
        }
        totalWeight += weights.position;

        // Structural comparison
        const structuralSimilarity = this._calculateStructuralSimilarity(
            signature1.structuralInfo, 
            signature2.structuralInfo
        );
        totalScore += structuralSimilarity * weights.structure;
        totalWeight += weights.structure;

        // Styles comparison
        const stylesSimilarity = this._calculateStylesSimilarity(
            signature1.computedStyles, 
            signature2.computedStyles
        );
        totalScore += stylesSimilarity * weights.styles;
        totalWeight += weights.styles;

        // ARIA relationships comparison
        const ariaSimilarity = this._calculateAriaSimilarity(
            signature1.ariaRelationships, 
            signature2.ariaRelationships
        );
        totalScore += ariaSimilarity * weights.aria;
        totalWeight += weights.aria;

        return totalWeight > 0 ? totalScore / totalWeight : 0;
    }

    /**
     * Calculate text similarity using Levenshtein distance
     */
    _calculateTextSimilarity(text1, text2) {
        if (!text1 || !text2) return 0;
        if (text1 === text2) return 1;

        const len1 = text1.length;
        const len2 = text2.length;
        const maxLen = Math.max(len1, len2);

        if (maxLen === 0) return 1;

        // Simple character-by-character comparison for performance
        let matches = 0;
        const minLen = Math.min(len1, len2);
        
        for (let i = 0; i < minLen; i++) {
            if (text1[i] === text2[i]) {
                matches++;
            }
        }

        return matches / maxLen;
    }

    /**
     * Calculate attribute similarity
     */
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

    /**
     * Calculate position similarity
     */
    _calculatePositionSimilarity(pos1, pos2) {
        if (!pos1 || !pos2) return 0;

        const xDiff = Math.abs((pos1.x || 0) - (pos2.x || 0));
        const yDiff = Math.abs((pos1.y || 0) - (pos2.y || 0));
        const widthDiff = Math.abs((pos1.width || 0) - (pos2.width || 0));
        const heightDiff = Math.abs((pos1.height || 0) - (pos2.height || 0));

        // Allow for reasonable movement and size changes
        const threshold = 50;
        const xSimilarity = Math.max(0, 1 - xDiff / threshold);
        const ySimilarity = Math.max(0, 1 - yDiff / threshold);
        const widthSimilarity = Math.max(0, 1 - widthDiff / threshold);
        const heightSimilarity = Math.max(0, 1 - heightDiff / threshold);

        return (xSimilarity + ySimilarity + widthSimilarity + heightSimilarity) / 4;
    }

    /**
     * Calculate structural similarity
     */
    _calculateStructuralSimilarity(struct1, struct2) {
        if (!struct1 || !struct2) return 0;

        let score = 0;
        let count = 0;

        const comparisons = [
            ['depth', 1],
            ['childrenCount', 5],
            ['hasText', 1],
            ['hasImages', 1],
            ['hasLinks', 1],
            ['hasInputs', 1],
            ['isInteractive', 1],
            ['isVisible', 1]
        ];

        for (const [prop, tolerance] of comparisons) {
            if (struct1[prop] !== undefined && struct2[prop] !== undefined) {
                if (typeof struct1[prop] === 'boolean') {
                    score += struct1[prop] === struct2[prop] ? 1 : 0;
                } else {
                    const diff = Math.abs(struct1[prop] - struct2[prop]);
                    score += Math.max(0, 1 - diff / tolerance);
                }
                count++;
            }
        }

        return count > 0 ? score / count : 0;
    }

    /**
     * Calculate styles similarity
     */
    _calculateStylesSimilarity(styles1, styles2) {
        const importantStyles = [
            'display', 'visibility', 'opacity', 'position', 'fontSize', 
            'fontWeight', 'color', 'backgroundColor', 'border', 'margin', 'padding'
        ];

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

    /**
     * Calculate ARIA relationships similarity
     */
    _calculateAriaSimilarity(aria1, aria2) {
        const ariaProps = ['role', 'label', 'labelledBy', 'describedBy', 'expanded', 'selected', 'checked'];
        
        let matches = 0;
        let total = 0;

        for (const prop of ariaProps) {
            if (aria1[prop] !== undefined && aria2[prop] !== undefined) {
                if (aria1[prop] === aria2[prop]) {
                    matches++;
                }
                total++;
            }
        }

        return total > 0 ? matches / total : 0;
    }

    /**
     * Clear inspection cache
     */
    clearCache() {
        this.inspectionCache.clear();
        this.logger.debug('Inspection cache cleared');
    }

    /**
     * Get cached signature
     */
    getCachedSignature(elementId) {
        return this.inspectionCache.get(elementId);
    }
}
