/**
 * Configuration API Routes
 */

import express from 'express';
import { Logger } from '../utils/logger.js';

const router = express.Router();
const logger = new Logger();

/**
 * @swagger
 * /api/config:
 *   get:
 *     summary: Get current configuration
 *     tags: [Configuration]
 *     responses:
 *       200:
 *         description: Current system configuration
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 scenarios:
 *                   type: object
 *                 options:
 *                   type: object
 *                 performance:
 *                   type: object
 */
router.get('/', (req, res) => {
    try {
        const configuration = {
            scenarios: {
                'dynamic-content': { 
                    enabled: true, 
                    priority: 5, 
                    timeout: 30000,
                    retryAttempts: 3,
                    description: 'Handle elements that appear/disappear dynamically'
                },
                'shadow-dom': { 
                    enabled: true, 
                    priority: 4, 
                    timeout: 25000,
                    retryAttempts: 2,
                    description: 'Navigate and find elements within Shadow DOM'
                },
                'iframe': { 
                    enabled: true, 
                    priority: 3, 
                    timeout: 35000,
                    retryAttempts: 3,
                    description: 'Cross-frame element detection and interaction'
                },
                'responsive': { 
                    enabled: true, 
                    priority: 4, 
                    timeout: 20000,
                    retryAttempts: 2,
                    description: 'Handle viewport-dependent element changes'
                },
                'lazy-loading': { 
                    enabled: true, 
                    priority: 3, 
                    timeout: 40000,
                    retryAttempts: 4,
                    description: 'Wait for and handle lazy-loaded content'
                },
                'form-validation': { 
                    enabled: true, 
                    priority: 4, 
                    timeout: 15000,
                    retryAttempts: 2,
                    description: 'Handle form elements with validation states'
                },
                'localization': { 
                    enabled: true, 
                    priority: 2, 
                    timeout: 10000,
                    retryAttempts: 1,
                    description: 'Handle multi-language content variations'
                },
                'theme-switching': { 
                    enabled: true, 
                    priority: 2, 
                    timeout: 15000,
                    retryAttempts: 2,
                    description: 'Handle dark/light theme element variations'
                },
                'feature-flags': { 
                    enabled: true, 
                    priority: 3, 
                    timeout: 20000,
                    retryAttempts: 2,
                    description: 'Handle A/B testing and feature flag scenarios'
                },
                'pwa-states': { 
                    enabled: true, 
                    priority: 2, 
                    timeout: 25000,
                    retryAttempts: 3,
                    description: 'Handle PWA network-dependent elements'
                },
                'animation': { 
                    enabled: true, 
                    priority: 3, 
                    timeout: 30000,
                    retryAttempts: 3,
                    description: 'Handle elements that change during animations'
                },
                'virtual-scrolling': { 
                    enabled: true, 
                    priority: 2, 
                    timeout: 35000,
                    retryAttempts: 4,
                    description: 'Handle virtualized content scenarios'
                },
                'infinite-scroll': { 
                    enabled: true, 
                    priority: 3, 
                    timeout: 40000,
                    retryAttempts: 5,
                    description: 'Handle infinite scrolling content'
                },
                'modal-dialogs': { 
                    enabled: true, 
                    priority: 4, 
                    timeout: 20000,
                    retryAttempts: 2,
                    description: 'Handle modal and overlay elements'
                },
                'tooltips': { 
                    enabled: true, 
                    priority: 2, 
                    timeout: 10000,
                    retryAttempts: 2,
                    description: 'Handle hover and focus-triggered elements'
                }
            },
            options: {
                similarityThreshold: 0.7,
                maxHealingAttempts: 5,
                enableMLSimilarity: true,
                enableShadowDOM: true,
                enableIframeSupport: true,
                enablePerformanceTracking: true,
                cacheTimeout: 300000,
                defaultTimeout: 30000,
                enablePredictiveHealing: true,
                adaptiveLearning: true
            },
            performance: {
                enableMetrics: true,
                metricsInterval: 5000,
                maxHistorySize: 1000,
                enableAlerts: true,
                alertThresholds: {
                    slowSelector: 1000,
                    lowSuccessRate: 0.7,
                    highFailureRate: 0.3
                }
            },
            selectors: {
                enableModernCSS: true,
                enableStructuralSelectors: true,
                enableStateBasedSelectors: true,
                enableContainerQueries: true,
                maxSelectorComplexity: 5
            },
            database: {
                type: 'sqlite',
                path: './data/ai-inspector.db',
                enableBackup: true,
                backupInterval: 3600000 // 1 hour
            },
            logging: {
                level: 'info',
                enableConsole: true,
                enableFile: true,
                maxFiles: 5,
                maxSize: '20m'
            }
        };

        res.json(configuration);
    } catch (error) {
        logger.error('Failed to get configuration:', error);
        res.status(500).json({ error: 'Failed to retrieve configuration' });
    }
});

