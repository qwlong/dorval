import { describe, it, expect } from 'vitest';
import { generateModels } from '../generators/models';
import { OpenAPIObject } from '../types';

describe('Inline Object Properties Generation', () => {
  it('should generate nested class for inline object property', async () => {
    const spec: OpenAPIObject = {
      openapi: '3.0.0',
      info: { title: 'Test', version: '1.0.0' },
      paths: {},
      components: {
        schemas: {
          MyFeedResponseDto: {
            type: 'object',
            properties: {
              data: {
                type: 'array',
                items: { $ref: '#/components/schemas/MyFeedItem' }
              },
              meta: {
                type: 'object',
                properties: {
                  nextCursor: {
                    oneOf: [
                      { type: 'string' },
                      { type: 'null' }
                    ]
                  }
                }
              }
            },
            required: ['data', 'meta']
          },
          MyFeedItem: {
            type: 'object',
            properties: {
              id: { type: 'string' }
            }
          }
        }
      }
    };

    const files = await generateModels(spec, {});
    
    // Should generate MyFeedResponseDto
    const myFeedResponseDto = files.find(f => f.path === 'models/my_feed_response_dto.f.dart');
    expect(myFeedResponseDto).toBeDefined();
    
    // Should generate MyFeedResponseDtoMeta as a separate class
    const myFeedResponseDtoMeta = files.find(f => f.path === 'models/my_feed_response_dto_meta.f.dart');
    expect(myFeedResponseDtoMeta).toBeDefined();
    
    // Check MyFeedResponseDtoMeta content
    if (myFeedResponseDtoMeta) {
      const content = myFeedResponseDtoMeta.content;
      expect(content).toContain('class MyFeedResponseDtoMeta');
      expect(content).toContain('String? nextCursor');
    }
    
    // Check MyFeedResponseDto uses the nested type
    if (myFeedResponseDto) {
      const content = myFeedResponseDto.content;
      expect(content).toContain("import 'my_feed_response_dto_meta.f.dart';");
      expect(content).toContain('required MyFeedResponseDtoMeta meta');
      expect(content).not.toContain('Map<String, dynamic> meta');
    }
  });

  it('should handle deeply nested inline objects', async () => {
    const spec: OpenAPIObject = {
      openapi: '3.0.0',
      info: { title: 'Test', version: '1.0.0' },
      paths: {},
      components: {
        schemas: {
          UserProfile: {
            type: 'object',
            properties: {
              name: { type: 'string' },
              settings: {
                type: 'object',
                properties: {
                  theme: { type: 'string' },
                  notifications: {
                    type: 'object',
                    properties: {
                      email: { type: 'boolean' },
                      push: { type: 'boolean' }
                    },
                    required: ['email', 'push']
                  }
                },
                required: ['theme', 'notifications']
              }
            },
            required: ['name', 'settings']
          }
        }
      }
    };

    const files = await generateModels(spec, {});
    
    // Should generate UserProfile
    const userProfile = files.find(f => f.path === 'models/user_profile.f.dart');
    expect(userProfile).toBeDefined();
    
    // Should generate UserProfileSettings
    const userProfileSettings = files.find(f => f.path === 'models/user_profile_settings.f.dart');
    expect(userProfileSettings).toBeDefined();
    
    // Should generate UserProfileSettingsNotifications
    const userProfileSettingsNotifications = files.find(f => f.path === 'models/user_profile_settings_notifications.f.dart');
    expect(userProfileSettingsNotifications).toBeDefined();
    
    // Check UserProfile uses nested type
    if (userProfile) {
      const content = userProfile.content;
      expect(content).toContain("import 'user_profile_settings.f.dart';");
      expect(content).toContain('required UserProfileSettings settings');
    }
    
    // Check UserProfileSettings uses nested type
    if (userProfileSettings) {
      const content = userProfileSettings.content;
      expect(content).toContain("import 'user_profile_settings_notifications.f.dart';");
      expect(content).toContain('required UserProfileSettingsNotifications notifications');
      expect(content).toContain('required String theme');
    }
    
    // Check UserProfileSettingsNotifications content
    if (userProfileSettingsNotifications) {
      const content = userProfileSettingsNotifications.content;
      expect(content).toContain('required bool email');
      expect(content).toContain('required bool push');
    }
  });

  it('should not create nested class for objects with $ref', async () => {
    const spec: OpenAPIObject = {
      openapi: '3.0.0',
      info: { title: 'Test', version: '1.0.0' },
      paths: {},
      components: {
        schemas: {
          ResponseWithRef: {
            type: 'object',
            properties: {
              data: { type: 'string' },
              meta: { $ref: '#/components/schemas/MetaData' }
            },
            required: ['data', 'meta']
          },
          MetaData: {
            type: 'object',
            properties: {
              version: { type: 'string' }
            }
          }
        }
      }
    };

    const files = await generateModels(spec, {});
    
    // Should NOT generate ResponseWithRefMeta
    const responseWithRefMeta = files.find(f => f.path === 'models/response_with_ref_meta.f.dart');
    expect(responseWithRefMeta).toBeUndefined();
    
    // Should use the referenced MetaData type
    const responseWithRef = files.find(f => f.path === 'models/response_with_ref.f.dart');
    if (responseWithRef) {
      const content = responseWithRef.content;
      expect(content).toContain("import 'meta_data.f.dart';");
      expect(content).toContain('required MetaData meta');
    }
  });

  it('should handle inline objects without properties as Map<String, dynamic>', async () => {
    const spec: OpenAPIObject = {
      openapi: '3.0.0',
      info: { title: 'Test', version: '1.0.0' },
      paths: {},
      components: {
        schemas: {
          ResponseWithEmptyObject: {
            type: 'object',
            properties: {
              data: { type: 'string' },
              meta: { type: 'object' }  // No properties defined
            },
            required: ['data', 'meta']
          }
        }
      }
    };

    const files = await generateModels(spec, {});
    
    // Should NOT generate a nested class for empty object
    const responseWithEmptyObjectMeta = files.find(f => f.path === 'models/response_with_empty_object_meta.f.dart');
    expect(responseWithEmptyObjectMeta).toBeUndefined();
    
    // Should use Map<String, dynamic> for empty object
    const responseWithEmptyObject = files.find(f => f.path === 'models/response_with_empty_object.f.dart');
    if (responseWithEmptyObject) {
      const content = responseWithEmptyObject.content;
      expect(content).toContain('required Map<String, dynamic> meta');
    }
  });
});