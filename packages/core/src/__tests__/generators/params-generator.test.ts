/**
 * Tests for params and headers model generation
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { ParamsGenerator } from '../../generators/params-generator';
import { HeaderParameter } from '../../generators/endpoint-generator';

describe('ParamsGenerator', () => {
  let generator: ParamsGenerator;
  
  beforeEach(() => {
    generator = new ParamsGenerator();
  });

  describe('Query Parameters Model Generation', () => {
    it('should generate query params model with correct types', () => {
      const params = [
        { dartName: 'page', originalName: 'page', type: 'int', required: false, description: 'Page number' },
        { dartName: 'limit', originalName: 'limit', type: 'int', required: false, description: 'Items per page' },
        { dartName: 'search', originalName: 'search', type: 'String', required: false, description: 'Search query' },
        { dartName: 'active', originalName: 'active', type: 'bool', required: true, description: 'Active filter' }
      ];

      const result = generator.generateQueryParamsModel('GetUsers', params);

      expect(result).toBeDefined();
      expect(result?.path).toBe('models/params/get_users_params.f.dart');
      expect(result?.content).toContain('@freezed');
      expect(result?.content).toContain('class GetUsersParams');
      expect(result?.content).toContain('int? page');
      expect(result?.content).toContain('int? limit');
      expect(result?.content).toContain('String? search');
      expect(result?.content).toContain('required bool active');
    });

    it('should handle array types in query params', () => {
      const params = [
        { dartName: 'ids', originalName: 'ids', type: 'List<String>', required: false, description: 'List of IDs' },
        { dartName: 'tags', originalName: 'tags', type: 'List<String>', required: true, description: 'Tags filter' }
      ];

      const result = generator.generateQueryParamsModel('FilterItems', params);

      expect(result?.content).toContain('List<String>? ids');
      expect(result?.content).toContain('required List<String> tags');
    });

    it('should handle DateTime types in query params', () => {
      const params = [
        { dartName: 'startDate', originalName: 'startDate', type: 'DateTime', required: true, description: 'Start date' },
        { dartName: 'endDate', originalName: 'endDate', type: 'DateTime', required: false, description: 'End date' }
      ];

      const result = generator.generateQueryParamsModel('DateRange', params);

      expect(result?.content).toContain('required DateTime startDate');
      expect(result?.content).toContain('DateTime? endDate');
    });

    it('should return null for empty params', () => {
      const result = generator.generateQueryParamsModel('Empty', []);
      expect(result).toBeNull();
    });
  });

  describe('Headers Model Generation', () => {
    it('should generate headers model with JsonKey annotations', () => {
      const headers: HeaderParameter[] = [
        { 
          originalName: 'x-api-key', 
          dartName: 'xApiKey', 
          type: 'String', 
          required: true, 
          description: 'API Key' 
        },
        { 
          originalName: 'x-company-id', 
          dartName: 'xCompanyId', 
          type: 'String', 
          required: true, 
          description: 'Company ID' 
        },
        { 
          originalName: 'x-user-id', 
          dartName: 'xUserId', 
          type: 'String', 
          required: false, 
          description: 'User ID' 
        }
      ];

      const result = generator.generateHeadersModel('AuthHeaders', headers);

      expect(result).toBeDefined();
      expect(result?.path).toBe('models/headers/auth_headers_headers.f.dart');
      expect(result?.content).toContain('@freezed');
      expect(result?.content).toContain('class AuthHeadersHeaders');
      expect(result?.content).toContain("@JsonKey(name: 'x-api-key')");
      expect(result?.content).toContain('required String xApiKey');
      expect(result?.content).toContain("@JsonKey(name: 'x-company-id')");
      expect(result?.content).toContain('required String xCompanyId');
      expect(result?.content).toContain("@JsonKey(name: 'x-user-id')");
      expect(result?.content).toContain('String? xUserId');
    });

    it('should handle headers with special characters', () => {
      const headers: HeaderParameter[] = [
        { 
          originalName: 'X-Custom-Header-Name', 
          dartName: 'xCustomHeaderName', 
          type: 'String', 
          required: false, 
          description: '' 
        }
      ];

      const result = generator.generateHeadersModel('Custom', headers);

      expect(result?.content).toContain("@JsonKey(name: 'X-Custom-Header-Name')");
      expect(result?.content).toContain('String? xCustomHeaderName');
    });

    it('should preserve header order', () => {
      const headers: HeaderParameter[] = [
        { originalName: 'z-header', dartName: 'zHeader', type: 'String', required: true, description: '' },
        { originalName: 'a-header', dartName: 'aHeader', type: 'String', required: true, description: '' },
        { originalName: 'm-header', dartName: 'mHeader', type: 'String', required: true, description: '' }
      ];

      const result = generator.generateHeadersModel('Ordered', headers);
      const content = result?.content || '';

      const zIndex = content.indexOf('zHeader');
      const aIndex = content.indexOf('aHeader');
      const mIndex = content.indexOf('mHeader');

      expect(zIndex).toBeLessThan(aIndex);
      expect(aIndex).toBeLessThan(mIndex);
    });

    it('should return null for empty headers', () => {
      const result = generator.generateHeadersModel('Empty', []);
      expect(result).toBeNull();
    });
  });

  describe('File Naming', () => {
    it('should use snake_case for file names', () => {
      const params = [{ dartName: 'test', originalName: 'test', type: 'String', required: false }];
      
      const result1 = generator.generateQueryParamsModel('MyComplexEndpoint', params);
      expect(result1?.path).toBe('models/params/my_complex_endpoint_params.f.dart');
      
      const headers: HeaderParameter[] = [
        { originalName: 'test', dartName: 'test', type: 'String', required: false, description: '' }
      ];
      
      const result2 = generator.generateHeadersModel('MyComplexEndpoint', headers);
      expect(result2?.path).toBe('models/headers/my_complex_endpoint_headers.f.dart');
    });

    it('should handle single word names', () => {
      const params = [{ dartName: 'test', originalName: 'test', type: 'String', required: false }];
      
      const result = generator.generateQueryParamsModel('Simple', params);
      expect(result?.path).toBe('models/params/simple_params.f.dart');
    });
  });

  describe('Template Rendering', () => {
    it('should include documentation comments', () => {
      const params = [
        { dartName: 'userId', originalName: 'userId', type: 'String', required: true, description: 'The user identifier' }
      ];

      const result = generator.generateQueryParamsModel('GetUser', params);

      expect(result?.content).toContain('/// Query parameters for GetUser');
      expect(result?.content).toContain('/// The user identifier');
    });

    it('should include ignore comments', () => {
      const params = [{ dartName: 'test', originalName: 'test', type: 'String', required: false }];
      const result = generator.generateQueryParamsModel('Test', params);

      expect(result?.content).toContain('// ignore_for_file: unused_element');
    });

    it('should include part directives', () => {
      const params = [{ dartName: 'test', originalName: 'test', type: 'String', required: false }];
      const result = generator.generateQueryParamsModel('Test', params);

      expect(result?.content).toContain("part 'test_params.f.freezed.dart';");
      expect(result?.content).toContain("part 'test_params.f.g.dart';");
    });

    it('should include fromJson factory', () => {
      const params = [{ dartName: 'test', originalName: 'test', type: 'String', required: false }];
      const result = generator.generateQueryParamsModel('Test', params);

      expect(result?.content).toContain('factory TestParams.fromJson');
      expect(result?.content).toContain('_$TestParamsFromJson(json)');
    });
  });
});