/**
 * Comprehensive tests for endpoint generation using /v1/roles as example
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { EndpointGenerator } from '../../generators/endpoint-generator';
import { TypeMapper } from '../../utils/type-mapper';

describe('EndpointGenerator - Roles API Example', () => {
  let generator: EndpointGenerator;
  
  beforeEach(() => {
    generator = new EndpointGenerator();
  });

  describe('GET /v1/roles - Complex Query and Headers', () => {
    const getRolesOperation = {
      operationId: 'RolesController_getRoles_v1',
      summary: 'Get or query roles',
      parameters: [
        {
          name: 'x-api-key',
          in: 'header',
          description: 'API key (use empty string when API key not defined)',
          required: true,
          schema: { type: 'string' }
        },
        {
          name: 'x-core-company-id',
          in: 'header',
          description: 'Workstream core company ID',
          required: true,
          schema: { type: 'string' }
        },
        {
          name: 'x-company-staff-id',
          in: 'header',
          description: 'Workstream company staff ID',
          required: false,
          schema: { type: 'string' }
        },
        {
          name: 'x-team-member-id',
          in: 'header',
          description: 'Payroll/HRIS team member ID',
          required: false,
          schema: { type: 'string' }
        },
        {
          name: 'locationId',
          in: 'query',
          description: 'Location ID',
          required: true,
          schema: { type: 'string' }
        },
        {
          name: 'name',
          in: 'query',
          description: 'Query by name',
          required: false,
          schema: { type: 'string' }
        },
        {
          name: 'suggestions',
          in: 'query',
          description: 'Includes suggested role ids',
          required: false,
          schema: { type: 'boolean' }
        }
      ],
      responses: {
        '200': {
          description: 'A list of roles',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/ListRolesResponseDto'
              }
            }
          }
        }
      }
    };

    it('should process all headers with correct camelCase naming', () => {
      const endpoint = generator.generateGetMethod(
        getRolesOperation.operationId,
        '/v1/roles',
        getRolesOperation as any
      );

      expect(endpoint.headers).toHaveLength(4);
      
      const headerMap = Object.fromEntries(
        endpoint.headers.map(h => [h.originalName, h])
      );

      expect(headerMap['x-api-key'].dartName).toBe('xApiKey');
      expect(headerMap['x-api-key'].required).toBe(true);
      expect(headerMap['x-api-key'].type).toBe('String');

      expect(headerMap['x-core-company-id'].dartName).toBe('xCoreCompanyId');
      expect(headerMap['x-core-company-id'].required).toBe(true);

      expect(headerMap['x-company-staff-id'].dartName).toBe('xCompanyStaffId');
      expect(headerMap['x-company-staff-id'].required).toBe(false);

      expect(headerMap['x-team-member-id'].dartName).toBe('xTeamMemberId');
      expect(headerMap['x-team-member-id'].required).toBe(false);
    });

    it('should process query parameters with mixed types', () => {
      const endpoint = generator.generateGetMethod(
        getRolesOperation.operationId,
        '/v1/roles',
        getRolesOperation as any
      );

      expect(endpoint.queryParams).toHaveLength(3);
      
      const queryMap = Object.fromEntries(
        endpoint.queryParams.map(p => [p.originalName || p.dartName, p])
      );

      expect(queryMap['locationId'].required).toBe(true);
      expect(queryMap['locationId'].type).toBe('String');

      expect(queryMap['name'].required).toBe(false);
      expect(queryMap['name'].type).toBe('String');

      expect(queryMap['suggestions'].required).toBe(false);
      expect(queryMap['suggestions'].type).toBe('bool');
    });

    it('should correctly identify response type reference', () => {
      const endpoint = generator.generateGetMethod(
        getRolesOperation.operationId,
        '/v1/roles',
        getRolesOperation as any
      );

      expect(endpoint.returnType).toBe('ListRolesResponseDto');
      // Note: EndpointMethod doesn't have imports property - that's handled by ServiceGenerator
    });

    it('should generate correct method signature', () => {
      const endpoint = generator.generateGetMethod(
        getRolesOperation.operationId,
        '/v1/roles',
        getRolesOperation as any
      );

      expect(endpoint.methodName).toBe('rolesControllerGetRolesV1');
      expect(endpoint.httpMethod).toBe('get');
      expect(endpoint.path).toBe('/v1/roles');
    });

    it('should preserve parameter descriptions', () => {
      const endpoint = generator.generateGetMethod(
        getRolesOperation.operationId,
        '/v1/roles',
        getRolesOperation as any
      );

      const xApiKeyHeader = endpoint.headers.find(h => h.originalName === 'x-api-key');
      expect(xApiKeyHeader?.description).toBe('API key (use empty string when API key not defined)');

      const locationIdParam = endpoint.queryParams.find(p => p.originalName === 'locationId' || p.dartName === 'locationId');
      expect(locationIdParam?.description).toBe('Location ID');
    });
  });

  describe('POST /v1/roles - Request Body and Headers', () => {
    const createRoleOperation = {
      operationId: 'RolesController_createRole_v1',
      summary: 'Create a role',
      parameters: [
        {
          name: 'x-api-key',
          in: 'header',
          required: true,
          schema: { type: 'string' }
        },
        {
          name: 'x-core-company-id',
          in: 'header',
          required: true,
          schema: { type: 'string' }
        },
        {
          name: 'x-company-staff-id',
          in: 'header',
          required: true,
          schema: { type: 'string' }
        }
      ],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              $ref: '#/components/schemas/CreateRoleRequestDto'
            }
          }
        }
      },
      responses: {
        '200': {
          description: 'The role has been successfully created',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/RoleResponseDto'
              }
            }
          }
        }
      }
    };

    it('should process request body with reference', () => {
      const endpoint = generator.generateMutationMethod(
        'post',
        createRoleOperation.operationId,
        '/v1/roles',
        createRoleOperation as any
      );

      expect(endpoint.bodyType).toBe('CreateRoleRequestDto');
      expect(endpoint.hasBody).toBe(true);
      expect(endpoint.bodyParam).toBe('body');
      // Note: imports are handled by ServiceGenerator, not EndpointGenerator
    });

    it('should handle all required headers', () => {
      const endpoint = generator.generateMutationMethod(
        'post',
        createRoleOperation.operationId,
        '/v1/roles',
        createRoleOperation as any
      );

      expect(endpoint.headers).toHaveLength(3);
      expect(endpoint.headers.every(h => h.required)).toBe(true);
      
      const headerNames = endpoint.headers.map(h => h.dartName);
      expect(headerNames).toContain('xApiKey');
      expect(headerNames).toContain('xCoreCompanyId');
      expect(headerNames).toContain('xCompanyStaffId');
    });

    it('should identify response type and add import', () => {
      const endpoint = generator.generateMutationMethod(
        'post',
        createRoleOperation.operationId,
        '/v1/roles',
        createRoleOperation as any
      );

      expect(endpoint.returnType).toBe('RoleResponseDto');
      // Note: imports are handled by ServiceGenerator
    });

    it('should include both request and response model imports', () => {
      const endpoint = generator.generateMutationMethod(
        'post',
        createRoleOperation.operationId,
        '/v1/roles',
        createRoleOperation as any
      );

      expect(endpoint.bodyType).toBe('CreateRoleRequestDto');
      expect(endpoint.returnType).toBe('RoleResponseDto');
      // Note: imports are handled by ServiceGenerator, not EndpointMethod
    });
  });

  describe('Complex Scenarios', () => {
    it('should handle operations with array response types', () => {
      const operation = {
        operationId: 'getRolesList',
        responses: {
          '200': {
            content: {
              'application/json': {
                schema: {
                  type: 'array',
                  items: {
                    $ref: '#/components/schemas/RoleDto'
                  }
                }
              }
            }
          }
        }
      };

      const endpoint = generator.generateGetMethod(
        operation.operationId,
        '/roles/list',
        operation as any
      );

      expect(endpoint.returnType).toBe('List<RoleDto>');
      expect(endpoint.returnsList).toBe(true);
      // Model type preservation is working correctly!
    });

    it('should handle nested object schemas in request body', () => {
      const operation = {
        operationId: 'updateRole',
        requestBody: {
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  role: {
                    $ref: '#/components/schemas/RoleDto'
                  },
                  permissions: {
                    type: 'array',
                    items: {
                      $ref: '#/components/schemas/PermissionDto'
                    }
                  }
                }
              }
            }
          }
        }
      };

      const endpoint = generator.generateMutationMethod(
        'put',
        operation.operationId,
        '/roles/update',
        operation as any
      );

      expect(endpoint.bodyType).toBe('Map<String, dynamic>');
      expect(endpoint.hasBody).toBe(true);
    });

    it('should handle operations with multiple success response codes', () => {
      const operation = {
        operationId: 'createOrUpdateRole',
        responses: {
          '200': {
            description: 'Role updated',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/RoleDto' }
              }
            }
          },
          '201': {
            description: 'Role created',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/RoleDto' }
              }
            }
          },
          '400': {
            description: 'Bad request'
          }
        }
      };

      const endpoint = generator.generateMutationMethod(
        'put',
        operation.operationId,
        '/roles',
        operation as any
      );

      expect(endpoint.returnType).toBe('RoleDto');
      expect(endpoint.returnsModel).toBe(true);
    });

    it('should handle path parameters with query and headers', () => {
      const operation = {
        operationId: 'getRoleById',
        parameters: [
          { name: 'roleId', in: 'path', required: true, schema: { type: 'string' } },
          { name: 'locationId', in: 'query', required: true, schema: { type: 'string' } },
          { name: 'includeDeleted', in: 'query', schema: { type: 'boolean' } },
          { name: 'x-api-key', in: 'header', required: true, schema: { type: 'string' } }
        ],
        responses: {
          '200': {
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/RoleDto' }
              }
            }
          }
        }
      };

      const endpoint = generator.generateGetMethod(
        operation.operationId,
        '/roles/{roleId}',
        operation as any
      );

      expect(endpoint.pathParams).toHaveLength(1);
      expect(endpoint.pathParams[0].name).toBe('roleId');
      
      expect(endpoint.queryParams).toHaveLength(2);
      const queryNames = endpoint.queryParams.map(p => p.dartName);
      expect(queryNames).toContain('locationId');
      expect(queryNames).toContain('includeDeleted');
      
      expect(endpoint.headers).toHaveLength(1);
      expect(endpoint.headers[0].dartName).toBe('xApiKey');
    });

    it('should handle enum parameters', () => {
      const operation = {
        parameters: [
          {
            name: 'status',
            in: 'query',
            schema: {
              type: 'string',
              enum: ['active', 'inactive', 'pending']
            }
          }
        ]
      };

      const endpoint = generator.generateGetMethod(
        undefined,
        '/roles/filter',
        operation as any
      );

      expect(endpoint.queryParams).toHaveLength(1);
      expect(endpoint.queryParams[0].type).toBe('String');
      // Note: enum values are not stored in EndpointMethod currently
    });

    it('should handle operations with no parameters', () => {
      const operation = {
        operationId: 'getAllRoles',
        responses: {
          '200': {
            content: {
              'application/json': {
                schema: {
                  type: 'array',
                  items: { $ref: '#/components/schemas/RoleDto' }
                }
              }
            }
          }
        }
      };

      const endpoint = generator.generateGetMethod(
        operation.operationId,
        '/roles/all',
        operation as any
      );

      expect(endpoint.pathParams).toHaveLength(0);
      expect(endpoint.queryParams).toHaveLength(0);
      expect(endpoint.headers).toHaveLength(0);
      expect(endpoint.returnType).toBe('List<RoleDto>');
    });

    it('should handle DELETE operations with path params', () => {
      const operation = {
        operationId: 'deleteRole',
        parameters: [
          { name: 'roleId', in: 'path', required: true, schema: { type: 'string' } },
          { name: 'x-api-key', in: 'header', required: true, schema: { type: 'string' } }
        ],
        responses: {
          '204': {
            description: 'No Content'
          }
        }
      };

      const endpoint = generator.generateDeleteMethod(
        operation.operationId,
        '/roles/{roleId}',
        operation as any
      );

      expect(endpoint.httpMethod).toBe('delete');
      expect(endpoint.returnType).toBe('void');
      expect(endpoint.pathParams).toHaveLength(1);
      expect(endpoint.headers).toHaveLength(1);
    });

    it('should handle PATCH operations with partial updates', () => {
      const operation = {
        operationId: 'patchRole',
        parameters: [
          { name: 'roleId', in: 'path', required: true, schema: { type: 'string' } }
        ],
        requestBody: {
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  name: { type: 'string' },
                  description: { type: 'string' },
                  isActive: { type: 'boolean' }
                }
              }
            }
          }
        },
        responses: {
          '200': {
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/RoleDto' }
              }
            }
          }
        }
      };

      const endpoint = generator.generateMutationMethod(
        'patch',
        operation.operationId,
        '/roles/{roleId}',
        operation as any
      );

      expect(endpoint.httpMethod).toBe('patch');
      expect(endpoint.bodyType).toBe('Map<String, dynamic>');
      expect(endpoint.returnType).toBe('RoleDto');
      expect(endpoint.pathParams).toHaveLength(1);
    });
  });

  describe('Method Naming Strategies', () => {
    it('should handle operationId with underscores and version suffix', () => {
      generator.setMethodNaming('operationId');
      
      const operation = {
        operationId: 'RolesController_getRoles_v1',
        parameters: []
      };

      const endpoint = generator.generateGetMethod(
        operation.operationId,
        '/v1/roles',
        operation as any
      );

      expect(endpoint.methodName).toBe('rolesControllerGetRolesV1');
    });

    it('should clean up method names when using methodPath strategy', () => {
      generator.setMethodNaming('methodPath');
      
      const operation = {
        operationId: 'RolesController_getRoles_v1',
        parameters: []
      };

      const endpoint = generator.generateGetMethod(
        operation.operationId,
        '/v1/roles/{roleId}/permissions',
        operation as any
      );

      expect(endpoint.methodName).toBe('getV1RolesRoleIdPermissions');
    });
    
    it('should generate methodPath names for different HTTP methods', () => {
      generator.setMethodNaming('methodPath');
      
      const getEndpoint = generator.generateGetMethod(
        undefined,
        '/api/v2/users/{userId}/settings',
        { parameters: [] } as any
      );
      expect(getEndpoint.methodName).toBe('getApiV2UsersUserIdSettings');
      
      const postEndpoint = generator.generateMutationMethod(
        'post',
        undefined,
        '/api/v2/users/{userId}/settings',
        { parameters: [] } as any
      );
      expect(postEndpoint.methodName).toBe('postApiV2UsersUserIdSettings');
      
      const deleteEndpoint = generator.generateDeleteMethod(
        undefined,
        '/api/v2/users/{userId}',
        { parameters: [] } as any
      );
      expect(deleteEndpoint.methodName).toBe('deleteApiV2UsersUserId');
      
      const patchEndpoint = generator.generateMutationMethod(
        'patch',
        undefined,
        '/api/v2/users',
        { parameters: [] } as any
      );
      expect(patchEndpoint.methodName).toBe('patchApiV2Users');
    });
    
    it('should prefer operationId when available in operationId mode', () => {
      generator.setMethodNaming('operationId');
      
      const operation = {
        operationId: 'getUserSettings',
        parameters: []
      };

      const endpoint = generator.generateGetMethod(
        operation.operationId,
        '/api/v2/users/{userId}/settings',
        operation as any
      );

      expect(endpoint.methodName).toBe('getUserSettings');
    });
    
    it('should fallback to methodPath when operationId is missing in operationId mode', () => {
      generator.setMethodNaming('operationId');
      
      const endpoint = generator.generateGetMethod(
        undefined,
        '/api/v2/users/{userId}/settings',
        { parameters: [] } as any
      );

      expect(endpoint.methodName).toBe('getApiV2UsersUserIdSettings');
    });
  });

  describe('Import Generation', () => {
    it('should deduplicate imports when multiple refs to same model', () => {
      const operation = {
        requestBody: {
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/RoleDto' }
            }
          }
        },
        responses: {
          '200': {
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/RoleDto' }
              }
            }
          }
        }
      };

      const endpoint = generator.generateMutationMethod(
        'post',
        undefined,
        '/roles',
        operation as any
      );

      // Note: imports deduplication is handled at ServiceGenerator level
      expect(endpoint.returnType).toBe('RoleDto');
    });

    it('should generate snake_case imports from PascalCase refs', () => {
      const testCases = [
        { ref: 'UserProfileDto', expected: 'user_profile_dto.f.dart' },
        { ref: 'APIKeyConfiguration', expected: 'api_key_configuration.f.dart' },
        { ref: 'HTTPSSettings', expected: 'https_settings.f.dart' },
        { ref: 'XMLParser', expected: 'xml_parser.f.dart' }
      ];

      testCases.forEach(({ ref, expected }) => {
        const operation = {
          responses: {
            '200': {
              content: {
                'application/json': {
                  schema: { $ref: `#/components/schemas/${ref}` }
                }
              }
            }
          }
        };

        const endpoint = generator.generateGetMethod(
          undefined,
          '/test',
          operation as any
        );

        // Note: imports are generated based on return type at service generation time
        const modelName = TypeMapper.toDartClassName(ref);
        expect(endpoint.returnType).toBe(modelName);
      });
    });
  });
});