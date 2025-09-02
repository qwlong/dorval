/**
 * Handles object schema processing - aligned with Orval structure
 * This file mirrors orval/packages/core/src/getters/object.ts
 */

import { OpenAPIV3 } from 'openapi-types';
import { combineSchemas } from './combine';
import { TypeMapper } from '../utils/type-mapper';
import { TemplateManager } from '../templates/template-manager';
import { DartProperty } from '../types';

export interface ObjectResult {
  type: string;
  imports: string[];
  properties?: Map<string, PropertyInfo>;
  required?: string[];
  definition?: string;
}

export interface PropertyInfo {
  name: string;
  type: string;
  required: boolean;
  nullable: boolean;
  description?: string;
  defaultValue?: any;
  jsonKey?: string;
}

/**
 * Process object schema - mirrors Orval's getObject
 */
export function getObject(
  item: OpenAPIV3.SchemaObject,
  name: string,
  context?: any
): ObjectResult {
  // Check for composition first (allOf, oneOf, anyOf)
  if (item.allOf || item.oneOf || item.anyOf) {
    const separator = item.allOf ? 'allOf' : item.oneOf ? 'oneOf' : 'anyOf';
    
    return combineSchemas(
      item,
      name,
      separator,
      context
    );
  }

  // Handle regular object with properties
  const imports: string[] = [];
  const properties = new Map<string, PropertyInfo>();
  const required = item.required || [];
  
  if (item.properties) {
    Object.entries(item.properties).forEach(([propName, propSchema]) => {
      const propInfo = processProperty(propName, propSchema, required.includes(propName), imports, context?.inlineTypes);
      properties.set(propName, propInfo);
    });
  }

  // Generate Freezed model
  const definition = generateObjectModel(name, properties, imports);
  
  return {
    type: TypeMapper.toDartClassName(name),
    imports,
    properties,
    required,
    definition
  };
}

/**
 * Process a single property
 */
function processProperty(
  propName: string,
  propSchema: any,
  isRequired: boolean,
  imports: string[],
  inlineTypes?: Map<string, string>
): PropertyInfo {
  const dartName = TypeMapper.toDartPropertyName(propName);
  let dartType = 'dynamic';
  
  // Check if this property has an inline type mapping
  if (inlineTypes?.has(propName)) {
    const nestedTypeName = inlineTypes.get(propName)!;
    dartType = TypeMapper.toDartClassName(nestedTypeName);
    imports.push(`${TypeMapper.toSnakeCase(nestedTypeName)}.f.dart`);
  }
  // Handle $ref
  else if (propSchema.$ref) {
    const typeName = TypeMapper.extractTypeFromRef(propSchema.$ref);
    dartType = TypeMapper.toDartClassName(typeName);
    imports.push(`${TypeMapper.toSnakeCase(typeName)}.f.dart`);
  }
  // Handle allOf composition in property
  else if (propSchema.allOf) {
    // If allOf has a single $ref, treat it as a direct reference
    if (propSchema.allOf.length === 1 && propSchema.allOf[0].$ref) {
      const typeName = TypeMapper.extractTypeFromRef(propSchema.allOf[0].$ref);
      dartType = TypeMapper.toDartClassName(typeName);
      const importPath = `${TypeMapper.toSnakeCase(typeName)}.f.dart`;
      imports.push(importPath);
    } else {
      // Complex allOf - for now use dynamic
      // TODO: Implement proper allOf merging
      dartType = 'dynamic';
    }
  }
  // Handle composition in property
  else if (propSchema.oneOf || propSchema.anyOf) {
    // Check if this is a nullable pattern (oneOf with string and null)
    const schemas = propSchema.oneOf || propSchema.anyOf;
    
    // Handle single type in oneOf/anyOf (common in poorly structured OpenAPI specs)
    if (schemas.length === 1) {
      const singleSchema = schemas[0];
      if (singleSchema.$ref) {
        const typeName = TypeMapper.extractTypeFromRef(singleSchema.$ref);
        dartType = TypeMapper.toDartClassName(typeName);
        imports.push(`${TypeMapper.toSnakeCase(typeName)}.f.dart`);
      } else {
        dartType = getScalarType(singleSchema);
        // Add imports if needed for complex types
        if (dartType.startsWith('List<') && !dartType.includes('Map<String, dynamic>')) {
          const innerType = TypeMapper.extractInnerType(dartType);
          if (!isPrimitiveType(innerType) && innerType !== 'Map<String, dynamic>') {
            imports.push(`${TypeMapper.toSnakeCase(innerType)}.f.dart`);
          }
        }
      }
    }
    else if (schemas.length === 2) {
      const hasNull = schemas.some((s: any) => s.type === 'null');
      const nonNullSchema = schemas.find((s: any) => s.type !== 'null');
      
      if (hasNull && nonNullSchema) {
        // This is a nullable type pattern - type is inherently nullable
        // Check if nonNullSchema is a reference
        if (nonNullSchema.$ref) {
          const typeName = TypeMapper.extractTypeFromRef(nonNullSchema.$ref);
          dartType = TypeMapper.toDartClassName(typeName) + '?';
          imports.push(`${TypeMapper.toSnakeCase(typeName)}.f.dart`);
        } else {
          dartType = getScalarType(nonNullSchema);
          // For oneOf/anyOf with null, the type is already nullable
          if (!dartType.endsWith('?')) {
            dartType += '?';
          }
          // Add imports if needed
          if (dartType.startsWith('List<') && !dartType.includes('Map<String, dynamic>')) {
            const innerType = TypeMapper.extractInnerType(dartType);
            if (!isPrimitiveType(innerType) && innerType !== 'Map<String, dynamic>') {
              imports.push(`${TypeMapper.toSnakeCase(innerType)}.f.dart`);
            }
          }
        }
      } else {
        // Complex union type - use dynamic for now
        dartType = 'dynamic';
      }
    } else {
      // Complex union type - use dynamic for now
      dartType = 'dynamic';
    }
  }
  // Handle basic types
  else {
    dartType = getScalarType(propSchema);
    
    // Add imports for complex types
    if (dartType.startsWith('List<') && !dartType.includes('Map<String, dynamic>')) {
      const innerType = TypeMapper.extractInnerType(dartType);
      if (!isPrimitiveType(innerType) && innerType !== 'Map<String, dynamic>') {
        imports.push(`${TypeMapper.toSnakeCase(innerType)}.f.dart`);
      }
    }
  }
  
  // Handle nullable (unless already handled by oneOf/anyOf with null)
  const isOneOfNullable = (propSchema.oneOf || propSchema.anyOf) && dartType.endsWith('?');
  const nullable = !isRequired || propSchema.nullable === true || isOneOfNullable;
  // Only add ? if not already nullable and should be nullable
  if (nullable && !dartType.endsWith('?') && !isOneOfNullable) {
    dartType += '?';
  }
  
  return {
    name: dartName,
    type: dartType,
    required: isRequired,
    nullable,
    description: propSchema.description,
    defaultValue: propSchema.default,
    jsonKey: dartName !== propName ? propName : undefined
  };
}

