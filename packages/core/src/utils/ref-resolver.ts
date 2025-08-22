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
  
  constructor(private schemas: Record<string, OpenAPIV3.SchemaObject>) {
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
   * Get a unique key for a schema object
   */
  private getSchemaKey(schema: OpenAPIV3.SchemaObject): string {
    // Create a deterministic key based on schema properties
    const key = {
      type: schema.type,
      properties: schema.properties ? Object.keys(schema.properties).sort() : undefined,
      required: schema.required?.sort(),
      enum: schema.enum,
      items: 'items' in schema ? schema.items : undefined,
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
    const baseType = this.resolveSchemaType(propSchema);
    const imports: string[] = [];
    
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
        }
      }
    }
    
    // Check if it's a direct model type (exclude built-in types)
    const isModel = !['String', 'int', 'double', 'bool', 'num', 'dynamic', 'void', 'DateTime', 'Uint8List'].includes(baseType) &&
                    !baseType.startsWith('List<') &&
                    !baseType.startsWith('Map<');
    
    if (isModel) {
      // Add import for the model with .f.dart extension
      const fileName = TypeMapper.toSnakeCase(baseType);
      imports.push(`${fileName}.f.dart`);
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
}