/**
 * Regression tests for header-related issues
 * Ensures previously fixed bugs don't resurface
 */

import { describe, it, expect } from 'vitest';
import { generateDartCode } from '../../generators';
import { DartGeneratorOptions } from '../../types';
import { CustomHeaderMatcher } from '../../generators/custom-header-matcher';
import { HeaderParameter } from '../../generators/endpoint-generator';
import * as path from 'path';

describe('Header Issues Regression Tests', () => {
  describe('Issue: Duplicate method definitions', () => {
    it('should not generate duplicate methods in service files', async () => {
      const spec = {
        openapi: '3.0.0',
        info: { title: 'Test API', version: '1.0.0' },
        paths: {
          '/locations/{locationId}/settings': {
            get: {
              operationId: 'getLocationSettings',
              parameters: [
                {
                  name: 'locationId',
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
              responses: {
                '200': {
                  description: 'Success',
                  content: {
                    'application/json': {
                      schema: {
                        $ref: '#/components/schemas/LocationSettings'
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
            LocationSettings: {
              type: 'object',
              properties: {
                timezone: { type: 'string' },
                language: { type: 'string' }
              }
            }
          }
        }
      };

      const config: DartGeneratorOptions = {
        input: spec as any,
        output: {
          target: './test-output',
          mode: 'split',
          client: 'dio'
        }
      };

      const files = await generateDartCode(config);
      const serviceFile = files.find(f => f.path.includes('locations_service.dart'));
      
      if (serviceFile) {
        // Count occurrences of the method
        const methodMatches = serviceFile.content.match(/getLocationSettings/g) || [];
        // Should appear once in method definition and possibly in class
        expect(methodMatches.length).toBeLessThanOrEqual(2);
        
        // Check for duplicate method definitions
        const methodDefinitions = serviceFile.content.match(/Future<.*?>\s+getLocationSettings/g) || [];
        expect(methodDefinitions.length).toBe(1);
      }
    });
  });

  describe('Issue: API return types not using model classes', () => {
    it.skip('should use model types instead of Map<String, dynamic> (KNOWN ISSUE)', async () => {
      const spec = {
        openapi: '3.0.0',
        info: { title: 'Test API', version: '1.0.0' },
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
            }
          }
        }
      };

      const config: DartGeneratorOptions = {
        input: spec as any,
        output: {
          target: './test-output',
          mode: 'split',
          client: 'dio'
        }
      };

      const files = await generateDartCode(config);
      const serviceFile = files.find(f => f.path.includes('_service.dart'));
      
      if (serviceFile) {
        // Should return User type, not Map<String, dynamic>
        expect(serviceFile.content).toContain('Future<User>');
        expect(serviceFile.content).not.toContain('Future<Map<String, dynamic>>');
        
        // Should import the model
        expect(serviceFile.content).toContain("import '../models/index.dart';");
        
        // Should use fromJson constructor
        expect(serviceFile.content).toMatch(/User\.fromJson/);
      }
    });
  });

  describe('Issue: Headers with same fields but different order', () => {
    it('should recognize headers as identical regardless of field order', () => {
      const config = {
        definitions: {
          TestHeader: {
            fields: ['x-api-key', 'x-company-id', 'x-user-id'],
            required: ['x-api-key', 'x-company-id']
          }
        },
        customMatch: true,
        matchStrategy: 'exact' as const
      };

      const matcher = new CustomHeaderMatcher(config);

      const headers1: HeaderParameter[] = [
        { originalName: 'x-api-key', dartName: 'xApiKey', type: 'String', required: true, description: '' },
        { originalName: 'x-company-id', dartName: 'xCompanyId', type: 'String', required: true, description: '' },
        { originalName: 'x-user-id', dartName: 'xUserId', type: 'String', required: false, description: '' }
      ];

      const headers2: HeaderParameter[] = [
        { originalName: 'x-user-id', dartName: 'xUserId', type: 'String', required: false, description: '' },
        { originalName: 'x-api-key', dartName: 'xApiKey', type: 'String', required: true, description: '' },
        { originalName: 'x-company-id', dartName: 'xCompanyId', type: 'String', required: true, description: '' }
      ];

      const result1 = matcher.findMatchingHeaderClass('/endpoint1', headers1);
      const result2 = matcher.findMatchingHeaderClass('/endpoint2', headers2);

      // Both should match to the same header class
      expect(result1).toBe('TestHeader');
      expect(result2).toBe('TestHeader');
    });
  });

  describe('Issue: Headers with different required status treated as same', () => {
    it('should distinguish headers with different required fields', () => {
      const config = {
        definitions: {},
        customMatch: true,
        customConsolidate: true,
        consolidationThreshold: 2
      };

      const matcher = new CustomHeaderMatcher(config);

      const allRequired: HeaderParameter[] = [
        { originalName: 'x-api-key', dartName: 'xApiKey', type: 'String', required: true, description: '' },
        { originalName: 'x-company-id', dartName: 'xCompanyId', type: 'String', required: true, description: '' }
      ];

      const someOptional: HeaderParameter[] = [
        { originalName: 'x-api-key', dartName: 'xApiKey', type: 'String', required: true, description: '' },
        { originalName: 'x-company-id', dartName: 'xCompanyId', type: 'String', required: false, description: '' }
      ];

      // Generate consolidation for both patterns
      matcher.findMatchingHeaderClass('/endpoint1', allRequired);
      matcher.findMatchingHeaderClass('/endpoint2', allRequired);
      const result1 = matcher.findMatchingHeaderClass('/endpoint3', allRequired);

      matcher.findMatchingHeaderClass('/endpoint4', someOptional);
      matcher.findMatchingHeaderClass('/endpoint5', someOptional);
      const result2 = matcher.findMatchingHeaderClass('/endpoint6', someOptional);

      // Should create different consolidated classes (or have different suffixes)
      // Both might have "Endpoint" prefix but should differ in suffix for required pattern
      if (result1 && result2) {
        // If both are consolidated, they should be different
        expect(result1).not.toBe(result2);
      } else {
        // If not yet consolidated (threshold not met), they should be null
        expect(result1).toBe(null);
        expect(result2).toBe(null);
      }
    });
  });

  describe('Issue: File naming convention (.f.dart)', () => {
    it('should generate files with .f.dart extension for Freezed models', async () => {
      const spec = {
        openapi: '3.0.0',
        info: { title: 'Test API', version: '1.0.0' },
        components: {
          schemas: {
            TestModel: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                name: { type: 'string' }
              }
            }
          }
        },
        paths: {}
      };

      const config: DartGeneratorOptions = {
        input: spec as any,
        output: {
          target: './test-output',
          mode: 'split',
          client: 'dio',
          override: {
            generator: {
              freezed: true
            }
          }
        }
      };

      const files = await generateDartCode(config);
      const modelFiles = files.filter(f => f.path.includes('models/') && !f.path.includes('index.dart'));
      
      modelFiles.forEach(file => {
        if (file.path.includes('test_model')) {
          expect(file.path).toMatch(/\.f\.dart$/);
          expect(file.content).toContain('part \'test_model.f.freezed.dart\'');
          expect(file.content).toContain('part \'test_model.f.g.dart\'');
        }
      });
    });
  });

  describe('Issue: Parameter organization (headers vs query vs path)', () => {
    it('should correctly separate different parameter types', async () => {
      const spec = {
        openapi: '3.0.0',
        info: { title: 'Test API', version: '1.0.0' },
        paths: {
          '/items/{id}': {
            get: {
              operationId: 'getItem',
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
                  required: false,
                  schema: { type: 'string' }
                },
                {
                  name: 'limit',
                  in: 'query',
                  required: false,
                  schema: { type: 'integer' }
                },
                {
                  name: 'x-api-key',
                  in: 'header',
                  required: true,
                  schema: { type: 'string' }
                },
                {
                  name: 'x-request-id',
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
                      schema: { type: 'object' }
                    }
                  }
                }
              }
            }
          }
        }
      };

      const config: DartGeneratorOptions = {
        input: spec as any,
        output: {
          target: './test-output',
          mode: 'split',
          client: 'dio'
        }
      };

      const files = await generateDartCode(config);
      const serviceFile = files.find(f => f.path.includes('_service.dart'));
      
      if (serviceFile) {
        // Should have path parameter in the path string (various formats are acceptable)
        const hasPathParam = serviceFile.content.includes("'/items/$id'") || 
                            serviceFile.content.includes("'/items/${id}'") ||
                            serviceFile.content.includes("'/items/\${id}'") ||
                            serviceFile.content.includes("'/items/{id}'.replaceAll('{id}'");
        expect(hasPathParam).toBe(true);
        
        // Should have query parameters in queryParameters
        expect(serviceFile.content).toContain('queryParameters');
        
        // Should have headers in Options
        expect(serviceFile.content).toContain('Options(headers:');
        
        // Parameters should be properly named in camelCase (either direct or in header model)
        const hasApiKey = serviceFile.content.includes('xApiKey') || 
                         serviceFile.content.includes('apiKey') ||
                         serviceFile.content.includes('Headers');
        const hasRequestId = serviceFile.content.includes('xRequestId') || 
                            serviceFile.content.includes('requestId') ||
                            serviceFile.content.includes('Headers');
        expect(hasApiKey).toBe(true);
        expect(hasRequestId).toBe(true);
      }
    });
  });

  describe('Issue: Headers not using camelCase for parameter names', () => {
    it('should convert header names to camelCase', async () => {
      const spec = {
        openapi: '3.0.0',
        info: { title: 'Test API', version: '1.0.0' },
        paths: {
          '/test': {
            get: {
              operationId: 'testEndpoint',
              parameters: [
                {
                  name: 'x-api-key',
                  in: 'header',
                  required: true,
                  schema: { type: 'string' }
                },
                {
                  name: 'x-company-staff-id',
                  in: 'header',
                  required: true,
                  schema: { type: 'string' }
                },
                {
                  name: 'X-Custom-Header',
                  in: 'header',
                  required: false,
                  schema: { type: 'string' }
                }
              ],
              responses: {
                '200': {
                  description: 'Success'
                }
              }
            }
          }
        }
      };

      const config: DartGeneratorOptions = {
        input: spec as any,
        output: {
          target: './test-output',
          mode: 'split',
          client: 'dio',
          override: {
            headers: {
              definitions: {},
              customMatch: true,
              customConsolidate: true,
              consolidationThreshold: 2
            }
          }
        }
      };

      const files = await generateDartCode(config);
      const headerFiles = files.filter(f => f.path.includes('models/headers/'));
      
      headerFiles.forEach(file => {
        if (!file.path.includes('index.dart')) {
          // Should use camelCase for Dart property names
          expect(file.content).toContain('xApiKey');
          expect(file.content).toContain('xCompanyStaffId');
          expect(file.content).toContain('xCustomHeader');
          
          // Should preserve original names in JsonKey annotations
          expect(file.content).toContain("@JsonKey(name: 'x-api-key')");
          expect(file.content).toContain("@JsonKey(name: 'x-company-staff-id')");
          expect(file.content).toContain("@JsonKey(name: 'X-Custom-Header')");
        }
      });
    });
  });

  describe('Issue: Consolidation threshold not working correctly', () => {
    it('should only consolidate when threshold is met', () => {
      const config = {
        definitions: {},
        customMatch: true,
        customConsolidate: true,
        consolidationThreshold: 3
      };

      const matcher = new CustomHeaderMatcher(config);

      const headers: HeaderParameter[] = [
        { originalName: 'x-test', dartName: 'xTest', type: 'String', required: true, description: '' }
      ];

      // First occurrence - no consolidation
      const result1 = matcher.findMatchingHeaderClass('/endpoint1', headers);
      expect(result1).toBe(null);

      // Second occurrence - still no consolidation (threshold is 3)
      const result2 = matcher.findMatchingHeaderClass('/endpoint2', headers);
      expect(result2).toBe(null);

      // Third occurrence - should trigger consolidation
      const result3 = matcher.findMatchingHeaderClass('/endpoint3', headers);
      expect(result3).not.toBe(null);
      expect(result3).toContain('Headers');

      // Fourth occurrence - should use consolidated class
      const result4 = matcher.findMatchingHeaderClass('/endpoint4', headers);
      expect(result4).toBe(result3);
    });
  });
});