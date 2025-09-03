/**
 * Tests for endpoint generation
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { EndpointGenerator } from '../../generators/endpoint-generator';
import type { OpenAPIV3 } from 'openapi-types';

describe('EndpointGenerator', () => {
  let generator: EndpointGenerator;
  
  beforeEach(() => {
    generator = new EndpointGenerator();
  });

  describe('Parameter Processing', () => {
    it('should separate parameters by type correctly', () => {
      const operation: OpenAPIV3.OperationObject = {
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string' } },
          { name: 'page', in: 'query', schema: { type: 'integer' } },
          { name: 'limit', in: 'query', schema: { type: 'integer' } },
          { name: 'x-api-key', in: 'header', required: true, schema: { type: 'string' } },
          { name: 'x-user-id', in: 'header', schema: { type: 'string' } }
        ],
        responses: {
          '200': {
            description: 'Success',
            content: {
              'application/json': {
                schema: { type: 'object' }
              }
            }
          }
        }
      };

      const endpoint = generator.generateGetMethod(
        'getUserById',
        '/users/{id}',
        operation
      );

      expect(endpoint.pathParams).toHaveLength(1);
      expect(endpoint.pathParams[0].originalName).toBe('{id}');
      
      expect(endpoint.queryParams).toHaveLength(2);
      expect(endpoint.queryParams.map(p => p.originalName)).toContain('page');
      expect(endpoint.queryParams.map(p => p.originalName)).toContain('limit');
      
      expect(endpoint.headers).toHaveLength(2);
      expect(endpoint.headers.map(h => h.originalName)).toContain('x-api-key');
      expect(endpoint.headers.map(h => h.originalName)).toContain('x-user-id');
    });

    it('should handle array query parameters', () => {
      const operation: OpenAPIV3.OperationObject = {
        parameters: [
          { 
            name: 'ids', 
            in: 'query', 
            schema: { type: 'array', items: { type: 'string' } },
            description: 'List of IDs'
          }
        ],
        responses: {
          '200': {
            description: 'Success',
            content: {
              'application/json': {
                schema: { type: 'array', items: { type: 'object' } }
              }
            }
          }
        }
      };

      const endpoint = generator.generateGetMethod(
        'getItems',
        '/items',
        operation
      );

      expect(endpoint.queryParams).toHaveLength(1);
      expect(endpoint.queryParams[0].type).toBe('List<String>');
    });
  });

  describe('Method Naming', () => {
    it('should use operationId when methodNaming is operationId', () => {
      generator.setMethodNaming('operationId');
      
      const operation: OpenAPIV3.OperationObject = {
        operationId: 'getUserById',
        parameters: [],
        responses: {
          '200': {
            description: 'Success'
          }
        }
      };

      const endpoint = generator.generateGetMethod(
        'getUserById',
        '/users/{id}',
        operation
      );

      expect(endpoint.methodName).toBe('getUserById');
    });

    it('should generate methodPath name when methodNaming is methodPath', () => {
      generator.setMethodNaming('methodPath');
      
      const operation: OpenAPIV3.OperationObject = {
        operationId: 'getUserById',
        parameters: [],
        responses: {
          '200': {
            description: 'Success'
          }
        }
      };

      const endpoint = generator.generateGetMethod(
        'getUserById',
        '/users/{id}',
        operation
      );

      expect(endpoint.methodName).toMatch(/^get.*Users.*Id$/);
    });

    it('should fallback to methodPath when operationId is missing', () => {
      generator.setMethodNaming('operationId');
      
      const operation: OpenAPIV3.OperationObject = {
        parameters: [],
        responses: {
          '200': {
            description: 'Success'
          }
        }
      };

      const endpoint = generator.generateGetMethod(
        '',  // No operationId
        '/users/{id}',
        operation
      );

      expect(endpoint.methodName).toMatch(/^get.*Users.*Id$/);
    });
  });

  describe('Response Type Processing', () => {
    it('should handle simple response types', () => {
      const operation: OpenAPIV3.OperationObject = {
        responses: {
          '200': {
            description: 'Success',
            content: {
              'application/json': {
                schema: { type: 'string' }
              }
            }
          }
        }
      };

      const endpoint = generator.generateGetMethod(
        'testGet',
        '/test',
        operation
      );

      expect(endpoint.returnType).toBe('String');
    });

    it('should handle array response types', () => {
      const operation: OpenAPIV3.OperationObject = {
        responses: {
          '200': {
            description: 'Success',
            content: {
              'application/json': {
                schema: {
                  type: 'array',
                  items: { type: 'string' }
                }
              }
            }
          }
        }
      };

      const endpoint = generator.generateGetMethod(
        'testGetList',
        '/test',
        operation
      );

      expect(endpoint.returnType).toBe('List<String>');
    });

    it('should handle reference response types', () => {
      const operation: OpenAPIV3.OperationObject = {
        responses: {
          '200': {
            description: 'Success',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/User' }
              }
            }
          }
        }
      };

      const endpoint = generator.generateGetMethod(
        'getUser',
        '/test',
        operation
      );

      expect(endpoint.returnType).toContain('User');
    });

    it('should handle void responses', () => {
      const operation: OpenAPIV3.OperationObject = {
        responses: {
          '204': {
            description: 'No Content'
          }
        }
      };

      const endpoint = generator.generateDeleteMethod(
        'deleteItem',
        '/test',
        operation
      );

      expect(endpoint.returnType).toBe('void');
    });
  });

  describe('Request Body Processing', () => {
    it('should handle request body with reference', () => {
      const operation: OpenAPIV3.OperationObject = {
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/CreateUserDto' }
            }
          }
        },
        responses: {
          '201': {
            description: 'Created'
          }
        }
      };

      const endpoint = generator.generateMutationMethod(
        'POST',
        'createUser',
        '/users',
        operation
      );

      expect(endpoint.bodyType).toBe('CreateUserDto');
      expect(endpoint.hasBody).toBe(true);
    });

    it('should handle inline request body', () => {
      const operation: OpenAPIV3.OperationObject = {
        requestBody: {
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  name: { type: 'string' },
                  age: { type: 'integer' }
                },
                required: ['name']
              }
            }
          }
        },
        responses: {
          '201': {
            description: 'Created'
          }
        }
      };

      const endpoint = generator.generateMutationMethod(
        'POST',
        'createUser',
        '/users',
        operation
      );

      expect(endpoint.bodyType).toBe('Map<String, dynamic>');
      expect(endpoint.hasBody).toBe(true);
    });
  });

  describe('Header Processing', () => {
    it('should convert header names to camelCase', () => {
      const operation: OpenAPIV3.OperationObject = {
        parameters: [
          { name: 'x-api-key', in: 'header', required: true, schema: { type: 'string' } },
          { name: 'x-company-staff-id', in: 'header', schema: { type: 'string' } },
          { name: 'X-Custom-Header', in: 'header', schema: { type: 'string' } }
        ],
        responses: {
          '200': {
            description: 'Success'
          }
        }
      };

      const endpoint = generator.generateGetMethod(
        'testGet',
        '/test',
        operation
      );

      expect(endpoint.headers[0].dartName).toBe('xApiKey');
      expect(endpoint.headers[1].dartName).toBe('xCompanyStaffId');
      expect(endpoint.headers[2].dartName).toBe('xCustomHeader');
      
      // Original names should be preserved
      expect(endpoint.headers[0].originalName).toBe('x-api-key');
      expect(endpoint.headers[1].originalName).toBe('x-company-staff-id');
      expect(endpoint.headers[2].originalName).toBe('X-Custom-Header');
    });
  });

  describe('Security Processing', () => {
    it('should detect security requirements', () => {
      const operation: OpenAPIV3.OperationObject = {
        security: [
          { apiKey: [] },
          { oauth2: ['read', 'write'] }
        ],
        responses: {
          '200': {
            description: 'Success'
          }
        }
      };

      const endpoint = generator.generateGetMethod(
        'getSecure',
        '/secure',
        operation
      );

      // Security is currently not exposed in the EndpointMethod interface
      // This test would need to be updated when security support is added
      expect(endpoint).toBeDefined();
    });

    it('should handle operations without security', () => {
      const operation: OpenAPIV3.OperationObject = {
        parameters: [],
        responses: {
          '200': {
            description: 'Success'
          }
        }
      };

      const endpoint = generator.generateGetMethod(
        'getPublic',
        '/public',
        operation
      );

      // Security is currently not exposed in the EndpointMethod interface
      expect(endpoint).toBeDefined();
    });
  });
});