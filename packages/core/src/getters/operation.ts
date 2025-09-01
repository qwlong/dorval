/**
 * Operation handling - aligned with Orval structure
 * Processes OpenAPI operations and generates method metadata
 */

import { OpenAPIV3 } from 'openapi-types';

export type HttpMethod = 'get' | 'post' | 'put' | 'delete' | 'patch' | 'head' | 'options';

export interface OperationInfo {
  operationId: string;
  method: HttpMethod;
  path: string;
  summary?: string;
  description?: string;
  tags: string[];
  deprecated?: boolean;
  security?: OpenAPIV3.SecurityRequirementObject[];
}

/**
 * Get operation ID, generating one if not provided
 */
export function getOperationId(
  operation: OpenAPIV3.OperationObject,
  path: string,
  method: HttpMethod
): string {
  // Use existing operationId if available
  if (operation.operationId) {
    return sanitizeOperationId(operation.operationId);
  }
  
  // Generate operationId from method and path
  return generateOperationId(method, path);
}

/**
 * Generate operation ID from method and path
 */
export function generateOperationId(method: HttpMethod, path: string): string {
  // Convert path to operation name
  // Example: GET /users/{id}/posts -> getUsersPosts
  
  const parts: string[] = [method];
  
  // Split path and process each segment
  const pathSegments = path.split('/').filter(segment => segment.length > 0);
  
  pathSegments.forEach(segment => {
    if (segment.startsWith('{') && segment.endsWith('}')) {
      // Path parameter - add "By" prefix
      const paramName = segment.slice(1, -1);
      parts.push('by', toPascalCase(paramName));
    } else {
      // Regular path segment
      parts.push(toPascalCase(segment));
    }
  });
  
  // Join and convert to camelCase
  const result = parts.join('');
  return result.charAt(0).toLowerCase() + result.slice(1);
}

/**
 * Sanitize operation ID for use as method name
 */
export function sanitizeOperationId(operationId: string): string {
  // Remove special characters and convert to camelCase
  let sanitized = operationId
    .replace(/[^a-zA-Z0-9_]/g, '_')  // Replace special chars with underscore
    .replace(/_+/g, '_')              // Collapse multiple underscores
    .replace(/^_|_$/g, '');           // Remove leading/trailing underscores
  
  // Convert to camelCase if contains underscores
  if (sanitized.includes('_')) {
    const parts = sanitized.split('_');
    sanitized = parts[0].toLowerCase() + 
      parts.slice(1).map(p => p.charAt(0).toUpperCase() + p.slice(1).toLowerCase()).join('');
  }
  
  // Ensure starts with lowercase
  return sanitized.charAt(0).toLowerCase() + sanitized.slice(1);
}

/**
 * Get operation information
 */
export function getOperationInfo(
  operation: OpenAPIV3.OperationObject,
  path: string,
  method: HttpMethod
): OperationInfo {
  return {
    operationId: getOperationId(operation, path, method),
    method,
    path,
    summary: operation.summary,
    description: operation.description,
    tags: operation.tags || [],
    deprecated: operation.deprecated,
    security: operation.security
  };
}

/**
 * Get operation name based on naming strategy
 */
export function getOperationName(
  operation: OpenAPIV3.OperationObject,
  path: string,
  method: HttpMethod,
  namingStrategy: 'operationId' | 'methodPath' = 'operationId'
): string {
  if (namingStrategy === 'operationId') {
    return getOperationId(operation, path, method);
  }
  
  // Method + path strategy
  return generateMethodPathName(method, path);
}

/**
 * Generate name from method and path
 */
export function generateMethodPathName(method: HttpMethod, path: string): string {
  const cleanPath = path
    .replace(/\{([^}]+)\}/g, 'By$1')  // Replace {param} with ByParam
    .split('/')
    .filter(s => s.length > 0)
    .map(s => toPascalCase(s))
    .join('');
  
  const methodName = method.toLowerCase() + cleanPath;
  return methodName.charAt(0).toLowerCase() + methodName.slice(1);
}

/**
 * Group operations by tag
 */
export function groupOperationsByTag(
  operations: Array<{
    operation: OpenAPIV3.OperationObject;
    path: string;
    method: HttpMethod;
  }>
): Map<string, typeof operations> {
  const grouped = new Map<string, typeof operations>();
  
  operations.forEach(op => {
    const tags = op.operation.tags || ['default'];
    
    tags.forEach(tag => {
      if (!grouped.has(tag)) {
        grouped.set(tag, []);
      }
      grouped.get(tag)!.push(op);
    });
  });
  
  return grouped;
}

/**
 * Check if operation has request body
 */
export function hasRequestBody(operation: OpenAPIV3.OperationObject): boolean {
  return Boolean(operation.requestBody);
}

/**
 * Check if operation has parameters
 */
export function hasParameters(operation: OpenAPIV3.OperationObject): boolean {
  return Boolean(operation.parameters && operation.parameters.length > 0);
}

/**
 * Check if operation requires authentication
 */
export function requiresAuth(
  operation: OpenAPIV3.OperationObject,
  globalSecurity?: OpenAPIV3.SecurityRequirementObject[]
): boolean {
  // Check operation-level security first
  if (operation.security !== undefined) {
    return operation.security.length > 0;
  }
  
  // Fall back to global security
  return Boolean(globalSecurity && globalSecurity.length > 0);
}

/**
 * Get operation documentation
 */
export function getOperationDocs(operation: OpenAPIV3.OperationObject): string {
  const lines: string[] = [];
  
  if (operation.summary) {
    lines.push(`/// ${operation.summary}`);
  }
  
  if (operation.description) {
    lines.push('///');
    operation.description.split('\n').forEach(line => {
      lines.push(`/// ${line}`);
    });
  }
  
  if (operation.deprecated) {
    lines.push('/// @deprecated');
  }
  
  if (operation.tags && operation.tags.length > 0) {
    lines.push(`/// Tags: ${operation.tags.join(', ')}`);
  }
  
  return lines.join('\n');
}

/**
 * Convert to PascalCase
 */
function toPascalCase(str: string): string {
  return str
    .split(/[-_\s]+/)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join('');
}

/**
 * Get success response codes
 */
export function getSuccessResponseCodes(responses: OpenAPIV3.ResponsesObject): string[] {
  return Object.keys(responses).filter(code => {
    const statusCode = parseInt(code);
    return !isNaN(statusCode) && statusCode >= 200 && statusCode < 300;
  });
}

/**
 * Get error response codes
 */
export function getErrorResponseCodes(responses: OpenAPIV3.ResponsesObject): string[] {
  return Object.keys(responses).filter(code => {
    const statusCode = parseInt(code);
    return !isNaN(statusCode) && statusCode >= 400;
  });
}