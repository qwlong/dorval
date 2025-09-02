import { describe, it, expect, beforeEach } from 'vitest';
import { ModelGenerator } from '../../generators/model-generator';
import { ReferenceResolver } from '../../resolvers/reference-resolver';
import type { OpenAPIV3 } from 'openapi-types';

describe('Nested Object Type Resolution', () => {
  let modelGenerator: ModelGenerator;
  
  beforeEach(() => {
    modelGenerator = new ModelGenerator();
  });

  it('should resolve $ref in allOf to proper type instead of dynamic', () => {
    const schema: OpenAPIV3.SchemaObject = {
      type: 'object',
      properties: {
        location: {
          description: 'Enriched core location data',
          allOf: [
            {
              $ref: '#/components/schemas/CoreLocationDto'
            }
          ]
        }
      },
      required: ['location']
    };

    const spec: OpenAPIV3.Document = {
      openapi: '3.0.0',
      info: { title: 'Test', version: '1.0' },
      paths: {},
      components: {
        schemas: {
          CoreLocationDto: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              name: { type: 'string' }
            }
          }
        }
      }
    };

    const refResolver = new ReferenceResolver(spec);
    modelGenerator.setReferenceResolver(refResolver);
    
    const result = modelGenerator.generateModel('TestModel', schema);

    // Should import CoreLocationDto
    expect(result.content).toContain("import 'core_location_dto.f.dart';");
    
    // Should use CoreLocationDto type, not dynamic
    expect(result.content).toContain('required CoreLocationDto location,');
    expect(result.content).not.toContain('required dynamic location,');
  });

  it('should resolve $ref in oneOf to proper nullable type instead of dynamic', () => {
    const schema: OpenAPIV3.SchemaObject = {
      type: 'object',
      properties: {
        role: {
          description: 'Enriched shift role data',
          oneOf: [
            {
              $ref: '#/components/schemas/RoleResponseDto'
            },
            {
              type: 'null'
            }
          ]
        }
      },
      required: ['role']
    };

    const spec: OpenAPIV3.Document = {
      openapi: '3.0.0',
      info: { title: 'Test', version: '1.0' },
      paths: {},
      components: {
        schemas: {
          RoleResponseDto: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              name: { type: 'string' }
            }
          }
        }
      }
    };

    const refResolver = new ReferenceResolver(spec);
    modelGenerator.setReferenceResolver(refResolver);
    
    const result = modelGenerator.generateModel('TestModel', schema);

    // Should import RoleResponseDto
    expect(result.content).toContain("import 'role_response_dto.f.dart';");
    
    // Should use RoleResponseDto? type (nullable), not dynamic
    expect(result.content).toContain('required RoleResponseDto? role,');
    expect(result.content).not.toContain('required dynamic role,');
  });

  it('should handle direct $ref references properly', () => {
    const schema: OpenAPIV3.SchemaObject = {
      type: 'object',
      properties: {
        schedule: {
          $ref: '#/components/schemas/ScheduleDto'
        }
      },
      required: ['schedule']
    };

    const spec: OpenAPIV3.Document = {
      openapi: '3.0.0',
      info: { title: 'Test', version: '1.0' },
      paths: {},
      components: {
        schemas: {
          ScheduleDto: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              name: { type: 'string' }
            }
          }
        }
      }
    };

    const refResolver = new ReferenceResolver(spec);
    modelGenerator.setReferenceResolver(refResolver);
    
    const result = modelGenerator.generateModel('TestModel', schema);

    // Should import ScheduleDto
    expect(result.content).toContain("import 'schedule_dto.f.dart';");
    
    // Should use ScheduleDto type, not dynamic
    expect(result.content).toContain('required ScheduleDto schedule,');
    expect(result.content).not.toContain('required dynamic schedule,');
  });

  it('should handle multiple nested references in a single model', () => {
    const schema: OpenAPIV3.SchemaObject = {
      type: 'object',
      properties: {
        location: {
          description: 'Core location',
          allOf: [
            {
              $ref: '#/components/schemas/CoreLocationDto'
            }
          ]
        },
        role: {
          description: 'Role data',
          oneOf: [
            {
              $ref: '#/components/schemas/RoleResponseDto'
            },
            {
              type: 'null'
            }
          ]
        },
        schedule: {
          $ref: '#/components/schemas/ScheduleDto'
        },
        assignee: {
          description: 'Team member',
          oneOf: [
            {
              $ref: '#/components/schemas/TeamMemberResponseDto'
            },
            {
              type: 'null'
            }
          ]
        }
      },
      required: ['location', 'role', 'schedule', 'assignee']
    };

    const spec: OpenAPIV3.Document = {
      openapi: '3.0.0',
      info: { title: 'Test', version: '1.0' },
      paths: {},
      components: {
        schemas: {
          CoreLocationDto: {
            type: 'object',
            properties: {
              id: { type: 'string' }
            }
          },
          RoleResponseDto: {
            type: 'object',
            properties: {
              id: { type: 'string' }
            }
          },
          ScheduleDto: {
            type: 'object',
            properties: {
              id: { type: 'string' }
            }
          },
          TeamMemberResponseDto: {
            type: 'object',
            properties: {
              id: { type: 'string' }
            }
          }
        }
      }
    };

    const refResolver = new ReferenceResolver(spec);
    modelGenerator.setReferenceResolver(refResolver);
    
    const result = modelGenerator.generateModel('ShiftResponseDto', schema);

    // Should import all referenced types
    expect(result.content).toContain("import 'core_location_dto.f.dart';");
    expect(result.content).toContain("import 'role_response_dto.f.dart';");
    expect(result.content).toContain("import 'schedule_dto.f.dart';");
    expect(result.content).toContain("import 'team_member_response_dto.f.dart';");
    
    // Should use proper types, not dynamic
    expect(result.content).toContain('required CoreLocationDto location,');
    expect(result.content).toContain('required RoleResponseDto? role,');
    expect(result.content).toContain('required ScheduleDto schedule,');
    expect(result.content).toContain('required TeamMemberResponseDto? assignee,');
    
    // Should not contain any dynamic types
    expect(result.content).not.toMatch(/required dynamic \w+,/);
  });

  it('should handle allOf with single $ref correctly', () => {
    const schema: OpenAPIV3.SchemaObject = {
      type: 'object',
      properties: {
        employee: {
          allOf: [
            {
              $ref: '#/components/schemas/PersonDto'
            }
          ]
        }
      },
      required: ['employee']
    };

    const spec: OpenAPIV3.Document = {
      openapi: '3.0.0',
      info: { title: 'Test', version: '1.0' },
      paths: {},
      components: {
        schemas: {
          PersonDto: {
            type: 'object',
            properties: {
              name: { type: 'string' },
              age: { type: 'number' }
            }
          }
        }
      }
    };

    const refResolver = new ReferenceResolver(spec);
    modelGenerator.setReferenceResolver(refResolver);
    
    const result = modelGenerator.generateModel('TestModel', schema);

    // Should use PersonDto type for allOf with single ref
    expect(result.content).toContain("import 'person_dto.f.dart';");
    expect(result.content).toContain('required PersonDto employee,');
    expect(result.content).not.toContain('required dynamic employee,');
  });
});