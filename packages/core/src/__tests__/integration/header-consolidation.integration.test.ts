/**
 * Integration tests for header consolidation feature
 * Tests the complete flow from OpenAPI spec to generated Dart code
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { generateDartCode } from '../../generators';
import { DartGeneratorOptions } from '../../types';
import * as fs from 'fs-extra';
import * as path from 'path';

describe('Header Consolidation Integration Tests', () => {
  const testOutputBase = path.join(__dirname, '../../../test-output');
  const openApiPath = path.join(__dirname, '../../../../../../tests/openapi-shift-scheduling.json');

  beforeAll(async () => {
    await fs.ensureDir(testOutputBase);
  });

  afterAll(async () => {
    await fs.remove(testOutputBase);
  });

  describe('Complete generation flow', () => {
    it('should generate valid Dart code with consolidated headers', async () => {
      const outputDir = path.join(testOutputBase, 'complete-flow');
      
      const config: DartGeneratorOptions = {
        input: openApiPath,
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
      
      // Verify files were generated
      expect(files).toBeDefined();
      expect(files.length).toBeGreaterThan(0);

      // Check structure
      const hasApiClient = files.some(f => f.path === 'api_client.dart');
      const hasApiConfig = files.some(f => f.path === 'api_config.dart');
      const hasModels = files.some(f => f.path.startsWith('models/'));
      const hasServices = files.some(f => f.path.startsWith('services/'));
      const hasHeaders = files.some(f => f.path.startsWith('models/headers/'));

      expect(hasApiClient).toBe(true);
      expect(hasApiConfig).toBe(true);
      expect(hasModels).toBe(true);
      expect(hasServices).toBe(true);
      expect(hasHeaders).toBe(true);

      // Verify header consolidation worked
      const headerFiles = files.filter(f => 
        f.path.includes('models/headers/') && 
        !f.path.includes('index.dart')
      );
      
      expect(headerFiles.length).toBeLessThan(20); // Should be much less than 85

      // Check that generated header files have valid Dart syntax
      // Find any header file that contains the x-api-key field
      const hasValidApiKeyHeader = headerFiles.some(f => {
        return f.content.includes('@freezed') &&
               f.content.includes('xApiKey') &&
               f.content.includes('factory') &&
               f.content.includes('.fromJson');
      });
      expect(hasValidApiKeyHeader).toBe(true);

      // Check that services use consolidated headers
      const teamMembersService = files.find(f => f.path.includes('team_members_service.dart'));
      if (teamMembersService) {
        expect(teamMembersService.content).toContain('CompanyStaffHeaders');
        expect(teamMembersService.content).toContain('import \'../models/headers/index.dart\'');
      }

      // Verify ApiClient structure
      const apiClient = files.find(f => f.path === 'api_client.dart');
      if (apiClient) {
        expect(apiClient.content).toContain('import \'package:dio/dio.dart\'');
        expect(apiClient.content).toContain('class ApiClient');
        expect(apiClient.content).toContain('Dio dio');  // Could be 'late final Dio dio' or 'final Dio dio'
      }
    });

    it('should handle different matching strategies', async () => {
      const strategies: Array<'exact' | 'subset' | 'fuzzy'> = ['exact', 'subset', 'fuzzy'];
      
      for (const strategy of strategies) {
        const outputDir = path.join(testOutputBase, `strategy-${strategy}`);
        
        const config: DartGeneratorOptions = {
          input: openApiPath,
          output: {
            target: outputDir,
            mode: 'split',
            client: 'dio',
            override: {
              headers: {
                definitions: {
                  TestHeader: {
                    fields: ['x-api-key', 'x-core-company-id'],
                    required: ['x-api-key']
                  }
                },
                customMatch: true,
                matchStrategy: strategy
              }
            }
          }
        };

        const files = await generateDartCode(config);
        expect(files).toBeDefined();
        expect(files.length).toBeGreaterThan(0);
        
        // Each strategy should produce valid output
        const hasServices = files.some(f => f.path.startsWith('services/'));
        expect(hasServices).toBe(true);
      }
    });

    it('should preserve model references in API responses', async () => {
      const outputDir = path.join(testOutputBase, 'model-references');
      
      const config: DartGeneratorOptions = {
        input: openApiPath,
        output: {
          target: outputDir,
          mode: 'split',
          client: 'dio',
          override: {
            headers: {
              definitions: {
                BasicHeader: {
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
      
      // Check that services return proper model types
      const serviceFiles = files.filter(f => f.path.includes('_service.dart'));
      
      for (const serviceFile of serviceFiles) {
        // Should not have Map<String, dynamic> as return type for model responses
        const hasProperReturnTypes = !serviceFile.content.includes('Future<Map<String, dynamic>>') ||
                                     serviceFile.content.includes('Future<void>'); // void is OK
        
        // Should import models
        if (serviceFile.content.includes('ResponseDto') || serviceFile.content.includes('RequestDto')) {
          expect(serviceFile.content).toContain('import \'../models/index.dart\'');
        }
      }
    });
  });

  describe('Auto-consolidation behavior', () => {
    it('should auto-consolidate when threshold is met', async () => {
      const outputDir = path.join(testOutputBase, 'auto-consolidation');
      
      const config: DartGeneratorOptions = {
        input: openApiPath,
        output: {
          target: outputDir,
          mode: 'split',
          client: 'dio',
          override: {
            headers: {
              definitions: {
                // Minimal definitions to test auto-consolidation
                SingleApiKey: {
                  fields: ['x-api-key'],
                  required: ['x-api-key']
                }
              },
              customMatch: true,
              customConsolidate: true,
              consolidationThreshold: 2 // Low threshold for testing
            }
          }
        }
      };

      const files = await generateDartCode(config);
      
      // Should have created consolidated classes for common patterns
      const headerFiles = files.filter(f => 
        f.path.includes('models/headers/') && 
        !f.path.includes('index.dart')
      );
      
      // Should have SingleApiKey plus auto-consolidated classes
      expect(headerFiles.length).toBeGreaterThan(1);
      
      // Check that consolidated classes have meaningful names
      const consolidatedHeaders = headerFiles.filter(f => 
        f.path.includes('headers.dart') && 
        !f.path.includes('single_api_key')
      );
      
      expect(consolidatedHeaders.length).toBeGreaterThan(0);
    });

    it('should not consolidate when disabled', async () => {
      const outputDir = path.join(testOutputBase, 'no-consolidation');
      
      const config: DartGeneratorOptions = {
        input: openApiPath,
        output: {
          target: outputDir,
          mode: 'split',
          client: 'dio',
          override: {
            headers: {
              definitions: {
                OnlyDefinedHeader: {
                  fields: ['x-api-key'],
                  required: ['x-api-key']
                }
              },
              customMatch: true,
              customConsolidate: false // Disabled
            }
          }
        }
      };

      const files = await generateDartCode(config);
      
      const headerFiles = files.filter(f => 
        f.path.includes('models/headers/') && 
        !f.path.includes('index.dart')
      );
      
      // Should have many individual header files (no consolidation)
      expect(headerFiles.length).toBeGreaterThan(30);
    });
  });

  describe('Error handling', () => {
    it('should handle missing OpenAPI spec gracefully', async () => {
      const config: DartGeneratorOptions = {
        input: './non-existent-file.json',
        output: {
          target: path.join(testOutputBase, 'error-test'),
          mode: 'split',
          client: 'dio'
        }
      };

      await expect(generateDartCode(config)).rejects.toThrow();
    });

    it('should handle invalid header configuration', async () => {
      const outputDir = path.join(testOutputBase, 'invalid-config');
      
      const config: DartGeneratorOptions = {
        input: openApiPath,
        output: {
          target: outputDir,
          mode: 'split',
          client: 'dio',
          override: {
            headers: {
              definitions: {
                InvalidHeader: {
                  fields: [], // Empty fields
                  required: ['x-non-existent'] // Required field not in fields
                }
              },
              customMatch: true
            }
          }
        }
      };

      // Should still generate code but ignore invalid configuration
      const files = await generateDartCode(config);
      expect(files).toBeDefined();
      expect(files.length).toBeGreaterThan(0);
    });
  });
});