/**
 * Generate Freezed model for object using template system
 */
function generateObjectModel(
  name: string,
  properties: Map<string, PropertyInfo>,
  imports: string[]
): string {
  // Create a TemplateManager instance to render the template
  const templateManager = new TemplateManager();
  
  // Convert PropertyInfo map to DartProperty array
  const dartProperties: DartProperty[] = Array.from(properties.values()).map(prop => ({
    name: prop.name,
    type: prop.type,
    required: prop.required,
    nullable: prop.nullable,
    description: prop.description,
    defaultValue: prop.defaultValue,
    jsonKey: prop.jsonKey
  }));
  
  const fileName = TypeMapper.toSnakeCase(name);
  const className = TypeMapper.toDartClassName(name);
  
  // Check for special imports
  const hasUint8List = dartProperties.some(p => p.type.includes('Uint8List'));
  
  // Prepare template data - matching what ModelGenerator.renderModel does
  const templateData = {
    className,
    fileName,
    description: undefined,
    hasUint8List,
    additionalImports: imports.filter(imp => 
      !imp.includes('dart:') && 
      !imp.includes('freezed') && 
      !imp.includes('json_annotation')
    ),
    properties: dartProperties.map(prop => ({
      name: prop.name,
      type: prop.type,
      required: prop.required && !prop.defaultValue,
      nullable: prop.nullable,
      description: prop.description,
      jsonKey: prop.jsonKey,
      defaultValue: formatDefaultValueForTemplate(prop.defaultValue, prop.type)
    }))
  };
  
  // Use TemplateManager to render the freezed-model template
  return templateManager.render('freezed-model', templateData);
}

/**
 * Format default value for template (matching ModelGenerator's formatDefaultValue)
 */
function formatDefaultValueForTemplate(value: any, type: string): string | null {
  if (value === undefined || value === null) {
    return null;
  }
  
  // Format based on type
  if (type === 'String' || type === 'String?') {
    return `'${value}'`;
  }
  
  if (type === 'int' || type === 'double' || 
      type === 'int?' || type === 'double?') {
    return String(value);
  }
  
  if (type === 'bool' || type === 'bool?') {
    return String(value);
  }
  
  if (type.startsWith('List')) {
    return 'const []';
  }
  
  if (type.startsWith('Map')) {
    return 'const {}';
  }
  
  return null;
}

