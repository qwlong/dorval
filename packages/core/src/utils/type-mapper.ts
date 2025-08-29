/**
 * OpenAPI to Dart type mapping utilities
 */

import type { OpenAPIV3 } from 'openapi-types';

type SchemaObject = OpenAPIV3.SchemaObject | OpenAPIV3.ReferenceObject;

/**
 * Basic type mapping from OpenAPI to Dart
 */
export const TYPE_MAP: Record<string, string> = {
  // Basic types
  'string': 'String',
  'integer': 'int',
  'number': 'double',
  'boolean': 'bool',
  'array': 'List',
  'object': 'Map<String, dynamic>',
  
  // Format specific mappings
  'string:date': 'DateTime',
  'string:date-time': 'DateTime',
  'string:byte': 'String', // Base64 encoded
  'string:binary': 'Uint8List',
  'string:email': 'String',
  'string:uuid': 'String',
  'string:uri': 'String',
  'string:hostname': 'String',
  'string:ipv4': 'String',
  'string:ipv6': 'String',
  'integer:int32': 'int',
  'integer:int64': 'int',
  'number:float': 'double',
  'number:double': 'double',
};

export class TypeMapper {
  /**
   * Map OpenAPI type to Dart type
   */
  static mapType(schema: SchemaObject): string {
    if (!schema) {
      return 'dynamic';
    }

    // Handle $ref
    if ('$ref' in schema && schema.$ref) {
      return this.extractTypeFromRef(schema.$ref);
    }

    // Cast to non-reference schema for property access
    const nonRefSchema = schema as OpenAPIV3.SchemaObject;
    
    // Handle arrays
    if (nonRefSchema.type === 'array') {
      const itemType = nonRefSchema.items ? this.mapType(nonRefSchema.items as SchemaObject) : 'dynamic';
      return `List<${itemType}>`;
    }

    // Handle objects with additionalProperties (Map)
    if (nonRefSchema.type === 'object' && nonRefSchema.additionalProperties) {
      const valueType = typeof nonRefSchema.additionalProperties === 'object'
        ? this.mapType(nonRefSchema.additionalProperties as SchemaObject)
        : 'dynamic';
      return `Map<String, ${valueType}>`;
    }

    // Handle objects with properties (custom class)
    if (nonRefSchema.type === 'object' && nonRefSchema.properties) {
      // This will be a custom model class name
      return nonRefSchema.title || 'Map<String, dynamic>';
    }

    // Handle enums
    if (nonRefSchema.enum && nonRefSchema.enum.length > 0) {
      return nonRefSchema.title || 'String';
    }

    // Handle oneOf/anyOf/allOf
    if (nonRefSchema.oneOf || nonRefSchema.anyOf) {
      return 'dynamic'; // Will be handled as union types later
    }

    if (nonRefSchema.allOf) {
      // Will be handled as composed model later
      return 'dynamic';
    }

    // Handle format-specific types
    const type = nonRefSchema.type as string;
    const format = nonRefSchema.format;
    
    if (format) {
      const key = `${type}:${format}`;
      if (TYPE_MAP[key]) {
        return TYPE_MAP[key];
      }
    }

    // Basic type mapping
    return TYPE_MAP[type] || 'dynamic';
  }

  /**
   * Map OpenAPI type to Dart type with null safety
   */
  static mapTypeWithNullability(schema: SchemaObject, required: boolean = true): string {
    const baseType = this.mapType(schema);
    
    // In Dart, add ? for nullable types
    if (!required && baseType !== 'dynamic') {
      return `${baseType}?`;
    }
    
    return baseType;
  }

