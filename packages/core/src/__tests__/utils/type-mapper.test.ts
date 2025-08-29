/**
 * Tests for TypeMapper utility
 */

import { describe, it, expect } from 'vitest';
import { TypeMapper } from '../../utils';

describe('TypeMapper', () => {
  describe('mapType - Basic Types', () => {
    it('should map string types', () => {
      expect(TypeMapper.mapType({ type: 'string' })).toBe('String');
      expect(TypeMapper.mapType({ type: 'string', format: 'email' })).toBe('String');
      expect(TypeMapper.mapType({ type: 'string', format: 'url' })).toBe('String');
    });

    it('should map integer types', () => {
      expect(TypeMapper.mapType({ type: 'integer' })).toBe('int');
      expect(TypeMapper.mapType({ type: 'integer', format: 'int32' })).toBe('int');
      expect(TypeMapper.mapType({ type: 'integer', format: 'int64' })).toBe('int');
    });

    it('should map number types', () => {
      expect(TypeMapper.mapType({ type: 'number' })).toBe('double');
      expect(TypeMapper.mapType({ type: 'number', format: 'float' })).toBe('double');
      expect(TypeMapper.mapType({ type: 'number', format: 'double' })).toBe('double');
    });

    it('should map boolean type', () => {
      expect(TypeMapper.mapType({ type: 'boolean' })).toBe('bool');
    });

    it('should map date and time types', () => {
      expect(TypeMapper.mapType({ type: 'string', format: 'date' })).toBe('DateTime');
      expect(TypeMapper.mapType({ type: 'string', format: 'date-time' })).toBe('DateTime');
      expect(TypeMapper.mapType({ type: 'string', format: 'time' })).toBe('String');
    });

    it('should map binary type', () => {
      expect(TypeMapper.mapType({ type: 'string', format: 'binary' })).toBe('Uint8List');
      expect(TypeMapper.mapType({ type: 'string', format: 'byte' })).toBe('String');
    });
  });

  describe('mapType - Complex Types', () => {
    it('should map array types', () => {
      expect(TypeMapper.mapType({ 
        type: 'array', 
        items: { type: 'string' } 
      })).toBe('List<String>');
      
      expect(TypeMapper.mapType({ 
        type: 'array', 
        items: { type: 'integer' } 
      })).toBe('List<int>');
      
      expect(TypeMapper.mapType({ 
        type: 'array', 
        items: { $ref: '#/components/schemas/User' } 
      })).toBe('List<User>');
    });

    it('should map nested array types', () => {
      expect(TypeMapper.mapType({ 
        type: 'array', 
        items: { 
          type: 'array',
          items: { type: 'string' }
        } 
      })).toBe('List<List<String>>');
    });

    it('should map object types', () => {
      expect(TypeMapper.mapType({ type: 'object' })).toBe('Map<String, dynamic>');
      
      expect(TypeMapper.mapType({ 
        type: 'object',
        additionalProperties: { type: 'string' }
      })).toBe('Map<String, String>');
      
      expect(TypeMapper.mapType({ 
        type: 'object',
        additionalProperties: { type: 'integer' }
      })).toBe('Map<String, int>');
    });

    it('should map reference types', () => {
      expect(TypeMapper.mapType({ $ref: '#/components/schemas/User' })).toBe('User');
      expect(TypeMapper.mapType({ $ref: '#/components/schemas/ProductDetails' })).toBe('ProductDetails');
    });

    it('should handle unknown types', () => {
      expect(TypeMapper.mapType({})).toBe('dynamic');
      expect(TypeMapper.mapType({ type: 'unknown' as any })).toBe('dynamic');
    });
  });

  describe('mapTypeWithNullability', () => {
    it('should add nullable suffix for optional types', () => {
      expect(TypeMapper.mapTypeWithNullability({ type: 'string' }, false)).toBe('String?');
      expect(TypeMapper.mapTypeWithNullability({ type: 'integer' }, false)).toBe('int?');
      expect(TypeMapper.mapTypeWithNullability({ type: 'boolean' }, false)).toBe('bool?');
    });

    it('should not add nullable suffix for required types', () => {
      expect(TypeMapper.mapTypeWithNullability({ type: 'string' }, true)).toBe('String');
      expect(TypeMapper.mapTypeWithNullability({ type: 'integer' }, true)).toBe('int');
      expect(TypeMapper.mapTypeWithNullability({ type: 'boolean' }, true)).toBe('bool');
    });

    it('should not add nullable suffix to dynamic', () => {
      expect(TypeMapper.mapTypeWithNullability({}, false)).toBe('dynamic');
      expect(TypeMapper.mapTypeWithNullability({}, true)).toBe('dynamic');
    });
  });

  describe('toDartClassName', () => {
    it('should convert to PascalCase', () => {
      expect(TypeMapper.toDartClassName('user')).toBe('User');
      expect(TypeMapper.toDartClassName('user_profile')).toBe('UserProfile');
      expect(TypeMapper.toDartClassName('user-profile')).toBe('UserProfile');
      expect(TypeMapper.toDartClassName('user.profile')).toBe('UserProfile');
      expect(TypeMapper.toDartClassName('USER_PROFILE')).toBe('UserProfile');
    });

    it('should handle special cases', () => {
      expect(TypeMapper.toDartClassName('id')).toBe('Id');
      expect(TypeMapper.toDartClassName('api')).toBe('Api');
      expect(TypeMapper.toDartClassName('url')).toBe('Url');
      expect(TypeMapper.toDartClassName('dto')).toBe('Dto');
    });

    it('should handle empty string', () => {
      expect(TypeMapper.toDartClassName('')).toBe('');
    });

    it('should handle already PascalCase', () => {
      expect(TypeMapper.toDartClassName('UserProfile')).toBe('UserProfile');
      expect(TypeMapper.toDartClassName('APIResponse')).toBe('ApiResponse');
    });
  });

  describe('toDartPropertyName', () => {
    it('should convert to camelCase', () => {
      expect(TypeMapper.toDartPropertyName('user_name')).toBe('userName');
      expect(TypeMapper.toDartPropertyName('user-name')).toBe('userName');
      expect(TypeMapper.toDartPropertyName('user.name')).toBe('userName');
      expect(TypeMapper.toDartPropertyName('USER_NAME')).toBe('userName');
    });

    it('should handle header names', () => {
      expect(TypeMapper.toDartPropertyName('x-api-key')).toBe('xApiKey');
      expect(TypeMapper.toDartPropertyName('X-Api-Key')).toBe('xApiKey');
      expect(TypeMapper.toDartPropertyName('x-company-staff-id')).toBe('xCompanyStaffId');
    });

    it('should handle single word', () => {
      expect(TypeMapper.toDartPropertyName('name')).toBe('name');
      expect(TypeMapper.toDartPropertyName('NAME')).toBe('name');
      expect(TypeMapper.toDartPropertyName('Name')).toBe('name');
    });

    it('should handle already camelCase', () => {
      expect(TypeMapper.toDartPropertyName('userName')).toBe('userName');
      expect(TypeMapper.toDartPropertyName('isActive')).toBe('isActive');
    });
  });

  describe('toSnakeCase', () => {
    it('should convert to snake_case', () => {
      expect(TypeMapper.toSnakeCase('UserProfile')).toBe('user_profile');
      expect(TypeMapper.toSnakeCase('userProfile')).toBe('user_profile');
      expect(TypeMapper.toSnakeCase('user-profile')).toBe('user_profile');
      expect(TypeMapper.toSnakeCase('user.profile')).toBe('user_profile');
    });

    it('should handle uppercase', () => {
      expect(TypeMapper.toSnakeCase('USER_PROFILE')).toBe('user_profile');
      expect(TypeMapper.toSnakeCase('USERPROFILE')).toBe('userprofile');
      expect(TypeMapper.toSnakeCase('APIResponse')).toBe('api_response');
    });

    it('should handle consecutive capitals', () => {
      expect(TypeMapper.toSnakeCase('HTTPSConnection')).toBe('https_connection');
      expect(TypeMapper.toSnakeCase('XMLParser')).toBe('xml_parser');
      expect(TypeMapper.toSnakeCase('IOError')).toBe('io_error');
    });

    it('should handle numbers', () => {
      expect(TypeMapper.toSnakeCase('User2Profile')).toBe('user2_profile');
      expect(TypeMapper.toSnakeCase('v2API')).toBe('v2_api');
    });
  });

  describe('extractTypeFromRef', () => {
    it('should extract type from component schema reference', () => {
      expect(TypeMapper.extractTypeFromRef('#/components/schemas/User')).toBe('User');
      expect(TypeMapper.extractTypeFromRef('#/components/schemas/ProductDetails')).toBe('ProductDetails');
      expect(TypeMapper.extractTypeFromRef('#/components/schemas/Very_Complex-Name123')).toBe('Very_Complex-Name123');
    });

    it('should handle external references', () => {
      expect(TypeMapper.extractTypeFromRef('external.yaml#/components/schemas/User')).toBe('User');
      expect(TypeMapper.extractTypeFromRef('./common.yaml#/definitions/BaseEntity')).toBe('BaseEntity');
    });

    it('should handle invalid references', () => {
      expect(TypeMapper.extractTypeFromRef('')).toBe('');
      expect(TypeMapper.extractTypeFromRef('not-a-reference')).toBe('');
      expect(TypeMapper.extractTypeFromRef('#/invalid/path')).toBe('');
    });
  });

  describe('getImportsForType', () => {
    it('should return imports for Uint8List', () => {
      const imports = TypeMapper.getImportsForType('Uint8List');
      expect(imports).toContain('dart:typed_data');
    });

    it('should return imports for List<Uint8List>', () => {
      const imports = TypeMapper.getImportsForType('List<Uint8List>');
      expect(imports).toContain('dart:typed_data');
    });

    it('should return empty array for basic types', () => {
      expect(TypeMapper.getImportsForType('String')).toEqual([]);
      expect(TypeMapper.getImportsForType('int')).toEqual([]);
      expect(TypeMapper.getImportsForType('bool')).toEqual([]);
      expect(TypeMapper.getImportsForType('double')).toEqual([]);
      expect(TypeMapper.getImportsForType('DateTime')).toEqual([]);
    });

    it('should return empty array for collections of basic types', () => {
      expect(TypeMapper.getImportsForType('List<String>')).toEqual([]);
      expect(TypeMapper.getImportsForType('Map<String, dynamic>')).toEqual([]);
    });
  });

  describe('isDartReservedKeyword', () => {
    it('should identify Dart keywords', () => {
      expect(TypeMapper.isDartReservedKeyword('class')).toBe(true);
      expect(TypeMapper.isDartReservedKeyword('enum')).toBe(true);
      expect(TypeMapper.isDartReservedKeyword('extends')).toBe(true);
      expect(TypeMapper.isDartReservedKeyword('implements')).toBe(true);
      expect(TypeMapper.isDartReservedKeyword('with')).toBe(true);
      expect(TypeMapper.isDartReservedKeyword('mixin')).toBe(true);
      expect(TypeMapper.isDartReservedKeyword('if')).toBe(true);
      expect(TypeMapper.isDartReservedKeyword('else')).toBe(true);
      expect(TypeMapper.isDartReservedKeyword('for')).toBe(true);
      expect(TypeMapper.isDartReservedKeyword('while')).toBe(true);
      expect(TypeMapper.isDartReservedKeyword('switch')).toBe(true);
      expect(TypeMapper.isDartReservedKeyword('case')).toBe(true);
      expect(TypeMapper.isDartReservedKeyword('default')).toBe(true);
      expect(TypeMapper.isDartReservedKeyword('return')).toBe(true);
    });

    it('should identify non-keywords', () => {
      expect(TypeMapper.isDartReservedKeyword('user')).toBe(false);
      expect(TypeMapper.isDartReservedKeyword('name')).toBe(false);
      expect(TypeMapper.isDartReservedKeyword('className')).toBe(false);
    });
  });

  // sanitizeDartIdentifier method is not implemented yet
  describe.skip('sanitizeDartIdentifier', () => {
    it('should escape Dart keywords', () => {
      // expect(TypeMapper.sanitizeDartIdentifier('class')).toBe('class_');
      // expect(TypeMapper.sanitizeDartIdentifier('enum')).toBe('enum_');
      // expect(TypeMapper.sanitizeDartIdentifier('default')).toBe('default_');
    });

    it('should not escape non-keywords', () => {
      // expect(TypeMapper.sanitizeDartIdentifier('user')).toBe('user');
      // expect(TypeMapper.sanitizeDartIdentifier('name')).toBe('name');
    });

    it('should handle empty string', () => {
      // expect(TypeMapper.sanitizeDartIdentifier('')).toBe('');
    });
  });
});