/**
 * Extract endpoint definitions from OpenAPI spec
 */

import { OpenAPIObject } from '../types';
import { DartEndpoint } from '../types';

export function extractEndpoints(spec: OpenAPIObject): DartEndpoint[] {
  const endpoints: DartEndpoint[] = [];
  
  // Extract from paths
  if (spec.paths) {
    Object.entries(spec.paths).forEach(([path, pathItem]) => {
      if (!pathItem) return;
      
      // Process each HTTP method
      const methods = ['get', 'post', 'put', 'delete', 'patch', 'options', 'head'] as const;
      
      methods.forEach(method => {
        const operation = (pathItem as any)[method];
        if (operation) {
          endpoints.push({
            name: operation.operationId || `${method}${path}`,
            method: method.toUpperCase(),
            path,
            parameters: [],
            responses: [],
            description: operation.description,
            deprecated: operation.deprecated,
            tags: operation.tags
          });
        }
      });
    });
  }
  
  return endpoints;
}