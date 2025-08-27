/**
 * Tests for custom header consolidation feature
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { generateDartCode } from '../generators';
import { DartGeneratorOptions } from '../types';
import * as fs from 'fs-extra';
import * as path from 'path';

describe('Custom Header Consolidation', () => {
  const testOutputDir = path.join(__dirname, '../../test-output-custom-headers');
  const testOpenApiPath = path.join(__dirname, '../../../../../tests/openapi-shift-scheduling.json');

  beforeAll(async () => {
    // Clean up any existing test output
    await fs.remove(testOutputDir);
  });

  afterAll(async () => {
    // Clean up test output after tests
    await fs.remove(testOutputDir);
  });

  it('should generate consolidated header classes with custom matching', async () => {
    const config: DartGeneratorOptions = {
      input: testOpenApiPath,
      output: {
        target: testOutputDir,
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
                required: ['x-api-key'],
                description: 'API key only authentication'
              },
              CompanyStaffHeaders: {
                fields: ['x-api-key', 'x-core-company-id', 'x-company-staff-id'],
                required: ['x-api-key', 'x-core-company-id', 'x-company-staff-id'],
                description: 'Headers for company staff operations'
              },
              TeamMemberHeaders: {
                fields: ['x-api-key', 'x-core-company-id', 'x-team-member-id'],
                required: ['x-api-key', 'x-core-company-id', 'x-team-member-id'],
                description: 'Headers for team member operations'
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

    // Check that files were generated
    expect(files).toBeDefined();
    expect(files.length).toBeGreaterThan(0);

    // Check that header files were consolidated
    const headerFiles = files.filter(f => 
      f.path.includes('models/headers/') && 
      !f.path.includes('index.dart')
    );

    // Should have significantly fewer header files than endpoints
    expect(headerFiles.length).toBeLessThan(20); // Much less than 85 endpoint-specific headers

    // Check that consolidated header classes exist
    const apiKeyHeader = headerFiles.find(f => f.path.includes('api_key_header'));
    const companyStaffHeaders = headerFiles.find(f => f.path.includes('company_staff_headers'));
    const teamMemberHeaders = headerFiles.find(f => f.path.includes('team_member_headers'));

    expect(apiKeyHeader).toBeDefined();
    expect(companyStaffHeaders).toBeDefined();
    expect(teamMemberHeaders).toBeDefined();

    // Check that services use the consolidated headers
    const serviceFiles = files.filter(f => f.path.includes('services/') && f.path.endsWith('_service.dart'));
    expect(serviceFiles.length).toBeGreaterThan(0);

    // Check a service file for proper header usage
    const teamMembersService = serviceFiles.find(f => f.path.includes('team_members_service'));
    if (teamMembersService) {
      expect(teamMembersService.content).toContain('CompanyStaffHeaders');
      // Should not contain endpoint-specific header classes
      expect(teamMembersService.content).not.toContain('GetV1CompaniesCoreCompanyIdTeamMembersHeaders');
    }
  });

  it('should respect field order independence', async () => {
    const config: DartGeneratorOptions = {
      input: testOpenApiPath,
      output: {
        target: testOutputDir + '-order-test',
        mode: 'split',
        client: 'dio',
        override: {
          headers: {
            definitions: {
              // Same fields, different order
              HeaderA: {
                fields: ['x-api-key', 'x-company-id', 'x-user-id'],
                required: ['x-api-key', 'x-company-id', 'x-user-id']
              },
              HeaderB: {
                fields: ['x-user-id', 'x-api-key', 'x-company-id'],
                required: ['x-user-id', 'x-api-key', 'x-company-id']
              }
            },
            customMatch: true,
            matchStrategy: 'exact'
          }
        }
      }
    };

    const files = await generateDartCode(config);
    const headerFiles = files.filter(f => 
      f.path.includes('models/headers/') && 
      !f.path.includes('index.dart')
    );

    // Should only generate one of the two headers (they're identical)
    const hasHeaderA = headerFiles.some(f => f.path.includes('header_a'));
    const hasHeaderB = headerFiles.some(f => f.path.includes('header_b'));
    
    // Only one should be generated since they have the same signature
    expect(hasHeaderA !== hasHeaderB).toBe(true);

    // Clean up
    await fs.remove(testOutputDir + '-order-test');
  });

  it('should distinguish headers with different required status', async () => {
    const config: DartGeneratorOptions = {
      input: testOpenApiPath,
      output: {
        target: testOutputDir + '-required-test',
        mode: 'split',
        client: 'dio',
        override: {
          headers: {
            definitions: {
              // Same fields, different required status
              AllRequired: {
                fields: ['x-api-key', 'x-company-id', 'x-user-id'],
                required: ['x-api-key', 'x-company-id', 'x-user-id']
              },
              SomeOptional: {
                fields: ['x-api-key', 'x-company-id', 'x-user-id'],
                required: ['x-api-key', 'x-company-id'] // x-user-id is optional
              }
            },
            customMatch: true,
            matchStrategy: 'exact'
          }
        }
      }
    };

    const files = await generateDartCode(config);
    const headerFiles = files.filter(f => 
      f.path.includes('models/headers/') && 
      !f.path.includes('index.dart')
    );

    // Should generate both headers (different required status)
    const hasAllRequired = headerFiles.some(f => f.path.includes('all_required'));
    const hasSomeOptional = headerFiles.some(f => f.path.includes('some_optional'));
    
    expect(hasAllRequired).toBe(true);
    expect(hasSomeOptional).toBe(true);

    // Clean up
    await fs.remove(testOutputDir + '-required-test');
  });

  it('should auto-consolidate common header patterns', async () => {
    const config: DartGeneratorOptions = {
      input: testOpenApiPath,
      output: {
        target: testOutputDir + '-consolidation-test',
        mode: 'split',
        client: 'dio',
        override: {
          headers: {
            definitions: {
              // Minimal definitions, let auto-consolidation work
              ApiKeyOnly: {
                fields: ['x-api-key'],
                required: ['x-api-key']
              }
            },
            customMatch: true,
            matchStrategy: 'exact',
            customConsolidate: true,
            consolidationThreshold: 2 // Low threshold for testing
          }
        }
      }
    };

    const files = await generateDartCode(config);
    const headerFiles = files.filter(f => 
      f.path.includes('models/headers/') && 
      !f.path.includes('index.dart')
    );

    // Should have some consolidated classes
    // The exact number depends on the OpenAPI spec, but should be much less than total endpoints
    expect(headerFiles.length).toBeLessThan(30);

    // Clean up
    await fs.remove(testOutputDir + '-consolidation-test');
  });

  it('should generate valid Dart code for headers', async () => {
    const config: DartGeneratorOptions = {
      input: testOpenApiPath,
      output: {
        target: testOutputDir + '-dart-validity',
        mode: 'split',
        client: 'dio',
        override: {
          headers: {
            definitions: {
              TestHeader: {
                fields: ['x-api-key', 'x-custom-header'],
                required: ['x-api-key'],
                description: 'Test header class'
              }
            },
            customMatch: true
          }
        }
      }
    };

    const files = await generateDartCode(config);
    // Find any header file that matches our TestHeader definition
    const headerFiles = files.filter(f => f.path.includes('models/headers/') && f.path.endsWith('.dart'));
    
    expect(headerFiles.length).toBeGreaterThan(0);
    
    // Check that at least one header file has the expected structure
    const hasValidHeaderFile = headerFiles.some(file => {
      // Check for either xApiKey or apiKey (both are valid camelCase conversions)
      const hasApiKey = file.content.includes('apiKey') || file.content.includes('xApiKey');
      const hasCustomHeader = file.content.includes('customHeader') || file.content.includes('xCustomHeader');
      
      return file.content.includes('@freezed') &&
             hasApiKey &&
             hasCustomHeader &&
             file.content.includes('factory') &&
             file.content.includes('.fromJson');
    });
    
    expect(hasValidHeaderFile).toBe(true);
    
    if (headerFiles.length > 0) {
      const testHeaderFile = headerFiles[0];
      // Check for proper Dart/Freezed structure
      expect(testHeaderFile.content).toContain('import \'package:freezed_annotation/freezed_annotation.dart\'');
      expect(testHeaderFile.content).toContain('.freezed.dart\'');
      expect(testHeaderFile.content).toContain('.g.dart\'');
      expect(testHeaderFile.content).toContain('@freezed');
    }

    // Clean up
    await fs.remove(testOutputDir + '-dart-validity');
  });

  it('should handle match strategies correctly', async () => {
    // Test subset matching
    const configSubset: DartGeneratorOptions = {
      input: testOpenApiPath,
      output: {
        target: testOutputDir + '-subset',
        mode: 'split',
        client: 'dio',
        override: {
          headers: {
            definitions: {
              SupersetHeader: {
                fields: ['x-api-key', 'x-company-id', 'x-user-id', 'x-extra-field'],
                required: ['x-api-key', 'x-company-id']
              }
            },
            customMatch: true,
            matchStrategy: 'subset' // Should match endpoints with subset of these fields
          }
        }
      }
    };

    const filesSubset = await generateDartCode(configSubset);
    expect(filesSubset).toBeDefined();
    expect(filesSubset.length).toBeGreaterThan(0);

    // Clean up
    await fs.remove(testOutputDir + '-subset');

    // Test fuzzy matching
    const configFuzzy: DartGeneratorOptions = {
      input: testOpenApiPath,
      output: {
        target: testOutputDir + '-fuzzy',
        mode: 'split',
        client: 'dio',
        override: {
          headers: {
            definitions: {
              SimilarHeader: {
                fields: ['x-api-key', 'x-company-id'],
                required: ['x-api-key']
              }
            },
            customMatch: true,
            matchStrategy: 'fuzzy' // Should match similar headers
          }
        }
      }
    };

    const filesFuzzy = await generateDartCode(configFuzzy);
    expect(filesFuzzy).toBeDefined();
    expect(filesFuzzy.length).toBeGreaterThan(0);

    // Clean up
    await fs.remove(testOutputDir + '-fuzzy');
  });
});