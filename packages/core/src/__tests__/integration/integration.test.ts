import { describe, it, expect } from 'vitest';
import { generateDartCode } from '../../generators';
import * as path from 'path';
import * as fs from 'fs-extra';

describe('Integration Test', () => {
  const petstorePath = path.join(__dirname, 'fixtures', 'petstore.yaml');
  const outputDir = path.join(__dirname, 'output');

  it('should generate complete Dart API client from petstore.yaml', async () => {
    const options = {
      input: petstorePath,
      output: {
        target: outputDir,
        mode: 'split' as const,
        client: 'dio' as const,
        override: {
          generator: {
            freezed: true,
            jsonSerializable: true,
            nullSafety: true
          }
        }
      }
    };

    const files = await generateDartCode(options);
    
    // Check that files were generated
    expect(files).toBeDefined();
    expect(files.length).toBeGreaterThan(0);
    
    // Check for essential files
    const filePaths = files.map(f => f.path);
    
    // Should have API client
    expect(filePaths).toContain('api_client.dart');
    
    // Should have models
    const modelFiles = files.filter(f => f.path.startsWith('models/'));
    expect(modelFiles.length).toBeGreaterThan(0);
    
    // Should have Pet model (with .f.dart extension for Freezed)
    const petModel = files.find(f => f.path === 'models/pet.f.dart');
    expect(petModel).toBeDefined();
    if (petModel) {
      expect(petModel.content).toContain('@freezed');
      expect(petModel.content).toContain('class Pet');
      expect(petModel.content).toContain('factory Pet.fromJson');
    }
    
    // Should have services
    const serviceFiles = files.filter(f => f.path.startsWith('services/'));
    expect(serviceFiles.length).toBeGreaterThan(0);
    
    // Check service content
    const service = serviceFiles.find(f => f.path.includes('service.dart'));
    if (service) {
      expect(service.content).toContain('class');
      expect(service.content).toContain('Service');
      expect(service.content).toContain('Future<');
      expect(service.content).toContain('dio.');
    }
    
    // Check API client content
    const apiClient = files.find(f => f.path === 'api_client.dart');
    if (apiClient) {
      expect(apiClient.content).toContain('import \'package:dio/dio.dart\';');
      expect(apiClient.content).toContain('class ApiClient');
      expect(apiClient.content).toContain('late final Dio dio;');
    }
    
    // Clean up output directory
    await fs.remove(outputDir);
  });

  it('should generate valid Dart method signatures', async () => {
    const options = {
      input: petstorePath,
      output: {
        target: outputDir,
        mode: 'split' as const,
        client: 'dio' as const
      }
    };

    const files = await generateDartCode(options);
    
    // Find a service file
    const serviceFile = files.find(f => f.path.includes('service.dart'));
    
    if (serviceFile) {
      const content = serviceFile.content;
      
      // Check for GET method
      expect(content).toMatch(/Future<.*?> \w+\(/);
      
      // Check for proper async/await usage
      expect(content).toContain('async {');
      expect(content).toContain('await client.');
      
      // Check for error handling
      expect(content).toContain('try {');
      expect(content).toContain('} on DioException');
      
      // Check for query parameters handling
      if (content.includes('queryParameters')) {
        // Query parameters should be defined as a Map
        const hasQueryParams = content.includes('queryParameters = <String, dynamic>{') ||
                              content.includes('queryParameters: queryParameters');
        expect(hasQueryParams).toBe(true);
      }
      
      // Check for path parameters  
      // Look for either curly braces in path OR replaceAll syntax
      const hasPathParams = content.includes("replaceAll('{") || 
                           (content.includes("path = '") && content.includes("{"));
      
      if (hasPathParams) {
        // If there are path params, should have replaceAll
        expect(content).toContain("replaceAll('{");
      }
    }
    
    // Clean up
    await fs.remove(outputDir);
  });

  it('should handle different HTTP methods correctly', async () => {
    const options = {
      input: petstorePath,
      output: {
        target: outputDir,
        mode: 'split' as const,
        client: 'dio' as const
      }
    };

    const files = await generateDartCode(options);
    const serviceFiles = files.filter(f => f.path.includes('service.dart'));
    
    // Combine all service content
    const allServiceContent = serviceFiles.map(f => f.content).join('\n');
    
    // Check for different HTTP methods
    const httpMethods = ['client.get', 'client.post', 'client.put', 'client.delete'];
    const foundMethods = httpMethods.filter(method => 
      allServiceContent.includes(method)
    );
    
    // Should have at least GET and POST
    expect(foundMethods).toContain('client.get');
    // POST might be in the petstore spec
    if (allServiceContent.includes('create')) {
      expect(foundMethods).toContain('client.post');
    }
    
    // Clean up
    await fs.remove(outputDir);
  });
});