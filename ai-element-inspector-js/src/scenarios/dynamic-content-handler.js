/**
 * Dynamic Content Handler
 * Handles elements that appear, disappear, or change based on user interactions or time
 */

import { Logger } from '../utils/logger.js';

export class DynamicContentHandler {
    constructor(options = {}) {
        this.options = {
            maxWaitTime: 30000,
            stabilityTimeout: 2000,
            pollInterval: 100,
            maxRetries: 5,
            enableMutationObserver: true,
            enableIntersectionObserver: true,
            ...options
        };

        this.logger = new Logger();
        this.activeObservers = new Map();
    }

    /**
     * Initialize the handler
     */
    async initialize() {
        this.logger.info('Dynamic Content Handler initialized');
    }

    /**
     * Execute dynamic content scenario
     */
    async execute(page, elementId, selector, options = {}) {
        const executionOptions = { ...this.options, ...options };
        
        try {
            this.logger.info(`Executing dynamic content scenario for: ${elementId}`);

            // Strategy 1: Wait for element with stability check
            let result = await this._waitForStableElement(page, selector, executionOptions);
            if (result.elementFound) {
                return result;
            }

            // Strategy 2: Trigger potential interactions that might reveal the element
            result = await this._triggerInteractionsAndWait(page, selector, executionOptions);
            if (result.elementFound) {
                return result;
            }

            // Strategy 3: Wait for DOM mutations and check periodically
            result = await this._waitForMutationsAndCheck(page, selector, executionOptions);
            if (result.elementFound) {
                return result;
            }

            // Strategy 4: Scroll-based content loading
            result = await this._scrollBasedContentLoading(page, selector, executionOptions);
            if (result.elementFound) {
                return result;
            }

            // Strategy 5: Time-based content appearance
            result = await this._timeBasedContentWait(page, selector, executionOptions);
            if (result.elementFound) {
                return result;
            }

            // Strategy 6: Network-based content loading
            result = await this._networkBasedContentWait(page, selector, executionOptions);
            if (result.elementFound) {
                return result;
            }

            return {
                elementFound: false,
                selector: null,
                confidence: 0,
                metadata: {
                    strategiesAttempted: 6,
                    reason: 'Element not found after all dynamic content strategies'
                }
            };

        } catch (error) {
            this.logger.error(`Dynamic content scenario failed for ${elementId}:`, error);
            throw error;
        }
    }

    /**
     * Wait for element with stability check
     */
    async _waitForStableElement(page, selector, options) {
        try {
            this.logger.debug('Strategy 1: Waiting for stable element');

            // Wait for element to appear
            const element = await page.waitForSelector(selector, { 
                timeout: options.maxWaitTime / 2,
                state: 'attached'
            });

            if (!element) {
                return { elementFound: false };
            }

            // Check element stability
            const isStable = await this._checkElementStability(page, element, options.stabilityTimeout);
            
            if (isStable) {
                return {
                    elementFound: true,
                    selector,
                    confidence: 0.9,
                    metadata: {
                        strategy: 'stable-wait',
                        stabilityChecked: true
                    }
                };
            }

            // Element exists but is not stable, wait for stability
            await this._waitForElementStability(page, element, options.stabilityTimeout);
            
            return {
                elementFound: true,
                selector,
                confidence: 0.8,
                metadata: {
                    strategy: 'stability-wait',
                    stabilityAchieved: true
                }
            };

        } catch (error) {
            this.logger.debug('Stable element strategy failed:', error.message);
            return { elementFound: false };
        }
    }

