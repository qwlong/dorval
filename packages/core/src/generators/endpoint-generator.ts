/**
 * Generate Dart API endpoint methods
 */

import type { OpenAPIV3 } from 'openapi-types';
import { TypeMapper } from '../utils';
import { ReferenceResolver } from '../resolvers';

export interface EndpointMethod {
  methodName: string;
  httpMethod: string;
  path: string;
  description?: string;
  summary?: string;
  deprecated?: boolean;
  deprecationMessage?: string;
  hasParameters: boolean;
  parameters: MethodParameter[];
  pathParams: PathParameter[];
  queryParams: QueryParameter[];
  headers: HeaderParameter[];
  hasPathParams: boolean;
  hasQueryParams: boolean;
  hasHeaders: boolean;
  hasBody: boolean;
  bodyParam?: string;
  bodyType?: string;
  returnType: string;
  responseDataType?: string;
  returnsVoid: boolean;
  returnsList: boolean;
  returnsModel: boolean;
  returnsPrimitive: boolean;
  isGenericResponse: boolean;
  itemType?: string;
  hasErrorHandling: boolean;
  errorResponses: ErrorResponse[];
  contentType?: string;
  responseType?: string;
  hasCancelToken: boolean;
  hasProgressCallback: boolean;
  hasSpecialOptions: boolean;
  queryParamsModelName?: string;  // Name of the query params model class
  headersModelName?: string;       // Name of the headers model class
  needsParamsModel: boolean;       // Whether to generate params model
  needsHeadersModel: boolean;      // Whether to generate headers model
  hasComplexNestedQueryParams?: boolean; // Whether query params contain complex nested types
}

export interface MethodParameter {
  name: string;
  type: string;
  required: boolean;
  description?: string;
}

export interface PathParameter {
  name: string;
  dartName: string;
  originalName: string;
}

export interface QueryParameter {
  dartName: string;
  originalName: string;
  required: boolean;
  type?: string;
  description?: string;
}

export interface HeaderParameter {
  dartName: string;
  originalName: string;
  paramName?: string; // Optional for backward compatibility
  required: boolean;
  type?: string;
  description?: string;
}

export interface ErrorResponse {
  statusCode: number;
  description: string;
  hasErrorModel: boolean;
  errorModel?: string;
}

export class EndpointGenerator {
  private schemas: Record<string, any> = {};
  private originalSpec: OpenAPIV3.Document | null = null;
  private referenceResolver: ReferenceResolver | null = null;
  private methodNaming: 'operationId' | 'methodPath' = 'operationId';
  
  /**
   * Set schemas for reference resolution
   */
  setSchemas(schemas: Record<string, any>): void {
    this.schemas = schemas;
  }
  
  /**
   * Set original spec for reference resolution
   */
  setOriginalSpec(spec: OpenAPIV3.Document): void {
    this.originalSpec = spec;
    this.referenceResolver = new ReferenceResolver(spec);
  }
  
