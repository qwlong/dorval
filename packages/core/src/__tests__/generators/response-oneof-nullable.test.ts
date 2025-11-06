/**
 * Tests for oneOf nullable pattern in responses
 */

import { describe, it, expect } from 'vitest';
import { generateDartCode } from '../../index';

describe('Response oneOf Nullable Pattern', () => {
  it('should generate nullable return type for oneOf [Type, null] response', async () => {
    const spec = {
      openapi: '3.0.0',
      info: { title: 'Test API', version: '1.0.0' },
      paths: {
        '/active-entry': {
          get: {
            operationId: 'getActiveTimeEntry',
            responses: {
              '200': {
                description: 'Successfully retrieved active time entry or null',
                content: {
                  'application/json': {
                    schema: {
                      oneOf: [
                        { $ref: '#/components/schemas/TimeEntry' },
                        { type: 'null' }
                      ]
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
          TimeEntry: {
            type: 'object',
            required: ['id', 'startTime'],
            properties: {
              id: { type: 'string' },
              startTime: { type: 'string', format: 'date-time' },
              endTime: { type: 'string', format: 'date-time', nullable: true }
            }
          }
        }
      }
    };

    const files = await generateDartCode({
      input: spec as any,
      output: { target: './test-output', mode: 'split', client: 'dio' }
    });

    const serviceFile = files.find(f => f.path.includes('service'));
    expect(serviceFile).toBeDefined();

    // Should have nullable return type
    expect(serviceFile?.content).toMatch(/Future<TimeEntry\?>/);
    expect(serviceFile?.content).toContain('getActiveTimeEntry');
  });

  it('should generate nullable return type for anyOf [Type, null] response', async () => {
    const spec = {
      openapi: '3.0.0',
      info: { title: 'Test API', version: '1.0.0' },
      paths: {
        '/user': {
          get: {
            operationId: 'getCurrentUser',
            responses: {
              '200': {
                description: 'Current user or null if not logged in',
                content: {
                  'application/json': {
                    schema: {
                      anyOf: [
                        { $ref: '#/components/schemas/User' },
                        { type: 'null' }
                      ]
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
            required: ['id', 'email'],
            properties: {
              id: { type: 'string' },
              email: { type: 'string' }
            }
          }
        }
      }
    };

    const files = await generateDartCode({
      input: spec as any,
      output: { target: './test-output', mode: 'split', client: 'dio' }
    });

    const serviceFile = files.find(f => f.path.includes('service'));
    expect(serviceFile).toBeDefined();

    // Should have nullable return type
    expect(serviceFile?.content).toMatch(/Future<User\?>/);
    expect(serviceFile?.content).toContain('getCurrentUser');
  });

  it('should generate nullable return type for oneOf with primitive type', async () => {
    const spec = {
      openapi: '3.0.0',
      info: { title: 'Test API', version: '1.0.0' },
      paths: {
        '/status': {
          get: {
            operationId: 'getStatus',
            responses: {
              '200': {
                description: 'Status message or null',
                content: {
                  'application/json': {
                    schema: {
                      oneOf: [
                        { type: 'string' },
                        { type: 'null' }
                      ]
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
      output: { target: './test-output', mode: 'split', client: 'dio' }
    });

    const serviceFile = files.find(f => f.path.includes('service'));
    expect(serviceFile).toBeDefined();

    // Should have nullable return type
    expect(serviceFile?.content).toMatch(/Future<String\?>/);
    expect(serviceFile?.content).toContain('getStatus');
  });

  it('should generate nullable return type for oneOf with list type', async () => {
    const spec = {
      openapi: '3.0.0',
      info: { title: 'Test API', version: '1.0.0' },
      paths: {
        '/items': {
          get: {
            operationId: 'getItems',
            responses: {
              '200': {
                description: 'List of items or null',
                content: {
                  'application/json': {
                    schema: {
                      oneOf: [
                        {
                          type: 'array',
                          items: { $ref: '#/components/schemas/Item' }
                        },
                        { type: 'null' }
                      ]
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
          Item: {
            type: 'object',
            required: ['id'],
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
      output: { target: './test-output', mode: 'split', client: 'dio' }
    });

    const serviceFile = files.find(f => f.path.includes('service'));
    expect(serviceFile).toBeDefined();

    // Should have nullable return type
    expect(serviceFile?.content).toMatch(/Future<List<Item>\?>/);
    expect(serviceFile?.content).toContain('getItems');
  });

  it('should handle 204 No Content response correctly', async () => {
    const spec = {
      openapi: '3.0.0',
      info: { title: 'Test API', version: '1.0.0' },
      paths: {
        '/active-entry': {
          get: {
            operationId: 'getActiveTimeEntry',
            responses: {
              '200': {
                description: 'Active time entry found',
                content: {
                  'application/json': {
                    schema: { $ref: '#/components/schemas/TimeEntry' }
                  }
                }
              },
              '204': {
                description: 'No active time entry'
              }
            }
          }
        }
      },
      components: {
        schemas: {
          TimeEntry: {
            type: 'object',
            required: ['id'],
            properties: {
              id: { type: 'string' },
              startTime: { type: 'string', format: 'date-time' }
            }
          }
        }
      }
    };

    const files = await generateDartCode({
      input: spec as any,
      output: { target: './test-output', mode: 'split', client: 'dio' }
    });

    const serviceFile = files.find(f => f.path.includes('service'));
    expect(serviceFile).toBeDefined();

    // Should have nullable return type (204 is present, so response is nullable)
    expect(serviceFile?.content).toMatch(/Future<TimeEntry\?>/);
    expect(serviceFile?.content).toContain('getActiveTimeEntry');
  });

  it('should not treat non-nullable oneOf as nullable', async () => {
    const spec = {
      openapi: '3.0.0',
      info: { title: 'Test API', version: '1.0.0' },
      paths: {
        '/data': {
          get: {
            operationId: 'getData',
            responses: {
              '200': {
                description: 'Data in different formats',
                content: {
                  'application/json': {
                    schema: {
                      oneOf: [
                        { type: 'string' },
                        { type: 'number' }
                      ]
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
      output: { target: './test-output', mode: 'split', client: 'dio' }
    });

    const serviceFile = files.find(f => f.path.includes('service'));
    expect(serviceFile).toBeDefined();

    // Should have dynamic type (not nullable, as it's a union of non-null types)
    expect(serviceFile?.content).toMatch(/Future<dynamic>/);
    expect(serviceFile?.content).not.toMatch(/Future<dynamic\?>/);
  });
});