/**
 * Modal Dialog Handler
 * Handles overlay and popup element handling
 */

import { Logger } from '../utils/logger.js';

export class ModalDialogHandler {
    constructor() {
        this.logger = new Logger();
        this.name = 'modal-dialog';
        this.description = 'Handles overlay and popup element handling';
    }

    async execute(page, elementId, selector, options = {}) {
        const startTime = Date.now();
        
        try {
            this.logger.info(`Executing modal dialog scenario for element: ${elementId}`);

            const element = await page.$(selector);
            if (!element) {
                return {
                    success: false,
                    confidence: 0.0,
                    executionTime: Date.now() - startTime,
                    error: 'Element not found'
                };
            }

            // Check if element is in a modal
            const isInModal = await page.evaluate((sel) => {
                const el = document.querySelector(sel);
                if (!el) return false;
                
                // Check if element is inside a modal
                const modal = el.closest('[role="dialog"], .modal, .popup, .overlay');
                return !!modal;
            }, selector);

            const isVisible = await element.isVisible();
            const executionTime = Date.now() - startTime;

            return {
                success: isVisible,
                confidence: isVisible ? 0.8 : 0.0,
                executionTime,
                results: {
                    visible: isVisible,
                    inModal: isInModal
                },
                metadata: {
                    modalDetected: isInModal
                }
            };

        } catch (error) {
            this.logger.error(`Modal dialog scenario failed for ${elementId}:`, error);
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
            modalSelectors: ['[role="dialog"]', '.modal', '.popup', '.overlay'],
            minConfidence: 0.5
        };
    }
}
