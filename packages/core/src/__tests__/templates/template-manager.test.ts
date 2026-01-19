import { describe, it, expect } from 'vitest';
import { TemplateManager } from '../../templates/template-manager';

describe('Template-based Code Generation', () => {
  describe('Freezed Model Template', () => {
    it('should generate model with blank lines between fields with doc comments', () => {
      const templateManager = new TemplateManager();
      
      const modelData = {
        className: 'UserModel',
        imports: ["import 'package:freezed_annotation/freezed_annotation.dart';"],
        properties: [
          {
            description: 'Unique identifier',
            type: 'String',
            name: 'id',
            required: true,
            defaultValue: null
          },
          {
            description: 'User name',
            type: 'String',
            name: 'name',
            required: true,
            defaultValue: null
          },
          {
            description: 'Email address',
            type: 'String?',
            name: 'email',
            required: false,
            defaultValue: null
          },
          {
            description: 'User age',
            type: 'int',
            name: 'age',
            required: true,
            defaultValue: null
          }
        ]
      };
      
      const result = templateManager.render('freezed-model', modelData);
      
      // Check that the model uses Freezed
      expect(result).toContain('@freezed');
      expect(result).toContain('class UserModel with _$UserModel');
      
      // Check that fields have proper documentation
      expect(result).toContain('/// Unique identifier');
      expect(result).toContain('/// User name');
      expect(result).toContain('/// Email address');
      expect(result).toContain('/// User age');
      
      // Check that required fields are marked as required
      expect(result).toContain('required String id,');
      expect(result).toContain('required String name,');
      expect(result).toContain('required int age,');
      expect(result).toContain('String? email,');
      
      // Check for blank lines between fields
      const lines = result.split('\n');
      
      // Find the line with 'required String id,'
      const idLineIndex = lines.findIndex(line => line.includes('required String id,'));
      expect(idLineIndex).toBeGreaterThan(-1);
      
      // There should be a blank line after the id field (unless it's the last)
      const idIsLastField = !lines.slice(idLineIndex + 1).some(line => 
        line.includes('required') || line.includes('String?') || line.includes('int')
      );
      
      if (!idIsLastField) {
        // Check that there's a blank line after the field
        expect(lines[idLineIndex + 1].trim()).toBe('');
      }
      
      // Check fromJson factory
      expect(result).toContain('factory UserModel.fromJson(Map<String, dynamic> json)');
      expect(result).toContain('_$UserModelFromJson(json)');
    });

    it('should handle models with default values', () => {
      const templateManager = new TemplateManager();
      
      const modelData = {
        className: 'StatusModel',
        imports: ["import 'package:freezed_annotation/freezed_annotation.dart';"],
        properties: [
          {
            description: 'Status field',
            type: 'String',
            name: 'status',
            required: false,
            defaultValue: "'active'"
          },
          {
            description: 'Count field',
            type: 'int',
            name: 'count',
            required: false,
            defaultValue: '0'
          }
        ]
      };
      
      const result = templateManager.render('freezed-model', modelData);
      
      expect(result).toContain("@Default('active') String status,");
      expect(result).toContain('@Default(0) int count,');
      
      // Check for blank line between fields
      const lines = result.split('\n');
      const statusLineIndex = lines.findIndex(line => line.includes("@Default('active')"));
      
      // Should have a blank line after status field (since it's not the last)
      expect(lines[statusLineIndex + 1].trim()).toBe('');
    });
  });

  describe('Freezed Union Template', () => {
    it('should generate discriminated union with multiple types', () => {
      const templateManager = new TemplateManager();
      
      const unionData = {
        className: 'MyFeedItem',
        imports: [
          "shift_response_dto_v2.f.dart",
          "my_feed_time_off_request_item.f.dart"
        ],
        discriminatorProperty: 'itemType',
        unions: [
          {
            factoryName: 'shift',
            pascalFactoryName: 'Shift',
            discriminatorValue: 'shift',
            type: 'ShiftResponseDtoV2',
            unionProperty: 'item',
            discriminatorProperty: 'itemType',
            properties: [
              {
                type: 'ShiftResponseDtoV2',
                name: 'item',
                required: true
              }
            ]
          },
          {
            factoryName: 'timeOffRequest',
            pascalFactoryName: 'TimeOffRequest',
            discriminatorValue: 'time_off_request',
            type: 'MyFeedTimeOffRequestItem',
            unionProperty: 'item',
            discriminatorProperty: 'itemType',
            properties: [
              {
                type: 'MyFeedTimeOffRequestItem',
                name: 'item',
                required: true
              }
            ]
          }
        ]
      };
      
      const result = templateManager.render('freezed-union', unionData);

      // Check imports
      expect(result).toContain("import 'shift_response_dto_v2.f.dart';");
      expect(result).toContain("import 'my_feed_time_off_request_item.f.dart';");

      // Check Freezed union structure - now uses @Freezed(unionKey: ...) and @FreezedUnionValue
      expect(result).toContain("@Freezed(unionKey: 'itemType')");
      expect(result).toContain('class MyFeedItem with _$MyFeedItem');
      expect(result).toContain('const MyFeedItem._();');

      // Check factory constructors with FreezedUnionValue annotations (no discriminator field, public class names)
      expect(result).toContain("@FreezedUnionValue('shift')");
      expect(result).toContain('const factory MyFeedItem.shift({');
      expect(result).toContain('required ShiftResponseDtoV2 item,');
      expect(result).toContain('}) = MyFeedItemShift;');

      expect(result).toContain("@FreezedUnionValue('time_off_request')");
      expect(result).toContain('const factory MyFeedItem.timeOffRequest({');
      expect(result).toContain('required MyFeedTimeOffRequestItem item,');
      expect(result).toContain('}) = MyFeedItemTimeOffRequest;');

      // Check fromJson factory
      expect(result).toContain('factory MyFeedItem.fromJson(Map<String, dynamic> json)');
      expect(result).toContain('_$MyFeedItemFromJson(json)');
    });

    it('should generate freezed class for oneOf without discriminator', () => {
      const templateManager = new TemplateManager();
      
      const unionData = {
        className: 'ValueType',
        imports: [
          "string_value.f.dart",
          "number_value.f.dart",
          "boolean_value.f.dart"
        ],
        unions: [
          {
            factoryName: 'stringValue',
            pascalFactoryName: 'StringValue',
            type: 'String',
            unionProperty: 'value',
            properties: [
              {
                type: 'String',
                name: 'value',
                required: true
              }
            ]
          },
          {
            factoryName: 'numberValue',
            pascalFactoryName: 'NumberValue',
            type: 'double',
            unionProperty: 'value',
            properties: [
              {
                type: 'double',
                name: 'value',
                required: true
              }
            ]
          },
          {
            factoryName: 'booleanValue',
            pascalFactoryName: 'BooleanValue',
            type: 'bool',
            unionProperty: 'value',
            properties: [
              {
                type: 'bool',
                name: 'value',
                required: true
              }
            ]
          }
        ]
      };
      
      const result = templateManager.render('freezed-union', unionData);

      // Check imports
      expect(result).toContain("import 'string_value.f.dart';");
      expect(result).toContain("import 'number_value.f.dart';");
      expect(result).toContain("import 'boolean_value.f.dart';");

      // Check Freezed union structure - uses @Freezed(unionKey: ...) even without explicit discriminator
      expect(result).toContain('@Freezed(unionKey:');
      expect(result).toContain('class ValueType with _$ValueType');
      expect(result).toContain('const ValueType._();');

      // Check factory constructors (public class names)
      expect(result).toContain('const factory ValueType.stringValue(');
      expect(result).toContain('String value');
      expect(result).toContain('}) = ValueTypeStringValue;');

      expect(result).toContain('const factory ValueType.numberValue(');
      expect(result).toContain('double value');
      expect(result).toContain('}) = ValueTypeNumberValue;');
    });
  });

  describe('Freezed Enum Template', () => {
    it('should generate enum with string values', () => {
      const templateManager = new TemplateManager();
      
      const enumData = {
        enumName: 'StatusEnum',
        values: [
          { name: 'pending', value: 'pending' },
          { name: 'approved', value: 'approved' },
          { name: 'rejected', value: 'rejected' },
          { name: 'cancelled', value: 'cancelled' }
        ]
      };
      
      const result = templateManager.render('freezed-enum', enumData);
      
      // Check enum structure
      expect(result).toContain('enum StatusEnum {');
      
      // Check enum values with JsonValue annotations
      expect(result).toContain("@JsonValue('pending')");
      expect(result).toContain('pending,');
      
      expect(result).toContain("@JsonValue('approved')");
      expect(result).toContain('approved,');
      
      expect(result).toContain("@JsonValue('rejected')");
      expect(result).toContain('rejected,');
      
      expect(result).toContain("@JsonValue('cancelled')");
      expect(result).toContain('cancelled');
      
      expect(result).toContain('}');
    });

    it('should generate enum with numeric values', () => {
      const templateManager = new TemplateManager();
      
      const enumData = {
        enumName: 'PriorityEnum',
        values: [
          { name: 'value1', value: 1 },
          { name: 'value2', value: 2 },
          { name: 'value3', value: 3 },
          { name: 'value4', value: 4 }
        ]
      };
      
      const result = templateManager.render('freezed-enum', enumData);
      
      // Check enum structure
      expect(result).toContain('enum PriorityEnum {');
      
      // Check enum values with JsonValue annotations (numeric values should be quoted)
      expect(result).toContain("@JsonValue('1')");
      expect(result).toContain('value1,');
      
      expect(result).toContain("@JsonValue('2')");
      expect(result).toContain('value2,');
      
      expect(result).toContain("@JsonValue('4')");
      expect(result).toContain('value4');
    });
  });

  describe('Template Blank Line Behavior', () => {
    it('should preserve blank lines between fields in models', () => {
      const templateManager = new TemplateManager();
      
      const modelData = {
        className: 'TestModel',
        imports: ["import 'package:freezed_annotation/freezed_annotation.dart';"],
        properties: [
          {
            description: 'First field',
            type: 'String',
            name: 'first',
            required: true,
            defaultValue: null
          },
          {
            description: 'Second field',
            type: 'String',
            name: 'second',
            required: true,
            defaultValue: null
          },
          {
            description: 'Third field',
            type: 'String',
            name: 'third',
            required: true,
            defaultValue: null
          }
        ]
      };
      
      const result = templateManager.render('freezed-model', modelData);
      const lines = result.split('\n');
      
      // Find constructor section
      const constructorStart = lines.findIndex(line => line.includes('const factory TestModel'));
      expect(constructorStart).toBeGreaterThan(-1);
      
      // Find field lines
      const firstFieldLine = lines.findIndex(line => line.includes('/// First field'));
      const secondFieldLine = lines.findIndex(line => line.includes('/// Second field'));
      const thirdFieldLine = lines.findIndex(line => line.includes('/// Third field'));
      
      expect(firstFieldLine).toBeGreaterThan(-1);
      expect(secondFieldLine).toBeGreaterThan(-1);
      expect(thirdFieldLine).toBeGreaterThan(-1);
      
      // Check for blank lines between fields
      // After first field's definition line, there should be a blank line
      const firstFieldDefLine = lines.findIndex((line, idx) => 
        idx > firstFieldLine && line.includes('required String first,')
      );
      expect(lines[firstFieldDefLine + 1].trim()).toBe('');
      
      // After second field's definition line, there should be a blank line
      const secondFieldDefLine = lines.findIndex((line, idx) => 
        idx > secondFieldLine && line.includes('required String second,')
      );
      expect(lines[secondFieldDefLine + 1].trim()).toBe('');
      
      // Third field is last, so no blank line after it
      const thirdFieldDefLine = lines.findIndex((line, idx) => 
        idx > thirdFieldLine && line.includes('required String third,')
      );
      // Next non-empty line should be the closing of constructor
      const nextNonEmpty = lines.slice(thirdFieldDefLine + 1).find(line => line.trim());
      expect(nextNonEmpty).toContain('})');
    });
  });
});