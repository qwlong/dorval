/**
 * OpenAPI specification parser
 * Converts OpenAPI/Swagger specs to internal representation
 */

import SwaggerParser from '@apidevtools/swagger-parser';
import { OpenAPIObject } from '../types';
import * as fs from 'fs-extra';
import * as path from 'path';

export async function parseOpenAPISpec(input: string | OpenAPIObject): Promise<OpenAPIObject> {
  if (typeof input === 'string') {
    // Check if it's a file path
    if (fs.existsSync(input)) {
      // Read the file directly to preserve $refs
      const ext = path.extname(input).toLowerCase();
      if (ext === '.json') {
        const content = await fs.readFile(input, 'utf-8');
        return JSON.parse(content) as OpenAPIObject;
      } else if (ext === '.yaml' || ext === '.yml') {
        // For YAML files, we need to use SwaggerParser but only for parsing, not validation
        const api = await SwaggerParser.parse(input);
        return api as OpenAPIObject;
      }
    }
    // For URLs or other cases, use SwaggerParser
    const api = await SwaggerParser.parse(input);
    return api as OpenAPIObject;
  }
  
  // Already parsed object - return as-is to preserve $refs
  return input;
}

export { OpenAPIParser } from './openapi-parser';
export { extractModels } from './models';
export { extractEndpoints } from './endpoints';
export { resolveReferences } from './references';