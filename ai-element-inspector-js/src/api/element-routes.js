/**
 * Element API Routes
 */

import express from 'express';
import { Logger } from '../utils/logger.js';

const router = express.Router();
const logger = new Logger();

/**
 * @swagger
 * /api/elements/register:
 *   post:
 *     summary: Register an element for tracking
 *     tags: [Elements]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               elementId:
 *                 type: string
 *               selector:
 *                 type: string
 *               metadata:
 *                 type: object
 *     responses:
 *       200:
 *         description: Element registered successfully
 *       400:
 *         description: Invalid request
 */
router.post('/register', async (req, res) => {
    try {
        const { elementId, selector, metadata = {} } = req.body;
        
        if (!elementId || !selector) {
            return res.status(400).json({
                error: 'Missing required fields: elementId, selector'
            });
        }

        // This would integrate with the AI Element Inspector Service
        // For now, return a mock response
        const result = {
            elementId,
            signatureHash: 'mock-hash',
            selectors: [
                {
                    strategy: 'id',
                    value: selector,
                    confidence: 0.9,
                    specificity: 100
                }
            ],
            timestamp: new Date().toISOString(),
            metadata
        };

        logger.info(`Element registered: ${elementId}`);
        res.json(result);

    } catch (error) {
        logger.error('Element registration failed:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

/**
 * @swagger
 * /api/elements/{id}:
 *   get:
 *     summary: Get element information
 *     tags: [Elements]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Element information
 *       404:
 *         description: Element not found
 */
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        
        // Mock response - would integrate with actual service
        const element = {
            elementId: id,
            signature: {},
            selectors: [],
            lastSeen: new Date().toISOString()
        };

        res.json(element);

    } catch (error) {
        logger.error('Failed to get element:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

/**
 * @swagger
 * /api/elements/{id}/heal:
 *   post:
 *     summary: Trigger healing for specific element
 *     tags: [Elements]
 *     parameters:
 *       - in: path
 *         name: id
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
 *               primarySelector:
 *                 type: string
 *               options:
 *                 type: object
 *     responses:
 *       200:
 *         description: Healing result
 */
router.post('/:id/heal', async (req, res) => {
    try {
        const { id } = req.params;
        const { primarySelector, options = {} } = req.body;

        if (!primarySelector) {
            return res.status(400).json({
                error: 'Missing required field: primarySelector'
            });
        }

        // Mock healing result
        const result = {
            elementId: id,
            found: true,
            selector: primarySelector,
            confidence: 0.85,
            healingTime: 150,
            strategy: 'primary-selector'
        };

        logger.info(`Element healing completed: ${id}`);
        res.json(result);

    } catch (error) {
        logger.error('Element healing failed:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

/**
 * @swagger
 * /api/elements/{id}:
 *   delete:
 *     summary: Unregister element
 *     tags: [Elements]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Element unregistered
 */
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        
        logger.info(`Element unregistered: ${id}`);
        res.json({ message: 'Element unregistered successfully' });

    } catch (error) {
        logger.error('Failed to unregister element:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

export default router;
