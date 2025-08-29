/**
 * Constants used throughout the OpenAPI conversion
 */

const SUFFIX = {
    read: "",
    create: "-create",
    update: "-update",
    count: "@count"
};

const TITLE_SUFFIX = {
    "": "",
    "-create": " (for create)",
    "-update": " (for update)",
};

const SYSTEM_QUERY_OPTIONS = [
    "compute",
    "expand",
    "select",
    "filter",
    "search",
    "count",
    "orderby",
    "skip",
    "top",
    "format",
    "index",
    "schemaversion",
    "skiptoken",
    "apply",
];

/**
 * ODM annotations in CDS that should be converted into OpenAPI.
 */
const ODM_ANNOTATIONS = Object.freeze({
    '@ODM.entityName': 'x-sap-odm-entity-name',
    '@ODM.oid': 'x-sap-odm-oid'
});

const ER_ANNOTATION_PREFIX = '@EntityRelationship';
const ER_ANNOTATIONS = Object.freeze({
    '@EntityRelationship.entityType': 'x-entity-relationship-entity-type',
    '@EntityRelationship.entityIds': 'x-entity-relationship-entity-ids',
    '@EntityRelationship.propertyType': 'x-entity-relationship-property-type',
    '@EntityRelationship.reference': 'x-entity-relationship-reference',
    '@EntityRelationship.compositeReferences': 'x-entity-relationship-composite-references',
    '@EntityRelationship.temporalIds': 'x-entity-relationship-temporal-ids',
    '@EntityRelationship.temporalReferences': 'x-entity-relationship-temporal-references',
    '@EntityRelationship.referencesWithConstantIds': 'x-entity-relationship-references-with-constant-ids'
});

module.exports = {
    SUFFIX,
    TITLE_SUFFIX,
    SYSTEM_QUERY_OPTIONS,
    ODM_ANNOTATIONS,
    ER_ANNOTATION_PREFIX,
    ER_ANNOTATIONS
};