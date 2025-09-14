import { describe, it, expect } from 'vitest';
import { generateModels } from '../../generators/models';
import { OpenAPIObject } from '../../types';

describe('Map with Nested Model Imports', () => {
  it('should import referenced types in Map values', async () => {
    const spec: OpenAPIObject = {
      openapi: '3.0.0',
      info: {
        title: 'Test API',
        version: '1.0.0'
      },
      paths: {},
      components: {
        schemas: {
          WorkerAvailabilityDetailDto: {
            type: 'object',
            properties: {
              status: {
                type: 'string'
              },
              reason: {
                type: 'string'
              }
            }
          },
          WorkerAvailabilityResponseDto: {
            type: 'object',
            properties: {
              assigneeId: {
                type: 'string',
                description: 'ID of the assignee being checked'
              },
              available: {
                type: 'boolean',
                description: 'Whether the assignee is available'
              },
              messages: {
                type: 'array',
                items: {
                  type: 'string'
                },
                description: 'The reason messages described the worker availability'
              },
              details: {
                type: 'object',
                additionalProperties: {
                  type: 'array',
                  items: {
                    $ref: '#/components/schemas/WorkerAvailabilityDetailDto'
                  }
                },
                description: 'The details of worker availability by date. Key is the date string, value is an array of availability details.'
              }
            },
            required: ['assigneeId', 'available']
          }
        }
      }
    };

    const files = await generateModels(spec, { 
      input: spec,
      output: { target: './test', mode: 'split', client: 'dio' } 
    } as any);

    // Find the WorkerAvailabilityResponseDto file
    const responseFile = files.find(f => f.path === 'models/worker_availability_response_dto.f.dart');
    expect(responseFile).toBeDefined();
    
    // Check that it imports WorkerAvailabilityDetailDto
    expect(responseFile!.content).toContain("import 'worker_availability_detail_dto.f.dart';");
    
    // Check that the property uses the correct type
    expect(responseFile!.content).toContain('Map<String, List<WorkerAvailabilityDetailDto>>? details');
  });

  it('should import referenced types in Map with direct reference', async () => {
    const spec: OpenAPIObject = {
      openapi: '3.0.0',
      info: {
        title: 'Test API',
        version: '1.0.0'
      },
      paths: {},
      components: {
        schemas: {
          ConfigDto: {
            type: 'object',
            properties: {
              name: {
                type: 'string'
              },
              value: {
                type: 'string'
              }
            }
          },
          ConfigMapDto: {
            type: 'object',
            properties: {
              configs: {
                type: 'object',
                additionalProperties: {
                  $ref: '#/components/schemas/ConfigDto'
                },
                description: 'Map of configuration objects'
              }
            }
          }
        }
      }
    };

    const files = await generateModels(spec, { 
      input: spec,
      output: { target: './test', mode: 'split', client: 'dio' } 
    } as any);

    // Find the ConfigMapDto file
    const mapFile = files.find(f => f.path === 'models/config_map_dto.f.dart');
    expect(mapFile).toBeDefined();
    
    // Check that it imports ConfigDto
    expect(mapFile!.content).toContain("import 'config_dto.f.dart';");
    
    // Check that the property uses the correct type
    expect(mapFile!.content).toContain('Map<String, ConfigDto>? configs');
  });

  it('should handle nested arrays with references', async () => {
    const spec: OpenAPIObject = {
      openapi: '3.0.0',
      info: {
        title: 'Test API',
        version: '1.0.0'
      },
      paths: {},
      components: {
        schemas: {
          ItemDto: {
            type: 'object',
            properties: {
              id: {
                type: 'string'
              },
              name: {
                type: 'string'
              }
            }
          },
          GroupedItemsDto: {
            type: 'object',
            properties: {
              groups: {
                type: 'object',
                additionalProperties: {
                  type: 'array',
                  items: {
                    type: 'array',
                    items: {
                      $ref: '#/components/schemas/ItemDto'
                    }
                  }
                },
                description: 'Nested arrays of items'
              }
            }
          }
        }
      }
    };

    const files = await generateModels(spec, { 
      input: spec,
      output: { target: './test', mode: 'split', client: 'dio' } 
    } as any);

    // Find the GroupedItemsDto file
    const groupFile = files.find(f => f.path === 'models/grouped_items_dto.f.dart');
    expect(groupFile).toBeDefined();
    
    // Check that it imports ItemDto
    expect(groupFile!.content).toContain("import 'item_dto.f.dart';");
    
    // Check that the property uses the correct type (nested arrays)
    expect(groupFile!.content).toContain('Map<String, List<List<ItemDto>>>? groups');
  });

  it('should handle regular arrays with references', async () => {
    const spec: OpenAPIObject = {
      openapi: '3.0.0',
      info: {
        title: 'Test API',
        version: '1.0.0'
      },
      paths: {},
      components: {
        schemas: {
          TagDto: {
            type: 'object',
            properties: {
              name: {
                type: 'string'
              }
            }
          },
          PostDto: {
            type: 'object',
            properties: {
              title: {
                type: 'string'
              },
              tags: {
                type: 'array',
                items: {
                  $ref: '#/components/schemas/TagDto'
                }
              }
            }
          }
        }
      }
    };

    const files = await generateModels(spec, { 
      input: spec,
      output: { target: './test', mode: 'split', client: 'dio' } 
    } as any);

    // Find the PostDto file
    const postFile = files.find(f => f.path === 'models/post_dto.f.dart');
    expect(postFile).toBeDefined();
    
    // Check that it imports TagDto
    expect(postFile!.content).toContain("import 'tag_dto.f.dart';");
    
    // Check that the property uses the correct type
    expect(postFile!.content).toContain('List<TagDto>? tags');
  });
});