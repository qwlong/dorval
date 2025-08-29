/**
 * Tests for header generation and consolidation
 */

import { describe, it, expect } from 'vitest';
import { HeadersGenerator } from '../../generators/headers-generator';
import { ParamsGenerator } from '../../generators/params-generator';
import { HeaderParameter } from '../../generators/endpoint-generator';

describe('Header Generation', () => {
  describe('HeadersGenerator', () => {
    it('should match headers to defined configurations', () => {
      const config = {
        definitions: {
          ApiKeyHeaders: {
            fields: ['x-api-key'],
            required: ['x-api-key'],
            description: 'API key authentication'
          },
          CompanyStaffHeaders: {
            fields: ['x-api-key', 'x-core-company-id', 'x-company-staff-id'],
            required: ['x-api-key', 'x-core-company-id', 'x-company-staff-id'],
            description: 'Company staff authentication'
          }
        }
      };

      const generator = new HeadersGenerator(config);

      const apiKeyOnly: HeaderParameter[] = [
        { originalName: 'x-api-key', dartName: 'xApiKey', type: 'String', required: true, description: '' }
      ];

      const companyStaff: HeaderParameter[] = [
        { originalName: 'x-api-key', dartName: 'xApiKey', type: 'String', required: true, description: '' },
        { originalName: 'x-core-company-id', dartName: 'xCoreCompanyId', type: 'String', required: true, description: '' },
        { originalName: 'x-company-staff-id', dartName: 'xCompanyStaffId', type: 'String', required: true, description: '' }
      ];

      expect(generator.findMatchingHeaderClass('/test1', apiKeyOnly)).toBe('ApiKeyHeaders');
      expect(generator.findMatchingHeaderClass('/test2', companyStaff)).toBe('CompanyStaffHeaders');
    });

    it('should handle optional fields correctly', () => {
      const config = {
        definitions: {
          FlexibleHeaders: {
            fields: ['x-api-key', 'x-core-company-id', 'x-company-staff-id'],
            required: ['x-api-key', 'x-core-company-id'],
            description: 'Flexible authentication'
          }
        }
      };

      const generator = new HeadersGenerator(config);

      const headers: HeaderParameter[] = [
        { originalName: 'x-api-key', dartName: 'xApiKey', type: 'String', required: true, description: '' },
        { originalName: 'x-core-company-id', dartName: 'xCoreCompanyId', type: 'String', required: true, description: '' },
        { originalName: 'x-company-staff-id', dartName: 'xCompanyStaffId', type: 'String', required: false, description: '' }
      ];

      expect(generator.findMatchingHeaderClass('/test', headers)).toBe('FlexibleHeaders');
    });

    it('should generate header files correctly', () => {
      const config = {
        definitions: {
          TestHeaders: {
            fields: ['x-test', 'x-auth'],
            required: ['x-test'],
            description: 'Test headers'
          }
        }
      };

      const generator = new HeadersGenerator(config);
      const files = generator.generateConfiguredHeaderFiles();

      expect(files).toHaveLength(1);
      expect(files[0].path).toBe('models/headers/test_headers.f.dart');
      expect(files[0].content).toContain('class TestHeaders');
      expect(files[0].content).toContain('required String xTest');
      expect(files[0].content).toContain('String? xAuth');
      expect(files[0].content).toContain('@freezed');
    });

    it('should generate report with statistics', () => {
      const config = {
        definitions: {
          ApiKey: {
            fields: ['x-api-key'],
            required: ['x-api-key']
          }
        }
      };

      const generator = new HeadersGenerator(config);
      
      const headers: HeaderParameter[] = [
        { originalName: 'x-api-key', dartName: 'xApiKey', type: 'String', required: true, description: '' }
      ];

      generator.findMatchingHeaderClass('/endpoint1', headers);
      generator.findMatchingHeaderClass('/endpoint2', headers);

      const report = generator.generateReport();

      expect(report).toContain('# Header Matching Report');
      expect(report).toMatch(/Total endpoints analyzed: \d+/);
      expect(report).toContain('## Header Class Usage');
      expect(report).toContain('ApiKey');
    });
  });

  describe('ParamsGenerator', () => {
    it('should generate header model with correct file extension', () => {
      const generator = new ParamsGenerator();
      
      const headers: HeaderParameter[] = [
        { originalName: 'x-api-key', dartName: 'xApiKey', type: 'String', required: true, description: 'API key' },
        { originalName: 'x-user-id', dartName: 'xUserId', type: 'String', required: false, description: 'User ID' }
      ];

      const result = generator.generateHeadersModel('TestEndpoint', headers);

      expect(result).toBeDefined();
      expect(result?.path).toBe('models/headers/test_endpoint_headers.f.dart');
      expect(result?.content).toContain('@freezed');
      expect(result?.content).toContain('class TestEndpointHeaders');
      expect(result?.content).toContain('required String xApiKey');
      expect(result?.content).toContain('String? xUserId');
      expect(result?.content).toContain("@JsonKey(name: 'x-api-key')");
      expect(result?.content).toContain("@JsonKey(name: 'x-user-id')");
    });

    it('should handle camelCase conversion for header names', () => {
      const generator = new ParamsGenerator();
      
      const headers: HeaderParameter[] = [
        { originalName: 'x-company-staff-id', dartName: 'xCompanyStaffId', type: 'String', required: true, description: '' },
        { originalName: 'X-Custom-Header', dartName: 'xCustomHeader', type: 'String', required: false, description: '' }
      ];

      const result = generator.generateHeadersModel('Test', headers);

      expect(result?.content).toContain('xCompanyStaffId');
      expect(result?.content).toContain('xCustomHeader');
      expect(result?.content).toContain("@JsonKey(name: 'x-company-staff-id')");
      expect(result?.content).toContain("@JsonKey(name: 'X-Custom-Header')");
    });
  });
});