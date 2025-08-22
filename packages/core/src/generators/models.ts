/**
 * Generate Dart model files using Freezed
 */

import type { OpenAPIV3 } from 'openapi-types';
import { OpenAPIObject } from '../types';
import { DartGeneratorOptions, GeneratedFile } from '../types';
import { ModelGenerator } from './model-generator';
import { OpenAPIParser } from '../parser/openapi-parser';
import { RefResolver } from '../utils/ref-resolver';

export async function generateModels(
  spec: OpenAPIObject,
  options: DartGeneratorOptions
): Promise<GeneratedFile[]> {
  const files: GeneratedFile[] = [];
  const generator = new ModelGenerator();
  
  // Parse spec to get schemas - don't dereference yet to preserve $refs
  const parser = new OpenAPIParser();
  await parser.parseWithoutDereference(spec);
  const schemas = parser.getSchemas();
  
  // Create RefResolver with all schemas
  const refResolver = new RefResolver(schemas);
  generator.setRefResolver(refResolver);
  
  // Generate model for each schema
  Object.entries(schemas).forEach(([name, schema]) => {
    // Check if it's an enum
    if (schema.enum && Array.isArray(schema.enum)) {
      const enumFile = generator.generateEnum(
        name,
        schema.enum as string[],
        schema.description
      );
      files.push(enumFile);
    } else if (schema.type === 'array') {
      // Skip root-level array types for now
      // These should be handled as List<Model> in the usage context
      return;
    } else {
      // Check if the schema has any properties
      const hasProperties = schema.properties && Object.keys(schema.properties).length > 0;
      const hasAllOf = schema.allOf && schema.allOf.length > 0;
      const hasOneOf = schema.oneOf && schema.oneOf.length > 0;
      const hasAnyOf = schema.anyOf && schema.anyOf.length > 0;
      
      // Skip empty models that have no properties or composition
      if (!hasProperties && !hasAllOf && !hasOneOf && !hasAnyOf) {
        console.log(`Skipping empty model: ${name}`);
        return;
      }
      
      // Generate regular model
      const modelFile = generator.generateModel(name, schema);
      files.push(modelFile);
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
`;
}