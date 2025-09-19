/**
 * Performance Monitor
 * Tracks and analyzes performance metrics for the AI Element Inspector
 */

import { Logger } from '../utils/logger.js';

export class PerformanceMonitor {
    constructor(options = {}) {
        this.options = {
            enableMetrics: true,
            metricsInterval: 5000,
            maxHistorySize: 1000,
            enableAlerts: true,
            alertThresholds: {
                slowSelector: 1000, // ms
                lowSuccessRate: 0.7,
                highFailureRate: 0.3
            },
            ...options
        };

        this.logger = new Logger();
        this.metrics = {
            selectors: new Map(),
            scenarios: new Map(),
            elements: new Map(),
            system: {
                startTime: Date.now(),
                totalRequests: 0,
                totalErrors: 0,
                averageResponseTime: 0
            }
        };

        this.alerts = [];
        this.isMonitoring = false;
        this.monitoringInterval = null;
    }

    /**
     * Initialize the performance monitor
     */
    async initialize() {
        try {
            this.logger.info('Performance Monitor initializing...');
            
            if (this.options.enableMetrics) {
                this.startMonitoring();
            }

            this.logger.info('Performance Monitor initialized successfully');
        } catch (error) {
            this.logger.error('Failed to initialize Performance Monitor:', error);
            throw error;
        }
    }

    /**
     * Start continuous monitoring
     */
    startMonitoring() {
        if (this.isMonitoring) return;

        this.isMonitoring = true;
        this.monitoringInterval = setInterval(() => {
            this._collectSystemMetrics();
            this._analyzePerformance();
            this._checkAlerts();
        }, this.options.metricsInterval);

        this.logger.info('Performance monitoring started');
    }

    /**
     * Stop monitoring
     */
    stopMonitoring() {
        if (!this.isMonitoring) return;

        this.isMonitoring = false;
        if (this.monitoringInterval) {
            clearInterval(this.monitoringInterval);
            this.monitoringInterval = null;
        }

        this.logger.info('Performance monitoring stopped');
    }

    /**
     * Record selector performance
     */
    recordSelectorPerformance(selector, success, executionTime, metadata = {}) {
        if (!this.options.enableMetrics) return;

        if (!this.metrics.selectors.has(selector)) {
            this.metrics.selectors.set(selector, {
                attempts: 0,
                successes: 0,
                failures: 0,
                totalTime: 0,
                averageTime: 0,
                minTime: Infinity,
                maxTime: 0,
                lastUsed: null,
                history: []
            });
        }

        const selectorMetrics = this.metrics.selectors.get(selector);
        selectorMetrics.attempts++;
        selectorMetrics.totalTime += executionTime;
        selectorMetrics.lastUsed = Date.now();

        if (success) {
            selectorMetrics.successes++;
        } else {
            selectorMetrics.failures++;
        }

        selectorMetrics.averageTime = selectorMetrics.totalTime / selectorMetrics.attempts;
        selectorMetrics.minTime = Math.min(selectorMetrics.minTime, executionTime);
        selectorMetrics.maxTime = Math.max(selectorMetrics.maxTime, executionTime);

        // Add to history (keep last 100 entries)
        selectorMetrics.history.push({
            timestamp: Date.now(),
            success,
            executionTime,
            metadata
        });

        if (selectorMetrics.history.length > 100) {
            selectorMetrics.history.shift();
        }

        this._updateSystemMetrics(success, executionTime);
    }

    /**
     * Record scenario performance
     */
    recordScenarioPerformance(scenarioType, success, executionTime, confidence = null, metadata = {}) {
        if (!this.options.enableMetrics) return;

        if (!this.metrics.scenarios.has(scenarioType)) {
            this.metrics.scenarios.set(scenarioType, {
                attempts: 0,
                successes: 0,
                failures: 0,
                totalTime: 0,
                averageTime: 0,
                averageConfidence: 0,
                totalConfidence: 0,
                history: []
            });
        }

        const scenarioMetrics = this.metrics.scenarios.get(scenarioType);
        scenarioMetrics.attempts++;
        scenarioMetrics.totalTime += executionTime;

        if (success) {
            scenarioMetrics.successes++;
        } else {
            scenarioMetrics.failures++;
        }

        if (confidence !== null) {
            scenarioMetrics.totalConfidence += confidence;
            scenarioMetrics.averageConfidence = scenarioMetrics.totalConfidence / scenarioMetrics.attempts;
        }

        scenarioMetrics.averageTime = scenarioMetrics.totalTime / scenarioMetrics.attempts;

        // Add to history
        scenarioMetrics.history.push({
            timestamp: Date.now(),
            success,
            executionTime,
            confidence,
            metadata
        });

        if (scenarioMetrics.history.length > 100) {
            scenarioMetrics.history.shift();
        }
    }

