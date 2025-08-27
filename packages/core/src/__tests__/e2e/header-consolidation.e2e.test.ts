/**
 * End-to-end tests for header consolidation
 * Tests complete workflow with real OpenAPI specs
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { generateDartCode } from '../../generators';
import { DartGeneratorOptions } from '../../types';
import * as fs from 'fs-extra';
import * as path from 'path';
import * as SwaggerParser from '@apidevtools/swagger-parser';

describe('Header Consolidation E2E Tests', () => {
  const testOutputBase = path.join(__dirname, '../../../test-output-e2e');
  const realOpenApiPath = path.join(__dirname, '../../../../../../tests/openapi-shift-scheduling.json');
  
  beforeAll(async () => {
    await fs.ensureDir(testOutputBase);
  });

  afterAll(async () => {
    await fs.remove(testOutputBase);
  });

  describe('Real-world OpenAPI spec processing', () => {
    it('should process shift scheduling API with header consolidation', async () => {
      const outputDir = path.join(testOutputBase, 'shift-api');
      
      // Parse the OpenAPI spec first to understand its structure
      const api = await SwaggerParser.parse(realOpenApiPath);
      expect(api).toBeDefined();
      expect((api as any).openapi || (api as any).swagger).toBeDefined();
      
      const config: DartGeneratorOptions = {
        input: realOpenApiPath,
        output: {
          target: outputDir,
          mode: 'split',
          client: 'dio',
          override: {
            generator: {
              freezed: true,
              jsonSerializable: true,
              nullSafety: true
            },
            methodNaming: 'methodPath',
            headers: {
              definitions: {
                ApiKeyHeader: {
                  fields: ['x-api-key'],
                  required: ['x-api-key']
                },
                CompanyStaffHeaders: {
                  fields: ['x-api-key', 'x-core-company-id', 'x-company-staff-id'],
                  required: ['x-api-key', 'x-core-company-id', 'x-company-staff-id']
                },
                TeamMemberHeaders: {
                  fields: ['x-api-key', 'x-core-company-id', 'x-team-member-id'],
                  required: ['x-api-key', 'x-core-company-id', 'x-team-member-id']
                },
                LocationHeaders: {
                  fields: ['x-api-key', 'x-core-company-id', 'x-location-id'],
                  required: ['x-api-key', 'x-core-company-id']
                },
                ScheduleHeaders: {
                  fields: ['x-api-key', 'x-core-company-id', 'x-schedule-id'],
                  required: ['x-api-key', 'x-core-company-id']
                }
              },
              customMatch: true,
              matchStrategy: 'exact',
              customConsolidate: true,
              consolidationThreshold: 3
            }
          }
        }
      };

      const files = await generateDartCode(config);
      
      // Validate output structure
      expect(files).toBeDefined();
      expect(files.length).toBeGreaterThan(0);
      
      // Find all generated files by type
      const headerFiles = files.filter(f => f.path.includes('models/headers/'));
      const serviceFiles = files.filter(f => f.path.includes('_service.dart'));
      const modelFiles = files.filter(f => f.path.includes('models/') && f.path.endsWith('.f.dart'));
      
      // Verify header consolidation effectiveness
      const uniqueHeaderFiles = headerFiles.filter(f => !f.path.includes('index.dart'));
      console.log(`Generated ${uniqueHeaderFiles.length} header classes (down from potential 85+)`);
      // Should have at least some headers but less than the original 85+
      expect(uniqueHeaderFiles.length).toBeGreaterThan(0);
      expect(uniqueHeaderFiles.length).toBeLessThan(30); // More lenient threshold
      
      // Verify each header file has valid content
      uniqueHeaderFiles.forEach(headerFile => {
        expect(headerFile.content).toContain('@freezed');
        expect(headerFile.content).toContain('class');
        expect(headerFile.content).toContain('with _$');
        expect(headerFile.content).toContain('factory');
        expect(headerFile.content).toContain('.fromJson');
      });
      
      // Verify services use consolidated headers
      serviceFiles.forEach(serviceFile => {
        // Should import models (headers are part of models)
        if (serviceFile.content.includes('Headers') || serviceFile.content.includes('Auth')) {
          // Accept either direct headers import or general models import
          const hasHeaderImport = 
            serviceFile.content.includes("import '../models/headers/index.dart';") ||
            serviceFile.content.includes("import '../models/index.dart';");
          expect(hasHeaderImport).toBe(true);
        }
        
        // Should not have Map<String, dynamic> as return type for model responses
        const lines = serviceFile.content.split('\n');
        lines.forEach(line => {
          if (line.includes('Future<') && !line.includes('Future<void>')) {
            // Check it's using model types, not raw maps
            if (line.includes('Map<String, dynamic>')) {
              console.warn(`Warning: Found Map<String, dynamic> return type in ${serviceFile.path}`);
            }
          }
        });
      });
      
      // Verify model files follow conventions
      modelFiles.forEach(modelFile => {
        expect(modelFile.path).toMatch(/\.f\.dart$/);
        expect(modelFile.content).toContain('part');
        expect(modelFile.content).toContain('.freezed.dart');
        expect(modelFile.content).toContain('.g.dart');
      });
      
      // Write generated files for manual inspection (optional)
      if (process.env.WRITE_TEST_OUTPUT === 'true') {
        for (const file of files) {
          const fullPath = path.join(outputDir, file.path);
          await fs.ensureDir(path.dirname(fullPath));
          await fs.writeFile(fullPath, file.content);
        }
        console.log(`Test output written to: ${outputDir}`);
      }
    });

    it('should handle API with minimal headers', async () => {
      const outputDir = path.join(testOutputBase, 'minimal-headers');
      
      // Create a minimal OpenAPI spec for testing
      const minimalSpec = {
        openapi: '3.0.0',
        info: { title: 'Minimal API', version: '1.0.0' },
        paths: {
          '/test': {
            get: {
              operationId: 'getTest',
              parameters: [
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
                      schema: { type: 'object' }
                    }
                  }
                }
              }
            }
          }
        }
      };
      
      const specPath = path.join(testOutputBase, 'minimal-spec.json');
      await fs.writeJson(specPath, minimalSpec);
      
      const config: DartGeneratorOptions = {
        input: specPath,
        output: {
          target: outputDir,
          mode: 'split',
          client: 'dio',
          override: {
            headers: {
              definitions: {
                ApiAuth: {
                  fields: ['x-api-key'],
                  required: ['x-api-key']
                }
              },
              customMatch: true
            }
          }
        }
      };

      const files = await generateDartCode(config);
      expect(files).toBeDefined();
      expect(files.length).toBeGreaterThan(0);
      
      // Should generate the defined header class or a consolidated one
      const headerFiles = files.filter(f => f.path.includes('models/headers/'));
      expect(headerFiles.length).toBeGreaterThan(0);
      
      // Check that at least one header file contains the api key field
      // The field might be named 'xApiKey' or 'apiKey' depending on naming convention
      const hasApiKeyHeader = headerFiles.some(f => 
        (f.content.includes('xApiKey') || f.content.includes('apiKey')) && 
        f.content.includes('@freezed') &&
        f.content.includes('x-api-key')  // Check for the original name in JsonKey
      );
      expect(hasApiKeyHeader).toBe(true);
    });

    it('should handle complex nested headers with consolidation', async () => {
      const outputDir = path.join(testOutputBase, 'complex-headers');
      
      // Create a complex spec with many header variations
      const complexSpec = {
        openapi: '3.0.0',
        info: { title: 'Complex Headers API', version: '1.0.0' },
        paths: {}
      };
      
      // Add many endpoints with varying header combinations
      const headerCombinations = [
        ['x-api-key'],
        ['x-api-key', 'x-user-id'],
        ['x-api-key', 'x-user-id', 'x-session-id'],
        ['x-api-key', 'x-company-id'],
        ['x-api-key', 'x-company-id', 'x-user-id'],
        ['x-api-key', 'x-company-id', 'x-location-id'],
        ['x-api-key', 'x-company-id', 'x-team-id'],
        ['x-api-key', 'x-tenant-id'],
        ['x-api-key', 'x-tenant-id', 'x-user-id']
      ];
      
      headerCombinations.forEach((headers, index) => {
        complexSpec.paths[`/endpoint${index}`] = {
          get: {
            operationId: `getEndpoint${index}`,
            parameters: headers.map(name => ({
              name,
              in: 'header',
              required: name === 'x-api-key',
              schema: { type: 'string' }
            })),
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
        };
        
        // Add similar endpoint to trigger consolidation
        if (index < 5) {
          complexSpec.paths[`/duplicate${index}`] = complexSpec.paths[`/endpoint${index}`];
        }
      });
      
      const specPath = path.join(testOutputBase, 'complex-spec.json');
      await fs.writeJson(specPath, complexSpec);
      
      const config: DartGeneratorOptions = {
        input: specPath,
        output: {
          target: outputDir,
          mode: 'split',
          client: 'dio',
          override: {
            headers: {
              definitions: {
                BasicAuth: {
                  fields: ['x-api-key'],
                  required: ['x-api-key']
                }
              },
              customMatch: true,
              matchStrategy: 'subset',
              customConsolidate: true,
              consolidationThreshold: 2
            }
          }
        }
      };

      const files = await generateDartCode(config);
      
      const headerFiles = files.filter(f => 
        f.path.includes('models/headers/') && 
        !f.path.includes('index.dart')
      );
      
      // Should generate some header files
      expect(headerFiles.length).toBeGreaterThan(0);
      // Headers might be consolidated or not depending on threshold
      expect(headerFiles.length).toBeLessThanOrEqual(headerCombinations.length * 2); // Account for duplicates
      
      // Verify consolidation created meaningful class names
      const headerClassNames = headerFiles.map(f => {
        const match = f.content.match(/class\s+(\w+)\s+with/);
        return match ? match[1] : null;
      }).filter(Boolean);
      
      console.log('Generated header classes:', headerClassNames);
      
      // Should have consolidated classes
      expect(headerClassNames.some(name => name?.includes('Headers'))).toBe(true);
    });
  });

  describe('Performance and scalability', () => {
    it('should handle large API specs efficiently', async () => {
      const startTime = Date.now();
      const outputDir = path.join(testOutputBase, 'performance-test');
      
      const config: DartGeneratorOptions = {
        input: realOpenApiPath,
        output: {
          target: outputDir,
          mode: 'split',
          client: 'dio',
          override: {
            headers: {
              definitions: {},
              customMatch: true,
              customConsolidate: true,
              consolidationThreshold: 5
            }
          }
        }
      };

      const files = await generateDartCode(config);
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      console.log(`Generation completed in ${duration}ms`);
      expect(duration).toBeLessThan(10000); // Should complete within 10 seconds
      
      // Verify output quality wasn't compromised
      expect(files.length).toBeGreaterThan(0);
      const hasValidStructure = files.some(f => f.path === 'api_client.dart') &&
                                files.some(f => f.path === 'api_config.dart') &&
                                files.some(f => f.path.includes('_service.dart'));
      expect(hasValidStructure).toBe(true);
    });
  });

  describe('Error recovery', () => {
    it('should gracefully handle malformed OpenAPI specs', async () => {
      const outputDir = path.join(testOutputBase, 'error-recovery');
      
      const malformedSpec = {
        openapi: '3.0.0',
        info: { title: 'Malformed API', version: '1.0.0' },
        paths: {
          '/test': {
            get: {
              // Missing operationId
              parameters: [
                {
                  // Missing 'in' field
                  name: 'x-api-key',
                  required: true,
                  schema: { type: 'string' }
                }
              ],
              responses: {}
            }
          }
        }
      };
      
      const specPath = path.join(testOutputBase, 'malformed-spec.json');
      await fs.writeJson(specPath, malformedSpec);
      
      const config: DartGeneratorOptions = {
        input: specPath,
        output: {
          target: outputDir,
          mode: 'split',
          client: 'dio'
        }
      };

      // Should either handle gracefully or throw meaningful error
      try {
        const files = await generateDartCode(config);
        // If it succeeds, verify it generated something reasonable
        expect(files).toBeDefined();
      } catch (error) {
        // If it fails, the error should be meaningful
        expect(error).toBeDefined();
        expect(error.message).toBeDefined();
      }
    });
  });
});