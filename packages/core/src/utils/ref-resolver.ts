/**
 * Utility for resolving OpenAPI $ref references
 */

import type { OpenAPIV3 } from 'openapi-types';
import { TypeMapper } from './type-mapper';

export interface ResolvedReference {
  modelName: string;
  isArray: boolean;
  isNullable: boolean;
  itemType?: string;
}

export class RefResolver {
  private schemaNames: Map<string, string> = new Map();
  private processedSchemas: Set<string> = new Set();
  private schemas: Record<string, OpenAPIV3.SchemaObject>;
  private spec: OpenAPIV3.Document;
  
  constructor(specOrSchemas: OpenAPIV3.Document | Record<string, OpenAPIV3.SchemaObject>) {
    // Handle both OpenAPI spec and direct schemas object
    if ('openapi' in specOrSchemas) {
      this.spec = specOrSchemas;
      this.schemas = specOrSchemas.components?.schemas || {};
    } else {
      this.schemas = specOrSchemas;
      this.spec = {} as OpenAPIV3.Document;
    }
    // Build a map of schema objects to their names
    this.buildSchemaNameMap();
  }
  
  /**
   * Build a map of schema objects to their names
   */
  private buildSchemaNameMap(): void {
    Object.entries(this.schemas).forEach(([name, schema]) => {
      // Store the schema by its stringified representation for lookup
      const key = this.getSchemaKey(schema);
      this.schemaNames.set(key, name);
    });
  }
  
  /**
   * Resolve a reference to get the actual schema
   */
  resolveReference(ref: string): OpenAPIV3.SchemaObject | null {
    if (!ref || !ref.startsWith('#/components/schemas/')) {
      return null;
    }
    
    const schemaName = ref.replace('#/components/schemas/', '');
    return this.schemas[schemaName] || null;
  }
  
  /**
   * Get a unique key for a schema object
   */
  private getSchemaKey(schema: OpenAPIV3.SchemaObject): string {
    // Ensure schema is an object
    if (!schema || typeof schema !== 'object') {
      return JSON.stringify(schema);
    }
    
    // Create a deterministic key based on schema properties
    const key = {
      type: schema.type,
      properties: schema.properties ? Object.keys(schema.properties).sort() : undefined,
      required: schema.required?.sort(),
      enum: schema.enum,
      items: schema && typeof schema === 'object' && 'items' in schema ? schema.items : undefined,
    };
    return JSON.stringify(key);
  }
  
  /**
   * Resolve a schema to get its Dart type
   */
  resolveSchemaType(schema: OpenAPIV3.SchemaObject | OpenAPIV3.ReferenceObject): string {
    // Handle direct references
    if ('$ref' in schema) {
      const modelName = TypeMapper.extractTypeFromRef(schema.$ref);
      if (!modelName) {
        return 'dynamic';
      }
      // Check if the referenced schema exists
      const schemaName = schema.$ref.replace('#/components/schemas/', '');
      if (!this.schemas[schemaName]) {
        return 'dynamic';
      }
      return TypeMapper.toDartClassName(modelName);
    }
    
    // Handle arrays with references
    if (schema.type === 'array' && 'items' in schema && schema.items) {
      const itemType = this.resolveSchemaType(schema.items as any);
      return `List<${itemType}>`;
    }
    
    // Check if this schema matches a known model
    const schemaKey = this.getSchemaKey(schema);
    const knownModelName = this.schemaNames.get(schemaKey);
    
    if (knownModelName) {
      return TypeMapper.toDartClassName(knownModelName);
    }
    
    // Handle objects with properties (potential inline models)
    if (schema.type === 'object' && schema.properties) {
      // Check if any property references another schema
      const hasModelReferences = Object.values(schema.properties).some(prop => {
        if ('$ref' in prop) return true;
        const propSchema = prop as OpenAPIV3.SchemaObject;
        if (propSchema.type === 'array' && 'items' in propSchema) {
          const items = propSchema.items;
          return items && '$ref' in items;
        }
        return false;
      });
      
      if (hasModelReferences) {
        // This is likely a model that references other models
        // Try to find it in our schema map
        return schema.title ? TypeMapper.toDartClassName(schema.title) : 'Map<String, dynamic>';
      }
    }
    
    // Fall back to basic type mapping
    return TypeMapper.mapType(schema);
  }
  
