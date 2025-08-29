/**
 * Converts OData CSDL JSON to OpenAPI 3.0.2
*/
const cds = require('@sap/cds');
var pluralize = require('pluralize')
const DEBUG = cds.debug('openapi');  // Initialize cds.debug with the 'openapi'

// Import modularized components
const constants = require('./modules/constants');
const { nameParts, isIdentifier, splitName, namespaceQualifiedName, enumMember } = require('./modules/utils/naming');
const validators = require('./modules/validators');
const { 
    pathValuePrefix, 
    pathValueSuffix, 
    navigationPropertyPath, 
    propertyPath,
    navigationPaths,
    navigationPathMap,
    primitivePaths,
    buildKeyParameters,
    buildPathWithKeys
} = require('./modules/builders/paths');
const {
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
} = require('./modules/builders/parameters');
const {
    collectionResponse,
    entityResponse,
    operationResponse,
    errorResponse,
    countResponse,
    batchResponse,
    buildStandardResponses,
    getTypeSchema,
    getEdmTypeSchema,
    withETag
} = require('./modules/builders/responses'); 


//TODO
// - Core.Example for complex types
// - reduce number of loops over schemas
// - inject $$name into each model element to make parameter passing easier?
// - allow passing additional files for referenced documents
// - delta: headers Prefer and Preference-Applied
// - inline definitions for Edm.* to make OpenAPI documents self-contained
// - both "clickable" and freestyle $expand, $select, $orderby - does not work yet, open issue for OpenAPI UI
// - system query options for actions/functions/imports depending on $Collection
// - 200 response for PATCH
// - ETag for GET / If-Match for PATCH and DELETE depending on @Core.OptimisticConcurrency
// - CountRestrictions for GET collection-valued (containment) navigation - https://issues.oasis-open.org/browse/ODATA-1300
// - InsertRestrictions/NonInsertableProperties
// - InsertRestrictions/NonInsertableNavigationProperties
// - see //TODO comments below

