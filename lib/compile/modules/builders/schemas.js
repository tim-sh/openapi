/**
 * Schema building functions for OpenAPI generation
 * This module contains functions to construct OpenAPI Schema Objects from CSDL types
 */

const { nameParts, isIdentifier } = require('../utils/naming');
const { ref } = require('../utils/references');
const constants = require('../constants');

// Re-export constants that are used externally
const SUFFIX = constants.SUFFIX;
const TITLE_SUFFIX = constants.TITLE_SUFFIX;

/**
 * ODM (Object Data Model) annotations mapping
 */
const ODM_ANNOTATIONS = {
    '@ODM.entityName': 'x-sap-odm-entity-name',
    '@ODM.oid': 'x-sap-odm-oid'
};

/**
 * Entity Relationship annotations mapping
 */
const ER_ANNOTATIONS = {
    '@ER.EntityRelationship.element': 'x-sap-er-entity-relationship-element',
    '@ER.EntityRelationship.reference': 'x-sap-er-entity-relationship-reference'
};

/**
 * Construct Schema Object for model object referencing a type
 * @param {object} element Model element referencing a type
 * @param {string} suffix Suffix for the schema name
 * @param {boolean} forParameter Whether the schema is for a parameter
 * @param {boolean} forFunction Whether the schema is for a function
 * @param {object} context Context object containing CSDL data and utilities
 * @return {object} Schema Object
 */
function getSchema(element, suffix = '', forParameter = false, forFunction = false, context) {
    const { csdl, voc, typesToInline, requiredSchemas } = context;
    let s = {};

    switch (element.$Type) {
        case 'Edm.AnnotationPath':
        case 'Edm.ModelElementPath':
        case 'Edm.NavigationPropertyPath':
        case 'Edm.PropertyPath':
        case 'Edm.String':
            s.type = 'string';
            break;
        case 'Edm.Binary':
            s.type = 'string';
            s.format = 'base64url';
            s.description = 'base64url-encoded binary data';
            break;
        case 'Edm.Boolean':
            s.type = 'boolean';
            break;
        case 'Edm.Byte':
            s.type = 'integer';
            s.format = 'uint8';
            break;
        case 'Edm.Date':
            s.type = 'string';
            s.format = 'date';
            s.example = '2017-04-13';
            break;
        case 'Edm.DateTimeOffset':
            s.type = 'string';
            s.format = 'date-time';
            s.example = '2017-04-13T15:51:04Z';
            break;
        case 'Edm.Decimal':
            s.type = ['number', 'string'];
            s.format = 'decimal';
            s.example = 0;
            s['x-sap-precision'] = element.$Precision || 'variable';
            if (element.$Scale || element.$Scale == 0) s['x-sap-scale'] = element.$Scale;
            break;
        case 'Edm.Double':
            s.type = 'number';
            s.format = 'double';
            s.example = 3.14;
            break;
        case 'Edm.Duration':
            s.type = 'string';
            s.format = 'duration';
            s.example = 'PT15M';
            break;
        case 'Edm.Guid':
            s.type = 'string';
            s.format = 'uuid';
            s.example = '01234567-89ab-cdef-0123-456789abcdef';
            break;
        case 'Edm.Int16':
            s.type = 'integer';
            s.format = 'int16';
            break;
        case 'Edm.Int32':
            s.type = 'integer';
            s.format = 'int32';
            break;
        case 'Edm.Int64':
            s.type = ['integer', 'string'];
            s.format = 'int64';
            break;
        case 'Edm.SByte':
            s.type = 'integer';
            s.format = 'int8';
            break;
        case 'Edm.Single':
            s.type = 'number';
            s.format = 'float';
            break;
        case 'Edm.TimeOfDay':
            s.type = 'string';
            s.format = 'time';
            s.example = '15:51:04';
            break;
        case 'Edm.Stream':
            let jsonSchema = element[voc.JSON.Schema];
            if (jsonSchema) {
                if (typeof jsonSchema == 'string')
                    s = JSON.parse(jsonSchema);
                else
                    s = jsonSchema;
            } else {
                s = {
                    type: 'string',
                    format: 'base64url',
                    description: 'base64url-encoded binary data'
                };
            }
            break;
        case 'Edm.Geography':
        case 'Edm.Geometry':
            s = ref('geoPoint');
            typesToInline.geoPoint = true;
            break;
        case 'Edm.GeographyPoint':
        case 'Edm.GeometryPoint':
            s = ref('geoPoint');
            typesToInline.geoPoint = true;
            break;
        case 'Edm.Untyped':
            // keep s = {}
            break;
        default:
            const type = element.$Type || 'Edm.String';
            if (type.startsWith('Edm.')) {
                // Unknown Edm type
                s.type = 'string';
            } else {
                // For custom types, always create a reference
                // This ensures TypeDefinitions are included in the schema
                s = refIfNeeded(type, suffix, forParameter, context);
            }
            break;
    }

    // Add nullable
    if (!forParameter && element.$Nullable != undefined) {
        if (element.$Nullable) {
            // For references, we need to wrap in allOf
            if (s.$ref) {
                s = { allOf: [s], nullable: true };
            } else {
                s.nullable = true;
            }
        } else {
            s['x-sap-nullable'] = false;
        }
    }

    // Add Collection wrapper
    if (element.$Collection && !forFunction) {
        s = { type: 'array', items: s };
    }

    // Add maxLength
    if (element.$MaxLength || element.$MaxLength === 0) {
        if (s.items) {
            s.items.maxLength = element.$MaxLength;
        } else {
            s.maxLength = element.$MaxLength;
        }
    }

    // Add default value
    const defaultValue = element[voc.Core.DefaultValue];
    if (defaultValue != undefined) {
        s.default = defaultValue;
    }

    // Add description
    const description = element[voc.Core.LongDescription] || element[voc.Core.Description];
    if (description) {
        s.description = description;
    }

    // Add allowed values
    allowedValues(s, element, context);

    // Add example from annotation
    const example = element[voc.Core.Example];
    if (example != undefined) {
        const value = example.Value || example;
        addExample(s, element.$Type || 'Edm.String', value);
    }
    
    // Add ODM OID reference
    if (element['@ODM.oidReference']?.entityName) {
        s['x-sap-odm-oid-reference-entity-name'] = element['@ODM.oidReference'].entityName;
    }

    return s;
}

