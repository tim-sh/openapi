/**
 * Build response object for collection
 * @param {object} element - Model element
 * @param {string} description - Response description
 * @param {object} options - Options including csdlVersion
 * @return {object} Response object
 */
export function collectionResponse(element: object, description: string, options?: object): object;
/**
 * Build response object for single entity
 * @param {object} element - Model element
 * @param {string} description - Response description
 * @return {object} Response object
 */
export function entityResponse(element: object, description: string): object;
/**
 * Build response object for action/function result
 * @param {object} returnType - Return type definition
 * @param {string} description - Response description
 * @param {Function} modelElement - Function to get model element
 * @return {object} Response object
 */
export function operationResponse(returnType: object, description: string, modelElement: Function): object;
/**
 * Build error response object
 * @param {string} description - Error description
 * @return {object} Error response object
 */
export function errorResponse(description: string): object;
/**
 * Build response for $count endpoint
 * @return {object} Count response object
 */
export function countResponse(): object;
/**
 * Build response for batch endpoint
 * @return {object} Batch response object
 */
export function batchResponse(): object;
/**
 * Build standard OData responses
 * @return {object} Standard responses object
 */
export function buildStandardResponses(): object;
/**
 * Get schema for a type
 * @param {string} typeName - Type name
 * @param {Function} modelElement - Function to get model element
 * @return {object} Schema object
 */
export function getTypeSchema(typeName: string, modelElement: Function): object;
/**
 * Get OpenAPI schema for EDM type
 * @param {string} typeName - EDM type name
 * @return {object} Schema object
 */
export function getEdmTypeSchema(typeName: string): object;
/**
 * Build response with ETag support
 * @param {object} baseResponse - Base response object
 * @param {boolean} required - Whether ETag is required
 * @return {object} Response with ETag headers
 */
export function withETag(baseResponse: object, required?: boolean): object;
//# sourceMappingURL=responses.d.ts.map