  /**
   * Extract type name from $ref
   */
  static extractTypeFromRef(ref: string): string {
    if (!ref || typeof ref !== 'string') {
      return '';
    }
    
    // Handle external references (e.g., 'external.yaml#/components/schemas/User')
    let actualRef = ref;
    if (ref.includes('#')) {
      actualRef = ref.substring(ref.indexOf('#'));
    }
    
    // Check if it's a valid reference path
    if (!actualRef.startsWith('#/')) {
      return '';
    }
    
    // Must have a valid path structure
    const parts = actualRef.split('/');
    if (parts.length < 3) {
      return '';
    }
    
    // Validate that it's a proper reference path
    const validPaths = ['components', 'definitions'];
    const validSubPaths = ['schemas', 'parameters', 'responses', 'examples', 'requestBodies', 'headers', 'securitySchemes', 'links', 'callbacks'];
    
    // Check if it's a valid component reference
    if (parts[1] === 'components') {
      if (!validSubPaths.includes(parts[2])) {
        return '';
      }
    } else if (parts[1] !== 'definitions') {
      // If not components or definitions, it's invalid
      return '';
    }
    
    // #/components/schemas/Pet -> Pet
    // #/definitions/BaseEntity -> BaseEntity
    return parts[parts.length - 1] || '';
  }

  /**
   * Convert OpenAPI property name to Dart property name
   */
  static toDartPropertyName(name: string): string {
    // Handle all uppercase with underscores first (USER_NAME -> userName)
    if (name === name.toUpperCase() && name.includes('_')) {
      const parts = name.toLowerCase().split('_');
      return parts[0] + parts.slice(1).map(p => p.charAt(0).toUpperCase() + p.slice(1)).join('');
    }
    
    // First handle underscores and hyphens to create camelCase
    let result = name
      .replace(/[-_]([a-zA-Z])/g, (_, letter) => letter.toUpperCase())
      .replace(/\.([a-zA-Z])/g, (_, letter) => letter.toUpperCase());
    
    // If the result is all uppercase (and not a single char), convert to lowercase
    if (result === result.toUpperCase() && result.length > 1) {
      result = result.toLowerCase();
    }
    
    // Ensure first character is lowercase for camelCase
    if (result.length > 0) {
      result = result.charAt(0).toLowerCase() + result.slice(1);
    }
    
    return result;
  }
  
  /**
   * List of Dart reserved keywords
   */
  private static readonly DART_RESERVED_KEYWORDS = new Set([
    'abstract', 'as', 'assert', 'async', 'await', 'break', 'case', 'catch',
    'class', 'const', 'continue', 'covariant', 'default', 'deferred', 'do',
    'dynamic', 'else', 'enum', 'export', 'extends', 'extension', 'external',
    'factory', 'false', 'final', 'finally', 'for', 'Function', 'get', 'hide',
    'if', 'implements', 'import', 'in', 'interface', 'is', 'late', 'library',
    'mixin', 'new', 'null', 'on', 'operator', 'part', 'required', 'rethrow',
    'return', 'sealed', 'set', 'show', 'static', 'super', 'switch', 'sync',
    'this', 'throw', 'true', 'try', 'typedef', 'var', 'void', 'when', 'while',
    'with', 'yield'
  ]);

  /**
   * Check if a name is a Dart reserved keyword
   */
  static isDartReservedKeyword(name: string): boolean {
    return this.DART_RESERVED_KEYWORDS.has(name);
  }

  /**
   * Convert to camelCase (specifically for parameter names)
   */
  static toCamelCase(name: string): string {
    // Handle special cases for headers (x-api-key -> xApiKey)
    let result = name.replace(/[-_]([a-z])/gi, (_, letter) => letter.toUpperCase());
    
    // Ensure first letter is lowercase
    if (result.length > 0) {
      result = result.charAt(0).toLowerCase() + result.slice(1);
    }
    
    // Escape reserved keywords by adding underscore suffix
    if (this.isDartReservedKeyword(result)) {
      result = `${result}_`;
    }
    
    return result;
  }

  /**
   * Convert to Dart class name (PascalCase)
   */
  static toDartClassName(name: string): string {
    // Handle all-caps acronyms (APIResponse -> ApiResponse)
    let result = name.replace(/([A-Z])([A-Z]+)([A-Z][a-z]|$)/g, (match, p1, p2, p3) => {
      if (p3) {
        // APIResponse -> Api + Response
        return p1 + p2.toLowerCase() + p3;
      } else {
        // End of string, e.g. API -> Api
        return p1 + p2.toLowerCase();
      }
    });
    
    // If already in PascalCase after acronym handling, return
    if (/^[A-Z][a-zA-Z0-9]*$/.test(result) && !result.includes('_') && !result.includes(' ')) {
      return result;
    }
    
    // Replace non-word characters (except underscore) with spaces
    const normalized = result.replace(/[^\w_]+/g, ' ');
    
    // Split by spaces and underscores
    const words = normalized.split(/[\s_]+/).filter(word => word.length > 0);
    
    // Capitalize first letter of each word and join
    return words.map(word => {
      // If the word is already mixed case, keep its casing
      if (/[a-z]/.test(word) && /[A-Z]/.test(word)) {
        return word.charAt(0).toUpperCase() + word.slice(1);
      }
      // Otherwise capitalize first letter, rest lowercase
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    }).join('');
  }