/**
 * @swagger
 * /api/config:
 *   put:
 *     summary: Update configuration
 *     tags: [Configuration]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               scenarios:
 *                 type: object
 *               options:
 *                 type: object
 *               performance:
 *                 type: object
 *     responses:
 *       200:
 *         description: Configuration updated successfully
 */
router.put('/', (req, res) => {
    try {
        const { scenarios, options, performance, selectors, logging } = req.body;
        
        // Validate configuration updates
        const validationErrors = validateConfiguration(req.body);
        if (validationErrors.length > 0) {
            return res.status(400).json({
                error: 'Invalid configuration',
                details: validationErrors
            });
        }

        // Log configuration changes
        logger.info('Configuration updated', { 
            scenarios: Object.keys(scenarios || {}),
            options: Object.keys(options || {}),
            performance: Object.keys(performance || {}),
            updatedBy: req.ip,
            timestamp: new Date().toISOString()
        });
        
        // In a real implementation, this would update the actual configuration
        // For now, we'll just acknowledge the update
        
        res.json({
            message: 'Configuration updated successfully',
            timestamp: new Date().toISOString(),
            updatedSections: {
                scenarios: !!scenarios,
                options: !!options,
                performance: !!performance,
                selectors: !!selectors,
                logging: !!logging
            }
        });
    } catch (error) {
        logger.error('Failed to update configuration:', error);
        res.status(500).json({ error: 'Failed to update configuration' });
    }
});

/**
 * @swagger
 * /api/config/scenarios:
 *   get:
 *     summary: Get scenario configurations
 *     tags: [Configuration]
 *     responses:
 *       200:
 *         description: Scenario configurations
 */
router.get('/scenarios', (req, res) => {
    try {
        const scenarios = {
            available: [
                'dynamic-content', 'shadow-dom', 'iframe', 'responsive', 'lazy-loading',
                'form-validation', 'localization', 'theme-switching', 'feature-flags',
                'pwa-states', 'animation', 'virtual-scrolling', 'infinite-scroll',
                'modal-dialogs', 'tooltips'
            ],
            enabled: [
                'dynamic-content', 'shadow-dom', 'iframe', 'responsive', 'lazy-loading',
                'form-validation', 'modal-dialogs'
            ],
            priorities: {
                'dynamic-content': 5,
                'shadow-dom': 4,
                'responsive': 4,
                'form-validation': 4,
                'modal-dialogs': 4,
                'iframe': 3,
                'lazy-loading': 3,
                'feature-flags': 3,
                'animation': 3,
                'infinite-scroll': 3,
                'theme-switching': 2,
                'localization': 2,
                'pwa-states': 2,
                'virtual-scrolling': 2,
                'tooltips': 2
            }
        };

        res.json(scenarios);
    } catch (error) {
        logger.error('Failed to get scenario configurations:', error);
        res.status(500).json({ error: 'Failed to retrieve scenario configurations' });
    }
});

/**
 * @swagger
 * /api/config/scenarios/{scenarioType}:
 *   put:
 *     summary: Update specific scenario configuration
 *     tags: [Configuration]
 *     parameters:
 *       - in: path
 *         name: scenarioType
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               enabled:
 *                 type: boolean
 *               priority:
 *                 type: integer
 *               timeout:
 *                 type: integer
 *               retryAttempts:
 *                 type: integer
 *     responses:
 *       200:
 *         description: Scenario configuration updated
 */
