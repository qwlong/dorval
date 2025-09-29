/**
 * Tests for params and headers model generation
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { ParamsGenerator } from '../../generators/params-generator';
import { QueryParameter, HeaderParameter } from '../../generators/endpoint-generator';

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

  describe('Array Query Parameters', () => {
    it('should detect array parameters and include toQueryParameters method', () => {
      const queryParams: QueryParameter[] = [
        {
          dartName: 'teamMemberIds',
          originalName: 'teamMemberIds',
          required: false,
          type: 'List<String>',
          description: 'List of team member IDs'
        },
        {
          dartName: 'limit',
          originalName: 'limit',
          required: true,
          type: 'int'
        }
      ];

      const result = generator.generateQueryParamsModel(
        'getShiftsSuggestedTimes',
        queryParams
      );

      expect(result).toBeDefined();
      expect(result?.content).toContain('toQueryParameters()');
      expect(result?.content).toContain('const GetShiftsSuggestedTimesParams._()');
      expect(result?.content).toContain('List<String>? teamMemberIds');
    });

    it('should detect nullable array parameters', () => {
      const queryParams: QueryParameter[] = [
        {
          dartName: 'tags',
          originalName: 'tags',
          required: false,
          type: 'List<String>?',
          description: 'Optional list of tags'
        }
      ];

      const result = generator.generateQueryParamsModel(
        'getItems',
        queryParams
      );

      expect(result).toBeDefined();
      expect(result?.content).toContain('toQueryParameters()');
      expect(result?.content).toContain('// Handle lists: key[0]=value1, key[1]=value2');
    });

    it('should handle List of non-primitive types', () => {
      const queryParams: QueryParameter[] = [
        {
          dartName: 'filters',
          originalName: 'filters',
          required: false,
          type: 'List<FilterDto>',
          description: 'List of filter objects'
        }
      ];

      const result = generator.generateQueryParamsModel(
        'getFiltered',
        queryParams
      );

      expect(result).toBeDefined();
      expect(result?.content).toContain('toQueryParameters()');
      // Arrays are always treated as complex, even with custom types
      expect(result?.content).toContain('List<FilterDto>? filters');
    });

    it('should generate correct query parameter flattening code for arrays', () => {
      const queryParams: QueryParameter[] = [
        {
          dartName: 'ids',
          originalName: 'ids',
          required: true,
          type: 'List<String>'
        }
      ];

      const result = generator.generateQueryParamsModel(
        'getByIds',
        queryParams
      );

      const content = result?.content || '';

      // Check for the flattening logic
      expect(content).toContain('void flatten(String prefix, dynamic value)');
      expect(content).toContain('if (value is List)');
      expect(content).toContain('for (var i = 0; i < value.length; i++)');
      expect(content).toContain('final newKey = \'$prefix[$i]\'');
    });

    it('should handle empty arrays in toQueryParameters', () => {
      const queryParams: QueryParameter[] = [
        {
          dartName: 'optionalIds',
          originalName: 'optionalIds',
          required: false,
          type: 'List<String>'
        }
      ];

      const result = generator.generateQueryParamsModel(
        'queryWithOptionalArray',
        queryParams
      );

      const content = result?.content || '';

      // Should check for empty arrays
      expect(content).toContain('if (value.isEmpty) return');
    });
  });

  describe('Complex Query Parameters', () => {
    it('should generate toQueryParameters method for complex types', () => {
      const params: QueryParameter[] = [
        {
          originalName: 'type',
          dartName: 'type',
          type: 'String',
          required: true,
          description: 'Type of query'
        },
        {
          originalName: 'payload',
          dartName: 'payload',
          type: 'WorkerRecommendationQueryPayloadDto',
          required: true,
          description: 'Complex payload object'
        }
      ];

      const result = generator.generateQueryParamsModel('GetWorkerRecommendations', params);

      expect(result).toBeTruthy();
      // Should not include dart:convert anymore since we use flattening
      expect(result?.content).not.toContain('import \'dart:convert\'');
      expect(result?.content).toContain('toQueryParameters()');
      // Should use flattening instead of JSON encoding
      expect(result?.content).toContain('flatten');
      expect(result?.content).toContain('$prefix[$nestedKey]');
      expect(result?.content).not.toContain('jsonEncode');
      expect(result?.content).toContain('const GetWorkerRecommendationsParams._()');
    });

    it('should not generate toQueryParameters for simple types', () => {
      const params: QueryParameter[] = [
        {
          originalName: 'page',
          dartName: 'page',
          type: 'int',
          required: false,
          description: 'Page number'
        },
        {
          originalName: 'limit',
          dartName: 'limit',
          type: 'int',
          required: false,
          description: 'Page size'
        }
      ];

      const result = generator.generateQueryParamsModel('GetList', params);

      expect(result).toBeTruthy();
      expect(result?.content).not.toContain('import \'dart:convert\'');
      expect(result?.content).not.toContain('toQueryParameters()');
      expect(result?.content).not.toContain('const GetListParams._()');
    });

    it('should handle List of complex types', () => {
      const params: QueryParameter[] = [
        {
          originalName: 'filters',
          dartName: 'filters',
          type: 'List<FilterDto>',
          required: false,
          description: 'List of filters'
        }
      ];

      const result = generator.generateQueryParamsModel('GetFiltered', params);

      expect(result).toBeTruthy();
      // Should not include dart:convert anymore since we use flattening
      expect(result?.content).not.toContain('import \'dart:convert\'');
      expect(result?.content).toContain('toQueryParameters()');
      // The import for FilterDto should be added
      // Check that the filename includes the import section where FilterDto would be
      expect(result?.path).toBe('models/params/get_filtered_params.f.dart');
      // The actual import should be in the imports array of the model
      // Since FilterDto is in List<FilterDto>, it should be recognized as a complex type
      expect(result?.content).toContain('List<FilterDto>? filters');
      // Should use flattening for lists
      expect(result?.content).toContain('if (value is List)');
    });

    it('should handle nullable complex types', () => {
      const params: QueryParameter[] = [
        {
          originalName: 'config',
          dartName: 'config',
          type: 'ConfigDto?',
          required: false,
          description: 'Optional config'
        }
      ];

      const result = generator.generateQueryParamsModel('Configure', params);

      expect(result).toBeTruthy();
      // Should not include dart:convert anymore since we use flattening
      expect(result?.content).not.toContain('import \'dart:convert\'');
      expect(result?.content).toContain('toQueryParameters()');
      // Should use flattening for complex types
      expect(result?.content).toContain('flatten');
    });
  });
});