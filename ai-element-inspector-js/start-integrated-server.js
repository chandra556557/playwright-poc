/**
 * Integrated AI Element Inspector Server
 * Starts the AI element inspector as a service integrated with the main project
 */

import express from 'express';
import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import { RateLimiterMemory } from 'rate-limiter-flexible';

import { MainProjectIntegration } from './src/integration/main-project-integration.js';
import { Logger } from './src/utils/logger.js';
import integrationConfig from './config/integration-config.js';

// Import API routes
import aiDiscoveryRoutes from './src/api/ai-discovery-routes.js';
import elementRoutes from './src/api/element-routes.js';
import scenarioRoutes from './src/api/scenario-routes.js';
import healthRoutes from './src/api/health-routes.js';
import configRoutes from './src/api/config-routes.js';

class IntegratedAIServer {
    constructor() {
        this.app = express();
        this.server = createServer(this.app);
        this.io = new SocketIOServer(this.server, {
            cors: {
                origin: integrationConfig.server.cors.allowedOrigins,
                methods: ["GET", "POST"]
            }
        });
        
        this.logger = new Logger();
        this.integration = new MainProjectIntegration();
        
        this.setupMiddleware();
        this.setupRateLimiting();
        this.setupRoutes();
        this.setupWebSocket();
        this.setupErrorHandling();
    }

