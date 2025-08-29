export class Logger {
    constructor(namespace?: string);
    debug: ((message: string) => void) | undefined;
    namespace: string;
    /**
     * Log debug message if debug is enabled
     * @param {string} message Message to log
     * @param {object} context Additional context
     */
    log(message: string, context?: object): void;
    /**
     * Log warning message
     * @param {string} message Warning message
     * @param {object} context Additional context
     */
    warn(message: string, context?: object): void;
    /**
     * Log error message
     * @param {string} message Error message
     * @param {Error|object} error Error object or context
     */
    error(message: string, error?: Error | object): void;
    /**
     * Create a child logger with additional namespace
     * @param {string} childNamespace Child namespace
     * @return {Logger} Child logger
     */
    child(childNamespace: string): Logger;
    /**
     * Time a function execution
     * @param {string} label Timer label
     * @param {Function} fn Function to time
     * @return {*} Function result
     */
    time(label: string, fn: Function): any;
}
export const defaultLogger: Logger;
//# sourceMappingURL=logger.d.ts.map