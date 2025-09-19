/**
 * AI Discovery Routes
 * API endpoints for AI-enhanced element discovery
 */

import express from 'express';
import { MainProjectIntegration } from '../integration/main-project-integration.js';
import { Logger } from '../utils/logger.js';
import integrationConfig from '../../config/integration-config.js';

const router = express.Router();
const logger = new Logger();
const integration = new MainProjectIntegration();

// Initialize integration
integration.initialize().catch(error => {
    logger.error('Failed to initialize integration:', error);
});

/**
 * @swagger
 * /api/ai/discover-elements:
 *   post:
 *     summary: AI-enhanced element discovery
 *     description: Discover elements on a page with AI-powered analysis and self-healing capabilities
 *     tags: [AI Discovery]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - url
 *             properties:
 *               url:
 *                 type: string
 *                 description: URL to discover elements on
 *               browserName:
 *                 type: string
 *                 enum: [chromium, firefox, webkit]
 *                 default: chromium
 *               context:
 *                 type: object
 *                 description: Additional context for discovery
 *               options:
 *                 type: object
 *                 description: AI inspector options
 *     responses:
 *       200:
 *         description: Elements discovered successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 elements:
 *                   type: object
 *                   description: Discovered elements by category
 *                 scenarios:
 *                   type: object
 *                   description: Scenario execution results
 *                 aiInsights:
 *                   type: object
 *                   description: AI-generated insights
 *                 summary:
 *                   type: object
 *                   description: Discovery summary
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *       400:
 *         description: Bad request
 *       500:
 *         description: Internal server error
 */
