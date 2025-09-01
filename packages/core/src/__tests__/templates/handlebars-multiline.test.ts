import { describe, it, expect } from 'vitest';
import Handlebars from 'handlebars';

describe('Multiline Comment Formatting', () => {
  // Create helper function similar to what's in TemplateManager
  function createDartDocHelper() {
    const handlebars = Handlebars.create();
    
    handlebars.registerHelper('dartDoc', (text: string, options?: any) => {
      if (!text) return '';
      
      // Check if indentLevel is passed as a hash parameter
      const indentLevel = options?.hash?.indent ?? 2;
      const indentStr = ' '.repeat(indentLevel);
      
      // Split by newlines
      const lines = text.split('\n');
      
      // Filter out empty lines at the beginning and end
      while (lines.length > 0 && lines[0].trim() === '') {
        lines.shift();
      }
      while (lines.length > 0 && lines[lines.length - 1].trim() === '') {
        lines.pop();
      }
      
      // Format each line with /// prefix, all with same indentation
      const formattedLines = lines.map((line) => {
        const trimmed = line.trim();
        return trimmed ? `${indentStr}/// ${trimmed}` : `${indentStr}///`;
      });
      
      return formattedLines.join('\n');
    });
    
    return handlebars;
  }

  it('should format multiline descriptions correctly', () => {
    const handlebars = createDartDocHelper();
    const template = handlebars.compile(`{{#if description}}{{{dartDoc description indent=4}}}{{/if}}`);
    
    // Test with multiline description
    const multilineDesc = `
    for batch resource api, use 'include' to embed the resource in the response,     for single resource api, the resource is embedded by default;
    noted the embedding resources does not supported nested resources.
    `;
    
    const result = template({ description: multilineDesc });
    
    // Should have /// prefix for each line
    expect(result).toContain('    /// for batch resource api');
    expect(result).toContain('    /// noted the embedding resources');
    expect(result).not.toContain('\n    for batch'); // Should not have lines without ///
    
    // Each non-empty line should start with ///
    const lines = result.split('\n').filter(line => line.trim());
    lines.forEach(line => {
      expect(line.trim()).toMatch(/^\/\/\//);
    });
  });

  it('should handle single line descriptions', () => {
    const handlebars = createDartDocHelper();
    const template = handlebars.compile(`{{#if description}}{{{dartDoc description indent=4}}}{{/if}}`);
    
    const singleLineDesc = 'Whether this shift is up for grabs';
    const result = template({ description: singleLineDesc });
    
    expect(result).toBe('    /// Whether this shift is up for grabs');
  });

  it('should handle descriptions with empty lines', () => {
    const handlebars = createDartDocHelper();
    const template = handlebars.compile(`{{#if description}}{{{dartDoc description indent=4}}}{{/if}}`);
    
    const descWithEmptyLines = `First line

    Second line after empty line`;
    
    const result = template({ description: descWithEmptyLines });
    
    // Should preserve empty lines as ///
    expect(result).toContain('    /// First line');
    expect(result).toContain('    ///');
    expect(result).toContain('    /// Second line after empty line');
  });
});