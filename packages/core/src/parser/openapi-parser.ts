/**
 * OpenAPI specification parser with enhanced functionality
 */

import SwaggerParser from '@apidevtools/swagger-parser';
import type { OpenAPIV3 } from 'openapi-types';
import { OpenAPIObject, DartModel, DartEndpoint } from '../types';
import { extractModels } from './models';
import { extractEndpoints } from './endpoints';

export class OpenAPIParser {
  private spec!: OpenAPIObject;
  private resolved: boolean = false;

  /**
   * Parse and validate OpenAPI specification
   */
  async parse(input: string | OpenAPIObject): Promise<this> {
    try {
      // Parse the spec first
      if (typeof input === 'string') {
        this.spec = await SwaggerParser.parse(input) as OpenAPIObject;
      } else {
        this.spec = input;
      }
      
      // Normalize oneOf patterns with null before validation
      this.normalizeNullableOneOf(this.spec);
      
      // Now validate the normalized spec
      this.spec = await SwaggerParser.validate(this.spec) as OpenAPIObject;
      
      // Dereference all $refs
      this.spec = await SwaggerParser.dereference(this.spec) as OpenAPIObject;
      this.resolved = true;
      
      return this;
    } catch (error) {
      throw new Error(`Failed to parse OpenAPI spec: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Parse without dereferencing to preserve $refs
   */
  async parseWithoutDereference(input: string | OpenAPIObject): Promise<this> {
    try {
      // Store the original spec without dereferencing to preserve $refs
      if (typeof input === 'string') {
        this.spec = await SwaggerParser.parse(input) as OpenAPIObject;
      } else {
        this.spec = input;
      }
      this.resolved = false;
      
      // Skip validation to preserve $refs
      // await SwaggerParser.validate(this.spec);
      
      return this;
    } catch (error) {
      throw new Error(`Failed to parse OpenAPI spec: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Get the parsed specification
   */
  getSpec(): OpenAPIObject {
    this.ensureParsed();
    return this.spec;
  }

  /**
   * Get API info
   */
  getInfo(): OpenAPIV3.InfoObject {
    this.ensureParsed();
    return this.spec.info;
  }

  /**
   * Get servers
   */
  getServers(): OpenAPIV3.ServerObject[] {
    this.ensureParsed();
    return this.spec.servers || [];
  }

  /**
   * Get base URL from first server
   */
  getBaseUrl(): string {
    const servers = this.getServers();
    if (servers.length > 0) {
      // Replace variables with default values
      let url = servers[0].url;
      if (servers[0].variables) {
        Object.entries(servers[0].variables).forEach(([key, variable]) => {
          url = url.replace(`{${key}}`, variable.default);
        });
      }
      return url;
    }
    return '';
  }

  /**
   * Get all paths
   */
  getPaths(): OpenAPIV3.PathsObject {
    this.ensureParsed();
    return this.spec.paths || {};
  }

  /**
   * Get components
   */
  getComponents(): OpenAPIV3.ComponentsObject | undefined {
    this.ensureParsed();
    return this.spec.components;
  }

  /**
   * Get all schemas
   */
  getSchemas(): Record<string, OpenAPIV3.SchemaObject> {
    const components = this.getComponents();
    if (!components || !components.schemas) {
      return {};
    }
    
    // Filter out reference objects
    const schemas: Record<string, OpenAPIV3.SchemaObject> = {};
    Object.entries(components.schemas).forEach(([name, schema]) => {
      if (!('$ref' in schema)) {
        schemas[name] = schema as OpenAPIV3.SchemaObject;
      }
    });
    
    return schemas;
  }

  /**
   * Get all tags
   */
  getTags(): OpenAPIV3.TagObject[] {
    this.ensureParsed();
    return this.spec.tags || [];
  }

  /**
   * Normalize oneOf patterns with null to use nullable: true instead
   * This converts oneOf: [{type: "string"}, {type: "null"}] to {type: "string", nullable: true}
   */
  private normalizeNullableOneOf(obj: any): void {
    if (!obj || typeof obj !== 'object') {
      return;
    }

    // Handle arrays
    if (Array.isArray(obj)) {
      obj.forEach(item => this.normalizeNullableOneOf(item));
      return;
    }

    // Check if this object has a nullable oneOf pattern
    if (obj.oneOf && Array.isArray(obj.oneOf) && obj.oneOf.length === 2) {
      const hasNull = obj.oneOf.some((s: any) => s && s.type === 'null');
      const nonNullSchema = obj.oneOf.find((s: any) => s && s.type !== 'null');
      
      if (hasNull && nonNullSchema) {
        // Convert to nullable pattern
        delete obj.oneOf;
        
        // Copy properties from non-null schema
        Object.assign(obj, nonNullSchema);
        
        // Add nullable flag
        obj.nullable = true;
      }
    }
    
    // Also handle anyOf with null pattern
    if (obj.anyOf && Array.isArray(obj.anyOf) && obj.anyOf.length === 2) {
      const hasNull = obj.anyOf.some((s: any) => s && s.type === 'null');
      const nonNullSchema = obj.anyOf.find((s: any) => s && s.type !== 'null');
      
      if (hasNull && nonNullSchema) {
        // Convert to nullable pattern
        delete obj.anyOf;
        
        // Copy properties from non-null schema
        Object.assign(obj, nonNullSchema);
        
        // Add nullable flag
        obj.nullable = true;
      }
    }

    // Recursively process all properties
    Object.keys(obj).forEach(key => {
      if (key !== 'oneOf') { // Skip if we just processed oneOf
        this.normalizeNullableOneOf(obj[key]);
      }
    });
  }

  /**
   * Extract Dart models from the spec
   */
  extractModels(): DartModel[] {
    this.ensureParsed();
    return extractModels(this.spec);
  }

  /**
   * Extract Dart endpoints from the spec
   */
  extractEndpoints(): DartEndpoint[] {
    this.ensureParsed();
    return extractEndpoints(this.spec);
  }

  /**
   * Get endpoints grouped by tag
   */
  getEndpointsByTag(): Map<string, DartEndpoint[]> {
    const endpoints = this.extractEndpoints();
    const grouped = new Map<string, DartEndpoint[]>();
    
    endpoints.forEach(endpoint => {
      const tags = endpoint.tags || ['default'];
      tags.forEach(tag => {
        if (!grouped.has(tag)) {
          grouped.set(tag, []);
        }
        grouped.get(tag)!.push(endpoint);
      });
    });
    
    return grouped;
  }

  /**
   * Check if spec has been parsed
   */
  private ensureParsed(): void {
    if (!this.spec) {
      throw new Error('OpenAPI spec has not been parsed yet. Call parse() first.');
    }
  }

  /**
   * Get operation by operationId
   */
  getOperationById(operationId: string): OpenAPIV3.OperationObject | null {
    this.ensureParsed();
    
    const paths = this.getPaths();
    for (const [path, pathItem] of Object.entries(paths)) {
      if (!pathItem) continue;
      
      const methods = ['get', 'post', 'put', 'delete', 'patch', 'options', 'head'] as const;
      for (const method of methods) {
        const operation = (pathItem as any)[method] as OpenAPIV3.OperationObject;
        if (operation && operation.operationId === operationId) {
          return operation;
        }
      }
    }
    
    return null;
  }

  /**
   * Get all security schemes
   */
  getSecuritySchemes(): Record<string, OpenAPIV3.SecuritySchemeObject> {
    const components = this.getComponents();
    if (!components || !components.securitySchemes) {
      return {};
    }
    
    const schemes: Record<string, OpenAPIV3.SecuritySchemeObject> = {};
    Object.entries(components.securitySchemes).forEach(([name, scheme]) => {
      if (!('$ref' in scheme)) {
        schemes[name] = scheme as OpenAPIV3.SecuritySchemeObject;
      }
    });
    
    return schemes;
  }

  /**
   * Check if API requires authentication
   */
  hasAuthentication(): boolean {
    return this.spec.security !== undefined && this.spec.security.length > 0;
  }

  /**
   * Get global parameters
   */
  getGlobalParameters(): OpenAPIV3.ParameterObject[] {
    const components = this.getComponents();
    if (!components || !components.parameters) {
      return [];
    }
    
    const params: OpenAPIV3.ParameterObject[] = [];
    Object.values(components.parameters).forEach(param => {
      if (!('$ref' in param)) {
        params.push(param as OpenAPIV3.ParameterObject);
      }
    });
    
    return params;
  }
}