/**
 * Parameter handling - aligned with Orval structure
 * Processes path, query, and header parameters
 */

import { OpenAPIV3 } from 'openapi-types';

export interface ParameterInfo {
  name: string;
  dartName: string;
  type: string;
  in: 'path' | 'query' | 'header' | 'cookie';
  required: boolean;
  description?: string;
  defaultValue?: any;
  enum?: any[];
  pattern?: string;
  format?: string;
  nullable?: boolean;
  imports: string[];
}

export interface GroupedParameters {
  path: ParameterInfo[];
  query: ParameterInfo[];
  header: ParameterInfo[];
  cookie: ParameterInfo[];
}

/**
 * Process and group parameters by location
 */
export function getParameters(
  parameters: (OpenAPIV3.ReferenceObject | OpenAPIV3.ParameterObject)[],
  context?: any
): GroupedParameters {
  const grouped: GroupedParameters = {
    path: [],
    query: [],
    header: [],
    cookie: []
  };
  
  parameters.forEach(param => {
    const paramInfo = processParameter(param, context);
    if (paramInfo && paramInfo.in in grouped) {
      grouped[paramInfo.in as keyof GroupedParameters].push(paramInfo);
    }
  });
  
  return grouped;
}

/**
 * Process a single parameter
 */
export function processParameter(
  parameter: OpenAPIV3.ReferenceObject | OpenAPIV3.ParameterObject,
  context?: any
): ParameterInfo | null {
  const imports: string[] = [];
  
  // Handle reference
  if ('$ref' in parameter) {
    // TODO: Resolve reference from context
    const refName = extractRefName(parameter.$ref);
    // For now, return null for references
    // In a complete implementation, we'd resolve the reference
    return null;
  }
  
  // Direct parameter object
  const param = parameter as OpenAPIV3.ParameterObject;
  
  // Skip if not a supported location
  if (!['path', 'query', 'header', 'cookie'].includes(param.in)) {
    return null;
  }
  
  // Get parameter type
  let type = 'String';
  let nullable = false;
  
  if (param.schema) {
    const typeInfo = getParameterType(param.schema);
    type = typeInfo.type;
    nullable = typeInfo.nullable || false;
    imports.push(...typeInfo.imports);
  }
  
  // Convert parameter name to Dart convention
  const dartName = toCamelCase(param.name);
  
  return {
    name: param.name,
    dartName,
    type,
    in: param.in,
    required: param.required || false,
    description: param.description,
    nullable,
    imports,
    ...(param.schema && 'default' in param.schema ? { defaultValue: param.schema.default } : {}),
    ...(param.schema && 'enum' in param.schema ? { enum: param.schema.enum } : {}),
    ...(param.schema && 'pattern' in param.schema ? { pattern: param.schema.pattern } : {}),
    ...(param.schema && 'format' in param.schema ? { format: param.schema.format } : {})
  };
}

/**
 * Get Dart type from parameter schema
 */
function getParameterType(
  schema: OpenAPIV3.ReferenceObject | OpenAPIV3.SchemaObject
): { type: string; nullable: boolean; imports: string[] } {
  const imports: string[] = [];
  
  if ('$ref' in schema) {
    const refName = extractRefName(schema.$ref);
    imports.push(`models/${toSnakeCase(refName)}.f.dart`);
    return { type: refName, nullable: false, imports };
  }
  
  let type = 'dynamic';
  const nullable = schema.nullable || false;
  
  switch (schema.type) {
    case 'string':
      if (schema.format === 'date-time' || schema.format === 'date') {
        type = 'DateTime';
      } else if (schema.format === 'binary') {
        type = 'Uint8List';
        imports.push('dart:typed_data');
      } else if (schema.enum) {
        // Enum type - generate enum name from parameter
        type = 'String'; // For now, use String for enums
      } else {
        type = 'String';
      }
      break;
    
    case 'integer':
      type = 'int';
      break;
    
    case 'number':
      type = 'double';
      break;
    
    case 'boolean':
      type = 'bool';
      break;
    
    case 'array':
      if (schema.items) {
        const itemType = getParameterType(schema.items);
        imports.push(...itemType.imports);
        type = `List<${itemType.type}>`;
      } else {
        type = 'List<dynamic>';
      }
      break;
    
    case 'object':
      type = 'Map<String, dynamic>';
      break;
  }
  
  return { type, nullable, imports };
}