  /**
   * Set method naming strategy
   */
  setMethodNaming(naming: 'operationId' | 'methodPath'): void {
    this.methodNaming = naming;
  }
  
  
  /**
   * Generate method data for a GET endpoint
   */
  generateGetMethod(
    operationId: string,
    path: string,
    operation: OpenAPIV3.OperationObject,
    pathItem?: OpenAPIV3.PathItemObject
  ): EndpointMethod {
    const methodName = this.getMethodName(operationId, 'get', path);
    const parameters = this.extractParameters(operation, pathItem);
    
    // Always try to get original response from spec to preserve $ref
    const response = this.getOriginalResponse('get', path) || this.getSuccessResponse(operation);
    const returnType = this.getReturnType(response);
    
    // Generate model names for params and headers if needed
    const needsParamsModel = parameters.query.length > 0;
    const needsHeadersModel = parameters.header.length > 0 && 
                             parameters.header.some(h => h.originalName !== 'Authorization'); // Skip if only auth header
    
    const queryParamsModelName = needsParamsModel ? 
      TypeMapper.toDartClassName(methodName + 'Params') : undefined;
    const headersModelName = needsHeadersModel ? 
      TypeMapper.toDartClassName(methodName + 'Headers') : undefined;
    
    // Check if query params contain complex types or arrays
    const hasComplexNestedQueryParams = needsParamsModel && parameters.query.some(param => {
      const type = param.type || 'String';
      // Check for arrays - arrays need special query parameter formatting
      if (type.startsWith('List<')) {
        return true;
      }
      // Check for non-primitive types
      if (!this.isBuiltInType(type)) {
        return true;
      }
      // Check for nullable non-primitive types
      if (type.endsWith('?')) {
        const baseType = type.slice(0, -1);
        // Check if nullable type is an array
        if (baseType.startsWith('List<')) {
          return true;
        }
        if (!this.isBuiltInType(baseType)) {
          return true;
        }
      }
      return false;
    });
    
    return {
      methodName,
      httpMethod: 'get',
      path: this.normalizePath(path),
      description: operation.description,
      summary: operation.summary,
      deprecated: operation.deprecated,
      deprecationMessage: operation.deprecated ? 'This endpoint is deprecated' : undefined,
      hasParameters: parameters.all.length > 0,
      parameters: parameters.all,
      pathParams: parameters.path,
      queryParams: parameters.query,
      headers: parameters.header,
      hasPathParams: parameters.path.length > 0,
      hasQueryParams: parameters.query.length > 0,
      hasHeaders: parameters.header.length > 0,
      hasBody: false,
      returnType: returnType.type,
      responseDataType: returnType.dataType,
      returnsVoid: returnType.isVoid,
      returnsList: returnType.isList,
      returnsModel: returnType.isModel,
      returnsPrimitive: returnType.isPrimitive,
      isGenericResponse: returnType.isModel || returnType.isList,
      itemType: returnType.itemType,
      hasErrorHandling: false,
      errorResponses: [],
      hasCancelToken: false,
      hasProgressCallback: false,
      hasSpecialOptions: false,
      queryParamsModelName,
      headersModelName,
      needsParamsModel,
      needsHeadersModel,
      hasComplexNestedQueryParams,
    };
  }

  /**
   * Generate method data for POST/PUT/PATCH endpoint
   */
  generateMutationMethod(
    method: string,
    operationId: string,
    path: string,
    operation: OpenAPIV3.OperationObject,
    pathItem?: OpenAPIV3.PathItemObject
  ): EndpointMethod {
    const methodName = this.getMethodName(operationId, method, path);
    const parameters = this.extractParameters(operation, pathItem);
    const requestBody = this.extractRequestBody(operation);
    
    // Try to get original response from spec to preserve $ref
    let response = this.getOriginalResponse(method, path);
    if (!response) {
      response = this.getSuccessResponse(operation);
    }
    const returnType = this.getReturnType(response);
    
    // Combine all parameters
    const allParams = [...parameters.all];
    if (requestBody) {
      allParams.push(requestBody.parameter);
    }
    
    // Generate model names for params and headers if needed
    const needsParamsModel = parameters.query.length > 0;
    const needsHeadersModel = parameters.header.length > 0 && 
                             parameters.header.some(h => h.originalName !== 'Authorization');
    
    const queryParamsModelName = needsParamsModel ? 
      TypeMapper.toDartClassName(methodName + 'Params') : undefined;
    const headersModelName = needsHeadersModel ? 
      TypeMapper.toDartClassName(methodName + 'Headers') : undefined;
    
    // Check if query params contain complex types or arrays
    const hasComplexNestedQueryParams = needsParamsModel && parameters.query.some(param => {
      const type = param.type || 'String';
      // Check for arrays - arrays need special query parameter formatting
      if (type.startsWith('List<')) {
        return true;
      }
      // Check for non-primitive types
      if (!this.isBuiltInType(type)) {
        return true;
      }
      // Check for nullable non-primitive types
      if (type.endsWith('?')) {
        const baseType = type.slice(0, -1);
        // Check if nullable type is an array
        if (baseType.startsWith('List<')) {
          return true;
        }
        if (!this.isBuiltInType(baseType)) {
          return true;
        }
      }
      return false;
    });
    
    return {
      methodName,
      httpMethod: method.toLowerCase(),
      path: this.normalizePath(path),
      description: operation.description,
      summary: operation.summary,
      deprecated: operation.deprecated,
      deprecationMessage: operation.deprecated ? 'This endpoint is deprecated' : undefined,
      hasParameters: allParams.length > 0,
      parameters: allParams,
      pathParams: parameters.path,
      queryParams: parameters.query,
      headers: parameters.header,
      hasPathParams: parameters.path.length > 0,
      hasQueryParams: parameters.query.length > 0,
      hasHeaders: parameters.header.length > 0,
      hasBody: !!requestBody,
      bodyParam: requestBody?.paramName,
      bodyType: requestBody?.parameter.type,
      returnType: returnType.type,
      responseDataType: returnType.dataType,
      returnsVoid: returnType.isVoid,
      returnsList: returnType.isList,
      returnsModel: returnType.isModel,
      returnsPrimitive: returnType.isPrimitive,
      isGenericResponse: returnType.isModel || returnType.isList,
      itemType: returnType.itemType,
      hasErrorHandling: false,
      errorResponses: [],
      contentType: requestBody?.contentType,
      hasCancelToken: false,
      hasProgressCallback: method === 'post' && !!requestBody?.isFormData,
      hasSpecialOptions: !!requestBody?.contentType,
      queryParamsModelName,
      headersModelName,
      needsParamsModel,
      needsHeadersModel,
      hasComplexNestedQueryParams,
    };
  }

