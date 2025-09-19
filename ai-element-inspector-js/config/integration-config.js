/**
 * Integration Configuration for AI Element Inspector
 * Configures the AI element inspector to work with the main project
 */

export const integrationConfig = {
    // Server configuration
    server: {
        port: process.env.AI_INSPECTOR_PORT || 3002,
        host: process.env.AI_INSPECTOR_HOST || 'localhost',
        // Use different port to avoid conflicts with main server
        cors: {
            allowedOrigins: [
                'http://localhost:3000',  // Main backend server
                'http://localhost:5173',  // Vite dev server
                'http://localhost:3001'   // Alternative backend port
            ]
        }
    },

    // Integration with main project
    integration: {
        mainServerUrl: process.env.MAIN_SERVER_URL || 'http://localhost:3001',
        enableProxy: true,
        proxyEndpoints: [
            '/api/discover-elements',
            '/api/inspect-page',
            '/api/ai-healing'
        ]
    },

    // AI Element Inspector specific settings
    aiInspector: {
        enableMLSimilarity: true,
        enableShadowDOM: true,
        enableIframeSupport: true,
        enablePerformanceTracking: true,
        similarityThreshold: 0.7,
        maxHealingAttempts: 5,
        cacheTimeout: 300000,
        enableRealTimeMonitoring: true
    },

    // Scenario configuration
    scenarios: {
        enableAllScenarios: true,
        defaultTimeout: 30000,
        maxConcurrentScenarios: 5,
        enablePerformanceTracking: true,
        // Priority scenarios for web testing
        priorityScenarios: [
            'dynamic-content',
            'shadow-dom',
            'responsive',
            'form-validation',
            'modal-dialogs'
        ]
    },

    // Database configuration
    database: {
        type: 'sqlite',
        path: './data/ai-inspector-integration.db',
        enablePerformanceMetrics: true,
        enableScenarioTracking: true
    },

    // Logging configuration
    logging: {
        level: process.env.LOG_LEVEL || 'info',
        enableFileLogging: true,
        logDirectory: './logs',
        enableConsoleLogging: true
    },

    // Rate limiting
    rateLimiting: {
        points: 200,  // Higher limit for integration
        duration: 60,
        blockDuration: 300
    },

    // Monitoring
    monitoring: {
        updateInterval: 5000,
        enableWebSocket: true,
        enableHealthChecks: true,
        healthCheckInterval: 30000
    }
};

export default integrationConfig;
