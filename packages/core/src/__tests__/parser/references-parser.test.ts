/**
 * Tests for OpenAPI references resolution
 */

import { describe, it, expect } from 'vitest';
import { resolveReference, extractRefName, isReference } from '../../parser/references';

describe('References Parser', () => {
  describe('isReference', () => {
    it('should identify valid references', () => {
      expect(isReference({ $ref: '#/components/schemas/User' })).toBe(true);
      expect(isReference({ $ref: '#/components/parameters/PageParam' })).toBe(true);
      expect(isReference({ $ref: '#/components/responses/NotFound' })).toBe(true);
    });

    it('should identify non-references', () => {
      expect(isReference({ type: 'string' })).toBe(false);
      expect(isReference({ properties: {} })).toBe(false);
      expect(isReference({})).toBe(false);
      expect(isReference(null)).toBe(false);
      expect(isReference(undefined)).toBe(false);
    });
  });

  describe('extractRefName', () => {
    it('should extract schema names from references', () => {
      expect(extractRefName('#/components/schemas/User')).toBe('User');
      expect(extractRefName('#/components/schemas/ProductDetails')).toBe('ProductDetails');
      expect(extractRefName('#/components/schemas/Very_Complex-Name123')).toBe('Very_Complex-Name123');
    });

    it('should extract parameter names from references', () => {
      expect(extractRefName('#/components/parameters/PageParam')).toBe('PageParam');
      expect(extractRefName('#/components/parameters/ApiKeyHeader')).toBe('ApiKeyHeader');
    });

    it('should extract response names from references', () => {
      expect(extractRefName('#/components/responses/NotFound')).toBe('NotFound');
      expect(extractRefName('#/components/responses/ServerError')).toBe('ServerError');
    });

    it('should handle external references', () => {
      expect(extractRefName('external.yaml#/components/schemas/SharedModel')).toBe('SharedModel');
      expect(extractRefName('./common.yaml#/definitions/BaseEntity')).toBe('BaseEntity');
    });

    it('should return empty string for invalid references', () => {
      expect(extractRefName('')).toBe('');
      expect(extractRefName('#/invalid/path')).toBe('');
      expect(extractRefName('not-a-reference')).toBe('');
    });
  });

  describe('resolveReference', () => {
    const spec = {
      components: {
        schemas: {
          User: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              name: { type: 'string' }
            }
          },
          Product: {
            type: 'object',
            properties: {
              title: { type: 'string' },
              owner: { $ref: '#/components/schemas/User' }
            }
          }
        },
        parameters: {
          PageParam: {
            name: 'page',
            in: 'query',
            schema: { type: 'integer' }
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
                    error: { type: 'string' }
                  }
                }
              }
            }
          }
        }
      }
    };

    it('should resolve schema references', () => {
      const resolved = resolveReference('#/components/schemas/User', spec);
      expect(resolved).toEqual(spec.components.schemas.User);
    });

    it('should resolve parameter references', () => {
      const resolved = resolveReference('#/components/parameters/PageParam', spec);
      expect(resolved).toEqual(spec.components.parameters.PageParam);
    });

    it('should resolve response references', () => {
      const resolved = resolveReference('#/components/responses/NotFound', spec);
      expect(resolved).toEqual(spec.components.responses.NotFound);
    });

    it('should resolve nested references', () => {
      const resolved = resolveReference('#/components/schemas/Product', spec);
      expect(resolved.properties.owner.$ref).toBe('#/components/schemas/User');
    });

    it('should return undefined for invalid references', () => {
      expect(resolveReference('#/components/schemas/NonExistent', spec)).toBeUndefined();
      expect(resolveReference('#/invalid/path/User', spec)).toBeUndefined();
      expect(resolveReference('', spec)).toBeUndefined();
    });

    it('should handle missing components section', () => {
      const emptySpec = {};
      expect(resolveReference('#/components/schemas/User', emptySpec)).toBeUndefined();
    });
  });

  describe('Circular Reference Detection', () => {
    it('should detect direct circular references', () => {
      const spec = {
        components: {
          schemas: {
            Node: {
              type: 'object',
              properties: {
                value: { type: 'string' },
                self: { $ref: '#/components/schemas/Node' }
              }
            }
          }
        }
      };

      const node = resolveReference('#/components/schemas/Node', spec);
      expect(node.properties.self.$ref).toBe('#/components/schemas/Node');
    });

    it('should detect indirect circular references', () => {
      const spec = {
        components: {
          schemas: {
            Parent: {
              type: 'object',
              properties: {
                child: { $ref: '#/components/schemas/Child' }
              }
            },
            Child: {
              type: 'object',
              properties: {
                parent: { $ref: '#/components/schemas/Parent' }
              }
            }
          }
        }
      };

      const parent = resolveReference('#/components/schemas/Parent', spec);
      const child = resolveReference('#/components/schemas/Child', spec);
      
      expect(parent.properties.child.$ref).toBe('#/components/schemas/Child');
      expect(child.properties.parent.$ref).toBe('#/components/schemas/Parent');
    });
  });
});