/**
 * Error handling utilities for OpenAPI conversion
 */

class OpenAPIConversionError extends Error {
    constructor(message, details = {}) {
        super(message);
        this.name = 'OpenAPIConversionError';
        this.details = details;
    }
}

class ValidationError extends OpenAPIConversionError {
    constructor(message, details = {}) {
        super(message, details);
        this.name = 'ValidationError';
    }
}

class ConfigurationError extends OpenAPIConversionError {
    constructor(message, details = {}) {
        super(message, details);
        this.name = 'ConfigurationError';
    }
}

/**
 * Assert with custom error message
 * @param {boolean} condition Condition to check
 * @param {string} message Error message if condition is false
 * @param {object} details Additional error details
 */
function assert(condition, message, details = {}) {
    if (!condition) {
        throw new ValidationError(message, details);
    }
}

/**
 * Safe property access with validation
 * @param {object} obj Object to access
 * @param {string} path Property path (e.g., 'a.b.c')
 * @param {*} defaultValue Default value if property doesn't exist
 * @return {*} Property value or default
 */
function safeGet(obj, path, defaultValue = undefined) {
    try {
        const keys = path.split('.');
        let result = obj;
        
        for (const key of keys) {
            if (result == null) {
                return defaultValue;
            }
            result = result[key];
        }
        
        return result !== undefined ? result : defaultValue;
    } catch (error) {
        return defaultValue;
    }
}

module.exports = {
    OpenAPIConversionError,
    ValidationError,
    ConfigurationError,
    assert,
    safeGet
};