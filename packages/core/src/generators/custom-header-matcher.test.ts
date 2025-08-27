/**
 * Tests for CustomHeaderMatcher
 * Following Orval test patterns
 */

import { describe, expect, it, beforeEach } from 'vitest';
import { CustomHeaderMatcher, CustomMatchConfig, HeaderDefinition } from './custom-header-matcher';
import { HeaderParameter } from './endpoint-generator';

describe('CustomHeaderMatcher', () => {
  let matcher: CustomHeaderMatcher;
  
  const basicConfig: CustomMatchConfig = {
    definitions: {
      ApiKeyHeader: {
        fields: ['x-api-key'],
        required: ['x-api-key'],
        description: 'API key only'
      },
      CompanyHeaders: {
        fields: ['x-api-key', 'x-company-id', 'x-user-id'],
        required: ['x-api-key', 'x-company-id'],
        description: 'Company context headers'
      },
      CompanyHeadersReordered: {
        fields: ['x-user-id', 'x-api-key', 'x-company-id'],  // Same fields, different order
        required: ['x-user-id', 'x-api-key', 'x-company-id']  // All required
      }
    },
    customMatch: true,
    matchStrategy: 'exact',
    customConsolidate: true,
    consolidationThreshold: 3
  };

  beforeEach(() => {
    matcher = new CustomHeaderMatcher(basicConfig);
  });

  describe('exact matching', () => {
    it('should match headers with exact same fields and required status', () => {
      const headers: HeaderParameter[] = [
        { originalName: 'x-api-key', paramName: 'xApiKey', dartName: 'xApiKey', type: 'String', required: true, description: '' }
      ];
      
      const result = matcher.findMatchingHeaderClass('/test/endpoint', headers);
      expect(result).toBe('ApiKeyHeader');
    });

    it('should match headers regardless of field order', () => {
      const headers1: HeaderParameter[] = [
        { originalName: 'x-api-key', paramName: 'xApiKey', dartName: 'xApiKey', type: 'String', required: true, description: '' },
        { originalName: 'x-company-id', paramName: 'xCompanyId', dartName: 'xCompanyId', type: 'String', required: true, description: '' },
        { originalName: 'x-user-id', paramName: 'xUserId', dartName: 'xUserId', type: 'String', required: true, description: '' }
      ];
      
      const headers2: HeaderParameter[] = [
        { originalName: 'x-user-id', paramName: 'xUserId', dartName: 'xUserId', type: 'String', required: true, description: '' },
        { originalName: 'x-api-key', paramName: 'xApiKey', dartName: 'xApiKey', type: 'String', required: true, description: '' },
        { originalName: 'x-company-id', paramName: 'xCompanyId', dartName: 'xCompanyId', type: 'String', required: true, description: '' }
      ];
      
      const result1 = matcher.findMatchingHeaderClass('/test/endpoint1', headers1);
      const result2 = matcher.findMatchingHeaderClass('/test/endpoint2', headers2);
      
      // Both should match to CompanyHeadersReordered (all fields required)
      expect(result1).toBe('CompanyHeadersReordered');
      expect(result2).toBe('CompanyHeadersReordered');
    });

    it('should distinguish headers with different required status', () => {
      const allRequired: HeaderParameter[] = [
        { originalName: 'x-api-key', paramName: 'xApiKey', dartName: 'xApiKey', type: 'String', required: true, description: '' },
        { originalName: 'x-company-id', paramName: 'xCompanyId', dartName: 'xCompanyId', type: 'String', required: true, description: '' },
        { originalName: 'x-user-id', paramName: 'xUserId', dartName: 'xUserId', type: 'String', required: true, description: '' }
      ];
      
      const someOptional: HeaderParameter[] = [
        { originalName: 'x-api-key', paramName: 'xApiKey', dartName: 'xApiKey', type: 'String', required: true, description: '' },
        { originalName: 'x-company-id', paramName: 'xCompanyId', dartName: 'xCompanyId', type: 'String', required: true, description: '' },
        { originalName: 'x-user-id', paramName: 'xUserId', dartName: 'xUserId', type: 'String', required: false, description: '' }
      ];
      
      const result1 = matcher.findMatchingHeaderClass('/test/endpoint1', allRequired);
      const result2 = matcher.findMatchingHeaderClass('/test/endpoint2', someOptional);
      
      expect(result1).toBe('CompanyHeadersReordered'); // All required
      expect(result2).toBe('CompanyHeaders'); // x-user-id is optional
    });

    it('should return null when no match found', () => {
      const unmatchedHeaders: HeaderParameter[] = [
        { originalName: 'x-unknown-header', paramName: 'xUnknownHeader', dartName: 'xUnknownHeader', type: 'String', required: true, description: '' }
      ];
      
      const result = matcher.findMatchingHeaderClass('/test/endpoint', unmatchedHeaders);
      expect(result).toBe(null);
    });
  });

  describe('subset matching', () => {
    const subsetConfig: CustomMatchConfig = {
      definitions: {
        SupersetHeader: {
          fields: ['x-api-key', 'x-company-id', 'x-user-id', 'x-session-id'],
          required: ['x-api-key', 'x-company-id']
        }
      },
      customMatch: true,
      matchStrategy: 'subset'
    };

    it('should match when endpoint headers are subset of definition', () => {
      const subsetMatcher = new CustomHeaderMatcher(subsetConfig);
      
      const headers: HeaderParameter[] = [
        { originalName: 'x-api-key', paramName: 'xApiKey', dartName: 'xApiKey', type: 'String', required: true, description: '' },
        { originalName: 'x-company-id', paramName: 'xCompanyId', dartName: 'xCompanyId', type: 'String', required: true, description: '' }
      ];
      
      const result = subsetMatcher.findMatchingHeaderClass('/test/endpoint', headers);
      expect(result).toBe('SupersetHeader');
    });

    it('should not match when endpoint has fields not in definition', () => {
      const subsetMatcher = new CustomHeaderMatcher(subsetConfig);
      
      const headers: HeaderParameter[] = [
        { originalName: 'x-api-key', paramName: 'xApiKey', dartName: 'xApiKey', type: 'String', required: true, description: '' },
        { originalName: 'x-unknown', paramName: 'xUnknown', dartName: 'xUnknown', type: 'String', required: true, description: '' }
      ];
      
      const result = subsetMatcher.findMatchingHeaderClass('/test/endpoint', headers);
      expect(result).toBe(null);
    });
  });

  describe('fuzzy matching', () => {
    const fuzzyConfig: CustomMatchConfig = {
      definitions: {
        SimilarHeader: {
          fields: ['x-api-key', 'x-company-id', 'x-user-id'],
          required: ['x-api-key']
        }
      },
      customMatch: true,
      matchStrategy: 'fuzzy'
    };

    it('should match based on similarity score', () => {
      const fuzzyMatcher = new CustomHeaderMatcher(fuzzyConfig);
      
      // Has 2 out of 3 fields from definition
      const headers: HeaderParameter[] = [
        { originalName: 'x-api-key', paramName: 'xApiKey', dartName: 'xApiKey', type: 'String', required: true, description: '' },
        { originalName: 'x-company-id', paramName: 'xCompanyId', dartName: 'xCompanyId', type: 'String', required: false, description: '' }
      ];
      
      const result = fuzzyMatcher.findMatchingHeaderClass('/test/endpoint', headers);
      expect(result).toBe('SimilarHeader');
    });
  });

  describe('auto consolidation', () => {
    it('should consolidate headers when threshold is met', () => {
      const consolidationConfig: CustomMatchConfig = {
        definitions: {},
        customMatch: true,
        customConsolidate: true,
        consolidationThreshold: 2
      };
      
      const consolidationMatcher = new CustomHeaderMatcher(consolidationConfig);
      
      const headers: HeaderParameter[] = [
        { originalName: 'x-custom-1', paramName: 'xCustom1', dartName: 'xCustom1', type: 'String', required: true, description: '' },
        { originalName: 'x-custom-2', paramName: 'xCustom2', dartName: 'xCustom2', type: 'String', required: false, description: '' }
      ];
      
      // First endpoint - no match yet
      const result1 = consolidationMatcher.findMatchingHeaderClass('/api/endpoint1', headers);
      expect(result1).toBe(null);
      
      // Second endpoint with same headers - should trigger consolidation
      const result2 = consolidationMatcher.findMatchingHeaderClass('/api/endpoint2', headers);
      expect(result2).toContain('Headers'); // Should create a consolidated class
      
      // Third endpoint should use the same consolidated class
      const result3 = consolidationMatcher.findMatchingHeaderClass('/api/endpoint3', headers);
      expect(result3).toBe(result2);
    });

    it('should generate meaningful names for consolidated classes', () => {
      const consolidationConfig: CustomMatchConfig = {
        definitions: {},
        customMatch: true,
        customConsolidate: true,
        consolidationThreshold: 2
      };
      
      const consolidationMatcher = new CustomHeaderMatcher(consolidationConfig);
      
      const companyHeaders: HeaderParameter[] = [
        { originalName: 'x-api-key', paramName: 'xApiKey', dartName: 'xApiKey', type: 'String', required: true, description: '' },
        { originalName: 'x-core-company-id', paramName: 'xCoreCompanyId', dartName: 'xCoreCompanyId', type: 'String', required: true, description: '' }
      ];
      
      // Generate consolidation
      consolidationMatcher.findMatchingHeaderClass('/v1/companies/list', companyHeaders);
      const result = consolidationMatcher.findMatchingHeaderClass('/v1/companies/details', companyHeaders);
      
      expect(result).toMatch(/Compan/i); // Should recognize company context (Company or Companies)
    });
  });

  describe('signature generation', () => {
    it('should create consistent signatures regardless of order', () => {
      const headers1: HeaderParameter[] = [
        { originalName: 'x-a', paramName: 'xA', dartName: 'xA', type: 'String', required: true, description: '' },
        { originalName: 'x-b', paramName: 'xB', dartName: 'xB', type: 'String', required: false, description: '' },
        { originalName: 'x-c', paramName: 'xC', dartName: 'xC', type: 'String', required: true, description: '' }
      ];
      
      const headers2: HeaderParameter[] = [
        { originalName: 'x-c', paramName: 'xC', dartName: 'xC', type: 'String', required: true, description: '' },
        { originalName: 'x-a', paramName: 'xA', dartName: 'xA', type: 'String', required: true, description: '' },
        { originalName: 'x-b', paramName: 'xB', dartName: 'xB', type: 'String', required: false, description: '' }
      ];
      
      // Use private method through consolidation
      const testConfig: CustomMatchConfig = {
        definitions: {},
        customMatch: true,
        customConsolidate: true,
        consolidationThreshold: 3
      };
      
      const testMatcher = new CustomHeaderMatcher(testConfig);
      
      // Trigger signature creation
      testMatcher.findMatchingHeaderClass('/test1', headers1);
      testMatcher.findMatchingHeaderClass('/test2', headers2);
      testMatcher.findMatchingHeaderClass('/test3', headers1);
      
      // Both should consolidate to the same class
      const result1 = testMatcher.findMatchingHeaderClass('/test4', headers1);
      const result2 = testMatcher.findMatchingHeaderClass('/test5', headers2);
      
      expect(result1).toBe(result2);
    });
  });

  describe('statistics and reporting', () => {
    it('should track matching statistics', () => {
      const headers: HeaderParameter[] = [
        { originalName: 'x-api-key', paramName: 'xApiKey', dartName: 'xApiKey', type: 'String', required: true, description: '' }
      ];
      
      // Generate some matches
      matcher.findMatchingHeaderClass('/endpoint1', headers);
      matcher.findMatchingHeaderClass('/endpoint2', headers);
      
      const stats = matcher.getMatchingStats();
      
      expect(stats).toHaveProperty('totalEndpoints');
      expect(stats).toHaveProperty('matchedEndpoints');
      expect(stats).toHaveProperty('consolidatedClasses');
      expect(stats).toHaveProperty('unmatchedSignatures');
    });

    it('should generate readable report', () => {
      const headers: HeaderParameter[] = [
        { originalName: 'x-api-key', paramName: 'xApiKey', dartName: 'xApiKey', type: 'String', required: true, description: '' }
      ];
      
      matcher.findMatchingHeaderClass('/test', headers);
      
      const report = matcher.generateReport();
      
      expect(report).toContain('Header Matching Report');
      expect(report).toContain('Statistics');
      expect(report).toContain('Header Class Usage');
    });
  });

  describe('edge cases', () => {
    it('should handle empty headers', () => {
      const result = matcher.findMatchingHeaderClass('/test', []);
      expect(result).toBe(null);
    });

    it('should handle disabled matching', () => {
      const disabledConfig: CustomMatchConfig = {
        definitions: { TestHeader: { fields: ['x-test'], required: ['x-test'] } },
        customMatch: false
      };
      
      const disabledMatcher = new CustomHeaderMatcher(disabledConfig);
      const headers: HeaderParameter[] = [
        { originalName: 'x-test', paramName: 'xTest', dartName: 'xTest', type: 'String', required: true, description: '' }
      ];
      
      const result = disabledMatcher.findMatchingHeaderClass('/test', headers);
      expect(result).toBe(null);
    });

    it('should handle definitions with object-style fields', () => {
      const objectFieldsConfig: CustomMatchConfig = {
        definitions: {
          ObjectStyleHeader: {
            fields: {
              'x-api-key': { type: 'String', required: true, description: 'API key' },
              'x-optional': { type: 'String', required: false, description: 'Optional field' }
            },
            required: ['x-api-key']
          }
        },
        customMatch: true,
        matchStrategy: 'exact'
      };
      
      const objectMatcher = new CustomHeaderMatcher(objectFieldsConfig);
      
      const headers: HeaderParameter[] = [
        { originalName: 'x-api-key', paramName: 'xApiKey', dartName: 'xApiKey', type: 'String', required: true, description: '' },
        { originalName: 'x-optional', paramName: 'xOptional', dartName: 'xOptional', type: 'String', required: false, description: '' }
      ];
      
      const result = objectMatcher.findMatchingHeaderClass('/test', headers);
      expect(result).toBe('ObjectStyleHeader');
    });
  });
});