// Import constants from the constants module
const { SUFFIX, TITLE_SUFFIX, SYSTEM_QUERY_OPTIONS, ODM_ANNOTATIONS, ER_ANNOTATION_PREFIX, ER_ANNOTATIONS } = constants;
    /**
     * Add path and Path Item Object for actions and functions bound to the element
     * @param {object} paths Paths Object to augment
     * @param {string} prefix Prefix for path
     * @param {Array} prefixParameters Parameter Objects for prefix
     * @param {object} element Model element the operations are bound to
     * @param {string} sourceName Name of path source
     * @param {boolean} byKey read by key
     */
    function pathItemsForBoundOperations(paths, prefix, prefixParameters, element, sourceName, byKey = false) {
        //ignore operations on navigation path
        if (element.$Kind === "NavigationProperty") {
            return;
        }
        const overloads = boundOverloads[element.$Type + (!byKey && element.$Collection ? '-c' : '')] || [];
        overloads.forEach(item => {
            if (item.overload.$Kind == 'Action')
                pathItemAction(paths, prefix + '/' + item.name, prefixParameters, item.name, item.overload, sourceName);
            else
                pathItemFunction(paths, prefix + '/' + item.name, prefixParameters, item.name, item.overload, sourceName);
        });
    }

    /**
    * Add path and Path Item Object for an action import
    * @param {object} paths Paths Object to augment
    * @param {string} name Name of action import
    * @param {object} child Action import object
    */
    function pathItemActionImport(paths, name, child) {
        const overload = modelElement(child.$Action).find(pOverload => !pOverload.$IsBound);
        pathItemAction(paths, '/' + name, [], child.$Action, overload, child.$EntitySet, child);
    }

    /**
     * Add path and Path Item Object for action overload
     * @param {object} paths Paths Object to augment
     * @param {string} prefix Prefix for path
     * @param {Array} prefixParameters Parameter Objects for prefix
     * @param {string} actionName Qualified name of function
     * @param {object} overload Function overload
     * @param {string} sourceName Name of path source
     * @param {string} actionImport Action import
     */
    function pathItemAction(paths, prefix, prefixParameters, actionName, overload, sourceName, actionImport = {}) {
        const name = actionName.indexOf('.') === -1 ? actionName : nameParts(actionName).name;
        const pathItem = {
            post: {
                summary: actionImport[voc.Core.Description] || overload[voc.Core.Description] || 'Invokes action ' + name,
                tags: [overload[voc.Common.Label] || sourceName || 'Service Operations'],
                responses: overload.$ReturnType ? response(200, "Success", overload.$ReturnType, overload[voc.Capabilities.OperationRestrictions]?.ErrorResponses)
                    : response(204, "Success", undefined, overload[voc.Capabilities.OperationRestrictions]?.ErrorResponses),
            }
        };
        const actionExtension = getExtensions(overload, 'operation');
            if (Object.keys(actionExtension).length > 0) {
                Object.assign(pathItem.post, actionExtension);
            }
        const description = actionImport[voc.Core.LongDescription] || overload[voc.Core.LongDescription];
        if (description) pathItem.post.description = description;
        if (prefixParameters.length > 0) pathItem.post.parameters = [...prefixParameters];
        let parameters = overload.$Parameter || [];
        if (overload.$IsBound) parameters = parameters.slice(1);
        if (parameters.length > 0) {
            const requestProperties = {};
            parameters.forEach(p => { requestProperties[p.$Name] = getSchema(p) });
            pathItem.post.requestBody = {
                description: 'Action parameters',
                content: {
                    'application/json': {
                        schema: {
                            type: 'object',
                            properties: requestProperties
                        }
                    }
                }
            }
        }
        customParameters(pathItem.post, overload[voc.Capabilities.OperationRestrictions] || {});
        paths[prefix] = pathItem;
    }

    /**
     * Add path and Path Item Object for an action import
     * @param {object} paths Paths Object to augment
     * @param {string} name Name of function import
     * @param {object} child Function import object
     */
    function pathItemFunctionImport(paths, name, child) {
        const overloads = modelElement(child.$Function);
        console.assert(overloads, 'Unknown function "' + child.$Function + '" in function import "' + name + '"');
        overloads && overloads.filter(overload => !overload.$IsBound).forEach(overload => pathItemFunction(paths, '/' + name, [], child.$Function, overload, child.$EntitySet, child));
    }

    /**
     * Add path and Path Item Object for function overload
     * @param {object} paths Paths Object to augment
     * @param {string} prefix Prefix for path
     * @param {Array} prefixParameters Parameter Objects for prefix
     * @param {string} functionName Qualified name of function
     * @param {object} overload Function overload
     * @param {string} sourceName Name of path source
     * @param {object} functionImport Function Import
     */
    function pathItemFunction(paths, prefix, prefixParameters, functionName, overload, sourceName, functionImport = {}) {
        const name = functionName.indexOf('.') === -1 ? functionName : nameParts(functionName).name;
        let parameters = overload.$Parameter || [];
        if (overload.$IsBound) parameters = parameters.slice(1);
        const pathSegments = [];
        const params = [];

        const implicitAliases = csdl.$Version > '4.0' || parameters.some(p => p[voc.Core.OptionalParameter]);

        parameters.forEach(p => {
            const param = {
                required: implicitAliases ? !p[voc.Core.OptionalParameter] : true
            };
            const description = [p[voc.Core.Description], p[voc.Core.LongDescription]].filter(t => t).join('  \n');
            if (description) param.description = description;
            const type = modelElement(p.$Type || 'Edm.String');
            // TODO: check whether parameter or type definition of Edm.Stream is annotated with JSON.Schema
            if (p.$Collection || p.$Type == 'Edm.Stream'
                || type && ['ComplexType', 'EntityType'].includes(type.$Kind)
                || type && type.$UnderlyingType == 'Edm.Stream') {
                param.in = 'query';
                if (
                    implicitAliases &&
                    csdl.$Version !== '2.0' &&
                    SYSTEM_QUERY_OPTIONS.includes(p.$Name.toLowerCase())
                ) {
                    param.name = '@' + p.$Name;
                } else if (implicitAliases) {
                    param.name = p.$Name;
                } else {
                    pathSegments.push(p.$Name + '=@' + p.$Name);
                    param.name = '@' + p.$Name;
                }
                param.schema = { type: 'string' };
                if (description) param.description += '  \n'; else param.description = '';
                param.description += 'This is '
                    + (p.$Collection ? 'a ' : '')
                    + 'URL-encoded JSON '
                    + (p.$Collection ? 'array with items ' : '')
                    + 'of type '
                    + namespaceQualifiedName(p.$Type || 'Edm.String')
                    + ', see [Complex and Collection Literals](https://docs.oasis-open.org/odata/odata/v4.01/odata-v4.01-part2-url-conventions.html#sec_ComplexandCollectionLiterals)';
                param.example = p.$Collection ? '[]' : '{}';
            } else {
                if (implicitAliases) {
                    param.in = 'query';
                } else {
                    pathSegments.push(p.$Name + "={" + p.$Name + "}");
                    param.in = 'path';
                }
                if (
                    implicitAliases &&
                    csdl.$Version !== '2.0' &&
                    SYSTEM_QUERY_OPTIONS.includes(p.$Name.toLowerCase())
                )
                    param.name = '@' + p.$Name;
                else
                    param.name = p.$Name;
                if (!p.$Type || p.$Type === "Edm.String" || (type && (!type.$Type || type.$Type === "Edm.String"))) {
                    if (description) param.description += "  \n";
                    else param.description = "";
                    param.description += "String value needs to be enclosed in single quotes";
                }
                param.schema = getSchema(p, '', true, true);
            }
            params.push(param);
        });

        const pathParameters = implicitAliases ? '' : '(' + pathSegments.join(',') + ')';
        const pathItem = {
            get: {
                summary: functionImport[voc.Core.Description] || overload[voc.Core.Description] || 'Invokes function ' + name,
                tags: [overload[voc.Common.Label] || sourceName || 'Service Operations'],
                parameters: prefixParameters.concat(params),
                responses: response(200, "Success", overload.$ReturnType, overload[voc.Capabilities.OperationRestrictions]?.ErrorResponses),
            }
        };
        const functionExtension = getExtensions(overload, 'operation');
        if (Object.keys(functionExtension).length > 0) {
            Object.assign(pathItem.get, functionExtension);
        }
        const iDescription = functionImport[voc.Core.LongDescription] || overload[voc.Core.LongDescription];
        if (iDescription) pathItem.get.description = iDescription;
        customParameters(pathItem.get, overload[voc.Capabilities.OperationRestrictions] || {});
        paths[prefix + pathParameters] = pathItem;
    }

    /**
     * Add path and Path Item Object for batch requests
     * @param {object} paths Paths Object to augment
     * @param {object} container Entity container
     */
    function pathItemBatch(paths, container) {
        const batchSupport = container[voc.Capabilities.BatchSupport] || {};
        const supported = container[voc.Capabilities.BatchSupported] !== false && batchSupport.Supported !== false;
        if (supported) {
            const firstEntitySet = Object.keys(container).filter(child => isIdentifier(child) && container[child].$Collection)[0];
            paths['/$batch'] = {
                post: {
                    summary: batchSupport[voc.Core.Description] || 'Sends a group of requests',
                    description: (batchSupport[voc.Core.LongDescription] || 'Group multiple requests into a single request payload, see '
                        + '[Batch Requests](http://docs.oasis-open.org/odata/odata/v4.01/odata-v4.01-part1-protocol.html#sec_BatchRequests).')
                        + '\n\n*Please note that "Try it out" is not supported for this request.*',
                    tags: ['Batch Requests'],
                    requestBody: {
                        required: true,
                        description: 'Batch request',
                        content: {
                            'multipart/mixed;boundary=request-separator': {
                                schema: {
                                    type: 'string'
                                },
                                example: '--request-separator\n'
                                    + 'Content-Type: application/http\n'
                                    + 'Content-Transfer-Encoding: binary\n\n'
                                    + 'GET ' + firstEntitySet + ' HTTP/1.1\n'
                                    + 'Accept: application/json\n\n'
                                    + '\n--request-separator--'
                            }
                        }
                    },
                    responses: {
                        '4XX': {
                            $ref: '#/components/responses/error'
                        }
                    }
                }
            };
            paths['/$batch'].post.responses[csdl.$Version < '4.0' ? 202 : 200] = {
                description: 'Batch response',
                content: {
                    'multipart/mixed': {
                        schema: {
                            type: 'string'
                        },
                        example: '--response-separator\n'
                            + 'Content-Type: application/http\n\n'
                            + 'HTTP/1.1 200 OK\n'
                            + 'Content-Type: application/json\n\n'
                            + '{...}'
                            + '\n--response-separator--'
                    }
                }
            };
        }
    }

    /**
     * Construct Responses Object
     * @param {string} code HTTP response code
     * @param {string} description Description
     * @param {object} type Response type object
     * @param {array} errors Array of operation-specific status codes with descriptions
     */
    function response(code, description, type, errors, isCount = true) {
        const r = {};
        r[code] = {
            description: description
        };
        let CountPropertyObj = { [csdl.$Version > '4.0' ? '@count' : '@odata.count']: ref('count') };
        if (code != 204) {
            const s = getSchema(type);
            r[code].content = {
                'application/json': {}
            };

            if (type.$Collection) {
                r[code].content['application/json'].schema = {
                    type: 'object',
                    title: 'Collection of ' + nameParts(type.$Type ? type.$Type : 'Edm.String').name,
                    properties: {
                        ...(isCount && CountPropertyObj),
                        value: s
                    }
                };
            }

            else if (
                type.$Type === undefined ||
                (type.$Type.startsWith("Edm.") &&
                    !["Edm.Stream", "Edm.EntityType", "Edm.ComplexType"].includes(
                        type.$Type,
                    ))
            ) {
                r[code].content['application/json'].schema = { type: "object", properties: { value: s } };
            }

            else {
                r[code].content['application/json'].schema = s;
            }
        }
        if (errors) {
            for (const e of errors) {
                r[e.StatusCode] = {
                    description: e.Description,
                    content: {
                        "application/json": {
                            schema: { $ref: "#/components/schemas/error" },
                        },
                    },
                };
            }
        } else {
            r["4XX"] = {
                $ref: "#/components/responses/error",
            };
        }
        return r;
    }

    /**
     * Construct the Components Object from the types of the CSDL document
     * @param {object} csdl CSDL document
     * @param {object} entityContainer Entity Container object
     * @return {object} Components Object
     */
    function getComponents(csdl, entityContainer) {
        const c = {
            schemas: getSchemas(csdl)
        };

        if (csdl.$EntityContainer) {
            c.parameters = getParameters();
            c.responses = {
                error: {
                    description: 'Error',
                    content: {
                        'application/json': {
                            schema: ref('error')
                        }
                    }
                }
            };
        }

        getSecuritySchemes(c, entityContainer)

        return c;
    }

    /**
     * Construct Schema Objects from the types of the CSDL document
     * @param {object} csdl CSDL document
     * @return {object} Map of Schema Objects
     */
    function getSchemas(csdl) {
        const unordered = {};

        for (const r of requiredSchemas.list) {
            const type = modelElement(`${r.namespace}.${r.name}`);
            if (!type) continue;
            switch (type.$Kind) {
                case "ComplexType":
                case "EntityType":
                    schemasForStructuredType(unordered, r.namespace, r.name, type, r.suffix);
                    break;
                case "EnumType":
                    schemaForEnumerationType(unordered, r.namespace, r.name, type);
                    break;
                case "TypeDefinition":
                    schemaForTypeDefinition(unordered, r.namespace, r.name, type);
                    break;
            }
        }

        // Add @OpenAPI.Extensions at entity level to schema object
        Object.keys(csdl).filter(name => isIdentifier(name)).forEach(namespace => {
            const schema = csdl[namespace];
            Object.keys(schema).filter(name => isIdentifier(name)).forEach(name => {
            const type = schema[name];
            if (type.$Kind === 'EntityType' || type.$Kind === 'ComplexType') {
                const schemaName = namespace + "." + name + SUFFIX.read;
                const extensions = getExtensions(type, 'schema');
                if (Object.keys(extensions).length > 0) {
                unordered[schemaName] = unordered[schemaName] || {};
                Object.assign(unordered[schemaName], extensions);
                }
            }
            });
        });

        const ordered = {};
        for (const name of Object.keys(unordered).sort()) {
            ordered[name] = unordered[name];
        }

        inlineTypes(ordered);

        if (csdl.$EntityContainer) {
            ordered.count = count();
            ordered.error = error();
        }

        return ordered;
    }

    /**
     * Construct Schema Objects from the types of the CSDL document
     * @param {object} schemas Map of Schema Objects to augment
     */
    function inlineTypes(schemas) {
        if (typesToInline.geoPoint) {
            schemas.geoPoint = {
                type: 'object',
                properties: {
                    coordinates: ref('geoPosition'),
                    type: {
                        type: 'string',
                        enum: ['Point'],
                        default: 'Point'
                    }
                },
                required: ['type', 'coordinates']
            };
            schemas.geoPosition = {
                type: 'array',
                minItems: 2,
                items: {
                    type: 'number'
                }
            }
        }
    }

    /**
     * Construct Schema Objects for an enumeration type
     * @param {object} schemas Map of Schema Objects to augment
     * @param {string} qualifier Qualifier for structured type
     * @param {string} name Simple name of structured type
     * @param {object} type Structured type
     * @return {object} Map of Schemas Objects
     */
    function schemaForEnumerationType(schemas, qualifier, name, type) {
        const members = [];
        Object.keys(type).filter(iName => isIdentifier(iName)).forEach(iName2 => {
            members.push(iName2);
        });

        const s = {
            type: 'string',
            title: name,
            enum: members
        };
        const description = type[voc.Core.LongDescription];
        if (description) s.description = description;
        schemas[qualifier + '.' + name] = s;
    }

    /**
     * Construct Schema Objects for a type definition
     * @param {object} schemas Map of Schema Objects to augment
     * @param {string} qualifier Qualifier for structured type
     * @param {string} name Simple name of structured type
     * @param {object} type Structured type
     * @return {object} Map of Schemas Objects
     */
    function schemaForTypeDefinition(schemas, qualifier, name, type) {
        const s = getSchema(Object.assign({ $Type: type.$UnderlyingType }, type));
        s.title = name;
        const description = type[voc.Core.LongDescription];
        if (description) s.description = description;
        schemas[qualifier + '.' + name] = s;
    }

    /**
     * Construct Schema Objects for a structured type
     * @param {object} schemas Map of Schema Objects to augment
     * @param {string} qualifier Qualifier for structured type
     * @param {string} name Simple name of structured type
     * @param {string} suffix Suffix for read/create/update
     * @param {object} type Structured type
     * @return {object} Map of Schemas Objects
     */
    function schemasForStructuredType(schemas, qualifier, name, type, suffix) {
        const schemaName = qualifier + "." + name + suffix;
        const baseName = qualifier + "." + name;
        const isKey = keyMap(type);
        const required = Object.keys(isKey);
        const schemaProperties = {};
        let isCount = true;
        if (csdl[qualifier]?.$Annotations) {
            const annotations = csdl[qualifier].$Annotations[`${qualifier}.EntityContainer/${name}`];
            if (annotations && annotations[voc.Capabilities.CountRestrictions] && annotations[voc.Capabilities.CountRestrictions]?.Countable === false) {
                isCount = false;
            }
        }
        const properties = propertiesOfStructuredType(type);
        Object.keys(properties).forEach(iName => {
            const property = properties[iName];
            if (suffix === SUFFIX.read) schemaProperties[iName] = getSchema(property);
            if ((Object.prototype.hasOwnProperty.call(property, '@Common.FieldControl')) && property['@Common.FieldControl'] === 'Mandatory') { required.push(iName) }
            if (property.$Kind == 'NavigationProperty') {
                if (property.$Collection && suffix === "" && isCount === true) {
                    schemaProperties[`${iName}@${csdl.$Version === '4.0' ? 'odata.' : ''}count`] = ref('count');
                }
                if (property[voc.Core.Permissions] != "Read" && !property[voc.Core.Computed] && (property.$ContainsTarget || property.$OnDelete === 'Cascade')) {
                    if (suffix === SUFFIX.create)
                        schemaProperties[iName] = getSchema(property, SUFFIX.create);
                    if (suffix === SUFFIX.update)
                        schemaProperties[iName] = getSchema(property, SUFFIX.create);
                }
            } else {
                if (property[voc.Core.Permissions] === "Read" || property[voc.Core.Computed] || property[voc.Core.ComputedDefaultValue]) {
                    let index = required.indexOf(iName);
                    if (index != -1) required.splice(index, 1);
                }
                if (!(property[voc.Core.Permissions] === "Read" || property[voc.Core.Computed])) {
                    if (suffix === SUFFIX.create)
                        schemaProperties[iName] = getSchema(property, SUFFIX.create);
                    if (suffix === SUFFIX.update && !isKey[iName] && !property[voc.Core.Immutable])
                        schemaProperties[iName] = getSchema(property, SUFFIX.update);
                }
            }
        });


        schemas[schemaName] = {
            title: (type[voc.Core.Description] || name) + TITLE_SUFFIX[suffix],
            type: 'object'
        };
        if (Object.keys(schemaProperties).length > 0)
            schemas[schemaName].properties = schemaProperties;

        if (suffix === SUFFIX.read && type["@ODM.root"]) schemas[schemaName]["x-sap-root-entity"] = type["@ODM.root"]
        odmExtensions(type, schemas[schemaName]);
        erExtensions(type, schemas[schemaName]);

        if (suffix === SUFFIX.create && required.length > 0)
            schemas[schemaName].required = [...new Set(required)];

        const description = type[voc.Core.LongDescription];
        if (description) {
            schemas[schemaName].description = description;
        }

        if (derivedTypes[baseName]) {
            schemas[schemaName].anyOf = [];
            derivedTypes[baseName].forEach((derivedType) => {
                schemas[schemaName].anyOf.push(ref(derivedType, suffix));
            });
            if (!type.$Abstract) schemas[schemaName].anyOf.push({});
        }
    }

    /**
     * Add ODM extensions to OpenAPI schema for a structured type
     * @param {object} type Structured type
     * @param {object} schema OpenAPI schema to augment
     */
    function odmExtensions(type, schema) {
        for (const [annotation, openApiExtension] of Object.entries(ODM_ANNOTATIONS)) {
            if (type[annotation]) schema[openApiExtension] = type[annotation];
        }
    }

    /**
     * Add entity relationship extensions to OpenAPI schema for a structured type
     * @param {object} type Structured type
     * @param {object} schema OpenAPI schema to augment
     */
    function erExtensions(type, schema) {
        for (const [annotation, openApiExtension] of Object.entries(ER_ANNOTATIONS)) {
            if (type[annotation]) schema[openApiExtension] = type[annotation];
        }
    }

    /**
     * Collect all properties of a structured type along the inheritance hierarchy
     * @param {object} type Structured type
     * @return {object} Map of properties
     */
    function propertiesOfStructuredType(type) {
        const properties = (type && type.$BaseType) ? propertiesOfStructuredType(modelElement(type.$BaseType)) : {};
        if (type) {
            Object.keys(type).filter(name => isIdentifier(name)).forEach(name => {
                properties[name] = type[name];
            });
        }
        return properties;
    }

    /**
     * Construct Parameter Objects for type-independent OData system query options
     * @return {object} Map of Parameter Objects
     */
    function getParameters() {
        const param = {
            top: {
                name: queryOptionPrefix + 'top',
                in: 'query',
                description: 'Show only the first n items, see [Paging - Top](http://docs.oasis-open.org/odata/odata/v4.01/odata-v4.01-part1-protocol.html#sec_SystemQueryOptiontop)',
                schema: {
                    type: 'integer',
                    minimum: 0
                },
                example: 50
            },
            skip: {
                name: queryOptionPrefix + 'skip',
                in: 'query',
                description: 'Skip the first n items, see [Paging - Skip](http://docs.oasis-open.org/odata/odata/v4.01/odata-v4.01-part1-protocol.html#sec_SystemQueryOptionskip)',
                schema: {
                    type: 'integer',
                    minimum: 0
                }
            },
            count: {
                name: queryOptionPrefix + 'count',
                in: 'query',
                description: 'Include count of items, see [Count](http://docs.oasis-open.org/odata/odata/v4.01/odata-v4.01-part1-protocol.html#sec_SystemQueryOptioncount)',
                schema: {
                    type: 'boolean'
                }
            }
        };

        if (csdl.$Version >= '4.0') param.search = {
            name: queryOptionPrefix + 'search',
            in: 'query',
            description: 'Search items by search phrases, see [Searching](http://docs.oasis-open.org/odata/odata/v4.01/odata-v4.01-part1-protocol.html#sec_SystemQueryOptionsearch)',
            schema: {
                type: 'string'
            }
        };

        return param;
    }

    /**
     * Construct OData error response
     * @return {object} Error response schema
     */
    function error() {
        const err = {
            type: 'object',
            required: ['error'],
            properties: {
                error: {
                    type: 'object',
                    required: ['code', 'message'],
                    properties: {
                        code: { type: 'string' },
                        message: { type: 'string' },
                        target: { type: 'string' },
                        details: {
                            type: 'array',
                            items: {
                                type: 'object',
                                required: ['code', 'message'],
                                properties: {
                                    code: { type: 'string' },
                                    message: { type: 'string' },
                                    target: { type: 'string' }
                                }
                            }
                        },
                        innererror: {
                            type: 'object',
                            description: 'The structure of this object is service-specific'
                        }
                    }
                }
            }
        };

        if (csdl.$Version < '4.0') {
            err.properties.error.properties.message = {
                type: 'object',
                properties: {
                    lang: { type: 'string' },
                    value: { type: 'string' }
                },
                required: ['lang', 'value']
            };
            delete err.properties.error.properties.details;
            delete err.properties.error.properties.target;
        }

        return err;
    }

    /**
     * Construct OData count response
     * @return {object} Count response schema
     */
    function count() {
        return {
            anyOf: [
                { type: 'number' },
                { type: 'string' }
            ],
            description: 'The number of entities in the collection. Available when using the [$count](http://docs.oasis-open.org/odata/odata/v4.01/odata-v4.01-part1-protocol.html#sec_SystemQueryOptioncount) query option.',
        };
    }

    /**
     * Construct Schema Object for model object referencing a type
     * @param {object} modelElement referencing a type
     * @return {object} Schema Object
     */
    function getSchema(element, suffix = '', forParameter = false, forFunction = false) {
        let s = {};
        switch (element.$Type) {
            case 'Edm.AnnotationPath':
            case 'Edm.ModelElementPath':
            case 'Edm.NavigationPropertyPath':
            case 'Edm.PropertyPath':
                s.type = 'string';
                break;
            case 'Edm.Binary':
                s = {
                    type: 'string',
                    format: 'base64url'
                };
                if (element.$MaxLength) s.maxLength = Math.ceil(4 * element.$MaxLength / 3);
                break;
            case 'Edm.Boolean':
                s.type = 'boolean';
                break;
            case 'Edm.Byte':
                s = {
                    type: 'integer',
                    format: 'uint8'
                };
                break;
            case 'Edm.Date':
                s = {
                    type: 'string',
                    format: 'date',
                    example: '2017-04-13'
                };
                break;
            case 'Edm.DateTime':
            case 'Edm.DateTimeOffset':
                s = {
                    type: 'string',
                    format: 'date-time',
                    example: '2017-04-13T15:51:04' + (isNaN(element.$Precision) || element.$Precision === 0 ? '' : '.' + '0'.repeat(element.$Precision)) + 'Z'
                };
                break;
            case 'Edm.Decimal':
                s = {
                    anyOf: [{ type: 'number', format: 'decimal' }, { type: 'string' }],
                    example: 0
                };
                if (!isNaN(element.$Precision)) s['x-sap-precision'] = element.$Precision;
                if (!isNaN(element.$Scale)) s['x-sap-scale'] = element.$Scale;
                // eslint-disable-next-line no-case-declarations
                let scale = !isNaN(element.$Scale) ? element.$Scale : null;
                if (scale !== null) {
                    // Node.js 12.13.0 has problems with negative exponents, 10 ** -5 --> 0.000009999999999999999
                    if (scale <= 0)
                        s.anyOf[0].multipleOf = 10 ** -scale;
                    else
                        s.anyOf[0].multipleOf = 1 / 10 ** scale;
                }
                if (element.$Precision < 16) {
                    let limit = 10 ** (element.$Precision - scale);
                    let delta = 10 ** -scale;
                    s.anyOf[0].maximum = limit - delta;
                    s.anyOf[0].minimum = -s.anyOf[0].maximum;
                }
                break;
            case 'Edm.Double':
                s = {
                    anyOf: [{ type: 'number', format: 'double' }, { type: 'string' }],
                    example: 3.14
                };
                break;
            case 'Edm.Duration':
                s = {
                    type: 'string',
                    format: 'duration',
                    example: 'P4DT15H51M04S'
                };
                break;
            case 'Edm.GeographyPoint':
            case 'Edm.GeometryPoint':
                s = ref('geoPoint');
                typesToInline.geoPoint = true;
                break;
            case 'Edm.Guid':
                s = {
                    type: 'string',
                    format: 'uuid',
                    example: '01234567-89ab-cdef-0123-456789abcdef'
                };
                break;
            case 'Edm.Int16':
                s = {
                    type: 'integer',
                    format: 'int16'
                };
                break;
            case 'Edm.Int32':
                s = {
                    type: 'integer',
                    format: 'int32'
                };
                break;
            case 'Edm.Int64':
                s = {
                    anyOf: [{ type: 'integer', format: 'int64' }, { type: 'string' }],
                    example: "42"
                };
                break;
            case 'Edm.PrimitiveType':
                s = {
                    anyOf: [{ type: 'boolean' }, { type: 'number' }, { type: 'string' }]
                };
                break;
            case 'Edm.SByte':
                s = {
                    type: 'integer',
                    format: 'int8'
                };
                break;
            case 'Edm.Single':
                s = {
                    anyOf: [{ type: 'number', format: 'float' }, { type: 'string' }],
                    example: 3.14
                };
                break;
            case 'Edm.Stream':
                // eslint-disable-next-line no-case-declarations
                let jsonSchema = element[voc.JSON.Schema];
                if (jsonSchema) {
                    if (typeof jsonSchema == 'string')
                        s = JSON.parse(jsonSchema);
                    else
                        s = jsonSchema;
                } else {
                    s = {
                        type: 'string',
                        format: 'base64url'
                    };
                }
                break;
            case 'Edm.String':
            case undefined:
                s.type = 'string';
                if (element.$MaxLength) s.maxLength = element.$MaxLength;
                getPattern(s, element);
                break;
            case 'Edm.TimeOfDay':
                s = {
                    type: 'string',
                    format: 'time',
                    example: '15:51:04'
                };
                break;
            default:
                if (element.$Type.startsWith('Edm.')) {
                    DEBUG?.('Unknown type: ' + element.$Type);
                } else {
                    let type = modelElement(element.$Type);
                    let isStructured = type && ['ComplexType', 'EntityType'].includes(type.$Kind);
                    s = ref(element.$Type, (isStructured ? suffix : ''));
                    if (element.$MaxLength) {
                        s = {
                            allOf: [s],
                            maxLength: element.$MaxLength
                        };
                    }
                }
        }

        allowedValues(s, element);

        if (element.$Nullable) {
            if (s.$ref) s = { allOf: [s] };
            s.nullable = true;
        }

        if (element.$DefaultValue !== undefined) {
            if (s.$ref) s = { allOf: [s] };
            s.default = element.$DefaultValue;
        }

        if (element[voc.Core.Example]) {
            if (s.$ref) s = { allOf: [s] };
            s.example = element[voc.Core.Example].Value;
        }

        if (forFunction) {
            if (s.example && typeof s.example === "string") {
                s.example = `${pathValuePrefix(element.$Type)}${s.example
                    }${pathValueSuffix(element.$Type)} `;
            }
            if (s.pattern) {
                const pre = pathValuePrefix(element.$Type);
                const suf = pathValueSuffix(element.$Type);
                s.pattern = s.pattern.replace(/^\^/, `^ ${pre} (`);
                s.pattern = s.pattern.replace(/\$$/, `)${suf} $`);
            } else if (!element.$Type || element.$Type === "Edm.String") {
                s.pattern = "^'([^']|'')*'$";
            }
            if (element.$Nullable) {
                s.default = "null";
                if (s.pattern) {
                    s.pattern = s.pattern.replace(/^\^/, "^(null|");
                    s.pattern = s.pattern.replace(/\$$/, ")$");
                }
            }
        }

        if (element[voc.Validation.Maximum] != undefined) {
            if (s.$ref) s = { allOf: [s] };
            if (s.anyOf) {
                s.anyOf[0].maximum = element[voc.Validation.Maximum];
            }
            if (element[voc.Validation.Maximum + voc.Validation.Exclusive]) s.exclusiveMaximum = true;
        }

        if (element[voc.Validation.Minimum] != undefined) {
            if (s.$ref) s = { allOf: [s] };
            if (s.anyOf) {
                s.anyOf[0].minimum = element[voc.Validation.Minimum];
            }
            if (element[voc.Validation.Minimum + voc.Validation.Exclusive]) s.exclusiveMinimum = true;
        }

        if (element.$Collection) {
            s = {
                type: 'array',
                items: s
            };
        }

        if (!forParameter && element[voc.Core.LongDescription]) {
            if (s.$ref) s = { allOf: [s] };
            s.description = element[voc.Core.LongDescription];
        }

        if (element['@ODM.oidReference']?.entityName) {
            s['x-sap-odm-oid-reference-entity-name'] = element['@ODM.oidReference'].entityName
        }

        for (const key in element) {
            if (key.startsWith(ER_ANNOTATION_PREFIX) && ER_ANNOTATIONS[key]) {
                s[ER_ANNOTATIONS[key]] = element[key];
            }
        }
        return s;
    }

    /**
     * Add allowed values enum to Schema Object for string-like model element
     * @param {object} schema Schema Object to augment
     * @param {object} element Model element
     */
    function allowedValues(schema, element) {
        const values = element[voc.Validation.AllowedValues];
        if (values) schema.enum = values.map(record => record.Value);
    }

    /**
     * Add pattern to Schema Object for string-like model element
     * @param {object} schema Schema Object to augment
     * @param {object} element Model element
     */
    function getPattern(schema, element) {
        const pattern = element[voc.Validation.Pattern];
        if (pattern) schema.pattern = pattern;
    }

    /**
     * Construct Reference Object for a type
     * @param {string} typename Qualified name of referenced type
     * @param {string} suffix Optional suffix for referenced schema
     * @return {object} Reference Object
     */
    function ref(typename, suffix = '') {
        let name = typename;
        let nsp = '';
        let url = '';
        if (typename.indexOf('.') != -1) {
            let parts = nameParts(typename);
            nsp = namespace[parts.qualifier];
            name = nsp + '.' + parts.name;
            url = namespaceUrl[nsp] || '';
            if (url === "" && !requiredSchemas.used[name + suffix]) {
                requiredSchemas.used[name + suffix] = true;
                requiredSchemas.list.push({ namespace: nsp, name: parts.name, suffix });
            }
            //TODO: introduce better way than guessing
            if (url.endsWith('.xml')) url = url.substring(0, url.length - 3) + "openapi3.json";
        }
        return {
            $ref: url + '#/components/schemas/' + name + suffix
        };
    }

    /**
     * Augment Components Object with map of Security Scheme Objects
     * @param {object} components Components Object to augment
     * @param {object} entityContainer Entity Container object
     */
    function getSecuritySchemes(components, entityContainer) {
        const authorizations = entityContainer && entityContainer[voc.Authorization.Authorizations] ? entityContainer[voc.Authorization.Authorizations] : [];
        const schemes = {};
        const location = { Header: 'header', QueryOption: 'query', Cookie: 'cookie' };
        authorizations.forEach(auth => {
            const scheme = {};
            const flow = {};
            if (auth.Description) scheme.description = auth.Description;
            const qualifiedType = auth['@type'] || auth['@odata.type']
            const type = qualifiedType.substring(qualifiedType.lastIndexOf(".") + 1);
            let unknown = false
            switch (type) {
                case 'ApiKey':
                    scheme.type = 'apiKey';
                    scheme.name = auth.KeyName;
                    scheme.in = location[auth.Location];
                    break;
                case 'Http':
                    scheme.type = 'http';
                    scheme.scheme = auth.Scheme;
                    scheme.bearerFormat = auth.BearerFormat;
                    break;
                case 'OAuth2AuthCode':
                    scheme.type = 'oauth2';
                    scheme.flows = { authorizationCode: flow };
                    flow.authorizationUrl = auth.AuthorizationUrl;
                    flow.tokenUrl = auth.TokenUrl;
                    if (auth.RefreshUrl) flow.refreshUrl = auth.RefreshUrl;
                    flow.scopes = getScopes(auth);
                    break;
                case 'OAuth2ClientCredentials':
                    scheme.type = 'oauth2';
                    scheme.flows = { clientCredentials: flow };
                    flow.tokenUrl = auth.TokenUrl;
                    if (auth.RefreshUrl) flow.refreshUrl = auth.RefreshUrl;
                    flow.scopes = getScopes(auth);
                    break;
                case 'OAuth2Implicit':
                    scheme.type = 'oauth2';
                    scheme.flows = { implicit: flow };
                    flow.authorizationUrl = auth.AuthorizationUrl;
                    if (auth.RefreshUrl) flow.refreshUrl = auth.RefreshUrl;
                    flow.scopes = getScopes(auth);
                    break;
                case 'OAuth2Password':
                    scheme.type = 'oauth2';
                    scheme.flows = {};
                    scheme.flows = { password: flow };
                    flow.tokenUrl = auth.TokenUrl;
                    if (auth.RefreshUrl) flow.refreshUrl = auth.RefreshUrl;
                    flow.scopes = getScopes(auth);
                    break;
                case 'OpenIDConnect':
                    scheme.type = 'openIdConnect';
                    scheme.openIdConnectUrl = auth.IssuerUrl;
                    break;
                default:
                    unknown = true
                    DEBUG?.('Unknown Authorization type ' + qualifiedType);
            }
            if (!unknown) schemes[auth.Name] = scheme;
        });
        if (Object.keys(schemes).length > 0) components.securitySchemes = schemes
    }

    function getScopes(authorization) {
        const scopes = {};
        authorization.Scopes.forEach(scope => { scopes[scope.Scope] = scope.Description });
        return scopes;
    }

    /**
     * Augment OpenAPI document with Security Requirements Object
     * @param {object} openapi OpenAPI document to augment
     * @param {object} entityContainer Entity Container object
     */
    function security(openapi, entityContainer) {
        const securitySchemes = entityContainer && entityContainer[voc.Authorization.SecuritySchemes] ? entityContainer[voc.Authorization.SecuritySchemes] : [];
        // check if securitySchemas exist if it does not exist then throw a warning
        if (securitySchemes.length === 0) {
            DEBUG?.('No security schemes defined in the entity container');
        }
        if (securitySchemes.length > 0) openapi.security = [];
        securitySchemes.forEach(scheme => {
            const s = {};
            s[scheme.Authorization] = scheme.RequiredScopes || [];
            openapi.security.push(s);
        });
    }

    /**
     * a qualified name consists of a namespace or alias, a dot, and a simple name
     * @param {string} qualifiedName
     * @return {string} namespace-qualified name
     */
    function namespaceQualifiedName(qualifiedName) {
        let np = nameParts(qualifiedName);
        return namespace[np.qualifier] + '.' + np.name;
    }

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
    
};
