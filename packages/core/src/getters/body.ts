/**
 * Request body handling - aligned with Orval structure
 * Processes request body schemas and generates Dart types
 */

import { OpenAPIV3 } from 'openapi-types';

export interface BodyResult {
  type: string;
  imports: string[];
  isOptional: boolean;
  isFormData?: boolean;
  isFormUrlEncoded?: boolean;
  contentType?: string;
  parameterName?: string;
  nullable?: boolean;
}

/**
 * Process request body and return Dart type
 */
export function getBody(
  requestBody: OpenAPIV3.ReferenceObject | OpenAPIV3.RequestBodyObject,
  operationName: string,
  _context?: any
): BodyResult {
  const imports: string[] = [];
  let type = 'dynamic';
  let isOptional = true; // Default to optional
  let contentType = 'application/json';
  let isFormData = false;
  let isFormUrlEncoded = false;
  
  // Handle reference
  if ('$ref' in requestBody) {
    const refName = extractTypeFromRef(requestBody.$ref);
    type = refName;
    imports.push(`models/${toSnakeCase(refName)}.f.dart`);
    
    // For references, we can't determine if required without resolving
    // Default to required for references
    isOptional = false;
  } else {
    // Direct request body object
    isOptional = !requestBody.required;
    
    // Get content type and schema
    if (requestBody.content) {
      // Handle different content types
      if (requestBody.content['application/json']) {
        contentType = 'application/json';
        const mediaType = requestBody.content['application/json'];
        
        if (mediaType.schema) {
          const result = processSchema(mediaType.schema, operationName);
          type = result.type;
          imports.push(...result.imports);
        }
      } else if (requestBody.content['multipart/form-data']) {
        contentType = 'multipart/form-data';
        isFormData = true;
        const mediaType = requestBody.content['multipart/form-data'];
        
        if (mediaType.schema) {
          const result = processFormDataSchema(mediaType.schema, operationName);
          type = result.type;
          imports.push(...result.imports);
        }
      } else if (requestBody.content['application/x-www-form-urlencoded']) {
        contentType = 'application/x-www-form-urlencoded';
        isFormUrlEncoded = true;
        const mediaType = requestBody.content['application/x-www-form-urlencoded'];
        
        if (mediaType.schema) {
          const result = processFormDataSchema(mediaType.schema, operationName);
          type = result.type;
          imports.push(...result.imports);
        }
      } else if (requestBody.content['text/plain']) {
        contentType = 'text/plain';
        type = 'String';
      } else if (requestBody.content['application/octet-stream']) {
        contentType = 'application/octet-stream';
        type = 'Uint8List';
        imports.push('dart:typed_data');
      }
    }
  }
  
  // Generate parameter name
  const parameterName = type === 'dynamic' || type === 'Map<String, dynamic>' 
    ? 'body'
    : toCamelCase(type);
  
  return {
    type,
    imports,
    isOptional,
    isFormData,
    isFormUrlEncoded,
    contentType,
    parameterName,
    nullable: isOptional
  };
}

/**
 * Process schema to get type
 */
function processSchema(
  schema: OpenAPIV3.ReferenceObject | OpenAPIV3.SchemaObject,
  operationName: string
): { type: string; imports: string[] } {
  const imports: string[] = [];
  
  if ('$ref' in schema) {
    const refName = extractTypeFromRef(schema.$ref);
    imports.push(`models/${toSnakeCase(refName)}.f.dart`);
    return { type: refName, imports };
  }
  
  // Inline schema
  switch (schema.type) {
    case 'object':
      // For inline objects, we could generate a type or use Map
      if (schema.properties) {
        // Generate inline type name based on operation
        const typeName = `${toPascalCase(operationName)}Body`;
        // TODO: Generate inline model
        return { type: typeName, imports };
      }
      return { type: 'Map<String, dynamic>', imports };
    
    case 'array':
      if (schema.items) {
        const itemResult = processSchema(schema.items, operationName);
        imports.push(...itemResult.imports);
        return { type: `List<${itemResult.type}>`, imports };
      }
      return { type: 'List<dynamic>', imports };
    
    case 'string':
      if (schema.format === 'binary') {
        imports.push('dart:typed_data');
        return { type: 'Uint8List', imports };
      }
      return { type: 'String', imports };
    
    case 'integer':
      return { type: 'int', imports };
    
    case 'number':
      return { type: 'double', imports };
    
    case 'boolean':
      return { type: 'bool', imports };
    
    default:
      return { type: 'dynamic', imports };
  }
}

/**
 * Process form data schema
 */
function processFormDataSchema(
  schema: OpenAPIV3.ReferenceObject | OpenAPIV3.SchemaObject,
  operationName: string
): { type: string; imports: string[] } {
  const imports: string[] = [];
  
  if ('$ref' in schema) {
    const refName = extractTypeFromRef(schema.$ref);
    imports.push(`models/${toSnakeCase(refName)}.f.dart`);
    return { type: refName, imports };
  }
  
  // For form data, we typically use FormData type
  imports.push('package:dio/dio.dart');
  
  if (schema.type === 'object' && schema.properties) {
    // Could generate a custom form data model
    const typeName = `${toPascalCase(operationName)}FormData`;
    // TODO: Generate form data model
    return { type: typeName, imports };
  }
  
  return { type: 'FormData', imports };
}

/**
 * Extract type name from $ref
 */
function extractTypeFromRef(ref: string): string {
  const parts = ref.split('/');
  return parts[parts.length - 1];
}

/**
 * Convert to snake_case
 */
function toSnakeCase(str: string): string {
  return str
    .replace(/([a-z])([A-Z])/g, '$1_$2')
    .replace(/([A-Z]+)([A-Z][a-z])/g, '$1_$2')
    .toLowerCase();
}

/**
 * Convert to camelCase
 */
function toCamelCase(str: string): string {
  if (str.includes('_')) {
    const parts = str.split('_');
    return parts[0].toLowerCase() + parts.slice(1).map(p => 
      p.charAt(0).toUpperCase() + p.slice(1).toLowerCase()
    ).join('');
  }
  return str.charAt(0).toLowerCase() + str.slice(1);
}

/**
 * Convert to PascalCase
 */
function toPascalCase(str: string): string {
  if (str.includes('_')) {
    return str.split('_').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
    ).join('');
  }
  if (str.includes('-')) {
    return str.split('-').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
    ).join('');
  }
  return str.charAt(0).toUpperCase() + str.slice(1);
}

/**
 * Check if body contains file upload
 */
export function hasFileUpload(
  requestBody: OpenAPIV3.RequestBodyObject
): boolean {
  if (!requestBody.content) return false;
  
  const formData = requestBody.content['multipart/form-data'];
  if (!formData || !formData.schema) return false;
  
  if ('properties' in formData.schema) {
    const properties = formData.schema.properties || {};
    
    for (const prop of Object.values(properties)) {
      if (typeof prop === 'object' && 'format' in prop) {
        if (prop.format === 'binary' || prop.format === 'byte') {
          return true;
        }
      }
    }
  }
  
  return false;
}

/**
 * Get body parameter documentation
 */
export function getBodyDocumentation(
  requestBody: OpenAPIV3.RequestBodyObject
): string | undefined {
  return requestBody.description;
}

/**
 * Generate body parameter for method signature
 */
export function generateBodyParameter(
  body: BodyResult
): string {
  const required = !body.isOptional ? 'required ' : '';
  const nullable = body.nullable ? '?' : '';
  
  return `${required}${body.type}${nullable} ${body.parameterName}`;
}