  /**
   * Check if a type is a built-in Dart type
   */
  private isBuiltInType(type: string): boolean {
    const builtInTypes = [
      'String', 'int', 'double', 'bool', 'num', 'dynamic', 
      'DateTime', 'Map', 'List', 'void', 'Uint8List'
    ];
    // Check base type (without generics)
    const baseType = type.replace(/<.*>/, '').replace(/\?$/, '');
    // Note: 'Object' is intentionally not included here
    // Object type query params need special handling since they can contain anything
    return builtInTypes.includes(baseType);
  }

  /**
   * Generate method data for DELETE endpoint
   */
  generateDeleteMethod(
    operationId: string,
    path: string,
    operation: OpenAPIV3.OperationObject,
    pathItem?: OpenAPIV3.PathItemObject
  ): EndpointMethod {
    const method = this.generateMutationMethod('delete', operationId, path, operation, pathItem);
    // DELETE typically returns void
    if (!operation.responses?.['200'] && !operation.responses?.['201']) {
      method.returnType = 'void';
      method.returnsVoid = true;
      method.returnsModel = false;
      method.returnsList = false;
    }
    return method;
  }

  /**
   * Extract parameters from operation
   */
  private extractParameters(
    operation: OpenAPIV3.OperationObject,
    pathItem?: OpenAPIV3.PathItemObject
  ): {
    all: MethodParameter[];
    path: PathParameter[];
    query: QueryParameter[];
    header: HeaderParameter[];
  } {
    const all: MethodParameter[] = [];
    const path: PathParameter[] = [];
    const query: QueryParameter[] = [];
    const header: HeaderParameter[] = [];
    
    // Combine operation and path-level parameters
    const parameters = [
      ...(pathItem?.parameters || []),
      ...(operation.parameters || [])
    ];
    
    parameters.forEach(param => {
      let p: OpenAPIV3.ParameterObject;
      
      if ('$ref' in param) {
        // Resolve the reference
        const ref = (param as OpenAPIV3.ReferenceObject).$ref;
        const resolved = this.resolveParameterRef(ref);
        if (!resolved) {
          console.warn(`Failed to resolve parameter reference: ${ref}`);
          return;
        }
        p = resolved;
      } else {
        p = param as OpenAPIV3.ParameterObject;
      }
      // Use camelCase for all parameter names
      const dartName = TypeMapper.toCamelCase(p.name);
      const dartType = this.getParameterType(p);
      
      const methodParam: MethodParameter = {
        name: dartName,
        type: dartType,
        required: p.required || false,
        description: p.description
      };
      
      all.push(methodParam);
      
      switch (p.in) {
        case 'path':
          path.push({
            name: p.name,
            dartName,
            originalName: `{${p.name}}`  // Include curly braces for path params
          });
          break;
        case 'query':
          query.push({
            dartName,
            originalName: p.name,
            required: p.required || false,
            type: dartType,
            description: p.description
          });
          break;
        case 'header':
          header.push({
            dartName,
            originalName: p.name,
            required: p.required || false,
            type: dartType,
            description: p.description
          });
          break;
      }
    });
    
    return { all, path, query, header };
  }