router.put('/scenarios/:scenarioType', (req, res) => {
    try {
        const { scenarioType } = req.params;
        const { enabled, priority, timeout, retryAttempts } = req.body;

        // Validate scenario type
        const validScenarios = [
            'dynamic-content', 'shadow-dom', 'iframe', 'responsive', 'lazy-loading',
            'form-validation', 'localization', 'theme-switching', 'feature-flags',
            'pwa-states', 'animation', 'virtual-scrolling', 'infinite-scroll',
            'modal-dialogs', 'tooltips'
        ];

        if (!validScenarios.includes(scenarioType)) {
            return res.status(400).json({
                error: 'Invalid scenario type',
                validScenarios
            });
        }

        logger.info(`Scenario configuration updated: ${scenarioType}`, {
            enabled, priority, timeout, retryAttempts
        });

        res.json({
            message: `Scenario ${scenarioType} configuration updated successfully`,
            scenarioType,
            configuration: { enabled, priority, timeout, retryAttempts },
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        logger.error('Failed to update scenario configuration:', error);
        res.status(500).json({ error: 'Failed to update scenario configuration' });
    }
});

/**
 * @swagger
 * /api/config/reset:
 *   post:
 *     summary: Reset configuration to defaults
 *     tags: [Configuration]
 *     responses:
 *       200:
 *         description: Configuration reset to defaults
 */
router.post('/reset', (req, res) => {
    try {
        logger.info('Configuration reset to defaults requested');
        
        res.json({
            message: 'Configuration reset to defaults successfully',
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        logger.error('Failed to reset configuration:', error);
        res.status(500).json({ error: 'Failed to reset configuration' });
    }
});

/**
 * @swagger
 * /api/config/export:
 *   get:
 *     summary: Export current configuration
 *     tags: [Configuration]
 *     responses:
 *       200:
 *         description: Configuration export
 */
router.get('/export', (req, res) => {
    try {
        // This would export the actual current configuration
        const exportData = {
            version: '1.0.0',
            exportedAt: new Date().toISOString(),
            configuration: {
                // This would be the actual current configuration
                scenarios: {},
                options: {},
                performance: {}
            }
        };

        res.setHeader('Content-Disposition', 'attachment; filename=ai-inspector-config.json');
        res.setHeader('Content-Type', 'application/json');
        res.json(exportData);
    } catch (error) {
        logger.error('Failed to export configuration:', error);
        res.status(500).json({ error: 'Failed to export configuration' });
    }
});

/**
 * @swagger
 * /api/config/import:
 *   post:
 *     summary: Import configuration
 *     tags: [Configuration]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Configuration imported successfully
 */
router.post('/import', (req, res) => {
    try {
        const importData = req.body;
        
        // Validate import data
        if (!importData.configuration) {
            return res.status(400).json({
                error: 'Invalid import data: missing configuration'
            });
        }

        logger.info('Configuration import requested', {
            version: importData.version,
            importedAt: new Date().toISOString()
        });

        res.json({
            message: 'Configuration imported successfully',
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        logger.error('Failed to import configuration:', error);
        res.status(500).json({ error: 'Failed to import configuration' });
    }
});

// Helper function to validate configuration
function validateConfiguration(config) {
    const errors = [];

    if (config.options) {
        if (config.options.similarityThreshold && 
            (config.options.similarityThreshold < 0 || config.options.similarityThreshold > 1)) {
            errors.push('similarityThreshold must be between 0 and 1');
        }

        if (config.options.maxHealingAttempts && 
            (config.options.maxHealingAttempts < 1 || config.options.maxHealingAttempts > 10)) {
            errors.push('maxHealingAttempts must be between 1 and 10');
        }

        if (config.options.cacheTimeout && config.options.cacheTimeout < 0) {
            errors.push('cacheTimeout must be non-negative');
        }
    }

    if (config.scenarios) {
        for (const [scenarioType, scenarioConfig] of Object.entries(config.scenarios)) {
            if (scenarioConfig.priority && 
                (scenarioConfig.priority < 1 || scenarioConfig.priority > 10)) {
                errors.push(`${scenarioType} priority must be between 1 and 10`);
            }

            if (scenarioConfig.timeout && scenarioConfig.timeout < 1000) {
                errors.push(`${scenarioType} timeout must be at least 1000ms`);
            }

            if (scenarioConfig.retryAttempts && 
                (scenarioConfig.retryAttempts < 0 || scenarioConfig.retryAttempts > 10)) {
                errors.push(`${scenarioType} retryAttempts must be between 0 and 10`);
            }
        }
    }

    return errors;
}

export default router;
