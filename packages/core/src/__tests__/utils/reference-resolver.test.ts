/**
 * Tests for ReferenceResolver utility
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { ReferenceResolver } from '../../resolvers';
import type { OpenAPIV3 } from 'openapi-types';

describe('ReferenceResolver', () => {
  let resolver: ReferenceResolver;
  let spec: OpenAPIV3.Document;

  beforeEach(() => {
    spec = {
      openapi: '3.0.0',
      info: { title: 'Test API', version: '1.0.0' },
      paths: {},
      components: {
        schemas: {
          BaseModel: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              createdAt: { type: 'string', format: 'date-time' },
              updatedAt: { type: 'string', format: 'date-time' }
            },
            required: ['id']
          },
          User: {
            allOf: [
              { $ref: '#/components/schemas/BaseModel' },
              {
                type: 'object',
                properties: {
                  username: { type: 'string' },
                  email: { type: 'string', format: 'email' },
                  role: { $ref: '#/components/schemas/UserRole' }
                },
                required: ['username', 'email']
              }
            ]
          },
          UserRole: {
            type: 'string',
            enum: ['admin', 'user', 'guest']
          },
          Product: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              name: { type: 'string' },
              price: { type: 'number' },
              category: { $ref: '#/components/schemas/Category' }
            },
            required: ['id', 'name', 'price']
          },
          Category: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              name: { type: 'string' },
              parent: { $ref: '#/components/schemas/Category' }
            },
            required: ['id', 'name']
          },
          OrderStatus: {
            oneOf: [
              { const: 'pending', description: 'Order is pending' },
              { const: 'processing', description: 'Order is being processed' },
              { const: 'completed', description: 'Order has been completed' },
              { const: 'cancelled', description: 'Order was cancelled' }
            ]
          },
          PaymentMethod: {
            anyOf: [
              { type: 'object', properties: { type: { const: 'card' }, last4: { type: 'string' } } },
              { type: 'object', properties: { type: { const: 'paypal' }, email: { type: 'string' } } },
              { type: 'object', properties: { type: { const: 'bank' }, accountNumber: { type: 'string' } } }
            ]
          }
        },
        parameters: {
          PageParam: {
            name: 'page',
            in: 'query',
            schema: { type: 'integer', minimum: 1, default: 1 },
            description: 'Page number'
          },
          LimitParam: {
            name: 'limit',
            in: 'query',
            schema: { type: 'integer', minimum: 1, maximum: 100, default: 20 },
            description: 'Items per page'
          },
          IdParam: {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'string', format: 'uuid' },
            description: 'Resource ID'
          }
        },
        responses: {
          NotFound: {
            description: 'Resource not found',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    error: { type: 'string' },
                    message: { type: 'string' }
                  },
                  required: ['error', 'message']
                }
              }
            }
          },
          Unauthorized: {
            description: 'Unauthorized access',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    error: { const: 'unauthorized' },
                    message: { type: 'string' }
                  }
                }
              }
            }
          }
        },
        requestBodies: {
          CreateUser: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    username: { type: 'string' },
                    email: { type: 'string', format: 'email' },
                    password: { type: 'string', minLength: 8 }
                  },
                  required: ['username', 'email', 'password']
                }
              }
            }
          }
        }
      }
    } as OpenAPIV3.Document;

    resolver = new ReferenceResolver(spec);
  });

  describe('resolve', () => {
    it('should resolve schema references', () => {
      const resolved = resolver.resolve({ $ref: '#/components/schemas/User' });
      expect(resolved).toBeDefined();
      expect(resolved.allOf).toBeDefined();
    });

    it('should resolve parameter references', () => {
      const resolved = resolver.resolve({ $ref: '#/components/parameters/PageParam' });
      expect(resolved).toBeDefined();
      expect(resolved.name).toBe('page');
      expect(resolved.in).toBe('query');
    });

    it('should resolve response references', () => {
      const resolved = resolver.resolve({ $ref: '#/components/responses/NotFound' });
      expect(resolved).toBeDefined();
      expect(resolved.description).toBe('Resource not found');
    });

    it('should resolve request body references', () => {
      const resolved = resolver.resolve({ $ref: '#/components/requestBodies/CreateUser' });
      expect(resolved).toBeDefined();
      expect(resolved.required).toBe(true);
    });

    it('should return original object if no $ref', () => {
      const obj = { type: 'string' };
      const resolved = resolver.resolve(obj);
      expect(resolved).toBe(obj);
    });

    it('should handle invalid references', () => {
      const resolved = resolver.resolve({ $ref: '#/components/schemas/NonExistent' });
      expect(resolved).toEqual({ $ref: '#/components/schemas/NonExistent' });
    });
  });

  describe('resolveDeep', () => {
    it('should resolve nested references', () => {
      const resolved = resolver.resolveDeep({ $ref: '#/components/schemas/Product' });
      expect(resolved).toBeDefined();
      expect(resolved.properties?.category).toBeDefined();
      expect(resolved.properties?.category.properties?.name).toBeDefined();
    });

    it('should resolve allOf compositions', () => {
      const resolved = resolver.resolveDeep({ $ref: '#/components/schemas/User' });
      expect(resolved).toBeDefined();
      // Should have merged properties from BaseModel and User
      expect(resolved.properties?.id).toBeDefined();
      expect(resolved.properties?.username).toBeDefined();
    });

    it('should handle circular references', () => {
      const resolved = resolver.resolveDeep({ $ref: '#/components/schemas/Category' });
      expect(resolved).toBeDefined();
      expect(resolved.properties?.parent).toBeDefined();
      // Should not infinitely recurse
      expect(resolved.properties?.parent.$ref).toBe('#/components/schemas/Category');
    });

    it('should resolve arrays with references', () => {
      const schema = {
        type: 'array' as const,
        items: { $ref: '#/components/schemas/Product' }
      };
      const resolved = resolver.resolveDeep(schema);
      expect(resolved.type).toBe('array');
      expect(resolved.items?.properties?.name).toBeDefined();
    });
  });

  describe('getModelType', () => {
    it('should get model type from schema reference', () => {
      const type = resolver.getModelType({ $ref: '#/components/schemas/User' });
      expect(type).toBe('User');
    });

    it('should get model type from array of references', () => {
      const schema = {
        type: 'array' as const,
        items: { $ref: '#/components/schemas/Product' }
      };
      const type = resolver.getModelType(schema);
      expect(type).toBe('List<Product>');
    });

    it('should return dynamic for non-reference schemas', () => {
      const type = resolver.getModelType({ type: 'string' });
      expect(type).toBe('String');
    });

    it('should handle nullable types', () => {
      const type = resolver.getModelType({ $ref: '#/components/schemas/Category' }, false);
      expect(type).toBe('Category?');
    });
  });

  describe('getImports', () => {
    it('should get imports for model references', () => {
      const imports = resolver.getImports({ $ref: '#/components/schemas/User' });
      expect(imports).toContain('user.f.dart');
    });

    it('should get imports for enum references', () => {
      const imports = resolver.getImports({ $ref: '#/components/schemas/UserRole' });
      expect(imports).toContain('user_role.dart');
    });

    it('should get imports for array of references', () => {
      const schema = {
        type: 'array' as const,
        items: { $ref: '#/components/schemas/Product' }
      };
      const imports = resolver.getImports(schema);
      expect(imports).toContain('product.f.dart');
    });

    it('should not duplicate imports', () => {
      const schema = {
        type: 'object' as const,
        properties: {
          user1: { $ref: '#/components/schemas/User' },
          user2: { $ref: '#/components/schemas/User' }
        }
      };
      const imports = resolver.getImports(schema);
      const userImports = imports.filter(imp => imp === 'user.f.dart');
      expect(userImports).toHaveLength(1);
    });

    it('should return empty array for basic types', () => {
      const imports = resolver.getImports({ type: 'string' });
      expect(imports).toEqual([]);
    });
  });

  describe('isCircularReference', () => {
    it('should detect direct circular references', () => {
      const isCircular = resolver.isCircularReference(
        '#/components/schemas/Category',
        ['#/components/schemas/Category']
      );
      expect(isCircular).toBe(true);
    });

    it('should detect indirect circular references', () => {
      const path = [
        '#/components/schemas/Product',
        '#/components/schemas/Category',
        '#/components/schemas/ParentCategory'
      ];
      const isCircular = resolver.isCircularReference(
        '#/components/schemas/Product',
        path
      );
      expect(isCircular).toBe(true);
    });

    it('should not detect false positives', () => {
      const path = [
        '#/components/schemas/User',
        '#/components/schemas/Role'
      ];
      const isCircular = resolver.isCircularReference(
        '#/components/schemas/Product',
        path
      );
      expect(isCircular).toBe(false);
    });
  });

  describe('mergeAllOf', () => {
    it('should merge allOf schemas', () => {
      const schema = {
        allOf: [
          { type: 'object' as const, properties: { id: { type: 'string' as const } } },
          { type: 'object' as const, properties: { name: { type: 'string' as const } } }
        ]
      };
      const merged = resolver.mergeAllOf(schema);
      expect(merged.properties?.id).toBeDefined();
      expect(merged.properties?.name).toBeDefined();
    });

    it('should merge required arrays', () => {
      const schema = {
        allOf: [
          { type: 'object' as const, required: ['id'] },
          { type: 'object' as const, required: ['name', 'email'] }
        ]
      };
      const merged = resolver.mergeAllOf(schema);
      expect(merged.required).toEqual(['id', 'name', 'email']);
    });

    it('should resolve references in allOf', () => {
      const userSchema = spec.components?.schemas?.User as OpenAPIV3.SchemaObject;
      const merged = resolver.mergeAllOf(userSchema);
      // Should have properties from both BaseModel and User
      expect(merged.properties?.id).toBeDefined();
      expect(merged.properties?.createdAt).toBeDefined();
      expect(merged.properties?.username).toBeDefined();
    });
  });

  describe('getSchemaName', () => {
    it('should extract schema name from reference', () => {
      const name = resolver.getSchemaName('#/components/schemas/Product');
      expect(name).toBe('Product');
    });

    it('should handle complex names', () => {
      const name = resolver.getSchemaName('#/components/schemas/Very_Complex-Name123');
      expect(name).toBe('Very_Complex-Name123');
    });

    it('should return null for invalid references', () => {
      const name = resolver.getSchemaName('#/invalid/path');
      expect(name).toBeNull();
    });

    it('should return null for non-references', () => {
      const name = resolver.getSchemaName('not-a-reference');
      expect(name).toBeNull();
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty components', () => {
      const emptySpec = {
        openapi: '3.0.0',
        info: { title: 'Empty', version: '1.0.0' },
        paths: {}
      } as OpenAPIV3.Document;
      const emptyResolver = new ReferenceResolver(emptySpec);
      const resolved = emptyResolver.resolve({ $ref: '#/components/schemas/Test' });
      expect(resolved).toEqual({ $ref: '#/components/schemas/Test' });
    });

    it('should handle oneOf schemas', () => {
      const resolved = resolver.resolve({ $ref: '#/components/schemas/OrderStatus' });
      expect(resolved.oneOf).toBeDefined();
      expect(resolved.oneOf).toHaveLength(4);
    });

    it('should handle anyOf schemas', () => {
      const resolved = resolver.resolve({ $ref: '#/components/schemas/PaymentMethod' });
      expect(resolved.anyOf).toBeDefined();
      expect(resolved.anyOf).toHaveLength(3);
    });

    it('should handle external references gracefully', () => {
      const resolved = resolver.resolve({ $ref: 'external.yaml#/components/schemas/External' });
      expect(resolved).toEqual({ $ref: 'external.yaml#/components/schemas/External' });
    });
  });
});
