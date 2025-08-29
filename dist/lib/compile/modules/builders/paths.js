"use strict";
/**
 * Path Building Module
 *
 * This module contains all functions related to building OpenAPI paths
 * from CDS model elements.
 */
const { nameParts, isIdentifier } = require('../utils/naming');
const { assert } = require('../utils/errors');
const { Logger } = require('../utils/logger');
const logger = new Logger('csdl2openapi:paths');
const DEBUG = logger.debug.bind(logger);
/**
 * Extract path value prefix based on type
 * @param {string} typename - The type name
 * @param {boolean} keyAsSegment - Whether key is used as segment
 * @return {string} value prefix
 */
function pathValuePrefix(typename, keyAsSegment) {
    //TODO: handle other Edm types, enumeration types, and type definitions
    if (['Edm.Int64', 'Edm.Int32', 'Edm.Int16', 'Edm.SByte', 'Edm.Byte',
        'Edm.Double', 'Edm.Single', 'Edm.Date', 'Edm.DateTimeOffset', 'Edm.Guid'].includes(typename))
        return '';
    if (keyAsSegment)
        return '';
    return `'`;
}
/**
 * Extract path value suffix based on type
 * @param {string} typename - The type name
 * @param {boolean} keyAsSegment - Whether key is used as segment
 * @return {string} value suffix
 */
function pathValueSuffix(typename, keyAsSegment) {
    //TODO: handle other Edm types, enumeration types, and type definitions
    if (['Edm.Int64', 'Edm.Int32', 'Edm.Int16', 'Edm.SByte', 'Edm.Byte',
        'Edm.Double', 'Edm.Single', 'Edm.Date', 'Edm.DateTimeOffset', 'Edm.Guid'].includes(typename))
        return '';
    if (keyAsSegment)
        return '';
    return `'`;
}
/**
 * Unpack NavigationPropertyPath value if it uses CSDL JSON CS01 style
 * @param {string|object} path - Qualified name of referenced type
 * @return {string} Navigation property path
 */
function navigationPropertyPath(path) {
    if (typeof path == 'string')
        return path;
    else
        return path.$NavigationPropertyPath;
}
/**
 * Unpack PropertyPath value if it uses CSDL JSON CS01 style
 * @param {string|object} path - Qualified name of referenced type
 * @return {string} Property path
 */
function propertyPath(path) {
    if (typeof path == 'string')
        return path;
    else
        return path.$PropertyPath;
}
/**
 * Build navigation paths from element
 * @param {object} element - Model element
 * @param {Function} modelElement - Function to get model element
 * @param {Function} propertiesOfStructuredType - Function to get properties
 * @param {string} prefix - Path prefix
 * @param {number} level - Navigation level
 * @param {number} maxLevels - Maximum navigation levels
 * @return {Array} Array of navigation property paths
 */
function navigationPaths(element, modelElement, propertiesOfStructuredType, prefix = '', level = 0, maxLevels) {
    const paths = [];
    const type = modelElement(element.$Type);
    const properties = propertiesOfStructuredType(type);
    Object.keys(properties).forEach(key => {
        if (properties[key].$Kind == 'NavigationProperty') {
            paths.push(prefix + key);
            if (!properties[key].$ContainsTarget && level < maxLevels) {
                const target = modelElement(properties[key].$Type);
                if (target && target.$Kind == 'EntityType') {
                    const targetPaths = navigationPaths(target, modelElement, propertiesOfStructuredType, prefix + key + '/', level + 1, maxLevels);
                    paths.push(...targetPaths);
                }
            }
        }
        else if (properties[key].$Type && !properties[key].$Collection && level < maxLevels) {
            const complexType = modelElement(properties[key].$Type);
            if (complexType && complexType.$Kind == 'ComplexType') {
                const complexPaths = navigationPaths({ $Type: properties[key].$Type }, modelElement, propertiesOfStructuredType, prefix + key + '/', level + 1, maxLevels);
                paths.push(...complexPaths);
            }
        }
    });
    return paths;
}
/**
 * Create a map of navigation property paths and their types
 * @param {object} type - Type to analyze
 * @param {Function} propertiesOfStructuredType - Function to get properties
 * @param {Function} modelElement - Function to get model element
 * @param {object} map - Map to populate
 * @param {string} prefix - Path prefix
 * @param {number} level - Current level
 * @param {number} maxLevels - Maximum levels
 * @return {object} Map of navigation property paths and their types
 */
function navigationPathMap(type, propertiesOfStructuredType, modelElement, map = {}, prefix = '', level = 0, maxLevels) {
    const properties = propertiesOfStructuredType(type);
    Object.keys(properties).forEach(key => {
        if (properties[key].$Kind == 'NavigationProperty') {
            map[prefix + key] = properties[key];
        }
        else if (properties[key].$Type && !properties[key].$Collection && level < maxLevels) {
            const complexType = modelElement(properties[key].$Type);
            if (complexType && complexType.$Kind == 'ComplexType') {
                navigationPathMap(complexType, propertiesOfStructuredType, modelElement, map, prefix + key + '/', level + 1, maxLevels);
            }
        }
    });
    return map;
}
/**
 * Collect primitive paths of a navigation segment and its potentially structured components
 * @param {object} element - Model element of navigation segment
 * @param {Function} modelElement - Function to get model element
 * @param {Function} propertiesOfStructuredType - Function to get properties
 * @param {string} prefix - Navigation prefix
 * @return {Array} Array of primitive property paths
 */
