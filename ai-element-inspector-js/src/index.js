/**
 * AI Element Inspector for Playwright - Main Entry Point
 * Enhanced JavaScript implementation with advanced scenarios and self-healing capabilities
 */

import express from 'express';
import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import { RateLimiterMemory } from 'rate-limiter-flexible';
import swaggerUi from 'swagger-ui-express';
import swaggerJsdoc from 'swagger-jsdoc';

import { AIElementInspectorService } from './core/ai-element-inspector.js';
import { ScenarioManager } from './scenarios/scenario-manager.js';
import { PerformanceMonitor } from './core/performance-monitor.js';
import { DatabaseManager } from './utils/database-manager.js';
import { Logger } from './utils/logger.js';
import { Config } from './utils/config.js';

// API Routes
import elementRoutes from './api/element-routes.js';
import scenarioRoutes from './api/scenario-routes.js';
import healthRoutes from './api/health-routes.js';
import configRoutes from './api/config-routes.js';

class AIElementInspectorServer {
    constructor() {
        this.app = express();
        this.server = createServer(this.app);
        this.io = new SocketIOServer(this.server, {
            cors: {
                origin: "*",
                methods: ["GET", "POST"]
            }
        });
        
        this.config = new Config();
        this.logger = new Logger();
        this.dbManager = new DatabaseManager();
        this.performanceMonitor = new PerformanceMonitor();
        this.scenarioManager = new ScenarioManager();
        this.inspectorService = null;
        
        this.setupMiddleware();
        this.setupRateLimiting();
        this.setupSwagger();
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
            origin: this.config.get('cors.allowedOrigins', ['http://localhost:3000']),
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
            points: this.config.get('rateLimiting.points', 100),
            duration: this.config.get('rateLimiting.duration', 60)
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

    setupSwagger() {
        const swaggerOptions = {
            definition: {
                openapi: '3.0.0',
                info: {
                    title: 'AI Element Inspector API',
                    version: '1.0.0',
                    description: 'AI-powered element inspector for Playwright with self-healing capabilities',
                    contact: {
                        name: 'AI Element Inspector Team',
                        email: 'support@ai-element-inspector.com'
                    }
                },
                servers: [
                    {
                        url: `http://localhost:${this.config.get('server.port', 3000)}`,
                        description: 'Development server'
                    }
                ],
                components: {
                    securitySchemes: {
                        bearerAuth: {
                            type: 'http',
                            scheme: 'bearer'
                        }
                    }
                }
            },
            apis: ['./src/api/*.js']
        };

        const specs = swaggerJsdoc(swaggerOptions);
        this.app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(specs));
    }

    setupRoutes() {
        // Health check endpoint
        this.app.get('/health', (req, res) => {
            res.json({
                status: 'healthy',
                timestamp: new Date().toISOString(),
                version: process.env.npm_package_version || '1.0.0',
                uptime: process.uptime()
            });
        });

        // API routes
        this.app.use('/api/elements', elementRoutes);
        this.app.use('/api/scenarios', scenarioRoutes);
        this.app.use('/api/health', healthRoutes);
        this.app.use('/api/config', configRoutes);

        // Root endpoint
        this.app.get('/', (req, res) => {
            res.json({
                name: 'AI Element Inspector',
                version: '1.0.0',
                description: 'AI-powered element inspector for Playwright with self-healing capabilities',
                documentation: '/api-docs',
                endpoints: {
                    health: '/health',
                    elements: '/api/elements',
                    scenarios: '/api/scenarios',
                    monitoring: '/api/health',
                    configuration: '/api/config'
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
                    '/api/elements',
                    '/api/scenarios',
                    '/api/health',
                    '/api/config',
                    '/api-docs'
                ]
            });
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

            // Handle element registration via WebSocket
            socket.on('register-element', async (data) => {
                try {
                    if (this.inspectorService) {
                        const result = await this.inspectorService.registerElement(data.elementId, data.selector);
                        socket.emit('element-registered', result);
                        
                        // Broadcast to monitoring room
                        socket.to('monitoring').emit('element-activity', {
                            type: 'registration',
                            elementId: data.elementId,
                            timestamp: new Date().toISOString()
                        });
                    }
                } catch (error) {
                    socket.emit('error', { message: error.message });
                }
            });

            // Handle element healing requests
            socket.on('heal-element', async (data) => {
                try {
                    if (this.inspectorService) {
                        const result = await this.inspectorService.findElementWithHealing(
                            data.elementId, 
                            data.primarySelector
                        );
                        socket.emit('element-healed', { elementId: data.elementId, found: !!result });
                        
                        // Broadcast healing activity
                        socket.to('monitoring').emit('element-activity', {
                            type: 'healing',
                            elementId: data.elementId,
                            success: !!result,
                            timestamp: new Date().toISOString()
                        });
                    }
                } catch (error) {
                    socket.emit('error', { message: error.message });
                }
            });

            socket.on('disconnect', () => {
                this.logger.info(`WebSocket client disconnected: ${socket.id}`);
            });
        });

        // Periodic performance updates
        setInterval(() => {
            const metrics = this.performanceMonitor.getMetrics();
            this.io.to('monitoring').emit('performance-update', metrics);
        }, this.config.get('monitoring.updateInterval', 5000));
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

    async initialize() {
        try {
            // Initialize database
            await this.dbManager.initialize();
            this.logger.info('Database initialized successfully');

            // Initialize performance monitoring
            await this.performanceMonitor.initialize();
            this.logger.info('Performance monitoring initialized');

            // Initialize scenario manager
            await this.scenarioManager.initialize();
            this.logger.info('Scenario manager initialized');

            this.logger.info('AI Element Inspector Server initialized successfully');
        } catch (error) {
            this.logger.error('Failed to initialize server:', error);
            throw error;
        }
    }

    async start() {
        await this.initialize();
        
        const port = this.config.get('server.port', 3000);
        const host = this.config.get('server.host', 'localhost');

        this.server.listen(port, host, () => {
            this.logger.info(`AI Element Inspector Server running on http://${host}:${port}`);
            this.logger.info(`API Documentation available at http://${host}:${port}/api-docs`);
            this.logger.info(`WebSocket server ready for real-time monitoring`);
        });
    }

    async shutdown() {
        this.logger.info('Shutting down AI Element Inspector Server...');
        
        try {
            // Close WebSocket connections
            this.io.close();
            
            // Close HTTP server
            this.server.close();
            
            // Close database connections
            await this.dbManager.close();
            
            // Stop performance monitoring
            this.performanceMonitor.stop();
            
            this.logger.info('Server shutdown completed');
            process.exit(0);
        } catch (error) {
            this.logger.error('Error during shutdown:', error);
            process.exit(1);
        }
    }

    // Method to set the inspector service (called from external initialization)
    setInspectorService(service) {
        this.inspectorService = service;
    }
}

// Start the server if this file is run directly
if (import.meta.url === `file://${process.argv[1]}`) {
    const server = new AIElementInspectorServer();
    server.start().catch((error) => {
        console.error('Failed to start server:', error);
        process.exit(1);
    });
}

export { AIElementInspectorServer };