  /**
   * Resolve property type with proper model references
   */
  resolvePropertyType(
    propSchema: OpenAPIV3.SchemaObject | OpenAPIV3.ReferenceObject,
    required: boolean = true
  ): {
    type: string;
    imports: string[];
    isModel: boolean;
  } {
    // Handle null or undefined schemas
    if (!propSchema) {
      return {
        type: 'dynamic',
        imports: [],
        isModel: false
      };
    }
    
    const baseType = this.resolveSchemaType(propSchema);
    const imports: string[] = [];
    
    // Check for special imports
    if (baseType === 'Uint8List' || baseType.includes('Uint8List')) {
      imports.push('dart:typed_data');
    }
    
    // Check if it's a List of models
    if (baseType.startsWith('List<')) {
      const match = baseType.match(/^List<(.+)>$/);
      if (match) {
        const itemType = match[1];
        // Check if the item type is a model (exclude built-in types)
        if (!['String', 'int', 'double', 'bool', 'num', 'dynamic', 'void', 'DateTime', 'Uint8List'].includes(itemType) &&
            !itemType.startsWith('Map<')) {
          const fileName = TypeMapper.toSnakeCase(itemType);
          imports.push(`${fileName}.f.dart`);
        } else if (itemType === 'Uint8List') {
          imports.push('dart:typed_data');
        }
      }
    }
    
    // Check if it's a direct model type (exclude built-in types)
    const isModel = !['String', 'int', 'double', 'bool', 'num', 'dynamic', 'void', 'DateTime', 'Uint8List'].includes(baseType) &&
                    !baseType.startsWith('List<') &&
                    !baseType.startsWith('Map<');
    
    if (isModel) {
      // Check if it's an enum by looking up the schema
      let isEnum = false;
      if ('$ref' in propSchema) {
        const schemaName = propSchema.$ref.replace('#/components/schemas/', '');
        const schema = this.schemas[schemaName];
        if (schema) {
          isEnum = this.isEnumSchema(schema);
        }
      }
      
      // Add import for the model with appropriate extension
      const fileName = TypeMapper.toSnakeCase(baseType);
      imports.push(isEnum ? `${fileName}.dart` : `${fileName}.f.dart`);
    }
    
    // Handle nullable types
    const finalType = !required && baseType !== 'dynamic' ? `${baseType}?` : baseType;
    
    return {
      type: finalType,
      imports,
      isModel
    };
  }
  
  /**
   * Check if a schema represents an enum
   */
  isEnumSchema(schema: OpenAPIV3.SchemaObject): boolean {
    return !!schema.enum && Array.isArray(schema.enum) && schema.enum.length > 0;
  }
  
  /**
   * Extract enum values from schema
   */
  getEnumValues(schema: OpenAPIV3.SchemaObject): string[] {
    if (!this.isEnumSchema(schema)) {
      return [];
    }
    return schema.enum as string[];
  }
  
  /**
   * Check for circular dependencies
   */
  hasCircularDependency(schemaName: string, visited: Set<string> = new Set()): boolean {
    if (visited.has(schemaName)) {
      return true;
    }
    
    visited.add(schemaName);
    const schema = this.schemas[schemaName];
    
    if (!schema || !schema.properties) {
      return false;
    }
    
    // Check each property for circular references
    for (const prop of Object.values(schema.properties)) {
      if ('$ref' in prop) {
        const refName = TypeMapper.extractTypeFromRef(prop.$ref);
        if (this.hasCircularDependency(refName, new Set(visited))) {
          return true;
        }
      } else {
        const propSchema = prop as OpenAPIV3.SchemaObject;
        if (propSchema.type === 'array' && 'items' in propSchema) {
          const items = propSchema.items;
          if (items && '$ref' in items) {
            const refName = TypeMapper.extractTypeFromRef(items.$ref);
            if (this.hasCircularDependency(refName, new Set(visited))) {
              return true;
            }
          }
        }
      }
    }
    
    return false;
  }
  
  /**
   * Resolve a $ref to its type and import
   */
  resolveRef(ref: string): { type: string; import: string } | undefined {
    if (!ref.startsWith('#/components/schemas/')) {
      return undefined;
    }
    
    const schemaName = ref.replace('#/components/schemas/', '');
    const schema = this.schemas[schemaName];
    
    if (!schema) {
      return undefined;
    }
    
    const type = TypeMapper.toDartClassName(schemaName);
    const fileName = TypeMapper.toSnakeCase(type);
    
    // Check if it's an enum
    const isEnum = this.isEnumSchema(schema);
    const importPath = isEnum ? `${fileName}.dart` : `${fileName}.f.dart`;
    
    return {
      type,
      import: importPath
    };
  }
  
  /**
   * Resolve the type from an OpenAPI response object
   */
  resolveResponseType(response: OpenAPIV3.ResponseObject): {
    type: string;
    imports: string[];
    isModel: boolean;
  } {
    // If no content, return void
    if (!response.content) {
      return {
        type: 'void',
        imports: [],
        isModel: false
      };
    }
    
    // Prefer application/json content
    const content = response.content['application/json'] || Object.values(response.content)[0];
    
    if (!content || !content.schema) {
      return {
        type: 'void',
        imports: [],
        isModel: false
      };
    }
    
    return this.resolvePropertyType(content.schema, true);
  }
  
  /**
   * Resolve the type from an OpenAPI request body object
   */
  resolveRequestBodyType(requestBody: OpenAPIV3.RequestBodyObject): {
    type: string;
    imports: string[];
    isModel: boolean;
  } {
    // Get the schema from content
    const content = requestBody.content?.['application/json'] || 
                   (requestBody.content && Object.values(requestBody.content)[0]);
    
    if (!content || !content.schema) {
      return {
        type: 'Map<String, dynamic>',
        imports: [],
        isModel: false
      };
    }
    
    // OpenAPI spec: requestBody is optional by default unless marked required
    const required = 'required' in requestBody ? !!requestBody.required : false;
    return this.resolvePropertyType(content.schema, required);
  }
}