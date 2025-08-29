/**
 * Tests for RefResolver utility
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { RefResolver } from '../../utils/ref-resolver';
import type { OpenAPIV3 } from 'openapi-types';

describe('RefResolver', () => {
  let resolver: RefResolver;
  let spec: OpenAPIV3.Document;

  beforeEach(() => {
    spec = {
      openapi: '3.0.0',
      info: { title: 'Test API', version: '1.0.0' },
      paths: {},
      components: {
        schemas: {
          User: {
            type: 'object',
            properties: {
              id: { type: 'string', format: 'uuid' },
              name: { type: 'string' },
              email: { type: 'string', format: 'email' },
              age: { type: 'integer' },
              createdAt: { type: 'string', format: 'date-time' }
            },
            required: ['id', 'name']
          },
          Address: {
            type: 'object',
            properties: {
              street: { type: 'string' },
              city: { type: 'string' },
              country: { type: 'string' },
              zipCode: { type: 'string' }
            },
            required: ['street', 'city', 'country']
          },
          UserWithAddress: {
            type: 'object',
            properties: {
              user: { $ref: '#/components/schemas/User' },
              address: { $ref: '#/components/schemas/Address' }
            },
            required: ['user']
          },
          ProductStatus: {
            type: 'string',
            enum: ['draft', 'published', 'archived']
          },
          Product: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              name: { type: 'string' },
              status: { $ref: '#/components/schemas/ProductStatus' },
              tags: {
                type: 'array',
                items: { type: 'string' }
              },
              owner: { $ref: '#/components/schemas/User' }
            },
            required: ['id', 'name', 'status']
          },
          RecursiveNode: {
            type: 'object',
            properties: {
              value: { type: 'string' },
              children: {
                type: 'array',
                items: { $ref: '#/components/schemas/RecursiveNode' }
              }
            }
          }
        }
      }
    } as OpenAPIV3.Document;

    resolver = new RefResolver(spec);
  });

  describe('resolvePropertyType', () => {
    it('should resolve basic types', () => {
      const result = resolver.resolvePropertyType({ type: 'string' }, true);
      expect(result.type).toBe('String');
      expect(result.imports).toEqual([]);
    });

    it('should resolve basic types with nullable', () => {
      const result = resolver.resolvePropertyType({ type: 'string' }, false);
      expect(result.type).toBe('String?');
      expect(result.imports).toEqual([]);
    });

    it('should resolve integer types', () => {
      const result = resolver.resolvePropertyType({ type: 'integer' }, true);
      expect(result.type).toBe('int');
    });

    it('should resolve number types', () => {
      const result = resolver.resolvePropertyType({ type: 'number' }, true);
      expect(result.type).toBe('double');
    });

    it('should resolve boolean types', () => {
      const result = resolver.resolvePropertyType({ type: 'boolean' }, true);
      expect(result.type).toBe('bool');
    });

    it('should resolve date-time format', () => {
      const result = resolver.resolvePropertyType(
        { type: 'string', format: 'date-time' },
        true
      );
      expect(result.type).toBe('DateTime');
    });

    it('should resolve binary format', () => {
      const result = resolver.resolvePropertyType(
        { type: 'string', format: 'binary' },
        true
      );
      expect(result.type).toBe('Uint8List');
      expect(result.imports).toContain('dart:typed_data');
    });

    it('should resolve array types', () => {
      const result = resolver.resolvePropertyType(
        { type: 'array', items: { type: 'string' } },
        true
      );
      expect(result.type).toBe('List<String>');
    });

    it('should resolve nullable array types', () => {
      const result = resolver.resolvePropertyType(
        { type: 'array', items: { type: 'integer' } },
        false
      );
      expect(result.type).toBe('List<int>?');
    });

    it('should resolve object types', () => {
      const result = resolver.resolvePropertyType({ type: 'object' }, true);
      expect(result.type).toBe('Map<String, dynamic>');
    });

    it('should resolve object with additionalProperties', () => {
      const result = resolver.resolvePropertyType(
        { type: 'object', additionalProperties: { type: 'string' } },
        true
      );
      expect(result.type).toBe('Map<String, String>');
    });
  });

  describe('resolveRef', () => {
    it('should resolve simple reference', () => {
      const result = resolver.resolveRef('#/components/schemas/User');
      expect(result.type).toBe('User');
      expect(result.import).toBe('user.f.dart');
    });

    it('should resolve reference with nullable', () => {
      const result = resolver.resolvePropertyType(
        { $ref: '#/components/schemas/User' },
        false
      );
      expect(result.type).toBe('User?');
      expect(result.imports).toContain('user.f.dart');
    });

    it('should resolve nested references', () => {
      const result = resolver.resolvePropertyType(
        { $ref: '#/components/schemas/UserWithAddress' },
        true
      );
      expect(result.type).toBe('UserWithAddress');
      expect(result.imports).toContain('user_with_address.f.dart');
    });

    it('should resolve enum references', () => {
      const result = resolver.resolvePropertyType(
        { $ref: '#/components/schemas/ProductStatus' },
        true
      );
      expect(result.type).toBe('ProductStatus');
      expect(result.imports).toContain('product_status.dart');
    });

    it('should handle invalid references', () => {
      const result = resolver.resolvePropertyType(
        { $ref: '#/components/schemas/NonExistent' },
        true
      );
      expect(result.type).toBe('dynamic');
      expect(result.imports).toEqual([]);
    });
  });

  describe('resolveResponseType', () => {
    it('should resolve response with schema', () => {
      const response: OpenAPIV3.ResponseObject = {
        description: 'Success',
        content: {
          'application/json': {
            schema: { type: 'string' }
          }
        }
      };

      const result = resolver.resolveResponseType(response);
      expect(result.type).toBe('String');
    });

    it('should resolve response with reference', () => {
      const response: OpenAPIV3.ResponseObject = {
        description: 'Success',
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/User' }
          }
        }
      };

      const result = resolver.resolveResponseType(response);
      expect(result.type).toBe('User');
      expect(result.imports).toContain('user.f.dart');
    });

    it('should resolve array response', () => {
      const response: OpenAPIV3.ResponseObject = {
        description: 'Success',
        content: {
          'application/json': {
            schema: {
              type: 'array',
              items: { $ref: '#/components/schemas/Product' }
            }
          }
        }
      };

      const result = resolver.resolveResponseType(response);
      expect(result.type).toBe('List<Product>');
      expect(result.imports).toContain('product.f.dart');
    });

    it('should handle response without content', () => {
      const response: OpenAPIV3.ResponseObject = {
        description: 'No Content'
      };

      const result = resolver.resolveResponseType(response);
      expect(result.type).toBe('void');
      expect(result.imports).toEqual([]);
    });

    it('should handle response with multiple content types', () => {
      const response: OpenAPIV3.ResponseObject = {
        description: 'Success',
        content: {
          'application/xml': {
            schema: { type: 'string' }
          },
          'application/json': {
            schema: { $ref: '#/components/schemas/User' }
          }
        }
      };

      const result = resolver.resolveResponseType(response);
      expect(result.type).toBe('User');
      expect(result.imports).toContain('user.f.dart');
    });
  });

  describe('resolveRequestBodyType', () => {
    it('should resolve request body with schema', () => {
      const requestBody: OpenAPIV3.RequestBodyObject = {
        required: true,
        content: {
          'application/json': {
            schema: { type: 'string' }
          }
        }
      };

      const result = resolver.resolveRequestBodyType(requestBody);
      expect(result.type).toBe('String');
    });

    it('should resolve request body with reference', () => {
      const requestBody: OpenAPIV3.RequestBodyObject = {
        required: true,
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/User' }
          }
        }
      };

      const result = resolver.resolveRequestBodyType(requestBody);
      expect(result.type).toBe('User');
      expect(result.imports).toContain('user.f.dart');
    });

    it('should resolve nullable request body', () => {
      const requestBody: OpenAPIV3.RequestBodyObject = {
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/Address' }
          }
        }
      };

      const result = resolver.resolveRequestBodyType(requestBody);
      expect(result.type).toBe('Address?');
      expect(result.imports).toContain('address.f.dart');
    });

    it('should handle request body with object schema', () => {
      const requestBody: OpenAPIV3.RequestBodyObject = {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                name: { type: 'string' },
                age: { type: 'integer' }
              }
            }
          }
        }
      };

      const result = resolver.resolveRequestBodyType(requestBody);
      expect(result.type).toBe('Map<String, dynamic>');
      expect(result.imports).toEqual([]);
    });
  });

  describe('Circular Reference Handling', () => {
    it('should handle self-referential schemas', () => {
      const result = resolver.resolvePropertyType(
        { $ref: '#/components/schemas/RecursiveNode' },
        true
      );
      expect(result.type).toBe('RecursiveNode');
      expect(result.imports).toContain('recursive_node.f.dart');
    });

    it('should handle array of self-references', () => {
      const schema = spec.components?.schemas?.RecursiveNode as OpenAPIV3.SchemaObject;
      const childrenProp = schema.properties?.children as OpenAPIV3.SchemaObject;
      
      const result = resolver.resolvePropertyType(childrenProp, true);
      expect(result.type).toBe('List<RecursiveNode>');
      expect(result.imports).toContain('recursive_node.f.dart');
    });
  });

  describe('Import Path Generation', () => {
    it('should generate correct import paths for different model types', () => {
      expect(resolver.resolveRef('#/components/schemas/User').import)
        .toBe('user.f.dart');
      
      expect(resolver.resolveRef('#/components/schemas/UserWithAddress').import)
        .toBe('user_with_address.f.dart');
      
      expect(resolver.resolveRef('#/components/schemas/ProductStatus').import)
        .toBe('product_status.dart');
    });

    it('should not generate import for inline types', () => {
      const result = resolver.resolvePropertyType(
        { type: 'string' },
        true
      );
      expect(result.imports).toEqual([]);
    });

    it('should handle special imports like Uint8List', () => {
      const result = resolver.resolvePropertyType(
        { type: 'string', format: 'binary' },
        true
      );
      expect(result.imports).toContain('dart:typed_data');
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty schema', () => {
      const result = resolver.resolvePropertyType({}, true);
      expect(result.type).toBe('dynamic');
      expect(result.imports).toEqual([]);
    });

    it('should handle null schema', () => {
      const result = resolver.resolvePropertyType(null as any, true);
      expect(result.type).toBe('dynamic');
      expect(result.imports).toEqual([]);
    });

    it('should handle undefined schema', () => {
      const result = resolver.resolvePropertyType(undefined as any, true);
      expect(result.type).toBe('dynamic');
      expect(result.imports).toEqual([]);
    });

    it('should handle schema with unknown type', () => {
      const result = resolver.resolvePropertyType(
        { type: 'unknown' as any },
        true
      );
      expect(result.type).toBe('dynamic');
    });
  });
});
