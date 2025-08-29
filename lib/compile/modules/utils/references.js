/**
 * Reference utilities for OpenAPI generation
 */

/**
 * Create a reference to a component schema
 * @param {string} name Schema name
 * @return {object} Reference object
 */
function ref(name) {
    return { $ref: '#/components/schemas/' + name };
}

/**
 * Create a reference to a component response
 * @param {string} name Response name
 * @return {object} Reference object
 */
function responseRef(name) {
    return { $ref: '#/components/responses/' + name };
}

/**
 * Create a reference to a component parameter
 * @param {string} name Parameter name
 * @return {object} Reference object
 */
function parameterRef(name) {
    return { $ref: '#/components/parameters/' + name };
}

module.exports = {
    ref,
    responseRef,
    parameterRef
};