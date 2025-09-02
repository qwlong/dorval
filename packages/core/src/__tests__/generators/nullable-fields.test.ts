/**
 * Tests for nullable field handling in Freezed models
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { ModelGenerator } from '../../generators/model-generator';
import { ReferenceResolver } from '../../resolvers/reference-resolver';
import { TypeMapper } from '../../utils/type-mapper';

describe('Nullable Field Handling', () => {
  let generator: ModelGenerator;

  beforeEach(() => {
    generator = new ModelGenerator();
  });

  it('should add ? only for optional fields without default', () => {
    const schema = {
      type: 'object',
      properties: {
        requiredField: { type: 'string' },
        optionalField: { type: 'string' },
        fieldWithDefault: { type: 'string', default: 'test' }
      },
      required: ['requiredField']
    };

    const result = generator.generateModel('TestModel', schema);
    
    expect(result.content).toContain('required String requiredField');
    expect(result.content).toContain('String? optionalField');
    expect(result.content).toContain("@Default('test') String fieldWithDefault");
    expect(result.content).not.toContain('String??');
  });

  it('should handle nullable property from OpenAPI spec', () => {
    const schema = {
      type: 'object',
      properties: {
        nullableField: { type: 'string', nullable: true },
        nonNullableField: { type: 'string' }
      },
      required: ['nonNullableField']
    };

    const result = generator.generateModel('TestModel', schema);
    
    expect(result.content).toContain('String? nullableField');
    expect(result.content).toContain('required String nonNullableField');
    expect(result.content).not.toContain('String??');
  });

  it('should handle references with ReferenceResolver', () => {
    const schemas = {
      'User': {
        type: 'object',
        properties: {
          id: { type: 'string' },
          name: { type: 'string' }
        },
        required: ['id']
      }
    };

    const refResolver = new ReferenceResolver(schemas);
    generator.setReferenceResolver(refResolver);

    const schema = {
      type: 'object',
      properties: {
        requiredUser: { $ref: '#/components/schemas/User' },
        optionalUser: { $ref: '#/components/schemas/User' }
      },
      required: ['requiredUser']
    };

    const result = generator.generateModel('TestModel', schema);
    
    expect(result.content).toContain('required User requiredUser');
    expect(result.content).toContain('User? optionalUser');
    expect(result.content).not.toContain('User??');
  });

  it('should handle DateTime fields correctly', () => {
    const schema = {
      type: 'object',
      properties: {
        createdAt: { type: 'string', format: 'date-time' },
        updatedAt: { type: 'string', format: 'date-time' }
      },
      required: ['createdAt']
    };

    const result = generator.generateModel('TestModel', schema);
    
    expect(result.content).toContain('required DateTime createdAt');
    expect(result.content).toContain('DateTime? updatedAt');
    expect(result.content).not.toContain('DateTime??');
  });

  it('should handle array types correctly', () => {
    const schema = {
      type: 'object',
      properties: {
        requiredList: { 
          type: 'array',
          items: { type: 'string' }
        },
        optionalList: { 
          type: 'array',
          items: { type: 'string' }
        },
        listWithDefault: { 
          type: 'array',
          items: { type: 'string' },
          default: []
        }
      },
      required: ['requiredList']
    };

    const result = generator.generateModel('TestModel', schema);
    
    expect(result.content).toContain('required List<String> requiredList');
    expect(result.content).toContain('List<String>? optionalList');
    expect(result.content).toContain('@Default(const []) List<String> listWithDefault');
    expect(result.content).not.toContain('List<String>??');
  });
});