/**
 * Construct Schema Object for EnumerationType
 * @param {object} schemas Map of Schema Objects to augment
 * @param {string} qualifier Qualifier for structured type
 * @param {string} name Simple name of structured type
 * @param {object} type Structured type
 * @param {object} context Context object containing CSDL data and utilities
 * @return {object} Map of Schemas Objects
 */
function schemaForEnumerationType(schemas, qualifier, name, type, context) {
    const { voc } = context;
    const members = [];
    
    Object.keys(type).filter(iName => isIdentifier(iName)).forEach(iName => {
        members.push(iName);
    });

    const s = {
        type: 'string',
        enum: members
    };

    s.title = name;
    const description = type[voc.Core.LongDescription];
    if (description) s.description = description;
    
    schemas[qualifier + '.' + name] = s;
}

/**
 * Construct Schema Object for TypeDefinition
 * @param {object} schemas Map of Schema Objects to augment
 * @param {string} qualifier Qualifier for structured type
 * @param {string} name Simple name of structured type
 * @param {object} type Structured type
 * @param {object} context Context object containing CSDL data and utilities
 * @return {object} Map of Schemas Objects
 */
function schemaForTypeDefinition(schemas, qualifier, name, type, context) {
    const { voc } = context;
    let s;
    
    // Check if TypeDefinition has JSON Schema annotation
    if (type[voc.JSON.Schema]) {
        const jsonSchema = type[voc.JSON.Schema];
        if (typeof jsonSchema === 'string') {
            s = JSON.parse(jsonSchema);
        } else {
            s = jsonSchema;
        }
        // Ensure title is set
        if (!s.title) s.title = name;
    } else {
        s = getSchema(Object.assign({ $Type: type.$UnderlyingType }, type), '', false, false, context);
        s.title = name;
    }
    
    const description = type[voc.Core.LongDescription];
    if (description) s.description = description;
    
    schemas[qualifier + '.' + name] = s;
}

/**
 * Construct Schema Objects for structured type
 * @param {object} schemas Map of Schema Objects to augment
 * @param {string} qualifier Qualifier for structured type
 * @param {string} name Simple name of structured type
 * @param {string} suffix Suffix for read/create/update
 * @param {object} type Structured type
 * @param {object} context Context object containing CSDL data and utilities
 * @return {object} Map of Schemas Objects
 */
