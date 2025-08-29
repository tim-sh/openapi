"use strict";
/**
 * Parameter Building Module
 *
 * This module contains all functions related to building OpenAPI parameters
 * from CDS model elements.
 */
const { propertyPath, primitivePaths } = require('./paths');
const { enumMember } = require('../utils/naming');
const { Logger } = require('../utils/logger');
const logger = new Logger('csdl2openapi:parameters');
const DEBUG = logger.debug.bind(logger);
/**
 * Add standard OData query parameters to a path
 * @param {Array} parameters - Array of parameters to augment
 * @param {object} element - Model element
 * @param {object} modelElement - Function to get model element
 * @param {object} propertiesOfStructuredType - Function to get properties
 * @param {object} root - Root entity set
 * @param {string} navigationPath - Navigation path for restrictions
 * @param {object} target - Target container child
 * @param {object} restrictions - Navigation restrictions
 * @param {object} options - Options including queryOptionPrefix
 */
function addQueryOptions(parameters, element, modelElement, propertiesOfStructuredType, root, navigationPath, target, restrictions, options = {}) {
    const { queryOptionPrefix = '$' } = options;
    // Add standard query options
    optionTop(parameters, restrictions, queryOptionPrefix);
    optionSkip(parameters, restrictions, queryOptionPrefix);
    optionCount(parameters, restrictions, target, queryOptionPrefix);
    optionFilter(parameters, element, modelElement, propertiesOfStructuredType, target, restrictions, queryOptionPrefix);
    optionOrderBy(parameters, element, modelElement, propertiesOfStructuredType, target, restrictions, queryOptionPrefix);
    optionSearch(parameters, target, restrictions, queryOptionPrefix);
}
/**
 * Add parameter for query option $top
 * @param {Array} parameters - Array of parameters to augment
 * @param {object} restrictions - Navigation property restrictions
 * @param {string} queryOptionPrefix - Query option prefix
 */
function optionTop(parameters, restrictions, queryOptionPrefix = '$') {
    if (restrictions.TopSupported !== false) {
        parameters.push({ $ref: '#/components/parameters/top' });
    }
}
/**
 * Add parameter for query option $skip
 * @param {Array} parameters - Array of parameters to augment
 * @param {object} restrictions - Navigation property restrictions
 * @param {string} queryOptionPrefix - Query option prefix
 */
function optionSkip(parameters, restrictions, queryOptionPrefix = '$') {
    if (restrictions.SkipSupported !== false) {
        parameters.push({ $ref: '#/components/parameters/skip' });
    }
}
/**
 * Add parameter for query option $count
 * @param {Array} parameters - Array of parameters to augment
 * @param {object} restrictions - Navigation property restrictions
 * @param {string} target - Target container child
 * @param {string} queryOptionPrefix - Query option prefix
 */
function optionCount(parameters, restrictions, target, queryOptionPrefix = '$') {
    const countRestrictions = restrictions.CountRestrictions || (target && target['Org.OData.Capabilities.V1.CountRestrictions']) || {};
    if (countRestrictions.Countable !== false) {
        parameters.push({ $ref: '#/components/parameters/count' });
    }
}
/**
 * Add parameter for query option $filter
 * @param {Array} parameters - Array of parameters to augment
 * @param {object} element - Model element
 * @param {Function} modelElement - Function to get model element
 * @param {Function} propertiesOfStructuredType - Function to get properties
 * @param {string} target - Target container child
 * @param {object} restrictions - Navigation property restrictions
 * @param {string} queryOptionPrefix - Query option prefix
 */
