import { describe, it, expect } from 'vitest';
import { generateModels } from '../../generators/models';
import { OpenAPIObject } from '../../types';

describe('Enum Description HTML Entity Handling', () => {
  it('should handle descriptions with single quotes correctly', async () => {
    const spec: OpenAPIObject = {
      openapi: '3.0.0',
      info: {
        title: 'Test API',
        version: '1.0.0'
      },
      paths: {},
      components: {
        schemas: {
          ImportTimeEntriesDto: {
            type: 'object',
            properties: {
              items: {
                description: 'Array of time entries to import. Each entry must have unique source and sourceRefId combination.',
                type: 'array',
                items: {
                  $ref: '#/components/schemas/ImportTimeEntriesItemDto'
                }
              },
              importType: {
                type: 'string',
                enum: ['raw', 'processed', 'approved'],
                description: "Import type that determines the processing behavior and initial status of time entries:\n    - 'raw': Time entries are created with 'ended' status and labor calculations are performed immediately, work hours are calculated by the system and work hours in dto are ignored.\n    - 'processed': Time entries are created with 'ended' status but no labor calculations are performed, work hours would be stored as provided.\n    - 'approved': Time entries are created with 'approved' status and sent to Kafka for payroll processing, work hours would be stored as provided.",
                example: 'processed'
              }
            },
            required: ['items', 'importType']
          },
          ImportTimeEntriesItemDto: {
            type: 'object',
            properties: {
              id: {
                type: 'string'
              }
            }
          }
        }
      }
    };

    const files = await generateModels(spec, { 
      input: spec,
      output: { target: './test', mode: 'split', client: 'dio' } 
    } as any);

    // Find the generated enum file
    const enumFile = files.find(f => f.path === 'models/import_time_entries_dto_import_type_enum.f.dart');
    expect(enumFile).toBeDefined();
    
    // Check that the description does not contain HTML entities
    expect(enumFile!.content).not.toContain('&#x27;');
    expect(enumFile!.content).not.toContain('&#39;');
    expect(enumFile!.content).not.toContain('&quot;');
    
    // Check that the description contains the proper single quotes
    expect(enumFile!.content).toContain("- 'raw':");
    expect(enumFile!.content).toContain("- 'processed':");
    expect(enumFile!.content).toContain("- 'approved':");
    expect(enumFile!.content).toContain("'ended' status");
    
    // Check that multiline comments are properly formatted with /// on each line
    const lines = enumFile!.content.split('\n');
    const descStartIndex = lines.findIndex(line => line.includes('Import type that determines'));
    expect(lines[descStartIndex]).toMatch(/\/\/\/ Import type/);
    expect(lines[descStartIndex + 1]).toMatch(/\/\/\/ /);
    expect(lines[descStartIndex + 2]).toMatch(/\/\/\/ /);
    expect(lines[descStartIndex + 3]).toMatch(/\/\/\/ /);
  });

  it('should handle various HTML entities in descriptions', async () => {
    const spec: OpenAPIObject = {
      openapi: '3.0.0',
      info: {
        title: 'Test API',
        version: '1.0.0'
      },
      paths: {},
      components: {
        schemas: {
          TestDto: {
            type: 'object',
            properties: {
              status: {
                type: 'string',
                enum: ['active', 'inactive', 'pending'],
                description: "Status values with special chars: <active> means it's running, \"inactive\" means stopped & 'pending' means waiting",
              }
            }
          }
        }
      }
    };

    const files = await generateModels(spec, { 
      input: spec,
      output: { target: './test', mode: 'split', client: 'dio' } 
    } as any);

    const enumFile = files.find(f => f.path === 'models/test_dto_status_enum.f.dart');
    expect(enumFile).toBeDefined();
    
    // Check for proper handling of various special characters
    expect(enumFile!.content).toContain("<active>");
    expect(enumFile!.content).toContain('"inactive"');
    expect(enumFile!.content).toContain("'pending'");
    expect(enumFile!.content).toContain("stopped &");
    
    // Ensure no HTML entities remain
    expect(enumFile!.content).not.toContain('&lt;');
    expect(enumFile!.content).not.toContain('&gt;');
    expect(enumFile!.content).not.toContain('&amp;');
    expect(enumFile!.content).not.toContain('&quot;');
  });

  it('should handle multiline descriptions with special characters', async () => {
    const spec: OpenAPIObject = {
      openapi: '3.0.0',
      info: {
        title: 'Test API',
        version: '1.0.0'
      },
      paths: {},
      components: {
        schemas: {
          ProcessingStatus: {
            type: 'string',
            enum: ['draft', 'published', 'archived'],
            description: "Processing status:\n- 'draft': Document is being edited & not final\n- 'published': Document is \"live\" and <public>\n- 'archived': Document is no longer active"
          }
        }
      }
    };

    const files = await generateModels(spec, { 
      input: spec,
      output: { target: './test', mode: 'split', client: 'dio' } 
    } as any);

    const enumFile = files.find(f => f.path === 'models/processing_status.f.dart');
    expect(enumFile).toBeDefined();
    
    // Check multiline description formatting
    expect(enumFile!.content).toContain("/// Processing status:");
    expect(enumFile!.content).toContain("- 'draft':");
    expect(enumFile!.content).toContain("edited & not");
    expect(enumFile!.content).toContain('"live"');
    expect(enumFile!.content).toContain('<public>');
    
    // No HTML entities
    expect(enumFile!.content).not.toContain('&#');
    expect(enumFile!.content).not.toContain('&lt;');
    expect(enumFile!.content).not.toContain('&gt;');
    expect(enumFile!.content).not.toContain('&amp;');
  });
});