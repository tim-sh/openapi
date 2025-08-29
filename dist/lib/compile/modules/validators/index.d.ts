/**
 * Validation and type checking functions
 */
/**
 * Enum member as object
 * @param {string | object} member Enum member, either as a string or as an object
 * @return {string | object} standard enum member object
 */
export function enumMember(member: string | object): string | object;
/**
 * Navigation property path as object
 * @param {string | object} path Navigation property path, either as a string or as an object
 * @return {string | object} navigation property path object
 */
export function navigationPropertyPath(path: string | object): string | object;
/**
 * Property path as object
 * @param {string | object} path Property path, either as a string or as an object
 * @return {string | object} property path object
 */
export function propertyPath(path: string | object): string | object;
/**
 * Cardinality
 * @param {object} typedElement Typed model element, e.g. property
 * @return {string} cardinality
 */
export function cardinality(typedElement: object): string;
//# sourceMappingURL=index.d.ts.map