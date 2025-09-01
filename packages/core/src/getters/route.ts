/**
 * Route handling - aligned with Orval structure
 * Processes API routes and path parameters
 */

import { OpenAPIV3 } from 'openapi-types';

export interface RouteInfo {
  path: string;
  normalizedPath: string;
  pathParams: string[];
  hasParams: boolean;
  dartTemplate: string;
}

/**
 * Check if route has path parameters
 */
export function hasPathParams(path: string): boolean {
  return /\{[\w_-]+\}/.test(path);
}

/**
 * Extract path parameter names from route
 */
export function extractPathParams(path: string): string[] {
  const params: string[] = [];
  const regex = /\{([\w_-]+)\}/g;
  let match;
  
  while ((match = regex.exec(path)) !== null) {
    params.push(match[1]);
  }
  
  return params;
}

/**
 * Convert OpenAPI path to Dart string template
 */
export function getRoute(path: string): string {
  if (!hasPathParams(path)) {
    return path;
  }
  
  // Replace {param} with ${param} for Dart string interpolation
  return path.replace(/\{([\w_-]+)\}/g, (match, param) => {
    const dartParam = toCamelCase(param);
    return `\${${dartParam}}`;
  });
}

/**
 * Get route information
 */
export function getRouteInfo(path: string): RouteInfo {
  const pathParams = extractPathParams(path);
  const dartTemplate = getRoute(path);
  const normalizedPath = normalizePath(path);
  
  return {
    path,
    normalizedPath,
    pathParams,
    hasParams: pathParams.length > 0,
    dartTemplate
  };
}

/**
 * Normalize path for use as identifier
 */
export function normalizePath(path: string): string {
  return path
    .replace(/\{[\w_-]+\}/g, '') // Remove parameters
    .replace(/[^a-zA-Z0-9]/g, '_') // Replace special chars
    .replace(/_+/g, '_') // Collapse multiple underscores
    .replace(/^_|_$/g, ''); // Remove leading/trailing underscores
}

/**
 * Build full URL with base URL
 */
export function getFullRoute(
  path: string,
  baseUrl?: string,
  servers?: OpenAPIV3.ServerObject[]
): string {
  let base = baseUrl || '';
  
  // If no explicit base URL, try to get from servers
  if (!base && servers && servers.length > 0) {
    base = getBaseUrlFromServer(servers[0]);
  }
  
  // Handle trailing/leading slashes
  if (base.endsWith('/') && path.startsWith('/')) {
    return base + path.slice(1);
  }
  
  if (!base.endsWith('/') && !path.startsWith('/')) {
    return base + '/' + path;
  }
  
  return base + path;
}

/**
 * Get base URL from server object
 */
export function getBaseUrlFromServer(server: OpenAPIV3.ServerObject): string {
  let url = server.url;
  
  // Replace server variables with defaults
  if (server.variables) {
    Object.entries(server.variables).forEach(([key, variable]) => {
      const defaultValue = variable.default;
      url = url.replace(`{${key}}`, defaultValue);
    });
  }
  
  return url;
}

/**
 * Generate Dart path construction code
 */
export function generatePathConstruction(
  route: RouteInfo,
  pathParams: Array<{ name: string; dartName: string }>
): string {
  if (!route.hasParams) {
    return `const path = '${route.path}';`;
  }
  
  // Build path with parameter replacements
  let pathConstruction = `var path = '${route.path}';`;
  
  pathParams.forEach(param => {
    pathConstruction += `\n    path = path.replaceAll('{${param.name}}', ${param.dartName}.toString());`;
  });
  
  return pathConstruction;
}

/**
 * Generate Dart string interpolation path
 */
export function generateInterpolatedPath(
  route: RouteInfo,
  pathParams: Array<{ name: string; dartName: string }>
): string {
  if (!route.hasParams) {
    return `'${route.path}'`;
  }
  
  // Replace {param} with ${dartParam}
  let interpolated = route.path;
  
  pathParams.forEach(param => {
    interpolated = interpolated.replace(
      `{${param.name}}`,
      `\${${param.dartName}}`
    );
  });
  
  return `'${interpolated}'`;
}

/**
 * Check if path matches a pattern
 */
export function matchesPathPattern(path: string, pattern: string): boolean {
  // Convert pattern with {params} to regex
  const regexPattern = pattern
    .replace(/\{[\w_-]+\}/g, '[^/]+') // Replace params with non-slash matcher
    .replace(/\//g, '\\/'); // Escape slashes
  
  const regex = new RegExp(`^${regexPattern}$`);
  return regex.test(path);
}

/**
 * Group paths by resource
 */
export function groupPathsByResource(paths: string[]): Map<string, string[]> {
  const grouped = new Map<string, string[]>();
  
  paths.forEach(path => {
    // Extract resource name (first non-parameter segment)
    const segments = path.split('/').filter(s => s.length > 0);
    const resource = segments.find(s => !s.startsWith('{')) || 'root';
    
    if (!grouped.has(resource)) {
      grouped.set(resource, []);
    }
    grouped.get(resource)!.push(path);
  });
  
  return grouped;
}

/**
 * Convert to camelCase
 */
function toCamelCase(str: string): string {
  return str
    .replace(/[-_]([a-z])/g, (_, char) => char.toUpperCase())
    .replace(/^([A-Z])/, char => char.toLowerCase());
}

/**
 * Get route segments
 */
export function getRouteSegments(path: string): string[] {
  return path
    .split('/')
    .filter(segment => segment.length > 0)
    .map(segment => {
      if (segment.startsWith('{') && segment.endsWith('}')) {
        return segment.slice(1, -1); // Remove braces
      }
      return segment;
    });
}

/**
 * Check if route is nested (has multiple segments)
 */
export function isNestedRoute(path: string): boolean {
  const segments = getRouteSegments(path);
  return segments.length > 2;
}

/**
 * Get parent route
 */
export function getParentRoute(path: string): string | null {
  const segments = path.split('/').filter(s => s.length > 0);
  if (segments.length <= 1) return null;
  
  segments.pop();
  return '/' + segments.join('/');
}