/**
 * Get scalar type from schema
 */
function getScalarType(schema: any): string {
  switch (schema.type) {
    case 'string':
      if (schema.format === 'date-time') return 'DateTime';
      if (schema.format === 'date') return 'DateTime';
      if (schema.format === 'binary') return 'Uint8List';
      return 'String';
    case 'integer':
      return 'int';
    case 'number':
      return 'double';
    case 'boolean':
      return 'bool';
    case 'array':
      if (schema.items) {
        // Check if items have a $ref
        if (schema.items.$ref) {
          const typeName = TypeMapper.extractTypeFromRef(schema.items.$ref);
          return `List<${TypeMapper.toDartClassName(typeName)}>`;
        }
        const itemType = getScalarType(schema.items);
        return `List<${itemType}>`;
      }
      return 'List<dynamic>';
    case 'object':
      if (schema.additionalProperties) {
        const valueType = getScalarType(schema.additionalProperties);
        return `Map<String, ${valueType}>`;
      }
      // Check if description hints at a more specific type
      if (schema.description) {
        const descLower = schema.description.toLowerCase();
        
        // Check if description suggests it's a boolean (common API spec mistake)
        if (descLower.includes('if true') || descLower.includes('boolean') || 
            descLower.includes('true/false') || descLower.includes('true or false') ||
            descLower.includes('whether')) {
          return 'bool';
        }
        
        // Skip status field inference - too ambiguous
        
        // Check for job/primary job (likely a complex object, but check if there's a JobDto)
        if (descLower.includes('primary job') || descLower === 'primary job') {
          // TODO: Could check if JobResponseDto exists and use that
          return 'JobResponseDto';
        }
      }
      // Check example to infer type
      if (schema.example) {
        // If example is a string that looks like a time/date/ID, this shouldn't be a Map
        if (typeof schema.example === 'string') {
          // Check for time pattern (HH:mm:ss)
          if (/^\d{2}:\d{2}:\d{2}$/.test(schema.example)) {
            return 'String';
          }
          // Check for date/datetime pattern
          if (/^\d{4}-\d{2}-\d{2}/.test(schema.example)) {
            return 'DateTime';
          }
          // Check for UUID pattern
          if (/^[a-f0-9-]+$/.test(schema.example) && schema.example.includes('-')) {
            return 'String';
          }
          // General string
          return 'String';
        }
        // If example is a number
        if (typeof schema.example === 'number') {
          return Number.isInteger(schema.example) ? 'int' : 'double';
        }
      }
      return 'Map<String, dynamic>';
    default:
      return 'dynamic';
  }
}

/**
 * Format default value for Dart
 */
function formatDefaultValue(value: any, type: string): string {
  if (value === null) return 'null';
  if (typeof value === 'string') return `'${value}'`;
  if (typeof value === 'boolean') return value.toString();
  if (typeof value === 'number') return value.toString();
  if (Array.isArray(value)) return 'const []';
  if (typeof value === 'object') return 'const {}';
  return 'null';
}

// Helper functions

function extractTypeFromRef(ref: string): string {
  const parts = ref.split('/');
  return parts[parts.length - 1];
}

// TypeMapper helper not available, implementing locally
function extractInnerType(type: string): string {
  const match = type.match(/^(?:List|Map)<(.+)>$/);
  return match ? match[1] : type;
}

function isPrimitiveType(type: string): boolean {
  return ['String', 'int', 'double', 'bool', 'dynamic', 'DateTime', 'Uint8List'].includes(type) ||
         type === 'Map<String, dynamic>' || type.startsWith('Map<String, ');
}

function toSnakeCase(str: string): string {
  return str
    .replace(/([a-z])([A-Z])/g, '$1_$2')
    .replace(/([A-Z]+)([A-Z][a-z])/g, '$1_$2')
    .toLowerCase();
}

function toCamelCase(str: string): string {
  // Handle kebab-case and snake_case
  return str
    .replace(/[-_](.)/g, (_, char) => char.toUpperCase())
    .replace(/^(.)/, (_, char) => char.toLowerCase());
}

function toPascalCase(str: string): string {
  // Handle kebab-case and snake_case
  return str
    .replace(/[-_](.)/g, (_, char) => char.toUpperCase())
    .replace(/^(.)/, (_, char) => char.toUpperCase());
}