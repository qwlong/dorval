import { describe, it, expect } from 'vitest';
import { combineSchemas } from '../../getters/combine';

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
    
    // The definition now only contains the class, imports are separate
    expect(result.imports).toContain('shift_response_dto_v2.f.dart');
    expect(result.imports).toContain('my_feed_time_off_request_item.f.dart');
    
    // Check the basic structure - now uses @Freezed(unionKey: ...) and @FreezedUnionValue
    expect(definition).toContain("@Freezed(unionKey: 'itemType')");
    expect(definition).toContain('class MyFeedItem with _$MyFeedItem');
    expect(definition).toContain('const MyFeedItem._();');

    // Check factory constructors with FreezedUnionValue annotations (no discriminator field, public class names)
    expect(definition).toContain("@FreezedUnionValue('shift')");
    expect(definition).toContain('const factory MyFeedItem.shift({');
    expect(definition).toContain('}) = MyFeedItemShift;');

    expect(definition).toContain("@FreezedUnionValue('time_off_request')");
    expect(definition).toContain('const factory MyFeedItem.timeOffRequest({');
    expect(definition).toContain('}) = MyFeedItemTimeOffRequest;');

    // Check fromJson factory
    expect(definition).toContain('factory MyFeedItem.fromJson(Map<String, dynamic> json)');
  });
});