    setupMiddleware() {
        // Security middleware
        this.app.use(helmet({
            contentSecurityPolicy: {
                directives: {
                    defaultSrc: ["'self'"],
                    styleSrc: ["'self'", "'unsafe-inline'"],
                    scriptSrc: ["'self'"],
                    imgSrc: ["'self'", "data:", "https:"]
                }
            }
        }));

        // CORS configuration
        this.app.use(cors({
            origin: integrationConfig.server.cors.allowedOrigins,
            credentials: true
        }));

        // Compression and parsing
        this.app.use(compression());
        this.app.use(express.json({ limit: '10mb' }));
        this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));

        // Request logging
        this.app.use((req, res, next) => {
            this.logger.info(`${req.method} ${req.path}`, {
                ip: req.ip,
                userAgent: req.get('User-Agent'),
                timestamp: new Date().toISOString()
            });
            next();
        });
    }

    setupRateLimiting() {
        const rateLimiter = new RateLimiterMemory({
            keyGenerator: (req) => req.ip,
            points: integrationConfig.rateLimiting.points,
            duration: integrationConfig.rateLimiting.duration
        });

        this.app.use(async (req, res, next) => {
            try {
                await rateLimiter.consume(req.ip);
                next();
            } catch (rejRes) {
                res.status(429).json({
                    error: 'Too Many Requests',
                    retryAfter: Math.round(rejRes.msBeforeNext / 1000)
                });
            }
        });
    }

    setupRoutes() {
        // Health check endpoint
        this.app.get('/health', (req, res) => {
            res.json({
                status: 'healthy',
                service: 'AI Element Inspector',
                timestamp: new Date().toISOString(),
                version: '1.0.0',
                uptime: process.uptime(),
                integration: this.integration.isInitialized
            });
        });

        // AI Discovery routes (main integration endpoints)
        this.app.use('/api/ai', aiDiscoveryRoutes);

        // Standard AI Inspector routes
        this.app.use('/api/elements', elementRoutes);
        this.app.use('/api/scenarios', scenarioRoutes);
        this.app.use('/api/health', healthRoutes);
        this.app.use('/api/config', configRoutes);

        // Proxy endpoints for main project integration
        if (integrationConfig.integration.enableProxy) {
            this.setupProxyEndpoints();
        }

        // Root endpoint
        this.app.get('/', (req, res) => {
            res.json({
                name: 'AI Element Inspector - Integrated',
                version: '1.0.0',
                description: 'AI-powered element inspector integrated with main project',
                endpoints: {
                    health: '/health',
                    aiDiscovery: '/api/ai',
                    elements: '/api/elements',
                    scenarios: '/api/scenarios',
                    monitoring: '/api/health',
                    configuration: '/api/config'
                },
                integration: {
                    mainServerUrl: integrationConfig.integration.mainServerUrl,
                    proxyEnabled: integrationConfig.integration.enableProxy
                }
            });
        });

        // 404 handler
        this.app.use('*', (req, res) => {
            res.status(404).json({
                error: 'Not Found',
                message: `Route ${req.originalUrl} not found`,
                availableEndpoints: [
                    '/health',
                    '/api/ai',
                    '/api/elements',
                    '/api/scenarios',
                    '/api/health',
                    '/api/config'
                ]
            });
        });
    }

    setupProxyEndpoints() {
        // Proxy endpoint for main project's discover-elements
        this.app.post('/api/discover-elements', async (req, res) => {
            try {
                // Forward to AI discovery endpoint
                req.url = '/api/ai/discover-elements';
                req.method = 'POST';
                
                // Use the AI discovery route handler
                const aiDiscoveryRouter = aiDiscoveryRoutes;
                aiDiscoveryRouter(req, res, () => {
                    res.status(404).json({ error: 'AI discovery not available' });
                });
            } catch (error) {
                this.logger.error('Proxy request failed:', error);
                res.status(500).json({
                    error: 'Proxy Error',
                    message: error.message,
                    timestamp: new Date().toISOString()
                });
            }
        });

        // Proxy endpoint for AI healing
        this.app.post('/api/ai-healing', async (req, res) => {
            try {
                req.url = '/api/ai/heal-element';
                req.method = 'POST';
                
                const aiDiscoveryRouter = aiDiscoveryRoutes;
                aiDiscoveryRouter(req, res, () => {
                    res.status(404).json({ error: 'AI healing not available' });
                });
            } catch (error) {
                this.logger.error('AI healing proxy failed:', error);
                res.status(500).json({
                    error: 'AI Healing Error',
                    message: error.message,
                    timestamp: new Date().toISOString()
                });
            }
        });
    }

    setupWebSocket() {
        this.io.on('connection', (socket) => {
            this.logger.info(`WebSocket client connected: ${socket.id}`);

            // Join monitoring room for real-time updates
            socket.on('join-monitoring', () => {
                socket.join('monitoring');
                this.logger.info(`Client ${socket.id} joined monitoring room`);
            });

            // Handle AI element discovery via WebSocket
            socket.on('ai-discover-elements', async (data) => {
                try {
                    const result = await this.integration.discoverElementsWithAI(
                        data.page,
                        data.url,
                        data.browserName,
                        data.context
                    );
                    
                    socket.emit('ai-discovery-result', result);
                    
                    // Broadcast to monitoring room
                    socket.to('monitoring').emit('ai-activity', {
                        type: 'discovery',
                        url: data.url,
                        elementsFound: result.summary.totalElements,
                        timestamp: new Date().toISOString()
                    });
                } catch (error) {
                    socket.emit('ai-error', { message: error.message });
                }
            });

            // Handle AI element healing via WebSocket
            socket.on('ai-heal-element', async (data) => {
                try {
                    const inspector = await this.integration.createInspectorForPage(data.page);
                    const result = await inspector.findElementWithHealing(
                        data.elementId,
                        data.primarySelector,
                        data.options
                    );
                    
                    socket.emit('ai-healing-result', {
                        elementId: data.elementId,
                        healed: !!result,
                        result
                    });
                    
                    // Broadcast healing activity
                    socket.to('monitoring').emit('ai-activity', {
                        type: 'healing',
                        elementId: data.elementId,
                        success: !!result,
                        timestamp: new Date().toISOString()
                    });
                } catch (error) {
                    socket.emit('ai-error', { message: error.message });
                }
            });

            socket.on('disconnect', () => {
                this.logger.info(`WebSocket client disconnected: ${socket.id}`);
            });
        });

        // Periodic performance updates
        setInterval(() => {
            if (this.integration.isInitialized) {
                const metrics = this.integration.performanceMonitor.getMetrics();
                this.io.to('monitoring').emit('ai-performance-update', metrics);
            }
        }, integrationConfig.monitoring.updateInterval);
    }

    setupErrorHandling() {
        // Global error handler
        this.app.use((err, req, res, next) => {
            this.logger.error('Unhandled error:', err);
            
            res.status(err.status || 500).json({
                error: 'Internal Server Error',
                message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong',
                timestamp: new Date().toISOString(),
                requestId: req.headers['x-request-id'] || 'unknown'
            });
        });

        // Handle uncaught exceptions
        process.on('uncaughtException', (err) => {
            this.logger.error('Uncaught Exception:', err);
            process.exit(1);
        });

        // Handle unhandled promise rejections
        process.on('unhandledRejection', (reason, promise) => {
            this.logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
            process.exit(1);
        });

        // Graceful shutdown
        process.on('SIGTERM', () => this.shutdown());
        process.on('SIGINT', () => this.shutdown());
    }

    async start() {
        try {
            // Initialize the integration
            await this.integration.initialize();
            this.logger.info('AI Element Inspector Integration initialized successfully');
            
            const port = integrationConfig.server.port;
            const host = integrationConfig.server.host;

            this.server.listen(port, host, () => {
                this.logger.info(`🚀 AI Element Inspector Server running on http://${host}:${port}`);
                this.logger.info(`🔗 Integrated with main project at ${integrationConfig.integration.mainServerUrl}`);
                this.logger.info(`📡 WebSocket server ready for real-time AI monitoring`);
                this.logger.info(`🎯 AI Discovery endpoints available at /api/ai/*`);
            });
        } catch (error) {
            this.logger.error('Failed to start AI Element Inspector Server:', error);
            throw error;
        }
    }

    async shutdown() {
        this.logger.info('Shutting down AI Element Inspector Server...');
        
        try {
            // Close WebSocket connections
            this.io.close();
            
            // Close HTTP server
            this.server.close();
            
            // Cleanup integration
            await this.integration.cleanup();
            
            this.logger.info('AI Element Inspector Server shutdown completed');
            process.exit(0);
        } catch (error) {
            this.logger.error('Error during shutdown:', error);
            process.exit(1);
        }
    }
}

// Start the server if this file is run directly
if (import.meta.url === `file://${process.argv[1]}`) {
    const server = new IntegratedAIServer();
    server.start().catch((error) => {
        console.error('Failed to start AI Element Inspector Server:', error);
        process.exit(1);
    });
}

export { IntegratedAIServer };