function optionFilter(parameters, element, modelElement, propertiesOfStructuredType, target, restrictions, queryOptionPrefix = '$') {
    const filterRestrictions = restrictions.FilterRestrictions || (target && target['Org.OData.Capabilities.V1.FilterRestrictions']) || {};
    if (filterRestrictions.Filterable !== false) {
        const filter = {
            name: queryOptionPrefix + 'filter',
            description: filterRestrictions['Org.OData.Core.V1.Description']
                || 'Filter items by property values, see [Filtering](http://docs.oasis-open.org/odata/odata/v4.01/odata-v4.01-part1-protocol.html#sec_SystemQueryOptionfilter)',
            in: 'query',
            schema: {
                type: 'string'
            }
        };
        if (filterRestrictions.RequiresFilter)
            filter.required = true;
        if (filterRestrictions.RequiredProperties) {
            filter.description += '\n\nRequired filter properties:';
            filterRestrictions.RequiredProperties.forEach(item => filter.description += '\n- ' + propertyPath(item));
        }
        parameters.push(filter);
    }
}
/**
 * Add parameter for query option $orderby
 * @param {Array} parameters - Array of parameters to augment
 * @param {object} element - Model element of navigation segment
 * @param {Function} modelElement - Function to get model element
 * @param {Function} propertiesOfStructuredType - Function to get properties
 * @param {string} target - Target container child of path
 * @param {object} restrictions - Navigation property restrictions of navigation segment
 * @param {string} queryOptionPrefix - Query option prefix
 */
function optionOrderBy(parameters, element, modelElement, propertiesOfStructuredType, target, restrictions, queryOptionPrefix = '$') {
    const sortRestrictions = restrictions.SortRestrictions || (target && target['Org.OData.Capabilities.V1.SortRestrictions']) || {};
    if (sortRestrictions.Sortable !== false) {
        const nonSortable = {};
        (sortRestrictions.NonSortableProperties || []).forEach(name => {
            nonSortable[propertyPath(name)] = true;
        });
        const orderbyItems = [];
        primitivePaths(element, modelElement, propertiesOfStructuredType).filter(property => !nonSortable[property]).forEach(property => {
            orderbyItems.push(property);
            orderbyItems.push(property + ' desc');
        });
        if (orderbyItems.length > 0) {
            parameters.push({
                name: queryOptionPrefix + 'orderby',
                description: sortRestrictions['Org.OData.Core.V1.Description']
                    || 'Order items by property values, see [Sorting](http://docs.oasis-open.org/odata/odata/v4.01/odata-v4.01-part1-protocol.html#sec_SystemQueryOptionorderby)',
                in: 'query',
                explode: false,
                schema: {
                    type: 'array',
                    uniqueItems: true,
                    items: {
                        type: 'string',
                        enum: orderbyItems
                    }
                }
            });
        }
    }
}
/**
 * Add parameter for query option $search
 * @param {Array} parameters - Array of parameters to augment
 * @param {string} target - Target container child of path
 * @param {object} restrictions - Navigation property restrictions of navigation segment
 * @param {string} queryOptionPrefix - Query option prefix
 */
function optionSearch(parameters, target, restrictions, queryOptionPrefix = '$') {
    const searchRestrictions = restrictions.SearchRestrictions || (target && target['Org.OData.Capabilities.V1.SearchRestrictions']) || {};
    if (searchRestrictions.Searchable !== false) {
        if (searchRestrictions['Org.OData.Core.V1.Description']) {
            parameters.push({
                name: queryOptionPrefix + 'search',
                description: searchRestrictions['Org.OData.Core.V1.Description'],
                in: 'query',
                schema: { type: 'string' }
            });
        }
        else {
            parameters.push({ $ref: '#/components/parameters/search' });
        }
    }
}
/**
 * Add parameter for query option $select
 * @param {Array} parameters - Array of parameters to augment
 * @param {object} element - Model element
 * @param {Function} modelElement - Function to get model element
 * @param {Function} propertiesOfStructuredType - Function to get properties
 * @param {object} restrictions - Navigation property restrictions
 * @param {object} nonExpandable - Non-expandable properties
 * @param {string} queryOptionPrefix - Query option prefix
 */
