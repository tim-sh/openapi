"use strict";
/**
 * Validation and type checking functions
 */
/**
 * Enum member as object
 * @param {string | object} member Enum member, either as a string or as an object
 * @return {string | object} standard enum member object
 */
function enumMember(member) {
    if (typeof member == 'string')
        return { value: member };
    else if (typeof member == 'object')
        return { value: member['='] || member.val };
}
/**
 * Navigation property path as object
 * @param {string | object} path Navigation property path, either as a string or as an object
 * @return {string | object} navigation property path object
 */
function navigationPropertyPath(path) {
    if (typeof path == 'string')
        return { NavigationPropertyPath: path };
    else
        return path;
}
/**
 * Property path as object
 * @param {string | object} path Property path, either as a string or as an object
 * @return {string | object} property path object
 */
function propertyPath(path) {
    if (typeof path == 'string')
        return { PropertyPath: path };
    else
        return path;
}
/**
 * Cardinality
 * @param {object} typedElement Typed model element, e.g. property
 * @return {string} cardinality
 */
function cardinality(typedElement) {
    return typedElement.$Collection ? '*' : (typedElement.$Nullable ? '0..1' : '');
}
module.exports = {
    enumMember,
    navigationPropertyPath,
    propertyPath,
    cardinality
};
//# sourceMappingURL=index.js.map