    /**
     * Trigger interactions that might reveal the element
     */
    async _triggerInteractionsAndWait(page, selector, options) {
        try {
            this.logger.debug('Strategy 2: Triggering interactions');

            const interactions = [
                // Click potential trigger elements
                async () => {
                    const triggers = await page.$$('[data-toggle], [data-trigger], .trigger, .show-more, .load-more');
                    for (const trigger of triggers) {
                        try {
                            await trigger.click();
                            await page.waitForTimeout(500);
                            
                            const element = await page.$(selector);
                            if (element) return element;
                        } catch (e) {
                            // Continue to next trigger
                        }
                    }
                    return null;
                },

                // Hover over potential trigger areas
                async () => {
                    const hoverTargets = await page.$$('[data-hover], .hover-trigger, .dropdown-toggle');
                    for (const target of hoverTargets) {
                        try {
                            await target.hover();
                            await page.waitForTimeout(300);
                            
                            const element = await page.$(selector);
                            if (element) return element;
                        } catch (e) {
                            // Continue to next target
                        }
                    }
                    return null;
                },

                // Focus on input elements that might trigger content
                async () => {
                    const inputs = await page.$$('input, textarea, select');
                    for (const input of inputs) {
                        try {
                            await input.focus();
                            await page.waitForTimeout(200);
                            
                            const element = await page.$(selector);
                            if (element) return element;
                        } catch (e) {
                            // Continue to next input
                        }
                    }
                    return null;
                },

                // Simulate keyboard events
                async () => {
                    const keyEvents = ['Tab', 'Enter', 'Escape', 'ArrowDown'];
                    for (const key of keyEvents) {
                        try {
                            await page.keyboard.press(key);
                            await page.waitForTimeout(200);
                            
                            const element = await page.$(selector);
                            if (element) return element;
                        } catch (e) {
                            // Continue to next key
                        }
                    }
                    return null;
                }
            ];

            for (const interaction of interactions) {
                const element = await interaction();
                if (element) {
                    return {
                        elementFound: true,
                        selector,
                        confidence: 0.85,
                        metadata: {
                            strategy: 'interaction-triggered',
                            interactionType: interaction.name || 'unknown'
                        }
                    };
                }
            }

            return { elementFound: false };

        } catch (error) {
            this.logger.debug('Interaction trigger strategy failed:', error.message);
            return { elementFound: false };
        }
    }

    /**
     * Wait for DOM mutations and check periodically
     */
    async _waitForMutationsAndCheck(page, selector, options) {
        try {
            this.logger.debug('Strategy 3: Waiting for DOM mutations');

            return new Promise((resolve) => {
                let resolved = false;
                const timeout = setTimeout(() => {
                    if (!resolved) {
                        resolved = true;
                        resolve({ elementFound: false });
                    }
                }, options.maxWaitTime / 3);

                // Set up mutation observer
                page.evaluate((sel) => {
                    const observer = new MutationObserver((mutations) => {
                        for (const mutation of mutations) {
                            if (mutation.type === 'childList' || mutation.type === 'attributes') {
                                const element = document.querySelector(sel);
                                if (element) {
                                    window.__elementFound = true;
                                    observer.disconnect();
                                    return;
                                }
                            }
                        }
                    });

                    observer.observe(document.body, {
                        childList: true,
                        subtree: true,
                        attributes: true,
                        attributeOldValue: true
                    });

                    // Store observer reference for cleanup
                    window.__mutationObserver = observer;
                }, selector);

                // Poll for element
                const pollInterval = setInterval(async () => {
                    try {
                        const elementFound = await page.evaluate(() => window.__elementFound);
                        if (elementFound) {
                            clearInterval(pollInterval);
                            clearTimeout(timeout);
                            
                            if (!resolved) {
                                resolved = true;
                                resolve({
                                    elementFound: true,
                                    selector,
                                    confidence: 0.8,
                                    metadata: {
                                        strategy: 'mutation-observer',
                                        detectedMutation: true
                                    }
                                });
                            }
                        }
                    } catch (e) {
                        // Continue polling
                    }
                }, options.pollInterval);

                // Cleanup function
                const cleanup = () => {
                    clearInterval(pollInterval);
                    clearTimeout(timeout);
                    page.evaluate(() => {
                        if (window.__mutationObserver) {
                            window.__mutationObserver.disconnect();
                            delete window.__mutationObserver;
                            delete window.__elementFound;
                        }
                    });
                };

                // Ensure cleanup happens
                setTimeout(cleanup, options.maxWaitTime);
            });

        } catch (error) {
            this.logger.debug('Mutation observer strategy failed:', error.message);
            return { elementFound: false };
        }
    }

