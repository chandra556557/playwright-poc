/**
 * Enhanced Logger Utility
 * Provides structured logging with multiple levels and outputs
 */

import winston from 'winston';
import path from 'path';

export class Logger {
    constructor(options = {}) {
        this.options = {
            level: process.env.LOG_LEVEL || 'info',
            enableConsole: true,
            enableFile: true,
            logDir: './logs',
            maxFiles: 5,
            maxSize: '20m',
            ...options
        };

        this.logger = this._createLogger();
    }

    _createLogger() {
        const transports = [];

        // Console transport
        if (this.options.enableConsole) {
            transports.push(new winston.transports.Console({
                format: winston.format.combine(
                    winston.format.colorize(),
                    winston.format.timestamp(),
                    winston.format.printf(({ timestamp, level, message, ...meta }) => {
                        const metaStr = Object.keys(meta).length ? JSON.stringify(meta, null, 2) : '';
                        return `${timestamp} [${level}]: ${message} ${metaStr}`;
                    })
                )
            }));
        }

        // File transport
        if (this.options.enableFile) {
            transports.push(new winston.transports.File({
                filename: path.join(this.options.logDir, 'ai-element-inspector.log'),
                maxFiles: this.options.maxFiles,
                maxsize: this.options.maxSize,
                format: winston.format.combine(
                    winston.format.timestamp(),
                    winston.format.json()
                )
            }));

            // Error log file
            transports.push(new winston.transports.File({
                filename: path.join(this.options.logDir, 'error.log'),
                level: 'error',
                maxFiles: this.options.maxFiles,
                maxsize: this.options.maxSize,
                format: winston.format.combine(
                    winston.format.timestamp(),
                    winston.format.json()
                )
            }));
        }

        return winston.createLogger({
            level: this.options.level,
            transports,
            exitOnError: false
        });
    }

    debug(message, meta = {}) {
        this.logger.debug(message, meta);
    }

    info(message, meta = {}) {
        this.logger.info(message, meta);
    }

    warn(message, meta = {}) {
        this.logger.warn(message, meta);
    }

    error(message, meta = {}) {
        this.logger.error(message, meta);
    }

    setLevel(level) {
        this.logger.level = level;
    }
}

// Export default instance
export default new Logger();
