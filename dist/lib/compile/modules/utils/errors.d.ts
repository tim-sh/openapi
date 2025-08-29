/**
 * Error handling utilities for OpenAPI conversion
 */
export class OpenAPIConversionError extends Error {
    constructor(message: any, details?: {});
    details: {};
}
export class ValidationError extends OpenAPIConversionError {
}
export class ConfigurationError extends OpenAPIConversionError {
}
/**
 * Assert with custom error message
 * @param {boolean} condition Condition to check
 * @param {string} message Error message if condition is false
 * @param {object} details Additional error details
 */
export function assert(condition: boolean, message: string, details?: object): void;
/**
 * Safe property access with validation
 * @param {object} obj Object to access
 * @param {string} path Property path (e.g., 'a.b.c')
 * @param {*} defaultValue Default value if property doesn't exist
 * @return {*} Property value or default
 */
export function safeGet(obj: object, path: string, defaultValue?: any): any;
//# sourceMappingURL=errors.d.ts.map