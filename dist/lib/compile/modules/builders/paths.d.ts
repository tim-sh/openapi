/**
 * Extract path value prefix based on type
 * @param {string} typename - The type name
 * @param {boolean} keyAsSegment - Whether key is used as segment
 * @return {string} value prefix
 */
export function pathValuePrefix(typename: string, keyAsSegment: boolean): string;
/**
 * Extract path value suffix based on type
 * @param {string} typename - The type name
 * @param {boolean} keyAsSegment - Whether key is used as segment
 * @return {string} value suffix
 */
export function pathValueSuffix(typename: string, keyAsSegment: boolean): string;
/**
 * Unpack NavigationPropertyPath value if it uses CSDL JSON CS01 style
 * @param {string|object} path - Qualified name of referenced type
 * @return {string} Navigation property path
 */
export function navigationPropertyPath(path: string | object): string;
/**
 * Unpack PropertyPath value if it uses CSDL JSON CS01 style
 * @param {string|object} path - Qualified name of referenced type
 * @return {string} Property path
 */
export function propertyPath(path: string | object): string;
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
export function navigationPaths(element: object, modelElement: Function, propertiesOfStructuredType: Function, prefix: string | undefined, level: number | undefined, maxLevels: number): any[];
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
export function navigationPathMap(type: object, propertiesOfStructuredType: Function, modelElement: Function, map: object | undefined, prefix: string | undefined, level: number | undefined, maxLevels: number): object;
/**
 * Collect primitive paths of a navigation segment and its potentially structured components
 * @param {object} element - Model element of navigation segment
 * @param {Function} modelElement - Function to get model element
 * @param {Function} propertiesOfStructuredType - Function to get properties
 * @param {string} prefix - Navigation prefix
 * @return {Array} Array of primitive property paths
 */
export function primitivePaths(element: object, modelElement: Function, propertiesOfStructuredType: Function, prefix?: string): any[];
/**
 * Helper function to convert entry to property
 * @param {object} parent - Parent property
 * @param {Function} modelElement - Function to get model element
 * @param {Function} propertiesOfStructuredType - Function to get properties
 * @return {Function} Function that converts entry to property
 */
export function entryToProperty(parent: object, modelElement: Function, propertiesOfStructuredType: Function): Function;
/**
 * Build path parameters for key properties
 * @param {object} keyNames - Key property names
 * @param {object} properties - Properties of the type
 * @param {string} level - Navigation level
 * @param {object} options - Options object with keyAsSegment flag
 * @return {Array} Array of parameter objects
 */
export function buildKeyParameters(keyNames: object, properties: object, level: string, options?: object): any[];
/**
 * Build path template with key parameters
 * @param {string} prefix - Path prefix
 * @param {Array} keyNames - Key property names
 * @param {object} properties - Properties of the type
 * @param {number} level - Navigation level
 * @param {object} options - Options including keyAsSegment flag
 * @return {string} Path template
 */
export function buildPathWithKeys(prefix: string, keyNames: any[], properties: object, level: number, options?: object): string;
//# sourceMappingURL=paths.d.ts.map