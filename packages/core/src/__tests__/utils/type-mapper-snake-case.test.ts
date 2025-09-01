import { describe, it, expect } from 'vitest';
import { TypeMapper } from '../../utils/type-mapper';

describe('Snake Case Conversion', () => {
  it('should correctly convert V2Dto pattern', () => {
    // Test the problematic cases
    expect(TypeMapper.toSnakeCase('ScheduleViewResponseV2Dto')).toBe('schedule_view_response_v2_dto');
    expect(TypeMapper.toSnakeCase('ScheduleViewRequestV2Dto')).toBe('schedule_view_request_v2_dto');
    
    // Test other common patterns
    expect(TypeMapper.toSnakeCase('MyFeedResponseDto')).toBe('my_feed_response_dto');
    expect(TypeMapper.toSnakeCase('LocationSettingsResponseDto')).toBe('location_settings_response_dto');
    expect(TypeMapper.toSnakeCase('GetShiftsResponseDto')).toBe('get_shifts_response_dto');
    
    // Test V2 patterns
    expect(TypeMapper.toSnakeCase('ShiftResponseDtoV2')).toBe('shift_response_dto_v2');
    expect(TypeMapper.toSnakeCase('TodayShiftsResponseDtoV2')).toBe('today_shifts_response_dto_v2');
    
    // Test other edge cases
    expect(TypeMapper.toSnakeCase('APIResponse')).toBe('api_response');
    expect(TypeMapper.toSnakeCase('HTTPSConnection')).toBe('https_connection');
    expect(TypeMapper.toSnakeCase('XMLParser')).toBe('xml_parser');
    expect(TypeMapper.toSnakeCase('IOError')).toBe('io_error');
  });
});