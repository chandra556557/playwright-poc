/**
 * Configuration Management
 */

export class Config {
    constructor() {
        this.config = {
            server: {
                port: process.env.PORT || 3000,
                host: process.env.HOST || 'localhost'
            },
            cors: {
                allowedOrigins: process.env.CORS_ORIGINS?.split(',') || ['http://localhost:3000']
            },
            rateLimiting: {
                points: parseInt(process.env.RATE_LIMIT_POINTS) || 100,
                duration: parseInt(process.env.RATE_LIMIT_DURATION) || 60
            },
            monitoring: {
                updateInterval: parseInt(process.env.MONITORING_INTERVAL) || 5000
            },
            database: {
                type: process.env.DB_TYPE || 'sqlite',
                path: process.env.DB_PATH || './data/ai-inspector.db'
            }
        };
    }

    get(path, defaultValue = null) {
        const keys = path.split('.');
        let value = this.config;
        
        for (const key of keys) {
            if (value && typeof value === 'object' && key in value) {
                value = value[key];
            } else {
                return defaultValue;
            }
        }
        
        return value;
    }

    set(path, value) {
        const keys = path.split('.');
        let current = this.config;
        
        for (let i = 0; i < keys.length - 1; i++) {
            const key = keys[i];
            if (!(key in current) || typeof current[key] !== 'object') {
                current[key] = {};
            }
            current = current[key];
        }
        
        current[keys[keys.length - 1]] = value;
    }
}

/**
 * Database Manager
 */
import sqlite3 from 'sqlite3';
import { Logger } from './logger.js';

export class DatabaseManager {
    constructor(options = {}) {
        this.options = {
            dbPath: './data/ai-inspector.db',
            ...options
        };
        
        this.logger = new Logger();
        this.db = null;
    }

    async initialize() {
        return new Promise((resolve, reject) => {
            this.db = new sqlite3.Database(this.options.dbPath, (err) => {
                if (err) {
                    this.logger.error('Database connection failed:', err);
                    reject(err);
                } else {
                    this.logger.info('Database connected successfully');
                    this._createTables().then(resolve).catch(reject);
                }
            });
        });
    }

    async _createTables() {
        const tables = [
            `CREATE TABLE IF NOT EXISTS elements (
                id TEXT PRIMARY KEY,
                signature TEXT NOT NULL,
                selectors TEXT NOT NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )`,
            `CREATE TABLE IF NOT EXISTS performance_metrics (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                element_id TEXT NOT NULL,
                selector TEXT NOT NULL,
                success BOOLEAN NOT NULL,
                execution_time INTEGER NOT NULL,
                timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (element_id) REFERENCES elements (id)
            )`,
            `CREATE TABLE IF NOT EXISTS scenarios (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                element_id TEXT NOT NULL,
                scenario_type TEXT NOT NULL,
                success BOOLEAN NOT NULL,
                confidence REAL,
                execution_time INTEGER NOT NULL,
                metadata TEXT,
                timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (element_id) REFERENCES elements (id)
            )`
        ];

        for (const sql of tables) {
            await this._run(sql);
        }
    }

    async _run(sql, params = []) {
        return new Promise((resolve, reject) => {
            this.db.run(sql, params, function(err) {
                if (err) {
                    reject(err);
                } else {
                    resolve(this);
                }
            });
        });
    }

    async _get(sql, params = []) {
        return new Promise((resolve, reject) => {
            this.db.get(sql, params, (err, row) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(row);
                }
            });
        });
    }

    async _all(sql, params = []) {
        return new Promise((resolve, reject) => {
            this.db.all(sql, params, (err, rows) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(rows);
                }
            });
        });
    }

    async saveElement(elementId, signature, selectors) {
        const sql = `INSERT OR REPLACE INTO elements (id, signature, selectors, updated_at) 
                     VALUES (?, ?, ?, CURRENT_TIMESTAMP)`;
        return this._run(sql, [elementId, JSON.stringify(signature), JSON.stringify(selectors)]);
    }

    async getElement(elementId) {
        const sql = `SELECT * FROM elements WHERE id = ?`;
        const row = await this._get(sql, [elementId]);
        if (row) {
            row.signature = JSON.parse(row.signature);
            row.selectors = JSON.parse(row.selectors);
        }
        return row;
    }

    async savePerformanceMetric(elementId, selector, success, executionTime) {
        const sql = `INSERT INTO performance_metrics (element_id, selector, success, execution_time) 
                     VALUES (?, ?, ?, ?)`;
        return this._run(sql, [elementId, selector, success, executionTime]);
    }

    async getPerformanceMetrics(elementId = null) {
        let sql = `SELECT * FROM performance_metrics`;
        const params = [];
        
        if (elementId) {
            sql += ` WHERE element_id = ?`;
            params.push(elementId);
        }
        
        sql += ` ORDER BY timestamp DESC LIMIT 1000`;
        return this._all(sql, params);
    }

    async saveScenarioResult(elementId, scenarioType, success, confidence, executionTime, metadata) {
        const sql = `INSERT INTO scenarios (element_id, scenario_type, success, confidence, execution_time, metadata) 
                     VALUES (?, ?, ?, ?, ?, ?)`;
        return this._run(sql, [elementId, scenarioType, success, confidence, executionTime, JSON.stringify(metadata)]);
    }

    async getScenarioResults(elementId = null) {
        let sql = `SELECT * FROM scenarios`;
        const params = [];
        
        if (elementId) {
            sql += ` WHERE element_id = ?`;
            params.push(elementId);
        }
        
        sql += ` ORDER BY timestamp DESC LIMIT 1000`;
        const rows = await this._all(sql, params);
        
        return rows.map(row => ({
            ...row,
            metadata: JSON.parse(row.metadata || '{}')
        }));
    }

    async close() {
        if (this.db) {
            return new Promise((resolve) => {
                this.db.close((err) => {
                    if (err) {
                        this.logger.error('Error closing database:', err);
                    } else {
                        this.logger.info('Database connection closed');
                    }
                    resolve();
                });
            });
        }
    }
}