  /**
   * Convert to snake_case for file names
   */
  static toSnakeCase(str: string): string {
    // Handle camelCase and PascalCase by inserting underscores
    let result = str
      // Insert underscore before uppercase letters that follow lowercase letters
      .replace(/([a-z])([A-Z])/g, '$1_$2')
      // Insert underscore before uppercase letters that follow numbers
      .replace(/([0-9])([A-Z])/g, '$1_$2')
      // Handle sequences of uppercase letters followed by lowercase (e.g., XMLHttp -> XML_Http)
      .replace(/([A-Z]+)([A-Z][a-z])/g, '$1_$2');
    
    // Convert to lowercase and clean up
    return result
      .toLowerCase()
      .replace(/\s+/g, '_')  // Replace spaces with underscores
      .replace(/[^\w]+/g, '_')  // Replace non-word characters with underscores
      .replace(/^_+/, '')  // Remove leading underscores
      .replace(/_+/g, '_')  // Replace multiple underscores with single
      .replace(/_+$/, '');  // Remove trailing underscores
  }

  /**
   * Convert to PascalCase
   */
  static toPascalCase(str: string): string {
    return str
      .replace(/[-_\s]+(.)?/g, (_, char) => char ? char.toUpperCase() : '')
      .replace(/^(.)/, (_, char) => char.toUpperCase());
  }

  /**
   * Get Dart imports needed for a type
   */
  static getImportsForType(type: string): string[] {
    const imports: string[] = [];

    if (type.includes('DateTime')) {
      // DateTime is built-in, no import needed
    }

    if (type.includes('Uint8List')) {
      imports.push('dart:typed_data');
    }

    return imports;
  }

  /**
   * Check if type needs JSON serialization annotation
   */
  static needsJsonAnnotation(schema: SchemaObject, propertyName: string): boolean {
    // Check if property name differs from JSON key
    const dartName = this.toDartPropertyName(propertyName);
    
    // Need annotation if names are different or if it's a DateTime
    if (dartName !== propertyName) {
      return true;
    }

    const type = this.mapType(schema);
    if (type === 'DateTime') {
      return true;
    }

    return false;
  }

  /**
   * Generate JsonKey annotation
   */
  static generateJsonKeyAnnotation(schema: SchemaObject, propertyName: string): string | null {
    if (!this.needsJsonAnnotation(schema, propertyName)) {
      return null;
    }

    const annotations: string[] = [];
    const dartName = this.toDartPropertyName(propertyName);

    // Add name annotation if different
    if (dartName !== propertyName) {
      annotations.push(`name: '${propertyName}'`);
    }

    // Add fromJson/toJson for DateTime
    const type = this.mapType(schema);
    if (type === 'DateTime') {
      annotations.push('fromJson: _dateTimeFromJson, toJson: _dateTimeToJson');
    }

    if (annotations.length > 0) {
      return `@JsonKey(${annotations.join(', ')})`;
    }

    return null;
  }

  /**
   * Generate default value for a type
   */
  static getDefaultValue(schema: SchemaObject): string | null {
    if ('$ref' in schema) {
      return null;
    }
    
    const nonRefSchema = schema as OpenAPIV3.SchemaObject;
    
    if (nonRefSchema.default !== undefined) {
      const type = this.mapType(schema);
      
      if (type === 'String') {
        return `'${nonRefSchema.default}'`;
      }
      
      if (type === 'int' || type === 'double') {
        return String(nonRefSchema.default);
      }
      
      if (type === 'bool') {
        return String(nonRefSchema.default);
      }

      if (type.startsWith('List')) {
        return 'const []';
      }

      if (type.startsWith('Map')) {
        return 'const {}';
      }
    }

    return null;
  }
}