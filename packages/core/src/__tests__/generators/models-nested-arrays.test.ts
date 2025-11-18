/**
 * Tests for nested array type generation
 */

import { describe, it, expect } from 'vitest';
import { ModelGenerator } from '../../generators/model-generator';
import type { OpenAPIV3 } from 'openapi-types';
import { ReferenceResolver } from '../../resolvers/reference-resolver';

describe('ModelGenerator - Nested Arrays', () => {
  const generator = new ModelGenerator();

  it('should handle nested arrays of primitives (List<List<int>>)', () => {
    const spec: OpenAPIV3.Document = {
      openapi: '3.0.0',
      info: { title: 'Test', version: '1.0.0' },
      paths: {},
      components: {
        schemas: {
          TestModel: {
            type: 'object',
            properties: {
              employee_records_ids: {
                type: 'array',
                items: {
                  type: 'array',
                  items: {
                    type: 'integer',
                    format: 'int32'
                  },
                  maxItems: 16,
                  minItems: 16
                }
              }
            }
          }
        }
      }
    };

    const refResolver = new ReferenceResolver(spec);
    generator.setReferenceResolver(refResolver);

    const schema = spec.components!.schemas!.TestModel as OpenAPIV3.SchemaObject;
    const result = generator.generateModel('TestModel', schema);

    // Should generate List<List<int>>
    expect(result.content).toContain('List<List<int>>?');

    // Should NOT import any model files for primitive nested arrays
    expect(result.content).not.toContain("import 'list_int.f.dart'");
    expect(result.content).not.toContain("import 'int.f.dart'");

    // Should only have standard imports
    expect(result.content).toContain("import 'package:freezed_annotation/freezed_annotation.dart'");
  });

  it('should handle nested arrays with model references (List<List<MyModel>>)', () => {
    const spec: OpenAPIV3.Document = {
      openapi: '3.0.0',
      info: { title: 'Test', version: '1.0.0' },
      paths: {},
      components: {
        schemas: {
          MyModel: {
            type: 'object',
            properties: {
              id: { type: 'string' }
            }
          },
          TestModel: {
            type: 'object',
            properties: {
              nested_models: {
                type: 'array',
                items: {
                  type: 'array',
                  items: {
                    $ref: '#/components/schemas/MyModel'
                  }
                }
              }
            }
          }
        }
      }
    };

    const refResolver = new ReferenceResolver(spec);
    generator.setReferenceResolver(refResolver);

    const schema = spec.components!.schemas!.TestModel as OpenAPIV3.SchemaObject;
    const result = generator.generateModel('TestModel', schema);

    // Should generate List<List<MyModel>>
    expect(result.content).toContain('List<List<MyModel>>?');

    // Should import the model file (only once, not for each nesting level)
    expect(result.content).toContain("import 'my_model.f.dart'");

    // Should NOT import list_my_model.f.dart
    expect(result.content).not.toContain("import 'list_my_model.f.dart'");
  });

  it('should handle triple nested arrays (List<List<List<String>>>)', () => {
    const spec: OpenAPIV3.Document = {
      openapi: '3.0.0',
      info: { title: 'Test', version: '1.0.0' },
      paths: {},
      components: {
        schemas: {
          TestModel: {
            type: 'object',
            properties: {
              triple_nested: {
                type: 'array',
                items: {
                  type: 'array',
                  items: {
                    type: 'array',
                    items: {
                      type: 'string'
                    }
                  }
                }
              }
            }
          }
        }
      }
    };

    const refResolver = new ReferenceResolver(spec);
    generator.setReferenceResolver(refResolver);

    const schema = spec.components!.schemas!.TestModel as OpenAPIV3.SchemaObject;
    const result = generator.generateModel('TestModel', schema);

    // Should generate List<List<List<String>>>
    expect(result.content).toContain('List<List<List<String>>>?');

    // Should NOT import any model files
    expect(result.content).not.toContain("import 'list_");
    expect(result.content).not.toContain("import 'string.f.dart'");
  });

  it('should handle mixed nested structures (List<Map<String, int>>)', () => {
    const spec: OpenAPIV3.Document = {
      openapi: '3.0.0',
      info: { title: 'Test', version: '1.0.0' },
      paths: {},
      components: {
        schemas: {
          TestModel: {
            type: 'object',
            properties: {
              map_list: {
                type: 'array',
                items: {
                  type: 'object',
                  additionalProperties: {
                    type: 'integer'
                  }
                }
              }
            }
          }
        }
      }
    };

    const refResolver = new ReferenceResolver(spec);
    generator.setReferenceResolver(refResolver);

    const schema = spec.components!.schemas!.TestModel as OpenAPIV3.SchemaObject;
    const result = generator.generateModel('TestModel', schema);

    // Should generate List<Map<String, int>>
    expect(result.content).toContain('List<Map<String, int>>?');

    // Should NOT import any model files
    expect(result.content).not.toContain("import 'map_");
    expect(result.content).not.toContain("import 'int.f.dart'");
  });
});