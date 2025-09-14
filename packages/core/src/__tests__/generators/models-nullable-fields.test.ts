/**
 * Tests for nullable field handling in Freezed models
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { ModelGenerator } from '../../generators';
import { ReferenceResolver } from '../../resolvers';

describe('Nullable Field Handling', () => {
  let generator: ModelGenerator;

  beforeEach(() => {
    generator = new ModelGenerator();
  });

  it('should add ? only for optional fields without default', () => {
    const schema = {
      type: 'object' as const,
      properties: {
        requiredField: { type: 'string' as const },
        optionalField: { type: 'string' as const },
        fieldWithDefault: { type: 'string' as const, default: 'test' }
      },
      required: ['requiredField']
    } as any;

    const result = generator.generateModel('TestModel', schema);

    expect(result.content).toContain('required String requiredField');
    expect(result.content).toContain('String? optionalField');
    expect(result.content).toContain("@Default('test') String fieldWithDefault");
    expect(result.content).not.toContain('String??');
  });

  it('should handle nullable property from OpenAPI spec', () => {
    const schema = {
      type: 'object' as const,
      properties: {
        nullableField: { type: 'string' as const, nullable: true },
        nonNullableField: { type: 'string' as const }
      },
      required: ['nonNullableField']
    } as any;

    const result = generator.generateModel('TestModel', schema);

    expect(result.content).toContain('String? nullableField');
    expect(result.content).toContain('required String nonNullableField');
    expect(result.content).not.toContain('String??');
  });

  it('should handle references with ReferenceResolver', () => {
    const schemas = {
      openapi: '3.0.0',
      info: { title: 'Test', version: '1.0' },
      paths: {},
      components: {
        schemas: {
          'User': {
            type: 'object' as const,
            properties: {
              id: { type: 'string' as const },
              name: { type: 'string' as const }
            },
            required: ['id']
          }
        }
      }
    } as any;

    const refResolver = new ReferenceResolver(schemas);
    generator.setReferenceResolver(refResolver);

    const schema = {
      type: 'object' as const,
      properties: {
        requiredUser: { $ref: '#/components/schemas/User' },
        optionalUser: { $ref: '#/components/schemas/User' }
      },
      required: ['requiredUser']
    } as any;

    const result = generator.generateModel('TestModel', schema);

    expect(result.content).toContain('required User requiredUser');
    expect(result.content).toContain('User? optionalUser');
    expect(result.content).not.toContain('User??');
  });

  it('should handle DateTime fields correctly', () => {
    const schema = {
      type: 'object' as const,
      properties: {
        createdAt: { type: 'string' as const, format: 'date-time' },
        updatedAt: { type: 'string' as const, format: 'date-time' }
      },
      required: ['createdAt']
    } as any;

    const result = generator.generateModel('TestModel', schema);

    expect(result.content).toContain('required DateTime createdAt');
    expect(result.content).toContain('DateTime? updatedAt');
    expect(result.content).not.toContain('DateTime??');
  });

  it('should handle array types correctly', () => {
    const schema = {
      type: 'object' as const,
      properties: {
        requiredList: {
          type: 'array' as const,
          items: { type: 'string' as const }
        },
        optionalList: {
          type: 'array' as const,
          items: { type: 'string' as const }
        },
        listWithDefault: {
          type: 'array' as const,
          items: { type: 'string' as const },
          default: []
        }
      },
      required: ['requiredList']
    } as any;

    const result = generator.generateModel('TestModel', schema);

    expect(result.content).toContain('required List<String> requiredList');
    expect(result.content).toContain('List<String>? optionalList');
    expect(result.content).toContain('@Default(const []) List<String> listWithDefault');
    expect(result.content).not.toContain('List<String>??');
  });
});