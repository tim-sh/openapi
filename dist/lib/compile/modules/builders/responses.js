"use strict";
/**
 * Response Building Module
 *
 * This module contains all functions related to building OpenAPI responses
 * from CDS model elements.
 */
const { Logger } = require('../utils/logger');
const logger = new Logger('csdl2openapi:responses');
const DEBUG = logger.debug.bind(logger);
/**
 * Build response object for collection
 * @param {object} element - Model element
 * @param {string} description - Response description
 * @param {object} options - Options including csdlVersion
 * @return {object} Response object
 */
function collectionResponse(element, description, options = {}) {
    const { csdlVersion = '4.0' } = options;
    return {
        description: description || 'Retrieved entities',
        content: {
            'application/json': {
                schema: {
                    type: 'object',
                    title: 'Collection of ' + element.$Type,
                    properties: {
                        '@odata.count': {
                            $ref: '#/components/schemas/count'
                        },
                        value: {
                            type: 'array',
                            items: {
                                $ref: '#/components/schemas/' + element.$Type.replace(/\./g, '_')
                            }
                        }
                    }
                }
            }
        }
    };
}
/**
 * Build response object for single entity
 * @param {object} element - Model element
 * @param {string} description - Response description
 * @return {object} Response object
 */
function entityResponse(element, description) {
    return {
        description: description || 'Retrieved entity',
        content: {
            'application/json': {
                schema: {
                    $ref: '#/components/schemas/' + element.$Type.replace(/\./g, '_')
                }
            }
        }
    };
}
/**
 * Build response object for action/function result
 * @param {object} returnType - Return type definition
 * @param {string} description - Response description
 * @param {Function} modelElement - Function to get model element
 * @return {object} Response object
 */
function operationResponse(returnType, description, modelElement) {
    if (!returnType || !returnType.$Type) {
        return {
            description: description || 'Success',
            content: {}
        };
    }
    const response = {
        description: description || 'Success',
        content: {
            'application/json': {
                schema: {}
            }
        }
    };
    const schema = response.content['application/json'].schema;
    if (returnType.$Collection) {
        schema.type = 'object';
        schema.title = `Collection of ${returnType.$Type}`;
        schema.properties = {
            '@odata.count': {
                $ref: '#/components/schemas/count'
            },
            value: {
                type: 'array',
                items: getTypeSchema(returnType.$Type, modelElement)
            }
        };
    }
    else {
        Object.assign(schema, getTypeSchema(returnType.$Type, modelElement));
    }
    return response;
}
/**
 * Get schema for a type
 * @param {string} typeName - Type name
 * @param {Function} modelElement - Function to get model element
 * @return {object} Schema object
 */
function getTypeSchema(typeName, modelElement) {
    // Check if it's an Edm type
    if (typeName.startsWith('Edm.')) {
        return getEdmTypeSchema(typeName);
    }
    // Check if it's a model type
    const type = modelElement(typeName);
    if (type) {
        return { $ref: '#/components/schemas/' + typeName.replace(/\./g, '_') };
    }
    // Default to string
    DEBUG?.(`Unknown type: ${typeName}, defaulting to string`);
    return { type: 'string' };
}
/**
 * Get OpenAPI schema for EDM type
 * @param {string} typeName - EDM type name
 * @return {object} Schema object
 */
function getEdmTypeSchema(typeName) {
    const edmTypeMap = {
        'Edm.Binary': { type: 'string', format: 'base64' },
        'Edm.Boolean': { type: 'boolean' },
        'Edm.Byte': { type: 'integer', format: 'uint8' },
        'Edm.Date': { type: 'string', format: 'date' },
        'Edm.DateTimeOffset': { type: 'string', format: 'date-time' },
        'Edm.Decimal': { type: 'number', format: 'decimal' },
        'Edm.Double': { type: 'number', format: 'double' },
        'Edm.Duration': { type: 'string', format: 'duration' },
        'Edm.Guid': {
            type: 'string',
            format: 'uuid',
            pattern: '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$'
        },
        'Edm.Int16': { type: 'integer', format: 'int16' },
        'Edm.Int32': { type: 'integer', format: 'int32' },
        'Edm.Int64': { type: 'integer', format: 'int64' },
        'Edm.SByte': { type: 'integer', format: 'int8' },
        'Edm.Single': { type: 'number', format: 'float' },
        'Edm.String': { type: 'string' },
        'Edm.TimeOfDay': { type: 'string', format: 'time' },
        'Edm.Geography': { type: 'object' },
        'Edm.GeographyPoint': { type: 'object' },
        'Edm.GeographyLineString': { type: 'object' },
        'Edm.GeographyPolygon': { type: 'object' },
        'Edm.GeographyMultiPoint': { type: 'object' },
        'Edm.GeographyMultiLineString': { type: 'object' },
        'Edm.GeographyMultiPolygon': { type: 'object' },
        'Edm.GeographyCollection': { type: 'object' },
        'Edm.Geometry': { type: 'object' },
        'Edm.GeometryPoint': { type: 'object' },
        'Edm.GeometryLineString': { type: 'object' },
        'Edm.GeometryPolygon': { type: 'object' },
        'Edm.GeometryMultiPoint': { type: 'object' },
        'Edm.GeometryMultiLineString': { type: 'object' },
        'Edm.GeometryMultiPolygon': { type: 'object' },
        'Edm.GeometryCollection': { type: 'object' },
        'Edm.Stream': { type: 'string', format: 'binary' }
    };
    return edmTypeMap[typeName] || { type: 'string' };
}
/**
 * Build error response object
 * @param {string} description - Error description
 * @return {object} Error response object
 */
function errorResponse(description) {
    return {
        description: description || 'Error',
        content: {
            'application/json': {
                schema: {
                    $ref: '#/components/schemas/error'
                }
            }
        }
    };
}
/**
 * Build standard OData responses
 * @return {object} Standard responses object
 */
function buildStandardResponses() {
    return {
        error: errorResponse('Error'),
        '400': errorResponse('Bad Request'),
        '401': errorResponse('Unauthorized'),
        '403': errorResponse('Forbidden'),
        '404': errorResponse('Not Found'),
        '500': errorResponse('Internal Server Error'),
        '501': errorResponse('Not Implemented')
    };
}
/**
 * Build response for $count endpoint
 * @return {object} Count response object
 */
function countResponse() {
    return {
        description: 'The count of the resource',
        content: {
            'text/plain': {
                schema: {
                    type: 'integer',
                    minimum: 0
                }
            }
        }
    };
}
/**
 * Build response for batch endpoint
 * @return {object} Batch response object
 */
function batchResponse() {
    return {
        description: 'Batch response',
        content: {
            'multipart/mixed': {
                schema: {
                    type: 'string'
                }
            }
        }
    };
}
/**
 * Build response with ETag support
 * @param {object} baseResponse - Base response object
 * @param {boolean} required - Whether ETag is required
 * @return {object} Response with ETag headers
 */
function withETag(baseResponse, required = false) {
    const response = JSON.parse(JSON.stringify(baseResponse)); // Deep clone
    response.headers = response.headers || {};
    response.headers.ETag = {
        description: 'Entity tag',
        schema: {
            type: 'string'
        }
    };
    if (required) {
        response.headers.ETag.required = true;
    }
    return response;
}
module.exports = {
    collectionResponse,
    entityResponse,
    operationResponse,
    errorResponse,
    countResponse,
    batchResponse,
    buildStandardResponses,
    getTypeSchema,
    getEdmTypeSchema,
    withETag
};
//# sourceMappingURL=responses.js.map