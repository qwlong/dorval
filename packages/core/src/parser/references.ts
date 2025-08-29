/**
 * Resolve $ref references in OpenAPI spec
 */

import { OpenAPIObject } from '../types';

/**
 * Check if an object is a reference (has $ref property)
 */
export function isReference(obj: any): boolean {
  return !!(obj && typeof obj === 'object' && '$ref' in obj);
}

/**
 * Extract the name from a reference path
 * e.g., "#/components/schemas/User" -> "User"
 */
export function extractRefName(ref: string): string {
  if (!ref || typeof ref !== 'string') {
    return '';
  }
  
  // Handle external references
  let actualRef = ref;
  if (ref.includes('#')) {
    actualRef = ref.substring(ref.indexOf('#'));
  }
  
  // Check if it's a valid reference path
  if (!actualRef.startsWith('#/')) {
    return '';
  }
  
  const parts = actualRef.split('/');
  
  // Must have at least 3 parts: #, components/definitions, name
  if (parts.length < 3) {
    return '';
  }
  
  // Check for valid component types
  const validComponents = ['components', 'definitions'];
  const validSubComponents = ['schemas', 'parameters', 'responses', 'examples', 'requestBodies', 'headers', 'securitySchemes', 'links', 'callbacks'];
  
  if (parts[1] === 'components' && !validSubComponents.includes(parts[2])) {
    return '';
  }
  
  if (!validComponents.includes(parts[1]) && parts[1] !== 'definitions') {
    return '';
  }
  
  return parts[parts.length - 1] || '';
}

/**
 * Resolve a reference in the OpenAPI spec
 */
export function resolveReference(ref: string, spec: any): any {
  if (!ref || !spec) {
    return undefined;
  }
  
  // Handle external references gracefully
  if (!ref.startsWith('#/')) {
    return undefined;
  }
  
  const parts = ref.substring(2).split('/'); // Remove "#/" and split
  let current = spec;
  
  for (const part of parts) {
    if (!current || typeof current !== 'object') {
      return undefined;
    }
    current = current[part];
  }
  
  return current;
}

export function resolveReferences(spec: OpenAPIObject): OpenAPIObject {
  // TODO: Implement reference resolution
  // This will handle $ref pointers throughout the spec
  return spec;
}