function schemasForStructuredType(schemas, qualifier, name, type, suffix, context) {
    const { csdl, voc } = context;
    const schemaName = qualifier + "." + name + suffix;
    const baseName = qualifier + "." + name;
    const isKey = keyMap(type, context);
    const required = Object.keys(isKey);
    const schemaProperties = {};
    let isCount = true;
    
    if (csdl[qualifier]?.$Annotations) {
        const annotations = csdl[qualifier].$Annotations[`${qualifier}.EntityContainer/${name}`];
        if (annotations && annotations[voc.Capabilities.CountRestrictions] && 
            annotations[voc.Capabilities.CountRestrictions]?.Countable === false) {
            isCount = false;
        }
    }

    const baseType = baseName + "-base";
    if (type.$BaseType) {
        const baseQualifier = nameParts(type.$BaseType).qualifier;
        const baseTypeName = nameParts(type.$BaseType).name;
        schemas[baseType] = {
            allOf: [refIfNeeded(type.$BaseType, suffix, false, context)]
        };
    }

    const properties = propertiesOfStructuredType(type, context);
    Object.keys(properties).forEach(iName => {
        const property = properties[iName];
        if (suffix === SUFFIX.read) schemaProperties[iName] = getSchema(property, '', false, false, context);
        if ((Object.prototype.hasOwnProperty.call(property, '@Common.FieldControl')) && 
            property['@Common.FieldControl'] === 'Mandatory') { 
            required.push(iName);
        }
        if (property.$Kind == 'NavigationProperty') {
            if (property.$Collection && suffix === "" && isCount === true) {
                schemaProperties[iName + SUFFIX.count] = ref('count');
            }
            if (property[voc.Core.Permissions] != "Read" && !property[voc.Core.Computed] && 
                (property.$ContainsTarget || property.$OnDelete === 'Cascade')) {
                if (suffix === SUFFIX.create)
                    schemaProperties[iName] = getSchema(property, SUFFIX.create, false, false, context);
                if (suffix === SUFFIX.update)
                    schemaProperties[iName] = getSchema(property, SUFFIX.create, false, false, context);
            }
        } else {
            if (property[voc.Core.Permissions] === "Read" || property[voc.Core.Computed] || 
                property[voc.Core.ComputedDefaultValue]) {
                // read-only property: skip in create or update structures
                if (suffix === SUFFIX.read) {
                    schemaProperties[iName] = getSchema(property, '', false, false, context);
                }
            } else {
                if (suffix === SUFFIX.create)
                    schemaProperties[iName] = getSchema(property, SUFFIX.create, false, false, context);
                if (suffix === SUFFIX.update && !isKey[iName] && !property[voc.Core.Immutable])
                    schemaProperties[iName] = getSchema(property, SUFFIX.update, false, false, context);
            }
        }
    });

    if (type.$BaseType) {
        schemas[baseType].allOf.push({ properties: schemaProperties });
        if (required.length > 0) schemas[baseType].allOf[1].required = required;
        schemas[schemaName] = {
            title: name + TITLE_SUFFIX[suffix],
            allOf: [ref(baseType)]
        };
    } else {
        schemas[schemaName] = {
            title: (type[voc.Core.Description] || name) + TITLE_SUFFIX[suffix],
            type: 'object',
            properties: schemaProperties
        };
        // Only add required for create schemas
        if (suffix === SUFFIX.create && required.length > 0) {
            schemas[schemaName].required = required;
        }
    }

    const description = type[voc.Core.LongDescription] || type[voc.Core.Description];
    if (description) schemas[schemaName].description = description;
    
    if (type.$Kind === 'EntityType') {
        if (suffix === SUFFIX.read && type["@ODM.root"]) schemas[schemaName]["x-sap-root-entity"] = type["@ODM.root"];
        odmExtensions(type, schemas[schemaName], context);
        erExtensions(type, schemas[schemaName], context);
    }
    

    
    const { derivedTypes } = context;
    if (derivedTypes && derivedTypes[baseName]) {
        schemas[schemaName].anyOf = [];
        derivedTypes[baseName].forEach((derivedType) => {
            schemas[schemaName].anyOf.push(refIfNeeded(derivedType, suffix, false, context));
        });
        if (!type.$Abstract) schemas[schemaName].anyOf.push({});
    }
}

/**
 * Add ODM extensions to OpenAPI schema for a structured type
 * @param {object} type Structured type
 * @param {object} schema OpenAPI schema to augment
 * @param {object} context Context object containing CSDL data and utilities
 */
function odmExtensions(type, schema, context) {
    for (const [annotation, openApiExtension] of Object.entries(ODM_ANNOTATIONS)) {
        if (type[annotation]) schema[openApiExtension] = type[annotation];
    }
}

