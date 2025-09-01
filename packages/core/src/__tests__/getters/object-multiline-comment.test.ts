import { describe, it, expect } from 'vitest';
import { getObject } from '../../getters/object';
import { OpenAPIV3 } from 'openapi-types';

describe('Multiline comment formatting in object.ts', () => {
  it('should format multiline descriptions with /// on each line', () => {
    const schema: OpenAPIV3.SchemaObject = {
      type: 'object',
      properties: {
        batchResourceStatus: {
          type: 'string',
          description: `The status of the batch resource
0 - Inprogress
1 - Completed
2 - Failed`
        },
        singleLineDescription: {
          type: 'string',
          description: 'This is a single line description'
        }
      },
      required: ['batchResourceStatus']
    };

    const result = getObject(schema, 'TestModel');
    
    // Check that multiline description is properly formatted
    expect(result.definition).toContain('/// The status of the batch resource');
    expect(result.definition).toContain('/// 0 - Inprogress');
    expect(result.definition).toContain('/// 1 - Completed');
    expect(result.definition).toContain('/// 2 - Failed');
    
    // Check single line description
    expect(result.definition).toContain('/// This is a single line description');
    
    // Make sure the property follows the description
    expect(result.definition).toMatch(/\/\/\/ 2 - Failed\s+required String batchResourceStatus,/);
  });

  it('should handle descriptions with empty lines', () => {
    const schema: OpenAPIV3.SchemaObject = {
      type: 'object',
      properties: {
        complexField: {
          type: 'string',
          description: `First line

Second line after empty

Third line`
        }
      }
    };

    const result = getObject(schema, 'TestModel');
    
    // Check that each non-empty line gets /// prefix
    expect(result.definition).toContain('/// First line');
    expect(result.definition).toContain('/// Second line after empty');
    expect(result.definition).toContain('/// Third line');
    
    // Should not have empty /// lines
    expect(result.definition).not.toMatch(/\/\/\/\s*\n\s*\/\/\//);
  });
});