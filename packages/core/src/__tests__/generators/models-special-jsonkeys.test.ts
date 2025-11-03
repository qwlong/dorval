/**
 * Tests for handling special JSON keys in model generation
 * - MongoDB operators ($if, $switch, etc.)
 * - Reserved keywords (else, in, class, etc.)
 * - Special characters in property names
 */

import { describe, it, expect } from 'vitest';
import { generateDartCode } from '../../index';

describe('Model Generation - Special JSON Keys', () => {
  describe('MongoDB Operators with $ prefix', () => {
    it('should generate raw string @JsonKey for $ prefixed properties', async () => {
      const spec = {
        openapi: '3.0.0',
        info: { title: 'Test API', version: '1.0.0' },
        paths: {},
        components: {
          schemas: {
            MongoQuery: {
              type: 'object',
              properties: {
                $if: {
                  type: 'object',
                  additionalProperties: true,
                  description: 'MongoDB $if operator'
                },
                $switch: {
                  type: 'object',
                  additionalProperties: true,
                  description: 'MongoDB $switch operator'
                },
                $match: {
                  type: 'object',
                  additionalProperties: true
                },
                $eval: {
                  type: 'string',
                  description: 'Eval expression'
                },
                regularField: {
                  type: 'string',
                  description: 'Normal field without $'
                }
              }
            }
          }
        }
      };

      const files = await generateDartCode({
        input: spec as any,
        output: {
          target: './test-output',
          mode: 'single'
        }
      });

      const modelFile = files.find(f => f.path.includes('mongo_query.f.dart'));
      expect(modelFile).toBeDefined();

      const content = modelFile!.content;

      // Should use raw string r'$if' for $ prefixed keys
      expect(content).toContain("@JsonKey(name: r'$if')");
      expect(content).toContain("Map<String, dynamic>? $if");

      expect(content).toContain("@JsonKey(name: r'$switch')");
      expect(content).toContain("Map<String, dynamic>? $switch");

      expect(content).toContain("@JsonKey(name: r'$match')");
      expect(content).toContain("Map<String, dynamic>? $match");

      expect(content).toContain("@JsonKey(name: r'$eval')");
      expect(content).toContain("String? $eval");

      // Regular fields should not have @JsonKey if name matches
      expect(content).not.toContain("@JsonKey(name: 'regularField')");
      expect(content).toContain("String? regularField");
    });

    it('should preserve $ in property names', async () => {
      const spec = {
        openapi: '3.0.0',
        info: { title: 'Test API', version: '1.0.0' },
        paths: {},
        components: {
          schemas: {
            Expression: {
              type: 'object',
              properties: {
                $let: { type: 'object', additionalProperties: true },
                $find: { type: 'array', items: { type: 'string' } }
              }
            }
          }
        }
      };

      const files = await generateDartCode({
        input: spec as any,
        output: { target: './test-output', mode: 'single' }
      });

      const modelFile = files.find(f => f.path.includes('expression.f.dart'));
      expect(modelFile).toBeDefined();

      const content = modelFile!.content;

      // Property names should keep the $ prefix
      expect(content).toContain('Map<String, dynamic>? $let');
      expect(content).toContain('List<String>? $find');

      // JSON keys should use raw strings
      expect(content).toContain("@JsonKey(name: r'$let')");
      expect(content).toContain("@JsonKey(name: r'$find')");
    });
  });

  describe('Dart Reserved Keywords', () => {
    it('should escape reserved keywords and add @JsonKey', async () => {
      const spec = {
        openapi: '3.0.0',
        info: { title: 'Test API', version: '1.0.0' },
        paths: {},
        components: {
          schemas: {
            ReservedFields: {
              type: 'object',
              properties: {
                else: {
                  type: 'object',
                  additionalProperties: true,
                  description: 'Else clause'
                },
                in: {
                  type: 'string',
                  description: 'In operator'
                },
                class: {
                  type: 'string'
                },
                for: {
                  type: 'integer'
                },
                then: {
                  type: 'object',
                  additionalProperties: true
                }
              }
            }
          }
        }
      };

      const files = await generateDartCode({
        input: spec as any,
        output: { target: './test-output', mode: 'single' }
      });

      const modelFile = files.find(f => f.path.includes('reserved_fields.f.dart'));
      expect(modelFile).toBeDefined();

      const content = modelFile!.content;

      // Reserved keywords should be escaped with _ suffix
      expect(content).toContain("@JsonKey(name: 'else')");
      expect(content).toContain('Map<String, dynamic>? else_');

      expect(content).toContain("@JsonKey(name: 'in')");
      expect(content).toContain('String? in_');

      expect(content).toContain("@JsonKey(name: 'class')");
      expect(content).toContain('String? class_');

      expect(content).toContain("@JsonKey(name: 'for')");
      expect(content).toContain('int? for_');

      // 'then' is not a reserved keyword in Dart, so no @JsonKey needed
      expect(content).not.toContain("@JsonKey(name: 'then')");
      expect(content).toContain('Map<String, dynamic>? then');
    });
  });

  describe('Mixed special characters', () => {
    it('should handle properties with both $ and keywords', async () => {
      const spec = {
        openapi: '3.0.0',
        info: { title: 'Test API', version: '1.0.0' },
        paths: {},
        components: {
          schemas: {
            MixedSpecial: {
              type: 'object',
              properties: {
                $if: { type: 'object', additionalProperties: true },
                $else: { type: 'object', additionalProperties: true },
                else: { type: 'string' },
                'each(c)': { type: 'string' },
                'x-api-key': { type: 'string' }
              }
            }
          }
        }
      };

      const files = await generateDartCode({
        input: spec as any,
        output: { target: './test-output', mode: 'single' }
      });

      const modelFile = files.find(f => f.path.includes('mixed_special.f.dart'));
      expect(modelFile).toBeDefined();

      const content = modelFile!.content;

      // $if and $else should use raw strings and keep $ in property name
      expect(content).toContain("@JsonKey(name: r'$if')");
      expect(content).toContain('Map<String, dynamic>? $if');

      expect(content).toContain("@JsonKey(name: r'$else')");
      expect(content).toContain('Map<String, dynamic>? $else');

      // Plain 'else' keyword should be escaped
      expect(content).toContain("@JsonKey(name: 'else')");
      expect(content).toContain('String? else_');

      // Special characters should be converted to camelCase
      expect(content).toContain("@JsonKey(name: 'each(c)')");
      expect(content).toContain('String? eachC');

      expect(content).toContain("@JsonKey(name: 'x-api-key')");
      expect(content).toContain('String? xApiKey');
    });
  });

  describe('Complex nested structures with $ operators', () => {
    it('should handle nested objects with MongoDB operators', async () => {
      const spec = {
        openapi: '3.0.0',
        info: { title: 'Test API', version: '1.0.0' },
        paths: {},
        components: {
          schemas: {
            Pipeline: {
              type: 'object',
              properties: {
                $match: {
                  type: 'object',
                  properties: {
                    status: { type: 'string' },
                    count: { type: 'integer' }
                  }
                },
                $group: {
                  type: 'object',
                  additionalProperties: true
                }
              }
            }
          }
        }
      };

      const files = await generateDartCode({
        input: spec as any,
        output: { target: './test-output', mode: 'single' }
      });

      const modelFile = files.find(f => f.path.includes('pipeline.f.dart'));
      expect(modelFile).toBeDefined();

      const content = modelFile!.content;

      // Top-level $ operators should use raw strings
      expect(content).toContain("@JsonKey(name: r'$match')");
      expect(content).toContain("@JsonKey(name: r'$group')");
    });
  });

  describe('File naming with special characters', () => {
    it('should generate correct snake_case file names for models with $ in schema name', async () => {
      const spec = {
        openapi: '3.0.0',
        info: { title: 'Test API', version: '1.0.0' },
        paths: {},
        components: {
          schemas: {
            'Query$Builder': {
              type: 'object',
              properties: {
                query: { type: 'string' }
              }
            }
          }
        }
      };

      const files = await generateDartCode({
        input: spec as any,
        output: { target: './test-output', mode: 'single' }
      });

      // File name should convert $ to underscore in snake_case
      const modelFile = files.find(f => f.path.includes('query_builder.f.dart'));
      expect(modelFile).toBeDefined();
    });
  });
});
