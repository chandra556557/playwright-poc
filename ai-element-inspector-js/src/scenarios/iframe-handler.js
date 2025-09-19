/**
 * Iframe Handler
 * Handles elements within iframe boundaries
 */

import { Logger } from '../utils/logger.js';

export class IframeHandler {
    constructor(options = {}) {
        this.options = {
            waitForLoad: true,
            crossOriginSupport: false,
            timeout: 15000,
            ...options
        };
        this.logger = new Logger();
    }

    async initialize() {
        this.logger.info('Iframe Handler initialized');
    }

    async execute(page, elementId, selector, options = {}) {
        try {
            // Get all iframes
            const iframes = await page.$$('iframe');
            
            for (const iframe of iframes) {
                try {
                    const frame = await iframe.contentFrame();
                    if (frame) {
                        const element = await frame.$(selector);
                        if (element) {
                            return {
                                elementFound: true,
                                selector,
                                confidence: 0.9,
                                metadata: { strategy: 'iframe-search', frameFound: true }
                            };
                        }
                    }
                } catch (e) {
                    // Cross-origin or other iframe access issues
                    continue;
                }
            }

            return { elementFound: false };
        } catch (error) {
            throw error;
        }
    }
}

/**
 * Responsive Handler
 * Handles elements that change based on viewport size
 */
export class ResponsiveHandler {
    constructor(options = {}) {
        this.options = {
            breakpoints: [320, 768, 1024, 1440],
            testAllBreakpoints: false,
            timeout: 5000,
            ...options
        };
        this.logger = new Logger();
    }

    async initialize() {
        this.logger.info('Responsive Handler initialized');
    }

    async execute(page, elementId, selector, options = {}) {
        try {
            const originalViewport = page.viewportSize();
            
            for (const breakpoint of this.options.breakpoints) {
                await page.setViewportSize({ width: breakpoint, height: 800 });
                await page.waitForTimeout(500); // Allow for responsive changes
                
                const element = await page.$(selector);
                if (element) {
                    // Restore original viewport
                    if (originalViewport) {
                        await page.setViewportSize(originalViewport);
                    }
                    
                    return {
                        elementFound: true,
                        selector,
                        confidence: 0.8,
                        metadata: { 
                            strategy: 'responsive-breakpoint', 
                            breakpoint,
                            originalViewport 
                        }
                    };
                }
            }

            // Restore original viewport
            if (originalViewport) {
                await page.setViewportSize(originalViewport);
            }

            return { elementFound: false };
        } catch (error) {
            throw error;
        }
    }
}

/**
 * Lazy Load Handler
 * Handles elements that load asynchronously based on scroll or intersection
 */
export class LazyLoadHandler {
    constructor(options = {}) {
        this.options = {
            scrollTrigger: true,
            intersectionThreshold: 0.1,
            timeout: 10000,
            ...options
        };
        this.logger = new Logger();
    }

    async initialize() {
        this.logger.info('Lazy Load Handler initialized');
    }

    async execute(page, elementId, selector, options = {}) {
        try {
            // Strategy 1: Scroll to trigger lazy loading
            if (this.options.scrollTrigger) {
                const documentHeight = await page.evaluate(() => document.body.scrollHeight);
                const viewportHeight = await page.evaluate(() => window.innerHeight);
                
                let scrollPosition = 0;
                while (scrollPosition < documentHeight) {
                    await page.evaluate((pos) => window.scrollTo(0, pos), scrollPosition);
                    await page.waitForTimeout(300);
                    
                    const element = await page.$(selector);
                    if (element) {
                        return {
                            elementFound: true,
                            selector,
                            confidence: 0.85,
                            metadata: { strategy: 'scroll-lazy-load', scrollPosition }
                        };
                    }
                    
                    scrollPosition += viewportHeight * 0.8;
                }
            }

            // Strategy 2: Use Intersection Observer
            const element = await page.evaluate((sel) => {
                return new Promise((resolve) => {
                    const observer = new IntersectionObserver((entries) => {
                        entries.forEach(entry => {
                            if (entry.isIntersecting) {
                                const found = document.querySelector(sel);
                                if (found) {
                                    observer.disconnect();
                                    resolve(found);
                                }
                            }
                        });
                    });

                    // Observe all images and lazy-loadable elements
                    const lazyElements = document.querySelectorAll('[data-src], [loading="lazy"], .lazy');
                    lazyElements.forEach(el => observer.observe(el));

                    setTimeout(() => {
                        observer.disconnect();
                        resolve(null);
                    }, 5000);
                });
            }, selector);

            if (element) {
                return {
                    elementFound: true,
                    selector,
                    confidence: 0.8,
                    metadata: { strategy: 'intersection-observer-lazy-load' }
                };
            }

            return { elementFound: false };
        } catch (error) {
            throw error;
        }
    }
}
