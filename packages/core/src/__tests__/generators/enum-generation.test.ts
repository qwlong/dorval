import { describe, it, expect } from 'vitest';
import { ModelGenerator } from '../../generators/model-generator';

describe('Enum Generation', () => {
  const generator = new ModelGenerator();

  it('should generate enum with string values', () => {
    const result = generator.generateEnum(
      'PetStatus',
      ['available', 'pending', 'sold'],
      'Pet status in the store'
    );

    expect(result.path).toBe('models/pet_status.f.dart');
    expect(result.content).toContain('enum PetStatus');
    expect(result.content).toContain("available('available')");
    expect(result.content).toContain("pending('pending')");
    expect(result.content).toContain("sold('sold')");
    expect(result.content).toContain('Pet status in the store');
    expect(result.content).toContain('static PetStatus? fromValue(String? value)');
    expect(result.content).toContain('static PetStatus? fromJson(dynamic json)');
  });

  it('should handle enum values with special characters', () => {
    const result = generator.generateEnum(
      'OrderStatus',
      ['in-progress', 'completed', '404_error', '1_pending'],
      undefined
    );

    expect(result.content).toContain("inProgress('in-progress')");
    expect(result.content).toContain("completed('completed')");
    // 404_error starts with a number after replacing special chars, so it gets value prefix
    expect(result.content).toContain("('404_error')");
    expect(result.content).toContain("('1_pending')");
  });

  it('should handle numeric enum values', () => {
    const result = generator.generateEnum(
      'HttpStatus',
      ['200', '404', '500'],
      'HTTP status codes'
    );

    expect(result.content).toContain("value200('200')");
    expect(result.content).toContain("value404('404')");
    expect(result.content).toContain("value500('500')");
  });

  it('should generate proper fromValue and toJson methods', () => {
    const result = generator.generateEnum(
      'TestEnum',
      ['val1', 'val2'],
      undefined
    );

    expect(result.content).toContain('const TestEnum(this.value)');
    expect(result.content).toContain('final String value');
    expect(result.content).toContain('return TestEnum.values.firstWhere');
    expect(result.content).toContain('dynamic toJson() => value');
    expect(result.content).toContain('String toString() => value');
  });
});