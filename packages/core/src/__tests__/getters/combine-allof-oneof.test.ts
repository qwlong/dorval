import { describe, it, expect } from 'vitest';
import { getObject } from '../../getters/object';

describe('AllOf and OneOf Property Resolution', () => {
  describe('AllOf with single $ref', () => {
    it('should resolve allOf with single $ref to the referenced type', () => {
      const schema = {
        type: 'object',
        properties: {
          location: {
            description: 'Enriched location data',
            allOf: [
              {
                $ref: '#/components/schemas/LocationDto'
              }
            ]
          }
        },
        required: ['location']
      };

      const result = getObject(schema, 'TestModel');
      
      expect(result.definition).toContain("import 'location_dto.f.dart';");
      expect(result.definition).toContain('required LocationDto location,');
      expect(result.definition).not.toContain('required dynamic location,');
    });

    it('should handle multiple properties with allOf', () => {
      const schema = {
        type: 'object',
        properties: {
          primaryLocation: {
            allOf: [{ $ref: '#/components/schemas/LocationDto' }]
          },
          secondaryLocation: {
            allOf: [{ $ref: '#/components/schemas/LocationDto' }]
          },
          office: {
            allOf: [{ $ref: '#/components/schemas/OfficeDto' }]
          }
        },
        required: ['primaryLocation', 'secondaryLocation', 'office']
      };

      const result = getObject(schema, 'MultiLocationModel');
      
      expect(result.definition).toContain("import 'location_dto.f.dart';");
      expect(result.definition).toContain("import 'office_dto.f.dart';");
      expect(result.definition).toContain('required LocationDto primaryLocation,');
      expect(result.definition).toContain('required LocationDto secondaryLocation,');
      expect(result.definition).toContain('required OfficeDto office,');
    });
  });

  describe('OneOf with $ref and null', () => {
    it('should resolve oneOf with $ref and null to nullable type', () => {
      const schema = {
        type: 'object',
        properties: {
          role: {
            description: 'User role',
            oneOf: [
              {
                $ref: '#/components/schemas/RoleDto'
              },
              {
                type: 'null'
              }
            ]
          }
        },
        required: ['role']
      };

      const result = getObject(schema, 'UserModel');
      
      expect(result.definition).toContain("import 'role_dto.f.dart';");
      expect(result.definition).toContain('required RoleDto? role,');
      expect(result.definition).not.toContain('required dynamic role,');
    });

    it('should handle oneOf with primitive type and null', () => {
      const schema = {
        type: 'object',
        properties: {
          count: {
            oneOf: [
              { type: 'number' },
              { type: 'null' }
            ]
          }
        },
        required: ['count']
      };

      const result = getObject(schema, 'CountModel');
      
      expect(result.definition).toContain('required double? count,');
      expect(result.definition).not.toContain('required dynamic count,');
    });
  });

  describe('Complex OneOf cases', () => {
    it('should use dynamic for oneOf with multiple non-null types', () => {
      const schema = {
        type: 'object',
        properties: {
          value: {
            oneOf: [
              { type: 'string' },
              { type: 'number' },
              { type: 'boolean' },
              { type: 'object' },
              { type: 'null' }
            ]
          }
        },
        required: ['value']
      };

      const result = getObject(schema, 'FlexibleValueModel');
      
      // This should correctly be dynamic since it can be multiple types
      expect(result.definition).toContain('required dynamic value,');
    });

    it('should handle oneOf with multiple $refs', () => {
      const schema = {
        type: 'object',
        properties: {
          result: {
            oneOf: [
              { $ref: '#/components/schemas/SuccessDto' },
              { $ref: '#/components/schemas/ErrorDto' }
            ]
          }
        },
        required: ['result']
      };

      const result = getObject(schema, 'ResultModel');
      
      // Multiple refs without discriminator should be dynamic for now
      expect(result.definition).toContain('required dynamic result,');
    });
  });

  describe('Direct $ref properties', () => {
    it('should handle direct $ref without allOf or oneOf', () => {
      const schema = {
        type: 'object',
        properties: {
          user: {
            $ref: '#/components/schemas/UserDto'
          },
          company: {
            $ref: '#/components/schemas/CompanyDto'
          }
        },
        required: ['user', 'company']
      };

      const result = getObject(schema, 'AccountModel');
      
      expect(result.definition).toContain("import 'user_dto.f.dart';");
      expect(result.definition).toContain("import 'company_dto.f.dart';");
      expect(result.definition).toContain('required UserDto user,');
      expect(result.definition).toContain('required CompanyDto company,');
    });
  });

  describe('Mixed property types', () => {
    it('should handle model with various property patterns', () => {
      const schema = {
        type: 'object',
        properties: {
          // Direct $ref
          owner: {
            $ref: '#/components/schemas/UserDto'
          },
          // AllOf with single $ref
          location: {
            allOf: [{ $ref: '#/components/schemas/LocationDto' }]
          },
          // OneOf with $ref and null
          manager: {
            oneOf: [
              { $ref: '#/components/schemas/UserDto' },
              { type: 'null' }
            ]
          },
          // Primitive type
          name: {
            type: 'string'
          },
          // Array of refs
          tags: {
            type: 'array',
            items: {
              $ref: '#/components/schemas/TagDto'
            }
          }
        },
        required: ['owner', 'location', 'manager', 'name', 'tags']
      };

      const result = getObject(schema, 'ComplexModel');
      
      expect(result.definition).toContain("import 'user_dto.f.dart';");
      expect(result.definition).toContain("import 'location_dto.f.dart';");
      expect(result.definition).toContain("import 'tag_dto.f.dart';");
      expect(result.definition).toContain('required UserDto owner,');
      expect(result.definition).toContain('required LocationDto location,');
      expect(result.definition).toContain('required UserDto? manager,');
      expect(result.definition).toContain('required String name,');
      expect(result.definition).toContain('required List<TagDto> tags,');
    });
  });

  describe('Real-world examples from shift API', () => {
    it('should handle TodayShiftResponseDto pattern', () => {
      const schema = {
        type: 'object',
        properties: {
          locationId: {
            type: 'string',
            description: 'Core location ID'
          },
          location: {
            description: 'Enriched core location data',
            allOf: [
              {
                $ref: '#/components/schemas/CoreLocationDto'
              }
            ]
          },
          role: {
            description: 'Enriched shift role data',
            oneOf: [
              {
                $ref: '#/components/schemas/RoleResponseDto'
              },
              {
                type: 'null'
              }
            ]
          }
        },
        required: ['locationId', 'location', 'role']
      };

      const result = getObject(schema, 'TodayShiftResponseDto');
      
      expect(result.definition).toContain("import 'core_location_dto.f.dart';");
      expect(result.definition).toContain("import 'role_response_dto.f.dart';");
      expect(result.definition).toContain('required String locationId,');
      expect(result.definition).toContain('required CoreLocationDto location,');
      expect(result.definition).toContain('required RoleResponseDto? role,');
    });
  });
});