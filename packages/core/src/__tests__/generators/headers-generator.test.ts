/**
 * Tests for unified header generator
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { HeadersGenerator } from '../../generators/headers-generator';
import { HeaderParameter } from '../../generators/endpoint-generator';

describe('Unified Headers Generator', () => {
  describe('Basic Configuration Matching', () => {
    it('should match exact header configurations', () => {
      const config = {
        definitions: {
          ApiKeyHeaders: {
            fields: ['x-api-key'],
            required: ['x-api-key'],
            description: 'API key authentication'
          },
          CompanyHeaders: {
            fields: ['x-api-key', 'x-company-id', 'x-user-id'],
            required: ['x-api-key', 'x-company-id'],
            description: 'Company context headers'
          }
        },
        matchStrategy: 'exact' as const,
        customMatch: true
      };

      const generator = new HeadersGenerator(config);

      const apiKeyHeaders: HeaderParameter[] = [
        { originalName: 'x-api-key', dartName: 'xApiKey', type: 'String', required: true, description: '' }
      ];

      const companyHeaders: HeaderParameter[] = [
        { originalName: 'x-api-key', dartName: 'xApiKey', type: 'String', required: true, description: '' },
        { originalName: 'x-company-id', dartName: 'xCompanyId', type: 'String', required: true, description: '' },
        { originalName: 'x-user-id', dartName: 'xUserId', type: 'String', required: false, description: '' }
      ];

      expect(generator.getHeaderModelName('GetUsers', apiKeyHeaders)).toBe('ApiKeyHeaders');
      expect(generator.getHeaderModelName('GetCompany', companyHeaders)).toBe('CompanyHeaders');
    });

    it('should handle subset matching strategy', () => {
      const config = {
        definitions: {
          FullHeaders: {
            fields: ['x-api-key', 'x-company-id', 'x-user-id', 'x-session-id'],
            required: ['x-api-key', 'x-company-id']
          }
        },
        matchStrategy: 'subset' as const,
        customMatch: true
      };

      const generator = new HeadersGenerator(config);

      const subsetHeaders: HeaderParameter[] = [
        { originalName: 'x-api-key', dartName: 'xApiKey', type: 'String', required: true, description: '' },
        { originalName: 'x-company-id', dartName: 'xCompanyId', type: 'String', required: true, description: '' }
      ];

      expect(generator.getHeaderModelName('GetSubset', subsetHeaders)).toBe('FullHeaders');
    });

    it('should handle fuzzy matching strategy', () => {
      const config = {
        definitions: {
          AuthHeaders: {
            fields: ['x-api-key', 'x-auth-token', 'x-user-id'],
            required: ['x-api-key']
          }
        },
        matchStrategy: 'fuzzy' as const,
        customMatch: true
      };

      const generator = new HeadersGenerator(config);

      const similarHeaders: HeaderParameter[] = [
        { originalName: 'x-api-key', dartName: 'xApiKey', type: 'String', required: true, description: '' },
        { originalName: 'x-auth-token', dartName: 'xAuthToken', type: 'String', required: false, description: '' }
      ];

      expect(generator.getHeaderModelName('GetSimilar', similarHeaders)).toBe('AuthHeaders');
    });
  });

  describe('Header Consolidation', () => {
    it('should consolidate headers that meet threshold', () => {
      const config = {
        customConsolidate: true,
        consolidationThreshold: 2
      };

      const generator = new HeadersGenerator(config);

      const commonHeaders: HeaderParameter[] = [
        { originalName: 'x-api-key', dartName: 'xApiKey', type: 'String', required: true, description: '' },
        { originalName: 'x-company-id', dartName: 'xCompanyId', type: 'String', required: true, description: '' }
      ];

      // Register multiple endpoints with same headers
      generator.getHeaderModelName('GetUsers', commonHeaders);
      generator.getHeaderModelName('GetProjects', commonHeaders);
      generator.getHeaderModelName('GetTasks', commonHeaders);

      // Generate all files (triggers consolidation)
      const files = generator.generateAllHeaderFiles();

      // Should have consolidated into one file
      expect(files).toHaveLength(1);
      expect(files[0].content).toContain('Shared headers used by 3 endpoints');
    });

    it('should not consolidate below threshold', () => {
      const config = {
        customConsolidate: true,
        consolidationThreshold: 5
      };

      const generator = new HeadersGenerator(config);

      const headers1: HeaderParameter[] = [
        { originalName: 'x-api-key', dartName: 'xApiKey', type: 'String', required: true, description: '' }
      ];

      const headers2: HeaderParameter[] = [
        { originalName: 'x-auth-token', dartName: 'xAuthToken', type: 'String', required: true, description: '' }
      ];

      generator.getHeaderModelName('Endpoint1', headers1);
      generator.getHeaderModelName('Endpoint2', headers2);

      const files = generator.generateAllHeaderFiles();

      // Should have 2 separate files (not consolidated)
      expect(files).toHaveLength(2);
    });
  });

  describe('File Generation', () => {
    it('should generate correct file structure for configured headers', () => {
      const config = {
        definitions: {
          ApiAuth: {
            fields: ['x-api-key', 'x-secret'],
            required: ['x-api-key'],
            description: 'API authentication headers'
          }
        }
      };

      const generator = new HeadersGenerator(config);
      const files = generator.generateConfiguredHeaderFiles();

      expect(files).toHaveLength(1);
      expect(files[0].path).toBe('models/headers/api_auth.f.dart');
      expect(files[0].content).toContain('class ApiAuthHeaders');
      expect(files[0].content).toContain('@freezed');
      expect(files[0].content).toContain('required String xApiKey');
      expect(files[0].content).toContain('String? xSecret');
      expect(files[0].content).toContain("@JsonKey(name: 'x-api-key')");
      expect(files[0].content).toContain("@JsonKey(name: 'x-secret')");
    });

    it('should generate unique header models when no match found', () => {
      const config = {
        definitions: {
          ApiKey: {
            fields: ['x-api-key'],
            required: ['x-api-key']
          }
        },
        customMatch: true
      };

      const generator = new HeadersGenerator(config);

      const uniqueHeaders: HeaderParameter[] = [
        { originalName: 'x-custom-header', dartName: 'xCustomHeader', type: 'String', required: true, description: '' },
        { originalName: 'x-special-token', dartName: 'xSpecialToken', type: 'String', required: false, description: '' }
      ];

      const modelName = generator.getHeaderModelName('UniqueEndpoint', uniqueHeaders);
      expect(modelName).toBe('UniqueEndpointHeaders');

      const file = generator.generateHeaderModel('UniqueEndpoint', uniqueHeaders);
      expect(file).toBeDefined();
      expect(file?.path).toBe('models/headers/unique_endpoint_headers.f.dart');
      expect(file?.content).toContain('class UniqueEndpointHeaders');
      expect(file?.content).toContain('required String xCustomHeader');
      expect(file?.content).toContain('String? xSpecialToken');
    });
  });

  describe('Statistics and Reporting', () => {
    it('should generate accurate statistics', () => {
      const config = {
        definitions: {
          SharedAuth: {
            fields: ['x-api-key'],
            required: ['x-api-key']
          }
        },
        customMatch: true,
        customConsolidate: true,
        consolidationThreshold: 2
      };

      const generator = new HeadersGenerator(config);

      const sharedHeaders: HeaderParameter[] = [
        { originalName: 'x-api-key', dartName: 'xApiKey', type: 'String', required: true, description: '' }
      ];

      const uniqueHeaders: HeaderParameter[] = [
        { originalName: 'x-unique', dartName: 'xUnique', type: 'String', required: true, description: '' }
      ];

      // Register endpoints
      generator.getHeaderModelName('Endpoint1', sharedHeaders);
      generator.getHeaderModelName('Endpoint2', sharedHeaders);
      generator.getHeaderModelName('Endpoint3', uniqueHeaders);

      // Generate files to trigger consolidation
      generator.generateAllHeaderFiles();

      const stats = generator.getStatistics();

      expect(stats.totalModels).toBe(2); // SharedAuth + UniqueHeaders
      expect(stats.sharedModels).toBe(1); // SharedAuth
      expect(stats.uniqueModels).toBe(1); // UniqueHeaders
      expect(stats.totalEndpoints).toBe(3);
    });

    it('should generate comprehensive report', () => {
      const config = {
        definitions: {
          ApiKey: {
            fields: ['x-api-key'],
            required: ['x-api-key']
          }
        },
        customMatch: true,
        customConsolidate: true
      };

      const generator = new HeadersGenerator(config);

      const headers: HeaderParameter[] = [
        { originalName: 'x-api-key', dartName: 'xApiKey', type: 'String', required: true, description: '' }
      ];

      generator.getHeaderModelName('GetUsers', headers);
      generator.getHeaderModelName('GetProjects', headers);

      generator.generateAllHeaderFiles();

      const report = generator.generateReport();

      expect(report).toContain('# Header Generation Report');
      expect(report).toContain('## Statistics');
      expect(report).toContain('Total header models:');
      expect(report).toContain('Shared models:');
      expect(report).toContain('Total endpoints:');
      expect(report).toContain('## Shared Model Usage');
      expect(report).toContain('ApiKey');
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty headers array', () => {
      const generator = new HeadersGenerator();

      expect(generator.getHeaderModelName('Empty', [])).toBeNull();
      expect(generator.generateHeaderModel('Empty', [])).toBeNull();
    });

    it('should handle headers with different order but same content', () => {
      const config = {
        definitions: {
          OrderedHeaders: {
            fields: ['a', 'b', 'c'],
            required: ['a', 'b', 'c']
          }
        },
        customMatch: true
      };

      const generator = new HeadersGenerator(config);

      const headers1: HeaderParameter[] = [
        { originalName: 'a', dartName: 'a', type: 'String', required: true, description: '' },
        { originalName: 'b', dartName: 'b', type: 'String', required: true, description: '' },
        { originalName: 'c', dartName: 'c', type: 'String', required: true, description: '' }
      ];

      const headers2: HeaderParameter[] = [
        { originalName: 'c', dartName: 'c', type: 'String', required: true, description: '' },
        { originalName: 'a', dartName: 'a', type: 'String', required: true, description: '' },
        { originalName: 'b', dartName: 'b', type: 'String', required: true, description: '' }
      ];

      expect(generator.getHeaderModelName('Test1', headers1)).toBe('OrderedHeaders');
      expect(generator.getHeaderModelName('Test2', headers2)).toBe('OrderedHeaders');
    });

    it('should clear state correctly', () => {
      const generator = new HeadersGenerator();

      const headers: HeaderParameter[] = [
        { originalName: 'x-test', dartName: 'xTest', type: 'String', required: true, description: '' }
      ];

      generator.getHeaderModelName('Test', headers);

      const statsBefore = generator.getStatistics();
      expect(statsBefore.totalEndpoints).toBe(1);

      generator.clear();

      const statsAfter = generator.getStatistics();
      expect(statsAfter.totalEndpoints).toBe(0);
      expect(statsAfter.totalModels).toBe(0);
    });
  });

  describe('Complex Field Types', () => {
    it('should handle fields with custom types', () => {
      const config = {
        definitions: {
          TypedHeaders: {
            fields: {
              'x-count': { type: 'int', required: true },
              'x-enabled': { type: 'bool', required: false },
              'x-ratio': { type: 'double', required: false }
            }
          }
        }
      };

      const generator = new HeadersGenerator(config);
      const files = generator.generateConfiguredHeaderFiles();

      expect(files).toHaveLength(1);
      expect(files[0].content).toContain('required int xCount');
      expect(files[0].content).toContain('bool? xEnabled');
      expect(files[0].content).toContain('double? xRatio');
    });
  });
});