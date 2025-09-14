import { describe, it, expect } from 'vitest';
import { generateDartCode } from '../../index';
import * as fs from 'fs/promises';
import * as path from 'path';

describe('Query Parameters Flattening', () => {
  const testSpec = {
    openapi: '3.0.0',
    info: {
      title: 'Test API',
      version: '1.0.0'
    },
    paths: {
      '/test/complex-params': {
        get: {
          operationId: 'testComplexParams',
          parameters: [
            {
              name: 'type',
              in: 'query',
              required: true,
              schema: { type: 'string' }
            },
            {
              name: 'payload',
              in: 'query',
              required: true,
              schema: { $ref: '#/components/schemas/PayloadDto' }
            },
            {
              name: 'length',
              in: 'query',
              required: false,
              schema: { type: 'integer' }
            }
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
        }
      }
    },
    components: {
      schemas: {
        PayloadDto: {
          type: 'object',
          properties: {
            shiftId: { type: 'string' },
            startsAt: { type: 'string', format: 'date-time' },
            endsAt: { type: 'string', format: 'date-time' },
            timezone: { type: 'string' },
            locationId: { type: 'string' },
            roleId: { type: 'string' }
          },
          required: ['shiftId', 'startsAt', 'endsAt']
        }
      }
    }
  };

  it('should generate toQueryParameters method that flattens nested objects', async () => {
    const outputDir = path.join(__dirname, 'test-output-flattening');
    await fs.mkdir(outputDir, { recursive: true });
    
    try {
      // Write spec to a temp file
      const specPath = path.join(outputDir, 'test-spec.json');
      await fs.writeFile(specPath, JSON.stringify(testSpec, null, 2));
      
      // Generate files
      const files = await generateDartCode({
        input: specPath,
        output: {
          target: outputDir,
          mode: 'split',
          client: 'dio'
        }
      });

      // Find the params file
      const paramsFile = files.find(f => 
        f.path.includes('test_complex_params_params.f.dart')
      );
      
      expect(paramsFile).toBeDefined();
      expect(paramsFile!.content).toContain('toQueryParameters()');
      expect(paramsFile!.content).toContain('void flatten(String prefix, dynamic value)');
      expect(paramsFile!.content).toContain('key[nestedKey]=value');
      expect(paramsFile!.content).toContain('$prefix[$nestedKey]');
      
      // Verify the flattening logic
      expect(paramsFile!.content).toMatch(/if \(value is Map<String, dynamic>\)/);
      expect(paramsFile!.content).toMatch(/value\.forEach\(\(nestedKey, nestedValue\)/);
      
      // Verify list handling
      expect(paramsFile!.content).toMatch(/if \(value is List\)/);
      expect(paramsFile!.content).toContain('$prefix[$i]');
      
    } finally {
      await fs.rm(outputDir, { recursive: true, force: true });
    }
  });

  it('should handle deeply nested objects', async () => {
    const nestedSpec = {
      ...testSpec,
      components: {
        schemas: {
          NestedDto: {
            type: 'object',
            properties: {
              level1: {
                type: 'object',
                properties: {
                  level2: {
                    type: 'object',
                    properties: {
                      value: { type: 'string' }
                    }
                  }
                }
              }
            }
          }
        }
      },
      paths: {
        '/test/nested': {
          get: {
            operationId: 'testNested',
            parameters: [
              {
                name: 'data',
                in: 'query',
                schema: { $ref: '#/components/schemas/NestedDto' }
              }
            ],
            responses: {
              '200': { description: 'OK' }
            }
          }
        }
      }
    };

    const outputDir = path.join(__dirname, 'test-output-nested');
    await fs.mkdir(outputDir, { recursive: true });
    
    try {
      // Write spec to a temp file
      const specPath = path.join(outputDir, 'nested-spec.json');
      await fs.writeFile(specPath, JSON.stringify(nestedSpec, null, 2));
      
      const files = await generateDartCode({
        input: specPath,
        output: {
          target: outputDir,
          mode: 'split',
          client: 'dio'
        }
      });

      const paramsFile = files.find(f => 
        f.path.includes('test_nested_params.f.dart')
      );
      
      expect(paramsFile).toBeDefined();
      expect(paramsFile!.content).toContain('toQueryParameters()');
      
      // The generated code should handle nested structures
      expect(paramsFile!.content).toContain('flatten');
      
    } finally {
      await fs.rm(outputDir, { recursive: true, force: true });
    }
  });

  it('should generate correct Dart code example', async () => {
    const outputDir = path.join(__dirname, 'test-output-example');
    await fs.mkdir(outputDir, { recursive: true });
    
    try {
      // Write spec to a temp file
      const specPath = path.join(outputDir, 'example-spec.json');
      await fs.writeFile(specPath, JSON.stringify(testSpec, null, 2));
      
      const files = await generateDartCode({
        input: specPath,
        output: {
          target: outputDir,
          mode: 'split',
          client: 'dio'
        }
      });

      const paramsFile = files.find(f => 
        f.path.includes('test_complex_params_params.f.dart')
      );
      
      // Verify the generated code structure
      expect(paramsFile!.content).toContain('class TestComplexParamsParams');
      expect(paramsFile!.content).toContain('String type');
      expect(paramsFile!.content).toContain('PayloadDto payload');
      expect(paramsFile!.content).toContain('int? length');
      
      // Verify the toQueryParameters method
      const toQueryParamsMatch = paramsFile!.content.match(
        /Map<String, dynamic> toQueryParameters\(\) \{[\s\S]*?\n {2}\}/
      );
      expect(toQueryParamsMatch).toBeDefined();
      
      // The method should flatten the payload object
      const methodBody = toQueryParamsMatch![0];
      expect(methodBody).toContain('flatten');
      expect(methodBody).toContain('result');
      
    } finally {
      await fs.rm(outputDir, { recursive: true, force: true });
    }
  });

  it('should correctly handle Object type parameters', async () => {
    const objectSpec = {
      ...testSpec,
      paths: {
        '/test/object-params': {
          get: {
            operationId: 'testObjectParams',
            parameters: [
              {
                name: 'cursor',
                in: 'query',
                schema: { $ref: '#/components/schemas/Object' }
              },
              {
                name: 'limit',
                in: 'query',
                schema: { type: 'integer' }
              }
            ],
            responses: {
              '200': { description: 'OK' }
            }
          }
        }
      },
      components: {
        schemas: {
          Object: {
            type: 'object',
            properties: {}
          }
        }
      }
    };

    const outputDir = path.join(__dirname, 'test-output-object');
    await fs.mkdir(outputDir, { recursive: true });
    
    try {
      // Write spec to a temp file
      const specPath = path.join(outputDir, 'object-spec.json');
      await fs.writeFile(specPath, JSON.stringify(objectSpec, null, 2));
      
      const files = await generateDartCode({
        input: specPath,
        output: {
          target: outputDir,
          mode: 'split',
          client: 'dio'
        }
      });

      const paramsFile = files.find(f => 
        f.path.includes('test_object_params_params.f.dart')
      );
      
      expect(paramsFile).toBeDefined();
      expect(paramsFile!.content).toContain('Object? cursor');
      expect(paramsFile!.content).toContain('toQueryParameters()');
      
      // Should not try to import Object
      expect(paramsFile!.content).not.toContain("import '../object.f.dart'");
      
    } finally {
      await fs.rm(outputDir, { recursive: true, force: true });
    }
  });

  it('should handle arrays in query parameters', async () => {
    const arraySpec = {
      openapi: '3.0.0',
      info: {
        title: 'Test API',
        version: '1.0.0'
      },
      paths: {
        '/test/array-params': {
          get: {
            operationId: 'testArrayParams',
            parameters: [
              {
                name: 'ids',
                in: 'query',
                schema: {
                  type: 'array',
                  items: { type: 'string' }
                }
              },
              {
                name: 'filters',
                in: 'query',
                schema: { $ref: '#/components/schemas/FilterDto' }
              }
            ],
            responses: {
              '200': { description: 'OK' }
            }
          }
        }
      },
      components: {
        schemas: {
          FilterDto: {
            type: 'object',
            properties: {
              tags: {
                type: 'array',
                items: { type: 'string' }
              },
              values: {
                type: 'array',
                items: { 
                  type: 'object',
                  properties: {
                    key: { type: 'string' },
                    value: { type: 'string' }
                  }
                }
              }
            }
          }
        }
      }
    };

    const outputDir = path.join(__dirname, 'test-output-arrays');
    await fs.mkdir(outputDir, { recursive: true });
    
    try {
      const specPath = path.join(outputDir, 'array-spec.json');
      await fs.writeFile(specPath, JSON.stringify(arraySpec, null, 2));
      
      const files = await generateDartCode({
        input: specPath,
        output: {
          target: outputDir,
          mode: 'split',
          client: 'dio'
        }
      });

      const paramsFile = files.find(f => 
        f.path.includes('test_array_params_params.f.dart')
      );
      
      expect(paramsFile).toBeDefined();
      expect(paramsFile!.content).toContain('List<String>? ids');
      expect(paramsFile!.content).toContain('FilterDto? filters');
      expect(paramsFile!.content).toContain('toQueryParameters()');
      
      // Check that array handling is present
      expect(paramsFile!.content).toContain('if (value is List)');
      expect(paramsFile!.content).toContain('for (var i = 0; i < value.length; i++)');
      
    } finally {
      await fs.rm(outputDir, { recursive: true, force: true });
    }
  });

  it('should not generate toQueryParameters for simple params', async () => {
    const simpleSpec = {
      openapi: '3.0.0',
      info: {
        title: 'Test API',
        version: '1.0.0'
      },
      paths: {
        '/test/simple': {
          get: {
            operationId: 'testSimple',
            parameters: [
              {
                name: 'id',
                in: 'query',
                schema: { type: 'string' }
              },
              {
                name: 'count',
                in: 'query',
                schema: { type: 'integer' }
              },
              {
                name: 'active',
                in: 'query',
                schema: { type: 'boolean' }
              }
            ],
            responses: {
              '200': { description: 'OK' }
            }
          }
        }
      }
    };

    const outputDir = path.join(__dirname, 'test-output-simple');
    await fs.mkdir(outputDir, { recursive: true });
    
    try {
      const specPath = path.join(outputDir, 'simple-spec.json');
      await fs.writeFile(specPath, JSON.stringify(simpleSpec, null, 2));
      
      const files = await generateDartCode({
        input: specPath,
        output: {
          target: outputDir,
          mode: 'split',
          client: 'dio'
        }
      });

      const paramsFile = files.find(f => 
        f.path.includes('test_simple_params.f.dart')
      );
      
      expect(paramsFile).toBeDefined();
      
      // Should NOT contain toQueryParameters for simple params
      expect(paramsFile!.content).not.toContain('toQueryParameters()');
      expect(paramsFile!.content).not.toContain('flatten');
      
    } finally {
      await fs.rm(outputDir, { recursive: true, force: true });
    }
  });

  it('should handle mixed parameter types correctly', async () => {
    const mixedSpec = {
      openapi: '3.0.0',
      info: {
        title: 'Test API',
        version: '1.0.0'
      },
      paths: {
        '/test/mixed': {
          get: {
            operationId: 'testMixed',
            parameters: [
              {
                name: 'simple',
                in: 'query',
                schema: { type: 'string' }
              },
              {
                name: 'complex',
                in: 'query',
                schema: { $ref: '#/components/schemas/ComplexDto' }
              },
              {
                name: 'cursor',
                in: 'query',
                schema: { type: 'object' }  // Object type
              }
            ],
            responses: {
              '200': { description: 'OK' }
            }
          }
        }
      },
      components: {
        schemas: {
          ComplexDto: {
            type: 'object',
            properties: {
              nested: {
                type: 'object',
                properties: {
                  value: { type: 'string' }
                }
              },
              list: {
                type: 'array',
                items: { type: 'string' }
              }
            }
          }
        }
      }
    };

    const outputDir = path.join(__dirname, 'test-output-mixed');
    await fs.mkdir(outputDir, { recursive: true });
    
    try {
      const specPath = path.join(outputDir, 'mixed-spec.json');
      await fs.writeFile(specPath, JSON.stringify(mixedSpec, null, 2));
      
      const files = await generateDartCode({
        input: specPath,
        output: {
          target: outputDir,
          mode: 'split',
          client: 'dio'
        }
      });

      const paramsFile = files.find(f => 
        f.path.includes('test_mixed_params.f.dart')
      );
      
      expect(paramsFile).toBeDefined();
      
      // Check for cursor parameter - it could be Object or Map<String, dynamic>
      // depending on how the schema is processed
      
      expect(paramsFile!.content).toContain('String? simple');
      expect(paramsFile!.content).toContain('ComplexDto? complex');
      // When schema type is 'object' (not a ref), it might generate Map<String, dynamic>
      const hasCursorAsObject = paramsFile!.content.includes('Object? cursor');
      const hasCursorAsMap = paramsFile!.content.includes('Map<String, dynamic>? cursor');
      expect(hasCursorAsObject || hasCursorAsMap).toBeTruthy();
      expect(paramsFile!.content).toContain('toQueryParameters()');
      
      // Should have the private constructor for complex params
      expect(paramsFile!.content).toContain('const TestMixedParams._();');
      
      // Should not import dart:convert
      expect(paramsFile!.content).not.toContain("import 'dart:convert'");
      
    } finally {
      await fs.rm(outputDir, { recursive: true, force: true });
    }
  });

  it('should verify flattening output format', async () => {
    // This test verifies the actual output format of flattening
    const outputDir = path.join(__dirname, 'test-output-format');
    await fs.mkdir(outputDir, { recursive: true });
    
    try {
      const specPath = path.join(outputDir, 'format-spec.json');
      await fs.writeFile(specPath, JSON.stringify(testSpec, null, 2));
      
      const files = await generateDartCode({
        input: specPath,
        output: {
          target: outputDir,
          mode: 'split',
          client: 'dio'
        }
      });

      const paramsFile = files.find(f => 
        f.path.includes('test_complex_params_params.f.dart')
      );
      
      expect(paramsFile).toBeDefined();
      
      // Verify the flattening logic produces correct format
      const content = paramsFile!.content;
      
      // Check for correct bracket notation
      expect(content).toContain("prefix.isEmpty ? nestedKey : '$prefix[$nestedKey]'");
      
      // Check for list index notation
      expect(content).toContain("'$prefix[$i]'");
      
      // Verify no JSON encoding is used
      expect(content).not.toContain('json.encode');
      expect(content).not.toContain('jsonEncode');
      
    } finally {
      await fs.rm(outputDir, { recursive: true, force: true });
    }
  });
});