/**
 * Tests for model index file generation with params and headers exports
 */

import { describe, it, expect } from 'vitest';
import { generateModels } from '../../generators/models';
import { ServiceGenerator } from '../../generators/service-generator';

describe('Model Index Exports', () => {
  it('should include params and headers exports in models/index.dart', async () => {
    const spec = {
      openapi: '3.0.0',
      info: { title: 'Test API', version: '1.0.0' },
      components: {
        schemas: {
          User: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              name: { type: 'string' }
            },
            required: ['id', 'name']
          }
        }
      },
      paths: {}
    };

    const files = await generateModels(spec as any, { 
      output: { target: './test', mode: 'split', client: 'dio' },
      input: spec as any 
    });
    
    const indexFile = files.find(f => f.path === 'models/index.dart');
    
    expect(indexFile).toBeDefined();
    expect(indexFile?.content).toContain("export 'user.f.dart';");
    expect(indexFile?.content).toContain("export 'params/index.dart';");
    expect(indexFile?.content).toContain("export 'headers/index.dart';");
    expect(indexFile?.content).toContain('// Generated index file for models');
    expect(indexFile?.content).toContain('// Export params and headers if they exist');
  });

  it('should generate proper barrel exports for multiple models', async () => {
    const spec = {
      openapi: '3.0.0',
      info: { title: 'Test API', version: '1.0.0' },
      components: {
        schemas: {
          User: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              name: { type: 'string' }
            }
          },
          Product: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              title: { type: 'string' },
              price: { type: 'number' }
            }
          },
          StatusEnum: {
            type: 'string',
            enum: ['active', 'inactive', 'pending']
          }
        }
      },
      paths: {}
    };

    const files = await generateModels(spec as any, {
      output: { target: './test', mode: 'split', client: 'dio' },
      input: spec as any
    });
    
    const indexFile = files.find(f => f.path === 'models/index.dart');
    
    expect(indexFile?.content).toContain("export 'user.f.dart';");
    expect(indexFile?.content).toContain("export 'product.f.dart';");
    expect(indexFile?.content).toContain("export 'status_enum.f.dart';");
  });

  it('should handle empty schemas gracefully', async () => {
    const spec = {
      openapi: '3.0.0',
      info: { title: 'Test API', version: '1.0.0' },
      components: {
        schemas: {}
      },
      paths: {}
    };

    const files = await generateModels(spec as any, {
      output: { target: './test', mode: 'split', client: 'dio' },
      input: spec as any
    });
    
    const indexFile = files.find(f => f.path === 'models/index.dart');
    
    expect(indexFile).toBeDefined();
    expect(indexFile?.content).toContain("export 'params/index.dart';");
    expect(indexFile?.content).toContain("export 'headers/index.dart';");
    expect(indexFile?.content).not.toContain(".f.dart';"); // No model exports
  });
});