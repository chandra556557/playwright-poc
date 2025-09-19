/**
 * Health and Monitoring API Routes
 */

import express from 'express';
import { Logger } from '../utils/logger.js';

const router = express.Router();
const logger = new Logger();

/**
 * @swagger
 * /api/health/status:
 *   get:
 *     summary: Get system health status
 *     tags: [Health]
 *     responses:
 *       200:
 *         description: System health information
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                 timestamp:
 *                   type: string
 *                 uptime:
 *                   type: number
 *                 memory:
 *                   type: object
 *                 version:
 *                   type: string
 */
router.get('/status', (req, res) => {
    try {
        const healthStatus = {
            status: 'healthy',
            timestamp: new Date().toISOString(),
            uptime: process.uptime(),
            memory: process.memoryUsage(),
            version: process.env.npm_package_version || '1.0.0',
            nodeVersion: process.version,
            platform: process.platform,
            arch: process.arch
        };

        res.json(healthStatus);
    } catch (error) {
        logger.error('Health status check failed:', error);
        res.status(500).json({
            status: 'unhealthy',
            error: 'Health check failed',
            timestamp: new Date().toISOString()
        });
    }
});

/**
 * @swagger
 * /api/health/performance:
 *   get:
 *     summary: Get performance metrics
 *     tags: [Health]
 *     responses:
 *       200:
 *         description: Performance metrics
 */
router.get('/performance', (req, res) => {
    try {
        // Mock performance data - would integrate with actual PerformanceMonitor
        const performanceMetrics = {
            totalElements: 150,
            successRate: 0.87,
            averageHealingTime: 450,
            totalRequests: 1250,
            errorRate: 0.13,
            topPerformingSelectors: [
                { selector: '#submit-btn', successRate: 0.98, avgTime: 120, attempts: 45 },
                { selector: '[data-testid="login"]', successRate: 0.95, avgTime: 180, attempts: 32 },
                { selector: '.primary-button', successRate: 0.92, avgTime: 200, attempts: 28 }
            ],
            worstPerformingSelectors: [
                { selector: '.dynamic-content', successRate: 0.45, avgTime: 800, attempts: 15 },
                { selector: 'div > span', successRate: 0.52, avgTime: 650, attempts: 12 }
            ],
            scenarioPerformance: {
                'dynamic-content': { successRate: 0.82, avgTime: 1200, attempts: 85 },
                'shadow-dom': { successRate: 0.91, avgTime: 800, attempts: 42 },
                'iframe': { successRate: 0.78, avgTime: 950, attempts: 23 },
                'responsive': { successRate: 0.88, avgTime: 600, attempts: 67 }
            },
            timestamp: new Date().toISOString()
        };

        res.json(performanceMetrics);
    } catch (error) {
        logger.error('Performance metrics retrieval failed:', error);
        res.status(500).json({ error: 'Failed to retrieve performance metrics' });
    }
});

/**
 * @swagger
 * /api/health/alerts:
 *   get:
 *     summary: Get active alerts
 *     tags: [Health]
 *     responses:
 *       200:
 *         description: List of active alerts
 */
router.get('/alerts', (req, res) => {
    try {
        // Mock alerts data
        const alerts = [
            {
                id: '1',
                type: 'low_success_rate',
                message: 'Selector .dynamic-content has low success rate: 45%',
                severity: 'warning',
                timestamp: new Date(Date.now() - 300000).toISOString(), // 5 minutes ago
                active: true
            },
            {
                id: '2',
                type: 'slow_selector',
                message: 'Selector div > span is slow: 650ms average',
                severity: 'info',
                timestamp: new Date(Date.now() - 600000).toISOString(), // 10 minutes ago
                active: true
            }
        ];

        res.json({
            alerts,
            totalAlerts: alerts.length,
            activeAlerts: alerts.filter(a => a.active).length,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        logger.error('Alerts retrieval failed:', error);
        res.status(500).json({ error: 'Failed to retrieve alerts' });
    }
});

/**
 * @swagger
 * /api/health/report:
 *   get:
 *     summary: Get comprehensive health report
 *     tags: [Health]
 *     responses:
 *       200:
 *         description: Comprehensive system health report
 */
router.get('/report', (req, res) => {
    try {
        const report = {
            summary: {
                uptime: formatUptime(process.uptime()),
                totalRequests: 1250,
                successRate: '87.0%',
                averageResponseTime: '450ms',
                totalElements: 150,
                activeAlerts: 2
            },
            performance: {
                topSelectors: [
                    { selector: '#submit-btn', successRate: 0.98, avgTime: 120 },
                    { selector: '[data-testid="login"]', successRate: 0.95, avgTime: 180 }
                ],
                worstSelectors: [
                    { selector: '.dynamic-content', successRate: 0.45, avgTime: 800 },
                    { selector: 'div > span', successRate: 0.52, avgTime: 650 }
                ],
                scenarios: {
                    'dynamic-content': { successRate: 0.82, avgTime: 1200 },
                    'shadow-dom': { successRate: 0.91, avgTime: 800 }
                }
            },
            alerts: [
                {
                    type: 'low_success_rate',
                    message: 'Selector .dynamic-content has low success rate: 45%',
                    severity: 'warning'
                }
            ],
            recommendations: [
                {
                    type: 'selector_optimization',
                    message: 'Consider optimizing selectors with low success rates',
                    priority: 'high'
                },
                {
                    type: 'performance',
                    message: 'Some selectors are performing slowly, consider optimization',
                    priority: 'medium'
                }
            ],
            timestamp: new Date().toISOString()
        };

        res.json(report);
    } catch (error) {
        logger.error('Health report generation failed:', error);
        res.status(500).json({ error: 'Failed to generate health report' });
    }
});

/**
 * @swagger
 * /api/health/metrics/reset:
 *   post:
 *     summary: Reset performance metrics
 *     tags: [Health]
 *     responses:
 *       200:
 *         description: Metrics reset successfully
 */
router.post('/metrics/reset', (req, res) => {
    try {
        // In a real implementation, this would reset the actual metrics
        logger.info('Performance metrics reset requested');
        
        res.json({
            message: 'Performance metrics reset successfully',
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        logger.error('Metrics reset failed:', error);
        res.status(500).json({ error: 'Failed to reset metrics' });
    }
});

// Helper function to format uptime
function formatUptime(uptime) {
    const seconds = Math.floor(uptime);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}d ${hours % 24}h ${minutes % 60}m`;
    if (hours > 0) return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
    if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
    return `${seconds}s`;
}

export default router;
