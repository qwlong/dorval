import { describe, it, expect } from 'vitest';
import { combineSchemas } from '../getters/combine';

describe('MyFeedItem oneOf Generation', () => {
  it('should generate proper Freezed union type for MyFeedItem with discriminator', () => {
    // This is the discriminator info we're getting from the OpenAPI spec
    const discriminatorInfo = {
      propertyName: 'itemType',
      discriminatorProperty: 'itemType',
      values: ['shift', 'time_off_request'],
      unionSchemas: [
        { $ref: '#/components/schemas/ShiftResponseDtoV2' },
        { $ref: '#/components/schemas/MyFeedTimeOffRequestItem' }
      ],
      compositionType: 'oneOf'
    };

    const result = combineSchemas(
      { oneOf: discriminatorInfo.unionSchemas },
      'MyFeedItem',
      'oneOf',
      { discriminator: discriminatorInfo }
    );

    // Check the result
    expect(result.type).toBe('MyFeedItem');
    expect(result.isSealed).toBe(true);
    expect(result.definition).toBeDefined();
    
    // Check that the generated code matches the expected format
    const definition = result.definition!;
    
    // Should have proper imports
    expect(definition).toContain("import 'package:freezed_annotation/freezed_annotation.dart';");
    expect(definition).toContain("import 'shift_response_dto_v2.dart';");
    expect(definition).toContain("import 'my_feed_time_off_request_item.dart';");
    
    // Should have freezed parts
    expect(definition).toContain("part 'my_feed_item.f.freezed.dart';");
    expect(definition).toContain("part 'my_feed_item.f.g.dart';");
    
    // Should have the @freezed annotation
    expect(definition).toContain('@freezed');
    expect(definition).toContain('class MyFeedItem with _$MyFeedItem');
    
    // Should NOT have unnecessary comments
    expect(definition).not.toContain('// Approach 1');
    
    // Should have the const constructor
    expect(definition).toContain('const MyFeedItem._();');
    
    // Should have factory constructors for each union case
    expect(definition).toContain('@JsonSerializable(explicitToJson: true)');
    expect(definition).toContain('const factory MyFeedItem.shift({');
    expect(definition).toContain("@Default('shift') String itemType,");
    expect(definition).toContain('required ShiftResponseDtoV2 item,');
    expect(definition).toContain('}) = _MyFeedItemShift;');
    
    expect(definition).toContain('const factory MyFeedItem.timeOffRequest({');
    expect(definition).toContain("@Default('time_off_request') String itemType,");
    expect(definition).toContain('required MyFeedTimeOffRequestItem item,');
    expect(definition).toContain('}) = _MyFeedItemTimeOffRequest;');
    
    // Should have custom fromJson with discriminator logic
    expect(definition).toContain('factory MyFeedItem.fromJson(Map<String, dynamic> json) {');
    expect(definition).toContain("final itemType = json['itemType'] as String?;");
    expect(definition).toContain("switch (itemType) {");
    expect(definition).toContain("case 'shift':");
    expect(definition).toContain('return MyFeedItem.shift(');
    expect(definition).toContain("item: ShiftResponseDtoV2.fromJson(json['item'] as Map<String, dynamic>),");
    expect(definition).toContain("case 'time_off_request':");
    expect(definition).toContain('return MyFeedItem.timeOffRequest(');
    expect(definition).toContain("item: MyFeedTimeOffRequestItem.fromJson(json['item'] as Map<String, dynamic>),");
    
    // Should have toJson helper
    expect(definition).toContain('Map<String, dynamic> toJson() {');
    expect(definition).toContain('return map(');
    expect(definition).toContain("shift: (value) => {");
    expect(definition).toContain("'itemType': 'shift',");
    expect(definition).toContain("'item': value.item.toJson(),");
    expect(definition).toContain("timeOffRequest: (value) => {");
    expect(definition).toContain("'itemType': 'time_off_request',");
    expect(definition).toContain("'item': value.item.toJson(),");
  });
});