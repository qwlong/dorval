/**
 * Test enum imports in headers models
 */

import { describe, it, expect } from 'vitest';
import { ParamsGenerator } from '../../generators/params-generator';
import { HeaderParameter } from '../../generators/endpoint-generator';

describe('Headers Model - Enum Imports', () => {
  const generator = new ParamsGenerator();

  describe('Header with Inline Enum Type', () => {
    it('should generate import for enum type in header', () => {
      const headers: HeaderParameter[] = [
        {
          dartName: 'xApiKey',
          originalName: 'x-api-key',
          required: true,
          type: 'String',
          description: 'API key'
        },
        {
          dartName: 'accept',
          originalName: 'Accept',
          required: true,
          type: 'AcceptEnum',  // Enum type
          description: 'Accept header'
        }
      ];

      const result = generator.generateHeadersModel('getTimeEntries', headers);

      expect(result).not.toBeNull();
      expect(result?.content).toContain("import '../accept_enum.f.dart';");
      expect(result?.content).toContain('required AcceptEnum accept');
    });

    it('should generate multiple enum imports for multiple enum headers', () => {
      const headers: HeaderParameter[] = [
        {
          dartName: 'accept',
          originalName: 'Accept',
          required: true,
          type: 'AcceptEnum'
        },
        {
          dartName: 'contentType',
          originalName: 'Content-Type',
          required: true,
          type: 'ContentTypeEnum'
        }
      ];

      const result = generator.generateHeadersModel('postData', headers);

      expect(result).not.toBeNull();
      expect(result?.content).toContain("import '../accept_enum.f.dart';");
      expect(result?.content).toContain("import '../content_type_enum.f.dart';");
    });

    it('should not generate import for built-in types', () => {
      const headers: HeaderParameter[] = [
        {
          dartName: 'xApiKey',
          originalName: 'x-api-key',
          required: true,
          type: 'String'
        },
        {
          dartName: 'xCompanyId',
          originalName: 'x-company-id',
          required: true,
          type: 'String'
        }
      ];

      const result = generator.generateHeadersModel('getCompany', headers);

      expect(result).not.toBeNull();
      // Should not have any model imports (only freezed_annotation)
      expect(result?.content).not.toContain("import '../");
      expect(result?.content).toContain("import 'package:freezed_annotation/freezed_annotation.dart';");
    });

    it('should handle mixed enum and string headers', () => {
      const headers: HeaderParameter[] = [
        {
          dartName: 'xApiKey',
          originalName: 'x-api-key',
          required: true,
          type: 'String',
          description: 'API key'
        },
        {
          dartName: 'xCoreCompanyId',
          originalName: 'x-core-company-id',
          required: true,
          type: 'String',
          description: 'Company ID'
        },
        {
          dartName: 'accept',
          originalName: 'Accept',
          required: true,
          type: 'AcceptEnum',
          description: 'Accept header with enum values'
        }
      ];

      const result = generator.generateHeadersModel('exportTimeEntries', headers);

      expect(result).not.toBeNull();

      // Should have enum import
      expect(result?.content).toContain("import '../accept_enum.f.dart';");

      // Should have all headers in the model
      expect(result?.content).toContain('required String xApiKey');
      expect(result?.content).toContain('required String xCoreCompanyId');
      expect(result?.content).toContain('required AcceptEnum accept');

      // Should have JsonKey annotations
      expect(result?.content).toContain("@JsonKey(name: 'x-api-key')");
      expect(result?.content).toContain("@JsonKey(name: 'x-core-company-id')");
      expect(result?.content).toContain("@JsonKey(name: 'Accept')");
    });
  });

  describe('Optional Enum Headers', () => {
    it('should handle optional enum headers with nullable type', () => {
      const headers: HeaderParameter[] = [
        {
          dartName: 'accept',
          originalName: 'Accept',
          required: false,
          type: 'AcceptEnum'
        }
      ];

      const result = generator.generateHeadersModel('getData', headers);

      expect(result).not.toBeNull();
      expect(result?.content).toContain("import '../accept_enum.f.dart';");
      expect(result?.content).toContain('AcceptEnum? accept');
    });
  });

  describe('Real-world Example', () => {
    it('should match the getV1ManagersTimeEntriesExport headers pattern', () => {
      const headers: HeaderParameter[] = [
        {
          dartName: 'xApiKey',
          originalName: 'x-api-key',
          required: true,
          type: 'String',
          description: 'API key (use empty string when API key not defined)'
        },
        {
          dartName: 'xCoreCompanyId',
          originalName: 'x-core-company-id',
          required: true,
          type: 'String',
          description: 'Workstream core company ID'
        },
        {
          dartName: 'xCompanyStaffId',
          originalName: 'x-company-staff-id',
          required: true,
          type: 'String',
          description: 'Workstream company staff ID'
        },
        {
          dartName: 'accept',
          originalName: 'Accept',
          required: true,
          type: 'AcceptEnum'
        }
      ];

      const result = generator.generateHeadersModel(
        'getV1ManagersTimeEntriesExport',
        headers
      );

      expect(result).not.toBeNull();
      expect(result?.path).toBe('models/headers/get_v1_managers_time_entries_export_headers.f.dart');

      // Verify imports
      expect(result?.content).toContain("import 'package:freezed_annotation/freezed_annotation.dart';");
      expect(result?.content).toContain("import '../accept_enum.f.dart';");

      // Verify class name
      expect(result?.content).toContain('abstract class GetV1ManagersTimeEntriesExportHeaders');

      // Verify all fields
      expect(result?.content).toContain('required String xApiKey');
      expect(result?.content).toContain('required String xCoreCompanyId');
      expect(result?.content).toContain('required String xCompanyStaffId');
      expect(result?.content).toContain('required AcceptEnum accept');

      // Verify description comment
      expect(result?.content).toContain('/// Headers for getV1ManagersTimeEntriesExport');
    });
  });
});