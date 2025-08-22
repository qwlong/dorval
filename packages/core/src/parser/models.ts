/**
 * Extract and parse model definitions from OpenAPI spec
 */

import type { OpenAPIV3 } from 'openapi-types';
import { OpenAPIObject } from '../types';
import { DartModel } from '../types';

export function extractModels(spec: OpenAPIObject): DartModel[] {
  const models: DartModel[] = [];
  
  // Extract from components.schemas
  if (spec.components?.schemas) {
    Object.entries(spec.components.schemas).forEach(([name, schema]) => {
      const model = schemaToModel(name, schema as OpenAPIV3.SchemaObject);
      if (model) {
        models.push(model);
      }
    });
  }
  
  return models;
}

function schemaToModel(name: string, schema: OpenAPIV3.SchemaObject): DartModel | null {
  // TODO: Implement schema to Dart model conversion
  return {
    name,
    properties: [],
    imports: [],
    description: schema.description
  };
}