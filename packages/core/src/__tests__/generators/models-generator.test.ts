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
      expect(userModel?.content).toContain('abstract class User');
      expect(userModel?.content).toContain('required String id');
      expect(userModel?.content).toContain('required String email');
      expect(userModel?.content).toContain('String? name');
      expect(userModel?.content).toContain('int? age');
      expect(userModel?.content).toContain('bool? active');

      expect(productModel).toBeDefined();
      expect(productModel?.content).toContain('abstract class Product');
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
    it('should generate typedef for empty object schemas', async () => {
      const spec = {
        openapi: '3.0.0',
        info: { title: 'Test API', version: '1.0.0' },
        components: {
          schemas: {
            EmptyObject: {
              type: 'object'
            },
            EmptyObjectWithDescription: {
              type: 'object',
              description: 'An empty response object'
            },
            EmptyObjectWithAdditionalProperties: {
              type: 'object',
              additionalProperties: {}
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

      // Empty object should generate typedef
      const emptyModel = files.find(f => f.path === 'models/empty_object.f.dart');
      expect(emptyModel).toBeDefined();
      expect(emptyModel?.content).toContain('typedef EmptyObject = Map<String, dynamic>;');
      expect(emptyModel?.content).not.toContain('@freezed');
      expect(emptyModel?.content).not.toContain('abstract class');

      // Empty object with description should include description
      const emptyWithDesc = files.find(f => f.path === 'models/empty_object_with_description.f.dart');
      expect(emptyWithDesc).toBeDefined();
      expect(emptyWithDesc?.content).toContain('/// An empty response object');
      expect(emptyWithDesc?.content).toContain('typedef EmptyObjectWithDescription = Map<String, dynamic>;');

      // Empty object with additionalProperties should also generate typedef
      const emptyWithAdditional = files.find(f => f.path === 'models/empty_object_with_additional_properties.f.dart');
      expect(emptyWithAdditional).toBeDefined();
      expect(emptyWithAdditional?.content).toContain('typedef EmptyObjectWithAdditionalProperties = Map<String, dynamic>;');

      // Valid object should still generate Freezed model
      const validModel = files.find(f => f.path === 'models/valid_object.f.dart');
      expect(validModel).toBeDefined();
      expect(validModel?.content).toContain('@freezed');
      expect(validModel?.content).toContain('abstract class ValidObject');
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

  describe('List Type Import Generation', () => {
    it('should generate correct imports for non-nullable List types', async () => {
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
            Comment: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                text: { type: 'string' },
                createdAt: { type: 'string', format: 'date-time' }
              },
              required: ['id', 'text', 'createdAt']
            },
            Article: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                title: { type: 'string' },
                tags: {
                  type: 'array',
                  items: { $ref: '#/components/schemas/Tag' }
                },
                comments: {
                  type: 'array',
                  items: { $ref: '#/components/schemas/Comment' }
                }
              },
              required: ['id', 'title', 'tags', 'comments']
            }
          }
        },
        paths: {}
      };

      const files = await generateModels(spec as any, {
        input: spec as any,
        output: { target: './test', mode: 'split', client: 'dio' }
      });

      const article = files.find(f => f.path === 'models/article.f.dart');
      expect(article).toBeDefined();

      // Should import the actual model files, not list_ prefixed files
      expect(article?.content).toContain("import 'tag.f.dart';");
      expect(article?.content).toContain("import 'comment.f.dart';");

      // Should NOT have list_ prefix imports
      expect(article?.content).not.toContain("import 'list_tag.f.dart';");
      expect(article?.content).not.toContain("import 'list_comment.f.dart';");

      // Should have correct non-nullable List types
      expect(article?.content).toContain('required List<Tag> tags');
      expect(article?.content).toContain('required List<Comment> comments');
    });

    it('should generate correct imports for nullable List types with oneOf', async () => {
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
              required: ['street', 'city', 'country']
            },
            PhoneNumber: {
              type: 'object',
              properties: {
                type: { type: 'string', enum: ['home', 'work', 'mobile'] },
                number: { type: 'string' }
              },
              required: ['type', 'number']
            },
            Person: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                name: { type: 'string' },
                addresses: {
                  oneOf: [
                    {
                      type: 'array',
                      items: { $ref: '#/components/schemas/Address' }
                    },
                    { type: 'null' }
                  ]
                },
                phoneNumbers: {
                  oneOf: [
                    {
                      type: 'array',
                      items: { $ref: '#/components/schemas/PhoneNumber' }
                    },
                    { type: 'null' }
                  ]
                }
              },
              required: ['id', 'name', 'addresses', 'phoneNumbers']
            }
          }
        },
        paths: {}
      };

      const files = await generateModels(spec as any, {
        input: spec as any,
        output: { target: './test', mode: 'split', client: 'dio' }
      });

      const person = files.find(f => f.path === 'models/person.f.dart');
      expect(person).toBeDefined();

      // Should import the actual model files, not list_ prefixed files
      expect(person?.content).toContain("import 'address.f.dart';");
      expect(person?.content).toContain("import 'phone_number.f.dart';");

      // Should NOT have list_ prefix imports
      expect(person?.content).not.toContain("import 'list_address.f.dart';");
      expect(person?.content).not.toContain("import 'list_phone_number.f.dart';");

      // Should have correct nullable List types
      expect(person?.content).toContain('required List<Address>? addresses');
      expect(person?.content).toContain('required List<PhoneNumber>? phoneNumbers');
    });

    it('should handle mixed nullable and non-nullable List types', async () => {
      const spec = {
        openapi: '3.0.0',
        info: { title: 'Test API', version: '1.0.0' },
        components: {
          schemas: {
            Product: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                name: { type: 'string' },
                price: { type: 'number' }
              },
              required: ['id', 'name', 'price']
            },
            ShoppingCart: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                items: {
                  type: 'array',
                  items: { $ref: '#/components/schemas/Product' }
                },
                savedItems: {
                  oneOf: [
                    {
                      type: 'array',
                      items: { $ref: '#/components/schemas/Product' }
                    },
                    { type: 'null' }
                  ]
                },
                recentlyViewed: {
                  type: 'array',
                  items: { $ref: '#/components/schemas/Product' }
                }
              },
              required: ['id', 'items', 'savedItems']
            }
          }
        },
        paths: {}
      };

      const files = await generateModels(spec as any, {
        input: spec as any,
        output: { target: './test', mode: 'split', client: 'dio' }
      });

      const cart = files.find(f => f.path === 'models/shopping_cart.f.dart');
      expect(cart).toBeDefined();

      // Should only import product.f.dart once
      const importMatches = (cart?.content || '').match(/import 'product\.f\.dart';/g);
      expect(importMatches?.length).toBe(1);

      // Should NOT have list_ prefix import
      expect(cart?.content).not.toContain("import 'list_product.f.dart';");

      // Should have correct types
      expect(cart?.content).toContain('required List<Product> items');
      expect(cart?.content).toContain('required List<Product>? savedItems');
      expect(cart?.content).toContain('List<Product>? recentlyViewed');
    });
  });

  describe('Freezed v3 Compatibility', () => {
    it('should generate abstract class for regular models (Freezed v3)', async () => {
      const spec = {
        openapi: '3.0.0',
        info: { title: 'Test API', version: '1.0.0' },
        components: {
          schemas: {
            TestModel: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                name: { type: 'string' }
              },
              required: ['id']
            }
          }
        },
        paths: {}
      };

      const files = await generateModels(spec as any, {
        input: spec as any,
        output: { target: './test', mode: 'split', client: 'dio' }
      });

      const testModel = files.find(f => f.path === 'models/test_model.f.dart');

      expect(testModel).toBeDefined();
      // Freezed v3 requires abstract class for regular models
      expect(testModel?.content).toContain('@freezed\nabstract class TestModel with _$TestModel');
      expect(testModel?.content).not.toContain('@freezed\nclass TestModel'); // Should NOT be plain class
    });

    it('should generate sealed class for discriminated unions (Freezed v3)', async () => {
      const spec = {
        openapi: '3.0.0',
        info: { title: 'Test API', version: '1.0.0' },
        components: {
          schemas: {
            PaymentMethod: {
              oneOf: [
                {
                  type: 'object',
                  required: ['type', 'cardNumber'],
                  properties: {
                    type: { type: 'string', enum: ['credit_card'] },
                    cardNumber: { type: 'string' }
                  }
                },
                {
                  type: 'object',
                  required: ['type', 'bankAccount'],
                  properties: {
                    type: { type: 'string', enum: ['bank_transfer'] },
                    bankAccount: { type: 'string' }
                  }
                }
              ],
              discriminator: {
                propertyName: 'type'
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

      const paymentModel = files.find(f => f.path === 'models/payment_method.f.dart');

      expect(paymentModel).toBeDefined();
      // Freezed v3 uses sealed class for pattern matching support with unionKey annotation
      expect(paymentModel?.content).toContain("@Freezed(unionKey: 'type')");
      expect(paymentModel?.content).toContain('sealed class PaymentMethod with _$PaymentMethod');
      expect(paymentModel?.content).not.toContain('@freezed\nclass PaymentMethod'); // Should NOT be plain class
      expect(paymentModel?.content).not.toContain('@freezed\nabstract class PaymentMethod'); // Should NOT be abstract class
    });
  });
});