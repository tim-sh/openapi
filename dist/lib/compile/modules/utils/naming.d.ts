/**
 * Utility functions for name processing and manipulation
 */
/**
 * a qualified name consists of a namespace or alias, a dot, and a simple name
 * @param {string} qualifiedName
 * @return {object} with components qualifier and name
 */
export function nameParts(qualifiedName: string): object;
/**
 * an identifier does not start with $ and does not contain @
 * @param {string} name
 * @return {boolean} name is an identifier
 */
export function isIdentifier(name: string): boolean;
/**
 * Split name on uppercase letters
 * @param {string} name Name to split
 * @return {string} split name
 */
export function splitName(name: string): string;
/**
 * a qualified name consists of a namespace or alias, a dot, and a simple name
 * @param {string} qualifiedName
 * @param {object} namespace Namespace mapping object
 * @return {string} namespace-qualified name
 */
export function namespaceQualifiedName(qualifiedName: string, namespace: object): string;
//# sourceMappingURL=naming.d.ts.map