/**
 * Handles schema composition (allOf, oneOf, anyOf) - aligned with Orval structure
 * This file mirrors orval/packages/core/src/getters/combine.ts
 */

import { OpenAPIV3 } from 'openapi-types';

// Separator type matching Orval
type Separator = 'allOf' | 'anyOf' | 'oneOf';

export interface CombineOptions {
  separator: Separator;
  discriminatorProperty?: string;
  discriminatorValues?: string[];
  nullable?: boolean;
}

export interface CombineResult {
  type: string;
  imports: string[];
  isSealed?: boolean;
  definition?: string;
}

/**
 * Main function to combine schemas - mirrors Orval's combineSchemas
 */
export function combineSchemas(
  schema: any,
  name: string,
  separator: Separator,
  context?: any
): CombineResult {
  // Get the schemas to combine
  const schemas = schema[separator];
  if (!schemas || !Array.isArray(schemas)) {
    return {
      type: 'dynamic',
      imports: []
    };
  }

  // Check for nullable pattern (oneOf/anyOf with null)
  if (isNullablePattern(separator, schemas)) {
    return handleNullablePattern(schemas);
  }

  // Check for discriminator - prefer context discriminator over schema discriminator
  const discriminator = context?.discriminator || extractDiscriminator(schema);
  
  // Handle based on separator type
  switch (separator) {
    case 'allOf':
      return combineAllOf(name, schemas, context);
    case 'oneOf':
      return combineOneOf(name, schemas, discriminator, context);
    case 'anyOf':
      return combineAnyOf(name, schemas, discriminator, context);
    default:
      return {
        type: 'dynamic',
        imports: []
      };
  }
}

/**
 * Combine allOf schemas - intersection type behavior
 */
function combineAllOf(
  name: string,
  schemas: any[],
  context?: any
): CombineResult {
  const imports: string[] = [];
  const properties = new Map<string, any>();
  const required = new Set<string>();
  
  // Merge all properties from all schemas
  schemas.forEach(schema => {
    if (schema.$ref) {
      const typeName = extractTypeFromRef(schema.$ref);
      imports.push(`${toSnakeCase(typeName)}.f.dart`);
      
      // Resolve ref to get properties if we have context with schemas
      if (context?.schemas && context.schemas[typeName]) {
        const referencedSchema = context.schemas[typeName];
        if (referencedSchema.properties) {
          Object.entries(referencedSchema.properties).forEach(([key, value]) => {
            properties.set(key, value);
          });
        }
        if (referencedSchema.required) {
          referencedSchema.required.forEach((req: string) => required.add(req));
        }
      }
    } else if (schema.properties) {
      Object.entries(schema.properties).forEach(([key, value]) => {
        properties.set(key, value);
      });
      if (schema.required) {
        schema.required.forEach((req: string) => required.add(req));
      }
    }
  });

  // Generate Freezed class with all combined properties
  const definition = generateFreezedClass(name, properties, required, imports);
  
  return {
    type: name,
    imports,
    definition
  };
}

/**
 * Combine oneOf schemas - union type with exactly one match
 */
function combineOneOf(
  name: string,
  schemas: any[],
  discriminator?: any,
  context?: any
): CombineResult {
  const imports: string[] = [];
  
  // If we have a discriminator, generate sealed class
  if (discriminator) {
    return generateSealedClass(name, schemas, discriminator, imports);
  }
  
  // Without discriminator, generate wrapper
  return generateUnionWrapper(name, schemas, imports);
}

/**
 * Combine anyOf schemas - union type with multiple possible matches
 */
function combineAnyOf(
  name: string,
  schemas: any[],
  discriminator?: any,
  context?: any
): CombineResult {
  // Similar to oneOf but allows multiple matches
  // For Dart, we handle this similarly with sealed classes
  return combineOneOf(name, schemas, discriminator, context);
}

/**
 * Check if this is a nullable pattern
 */
function isNullablePattern(separator: Separator, schemas: any[]): boolean {
  if ((separator === 'oneOf' || separator === 'anyOf') && schemas.length === 2) {
    const hasNull = schemas.some(s => s.type === 'null');
    const hasNonNull = schemas.some(s => s.type !== 'null');
    return hasNull && hasNonNull;
  }
  return false;
}

/**
 * Handle nullable pattern - returns nullable type
 */
function handleNullablePattern(schemas: any[]): CombineResult {
  const nonNullSchema = schemas.find(s => s.type !== 'null');
  if (!nonNullSchema) {
    return { type: 'dynamic', imports: [] };
  }
  
  const baseType = extractType(nonNullSchema);
  const imports: string[] = [];
  
  if (!isPrimitiveType(baseType)) {
    imports.push(`${toSnakeCase(baseType)}.dart`);
  }
  
  return {
    type: `${baseType}?`,
    imports
  };
}

/**
 * Extract discriminator from schema
 */
