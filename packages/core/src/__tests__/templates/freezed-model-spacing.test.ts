import { describe, test, expect } from 'vitest';
import { TemplateManager } from '../../templates/template-manager';

describe('Template Blank Lines', () => {
  test('should preserve blank lines between properties', () => {
    const templateManager = new TemplateManager();
    
    // Test with minimal data
    const data = {
      className: 'TestModel',
      fileName: 'test_model',
      properties: [
        { name: 'field1', type: 'String', required: true, description: 'First' },
        { name: 'field2', type: 'String', required: true, description: 'Second' }
      ]
    };
    
    const result = templateManager.render('freezed-model', data);
    
    // Check that there's a blank line between fields
    const lines = result.split('\n');
    const field1Line = lines.findIndex(l => l.includes('required String field1'));
    const field2Line = lines.findIndex(l => l.includes('/// Second'));
    
    console.log('Field1 line:', field1Line);
    console.log('Field2 line:', field2Line);
    console.log('Lines between:', lines.slice(field1Line, field2Line + 1));
    
    // There should be a blank line between them
    expect(field2Line - field1Line).toBeGreaterThan(1);
    expect(lines[field1Line + 1].trim()).toBe(''); // The line after field1 should be empty
  });
});