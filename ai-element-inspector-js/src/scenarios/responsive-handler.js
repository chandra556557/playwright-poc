/**
 * Responsive Handler
 * Handles responsive design scenarios and viewport-dependent elements
 */

import { Logger } from '../utils/logger.js';

export class ResponsiveHandler {
    constructor() {
        this.logger = new Logger();
        this.name = 'responsive';
        this.description = 'Handles responsive design scenarios and viewport-dependent elements';
    }

    async execute(page, elementId, selector, options = {}) {
        const startTime = Date.now();
        
        try {
            this.logger.info(`Executing responsive scenario for element: ${elementId}`);

            // Get current viewport
            const currentViewport = page.viewportSize();
            
            // Test different viewport sizes
            const viewports = [
                { width: 320, height: 568, name: 'mobile' },
                { width: 768, height: 1024, name: 'tablet' },
                { width: 1024, height: 768, name: 'desktop' },
                { width: 1920, height: 1080, name: 'large-desktop' }
            ];

            const results = [];

            for (const viewport of viewports) {
                await page.setViewportSize({ width: viewport.width, height: viewport.height });
                await page.waitForTimeout(500); // Wait for layout to settle

                const element = await page.$(selector);
                if (element) {
                    const boundingBox = await element.boundingBox();
                    const isVisible = await element.isVisible();
                    
                    results.push({
                        viewport: viewport.name,
                        size: { width: viewport.width, height: viewport.height },
                        found: true,
                        visible: isVisible,
                        boundingBox: boundingBox,
                        confidence: isVisible ? 0.9 : 0.5
                    });
                } else {
                    results.push({
                        viewport: viewport.name,
                        size: { width: viewport.width, height: viewport.height },
                        found: false,
                        visible: false,
                        confidence: 0.0
                    });
                }
            }

            // Restore original viewport
            await page.setViewportSize(currentViewport);

            const successCount = results.filter(r => r.found && r.visible).length;
            const successRate = successCount / results.length;
            const executionTime = Date.now() - startTime;

            return {
                success: successRate >= 0.5,
                confidence: successRate,
                executionTime,
                results,
                metadata: {
                    viewportsTested: results.length,
                    successfulViewports: successCount,
                    responsiveScore: successRate
                }
            };

        } catch (error) {
            this.logger.error(`Responsive scenario failed for ${elementId}:`, error);
            return {
                success: false,
                confidence: 0.0,
                executionTime: Date.now() - startTime,
                error: error.message
            };
        }
    }

    getRecommendedOptions() {
        return {
            viewports: [
                { width: 320, height: 568, name: 'mobile' },
                { width: 768, height: 1024, name: 'tablet' },
                { width: 1024, height: 768, name: 'desktop' }
            ],
            waitTime: 500,
            minSuccessRate: 0.5
        };
    }
}
