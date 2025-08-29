/**
 * Tests for service import simplification
 */

import { describe, it, expect } from 'vitest';
import { generateDartCode } from '../../generators';

describe('Service Imports', () => {
  it('should only import models/index.dart in services', async () => {
    const spec = {
      openapi: '3.0.0',
      info: { title: 'Test API', version: '1.0.0' },
      paths: {
        '/users': {
          get: {
            operationId: 'getUsers',
            tags: ['Users'],
            parameters: [
              {
                name: 'page',
                in: 'query',
                schema: { type: 'integer' }
              },
              {
                name: 'x-api-key',
                in: 'header',
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
                      type: 'array',
                      items: {
                        $ref: '#/components/schemas/User'
                      }
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
              name: { type: 'string' }
            }
          }
        }
      }
    };

    const files = await generateDartCode({
      input: spec as any,
      output: { target: './test', mode: 'split', client: 'dio' }
    });

    const serviceFile = files.find(f => f.path.includes('users_service.dart'));
    
    expect(serviceFile).toBeDefined();
    expect(serviceFile?.content).toContain("import '../models/index.dart';");
    expect(serviceFile?.content).not.toContain("import '../models/params/index.dart';");
    expect(serviceFile?.content).not.toContain("import '../models/headers/index.dart';");
  });

  it('should access all model types through single import', async () => {
    const spec = {
      openapi: '3.0.0',
      info: { title: 'Test API', version: '1.0.0' },
      paths: {
        '/products/{id}': {
          get: {
            operationId: 'getProduct',
            tags: ['Products'],
            parameters: [
              {
                name: 'id',
                in: 'path',
                required: true,
                schema: { type: 'string' }
              },
              {
                name: 'include',
                in: 'query',
                schema: { type: 'string' }
              },
              {
                name: 'x-api-key',
                in: 'header',
                required: true,
                schema: { type: 'string' }
              },
              {
                name: 'x-user-id',
                in: 'header',
                required: false,
                schema: { type: 'string' }
              }
            ],
            responses: {
              '200': {
                description: 'Success',
                content: {
                  'application/json': {
                    schema: {
                      $ref: '#/components/schemas/Product'
                    }
                  }
                }
              }
            }
          },
          put: {
            operationId: 'updateProduct',
            tags: ['Products'],
            parameters: [
              {
                name: 'id',
                in: 'path',
                required: true,
                schema: { type: 'string' }
              },
              {
                name: 'x-api-key',
                in: 'header',
                required: true,
                schema: { type: 'string' }
              }
            ],
            requestBody: {
              required: true,
              content: {
                'application/json': {
                  schema: {
                    $ref: '#/components/schemas/Product'
                  }
                }
              }
            },
            responses: {
              '200': {
                description: 'Success',
                content: {
                  'application/json': {
                    schema: {
                      $ref: '#/components/schemas/Product'
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
          Product: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              name: { type: 'string' },
              price: { type: 'number' }
            },
            required: ['id', 'name', 'price']
          }
        }
      }
    };

    const files = await generateDartCode({
      input: spec as any,
      output: { target: './test', mode: 'split', client: 'dio' }
    });

    const serviceFile = files.find(f => f.path.includes('products_service.dart'));
    
    expect(serviceFile).toBeDefined();
    
    // Should have single import
    const importMatches = serviceFile?.content.match(/import '\.\.\/models/g) || [];
    expect(importMatches).toHaveLength(1);
    
    // Should still be able to use all types
    expect(serviceFile?.content).toContain('GetProductParams'); // Query params model
    expect(serviceFile?.content).toContain('GetProductHeaders'); // Headers model
    expect(serviceFile?.content).toContain('Product'); // Response model
  });

  it('should generate proper imports for services with no params or headers', async () => {
    const spec = {
      openapi: '3.0.0',
      info: { title: 'Test API', version: '1.0.0' },
      paths: {
        '/health': {
          get: {
            operationId: 'healthCheck',
            tags: ['Health'],
            responses: {
              '200': {
                description: 'Success',
                content: {
                  'application/json': {
                    schema: {
                      type: 'object',
                      properties: {
                        status: { type: 'string' }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      },
      components: {
        schemas: {}
      }
    };

    const files = await generateDartCode({
      input: spec as any,
      output: { target: './test', mode: 'split', client: 'dio' }
    });

    const serviceFile = files.find(f => f.path.includes('health_service.dart'));
    
    expect(serviceFile).toBeDefined();
    expect(serviceFile?.content).toContain("import '../models/index.dart';");
    expect(serviceFile?.content).toContain("import '../api_client.dart';");
    expect(serviceFile?.content).toContain("import 'api_exception.dart';");
  });

  it('should handle complex service with multiple endpoints', async () => {
    const spec = {
      openapi: '3.0.0',
      info: { title: 'Test API', version: '1.0.0' },
      paths: {
        '/users': {
          get: {
            operationId: 'listUsers',
            tags: ['Users'],
            parameters: [
              { name: 'page', in: 'query', schema: { type: 'integer' } },
              { name: 'limit', in: 'query', schema: { type: 'integer' } },
              { name: 'x-api-key', in: 'header', required: true, schema: { type: 'string' } }
            ],
            responses: {
              '200': {
                description: 'Success',
                content: {
                  'application/json': {
                    schema: {
                      type: 'array',
                      items: { $ref: '#/components/schemas/User' }
                    }
                  }
                }
              }
            }
          },
          post: {
            operationId: 'createUser',
            tags: ['Users'],
            parameters: [
              { name: 'x-api-key', in: 'header', required: true, schema: { type: 'string' } }
            ],
            requestBody: {
              required: true,
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/User' }
                }
              }
            },
            responses: {
              '201': {
                description: 'Created',
                content: {
                  'application/json': {
                    schema: { $ref: '#/components/schemas/User' }
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
              email: { type: 'string' },
              name: { type: 'string' }
            },
            required: ['email']
          }
        }
      }
    };

    const files = await generateDartCode({
      input: spec as any,
      output: { target: './test', mode: 'split', client: 'dio' }
    });

    const serviceFile = files.find(f => f.path.includes('users_service.dart'));
    
    expect(serviceFile).toBeDefined();
    
    // Should have exactly one models import
    const importLines = serviceFile?.content.split('\n').filter(line => line.includes("import '"));
    const modelImports = importLines?.filter(line => line.includes('/models/')) || [];
    expect(modelImports).toHaveLength(1);
    expect(modelImports[0]).toContain("import '../models/index.dart';");
    
    // Should contain both methods
    expect(serviceFile?.content).toContain('listUsers');
    expect(serviceFile?.content).toContain('createUser');
    
    // Should use proper types from the single import
    expect(serviceFile?.content).toContain('ListUsersParams');
    expect(serviceFile?.content).toContain('ListUsersHeaders');
    expect(serviceFile?.content).toContain('CreateUserHeaders');
    expect(serviceFile?.content).toContain('User');
  });
});