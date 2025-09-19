/**
 * Shadow DOM Handler
 * Handles elements within Shadow DOM boundaries
 */

import { Logger } from '../utils/logger.js';

export class ShadowDOMHandler {
    constructor(options = {}) {
        this.options = {
            maxDepth: 5,
            enableDeepTraversal: true,
            timeout: 10000,
            ...options
        };

        this.logger = new Logger();
    }

    async initialize() {
        this.logger.info('Shadow DOM Handler initialized');
    }

    async execute(page, elementId, selector, options = {}) {
        const executionOptions = { ...this.options, ...options };
        
        try {
            this.logger.info(`Executing Shadow DOM scenario for: ${elementId}`);

            // Strategy 1: Direct shadow root traversal
            let result = await this._directShadowTraversal(page, selector, executionOptions);
            if (result.elementFound) return result;

            // Strategy 2: Custom element detection
            result = await this._customElementDetection(page, selector, executionOptions);
            if (result.elementFound) return result;

            // Strategy 3: Deep shadow DOM search
            result = await this._deepShadowSearch(page, selector, executionOptions);
            if (result.elementFound) return result;

            return {
                elementFound: false,
                selector: null,
                confidence: 0,
                metadata: { strategiesAttempted: 3, reason: 'Element not found in Shadow DOM' }
            };

        } catch (error) {
            this.logger.error(`Shadow DOM scenario failed for ${elementId}:`, error);
            throw error;
        }
    }

    async _directShadowTraversal(page, selector, options) {
        try {
            const element = await page.evaluate((sel) => {
                function findInShadowDOM(root, selector) {
                    // Try to find in current root
                    const element = root.querySelector(selector);
                    if (element) return element;

                    // Search in shadow roots
                    const elementsWithShadow = root.querySelectorAll('*');
                    for (const el of elementsWithShadow) {
                        if (el.shadowRoot) {
                            const found = findInShadowDOM(el.shadowRoot, selector);
                            if (found) return found;
                        }
                    }
                    return null;
                }

                return findInShadowDOM(document, sel);
            }, selector);

            if (element) {
                return {
                    elementFound: true,
                    selector,
                    confidence: 0.9,
                    metadata: { strategy: 'direct-shadow-traversal' }
                };
            }

            return { elementFound: false };
        } catch (error) {
            return { elementFound: false };
        }
    }

    async _customElementDetection(page, selector, options) {
        try {
            const element = await page.evaluate((sel) => {
                // Find custom elements that might contain our target
                const customElements = document.querySelectorAll('*');
                for (const el of customElements) {
                    if (el.tagName.includes('-') && el.shadowRoot) {
                        const found = el.shadowRoot.querySelector(sel);
                        if (found) return found;
                    }
                }
                return null;
            }, selector);

            if (element) {
                return {
                    elementFound: true,
                    selector,
                    confidence: 0.85,
                    metadata: { strategy: 'custom-element-detection' }
                };
            }

            return { elementFound: false };
        } catch (error) {
            return { elementFound: false };
        }
    }

    async _deepShadowSearch(page, selector, options) {
        try {
            const element = await page.evaluate((sel, maxDepth) => {
                function deepSearch(root, selector, depth = 0) {
                    if (depth > maxDepth) return null;

                    const element = root.querySelector(selector);
                    if (element) return element;

                    const allElements = root.querySelectorAll('*');
                    for (const el of allElements) {
                        if (el.shadowRoot) {
                            const found = deepSearch(el.shadowRoot, selector, depth + 1);
                            if (found) return found;
                        }
                    }
                    return null;
                }

                return deepSearch(document, sel);
            }, selector, options.maxDepth);

            if (element) {
                return {
                    elementFound: true,
                    selector,
                    confidence: 0.8,
                    metadata: { strategy: 'deep-shadow-search' }
                };
            }

            return { elementFound: false };
        } catch (error) {
            return { elementFound: false };
        }
    }
}
