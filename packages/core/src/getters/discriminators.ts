/**
 * Discriminator handling for polymorphic schemas - aligned with Orval structure
 * Handles OpenAPI discriminator objects for oneOf/anyOf schemas
 */

import { OpenAPIV3 } from 'openapi-types';

export interface DiscriminatorInfo {
  propertyName: string;
  mapping?: Record<string, string>;
  implicitMappings?: Record<string, string>;
}

export interface DiscriminatedUnion {
  discriminator: DiscriminatorInfo;
  schemas: Array<{
    name: string;
    discriminatorValue: string;
    schema: OpenAPIV3.SchemaObject | OpenAPIV3.ReferenceObject;
  }>;
}

/**
 * Extract discriminator from schema
 */
export function getDiscriminator(
  schema: OpenAPIV3.SchemaObject
): DiscriminatorInfo | null {
  if (!schema.discriminator) {
    return null;
  }
  
  const disc = schema.discriminator;
  
  return {
    propertyName: disc.propertyName,
    mapping: disc.mapping,
    implicitMappings: {}
  };
}

/**
 * Check if schema has discriminator
 */
export function hasDiscriminator(schema: OpenAPIV3.SchemaObject): boolean {
  return Boolean(schema.discriminator?.propertyName);
}

/**
 * Build discriminated union data
 */
export function getDiscriminatedUnion(
  schema: OpenAPIV3.SchemaObject,
  name: string
): DiscriminatedUnion | null {
  const discriminator = getDiscriminator(schema);
  if (!discriminator) {
    return null;
  }
  
  // Get the union schemas (oneOf or anyOf)
  const unionSchemas = schema.oneOf || schema.anyOf || [];
  if (unionSchemas.length === 0) {
    return null;
  }
  
  const schemas = unionSchemas.map((subSchema, index) => {
    // Determine discriminator value
    let discriminatorValue: string;
    let schemaName: string;
    
    if (discriminator.mapping) {
      // Use explicit mapping if available
      const mappingEntry = Object.entries(discriminator.mapping).find(
        ([_, ref]) => {
          if ('$ref' in subSchema) {
            return ref === subSchema.$ref;
          }
          return false;
        }
      );
      
      if (mappingEntry) {
        discriminatorValue = mappingEntry[0];
        schemaName = getNameFromRef(mappingEntry[1]);
      } else {
        // Fallback to index-based naming
        discriminatorValue = `type${index}`;
        schemaName = `${name}Type${index}`;
      }
    } else {
      // Use implicit mapping based on schema name
      if ('$ref' in subSchema) {
        schemaName = getNameFromRef(subSchema.$ref);
        discriminatorValue = schemaName;
      } else {
        discriminatorValue = `type${index}`;
        schemaName = `${name}Type${index}`;
      }
    }
    
    return {
      name: schemaName,
      discriminatorValue,
      schema: subSchema
    };
  });
  
  return {
    discriminator,
    schemas
  };
}

/**
 * Extract name from $ref
 */
function getNameFromRef(ref: string): string {
  const parts = ref.split('/');
  return parts[parts.length - 1];
}

/**
 * Generate Dart sealed class for discriminated union
 */
export function generateDiscriminatedUnionType(
  union: DiscriminatedUnion,
  className: string
): string {
  // This returns metadata for the template, not actual Dart code
  // The actual rendering should be done by the generator using templates
  
  const subclasses = union.schemas.map(schema => ({
    name: schema.name,
    discriminatorValue: schema.discriminatorValue,
    discriminatorProperty: union.discriminator.propertyName
  }));
  
  return JSON.stringify({
    className,
    discriminatorProperty: union.discriminator.propertyName,
    subclasses,
    isSealed: true
  });
}

/**
 * Check if a schema represents a discriminated union
 */
export function isDiscriminatedUnion(schema: OpenAPIV3.SchemaObject): boolean {
  return hasDiscriminator(schema) && Boolean(schema.oneOf || schema.anyOf);
}

/**
 * Get discriminator value for a specific schema
 */
export function getDiscriminatorValue(
  schema: OpenAPIV3.SchemaObject,
  discriminatorProperty: string
): string | undefined {
  // Check if schema has a const value for the discriminator property
  if (schema.properties?.[discriminatorProperty]) {
    const prop = schema.properties[discriminatorProperty];
    if (typeof prop === 'object' && 'const' in prop) {
      return String(prop.const);
    }
    if (typeof prop === 'object' && 'enum' in prop && prop.enum?.length === 1) {
      return String(prop.enum[0]);
    }
  }
  
  // Check in required properties with default values
  if (schema.required?.includes(discriminatorProperty)) {
    const prop = schema.properties?.[discriminatorProperty];
    if (typeof prop === 'object' && 'default' in prop) {
      return String(prop.default);
    }
  }
  
  return undefined;
}

/**
 * Validate discriminator configuration
 */
export function validateDiscriminator(
  union: DiscriminatedUnion
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  // Check for duplicate discriminator values
  const values = new Set<string>();
  for (const schema of union.schemas) {
    if (values.has(schema.discriminatorValue)) {
      errors.push(`Duplicate discriminator value: ${schema.discriminatorValue}`);
    }
    values.add(schema.discriminatorValue);
  }
  
  // Check that discriminator property exists in schemas
  // This would require resolving $refs, so we skip for now
  
  return {
    valid: errors.length === 0,
    errors
  };
}