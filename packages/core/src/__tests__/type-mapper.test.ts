import { describe, it, expect } from 'vitest';
import { TypeMapper } from '../utils/type-mapper';
import type { OpenAPIV3 } from 'openapi-types';

type SchemaObject = OpenAPIV3.SchemaObject;

describe('TypeMapper', () => {
  describe('mapType', () => {
    it('should map basic OpenAPI types to Dart types', () => {
      expect(TypeMapper.mapType({ type: 'string' })).toBe('String');
      expect(TypeMapper.mapType({ type: 'integer' })).toBe('int');
      expect(TypeMapper.mapType({ type: 'number' })).toBe('double');
      expect(TypeMapper.mapType({ type: 'boolean' })).toBe('bool');
    });

    it('should map formatted types correctly', () => {
      expect(TypeMapper.mapType({ type: 'string', format: 'date' })).toBe('DateTime');
      expect(TypeMapper.mapType({ type: 'string', format: 'date-time' })).toBe('DateTime');
      expect(TypeMapper.mapType({ type: 'string', format: 'byte' })).toBe('String');
      expect(TypeMapper.mapType({ type: 'string', format: 'binary' })).toBe('Uint8List');
      expect(TypeMapper.mapType({ type: 'integer', format: 'int32' })).toBe('int');
      expect(TypeMapper.mapType({ type: 'integer', format: 'int64' })).toBe('int');
      expect(TypeMapper.mapType({ type: 'number', format: 'float' })).toBe('double');
      expect(TypeMapper.mapType({ type: 'number', format: 'double' })).toBe('double');
    });

    it('should map array types', () => {
      const arraySchema: SchemaObject = {
        type: 'array',
        items: { type: 'string' }
      };
      expect(TypeMapper.mapType(arraySchema)).toBe('List<String>');

      const nestedArraySchema: SchemaObject = {
        type: 'array',
        items: {
          type: 'array',
          items: { type: 'integer' }
        }
      };
      expect(TypeMapper.mapType(nestedArraySchema)).toBe('List<List<int>>');
    });

    it('should map object with additionalProperties to Map', () => {
      const mapSchema: SchemaObject = {
        type: 'object',
        additionalProperties: { type: 'string' }
      };
      expect(TypeMapper.mapType(mapSchema)).toBe('Map<String, String>');

      const genericMapSchema: SchemaObject = {
        type: 'object',
        additionalProperties: true
      };
      expect(TypeMapper.mapType(genericMapSchema)).toBe('Map<String, dynamic>');
    });

    it('should handle $ref types', () => {
      const refSchema: SchemaObject = {
        $ref: '#/components/schemas/Pet'
      };
      expect(TypeMapper.mapType(refSchema)).toBe('Pet');
    });

    it('should return dynamic for unknown types', () => {
      expect(TypeMapper.mapType({})).toBe('dynamic');
      expect(TypeMapper.mapType({ type: 'unknown' as any })).toBe('dynamic');
    });
  });

  describe('mapTypeWithNullability', () => {
    it('should add ? for nullable types', () => {
      expect(TypeMapper.mapTypeWithNullability({ type: 'string' }, false)).toBe('String?');
      expect(TypeMapper.mapTypeWithNullability({ type: 'integer' }, false)).toBe('int?');
      expect(TypeMapper.mapTypeWithNullability({ type: 'boolean' }, false)).toBe('bool?');
    });

    it('should not add ? for required types', () => {
      expect(TypeMapper.mapTypeWithNullability({ type: 'string' }, true)).toBe('String');
      expect(TypeMapper.mapTypeWithNullability({ type: 'integer' }, true)).toBe('int');
    });

    it('should not add ? for dynamic type', () => {
      expect(TypeMapper.mapTypeWithNullability({}, false)).toBe('dynamic');
    });
  });

  describe('toDartPropertyName', () => {
    it('should convert snake_case to camelCase', () => {
      expect(TypeMapper.toDartPropertyName('pet_name')).toBe('petName');
      expect(TypeMapper.toDartPropertyName('is_active')).toBe('isActive');
      expect(TypeMapper.toDartPropertyName('created_at')).toBe('createdAt');
    });

    it('should leave camelCase unchanged', () => {
      expect(TypeMapper.toDartPropertyName('petName')).toBe('petName');
      expect(TypeMapper.toDartPropertyName('isActive')).toBe('isActive');
    });
  });

  describe('toDartClassName', () => {
    it('should convert to PascalCase', () => {
      expect(TypeMapper.toDartClassName('pet')).toBe('Pet');
      expect(TypeMapper.toDartClassName('pet_owner')).toBe('PetOwner');
      expect(TypeMapper.toDartClassName('apiResponse')).toBe('ApiResponse');
    });
  });

  describe('toSnakeCase', () => {
    it('should convert PascalCase to snake_case', () => {
      expect(TypeMapper.toSnakeCase('Pet')).toBe('pet');
      expect(TypeMapper.toSnakeCase('PetOwner')).toBe('pet_owner');
      expect(TypeMapper.toSnakeCase('APIResponse')).toBe('a_p_i_response');
    });
  });

  describe('getImportsForType', () => {
    it('should return import for Uint8List', () => {
      const imports = TypeMapper.getImportsForType('Uint8List');
      expect(imports).toContain("import 'dart:typed_data';");
    });

    it('should return empty array for built-in types', () => {
      expect(TypeMapper.getImportsForType('String')).toEqual([]);
      expect(TypeMapper.getImportsForType('int')).toEqual([]);
      expect(TypeMapper.getImportsForType('DateTime')).toEqual([]);
    });
  });

  describe('needsJsonAnnotation', () => {
    it('should return true for snake_case properties', () => {
      expect(TypeMapper.needsJsonAnnotation({ type: 'string' }, 'pet_name')).toBe(true);
    });

    it('should return true for DateTime properties', () => {
      expect(TypeMapper.needsJsonAnnotation({ type: 'string', format: 'date-time' }, 'createdAt')).toBe(true);
    });

    it('should return false for simple camelCase properties', () => {
      expect(TypeMapper.needsJsonAnnotation({ type: 'string' }, 'name')).toBe(false);
    });
  });

  describe('getDefaultValue', () => {
    it('should return default values for schemas with defaults', () => {
      expect(TypeMapper.getDefaultValue({ type: 'string', default: 'test' })).toBe("'test'");
      expect(TypeMapper.getDefaultValue({ type: 'integer', default: 42 })).toBe('42');
      expect(TypeMapper.getDefaultValue({ type: 'number', default: 3.14 })).toBe('3.14');
      expect(TypeMapper.getDefaultValue({ type: 'boolean', default: true })).toBe('true');
    });

    it('should return const collections for arrays and maps', () => {
      expect(TypeMapper.getDefaultValue({ type: 'array', default: [] })).toBe('const []');
      expect(TypeMapper.getDefaultValue({ type: 'object', additionalProperties: true, default: {} })).toBe('const {}');
    });

    it('should return null when no default is specified', () => {
      expect(TypeMapper.getDefaultValue({ type: 'string' })).toBe(null);
    });
  });
});