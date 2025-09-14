/**
 * Tests for models generation
 */

import { describe, it, expect } from 'vitest';
import { generateModels } from '../../generators/models';

describe('Models Generator', () => {
  describe('Model Generation from OpenAPI Schema', () => {
    it('should generate models from components/schemas', async () => {
      const spec = {
        openapi: '3.0.0',
        info: { title: 'Test API', version: '1.0.0' },
        components: {
          schemas: {
            User: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                email: { type: 'string', format: 'email' },
                name: { type: 'string' },
                age: { type: 'integer' },
                active: { type: 'boolean' }
              },
              required: ['id', 'email']
            },
            Product: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                title: { type: 'string' },
                price: { type: 'number', format: 'double' },
                inStock: { type: 'boolean' }
              },
              required: ['id', 'title', 'price']
            }
          }
        },
        paths: {}
      };

      const files = await generateModels(spec as any, {
        input: spec as any,
        output: { target: './test', mode: 'split', client: 'dio' }
      });

      const userModel = files.find(f => f.path === 'models/user.f.dart');
      const productModel = files.find(f => f.path === 'models/product.f.dart');
      
      expect(userModel).toBeDefined();
      expect(userModel?.content).toContain('class User');
      expect(userModel?.content).toContain('required String id');
      expect(userModel?.content).toContain('required String email');
      expect(userModel?.content).toContain('String? name');
      expect(userModel?.content).toContain('int? age');
      expect(userModel?.content).toContain('bool? active');
      
      expect(productModel).toBeDefined();
      expect(productModel?.content).toContain('class Product');
      expect(productModel?.content).toContain('required String id');
      expect(productModel?.content).toContain('required String title');
      expect(productModel?.content).toContain('required double price');
      expect(productModel?.content).toContain('bool? inStock');
    });

    it('should generate enum models', async () => {
      const spec = {
        openapi: '3.0.0',
        info: { title: 'Test API', version: '1.0.0' },
        components: {
          schemas: {
            Status: {
              type: 'string',
              enum: ['pending', 'active', 'inactive', 'archived']
            },
            Priority: {
              type: 'string',
              enum: ['low', 'medium', 'high', 'critical'],
              description: 'Priority level'
            }
          }
        },
        paths: {}
      };

      const files = await generateModels(spec as any, {
        input: spec as any,
        output: { target: './test', mode: 'split', client: 'dio' }
      });

      const statusEnum = files.find(f => f.path === 'models/status.f.dart');
      const priorityEnum = files.find(f => f.path === 'models/priority.f.dart');
      
      expect(statusEnum).toBeDefined();
      expect(statusEnum?.content).toContain('enum Status');
      expect(statusEnum?.content).toContain('pending');
      expect(statusEnum?.content).toContain('active');
      expect(statusEnum?.content).toContain('inactive');
      expect(statusEnum?.content).toContain('archived');
      
      expect(priorityEnum).toBeDefined();
      expect(priorityEnum?.content).toContain('enum Priority');
      expect(priorityEnum?.content).toContain('/// Priority level');
    });

    it('should handle nested object properties', async () => {
      const spec = {
        openapi: '3.0.0',
        info: { title: 'Test API', version: '1.0.0' },
        components: {
          schemas: {
            Address: {
              type: 'object',
              properties: {
                street: { type: 'string' },
                city: { type: 'string' },
                country: { type: 'string' }
              },
              required: ['city', 'country']
            },
            Company: {
              type: 'object',
              properties: {
                name: { type: 'string' },
                address: { '$ref': '#/components/schemas/Address' },
                employees: { type: 'integer' }
              },
              required: ['name']
            }
          }
        },
        paths: {}
      };

      const files = await generateModels(spec as any, {
        input: spec as any,
        output: { target: './test', mode: 'split', client: 'dio' }
      });

      const addressModel = files.find(f => f.path === 'models/address.f.dart');
      const companyModel = files.find(f => f.path === 'models/company.f.dart');
      
      expect(addressModel).toBeDefined();
      expect(addressModel?.content).toContain('String? street');
      expect(addressModel?.content).toContain('required String city');
      expect(addressModel?.content).toContain('required String country');
      
      expect(companyModel).toBeDefined();
      expect(companyModel?.content).toContain('required String name');
      expect(companyModel?.content).toContain('Address? address');
      expect(companyModel?.content).toContain('int? employees');
      expect(companyModel?.content).toContain("import 'address.f.dart';");
    });

    it('should handle array properties', async () => {
      const spec = {
        openapi: '3.0.0',
        info: { title: 'Test API', version: '1.0.0' },
        components: {
          schemas: {
            Tag: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                name: { type: 'string' }
              },
              required: ['id', 'name']
            },
            Article: {
              type: 'object',
              properties: {
                title: { type: 'string' },
                tags: {
                  type: 'array',
                  items: { '$ref': '#/components/schemas/Tag' }
                },
                keywords: {
                  type: 'array',
                  items: { type: 'string' }
                }
              },
              required: ['title']
            }
          }
        },
        paths: {}
      };

      const files = await generateModels(spec as any, {
        input: spec as any,
        output: { target: './test', mode: 'split', client: 'dio' }
      });

      const articleModel = files.find(f => f.path === 'models/article.f.dart');
      
      expect(articleModel).toBeDefined();
      expect(articleModel?.content).toContain('required String title');
      expect(articleModel?.content).toContain('List<Tag>? tags');
      expect(articleModel?.content).toContain('List<String>? keywords');
      expect(articleModel?.content).toContain("import 'tag.f.dart';");
    });

    it('should handle allOf schema composition', async () => {
      const spec = {
        openapi: '3.0.0',
        info: { title: 'Test API', version: '1.0.0' },
        components: {
          schemas: {
            BaseEntity: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                createdAt: { type: 'string', format: 'date-time' }
              },
              required: ['id', 'createdAt']
            },
            User: {
              allOf: [
                { '$ref': '#/components/schemas/BaseEntity' },
                {
                  type: 'object',
                  properties: {
                    email: { type: 'string' },
                    name: { type: 'string' }
                  },
                  required: ['email']
                }
              ]
            }
          }
        },
        paths: {}
      };

      const files = await generateModels(spec as any, {
        input: spec as any,
        output: { target: './test', mode: 'split', client: 'dio' }
      });

      const userModel = files.find(f => f.path === 'models/user.f.dart');
      
      expect(userModel).toBeDefined();
      // Should include properties from both schemas
      expect(userModel?.content).toContain('required String id');
      expect(userModel?.content).toContain('required DateTime createdAt');
      expect(userModel?.content).toContain('required String email');
      expect(userModel?.content).toContain('String? name');
    });
  });

  describe('Index File Generation', () => {
    it('should generate index.dart with all model exports', async () => {
      const spec = {
        openapi: '3.0.0',
        info: { title: 'Test API', version: '1.0.0' },
        components: {
          schemas: {
            User: {
              type: 'object',
              properties: { id: { type: 'string' } }
            },
            Product: {
              type: 'object',
              properties: { id: { type: 'string' } }
            },
            Status: {
              type: 'string',
              enum: ['active', 'inactive']
            }
          }
        },
        paths: {}
      };

      const files = await generateModels(spec as any, {
        input: spec as any,
        output: { target: './test', mode: 'split', client: 'dio' }
      });

      const indexFile = files.find(f => f.path === 'models/index.dart');
      
      expect(indexFile).toBeDefined();
      expect(indexFile?.content).toContain("export 'user.f.dart';");
      expect(indexFile?.content).toContain("export 'product.f.dart';");
      expect(indexFile?.content).toContain("export 'status.f.dart';");
      // Params and headers are now only added by generateDartCode after services are generated
      expect(indexFile?.content).not.toContain("export 'params/index.dart';");
      expect(indexFile?.content).not.toContain("export 'headers/index.dart';");
    });
  });

  describe('Edge Cases', () => {
    it('should skip empty schemas', async () => {
      const spec = {
        openapi: '3.0.0',
        info: { title: 'Test API', version: '1.0.0' },
        components: {
          schemas: {
            EmptyObject: {
              type: 'object'
            },
            ValidObject: {
              type: 'object',
              properties: {
                id: { type: 'string' }
              }
            }
          }
        },
        paths: {}
      };

      const files = await generateModels(spec as any, {
        input: spec as any,
        output: { target: './test', mode: 'split', client: 'dio' }
      });

      const emptyModel = files.find(f => f.path === 'models/empty_object.f.dart');
      const validModel = files.find(f => f.path === 'models/valid_object.f.dart');
      
      expect(emptyModel).toBeUndefined();
      expect(validModel).toBeDefined();
    });

    it('should handle schemas with no components', async () => {
      const spec = {
        openapi: '3.0.0',
        info: { title: 'Test API', version: '1.0.0' },
        paths: {}
      };

      const files = await generateModels(spec as any, {
        input: spec as any,
        output: { target: './test', mode: 'split', client: 'dio' }
      });

      const indexFile = files.find(f => f.path === 'models/index.dart');
      
      expect(indexFile).toBeDefined();
      expect(files.length).toBe(1); // Only index file
    });
  });
});