    /**
     * Scroll-based content loading
     */
    async _scrollBasedContentLoading(page, selector, options) {
        try {
            this.logger.debug('Strategy 4: Scroll-based content loading');

            const viewportHeight = await page.evaluate(() => window.innerHeight);
            const documentHeight = await page.evaluate(() => document.body.scrollHeight);
            
            let currentPosition = 0;
            const scrollStep = viewportHeight * 0.8; // 80% of viewport height
            
            while (currentPosition < documentHeight) {
                // Scroll down
                await page.evaluate((position) => {
                    window.scrollTo(0, position);
                }, currentPosition);

                // Wait for potential lazy loading
                await page.waitForTimeout(500);

                // Check if element appeared
                const element = await page.$(selector);
                if (element) {
                    return {
                        elementFound: true,
                        selector,
                        confidence: 0.75,
                        metadata: {
                            strategy: 'scroll-triggered',
                            scrollPosition: currentPosition
                        }
                    };
                }

                currentPosition += scrollStep;

                // Prevent infinite scrolling
                if (currentPosition > documentHeight * 3) {
                    break;
                }

                // Update document height in case of infinite scroll
                const newDocumentHeight = await page.evaluate(() => document.body.scrollHeight);
                if (newDocumentHeight > documentHeight) {
                    documentHeight = newDocumentHeight;
                }
            }

            // Scroll back to top
            await page.evaluate(() => window.scrollTo(0, 0));
            
            return { elementFound: false };

        } catch (error) {
            this.logger.debug('Scroll-based strategy failed:', error.message);
            return { elementFound: false };
        }
    }

    /**
     * Time-based content appearance
     */
    async _timeBasedContentWait(page, selector, options) {
        try {
            this.logger.debug('Strategy 5: Time-based content wait');

            const checkIntervals = [1000, 2000, 5000, 10000]; // Check at different intervals
            
            for (const interval of checkIntervals) {
                await page.waitForTimeout(interval);
                
                const element = await page.$(selector);
                if (element) {
                    return {
                        elementFound: true,
                        selector,
                        confidence: 0.7,
                        metadata: {
                            strategy: 'time-based',
                            waitTime: interval
                        }
                    };
                }
            }

            return { elementFound: false };

        } catch (error) {
            this.logger.debug('Time-based strategy failed:', error.message);
            return { elementFound: false };
        }
    }

    /**
     * Network-based content loading
     */
    async _networkBasedContentWait(page, selector, options) {
        try {
            this.logger.debug('Strategy 6: Network-based content wait');

            let networkActivityDetected = false;
            
            // Monitor network activity
            const responseHandler = (response) => {
                if (response.url().includes('api') || 
                    response.url().includes('ajax') || 
                    response.headers()['content-type']?.includes('json')) {
                    networkActivityDetected = true;
                }
            };

            page.on('response', responseHandler);

            // Wait for network activity
            const maxWaitForNetwork = 5000;
            const startTime = Date.now();
            
            while (!networkActivityDetected && (Date.now() - startTime) < maxWaitForNetwork) {
                await page.waitForTimeout(100);
            }

            if (networkActivityDetected) {
                // Wait a bit more for content to render
                await page.waitForTimeout(1000);
                
                const element = await page.$(selector);
                if (element) {
                    page.off('response', responseHandler);
                    return {
                        elementFound: true,
                        selector,
                        confidence: 0.8,
                        metadata: {
                            strategy: 'network-triggered',
                            networkActivityDetected: true
                        }
                    };
                }
            }

            page.off('response', responseHandler);
            return { elementFound: false };

        } catch (error) {
            this.logger.debug('Network-based strategy failed:', error.message);
            return { elementFound: false };
        }
    }

    /**
     * Check if element is stable (not moving or changing)
     */
    async _checkElementStability(page, element, timeout) {
        try {
            const initialBounds = await element.boundingBox();
            if (!initialBounds) return false;

            await page.waitForTimeout(timeout);

            const finalBounds = await element.boundingBox();
            if (!finalBounds) return false;

            // Check if position and size are stable
            const positionStable = Math.abs(initialBounds.x - finalBounds.x) < 1 &&
                                 Math.abs(initialBounds.y - finalBounds.y) < 1;
            const sizeStable = Math.abs(initialBounds.width - finalBounds.width) < 1 &&
                             Math.abs(initialBounds.height - finalBounds.height) < 1;

            return positionStable && sizeStable;

        } catch (error) {
            return false;
        }
    }

    /**
     * Wait for element to become stable
     */
    async _waitForElementStability(page, element, timeout) {
        const maxAttempts = 10;
        let attempts = 0;

        while (attempts < maxAttempts) {
            const isStable = await this._checkElementStability(page, element, timeout / maxAttempts);
            if (isStable) {
                return true;
            }
            attempts++;
        }

        return false;
    }

    /**
     * Cleanup method
     */
    async cleanup() {
        // Clean up any active observers
        for (const [pageId, observers] of this.activeObservers) {
            for (const observer of observers) {
                try {
                    await observer.disconnect();
                } catch (e) {
                    // Ignore cleanup errors
                }
            }
        }
        this.activeObservers.clear();
    }
}