    /**
     * Record element performance
     */
    recordElementPerformance(elementId, operation, success, executionTime, metadata = {}) {
        if (!this.options.enableMetrics) return;

        if (!this.metrics.elements.has(elementId)) {
            this.metrics.elements.set(elementId, {
                operations: new Map(),
                totalAttempts: 0,
                totalSuccesses: 0,
                lastActivity: null
            });
        }

        const elementMetrics = this.metrics.elements.get(elementId);
        elementMetrics.totalAttempts++;
        elementMetrics.lastActivity = Date.now();

        if (success) {
            elementMetrics.totalSuccesses++;
        }

        if (!elementMetrics.operations.has(operation)) {
            elementMetrics.operations.set(operation, {
                attempts: 0,
                successes: 0,
                totalTime: 0,
                averageTime: 0
            });
        }

        const operationMetrics = elementMetrics.operations.get(operation);
        operationMetrics.attempts++;
        operationMetrics.totalTime += executionTime;
        operationMetrics.averageTime = operationMetrics.totalTime / operationMetrics.attempts;

        if (success) {
            operationMetrics.successes++;
        }
    }

    /**
     * Get comprehensive metrics
     */
    getMetrics() {
        const now = Date.now();
        const uptime = now - this.metrics.system.startTime;

        return {
            system: {
                ...this.metrics.system,
                uptime,
                uptimeFormatted: this._formatUptime(uptime),
                successRate: this.metrics.system.totalRequests > 0 
                    ? (this.metrics.system.totalRequests - this.metrics.system.totalErrors) / this.metrics.system.totalRequests 
                    : 0,
                errorRate: this.metrics.system.totalRequests > 0 
                    ? this.metrics.system.totalErrors / this.metrics.system.totalRequests 
                    : 0
            },
            selectors: this._getSelectorMetrics(),
            scenarios: this._getScenarioMetrics(),
            elements: this._getElementMetrics(),
            alerts: this.alerts.slice(-10), // Last 10 alerts
            timestamp: now
        };
    }

    /**
     * Get top performing selectors
     */
    getTopPerformingSelectors(limit = 10) {
        return Array.from(this.metrics.selectors.entries())
            .map(([selector, metrics]) => ({
                selector,
                successRate: metrics.attempts > 0 ? metrics.successes / metrics.attempts : 0,
                averageTime: metrics.averageTime,
                attempts: metrics.attempts,
                lastUsed: metrics.lastUsed
            }))
            .sort((a, b) => b.successRate - a.successRate || a.averageTime - b.averageTime)
            .slice(0, limit);
    }

    /**
     * Get worst performing selectors
     */
    getWorstPerformingSelectors(limit = 10) {
        return Array.from(this.metrics.selectors.entries())
            .map(([selector, metrics]) => ({
                selector,
                successRate: metrics.attempts > 0 ? metrics.successes / metrics.attempts : 0,
                averageTime: metrics.averageTime,
                attempts: metrics.attempts,
                lastUsed: metrics.lastUsed
            }))
            .filter(item => item.attempts >= 3) // Only include selectors with enough attempts
            .sort((a, b) => a.successRate - b.successRate || b.averageTime - a.averageTime)
            .slice(0, limit);
    }

    /**
     * Get scenario performance summary
     */
    getScenarioPerformanceSummary() {
        const summary = {};
        
        for (const [scenarioType, metrics] of this.metrics.scenarios) {
            summary[scenarioType] = {
                successRate: metrics.attempts > 0 ? metrics.successes / metrics.attempts : 0,
                averageTime: metrics.averageTime,
                averageConfidence: metrics.averageConfidence,
                attempts: metrics.attempts,
                trend: this._calculateTrend(metrics.history, 'success')
            };
        }

        return summary;
    }

