import { describe, test, expect } from 'vitest';
import * as handlebars from 'handlebars';
import { TemplateManager } from '../../templates/template-manager';
import * as path from 'path';

describe('Freezed Model Field Spacing', () => {
  test('should add blank line after each field with comment', () => {
    const templateManager = new TemplateManager();
    
    const modelData = {
      className: 'JobResponseDto',
      fileName: 'job_response_dto',
      additionalImports: ['earning_response_dto.f.dart'],
      properties: [
        {
          name: 'id',
          type: 'String',
          required: true,
          description: 'Job ID'
        },
        {
          name: 'title',
          type: 'String', 
          required: true,
          description: 'Job title'
        },
        {
          name: 'active',
          type: 'bool',
          required: true,
          description: 'Is the Job active?'
        },
        {
          name: 'teamMemberId',
          type: 'String',
          required: true,
          description: 'Team member ID associated with the Job'
        },
        {
          name: 'earnings',
          type: 'List<EarningResponseDto>',
          required: true,
          description: 'Earnings associated with the Job'
        }
      ]
    };

    const result = templateManager.render('freezed-model', modelData);
    
    // Expected output with blank lines after each field
    const expected = `import 'package:freezed_annotation/freezed_annotation.dart';
import 'earning_response_dto.f.dart';

part 'job_response_dto.f.freezed.dart';
part 'job_response_dto.f.g.dart';

@freezed
class JobResponseDto with _\$JobResponseDto {
  const factory JobResponseDto({
    /// Job ID
    required String id,

    /// Job title
    required String title,

    /// Is the Job active?
    required bool active,

    /// Team member ID associated with the Job
    required String teamMemberId,

    /// Earnings associated with the Job
    required List<EarningResponseDto> earnings,
  }) = _JobResponseDto;

  factory JobResponseDto.fromJson(Map<String, dynamic> json) =>
      _\$JobResponseDtoFromJson(json);
}`;

    expect(result.trim()).toBe(expected.trim());
  });

  test('should handle fields without comments', () => {
    const templateManager = new TemplateManager();
    
    const modelData = {
      className: 'SimpleDto',
      fileName: 'simple_dto',
      properties: [
        {
          name: 'id',
          type: 'String',
          required: true
        },
        {
          name: 'name',
          type: 'String',
          required: true
        }
      ]
    };

    const result = templateManager.render('freezed-model', modelData);
    
    // Fields without comments should also have blank lines between them
    const expected = `import 'package:freezed_annotation/freezed_annotation.dart';

part 'simple_dto.f.freezed.dart';
part 'simple_dto.f.g.dart';

@freezed
class SimpleDto with _\$SimpleDto {
  const factory SimpleDto({
    required String id,

    required String name,
  }) = _SimpleDto;

  factory SimpleDto.fromJson(Map<String, dynamic> json) =>
      _\$SimpleDtoFromJson(json);
}`;

    expect(result.trim()).toBe(expected.trim());
  });

  test('should handle single field model', () => {
    const templateManager = new TemplateManager();
    
    const modelData = {
      className: 'SingleFieldDto',
      fileName: 'single_field_dto',
      properties: [
        {
          name: 'value',
          type: 'String',
          required: true,
          description: 'Single value'
        }
      ]
    };

    const result = templateManager.render('freezed-model', modelData);
    
    // Single field should not have trailing blank line
    expect(result).toContain('/// Single value\n    required String value,\n  })');
  });
});