router.post('/discover-elements', async (req, res) => {
    try {
        const { url, browserName = 'chromium', context = {}, options = {} } = req.body;

        if (!url) {
            return res.status(400).json({
                error: 'Bad Request',
                message: 'URL is required',
                timestamp: new Date().toISOString()
            });
        }

        logger.info(`AI element discovery requested for: ${url}`);

        // Import Playwright dynamically
        const { chromium, firefox, webkit } = await import('playwright');
        
        const browserMap = { chromium, firefox, webkit };
        const browser = await browserMap[browserName].launch({ headless: true });
        const page = await browser.newPage();

        try {
            // Perform AI-enhanced element discovery
            const result = await integration.discoverElementsWithAI(
                page,
                url,
                browserName,
                context
            );

            logger.info(`AI discovery completed for ${url}: ${result.summary.totalElements} elements found`);

            res.json(result);
        } finally {
            await browser.close();
        }
    } catch (error) {
        logger.error('AI element discovery failed:', error);
        res.status(500).json({
            error: 'Internal Server Error',
            message: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

/**
 * @swagger
 * /api/ai/analyze-element:
 *   post:
 *     summary: Analyze a specific element with AI
 *     description: Get AI analysis for a specific element including confidence scores and recommendations
 *     tags: [AI Discovery]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - url
 *               - selector
 *             properties:
 *               url:
 *                 type: string
 *                 description: URL where the element is located
 *               selector:
 *                 type: string
 *                 description: CSS selector for the element
 *               elementName:
 *                 type: string
 *                 description: Name/ID for the element
 *               options:
 *                 type: object
 *                 description: Analysis options
 *     responses:
 *       200:
 *         description: Element analysis completed
 *       400:
 *         description: Bad request
 *       404:
 *         description: Element not found
 *       500:
 *         description: Internal server error
 */
router.post('/analyze-element', async (req, res) => {
    try {
        const { url, selector, elementName, options = {} } = req.body;

        if (!url || !selector) {
            return res.status(400).json({
                error: 'Bad Request',
                message: 'URL and selector are required',
                timestamp: new Date().toISOString()
            });
        }

        logger.info(`AI element analysis requested for: ${selector} on ${url}`);

        const { chromium } = await import('playwright');
        const browser = await chromium.launch({ headless: true });
        const page = await browser.newPage();

        try {
            await page.goto(url, { waitUntil: 'networkidle' });
            
            const element = await page.$(selector);
            if (!element) {
                return res.status(404).json({
                    error: 'Element Not Found',
                    message: `Element with selector '${selector}' not found on page`,
                    timestamp: new Date().toISOString()
                });
            }

            const inspector = await integration.createInspectorForPage(page);
            const elementId = elementName || `element_${Date.now()}`;

            // Register and analyze the element
            const registration = await inspector.registerElement(elementId, element, options);
            const analysis = await inspector.getElementAnalysis(elementId);

            // Get recommended scenarios
            const recommendedScenarios = integration.scenarioManager.getRecommendedScenarios(analysis);

            res.json({
                elementId,
                selector,
                registration,
                analysis,
                recommendedScenarios,
                timestamp: new Date().toISOString()
            });
        } finally {
            await browser.close();
        }
    } catch (error) {
        logger.error('AI element analysis failed:', error);
        res.status(500).json({
            error: 'Internal Server Error',
            message: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

/**
 * @swagger
 * /api/ai/heal-element:
 *   post:
 *     summary: Heal a broken element selector
 *     description: Use AI to find alternative selectors for a broken element
 *     tags: [AI Discovery]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - url
 *               - elementId
 *               - primarySelector
 *             properties:
 *               url:
 *                 type: string
 *                 description: URL where the element should be located
 *               elementId:
 *                 type: string
 *                 description: ID of the element to heal
 *               primarySelector:
 *                 type: string
 *                 description: Primary selector that's currently broken
 *               options:
 *                 type: object
 *                 description: Healing options
 *     responses:
 *       200:
 *         description: Element healing completed
 *       400:
 *         description: Bad request
 *       500:
 *         description: Internal server error
 */
router.post('/heal-element', async (req, res) => {
    try {
        const { url, elementId, primarySelector, options = {} } = req.body;

        if (!url || !elementId || !primarySelector) {
            return res.status(400).json({
                error: 'Bad Request',
                message: 'URL, elementId, and primarySelector are required',
                timestamp: new Date().toISOString()
            });
        }

        logger.info(`AI element healing requested for: ${elementId} with selector ${primarySelector}`);

        const { chromium } = await import('playwright');
        const browser = await chromium.launch({ headless: true });
        const page = await browser.newPage();

        try {
            await page.goto(url, { waitUntil: 'networkidle' });
            
            const inspector = await integration.createInspectorForPage(page);

            // Attempt to heal the element
            const healingResult = await inspector.findElementWithHealing(
                elementId,
                primarySelector,
                {
                    maxAttempts: options.maxAttempts || 5,
                    useMLSimilarity: options.useMLSimilarity !== false,
                    ...options
                }
            );

            const healingReport = inspector.getHealingReport();

            res.json({
                elementId,
                primarySelector,
                healed: !!healingResult,
                healingResult,
                healingReport,
                timestamp: new Date().toISOString()
            });
        } finally {
            await browser.close();
        }
    } catch (error) {
        logger.error('AI element healing failed:', error);
        res.status(500).json({
            error: 'Internal Server Error',
            message: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

/**
 * @swagger
 * /api/ai/performance:
 *   get:
 *     summary: Get AI inspector performance metrics
 *     description: Get performance metrics for the AI element inspector
 *     tags: [AI Discovery]
 *     responses:
 *       200:
 *         description: Performance metrics retrieved successfully
 */
router.get('/performance', async (req, res) => {
    try {
        const performanceReport = integration.performanceMonitor.getMetrics();
        const scenarioMetrics = integration.scenarioManager.getPerformanceMetrics();

        res.json({
            performance: performanceReport,
            scenarios: scenarioMetrics,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        logger.error('Failed to get performance metrics:', error);
        res.status(500).json({
            error: 'Internal Server Error',
            message: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

/**
 * @swagger
 * /api/ai/health:
 *   get:
 *     summary: Get AI inspector health status
 *     description: Get health status of the AI element inspector service
 *     tags: [AI Discovery]
 *     responses:
 *       200:
 *         description: Health status retrieved successfully
 */
router.get('/health', async (req, res) => {
    try {
        const isHealthy = integration.isInitialized;
        const activePages = integration.activePages.size;

        res.json({
            status: isHealthy ? 'healthy' : 'unhealthy',
            initialized: isHealthy,
            activePages,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        logger.error('Health check failed:', error);
        res.status(500).json({
            status: 'unhealthy',
            error: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

export default router;