    /**
     * Generate performance report
     */
    generateReport() {
        const metrics = this.getMetrics();
        const topSelectors = this.getTopPerformingSelectors(5);
        const worstSelectors = this.getWorstPerformingSelectors(5);
        const scenarioSummary = this.getScenarioPerformanceSummary();

        return {
            summary: {
                uptime: metrics.system.uptimeFormatted,
                totalRequests: metrics.system.totalRequests,
                successRate: (metrics.system.successRate * 100).toFixed(1) + '%',
                averageResponseTime: metrics.system.averageResponseTime.toFixed(0) + 'ms',
                totalElements: metrics.elements.totalElements,
                activeAlerts: this.alerts.filter(a => a.active).length
            },
            performance: {
                topSelectors,
                worstSelectors,
                scenarios: scenarioSummary
            },
            alerts: this.alerts.slice(-5),
            recommendations: this._generateRecommendations(),
            timestamp: Date.now()
        };
    }

    // Private methods

    /**
     * Collect system metrics
     */
    _collectSystemMetrics() {
        const memoryUsage = process.memoryUsage();
        
        this.metrics.system.memoryUsage = {
            rss: memoryUsage.rss,
            heapTotal: memoryUsage.heapTotal,
            heapUsed: memoryUsage.heapUsed,
            external: memoryUsage.external
        };

        this.metrics.system.cpuUsage = process.cpuUsage();
    }

    /**
     * Update system metrics
     */
    _updateSystemMetrics(success, executionTime) {
        this.metrics.system.totalRequests++;
        
        if (!success) {
            this.metrics.system.totalErrors++;
        }

        // Update average response time
        const currentAvg = this.metrics.system.averageResponseTime;
        const totalRequests = this.metrics.system.totalRequests;
        this.metrics.system.averageResponseTime = 
            ((currentAvg * (totalRequests - 1)) + executionTime) / totalRequests;
    }

    /**
     * Analyze performance trends
     */
    _analyzePerformance() {
        // Analyze selector performance trends
        for (const [selector, metrics] of this.metrics.selectors) {
            if (metrics.history.length >= 10) {
                const recentHistory = metrics.history.slice(-10);
                const recentSuccessRate = recentHistory.filter(h => h.success).length / recentHistory.length;
                const recentAvgTime = recentHistory.reduce((sum, h) => sum + h.executionTime, 0) / recentHistory.length;

                if (recentSuccessRate < this.options.alertThresholds.lowSuccessRate) {
                    this._createAlert('low_success_rate', `Selector ${selector} has low success rate: ${(recentSuccessRate * 100).toFixed(1)}%`);
                }

                if (recentAvgTime > this.options.alertThresholds.slowSelector) {
                    this._createAlert('slow_selector', `Selector ${selector} is slow: ${recentAvgTime.toFixed(0)}ms average`);
                }
            }
        }
    }

    /**
     * Check for alerts
     */
    _checkAlerts() {
        if (!this.options.enableAlerts) return;

        // Check system-level alerts
        const metrics = this.metrics.system;
        
        if (metrics.totalRequests > 100) {
            const errorRate = metrics.totalErrors / metrics.totalRequests;
            if (errorRate > this.options.alertThresholds.highFailureRate) {
                this._createAlert('high_error_rate', `System error rate is high: ${(errorRate * 100).toFixed(1)}%`);
            }
        }

        // Check memory usage
        if (metrics.memoryUsage) {
            const heapUsedMB = metrics.memoryUsage.heapUsed / 1024 / 1024;
            if (heapUsedMB > 500) { // 500MB threshold
                this._createAlert('high_memory_usage', `High memory usage: ${heapUsedMB.toFixed(0)}MB`);
            }
        }
    }

    /**
     * Create an alert
     */
    _createAlert(type, message, severity = 'warning') {
        const alert = {
            id: Date.now().toString(),
            type,
            message,
            severity,
            timestamp: Date.now(),
            active: true
        };

        this.alerts.push(alert);
        
        // Keep only last 100 alerts
        if (this.alerts.length > 100) {
            this.alerts.shift();
        }

        this.logger.warn(`Performance Alert [${type}]: ${message}`);
    }