function optionSelect(parameters, element, modelElement, propertiesOfStructuredType, restrictions, nonExpandable, queryOptionPrefix = '$') {
    const selectSupport = restrictions.SelectSupport || {};
    if (selectSupport.Supported !== false) {
        const selectItems = [];
        // Add primitive properties
        primitivePaths(element, modelElement, propertiesOfStructuredType).forEach(path => {
            selectItems.push(path);
        });
        // Add navigation properties if allowed
        if (selectSupport.Expandable !== false) {
            const type = modelElement(element.$Type);
            const properties = propertiesOfStructuredType(type);
            Object.keys(properties).forEach(key => {
                if (properties[key].$Kind === 'NavigationProperty' && !nonExpandable[key]) {
                    selectItems.push(key);
                }
            });
        }
        if (selectItems.length > 0) {
            parameters.push({
                name: queryOptionPrefix + 'select',
                description: 'Select properties to be returned, see [Select](http://docs.oasis-open.org/odata/odata/v4.01/odata-v4.01-part1-protocol.html#sec_SystemQueryOptionselect)',
                in: 'query',
                explode: false,
                schema: {
                    type: 'array',
                    uniqueItems: true,
                    items: {
                        type: 'string',
                        enum: selectItems
                    }
                }
            });
        }
    }
}
/**
 * Add parameter for query option $expand
 * @param {Array} parameters - Array of parameters to augment
 * @param {object} element - Model element
 * @param {Function} modelElement - Function to get model element
 * @param {Function} navigationPaths - Function to get navigation paths
 * @param {object} restrictions - Navigation property restrictions
 * @param {object} nonExpandable - Non-expandable properties
 * @param {number} level - Navigation level
 * @param {number} maxLevels - Maximum levels
 * @param {string} queryOptionPrefix - Query option prefix
 */
function optionExpand(parameters, element, modelElement, navigationPaths, restrictions, nonExpandable, level, maxLevels, queryOptionPrefix = '$') {
    const expandRestrictions = restrictions.ExpandRestrictions || {};
    if (expandRestrictions.Expandable !== false && level < maxLevels) {
        const paths = navigationPaths(element, modelElement, maxLevels);
        const expandItems = paths.filter(path => !nonExpandable[path]);
        if (expandItems.length > 0) {
            parameters.push({
                name: queryOptionPrefix + 'expand',
                description: 'Expand related entities, see [Expand](http://docs.oasis-open.org/odata/odata/v4.01/odata-v4.01-part1-protocol.html#sec_SystemQueryOptionexpand)',
                in: 'query',
                explode: false,
                schema: {
                    type: 'array',
                    uniqueItems: true,
                    items: {
                        type: 'string',
                        enum: expandItems
                    }
                }
            });
        }
    }
}
/**
 * Build standard OData component parameters
 * @param {object} options - Options including queryOptionPrefix
 * @return {object} Component parameters object
 */
function buildComponentParameters(options = {}) {
    const { queryOptionPrefix = '$' } = options;
    return {
        top: {
            name: queryOptionPrefix + 'top',
            description: 'Show only the first n items, see [Paging - Top](http://docs.oasis-open.org/odata/odata/v4.01/odata-v4.01-part1-protocol.html#sec_SystemQueryOptiontop)',
            in: 'query',
            schema: {
                type: 'integer',
                minimum: 0
            },
            example: 50
        },
        skip: {
            name: queryOptionPrefix + 'skip',
            description: 'Skip the first n items, see [Paging - Skip](http://docs.oasis-open.org/odata/odata/v4.01/odata-v4.01-part1-protocol.html#sec_SystemQueryOptionskip)',
            in: 'query',
            schema: {
                type: 'integer',
                minimum: 0
            }
        },
        count: {
            name: queryOptionPrefix + 'count',
            description: 'Include count of items, see [Count](http://docs.oasis-open.org/odata/odata/v4.01/odata-v4.01-part1-protocol.html#sec_SystemQueryOptioncount)',
            in: 'query',
            schema: {
                type: 'boolean'
            }
        },
        search: {
            name: queryOptionPrefix + 'search',
            description: 'Search items by search phrases, see [Searching](http://docs.oasis-open.org/odata/odata/v4.01/odata-v4.01-part1-protocol.html#sec_SystemQueryOptionsearch)',
            in: 'query',
            schema: {
                type: 'string'
            }
        }
    };
}
module.exports = {
    addQueryOptions,
    optionTop,
    optionSkip,
    optionCount,
    optionFilter,
    optionOrderBy,
    optionSearch,
    optionSelect,
    optionExpand,
    buildComponentParameters
};
//# sourceMappingURL=parameters.js.map