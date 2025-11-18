/**
 * Test inline enum generation for path parameters (query, header, etc.)
 */

import { describe, it, expect } from 'vitest';
import { generateModels } from '../../generators/models';
import { EndpointGenerator } from '../../generators/endpoint-generator';

describe('Inline Enum in Parameters', () => {
  describe('Query Parameter with Inline Enum', () => {
    it('should extract and generate enum from query parameter', async () => {
      const spec = {
        openapi: '3.0.0',
        info: { title: 'Test API', version: '1.0.0' },
        paths: {
          '/schedules': {
            get: {
              operationId: 'getSchedules',
              parameters: [
                {
                  name: 'scheduleViewType',
                  required: true,
                  in: 'query',
                  description: 'The type of schedule view, either roles or team members view',
                  schema: {
                    type: 'string',
                    enum: ['roles', 'team_members']
                  }
                }
              ],
              responses: {
                '200': {
                  description: 'Success',
                  content: {
                    'application/json': {
                      schema: {
                        type: 'object',
                        properties: {
                          id: { type: 'string' }
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

      const files = await generateModels(spec, {});

      // Should generate an enum file for the parameter
      const enumFile = files.find(f => f.path.includes('schedule_view_type_enum'));
      expect(enumFile).toBeDefined();
      expect(enumFile?.content).toContain('enum ScheduleViewTypeEnum');
      expect(enumFile?.content).toContain('roles');
      expect(enumFile?.content).toContain('team_members');
      expect(enumFile?.content).toContain('@JsonValue(\'roles\')');
      expect(enumFile?.content).toContain('@JsonValue(\'team_members\')');
    });

    it('should use enum type in endpoint generator', async () => {
      const spec: any = {
        openapi: '3.0.0',
        info: { title: 'Test API', version: '1.0.0' },
        paths: {
          '/schedules': {
            get: {
              operationId: 'getSchedules',
              parameters: [
                {
                  name: 'scheduleViewType',
                  required: true,
                  in: 'query',
                  description: 'The type of schedule view',
                  schema: {
                    type: 'string',
                    enum: ['roles', 'team_members']
                  }
                }
              ],
              responses: {
                '200': {
                  description: 'Success',
                  content: {
                    'application/json': {
                      schema: {
                        type: 'object',
                        properties: {
                          id: { type: 'string' }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      };

      const generator = new EndpointGenerator();
      generator.setOriginalSpec(spec);

      const pathItem = spec.paths['/schedules'];
      const operation = pathItem.get;

      const method = generator.generateGetMethod(
        'getSchedules',
        '/schedules',
        operation,
        pathItem
      );

      // The query parameter should use the enum type
      expect(method.queryParams).toHaveLength(1);
      expect(method.queryParams[0].type).toBe('ScheduleViewTypeEnum');
      expect(method.queryParams[0].dartName).toBe('scheduleViewType');
      expect(method.queryParams[0].required).toBe(true);
    });
  });

  describe('Multiple Parameters with Different Enums', () => {
    it('should generate separate enum for each unique parameter enum', async () => {
      const spec = {
        openapi: '3.0.0',
        info: { title: 'Test API', version: '1.0.0' },
        paths: {
          '/items': {
            get: {
              operationId: 'getItems',
              parameters: [
                {
                  name: 'status',
                  in: 'query',
                  schema: {
                    type: 'string',
                    enum: ['active', 'inactive', 'pending']
                  }
                },
                {
                  name: 'sort',
                  in: 'query',
                  schema: {
                    type: 'string',
                    enum: ['asc', 'desc']
                  }
                }
              ],
              responses: {
                '200': {
                  description: 'Success'
                }
              }
            }
          }
        },
        components: {
          schemas: {}
        }
      };

      const files = await generateModels(spec, {});

      // Should generate enum for status
      const statusEnumFile = files.find(f => f.path.includes('status_enum'));
      expect(statusEnumFile).toBeDefined();
      expect(statusEnumFile?.content).toContain('enum StatusEnum');
      expect(statusEnumFile?.content).toContain('active');
      expect(statusEnumFile?.content).toContain('inactive');
      expect(statusEnumFile?.content).toContain('pending');

      // Should generate enum for sort
      const sortEnumFile = files.find(f => f.path.includes('sort_enum'));
      expect(sortEnumFile).toBeDefined();
      expect(sortEnumFile?.content).toContain('enum SortEnum');
      expect(sortEnumFile?.content).toContain('asc');
      expect(sortEnumFile?.content).toContain('desc');
    });
  });

  describe('Header Parameter with Inline Enum', () => {
    it('should extract and generate enum from header parameter', async () => {
      const spec = {
        openapi: '3.0.0',
        info: { title: 'Test API', version: '1.0.0' },
        paths: {
          '/data': {
            get: {
              operationId: 'getData',
              parameters: [
                {
                  name: 'Accept-Language',
                  in: 'header',
                  schema: {
                    type: 'string',
                    enum: ['en', 'es', 'fr']
                  }
                }
              ],
              responses: {
                '200': {
                  description: 'Success'
                }
              }
            }
          }
        },
        components: {
          schemas: {}
        }
      };

      const files = await generateModels(spec, {});

      // Should generate an enum file for the header parameter
      const enumFile = files.find(f => f.path.includes('accept_language_enum'));
      expect(enumFile).toBeDefined();
      expect(enumFile?.content).toContain('enum AcceptLanguageEnum');
      expect(enumFile?.content).toContain('en');
      expect(enumFile?.content).toContain('es');
      expect(enumFile?.content).toContain('fr');
    });
  });

  describe('Enum Deduplication', () => {
    it('should reuse same enum when parameter appears in multiple endpoints', async () => {
      const spec = {
        openapi: '3.0.0',
        info: { title: 'Test API', version: '1.0.0' },
        paths: {
          '/items': {
            get: {
              operationId: 'getItems',
              parameters: [
                {
                  name: 'status',
                  in: 'query',
                  schema: {
                    type: 'string',
                    enum: ['active', 'inactive']
                  }
                }
              ],
              responses: {
                '200': {
                  description: 'Success'
                }
              }
            },
            post: {
              operationId: 'createItem',
              parameters: [
                {
                  name: 'status',
                  in: 'query',
                  schema: {
                    type: 'string',
                    enum: ['active', 'inactive']
                  }
                }
              ],
              responses: {
                '201': {
                  description: 'Created'
                }
              }
            }
          }
        },
        components: {
          schemas: {}
        }
      };

      const files = await generateModels(spec, {});

      // Should only have one StatusEnum file (not duplicated)
      const statusEnumFiles = files.filter(f => f.path.includes('status_enum'));
      expect(statusEnumFiles).toHaveLength(1);
    });
  });

  describe('POST Request with Query Parameter Enum', () => {
    it('should handle inline enum in POST request query parameters', async () => {
      const spec: any = {
        openapi: '3.0.0',
        info: { title: 'Test API', version: '1.0.0' },
        paths: {
          '/shifts': {
            post: {
              operationId: 'createShift',
              parameters: [
                {
                  name: 'scheduleViewType',
                  required: true,
                  in: 'query',
                  schema: {
                    type: 'string',
                    enum: ['roles', 'team_members']
                  }
                }
              ],
              requestBody: {
                content: {
                  'application/json': {
                    schema: {
                      type: 'object',
                      properties: {
                        name: { type: 'string' }
                      }
                    }
                  }
                }
              },
              responses: {
                '201': {
                  description: 'Created'
                }
              }
            }
          }
        }
      };

      const generator = new EndpointGenerator();
      generator.setOriginalSpec(spec);

      const pathItem = spec.paths['/shifts'];
      const operation = pathItem.post;

      const method = generator.generateMutationMethod(
        'post',
        'createShift',
        '/shifts',
        operation,
        pathItem
      );

      // The query parameter should use the enum type
      expect(method.queryParams).toHaveLength(1);
      expect(method.queryParams[0].type).toBe('ScheduleViewTypeEnum');
      expect(method.queryParams[0].dartName).toBe('scheduleViewType');
      expect(method.queryParams[0].required).toBe(true);
    });
  });
});