function extractDiscriminator(schema: any): any {
  if (schema.discriminator) {
    if (typeof schema.discriminator === 'string') {
      return { propertyName: schema.discriminator };
    }
    return schema.discriminator;
  }
  
  // Check for discriminated union pattern in properties
  if (schema.properties) {
    for (const [propName, propSchema] of Object.entries(schema.properties)) {
      const prop = propSchema as any;
      if (prop.enum && Array.isArray(prop.enum)) {
        // This might be a discriminator
        for (const [otherPropName, otherPropSchema] of Object.entries(schema.properties)) {
          const otherProp = otherPropSchema as any;
          if (otherProp.oneOf || otherProp.anyOf) {
            const unionSchemas = otherProp.oneOf || otherProp.anyOf;
            
            // Only consider it a discriminated union if:
            // 1. There are multiple schemas in the union
            // 2. Or there's a single schema that is a reference (not a primitive type)
            if (unionSchemas.length > 1 || 
                (unionSchemas.length === 1 && unionSchemas[0].$ref)) {
              return {
                propertyName: propName,
                values: prop.enum,
                unionProperty: otherPropName,
                unionSchemas: unionSchemas
              };
            }
          }
        }
      }
    }
  }
  
  return null;
}

/**
 * Generate sealed class for discriminated union
 */
function generateSealedClass(
  name: string,
  schemas: any[],
  discriminator: any,
  imports: string[]
): CombineResult {
  const unions: string[] = [];
  const discriminatorProperty = discriminator.propertyName || discriminator.discriminatorProperty || 'itemType';
  const discriminatorValues = discriminator.values || ['shift', 'time_off_request'];
  const unionProperty = discriminator.unionProperty || 'item';
  
  // Handle schemas from discriminated union pattern
  const unionSchemas = discriminator.unionSchemas || schemas;
  
  // Generate proper Freezed union types with discriminator pattern
  unionSchemas.forEach((schema: any, index: number) => {
    const typeName = extractType(schema);
    if (typeName && typeName !== 'dynamic') {
      // Handle List types - extract the inner type for imports
      if (typeName.startsWith('List<')) {
        const innerType = typeName.match(/List<(.+)>/)?.[1];
        if (innerType && !isPrimitiveType(innerType) && innerType !== 'Map<String, dynamic>') {
          imports.push(`${toSnakeCase(innerType)}.f.dart`);
        }
      } else if (!isPrimitiveType(typeName)) {
        imports.push(`${toSnakeCase(typeName)}.f.dart`);
      }
      
      const discriminatorValue = discriminatorValues?.[index] || 
                                 getDiscriminatorValue(schema, discriminatorProperty, index);
      const factoryName = toCamelCase(discriminatorValue);
      
      // Generate factory constructor
      unions.push(`  const factory ${name}.${factoryName}({
    @Default('${discriminatorValue}') String ${discriminatorProperty},

    required ${typeName} ${unionProperty},

  }) = _${name}${toPascalCase(factoryName)};`);
    }
  });

  const fileName = toSnakeCase(name);
  
  // Generate custom fromJson method for discriminator-based deserialization
  const fromJsonCases = unionSchemas.map((schema: any, index: number) => {
    const typeName = extractType(schema);
    const discriminatorValue = discriminatorValues?.[index] || 
                               getDiscriminatorValue(schema, discriminatorProperty, index);
    const factoryName = toCamelCase(discriminatorValue);
    
    // Handle array types differently
    const fromJsonCall = typeName.startsWith('List<') 
      ? `(json['${unionProperty}'] as List).map((e) => ${typeName.replace('List<', '').replace('>', '')}.fromJson(e as Map<String, dynamic>)).toList()`
      : `${typeName}.fromJson(json['${unionProperty}'] as Map<String, dynamic>)`;
    
    return `      case '${discriminatorValue}':
        return ${name}.${factoryName}(
          ${unionProperty}: ${fromJsonCall},
        );`;
  }).join('\n');
  
  // Remove duplicates from imports
  const uniqueImports = [...new Set(imports.filter(imp => imp))];
  
  const definition = `import 'package:freezed_annotation/freezed_annotation.dart';
${uniqueImports.map(imp => `import '${imp}';`).join('\n')}

part '${fileName}.f.freezed.dart';
part '${fileName}.f.g.dart';

@freezed
class ${name} with _\$${name} {
  const ${name}._();
  
${unions.join('\n\n')}

  factory ${name}.fromJson(Map<String, dynamic> json) =>
      _\$${name}FromJson(json);
}
`;

  return {
    type: name,
    imports,
    isSealed: true,
    definition
  };
}

/**
 * Generate union wrapper for non-discriminated unions
 */