/**
 * Generate parameter list for method signature
 */
export function generateParameterList(
  parameters: ParameterInfo[],
  options?: {
    includeOptional?: boolean;
    wrapInObject?: boolean;
  }
): string {
  if (parameters.length === 0) return '';
  
  if (options?.wrapInObject) {
    // Generate parameter object class name
    return generateParameterObject(parameters);
  }
  
  const params = parameters
    .filter(p => options?.includeOptional || p.required)
    .map(p => {
      const required = p.required ? 'required ' : '';
      const nullable = p.nullable || !p.required ? '?' : '';
      return `${required}${p.type}${nullable} ${p.dartName}`;
    });
  
  return params.join(', ');
}

/**
 * Generate parameter object for complex parameter sets
 */
function generateParameterObject(parameters: ParameterInfo[]): string {
  // This would generate a parameter class
  // For now, return individual parameters
  return parameters.map(p => {
    const required = p.required ? 'required ' : '';
    const nullable = p.nullable || !p.required ? '?' : '';
    return `${required}${p.type}${nullable} ${p.dartName}`;
  }).join(', ');
}

/**
 * Check if parameters contain file upload
 */
export function hasFileParameter(parameters: ParameterInfo[]): boolean {
  return parameters.some(p => 
    p.type === 'Uint8List' || 
    p.format === 'binary' || 
    p.format === 'byte'
  );
}

/**
 * Get parameters of a specific type
 */
export function getParametersByLocation(
  parameters: GroupedParameters,
  location: 'path' | 'query' | 'header' | 'cookie'
): ParameterInfo[] {
  return parameters[location] || [];
}

/**
 * Convert snake_case or kebab-case to camelCase
 */
function toCamelCase(str: string): string {
  // Handle special cases for common header names
  const specialCases: Record<string, string> = {
    'x-api-key': 'xApiKey',
    'x-auth-token': 'xAuthToken',
    'x-request-id': 'xRequestId',
    'content-type': 'contentType',
    'accept-language': 'acceptLanguage'
  };
  
  const lower = str.toLowerCase();
  if (specialCases[lower]) {
    return specialCases[lower];
  }
  
  // General conversion
  return str
    .replace(/[-_]([a-z])/g, (_, char) => char.toUpperCase())
    .replace(/^([A-Z])/, char => char.toLowerCase());
}

/**
 * Convert to snake_case
 */
function toSnakeCase(str: string): string {
  return str
    .replace(/([a-z])([A-Z])/g, '$1_$2')
    .replace(/([A-Z]+)([A-Z][a-z])/g, '$1_$2')
    .toLowerCase();
}

/**
 * Extract name from $ref
 */
function extractRefName(ref: string): string {
  const parts = ref.split('/');
  return parts[parts.length - 1];
}

/**
 * Generate parameter documentation
 */
export function generateParameterDocs(param: ParameterInfo): string {
  const lines: string[] = [];
  
  if (param.description) {
    lines.push(`/// ${param.description}`);
  }
  
  if (param.pattern) {
    lines.push(`/// Pattern: ${param.pattern}`);
  }
  
  if (param.enum && param.enum.length > 0) {
    lines.push(`/// Allowed values: ${param.enum.join(', ')}`);
  }
  
  if (param.defaultValue !== undefined) {
    lines.push(`/// Default: ${param.defaultValue}`);
  }
  
  return lines.join('\n');
}