    /**
     * Get selector metrics summary
     */
    _getSelectorMetrics() {
        return {
            totalSelectors: this.metrics.selectors.size,
            totalAttempts: Array.from(this.metrics.selectors.values()).reduce((sum, m) => sum + m.attempts, 0),
            totalSuccesses: Array.from(this.metrics.selectors.values()).reduce((sum, m) => sum + m.successes, 0),
            averageTime: this._calculateAverageTime(this.metrics.selectors)
        };
    }

    /**
     * Get scenario metrics summary
     */
    _getScenarioMetrics() {
        return {
            totalScenarios: this.metrics.scenarios.size,
            totalAttempts: Array.from(this.metrics.scenarios.values()).reduce((sum, m) => sum + m.attempts, 0),
            totalSuccesses: Array.from(this.metrics.scenarios.values()).reduce((sum, m) => sum + m.successes, 0),
            averageTime: this._calculateAverageTime(this.metrics.scenarios)
        };
    }

    /**
     * Get element metrics summary
     */
    _getElementMetrics() {
        return {
            totalElements: this.metrics.elements.size,
            totalAttempts: Array.from(this.metrics.elements.values()).reduce((sum, m) => sum + m.totalAttempts, 0),
            totalSuccesses: Array.from(this.metrics.elements.values()).reduce((sum, m) => sum + m.totalSuccesses, 0)
        };
    }

    /**
     * Calculate average time across metrics
     */
    _calculateAverageTime(metricsMap) {
        const values = Array.from(metricsMap.values());
        if (values.length === 0) return 0;
        
        const totalTime = values.reduce((sum, m) => sum + (m.totalTime || 0), 0);
        const totalAttempts = values.reduce((sum, m) => sum + (m.attempts || 0), 0);
        
        return totalAttempts > 0 ? totalTime / totalAttempts : 0;
    }

    /**
     * Calculate trend from history
     */
    _calculateTrend(history, property) {
        if (history.length < 5) return 'insufficient_data';
        
        const recent = history.slice(-5);
        const older = history.slice(-10, -5);
        
        if (older.length === 0) return 'insufficient_data';
        
        const recentAvg = recent.reduce((sum, item) => sum + (item[property] ? 1 : 0), 0) / recent.length;
        const olderAvg = older.reduce((sum, item) => sum + (item[property] ? 1 : 0), 0) / older.length;
        
        if (recentAvg > olderAvg + 0.1) return 'improving';
        if (recentAvg < olderAvg - 0.1) return 'declining';
        return 'stable';
    }

    /**
     * Format uptime
     */
    _formatUptime(uptime) {
        const seconds = Math.floor(uptime / 1000);
        const minutes = Math.floor(seconds / 60);
        const hours = Math.floor(minutes / 60);
        const days = Math.floor(hours / 24);

        if (days > 0) return `${days}d ${hours % 24}h ${minutes % 60}m`;
        if (hours > 0) return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
        if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
        return `${seconds}s`;
    }

    /**
     * Generate performance recommendations
     */
    _generateRecommendations() {
        const recommendations = [];
        const worstSelectors = this.getWorstPerformingSelectors(3);
        
        if (worstSelectors.length > 0) {
            recommendations.push({
                type: 'selector_optimization',
                message: `Consider optimizing selectors with low success rates: ${worstSelectors.map(s => s.selector).join(', ')}`,
                priority: 'high'
            });
        }

        const metrics = this.getMetrics();
        if (metrics.system.errorRate > 0.2) {
            recommendations.push({
                type: 'error_rate',
                message: 'High error rate detected. Review element registration and healing strategies.',
                priority: 'high'
            });
        }

        if (metrics.system.averageResponseTime > 1000) {
            recommendations.push({
                type: 'performance',
                message: 'Average response time is high. Consider optimizing selector strategies.',
                priority: 'medium'
            });
        }

        return recommendations;
    }

    /**
     * Stop monitoring and cleanup
     */
    stop() {
        this.stopMonitoring();
        this.logger.info('Performance Monitor stopped');
    }
}
