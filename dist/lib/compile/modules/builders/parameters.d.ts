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
export function addQueryOptions(parameters: any[], element: object, modelElement: object, propertiesOfStructuredType: object, root: object, navigationPath: string, target: object, restrictions: object, options?: object): void;
/**
 * Add parameter for query option $top
 * @param {Array} parameters - Array of parameters to augment
 * @param {object} restrictions - Navigation property restrictions
 * @param {string} queryOptionPrefix - Query option prefix
 */
export function optionTop(parameters: any[], restrictions: object, queryOptionPrefix?: string): void;
/**
 * Add parameter for query option $skip
 * @param {Array} parameters - Array of parameters to augment
 * @param {object} restrictions - Navigation property restrictions
 * @param {string} queryOptionPrefix - Query option prefix
 */
export function optionSkip(parameters: any[], restrictions: object, queryOptionPrefix?: string): void;
/**
 * Add parameter for query option $count
 * @param {Array} parameters - Array of parameters to augment
 * @param {object} restrictions - Navigation property restrictions
 * @param {string} target - Target container child
 * @param {string} queryOptionPrefix - Query option prefix
 */
export function optionCount(parameters: any[], restrictions: object, target: string, queryOptionPrefix?: string): void;
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
export function optionFilter(parameters: any[], element: object, modelElement: Function, propertiesOfStructuredType: Function, target: string, restrictions: object, queryOptionPrefix?: string): void;
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
export function optionOrderBy(parameters: any[], element: object, modelElement: Function, propertiesOfStructuredType: Function, target: string, restrictions: object, queryOptionPrefix?: string): void;
/**
 * Add parameter for query option $search
 * @param {Array} parameters - Array of parameters to augment
 * @param {string} target - Target container child of path
 * @param {object} restrictions - Navigation property restrictions of navigation segment
 * @param {string} queryOptionPrefix - Query option prefix
 */
export function optionSearch(parameters: any[], target: string, restrictions: object, queryOptionPrefix?: string): void;
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
export function optionSelect(parameters: any[], element: object, modelElement: Function, propertiesOfStructuredType: Function, restrictions: object, nonExpandable: object, queryOptionPrefix?: string): void;
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
export function optionExpand(parameters: any[], element: object, modelElement: Function, navigationPaths: Function, restrictions: object, nonExpandable: object, level: number, maxLevels: number, queryOptionPrefix?: string): void;
/**
 * Build standard OData component parameters
 * @param {object} options - Options including queryOptionPrefix
 * @return {object} Component parameters object
 */
export function buildComponentParameters(options?: object): object;
//# sourceMappingURL=parameters.d.ts.map