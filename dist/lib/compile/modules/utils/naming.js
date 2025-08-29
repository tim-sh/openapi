"use strict";
/**
 * Utility functions for name processing and manipulation
 */
/**
 * a qualified name consists of a namespace or alias, a dot, and a simple name
 * @param {string} qualifiedName
 * @return {object} with components qualifier and name
 */
function nameParts(qualifiedName) {
    const pos = qualifiedName.lastIndexOf('.');
    console.assert(pos > 0, 'Invalid qualified name ' + qualifiedName);
    return {
        qualifier: qualifiedName.substring(0, pos),
        name: qualifiedName.substring(pos + 1)
    };
}
/**
 * an identifier does not start with $ and does not contain @
 * @param {string} name
 * @return {boolean} name is an identifier
 */
function isIdentifier(name) {
    return !name.startsWith('$') && !name.includes('@');
}
/**
 * Split name on uppercase letters
 * @param {string} name Name to split
 * @return {string} split name
 */
function splitName(name) {
    return name.split(/(?=[A-Z])/g).join(' ').toLowerCase().replace(/ i d/g, ' id');
}
/**
 * a qualified name consists of a namespace or alias, a dot, and a simple name
 * @param {string} qualifiedName
 * @param {object} namespace Namespace mapping object
 * @return {string} namespace-qualified name
 */
function namespaceQualifiedName(qualifiedName, namespace) {
    let np = nameParts(qualifiedName);
    return namespace[np.qualifier] + '.' + np.name;
}
module.exports = {
    nameParts,
    isIdentifier,
    splitName,
    namespaceQualifiedName
};
//# sourceMappingURL=naming.js.map