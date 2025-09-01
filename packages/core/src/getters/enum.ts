/**
 * Enum handling utilities - aligned with Orval structure
 * Extracts and processes enum data from OpenAPI schemas
 */

import { OpenAPIV3 } from 'openapi-types';

export interface EnumValue {
  name: string;
  value: string | number | null;
  description?: string;
}

export interface EnumData {
  name: string;
  values: EnumValue[];
  description?: string;
  isString?: boolean;
  isNumeric?: boolean;
}

/**
 * Check if a schema represents an enum
 */
export function isEnum(schema: OpenAPIV3.SchemaObject): boolean {
  return Boolean(schema.enum && Array.isArray(schema.enum) && schema.enum.length > 0);
}

/**
 * Extract enum values from schema
 */
export function getEnumValues(schema: OpenAPIV3.SchemaObject): (string | number | null)[] {
  if (!isEnum(schema)) {
    return [];
  }
  return schema.enum || [];
}

/**
 * Convert enum value to valid Dart identifier
 */
export function enumValueToDartName(value: string | number | null): string {
  // Handle null values
  if (value === null || value === 'null') {
    return 'nullValue';
  }
  
  // Handle empty string
  if (value === '') {
    return 'empty';
  }
  
  // Start with the original value
  let dartName = String(value);
  
  // Handle numeric-only values or values starting with numbers
  if (/^\d/.test(dartName)) {
    dartName = `value${dartName.charAt(0).toUpperCase() + dartName.slice(1)}`;
  }
  
  // Replace special characters with underscores
  dartName = dartName
    .replace(/[^a-zA-Z0-9_]/g, '_')  // Replace non-alphanumeric with underscore
    .replace(/_+/g, '_')              // Replace multiple underscores with single
    .replace(/^_+|_+$/g, '');         // Remove leading/trailing underscores
  
  // Convert to camelCase for Dart enum convention
  const parts = dartName.split('_');
  dartName = parts[0].toLowerCase() + parts.slice(1).map(p => 
    p.charAt(0).toUpperCase() + p.slice(1).toLowerCase()
  ).join('');
  
  // Ensure it doesn't start with uppercase
  if (dartName.charAt(0).match(/[A-Z]/)) {
    dartName = dartName.charAt(0).toLowerCase() + dartName.slice(1);
  }
  
  return dartName;
}

/**
 * Process enum schema into structured data
 */
export function getEnumData(
  name: string,
  schema: OpenAPIV3.SchemaObject
): EnumData | null {
  if (!isEnum(schema)) {
    return null;
  }
  
  const rawValues = getEnumValues(schema);
  const values: EnumValue[] = rawValues.map(value => ({
    name: enumValueToDartName(value),
    value: value,
    description: undefined // Could be extended with x-enum-descriptions
  }));
  
  // Determine enum type
  const isString = rawValues.every(v => typeof v === 'string' || v === null);
  const isNumeric = rawValues.every(v => typeof v === 'number' || v === null);
  
  return {
    name,
    values,
    description: schema.description,
    isString,
    isNumeric
  };
}

/**
 * Get enum descriptions from x-enum-descriptions extension
 */
export function getEnumDescriptions(schema: OpenAPIV3.SchemaObject): Record<string, string> {
  const descriptions: Record<string, string> = {};
  
  // Check for x-enum-descriptions extension
  if (schema['x-enum-descriptions']) {
    const enumDescriptions = schema['x-enum-descriptions'] as Record<string, string>;
    Object.entries(enumDescriptions).forEach(([key, desc]) => {
      descriptions[key] = desc;
    });
  }
  
  // Check for x-enumNames (alternative format)
  if (schema['x-enumNames'] && Array.isArray(schema['x-enumNames'])) {
    const enumValues = getEnumValues(schema);
    const enumNames = schema['x-enumNames'] as string[];
    enumValues.forEach((value, index) => {
      if (enumNames[index]) {
        descriptions[String(value)] = enumNames[index];
      }
    });
  }
  
  return descriptions;
}

/**
 * Generate Dart enum implementation
 */
export function getEnumImplementation(data: EnumData): string {
  // This returns the Dart code structure, not the actual template rendering
  // Template rendering should be done by the generator
  const enumValues = data.values.map(v => ({
    name: v.name,
    value: v.value,
    jsonValue: JSON.stringify(v.value)
  }));
  
  return JSON.stringify({
    enumName: data.name,
    description: data.description,
    values: enumValues
  });
}

/**
 * Check if a schema is a nullable enum
 */
export function isNullableEnum(schema: OpenAPIV3.SchemaObject): boolean {
  return isEnum(schema) && (
    schema.nullable === true ||
    (schema.enum && schema.enum.includes(null))
  );
}