  /**
   * Extract request body information
   */
  private extractRequestBody(operation: OpenAPIV3.OperationObject): {
    parameter: MethodParameter;
    paramName: string;
    contentType?: string;
    isFormData: boolean;
  } | null {
    if (!operation.requestBody) {
      return null;
    }
    
    const requestBody = operation.requestBody as OpenAPIV3.RequestBodyObject;
    const content = requestBody.content;
    
    if (!content) {
      return null;
    }
    
    // Determine content type and schema
    let contentType = 'application/json';
    let schema: OpenAPIV3.SchemaObject | undefined;
    let isFormData = false;
    
    if (content['application/json']) {
      schema = content['application/json'].schema as OpenAPIV3.SchemaObject;
    } else if (content['multipart/form-data']) {
      contentType = 'multipart/form-data';
      schema = content['multipart/form-data'].schema as OpenAPIV3.SchemaObject;
      isFormData = true;
    } else if (content['application/x-www-form-urlencoded']) {
      contentType = 'application/x-www-form-urlencoded';
      schema = content['application/x-www-form-urlencoded'].schema as OpenAPIV3.SchemaObject;
      isFormData = true;
    }
    
    if (!schema) {
      return null;
    }
    
    const dartType = TypeMapper.mapType(schema);
    const paramName = isFormData ? 'formData' : 'body';
    
    return {
      parameter: {
        name: paramName,
        type: isFormData ? 'FormData' : dartType,
        required: requestBody.required || false,
        description: requestBody.description
      },
      paramName,
      contentType: contentType !== 'application/json' ? contentType : undefined,
      isFormData
    };
  }

  /**
   * Get successful response schema
   */
  private getSuccessResponse(operation: OpenAPIV3.OperationObject): OpenAPIV3.ResponseObject | null {
    const responses = operation.responses;
    if (!responses) return null;
    
    // Check for success status codes
    const successCodes = ['200', '201', '202', '204'];
    for (const code of successCodes) {
      if (responses[code]) {
        const response = responses[code];
        if ('$ref' in response) continue;
        return response as OpenAPIV3.ResponseObject;
      }
    }
    
    // Check for default response
    if (responses.default && !('$ref' in responses.default)) {
      return responses.default as OpenAPIV3.ResponseObject;
    }
    
    return null;
  }

  /**
   * Determine return type from response
   */
  private getReturnType(response: OpenAPIV3.ResponseObject | null): {
    type: string;
    dataType?: string;
    isVoid: boolean;
    isList: boolean;
    isModel: boolean;
    isPrimitive: boolean;
    itemType?: string;
  } {
    if (!response || !response.content) {
      return {
        type: 'void',
        isVoid: true,
        isList: false,
        isModel: false,
        isPrimitive: false
      };
    }
    
    const content = response.content['application/json'];
    if (!content || !content.schema) {
      return {
        type: 'dynamic',
        isVoid: false,
        isList: false,
        isModel: false,
        isPrimitive: false
      };
    }
    
    const schema = content.schema;
    
    // Use ReferenceResolver if available
    if (this.referenceResolver && ReferenceResolver.isReference(schema)) {
      const modelName = ReferenceResolver.extractModelNameFromRef(schema.$ref);
      return {
        type: modelName,
        dataType: modelName,
        isVoid: false,
        isList: false,
        isModel: true,
        isPrimitive: false
      };
    }
    
    // Legacy fallback: Check if schema has a reference to a model
    if (schema && '$ref' in schema) {
      const modelName = this.getModelNameFromRef((schema as any).$ref);
      return {
        type: modelName,
        dataType: modelName,
        isVoid: false,
        isList: false,
        isModel: true,
        isPrimitive: false
      };
    }
    
    const schemaObj = schema as OpenAPIV3.SchemaObject;
    
    // Check if it's a list
    const isList = schemaObj.type === 'array';
    let itemType: string | undefined;
    let dataType: string | undefined;
    
    if (isList && schemaObj.items) {
      const items = schemaObj.items as OpenAPIV3.SchemaObject | OpenAPIV3.ReferenceObject;
      if ('$ref' in items) {
        itemType = this.getModelNameFromRef(items.$ref);
        dataType = `List<${itemType}>`;
      } else {
        itemType = TypeMapper.mapType(items as OpenAPIV3.SchemaObject);
        dataType = `List<${itemType}>`;
      }
      
      return {
        type: dataType,
        dataType,
        isVoid: false,
        isList: true,
        isModel: false,
        isPrimitive: false,
        itemType
      };
    }
    
    // Check if it's a model (custom class)
    const isModel = !isList && 
                    schemaObj.type === 'object' && 
                    schemaObj.properties !== undefined;
    
    if (isModel && schemaObj.title) {
      // Use the title as the model name if available
      const modelName = TypeMapper.toDartClassName(schemaObj.title);
      return {
        type: modelName,
        dataType: modelName,
        isVoid: false,
        isList: false,
        isModel: true,
        isPrimitive: false
      };
    }
    
    // For plain objects without title, check if it's a Map
    if (schemaObj.type === 'object' && !schemaObj.properties) {
      // This is likely a Map<String, dynamic>
      const dartType = 'Map<String, dynamic>';
      return {
        type: dartType,
        dataType: undefined,
        isVoid: false,
        isList: false,
        isModel: false,
        isPrimitive: false
      };
    }
    
    const dartType = TypeMapper.mapType(schemaObj);
    
    // Check if it's a primitive
    const primitiveTypes = ['String', 'int', 'double', 'bool', 'num'];
    const isPrimitive = primitiveTypes.includes(dartType);
    
    return {
      type: dartType,
      dataType: isModel || isList ? dartType : undefined,
      isVoid: false,
      isList,
      isModel,
      isPrimitive,
      itemType
    };
  }
  