/**
 * Add entity relationship extensions to OpenAPI schema for a structured type
 * @param {object} type Structured type
 * @param {object} schema OpenAPI schema to augment
 * @param {object} context Context object containing CSDL data and utilities
 */
function erExtensions(type, schema, context) {
    for (const [annotation, openApiExtension] of Object.entries(ER_ANNOTATIONS)) {
        if (type[annotation]) schema[openApiExtension] = type[annotation];
    }
}

/**
 * Add allowed values enum to Schema Object for string-like model element
 * @param {object} schema Schema Object to augment
 * @param {object} element Model element
 * @param {object} context Context object containing CSDL data and utilities
 */
function allowedValues(schema, element, context) {
    const { voc } = context;
    const values = element[voc.Validation.AllowedValues];
    
    if (values) {
        const enumValues = [];
        const enumDescription = {};
        
        for (const value of values) {
            enumValues.push(value.Value);
            const description = value[voc.Core.Description];
            if (description) enumDescription[value.Value] = description;
        }
        
        schema.enum = enumValues;
        if (Object.keys(enumDescription).length > 0) {
            schema['x-sap-enum-descriptions'] = enumDescription;
        }
    }
}

/**
 * Add example to schema
 * @param {object} schema Schema object to augment
 * @param {string} type Type of the element
 * @param {*} value Example value
 */
function addExample(schema, type, value) {
    if (type === 'Edm.Boolean') {
        schema.example = (value === 'true' || value === true);
    } else if (['Edm.Byte', 'Edm.Int16', 'Edm.Int32', 'Edm.Int64', 'Edm.SByte'].includes(type)) {
        schema.example = parseInt(value);
    } else if (['Edm.Single', 'Edm.Double', 'Edm.Decimal'].includes(type)) {
        schema.example = parseFloat(value);
    } else {
        schema.example = value;
    }
}

/**
 * Helper functions that need to be imported from the main module or implemented here
 */

function modelElement(qname, context) {
    const { csdl, namespace } = context;
    const q = nameParts(qname);
    const schema = csdl[q.qualifier] || csdl[namespace[q.qualifier]];
    return schema ? schema[q.name] : null;
}

function refIfNeeded(type, suffix, forParameter, context) {
    const { requiredSchemas, namespace } = context;
    const q = nameParts(type);
    const t = modelElement(q.qualifier + '.' + q.name, context);
    
    if (t) {
        // Use the actual namespace, not the alias
        const actualNamespace = namespace[q.qualifier] || q.qualifier;
        const schemaName = actualNamespace + '.' + q.name + suffix;
        requiredSchemas.used[schemaName] = true;
        if (!requiredSchemas.list.find(s => s.namespace === actualNamespace && 
            s.name === q.name && s.suffix === suffix)) {
            requiredSchemas.list.push({ namespace: actualNamespace, name: q.name, suffix: suffix });
        }
        return ref(schemaName);
    }
    
    return { type: 'string' };
}

function keyMap(type, context) {
    const { voc } = context;
    const keys = {};
    
    if (type.$Key) {
        type.$Key.forEach(key => {
            keys[key] = true;
        });
    }
    
    const properties = propertiesOfStructuredType(type, context);
    Object.keys(properties).forEach(name => {
        if (properties[name][voc.Core.IsKey]) {
            keys[name] = true;
        }
    });
    
    return keys;
}

function propertiesOfStructuredType(type, context) {
    const { csdl } = context;
    const properties = {};
    
    // Add properties from base type if exists
    if (type.$BaseType) {
        const q = nameParts(type.$BaseType);
        const baseType = modelElement(q.qualifier + '.' + q.name, context);
        if (baseType) {
            Object.assign(properties, propertiesOfStructuredType(baseType, context));
        }
    }
    
    // Add own properties
    Object.keys(type).filter(name => isIdentifier(name)).forEach(name => {
        const prop = type[name];
        // Check if it's a property (object but not a primitive value)
        if (prop && typeof prop === 'object' && !Array.isArray(prop)) {
            // Include if it has $Type, $Kind, or is just an object (implicit Edm.String)
            if (prop.$Type || prop.$Kind === 'NavigationProperty' || 
                (Object.keys(prop).length === 0 || prop.$Nullable !== undefined)) {
                properties[name] = prop;
            }
        }
    });
    
    return properties;
}

module.exports = {
    getSchema,
    schemaForEnumerationType,
    schemaForTypeDefinition,
    schemasForStructuredType,
    odmExtensions,
    erExtensions,
    allowedValues,
    SUFFIX
};