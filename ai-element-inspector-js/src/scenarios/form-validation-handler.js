/**
 * Form Validation Handler
 * Handles form validation scenarios and state-dependent form elements
 */

import { Logger } from '../utils/logger.js';

export class FormValidationHandler {
    constructor() {
        this.logger = new Logger();
        this.name = 'form-validation';
        this.description = 'Handles form validation scenarios and state-dependent form elements';
    }

    async execute(page, elementId, selector, options = {}) {
        const startTime = Date.now();
        
        try {
            this.logger.info(`Executing form validation scenario for element: ${elementId}`);

            const element = await page.$(selector);
            if (!element) {
                return {
                    success: false,
                    confidence: 0.0,
                    executionTime: Date.now() - startTime,
                    error: 'Element not found'
                };
            }

            // Test different form states
            const states = [
                { name: 'initial', action: async () => {} },
                { name: 'invalid', action: async () => {
                    // Try to trigger validation by clicking submit or blurring
                    const form = await page.$('form');
                    if (form) {
                        await form.evaluate(form => form.dispatchEvent(new Event('submit', { cancelable: true })));
                    }
                }},
                { name: 'valid', action: async () => {
                    // Try to fill valid data if it's an input
                    const tagName = await element.evaluate(el => el.tagName.toLowerCase());
                    if (tagName === 'input') {
                        const type = await element.getAttribute('type');
                        if (type === 'email') {
                            await element.fill('test@example.com');
                        } else if (type === 'text') {
                            await element.fill('test');
                        } else if (type === 'password') {
                            await element.fill('password123');
                        }
                    }
                }}
            ];

            const results = [];

            for (const state of states) {
                await state.action();
                await page.waitForTimeout(500);

                const isVisible = await element.isVisible();
                const isEnabled = await element.isEnabled();
                const hasError = await this.checkForValidationError(element);
                const isValid = await this.checkForValidationSuccess(element);

                results.push({
                    state: state.name,
                    visible: isVisible,
                    enabled: isEnabled,
                    hasError,
                    isValid,
                    confidence: this.calculateStateConfidence(isVisible, isEnabled, hasError, isValid)
                });
            }

            const executionTime = Date.now() - startTime;
            const successCount = results.filter(r => r.confidence > 0.5).length;
            const successRate = successCount / results.length;

            return {
                success: successRate >= 0.5,
                confidence: successRate,
                executionTime,
                results,
                metadata: {
                    statesTested: results.length,
                    successfulStates: successCount,
                    validationDetected: results.some(r => r.hasError || r.isValid)
                }
            };

        } catch (error) {
            this.logger.error(`Form validation scenario failed for ${elementId}:`, error);
            return {
                success: false,
                confidence: 0.0,
                executionTime: Date.now() - startTime,
                error: error.message
            };
        }
    }

    async checkForValidationError(element) {
        try {
            // Check for common validation error indicators
            const errorSelectors = [
                '.error',
                '.invalid',
                '.field-error',
                '[aria-invalid="true"]',
                '.validation-error'
            ];

            for (const selector of errorSelectors) {
                const errorElement = await element.$(selector);
                if (errorElement) {
                    return true;
                }
            }

            // Check parent for error classes
            const parent = await element.evaluateHandle(el => el.parentElement);
            if (parent) {
                for (const selector of errorSelectors) {
                    const errorElement = await parent.$(selector);
                    if (errorElement) {
                        return true;
                    }
                }
            }

            return false;
        } catch {
            return false;
        }
    }

    async checkForValidationSuccess(element) {
        try {
            // Check for common validation success indicators
            const successSelectors = [
                '.valid',
                '.success',
                '.field-valid',
                '[aria-invalid="false"]'
            ];

            for (const selector of successSelectors) {
                const successElement = await element.$(selector);
                if (successElement) {
                    return true;
                }
            }

            return false;
        } catch {
            return false;
        }
    }

    calculateStateConfidence(visible, enabled, hasError, isValid) {
        if (!visible) return 0.0;
        if (enabled && (hasError || isValid)) return 0.9;
        if (enabled) return 0.7;
        return 0.3;
    }

    getRecommendedOptions() {
        return {
            stateWaitTime: 500,
            validationTimeout: 2000,
            minSuccessRate: 0.5
        };
    }
}
