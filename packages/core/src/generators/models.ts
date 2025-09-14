/**
 * Generate Dart model files using Freezed
 */

import { OpenAPIObject } from '../types';
import { DartGeneratorOptions, GeneratedFile } from '../types';
import { ModelGenerator } from './model-generator';
import { OpenAPIParser } from '../parser/openapi-parser';
import { ReferenceResolver } from '../resolvers';
import { combineSchemas } from '../getters/combine';
import { getObject } from '../getters/object';
import { hasComposition, hasDiscriminatedUnion, isEnum, isEmpty } from '../utils/assertion';
import { TypeMapper } from '../utils';

// Helper functions
// Use TypeMapper.toSnakeCase for consistent V2Meta/V2Dto handling
const toSnakeCase = (str: string): string => TypeMapper.toSnakeCase(str);

function extractDiscriminatorInfo(schema: any): any {
  if (!schema.properties) return null;

  let discriminatorProperty: string | undefined;
  let unionProperty: string | undefined;
  let discriminatorValues: string[] | undefined;
  let unionSchemas: any[] | undefined;
  let compositionType: 'oneOf' | 'anyOf' = 'oneOf';

  for (const [propName, propSchema] of Object.entries(schema.properties)) {
    const prop = propSchema as any;
    
    if (prop.enum && Array.isArray(prop.enum)) {
      discriminatorProperty = propName;
      discriminatorValues = prop.enum;
    }
    
    if (prop.oneOf) {
      unionProperty = propName;
      unionSchemas = prop.oneOf;
      compositionType = 'oneOf';
    } else if (prop.anyOf) {
      unionProperty = propName;
      unionSchemas = prop.anyOf;
      compositionType = 'anyOf';
    }
  }

  if (discriminatorProperty && unionProperty && unionSchemas) {
    return {
      propertyName: discriminatorProperty,
      discriminatorProperty,
      values: discriminatorValues,
      unionSchemas,
      compositionType
    };
  }

  return null;
}


/**
 * Extract and generate nested classes for inline object properties
 */
function extractInlineObjects(
  parentName: string,
  schema: any,
  schemas: Record<string, any>,
  files: GeneratedFile[],
  refResolver: ReferenceResolver,
  processedTypes: Set<string> = new Set()
): Map<string, string> {
  const inlineTypes = new Map<string, string>();
  
  if (!schema.properties || processedTypes.has(parentName)) return inlineTypes;
  processedTypes.add(parentName);
  
  Object.entries(schema.properties).forEach(([propName, propSchema]: [string, any]) => {
    // Check if this is an inline object (has properties but no $ref)
    if (propSchema.type === 'object' && propSchema.properties && !propSchema.$ref) {
      // Generate a name for the nested type
      const nestedTypeName = `${parentName}${propName.charAt(0).toUpperCase()}${propName.slice(1)}`;
      
      // Add to schemas so it gets processed
      schemas[nestedTypeName] = propSchema;
      
      // Map the property name to the nested type name
      inlineTypes.set(propName, nestedTypeName);
      
      // Recursively extract nested inline objects
      extractInlineObjects(nestedTypeName, propSchema, schemas, files, refResolver, processedTypes);
    }
  });
  
  return inlineTypes;
}

/**
 * Extract and generate enum types for inline enum properties
 */
function extractInlineEnums(
  parentName: string,
  schema: any,
  schemas: Record<string, any>,
  processedEnums: Set<string> = new Set()
): Map<string, string> {
  const inlineEnums = new Map<string, string>();
  
  if (processedEnums.has(parentName)) return inlineEnums;
  processedEnums.add(parentName);
  
  // Handle allOf composition
  if (schema.allOf && Array.isArray(schema.allOf)) {
    schema.allOf.forEach((subSchema: any) => {
      if (subSchema.properties) {
        Object.entries(subSchema.properties).forEach(([propName, propSchema]: [string, any]) => {
          // Check if this is an inline enum (has enum array but no $ref)
          if (propSchema.enum && Array.isArray(propSchema.enum) && !propSchema.$ref) {
            // Generate a name for the enum type
            const enumTypeName = `${parentName}${propName.charAt(0).toUpperCase()}${propName.slice(1)}Enum`;
            
            // Add to schemas as an enum schema
            schemas[enumTypeName] = {
              type: 'string',
              enum: propSchema.enum,
              description: propSchema.description || `Enum for ${propName}`
            };
            
            // Map the property name to the enum type name
            inlineEnums.set(propName, enumTypeName);
          }
        });
      }
    });
  }
  
  // Handle direct properties
  if (schema.properties) {
    Object.entries(schema.properties).forEach(([propName, propSchema]: [string, any]) => {
      // Check if this is an inline enum (has enum array but no $ref)
      if (propSchema.enum && Array.isArray(propSchema.enum) && !propSchema.$ref) {
        // Generate a name for the enum type
        const enumTypeName = `${parentName}${propName.charAt(0).toUpperCase()}${propName.slice(1)}Enum`;
        
        // Add to schemas as an enum schema
        schemas[enumTypeName] = {
          type: 'string',
          enum: propSchema.enum,
          description: propSchema.description || `Enum for ${propName}`
        };
        
        // Map the property name to the enum type name
        inlineEnums.set(propName, enumTypeName);
      }
    });
  }
  
  return inlineEnums;
}