  /**
   * Extract model name from $ref
   */
  private getModelNameFromRef(ref: string): string {
    // Extract name from reference like "#/components/schemas/ModelName"
    const parts = ref.split('/');
    const name = parts[parts.length - 1];
    return TypeMapper.toDartClassName(name);
  }
  
  /**
   * Get original response from spec to preserve $ref
   */
  private getOriginalResponse(method: string, path: string): OpenAPIV3.ResponseObject | null {
    if (!this.originalSpec) {
      return null;
    }
    
    const pathItem = this.originalSpec.paths?.[path];
    if (!pathItem) {
      return null;
    }
    
    const operation = (pathItem as any)[method] as OpenAPIV3.OperationObject;
    if (!operation || !operation.responses) {
      return null;
    }
    
    // Check for success status codes
    const successCodes = ['200', '201', '202', '204'];
    for (const code of successCodes) {
      if (operation.responses[code]) {
        const response = operation.responses[code];
        if ('$ref' in response) continue;
        
        
        return response as OpenAPIV3.ResponseObject;
      }
    }
    
    return null;
  }

  /**
   * Get parameter type
   */
  private getParameterType(param: OpenAPIV3.ParameterObject): string {
    if (!param.schema) {
      return 'String';
    }
    
    const schema = param.schema as OpenAPIV3.SchemaObject;
    return TypeMapper.mapType(schema);
  }

  /**
   * Generate method name from operation
   */
  private getMethodName(operationId: string | undefined, method: string, path: string): string {
    // Use methodPath naming if specified or if operationId is not available
    if (this.methodNaming === 'methodPath' || !operationId) {
      // Generate name from method and path, including path parameters
      const pathParts = path
        .split('/')
        .filter(p => p) // Remove empty parts
        .map(p => {
          if (p.startsWith('{') && p.endsWith('}')) {
            // Include path parameter name directly: {id} -> Id, {locationId} -> LocationId
            const paramName = p.slice(1, -1); // Remove { and }
            return TypeMapper.toDartClassName(paramName);
          }
          return TypeMapper.toDartClassName(p);
        });
      
      // Create method name like: getV1RolesId, putV1LocationsLocationIdSettings, etc.
      const methodName = method + pathParts.join('');
      return TypeMapper.toDartPropertyName(methodName);
    }
    
    // Use operationId if available and methodNaming is 'operationId'
    return TypeMapper.toDartPropertyName(operationId);
  }

  /**
   * Normalize path for Dart string
   */
  private normalizePath(path: string): string {
    // Convert {param} to $param for Dart string interpolation
    return path;
  }
  
  /**
   * Resolve a parameter reference
   */
  private resolveParameterRef(ref: string): OpenAPIV3.ParameterObject | null {
    // Expected format: #/components/parameters/ParameterName
    if (!ref.startsWith('#/components/parameters/')) {
      console.warn(`Unexpected parameter reference format: ${ref}`);
      return null;
    }
    
    const paramName = ref.split('/').pop();
    if (!paramName) {
      return null;
    }
    
    // Try to get from original spec
    if (this.originalSpec?.components?.parameters) {
      const param = this.originalSpec.components.parameters[paramName];
      if (param && !('$ref' in param)) {
        return param as OpenAPIV3.ParameterObject;
      }
    }
    
    return null;
  }
}