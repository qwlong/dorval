/**
 * Generate Dart model files using Freezed
 */

import { OpenAPIObject } from '../types';
import { DartGeneratorOptions, GeneratedFile } from '../types';
import { ModelGenerator } from './model-generator';
import { OpenAPIParser } from '../parser/openapi-parser';
import { ReferenceResolver } from '../resolvers/reference-resolver';
import { combineSchemas } from '../getters/combine';
import { getObject } from '../getters/object';
import { hasComposition, hasDiscriminatedUnion, isEnum, isEmpty } from '../utils/assertion';
import { TypeMapper } from '../utils/type-mapper';

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
  
  // First pass: extract inline objects and add them as schemas
  const inlineObjectMappings = new Map<string, Map<string, string>>();
  const schemasToProcess = [...Object.entries(schemas)];
  const processedSchemas = new Set<string>();
  
  // Keep processing until no new schemas are added
  while (schemasToProcess.length > 0) {
    const [name, schema] = schemasToProcess.shift()!;
    if (processedSchemas.has(name)) continue;
    processedSchemas.add(name);
    
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
    const objectResult = getObject(schema, name, { schemas, refResolver, inlineTypes });
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
  
  return `// Generated index file for models
${exports}

// Export params and headers if they exist
export 'params/index.dart';
export 'headers/index.dart';
`;
}