function primitivePaths(element, modelElement, propertiesOfStructuredType, prefix = '') {
    const paths = [];
    const elementType = modelElement(element.$Type);
    if (!elementType) {
        DEBUG?.(`Unknown type for element: ${JSON.stringify(element)}`);
        return paths;
    }
    const propsOfType = propertiesOfStructuredType(elementType);
    const ignore = Object.entries(propsOfType)
        .filter(entry => entry[1].$Kind !== 'NavigationProperty')
        .filter(entry => entry[1].$Type)
        .filter(entry => nameParts(entry[1].$Type).qualifier !== 'Edm')
        .filter(entry => !modelElement(entry[1].$Type));
    // Keep old logging
    ignore.forEach(entry => DEBUG?.(`Unknown type for element: ${JSON.stringify(entry)}`));
    const properties = Object.entries(propsOfType)
        .filter(entry => entry[1].$Kind !== 'NavigationProperty')
        .filter(entry => !ignore.includes(entry))
        .map(entryToProperty({ path: prefix, typeRefChain: [] }, modelElement, propertiesOfStructuredType));
    for (let i = 0; i < properties.length; i++) {
        const property = properties[i];
        if (!property.isComplex) {
            paths.push(property.path);
            continue;
        }
        const typeRefChainTail = property.typeRefChain[property.typeRefChain.length - 1];
        // Allow full cycle to be shown (0) times
        if (property.typeRefChain.filter(_type => _type === typeRefChainTail).length > 1) {
            DEBUG?.(`Cycle detected ${property.typeRefChain.join('->')}`);
            continue;
        }
        const expanded = Object.entries(property.properties)
            .filter(pProperty => pProperty[1].$Kind !== 'NavigationProperty')
            .map(entryToProperty(property, modelElement, propertiesOfStructuredType));
        properties.splice(i + 1, 0, ...expanded);
    }
    return paths;
}
/**
 * Helper function to convert entry to property
 * @param {object} parent - Parent property
 * @param {Function} modelElement - Function to get model element
 * @param {Function} propertiesOfStructuredType - Function to get properties
 * @return {Function} Function that converts entry to property
 */
function entryToProperty(parent, modelElement, propertiesOfStructuredType) {
    return function (entry) {
        const key = entry[0];
        const property = entry[1];
        const propertyType = property.$Type && modelElement(property.$Type);
        if (propertyType && propertyType.$Kind && propertyType.$Kind === 'ComplexType') {
            return {
                properties: propertiesOfStructuredType(propertyType),
                path: `${parent.path}${key}/`,
                typeRefChain: parent.typeRefChain.concat(property.$Type),
                isComplex: true
            };
        }
        return {
            properties: {},
            path: `${parent.path}${key}`,
            typeRefChain: [],
            isComplex: false,
        };
    };
}
/**
 * Build path parameters for key properties
 * @param {object} keyNames - Key property names
 * @param {object} properties - Properties of the type
 * @param {string} level - Navigation level
 * @param {object} options - Options object with keyAsSegment flag
 * @return {Array} Array of parameter objects
 */
function buildKeyParameters(keyNames, properties, level, options = {}) {
    const { keyAsSegment } = options;
    const parameters = [];
    keyNames.forEach(name => {
        const property = properties[name];
        const param = {
            name: name + '-' + level,
            in: 'path',
            required: true,
            description: property[property.$Type === 'Edm.String' ? 'Core.Description' : '$Type']
                || `key: ${name}`,
            schema: {
                type: property.$Type === 'Edm.String' ? 'string' :
                    ['Edm.Int64', 'Edm.Int32', 'Edm.Int16', 'Edm.SByte', 'Edm.Byte'].includes(property.$Type) ? 'integer' :
                        'string'
            }
        };
        // Add format for specific types
        if (property.$Type === 'Edm.Int64')
            param.schema.format = 'int64';
        if (property.$Type === 'Edm.Int32')
            param.schema.format = 'int32';
        if (property.$Type === 'Edm.Guid')
            param.schema.pattern = '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$';
        parameters.push(param);
    });
    return parameters;
}
/**
 * Build path template with key parameters
 * @param {string} prefix - Path prefix
 * @param {Array} keyNames - Key property names
 * @param {object} properties - Properties of the type
 * @param {number} level - Navigation level
 * @param {object} options - Options including keyAsSegment flag
 * @return {string} Path template
 */
function buildPathWithKeys(prefix, keyNames, properties, level, options = {}) {
    const { keyAsSegment } = options;
    if (keyAsSegment) {
        // Key as segment style: /path/keyValue
        return keyNames.map(name => {
            const property = properties[name];
            const valuePrefix = pathValuePrefix(property.$Type, keyAsSegment);
            const valueSuffix = pathValueSuffix(property.$Type, keyAsSegment);
            return `${prefix}/${valuePrefix}{${name}-${level}}${valueSuffix}`;
        }).join('');
    }
    else {
        // Parentheses style: /path(key=value)
        const keyParams = keyNames.map(name => {
            const property = properties[name];
            const valuePrefix = pathValuePrefix(property.$Type, keyAsSegment);
            const valueSuffix = pathValueSuffix(property.$Type, keyAsSegment);
            return `${name}=${valuePrefix}{${name}-${level}}${valueSuffix}`;
        }).join(',');
        return `${prefix}(${keyParams})`;
    }
}
module.exports = {
    pathValuePrefix,
    pathValueSuffix,
    navigationPropertyPath,
    propertyPath,
    navigationPaths,
    navigationPathMap,
    primitivePaths,
    entryToProperty,
    buildKeyParameters,
    buildPathWithKeys
};
//# sourceMappingURL=paths.js.map