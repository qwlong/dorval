import { describe, it, expect } from 'vitest';
import { ModelGenerator } from '../../generators/model-generator';
import { ReferenceResolver } from '../../resolvers/reference-resolver';
import type { OpenAPIV3 } from 'openapi-types';

describe('ModelGenerator - Import Deduplication', () => {
  const modelGenerator = new ModelGenerator();

  /**
   * Helper to create an OpenAPI spec with the given schemas
   */
  function createSpec(schemas: Record<string, OpenAPIV3.SchemaObject>): OpenAPIV3.Document {
    return {
      openapi: '3.0.0',
      info: {
        title: 'Test API',
        version: '1.0.0'
      },
      paths: {},
      components: {
        schemas
      }
    };
  }

  /**
   * Helper to count occurrences of an import statement in generated content
   */
  function countImportOccurrences(content: string, modelName: string): number {
    const snakeName = modelName
      .replace(/([a-z])([A-Z])/g, '$1_$2')
      .toLowerCase();
    const pattern = new RegExp(`import '${snakeName}\\.f\\.dart';`, 'g');
    const matches = content.match(pattern);
    return matches ? matches.length : 0;
  }

  it('should deduplicate imports for direct $ref properties', () => {
    const spec = createSpec({
      Address: {
        type: 'object',
        properties: {
          street: { type: 'string' },
          city: { type: 'string' }
        }
      },
      User: {
        type: 'object',
        properties: {
          // Multiple direct references to same model
          homeAddress: { $ref: '#/components/schemas/Address' },
          workAddress: { $ref: '#/components/schemas/Address' },
          mailingAddress: { $ref: '#/components/schemas/Address' }
        },
        required: ['homeAddress', 'workAddress']
      }
    });

    const refResolver = new ReferenceResolver(spec);
    modelGenerator.setReferenceResolver(refResolver);

    const result = modelGenerator.generateModel(
      'User',
      spec.components!.schemas!.User as OpenAPIV3.SchemaObject
    );

    // Should only import Address once
    expect(countImportOccurrences(result.content, 'Address')).toBe(1);

    // Verify properties are correctly typed
    expect(result.content).toContain('Address homeAddress');
    expect(result.content).toContain('Address workAddress');
    expect(result.content).toContain('Address? mailingAddress');
  });

  it('should deduplicate imports for array items with $ref', () => {
    const spec = createSpec({
      Product: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          name: { type: 'string' }
        }
      },
      Order: {
        type: 'object',
        properties: {
          // Array references
          products: {
            type: 'array',
            items: { $ref: '#/components/schemas/Product' }
          },
          favoriteProducts: {
            type: 'array',
            items: { $ref: '#/components/schemas/Product' }
          },
          // Single reference
          featuredProduct: { $ref: '#/components/schemas/Product' }
        },
        required: ['products']
      }
    });

    const refResolver = new ReferenceResolver(spec);
    modelGenerator.setReferenceResolver(refResolver);

    const result = modelGenerator.generateModel(
      'Order',
      spec.components!.schemas!.Order as OpenAPIV3.SchemaObject
    );

    // Should only import Product once
    expect(countImportOccurrences(result.content, 'Product')).toBe(1);

    // Verify array types
    expect(result.content).toContain('List<Product> products');
    expect(result.content).toContain('List<Product>? favoriteProducts');
    expect(result.content).toContain('Product? featuredProduct');
  });

  it('should deduplicate imports for oneOf/anyOf patterns with $ref', () => {
    const spec = createSpec({
      Employee: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          name: { type: 'string' }
        }
      },
      Department: {
        type: 'object',
        properties: {
          // oneOf with $ref and null (nullable pattern)
          manager: {
            oneOf: [
              { $ref: '#/components/schemas/Employee' },
              { type: null }
            ]
          },
          // anyOf with same $ref
          teamLead: {
            anyOf: [
              { $ref: '#/components/schemas/Employee' },
              { type: null }
            ]
          },
          // Array of employees
          members: {
            type: 'array',
            items: { $ref: '#/components/schemas/Employee' }
          }
        },
        required: ['members']
      }
    });

    const refResolver = new ReferenceResolver(spec);
    modelGenerator.setReferenceResolver(refResolver);

    const result = modelGenerator.generateModel(
      'Department',
      spec.components!.schemas!.Department as OpenAPIV3.SchemaObject
    );

    // Should only import Employee once despite multiple references
    expect(countImportOccurrences(result.content, 'Employee')).toBe(1);

    // NOTE: oneOf/anyOf with $ref and null currently generates 'dynamic'
    // TODO: Should generate nullable types (Employee? manager, Employee? teamLead)
    expect(result.content).toContain('dynamic manager');
    expect(result.content).toContain('dynamic teamLead');
    expect(result.content).toContain('List<Employee> members');
  });

  it('should deduplicate imports for allOf patterns with $ref', () => {
    const spec = createSpec({
      BaseEntity: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          createdAt: { type: 'string', format: 'date-time' }
        }
      },
      Document: {
        type: 'object',
        properties: {
          // allOf with single $ref
          metadata: {
            allOf: [
              { $ref: '#/components/schemas/BaseEntity' }
            ]
          },
          // Another allOf reference
          audit: {
            allOf: [
              { $ref: '#/components/schemas/BaseEntity' }
            ]
          },
          // Direct reference for comparison
          relatedEntity: { $ref: '#/components/schemas/BaseEntity' }
        },
        required: ['metadata']
      }
    });

    const refResolver = new ReferenceResolver(spec);
    modelGenerator.setReferenceResolver(refResolver);

    const result = modelGenerator.generateModel(
      'Document',
      spec.components!.schemas!.Document as OpenAPIV3.SchemaObject
    );

    // Should only import BaseEntity once
    expect(countImportOccurrences(result.content, 'BaseEntity')).toBe(1);

    // Verify allOf resolved to correct types
    expect(result.content).toContain('BaseEntity metadata');
    expect(result.content).toContain('BaseEntity? audit');
    expect(result.content).toContain('BaseEntity? relatedEntity');
  });

  it('should handle multiple different model imports without duplication', () => {
    const spec = createSpec({
      ModelA: {
        type: 'object',
        properties: { id: { type: 'string' } }
      },
      ModelB: {
        type: 'object',
        properties: { name: { type: 'string' } }
      },
      ModelC: {
        type: 'object',
        properties: { value: { type: 'number' } }
      },
      ComplexModel: {
        type: 'object',
        properties: {
          // Multiple references to ModelA
          firstA: { $ref: '#/components/schemas/ModelA' },
          secondA: { $ref: '#/components/schemas/ModelA' },
          listOfA: {
            type: 'array',
            items: { $ref: '#/components/schemas/ModelA' }
          },

          // Multiple references to ModelB
          firstB: { $ref: '#/components/schemas/ModelB' },
          nullableB: {
            oneOf: [
              { $ref: '#/components/schemas/ModelB' },
              { type: null }
            ]
          },

          // Single reference to ModelC
          onlyC: { $ref: '#/components/schemas/ModelC' }
        },
        required: ['firstA', 'firstB', 'listOfA']
      }
    });

    const refResolver = new ReferenceResolver(spec);
    modelGenerator.setReferenceResolver(refResolver);

    const result = modelGenerator.generateModel(
      'ComplexModel',
      spec.components!.schemas!.ComplexModel as OpenAPIV3.SchemaObject
    );

    // Each model should be imported exactly once
    expect(countImportOccurrences(result.content, 'ModelA')).toBe(1);
    expect(countImportOccurrences(result.content, 'ModelB')).toBe(1);
    expect(countImportOccurrences(result.content, 'ModelC')).toBe(1);

    // Total import lines should be 3 (excluding freezed imports)
    const importLines = result.content
      .split('\n')
      .filter(line => line.startsWith('import') && line.includes('.f.dart'));
    expect(importLines.length).toBe(3);
  });

  it('should not generate imports for primitive types', () => {
    const spec = createSpec({
      PrimitiveModel: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          age: { type: 'integer' },
          score: { type: 'number' },
          isActive: { type: 'boolean' },
          tags: {
            type: 'array',
            items: { type: 'string' }
          },
          metadata: {
            type: 'object',
            additionalProperties: { type: 'string' }
          },
          timestamp: {
            type: 'string',
            format: 'date-time'
          },
          binary: {
            type: 'string',
            format: 'binary'
          }
        },
        required: ['name', 'age']
      }
    });

    const refResolver = new ReferenceResolver(spec);
    modelGenerator.setReferenceResolver(refResolver);

    const result = modelGenerator.generateModel(
      'PrimitiveModel',
      spec.components!.schemas!.PrimitiveModel as OpenAPIV3.SchemaObject
    );

    // Should not have any .f.dart imports (only dart: imports for Uint8List)
    const modelImports = result.content
      .split('\n')
      .filter(line => line.startsWith('import') && line.includes('.f.dart'));
    expect(modelImports.length).toBe(0);

    // Should have dart:typed_data for Uint8List
    expect(result.content).toContain("import 'dart:typed_data';");
  });

  it('should handle deeply nested references without duplication', () => {
    const spec = createSpec({
      Address: {
        type: 'object',
        properties: {
          street: { type: 'string' },
          city: { type: 'string' }
        }
      },
      Person: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          address: { $ref: '#/components/schemas/Address' }
        }
      },
      Company: {
        type: 'object',
        properties: {
          // Nested references through Person which references Address
          ceo: { $ref: '#/components/schemas/Person' },
          employees: {
            type: 'array',
            items: { $ref: '#/components/schemas/Person' }
          },
          // Direct reference to Address
          headquarters: { $ref: '#/components/schemas/Address' },
          branches: {
            type: 'array',
            items: { $ref: '#/components/schemas/Address' }
          }
        }
      }
    });

    const refResolver = new ReferenceResolver(spec);
    modelGenerator.setReferenceResolver(refResolver);

    const result = modelGenerator.generateModel(
      'Company',
      spec.components!.schemas!.Company as OpenAPIV3.SchemaObject
    );

    // Should import each referenced model exactly once
    expect(countImportOccurrences(result.content, 'Person')).toBe(1);
    expect(countImportOccurrences(result.content, 'Address')).toBe(1);

    // Note: Person's reference to Address is handled in Person's own file,
    // not in Company's imports
  });
});