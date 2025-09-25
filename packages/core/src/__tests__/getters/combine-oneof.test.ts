import { describe, it, expect } from 'vitest';
import { combineSchemas } from '../../getters/combine';

describe('OneOf Generation', () => {
  it('should handle oneOf with discriminator', () => {
    const schema = {
      discriminator: {
        propertyName: 'itemType'
      },
      oneOf: [
        { $ref: '#/components/schemas/ShiftResponseDtoV2' },
        { $ref: '#/components/schemas/MyFeedTimeOffRequestItem' }
      ]
    };

    const result = combineSchemas(schema, 'MyFeedItem', 'oneOf');

    expect(result.type).toBe('MyFeedItem');
    expect(result.isSealed).toBe(true);
    expect(result.definition).toBeDefined();
    if (result.definition) {
      expect(result.definition).toContain('@freezed');
      expect(result.definition).toContain('sealed class MyFeedItem with _$MyFeedItem');
      expect(result.definition).toContain('factory MyFeedItem.fromJson');
    }
    expect(result.imports).toContain('shift_response_dto_v2.f.dart');
    expect(result.imports).toContain('my_feed_time_off_request_item.f.dart');
  });

  it('should handle nullable oneOf', () => {
    const schema = {
      oneOf: [
        { type: 'string' },
        { type: 'null' }
      ]
    };

    const result = combineSchemas(schema, 'Reason', 'oneOf');
    
    expect(result.type).toBe('String?');
    expect(result.imports).toEqual([]);
  });

  it('should handle oneOf with date-time and null', () => {
    const schema = {
      oneOf: [
        { type: 'string', format: 'date-time' },
        { type: 'null' }
      ]
    };

    const result = combineSchemas(schema, 'RespondedAt', 'oneOf');
    expect(result.type).toBe('DateTime?');
  });

  it('should handle oneOf without discriminator', () => {
    const schema = {
      oneOf: [
        { $ref: '#/components/schemas/TypeA' },
        { $ref: '#/components/schemas/TypeB' }
      ]
    };

    const result = combineSchemas(schema, 'UnionType', 'oneOf');
    
    expect(result.type).toBe('UnionType');
    expect(result.definition).toBeDefined();
    if (result.definition) {
      expect(result.definition).toContain('@freezed');
      expect(result.definition).toContain('sealed class UnionType with _$UnionType');
      expect(result.definition).toContain('factory UnionType.');
    }
    expect(result.imports).toContain('type_a.f.dart');
    expect(result.imports).toContain('type_b.f.dart');
  });

  it('should handle anyOf schemas', () => {
    const schema = {
      anyOf: [
        { type: 'string' },
        { type: 'number' }
      ]
    };

    const result = combineSchemas(schema, 'StringOrNumber', 'anyOf');
    
    expect(result.type).toBe('StringOrNumber');
    expect(result.definition).toBeDefined();
  });

  it('should handle allOf schemas', () => {
    const schema = {
      allOf: [
        { 
          type: 'object',
          properties: {
            id: { type: 'string' }
          },
          required: ['id']
        },
        { 
          type: 'object',
          properties: {
            name: { type: 'string' }
          },
          required: ['name']
        }
      ]
    };

    const result = combineSchemas(schema, 'CombinedType', 'allOf');
    
    expect(result.type).toBe('CombinedType');
    expect(result.definition).toBeDefined();
    if (result.definition) {
      expect(result.definition).toContain('required String id');
      expect(result.definition).toContain('required String name');
    }
  });
});