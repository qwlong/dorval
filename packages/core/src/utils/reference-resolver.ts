/**
 * Utility for resolving $ref references in OpenAPI specifications
 */

import type { OpenAPIV3 } from 'openapi-types';
import { TypeMapper } from './type-mapper';

export class ReferenceResolver {
  private spec: OpenAPIV3.Document;
  
  constructor(spec: OpenAPIV3.Document) {
    this.spec = spec;
  }
  
  /**
   * Extract model name from a $ref string
   * Example: "#/components/schemas/LocationSettingsResponseDto" -> "LocationSettingsResponseDto"
   */
  static extractModelNameFromRef(ref: string): string {
    const parts = ref.split('/');
    const modelName = parts[parts.length - 1];
    return TypeMapper.toDartClassName(modelName);
  }
  
  /**
   * Check if a schema is a reference
   */
  static isReference(schema: any): schema is OpenAPIV3.ReferenceObject {
    return schema && typeof schema === 'object' && '$ref' in schema;
  }
  
  /**
   * Resolve a reference to its actual schema
   */
  resolveReference(ref: string): OpenAPIV3.SchemaObject | null {
    // Parse the reference path
    // Format: #/components/schemas/ModelName
    if (!ref.startsWith('#/')) {
      console.warn(`External references not supported: ${ref}`);
      return null;
    }
    
    const parts = ref.substring(2).split('/'); // Remove '#/' and split
    let current: any = this.spec;
    
    for (const part of parts) {
      if (!current || typeof current !== 'object') {
        return null;
      }
      current = current[part];
    }
    
    // If the resolved value is itself a reference, resolve it recursively
    if (ReferenceResolver.isReference(current)) {
      return this.resolveReference(current.$ref);
    }
    
    return current as OpenAPIV3.SchemaObject;
  }
  
  /**
   * Get the Dart type for a schema (handles both direct schemas and references)
   */
  getDartType(schema: OpenAPIV3.SchemaObject | OpenAPIV3.ReferenceObject): string {
    if (ReferenceResolver.isReference(schema)) {
      // This is a reference to a model
      return ReferenceResolver.extractModelNameFromRef(schema.$ref);
    }
    
    // Direct schema - use TypeMapper
    const schemaObj = schema as OpenAPIV3.SchemaObject;
    
    // Handle arrays
    if (schemaObj.type === 'array' && schemaObj.items) {
      const itemType = this.getDartType(schemaObj.items);
      return `List<${itemType}>`;
    }
    
    // Handle objects with title (models)
    if (schemaObj.type === 'object' && schemaObj.title) {
      return TypeMapper.toDartClassName(schemaObj.title);
    }
    
    // Use TypeMapper for primitive types
    return TypeMapper.mapType(schemaObj);
  }
  
  /**
   * Get response type from an operation
   */
  getResponseType(operation: OpenAPIV3.OperationObject): string {
    const responses = operation.responses;
    if (!responses) {
      return 'void';
    }
    
    // Check for successful response codes
    const successCodes = ['200', '201', '202', '204'];
    for (const code of successCodes) {
      const response = responses[code];
      if (!response) continue;
      
      // Handle reference responses
      if (ReferenceResolver.isReference(response)) {
        const resolved = this.resolveReference(response.$ref);
        if (resolved && (resolved as any).content?.['application/json']?.schema) {
          return this.getDartType((resolved as any).content['application/json'].schema);
        }
        continue;
      }
      
      // Handle direct response objects
      const responseObj = response as OpenAPIV3.ResponseObject;
      if (responseObj.content?.['application/json']?.schema) {
        return this.getDartType(responseObj.content['application/json'].schema);
      }
    }
    
    // Check default response
    if (responses.default) {
      if (ReferenceResolver.isReference(responses.default)) {
        const resolved = this.resolveReference(responses.default.$ref);
        if (resolved && (resolved as any).content?.['application/json']?.schema) {
          return this.getDartType((resolved as any).content['application/json'].schema);
        }
      } else {
        const defaultResponse = responses.default as OpenAPIV3.ResponseObject;
        if (defaultResponse.content?.['application/json']?.schema) {
          return this.getDartType(defaultResponse.content['application/json'].schema);
        }
      }
    }
    
    return 'dynamic';
  }
  
  /**
   * Get request body type from an operation
   */
  getRequestBodyType(operation: OpenAPIV3.OperationObject): string | null {
    if (!operation.requestBody) {
      return null;
    }
    
    let requestBody: OpenAPIV3.RequestBodyObject;
    
    if (ReferenceResolver.isReference(operation.requestBody)) {
      const resolved = this.resolveReference(operation.requestBody.$ref);
      if (!resolved) {
        return null;
      }
      requestBody = resolved as unknown as OpenAPIV3.RequestBodyObject;
    } else {
      requestBody = operation.requestBody as OpenAPIV3.RequestBodyObject;
    }
    
    // Check for JSON content
    if (requestBody.content?.['application/json']?.schema) {
      return this.getDartType(requestBody.content['application/json'].schema);
    }
    
    // Check for form data
    if (requestBody.content?.['multipart/form-data']?.schema) {
      return 'FormData';
    }
    
    // Check for URL encoded
    if (requestBody.content?.['application/x-www-form-urlencoded']?.schema) {
      return 'FormData';
    }
    
    return null;
  }
}