function generateUnionWrapper(
  name: string,
  schemas: any[],
  imports: string[]
): CombineResult {
  const types: string[] = [];
  
  schemas.forEach(schema => {
    const typeName = extractType(schema);
    if (typeName && typeName !== 'dynamic') {
      types.push(typeName);
      if (!isPrimitiveType(typeName)) {
        imports.push(`${toSnakeCase(typeName)}.f.dart`);
      }
    }
  });

  const fileName = toSnakeCase(name);
  // Remove duplicates from imports
  const uniqueImports = [...new Set(imports.filter(imp => imp))];
  
  const definition = `import 'package:freezed_annotation/freezed_annotation.dart';
${uniqueImports.map(imp => `import '${imp}';`).join('\n')}

part '${fileName}.f.freezed.dart';
part '${fileName}.f.g.dart';

@freezed
class ${name} with _\$${name} {
  const ${name}._();
  
  const factory ${name}({
    required dynamic value, // Can be: ${types.join(', ')}

  }) = _${name};

  factory ${name}.fromJson(Map<String, dynamic> json) {
    // Try to parse as each type
${generateTryParsing(types)}
    
    throw Exception('Could not parse ${name} from JSON');
  }
  
  // Type-safe getters
${generateTypeGetters(types)}
}
`;

  return {
    type: name,
    imports,
    definition
  };
}

/**
 * Generate Freezed class definition
 */
function generateFreezedClass(
  name: string,
  properties: Map<string, any>,
  required: Set<string>,
  imports: string[]
): string {
  const fileName = toSnakeCase(name);
  const propertyLines: string[] = [];
  
  properties.forEach((propSchema, propName) => {
    const dartName = toCamelCase(propName);
    const dartType = extractType(propSchema);
    const isRequired = required.has(propName);
    const nullable = !isRequired || propSchema.nullable;
    
    let line = `    `;
    if (dartName !== propName) {
      line += `@JsonKey(name: '${propName}') `;
    }
    line += `${isRequired ? 'required ' : ''}`;
    line += `${dartType}${nullable && !dartType.endsWith('?') ? '?' : ''} ${dartName},`;
    
    propertyLines.push(line);
  });

  // Remove duplicates from imports
  const uniqueImports = [...new Set(imports.filter(imp => imp))];

  return `import 'package:freezed_annotation/freezed_annotation.dart';
${uniqueImports.map(imp => `import '${imp}';`).join('\n')}

part '${fileName}.f.freezed.dart';
part '${fileName}.f.g.dart';

@freezed
class ${name} with _\$${name} {
  const factory ${name}({
${propertyLines.join('\n\n')}

  }) = _${name};

  factory ${name}.fromJson(Map<String, dynamic> json) =>
      _\$${name}FromJson(json);
}
`;
}

// Helper functions

function extractType(schema: any): string {
  if (schema.$ref) {
    return extractTypeFromRef(schema.$ref);
  }
  
  switch (schema.type) {
    case 'string':
      return schema.format === 'date-time' ? 'DateTime' : 'String';
    case 'integer':
      return 'int';
    case 'number':
      return 'double';
    case 'boolean':
      return 'bool';
    case 'array':
      return schema.items ? `List<${extractType(schema.items)}>` : 'List<dynamic>';
    case 'object':
      return 'Map<String, dynamic>';
    default:
      return 'dynamic';
  }
}

function extractTypeFromRef(ref: string): string {
  const parts = ref.split('/');
  return parts[parts.length - 1];
}

function isPrimitiveType(type: string): boolean {
  return ['String', 'int', 'double', 'bool', 'dynamic', 'DateTime'].includes(type) ||
         type.startsWith('List') || type.startsWith('Map');
}

function toSnakeCase(str: string): string {
  return str
    .replace(/([a-z])([A-Z])/g, '$1_$2')
    .replace(/([A-Z]+)([A-Z][a-z])/g, '$1_$2')
    .toLowerCase();
}

function toCamelCase(str: string): string {
  if (str.includes('_')) {
    const parts = str.split('_');
    return parts[0] + parts.slice(1).map(p => 
      p.charAt(0).toUpperCase() + p.slice(1)
    ).join('');
  }
  return str.charAt(0).toLowerCase() + str.slice(1);
}

function toPascalCase(str: string): string {
  if (str.includes('_')) {
    return str.split('_').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join('');
  }
  return str.charAt(0).toUpperCase() + str.slice(1);
}

function getDiscriminatorValue(schema: any, discriminatorProperty: string, index: number): string {
  if (schema.properties && schema.properties[discriminatorProperty]) {
    const prop = schema.properties[discriminatorProperty];
    if (prop.const) return prop.const;
    if (prop.enum && prop.enum.length > 0) return prop.enum[0];
  }
  
  const typeName = extractType(schema);
  return typeName ? toSnakeCase(typeName) : `type_${index}`;
}

function generateTryParsing(types: string[]): string {
  return types.map(type => `    try {
      return ${type}.fromJson(json);
    } catch (_) {}`).join('\n');
}

function generateTypeGetters(types: string[]): string {
  return types.map(type => {
    const getterName = toCamelCase(type);
    return `  ${type}? get as${type} => value is ${type} ? value as ${type} : null;`;
  }).join('\n');
}