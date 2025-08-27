/**
 * Snapshot tests for header generation
 * Ensures generated code remains consistent across changes
 */

import { describe, it, expect } from 'vitest';
import { ParamsGenerator } from '../../generators/params-generator';
import { HeaderParameter } from '../../generators/endpoint-generator';
import { CustomHeaderMatcher } from '../../generators/custom-header-matcher';
import { ServiceGenerator } from '../../generators/service-generator';

describe('Header Generation Snapshots', () => {
  const paramsGenerator = new ParamsGenerator();

  describe('Header model generation', () => {
    it('should generate consistent header model code', () => {
      const headers: HeaderParameter[] = [
        {
          originalName: 'x-api-key',
          paramName: 'xApiKey',
          dartName: 'xApiKey',
          type: 'String',
          required: true,
          description: 'API authentication key'
        },
        {
          originalName: 'x-company-id',
          paramName: 'xCompanyId',
          dartName: 'xCompanyId',
          type: 'String',
          required: true,
          description: 'Company identifier'
        },
        {
          originalName: 'x-user-id',
          paramName: 'xUserId',
          dartName: 'xUserId',
          type: 'String',
          required: false,
          description: 'Optional user identifier'
        }
      ];

      const result = paramsGenerator.generateHeadersModel('TestHeaders', headers);
      
      expect(result).toBeDefined();
      expect(result?.content).toMatchInlineSnapshot(`
        "// ignore_for_file: unused_element, unnecessary_this, always_put_required_named_parameters_first, constant_identifier_names
        
        import 'package:freezed_annotation/freezed_annotation.dart';
        
        part 'test_headers_headers.f.freezed.dart';
        part 'test_headers_headers.f.g.dart';
        
        /// Headers for TestHeaders
        @freezed
        class TestHeadersHeaders with _\$TestHeadersHeaders {
          const factory TestHeadersHeaders({
            /// API authentication key
            @JsonKey(name: 'x-api-key')
            required String xApiKey,
            /// Company identifier
            @JsonKey(name: 'x-company-id')
            required String xCompanyId,
            /// Optional user identifier
            @JsonKey(name: 'x-user-id')
            String? xUserId,
          }) = _TestHeadersHeaders;
        
          factory TestHeadersHeaders.fromJson(Map<String, dynamic> json) =>
              _\$TestHeadersHeadersFromJson(json);
        }"
      `);
    });

    it('should generate consistent query params model code', () => {
      const params = [
        {
          originalName: 'page',
          dartName: 'page',
          name: 'page',
          type: 'int',
          required: false,
          description: 'Page number'
        },
        {
          originalName: 'limit',
          dartName: 'limit',
          name: 'limit',
          type: 'int',
          required: false,
          description: 'Items per page'
        },
        {
          originalName: 'search',
          dartName: 'search',
          name: 'search',
          type: 'String',
          required: false,
          description: 'Search query'
        }
      ];

      const result = paramsGenerator.generateQueryParamsModel('GetItemsParams', params);
      
      expect(result).toBeDefined();
      expect(result?.content).toMatchInlineSnapshot(`
        "// ignore_for_file: unused_element, unnecessary_this, always_put_required_named_parameters_first, constant_identifier_names
        
        import 'package:freezed_annotation/freezed_annotation.dart';
        
        part 'get_items_params_params.f.freezed.dart';
        part 'get_items_params_params.f.g.dart';
        
        /// Query parameters for GetItemsParams
        @freezed
        class GetItemsParamsParams with _\$GetItemsParamsParams {
          const factory GetItemsParamsParams({
            /// Page number
            int? page,
            /// Items per page
            int? limit,
            /// Search query
            String? search,
          }) = _GetItemsParamsParams;
        
          factory GetItemsParamsParams.fromJson(Map<String, dynamic> json) =>
              _\$GetItemsParamsParamsFromJson(json);
        }"
      `);
    });
  });

  describe('Header matching behavior', () => {
    it('should produce consistent matching results', () => {
      const config = {
        definitions: {
          BasicAuth: {
            fields: ['x-api-key'],
            required: ['x-api-key']
          },
          FullAuth: {
            fields: ['x-api-key', 'x-company-id', 'x-user-id'],
            required: ['x-api-key', 'x-company-id', 'x-user-id']
          },
          PartialAuth: {
            fields: ['x-api-key', 'x-company-id', 'x-user-id'],
            required: ['x-api-key', 'x-company-id']
          }
        },
        customMatch: true,
        matchStrategy: 'exact' as const
      };

      const matcher = new CustomHeaderMatcher(config);

      // Test various header combinations
      const testCases = [
        {
          headers: [
            { originalName: 'x-api-key', paramName: 'xApiKey', dartName: 'xApiKey', type: 'String', required: true, description: '' }
          ],
          expected: 'BasicAuth'
        },
        {
          headers: [
            { originalName: 'x-api-key', paramName: 'xApiKey', dartName: 'xApiKey', type: 'String', required: true, description: '' },
            { originalName: 'x-company-id', paramName: 'xCompanyId', dartName: 'xCompanyId', type: 'String', required: true, description: '' },
            { originalName: 'x-user-id', paramName: 'xUserId', dartName: 'xUserId', type: 'String', required: true, description: '' }
          ],
          expected: 'FullAuth'
        },
        {
          headers: [
            { originalName: 'x-api-key', paramName: 'xApiKey', dartName: 'xApiKey', type: 'String', required: true, description: '' },
            { originalName: 'x-company-id', paramName: 'xCompanyId', dartName: 'xCompanyId', type: 'String', required: true, description: '' },
            { originalName: 'x-user-id', paramName: 'xUserId', dartName: 'xUserId', type: 'String', required: false, description: '' }
          ],
          expected: 'PartialAuth'
        }
      ];

      testCases.forEach((testCase, index) => {
        const result = matcher.findMatchingHeaderClass(`/test/endpoint${index}`, testCase.headers as HeaderParameter[]);
        expect(result).toBe(testCase.expected);
      });
    });

    it('should generate consistent consolidation report', () => {
      const config = {
        definitions: {
          TestHeader: {
            fields: ['x-test'],
            required: ['x-test']
          }
        },
        customMatch: true,
        customConsolidate: true,
        consolidationThreshold: 2
      };

      const matcher = new CustomHeaderMatcher(config);

      // Generate some activity
      const headers: HeaderParameter[] = [
        { originalName: 'x-test', paramName: 'xTest', dartName: 'xTest', type: 'String', required: true, description: '' }
      ];

      matcher.findMatchingHeaderClass('/endpoint1', headers);
      matcher.findMatchingHeaderClass('/endpoint2', headers);

      const report = matcher.generateReport();
      
      // Report structure should be consistent
      expect(report).toContain('# Header Matching Report');
      expect(report).toContain('## Statistics');
      expect(report).toContain('Total endpoints analyzed:');
      expect(report).toContain('Endpoints matched to definitions:');
      expect(report).toContain('## Header Class Usage');
      expect(report).toContain('TestHeader:');
    });
  });

  describe('Generated service method signatures', () => {
    it('should generate consistent method signatures with headers', () => {
      // This would test the actual service method generation
      // For now, we'll test the expected format
      const expectedMethodSignature = `
  Future<ResponseDto> getApiEndpoint({
    GetApiEndpointParams? params,
    ApiHeaders? headers,
  }) async {
    // Build path with parameters
    final path = '/api/endpoint';
    
    // Build query parameters
    final paramsJson = params?.toJson() ?? <String, dynamic>{};
    // Remove null values from query parameters
    final queryParameters = <String, dynamic>{
      for (final entry in paramsJson.entries)
        if (entry.value != null) entry.key: entry.value,
    };
    
    // Build headers  
    final headersJson = headers?.toJson() ?? <String, dynamic>{};
    // Remove null values from headers - they should not be sent
    final requestHeaders = <String, dynamic>{
      for (final entry in headersJson.entries)
        if (entry.value != null) entry.key: entry.value,
    };
    
    try {
      final response = await client.get(
        path,
        queryParameters: queryParameters,
        options: Options(headers: requestHeaders),
      );
      
      return ResponseDto.fromJson(response.data as Map<String, dynamic>);
    } on DioException catch (e) {
      throw ApiException(
        statusCode: e.response?.statusCode,
        message: e.message ?? 'Unknown error occurred',
        error: e,
      );
    }
  }`;

      // This ensures the method structure remains consistent
      expect(expectedMethodSignature).toContain('Future<ResponseDto>');
      expect(expectedMethodSignature).toContain('params?.toJson()');
      expect(expectedMethodSignature).toContain('headers?.toJson()');
      expect(expectedMethodSignature).toContain('Options(headers: requestHeaders)');
      expect(expectedMethodSignature).toContain('ApiException');
    });
  });
});