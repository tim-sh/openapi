export namespace SUFFIX {
    let read: string;
    let create: string;
    let update: string;
}
export const TITLE_SUFFIX: {
    "": string;
    "-create": string;
    "-update": string;
};
export const SYSTEM_QUERY_OPTIONS: string[];
/**
 * ODM annotations in CDS that should be converted into OpenAPI.
 */
export const ODM_ANNOTATIONS: Readonly<{
    '@ODM.entityName': "x-sap-odm-entity-name";
    '@ODM.oid': "x-sap-odm-oid";
}>;
export const ER_ANNOTATION_PREFIX: "@EntityRelationship";
export const ER_ANNOTATIONS: Readonly<{
    '@EntityRelationship.entityType': "x-entity-relationship-entity-type";
    '@EntityRelationship.entityIds': "x-entity-relationship-entity-ids";
    '@EntityRelationship.propertyType': "x-entity-relationship-property-type";
    '@EntityRelationship.reference': "x-entity-relationship-reference";
    '@EntityRelationship.compositeReferences': "x-entity-relationship-composite-references";
    '@EntityRelationship.temporalIds': "x-entity-relationship-temporal-ids";
    '@EntityRelationship.temporalReferences': "x-entity-relationship-temporal-references";
    '@EntityRelationship.referencesWithConstantIds': "x-entity-relationship-references-with-constant-ids";
}>;
//# sourceMappingURL=index.d.ts.map