export async function generateModels(
  spec: OpenAPIObject,
  _options: DartGeneratorOptions
): Promise<GeneratedFile[]> {
  const files: GeneratedFile[] = [];
  const generator = new ModelGenerator();
  
  // Parse spec to get schemas - don't dereference yet to preserve $refs
  const parser = new OpenAPIParser();
  await parser.parseWithoutDereference(spec);
  const schemas = parser.getSchemas();
  
  // Create ReferenceResolver with the full spec
  const refResolver = new ReferenceResolver(spec);
  generator.setReferenceResolver(refResolver);
  
  // First pass: extract inline objects and enums and add them as schemas
  const inlineObjectMappings = new Map<string, Map<string, string>>();
  const inlineEnumMappings = new Map<string, Map<string, string>>();
  const schemasToProcess = [...Object.entries(schemas)];
  const processedSchemas = new Set<string>();
  const processedEnums = new Set<string>();
  
  // Keep processing until no new schemas are added
  while (schemasToProcess.length > 0) {
    const [name, schema] = schemasToProcess.shift()!;
    if (processedSchemas.has(name)) continue;
    processedSchemas.add(name);
    
    // Extract inline objects
    const inlineTypes = extractInlineObjects(name, schema, schemas, files, refResolver);
    if (inlineTypes.size > 0) {
      inlineObjectMappings.set(name, inlineTypes);
      // Add newly created schemas to the processing queue
      inlineTypes.forEach((typeName) => {
        if (schemas[typeName] && !processedSchemas.has(typeName)) {
          schemasToProcess.push([typeName, schemas[typeName]]);
        }
      });
    }
    
    // Extract inline enums
    const inlineEnums = extractInlineEnums(name, schema, schemas, processedEnums);
    if (inlineEnums.size > 0) {
      inlineEnumMappings.set(name, inlineEnums);
      // Add newly created enum schemas to the processing queue
      inlineEnums.forEach((enumName) => {
        if (schemas[enumName] && !processedSchemas.has(enumName)) {
          schemasToProcess.push([enumName, schemas[enumName]]);
        }
      });
    }
  }
  
  // Generate model for each schema
  Object.entries(schemas).forEach(([name, schema]) => {
    // Skip empty schemas - check if schema has no properties and no type
    if (isEmpty(schema) || (schema.type === 'object' && (!schema.properties || Object.keys(schema.properties).length === 0) && !schema.allOf && !schema.oneOf && !schema.anyOf)) {
      console.log(`Skipping empty model: ${name}`);
      return;
    }
    

    // Check if it's an enum
    if (isEnum(schema)) {
      const enumFile = generator.generateEnum(
        name,
        schema.enum as string[],
        schema.description
      );
      files.push(enumFile);
      return;
    }

    // Skip root-level array types
    if (schema.type === 'array') {
      // These should be handled as List<Model> in the usage context
      return;
    }

    // Check for discriminated union pattern (property with enum + property with oneOf/anyOf)
    if (hasDiscriminatedUnion(schema)) {
      // Extract discriminator info
      const discriminatorInfo = extractDiscriminatorInfo(schema);
      if (discriminatorInfo) {
        const result = combineSchemas(
          { [discriminatorInfo.compositionType]: discriminatorInfo.unionSchemas },
          name,
          discriminatorInfo.compositionType,
          { discriminator: discriminatorInfo }
        );
        
        if (result.definition) {
          files.push({
            path: `models/${toSnakeCase(name)}.f.dart`,
            content: result.definition
          });
          return;
        }
      }
    }

    // Check for top-level composition (oneOf/anyOf/allOf)
    if (hasComposition(schema)) {
      const compositionType = schema.allOf ? 'allOf' : schema.oneOf ? 'oneOf' : 'anyOf';
      const result = combineSchemas(schema, name, compositionType, { schemas, refResolver });
      
      if (result.definition) {
        files.push({
          path: `models/${toSnakeCase(name)}.f.dart`,
          content: result.definition
        });
        return;
      }
    }

    // Handle regular object schemas
    const inlineTypes = inlineObjectMappings.get(name);
    const inlineEnums = inlineEnumMappings.get(name);
    const objectResult = getObject(schema, name, { schemas, refResolver, inlineTypes, inlineEnums });
    if (objectResult.definition) {
      files.push({
        path: `models/${toSnakeCase(name)}.f.dart`,
        content: objectResult.definition
      });
    }
  });
  
  // Generate index file that exports all models
  const indexContent = generateIndexFile(files);
  files.push({
    path: 'models/index.dart',
    content: indexContent
  });
  
  return files;
}

/**
 * Generate index file that exports all models
 */
function generateIndexFile(files: GeneratedFile[]): string {
  const exports = files
    .filter(f => f.path !== 'models/index.dart')
    .map(f => {
      const fileName = f.path.replace('models/', '').replace('enums/', '').replace('.dart', '');
      return `export '${fileName}.dart';`;
    })
    .join('\n');

  // Always try to export params/index.dart and headers/index.dart
  // The actual Dart files will only exist if params/headers were generated
  // Dart will handle the missing imports at compile time
  let indexContent = `// Generated index file for models
${exports}`;

  // For now, we don't export params and headers since they're generated separately
  // and we can't know at this point if they'll exist
  // This will be fixed in a future version with better orchestration

  return indexContent + '\n';
}