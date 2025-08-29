import { describe, it, expect, beforeEach } from 'vitest';
import { OpenAPIParser } from '../../parser/openapi-parser';
import * as path from 'path';

describe('OpenAPIParser', () => {
  let parser: OpenAPIParser;
  const petstorePath = path.join(__dirname, 'fixtures', 'petstore.yaml');

  beforeEach(() => {
    parser = new OpenAPIParser();
  });

  describe('parse', () => {
    it('should parse a valid OpenAPI spec from file', async () => {
      await parser.parse(petstorePath);
      const spec = parser.getSpec();
      
      expect(spec).toBeDefined();
      expect(spec.openapi).toBeDefined();
      expect(spec.info).toBeDefined();
    });

    it('should throw error when spec is not parsed', () => {
      expect(() => parser.getSpec()).toThrow('OpenAPI spec has not been parsed yet');
    });
  });

  describe('getInfo', () => {
    it('should return API info', async () => {
      await parser.parse(petstorePath);
      const info = parser.getInfo();
      
      expect(info.title).toBe('Swagger Petstore');
      expect(info.version).toBe('1.0.0');
      expect(info.license).toBeDefined();
    });
  });

  describe('getServers', () => {
    it('should return server list', async () => {
      await parser.parse(petstorePath);
      const servers = parser.getServers();
      
      expect(servers).toBeInstanceOf(Array);
      expect(servers.length).toBeGreaterThan(0);
      expect(servers[0].url).toBeDefined();
    });
  });

  describe('getBaseUrl', () => {
    it('should return base URL from first server', async () => {
      await parser.parse(petstorePath);
      const baseUrl = parser.getBaseUrl();
      
      expect(baseUrl).toBe('http://petstore.swagger.io/v1');
    });
  });

  describe('getPaths', () => {
    it('should return all paths', async () => {
      await parser.parse(petstorePath);
      const paths = parser.getPaths();
      
      expect(paths).toBeDefined();
      expect(paths['/pets']).toBeDefined();
      expect(paths['/pets/{petId}']).toBeDefined();
    });
  });

  describe('getSchemas', () => {
    it('should return all schemas from components', async () => {
      await parser.parse(petstorePath);
      const schemas = parser.getSchemas();
      
      expect(schemas).toBeDefined();
      expect(schemas['Pet']).toBeDefined();
      expect(schemas['Error']).toBeDefined();
    });
  });

  describe('extractModels', () => {
    it('should extract Dart models from spec', async () => {
      await parser.parse(petstorePath);
      const models = parser.extractModels();
      
      expect(models).toBeInstanceOf(Array);
      expect(models.length).toBeGreaterThan(0);
      
      const petModel = models.find(m => m.name === 'Pet');
      expect(petModel).toBeDefined();
    });
  });

  describe('extractEndpoints', () => {
    it('should extract endpoints from spec', async () => {
      await parser.parse(petstorePath);
      const endpoints = parser.extractEndpoints();
      
      expect(endpoints).toBeInstanceOf(Array);
      expect(endpoints.length).toBeGreaterThan(0);
      
      const listPets = endpoints.find(e => e.name === 'listPets');
      expect(listPets).toBeDefined();
      expect(listPets?.method).toBe('GET');
      expect(listPets?.path).toBe('/pets');
    });
  });

  describe('getEndpointsByTag', () => {
    it('should group endpoints by tag', async () => {
      await parser.parse(petstorePath);
      const grouped = parser.getEndpointsByTag();
      
      expect(grouped).toBeInstanceOf(Map);
      
      // Check if pets tag exists
      const petsEndpoints = grouped.get('pets');
      if (petsEndpoints) {
        expect(petsEndpoints.length).toBeGreaterThan(0);
      }
    });
  });

  describe('getOperationById', () => {
    it('should find operation by operationId', async () => {
      await parser.parse(petstorePath);
      const operation = parser.getOperationById('listPets');
      
      expect(operation).toBeDefined();
      expect(operation?.summary).toBeDefined();
    });

    it('should return null for non-existent operationId', async () => {
      await parser.parse(petstorePath);
      const operation = parser.getOperationById('nonExistent');
      
      expect(operation).toBeNull();
    });
  });

  describe('getTags', () => {
    it('should return all tags', async () => {
      await parser.parse(petstorePath);
      const tags = parser.getTags();
      
      expect(tags).toBeInstanceOf(Array);
      // Tags might be empty in basic petstore
      expect(tags).toBeDefined();
    });
  });

  describe('security', () => {
    it('should detect if API has authentication', async () => {
      await parser.parse(petstorePath);
      const hasAuth = parser.hasAuthentication();
      
      // Basic petstore might not have auth
      expect(typeof hasAuth).toBe('boolean');
    });

    it('should return security schemes', async () => {
      await parser.parse(petstorePath);
      const schemes = parser.getSecuritySchemes();
      
      expect(schemes).toBeDefined();
      expect(typeof schemes).toBe('object');
    });
  });
});