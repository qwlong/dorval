import { describe, it, expect } from 'vitest';
import { EndpointGenerator } from '../../generators/endpoint-generator';
import type { OpenAPIV3 } from 'openapi-types';

describe('$ref Preservation in API Return Types', () => {
  const spec: OpenAPIV3.Document = {
    openapi: '3.0.0',
    info: {
      title: 'Test API',
      version: '1.0.0'
    },
    paths: {
      '/users/{id}': {
        get: {
          operationId: 'getUser',
          parameters: [
            {
              name: 'id',
              in: 'path',
              required: true,
              schema: { type: 'string' }
            }
          ],
          responses: {
            '200': {
              description: 'Success',
              content: {
                'application/json': {
                  schema: {
                    $ref: '#/components/schemas/User'
                  }
                }
              }
            }
          }
        }
      },
      '/users': {
        get: {
          operationId: 'listUsers',
          responses: {
            '200': {
              description: 'Success',
              content: {
                'application/json': {
                  schema: {
                    type: 'array',
                    items: {
                      $ref: '#/components/schemas/User'
                    }
                  }
                }
              }
            }
          }
        },
        post: {
          operationId: 'createUser',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/CreateUserRequest'
                }
              }
            }
          },
          responses: {
            '201': {
              description: 'Created',
              content: {
                'application/json': {
                  schema: {
                    $ref: '#/components/schemas/User'
                  }
                }
              }
            }
          }
        }
      }
    },
    components: {
      schemas: {
        User: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            name: { type: 'string' },
            email: { type: 'string' }
          },
          required: ['id', 'name']
        },
        CreateUserRequest: {
          type: 'object',
          properties: {
            name: { type: 'string' },
            email: { type: 'string' }
          },
          required: ['name', 'email']
        }
      }
    }
  };

  it('should preserve $ref in single object response', () => {
    const generator = new EndpointGenerator();
    generator.setOriginalSpec(spec);
    generator.setSchemas(spec.components?.schemas || {});
    
    const getUserOperation = spec.paths['/users/{id}']?.get as OpenAPIV3.OperationObject;
    const method = generator.generateGetMethod(
      'getUser',
      '/users/{id}',
      getUserOperation
    );
    
    // Should return User model, not Map<String, dynamic>
    expect(method.returnType).toBe('User');
    expect(method.returnsModel).toBe(true);
    expect(method.responseDataType).toBe('User');
  });

  it('should preserve $ref in array response', () => {
    const generator = new EndpointGenerator();
    generator.setOriginalSpec(spec);
    generator.setSchemas(spec.components?.schemas || {});
    
    const listUsersOperation = spec.paths['/users']?.get as OpenAPIV3.OperationObject;
    const method = generator.generateGetMethod(
      'listUsers',
      '/users',
      listUsersOperation
    );
    
    // Should return List<User>, not List<Map<String, dynamic>>
    expect(method.returnType).toBe('List<User>');
    expect(method.returnsList).toBe(true);
    expect(method.itemType).toBe('User');
  });

  it('should preserve $ref in request body', () => {
    const generator = new EndpointGenerator();
    generator.setOriginalSpec(spec);
    generator.setSchemas(spec.components?.schemas || {});
    
    const createUserOperation = spec.paths['/users']?.post as OpenAPIV3.OperationObject;
    const method = generator.generateMutationMethod(
      'post',
      'createUser',
      '/users',
      createUserOperation
    );
    
    // Request body should be CreateUserRequest
    expect(method.bodyType).toBe('CreateUserRequest');
    // Response should be User
    expect(method.returnType).toBe('User');
    expect(method.returnsModel).toBe(true);
  });

  it('should handle nested $ref in complex schemas', () => {
    const complexSpec: OpenAPIV3.Document = {
      ...spec,
      paths: {
        '/companies/{id}': {
          get: {
            operationId: 'getCompany',
            parameters: [
              {
                name: 'id',
                in: 'path',
                required: true,
                schema: { type: 'string' }
              }
            ],
            responses: {
              '200': {
                description: 'Success',
                content: {
                  'application/json': {
                    schema: {
                      $ref: '#/components/schemas/CompanyResponse'
                    }
                  }
                }
              }
            }
          }
        }
      },
      components: {
        schemas: {
          ...spec.components!.schemas,
          CompanyResponse: {
            type: 'object',
            properties: {
              company: {
                $ref: '#/components/schemas/Company'
              },
              users: {
                type: 'array',
                items: {
                  $ref: '#/components/schemas/User'
                }
              }
            }
          },
          Company: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              name: { type: 'string' }
            }
          }
        }
      }
    };

    const generator = new EndpointGenerator();
    generator.setOriginalSpec(complexSpec);
    generator.setSchemas(complexSpec.components?.schemas || {});
    
    const getCompanyOperation = complexSpec.paths['/companies/{id}']?.get as OpenAPIV3.OperationObject;
    const method = generator.generateGetMethod(
      'getCompany',
      '/companies/{id}',
      getCompanyOperation
    );
    
    // Should return CompanyResponse model
    expect(method.returnType).toBe('CompanyResponse');
    expect(method.returnsModel).toBe(true);
  });
});