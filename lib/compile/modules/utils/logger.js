/**
 * Logging utilities for OpenAPI conversion
 */

const cds = require('@sap/cds');

class Logger {
    constructor(namespace = 'openapi') {
        this.debug = cds.debug(namespace);
        this.namespace = namespace;
    }

    /**
     * Log debug message if debug is enabled
     * @param {string} message Message to log
     * @param {object} context Additional context
     */
    log(message, context = {}) {
        if (this.debug) {
            this.debug(message, context);
        }
    }

    /**
     * Log warning message
     * @param {string} message Warning message
     * @param {object} context Additional context
     */
    warn(message, context = {}) {
        console.warn(`[${this.namespace}] WARNING: ${message}`, context);
    }

    /**
     * Log error message
     * @param {string} message Error message
     * @param {Error|object} error Error object or context
     */
    error(message, error = {}) {
        console.error(`[${this.namespace}] ERROR: ${message}`, error);
    }

    /**
     * Create a child logger with additional namespace
     * @param {string} childNamespace Child namespace
     * @return {Logger} Child logger
     */
    child(childNamespace) {
        return new Logger(`${this.namespace}:${childNamespace}`);
    }

    /**
     * Time a function execution
     * @param {string} label Timer label
     * @param {Function} fn Function to time
     * @return {*} Function result
     */
    async time(label, fn) {
        const start = Date.now();
        try {
            const result = await fn();
            this.log(`${label} completed in ${Date.now() - start}ms`);
            return result;
        } catch (error) {
            this.error(`${label} failed after ${Date.now() - start}ms`, error);
            throw error;
        }
    }
}

// Default logger instance
const defaultLogger = new Logger();

module.exports = {
    Logger,
    defaultLogger
};