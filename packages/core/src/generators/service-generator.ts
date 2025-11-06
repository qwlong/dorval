/**
 * Generate Dart service classes
 */

import type { OpenAPIV3 } from 'openapi-types';
import { OpenAPIObject, DartGeneratorOptions, GeneratedFile, ClientGeneratorBuilder } from '../types';
import { EndpointGenerator, EndpointMethod } from './endpoint-generator';
import { TemplateManager } from '../templates/template-manager';
import { TypeMapper } from '../utils';
import { ParamsGenerator } from './params-generator';
import { HeadersGenerator } from './headers-generator';
import * as fsSync from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

// Get __dirname that works in both CJS and ESM
declare const __dirname: string | undefined;
let dirName: string;
if (typeof import.meta !== 'undefined' && import.meta.url) {
  // ESM
  const __filename = fileURLToPath(import.meta.url);
  dirName = path.dirname(__filename);
} else if (typeof __dirname !== 'undefined') {
  // CJS - __dirname is available
  dirName = __dirname;
} else {
  // Fallback - calculate from cwd
  dirName = path.join(process.cwd(), 'dorval/packages/core/dist');
}

export interface ServiceClass {
  serviceName: string;
  description?: string;
  methods: EndpointMethod[];
  imports: string[];
  hasApiException: boolean;
}

export class ServiceGenerator {
  private endpointGenerator: EndpointGenerator;
  private templateManager: TemplateManager;
  private paramsGenerator: ParamsGenerator;
  private headersGenerator: HeadersGenerator | null = null;
  private schemas: Record<string, any> = {};
  private originalSpec: OpenAPIObject | null = null;
  private options: DartGeneratorOptions | null = null;
  private clientBuilder: ClientGeneratorBuilder | null = null;

  constructor() {
    this.endpointGenerator = new EndpointGenerator();
    this.templateManager = new TemplateManager();
    this.paramsGenerator = new ParamsGenerator();
    
    // Register the service-method partial
    // Need to read the template content directly, not the compiled function
    let methodTemplatePath = path.join(dirName, 'templates', 'service-method.hbs');
    if (!fsSync.existsSync(methodTemplatePath)) {
      methodTemplatePath = path.join(dirName, '../templates/service-method.hbs');
    }
    if (!fsSync.existsSync(methodTemplatePath)) {
      methodTemplatePath = path.join(dirName, 'service-method.hbs');
    }
    
    // Final fallback - look in various possible locations
    if (!fsSync.existsSync(methodTemplatePath)) {
      const possiblePaths = [
        path.join(process.cwd(), 'packages/core/dist/templates/service-method.hbs'),
        path.join(process.cwd(), 'dorval/packages/core/dist/templates/service-method.hbs'),
        path.join(process.cwd(), 'dist/templates/service-method.hbs')
      ];
      
      for (const p of possiblePaths) {
        if (fsSync.existsSync(p)) {
          methodTemplatePath = p;
          break;
        }
      }
    }
    
    try {
      const methodTemplateContent = fsSync.readFileSync(methodTemplatePath, 'utf-8');
      this.templateManager.registerPartial('service-method', methodTemplateContent);
    } catch (error) {
      console.error(`Failed to load service-method template from ${methodTemplatePath}`);
      throw error;
    }
  }

  /**
   * Load the appropriate client builder based on configuration
   */
  private loadClientBuilder(options: DartGeneratorOptions): void {
    const clientType = options.output.client || 'dio';
    
    try {
      if (clientType === 'custom' || options.output.override?.mutator) {
        // Try to load custom client builder
        try {
          // eslint-disable-next-line @typescript-eslint/no-require-imports
          const customBuilder = require('@dorval/custom');
          this.clientBuilder = customBuilder.builder()();
        } catch {
          // Try relative path
          // eslint-disable-next-line @typescript-eslint/no-require-imports
          const customBuilder = require('../../custom/dist');
          this.clientBuilder = customBuilder.builder()();
        }
      } else if (clientType === 'dio') {
        // Try to load Dio client builder
        try {
          // eslint-disable-next-line @typescript-eslint/no-require-imports
          const dioBuilder = require('@dorval/dio');
          this.clientBuilder = dioBuilder.builder()();
        } catch {
          // Try relative path
          // eslint-disable-next-line @typescript-eslint/no-require-imports
          const dioBuilder = require('../../dio/dist');
          this.clientBuilder = dioBuilder.builder()();
        }
      } else {
        // Default to Dio
        try {
          // eslint-disable-next-line @typescript-eslint/no-require-imports
          const dioBuilder = require('@dorval/dio');
          this.clientBuilder = dioBuilder.builder()();
        } catch {
          // eslint-disable-next-line @typescript-eslint/no-require-imports
          const dioBuilder = require('../../dio/dist');
          this.clientBuilder = dioBuilder.builder()();
        }
      }
    } catch (error: any) {
      console.warn(`Failed to load ${clientType} client builder, falling back to default templates:`, error?.message || error);
      // Fall back to existing template-based approach
      this.clientBuilder = null;
    }
  }

  /**
   * Generate service classes from OpenAPI spec
   */
  async generateServices(
    spec: OpenAPIObject,
    options: DartGeneratorOptions
  ): Promise<GeneratedFile[]> {
    const files: GeneratedFile[] = [];
    const paramFiles: GeneratedFile[] = [];
    const headerFiles: GeneratedFile[] = [];
    
    // Store options
    this.options = options;
    
    // Load client builder based on configuration
    this.loadClientBuilder(options);
    
    // Initialize header generators based on configuration
    if (options.output.override?.headers && options.output.override.headers.definitions) {
      // New headers configuration with custom-matching
      this.headersGenerator = new HeadersGenerator(options.output.override.headers as any);
    } else if (options.output.override?.sharedHeaders) {
      // Legacy shared headers configuration - convert to new format
      const convertedDefinitions: { [className: string]: any } = {};
      for (const [className, fields] of Object.entries(options.output.override.sharedHeaders)) {
        convertedDefinitions[className] = {
          fields: fields,
          required: fields // All fields are required in legacy format
        };
      }
      const convertedConfig = {
        definitions: convertedDefinitions,
        customMatch: true,
        matchStrategy: 'exact' as const
      };
      this.headersGenerator = new HeadersGenerator(convertedConfig);
    }
    
    // Store the original spec - it should already have $refs preserved from parseOpenAPISpec
    this.originalSpec = spec;
    
    // Store schemas for reference resolution
    this.schemas = spec.components?.schemas || {};
    this.endpointGenerator.setSchemas(this.schemas);
    if (this.originalSpec) {
      this.endpointGenerator.setOriginalSpec(this.originalSpec);
    }
    
    // Set method naming strategy
    const methodNaming = options.output.override?.methodNaming || 'operationId';
    this.endpointGenerator.setMethodNaming(methodNaming);
    
    // Get endpoints grouped by tag
    const endpointsByTag = this.getEndpointsByTag();
    
    // Generate a service class for each tag
    for (const [tag, endpoints] of endpointsByTag.entries()) {
      const service = this.createServiceClass(tag, endpoints, paramFiles, headerFiles);
      const content = this.renderService(service);
      
      const fileName = TypeMapper.toSnakeCase(service.serviceName);
      files.push({
        path: `services/${fileName}.dart`,
        content
      });
    }
    
    // Add parameter model files to the main files list
    files.push(...paramFiles);
    
    // Add header model files
    if (this.headersGenerator) {
      // Generate consolidated header files from headers generator
      const consolidatedHeaderFiles = this.headersGenerator.generateConfiguredHeaderFiles();
      files.push(...consolidatedHeaderFiles);
      files.push(...headerFiles); // Add any non-matched header files
      
      // Generate index for all header files
      const allHeaderFiles = [...consolidatedHeaderFiles, ...headerFiles];
      if (allHeaderFiles.length > 0) {
        const headersIndexContent = this.generateHeadersIndex(allHeaderFiles);
        files.push({
          path: 'models/headers/index.dart',
          content: headersIndexContent
        });
      }
      
      // Print matching report
      const report = this.headersGenerator.generateReport();
      console.log('\n' + report);
      console.log(`\nTotal header files generated: ${allHeaderFiles.length} (${consolidatedHeaderFiles.length} consolidated, ${headerFiles.length} endpoint-specific)`);
    } else {
      // Original behavior
      files.push(...headerFiles);
      if (headerFiles.length > 0) {
        const headersIndexContent = this.generateHeadersIndex(headerFiles);
        files.push({
          path: 'models/headers/index.dart',
          content: headersIndexContent
        });
      }
    }
    
    // Generate index file for parameter models if any were created
    if (paramFiles.length > 0) {
      const paramsIndexContent = this.generateParamsIndex(paramFiles);
      files.push({
        path: 'models/params/index.dart',
        content: paramsIndexContent
      });
    }
    
    // Generate ApiException file
    const apiExceptionFile = this.generateApiException();
    files.push(apiExceptionFile);
    
    // Generate an index file for services only
    const serviceFiles = files.filter(f => f.path.startsWith('services/') && f.path.endsWith('_service.dart'));
    const indexContent = this.generateServicesIndex(serviceFiles);
    files.push({
      path: 'services/index.dart',
      content: indexContent
    });
    
    return files;
  }

  /**
   * Get endpoints grouped by tag
   */
  private getEndpointsByTag(): Map<string, EndpointInfo[]> {
    const grouped = new Map<string, EndpointInfo[]>();
    // Use the original spec paths to preserve $ref
    const paths = this.originalSpec?.paths || {};
    
    Object.entries(paths).forEach(([path, pathItem]) => {
      if (!pathItem) return;
      
      const methods = ['get', 'post', 'put', 'delete', 'patch'] as const;
      
      methods.forEach(method => {
        const operation = (pathItem as any)[method] as OpenAPIV3.OperationObject;
        if (!operation) return;
        
        const tags = operation.tags || ['default'];
        // Deduplicate tags to prevent duplicate method generation
        const uniqueTags = [...new Set(tags)];
        
        uniqueTags.forEach(tag => {
          if (!grouped.has(tag)) {
            grouped.set(tag, []);
          }
          
          grouped.get(tag)!.push({
            method,
            path,
            operation,
            pathItem
          });
        });
      });
    });
    
    return grouped;
  }

  /**
   * Create a service class from endpoints
   */
  private createServiceClass(
    tag: string,
    endpoints: EndpointInfo[],
    paramFiles: GeneratedFile[],
    headerFiles: GeneratedFile[]
  ): ServiceClass {
    const serviceName = TypeMapper.toDartClassName(tag) + 'Service';
    const methods: EndpointMethod[] = [];
    const imports = new Set<string>();
    const generatedParamModels = new Set<string>(); // Track generated models to avoid duplicates
    
    // Add base imports
    imports.add('../models/index.dart');
    
    // Generate methods for each endpoint
    endpoints.forEach(({ method, path, operation, pathItem }) => {
      let endpointMethod: EndpointMethod;
      
      switch (method) {
        case 'get':
          endpointMethod = this.endpointGenerator.generateGetMethod(
            operation.operationId || `${method}_${path}`,
            path,
            operation,
            pathItem
          );
          break;
        case 'post':
        case 'put':
        case 'patch':
          endpointMethod = this.endpointGenerator.generateMutationMethod(
            method,
            operation.operationId || `${method}_${path}`,
            path,
            operation,
            pathItem
          );
          break;
        case 'delete':
          endpointMethod = this.endpointGenerator.generateDeleteMethod(
            operation.operationId || `${method}_${path}`,
            path,
            operation,
            pathItem
          );
          break;
        default:
          return;
      }
      
      methods.push(endpointMethod);
      
      // Generate parameter models if needed
      if (endpointMethod.needsParamsModel && endpointMethod.queryParamsModelName && 
          !generatedParamModels.has(endpointMethod.queryParamsModelName)) {
        const paramsModel = this.paramsGenerator.generateQueryParamsModel(
          endpointMethod.methodName,
          endpointMethod.queryParams
        );
        if (paramsModel) {
          paramFiles.push(paramsModel);
          generatedParamModels.add(endpointMethod.queryParamsModelName);
        }
      }
      
      if (endpointMethod.needsHeadersModel && endpointMethod.headers.length > 0) {
        // Use custom header matcher if available
        if (this.headersGenerator) {
          const matchedClassName = this.headersGenerator.findMatchingHeaderClass(
            path,
            endpointMethod.headers
          );
          
          if (matchedClassName) {
            // Found a match - use the consolidated header class
            endpointMethod.headersModelName = matchedClassName;
          } else {
            // No match - generate endpoint-specific header class
            if (endpointMethod.headersModelName && !generatedParamModels.has(endpointMethod.headersModelName)) {
              const headersModel = this.paramsGenerator.generateHeadersModel(
                endpointMethod.methodName,
                endpointMethod.headers
              );
              if (headersModel) {
                headerFiles.push(headersModel);
                generatedParamModels.add(endpointMethod.headersModelName);
              }
            }
          }
        } else {
          // Fallback to original behavior
          if (endpointMethod.headersModelName && !generatedParamModels.has(endpointMethod.headersModelName)) {
            const headersModel = this.paramsGenerator.generateHeadersModel(
              endpointMethod.methodName,
              endpointMethod.headers
            );
            if (headersModel) {
              headerFiles.push(headersModel);
              generatedParamModels.add(endpointMethod.headersModelName);
            }
          }
        }
      }
      
      // Collect imports for return types and parameters
      if (endpointMethod.returnType && !this.isPrimitiveType(endpointMethod.returnType)) {
        // Model imports are handled by the index file
      }
      
      endpointMethod.parameters.forEach(param => {
        const typeImports = TypeMapper.getImportsForType(param.type);
        typeImports.forEach(imp => imports.add(imp));
      });
    });
    
    // No need to add separate imports for params and headers
    // They are already exported from models/index.dart
    
    // Get tag description if available from the spec
    const tagInfo = this.originalSpec?.tags?.find(t => t.name === tag);
    
    return {
      serviceName,
      description: tagInfo?.description,
      methods,
      imports: Array.from(imports),
      hasApiException: true // Always include for error handling
    };
  }

  /**
   * Render a service class
   */
  private renderService(service: ServiceClass): string {
    return this.templateManager.render('service', service);
  }

  /**
   * Generate index file for services
   */
  private generateServicesIndex(files: GeneratedFile[]): string {
    const exports = files
      .map(f => {
        const fileName = f.path.replace('services/', '');
        return `export '${fileName}';`;
      })
      .join('\n');
    
    return `// Generated index file for services
${exports}
export 'api_exception.dart';
`;
  }

  /**
   * Check if a type is primitive
   */
  private isPrimitiveType(type: string): boolean {
    const primitives = ['String', 'int', 'double', 'bool', 'num', 'void', 'dynamic'];
    return primitives.includes(type) || type.startsWith('List<') || type.startsWith('Map<');
  }
  
  /**
   * Generate ApiException file
   */
  private generateApiException(): GeneratedFile {
    const content = `/// Custom exception for API errors
class ApiException implements Exception {
  final int? statusCode;
  final String message;
  final dynamic error;
  
  ApiException({
    this.statusCode,
    required this.message,
    this.error,
  });
  
  @override
  String toString() {
    return 'ApiException: [\$statusCode] \$message';
  }
}
`;
    
    return {
      path: 'services/api_exception.dart',
      content
    };
  }
  
  /**
   * Generate index file for parameter models
   */
  private generateParamsIndex(files: GeneratedFile[]): string {
    const exports = files
      .filter(f => f.path.startsWith('models/params/'))
      .map(f => {
        const fileName = f.path.replace('models/params/', '').replace('.dart', '');
        return `export '${fileName}.dart';`;
      })
      .join('\n');
    
    return `// Generated index file for parameter models
${exports}
`;
  }
  
  /**
   * Generate index file for header models
   */
  private generateHeadersIndex(files: GeneratedFile[]): string {
    const exports = files
      .filter(f => f.path.startsWith('models/headers/'))
      .map(f => {
        const fileName = f.path.replace('models/headers/', '').replace('.dart', '');
        return `export '${fileName}.dart';`;
      })
      .join('\n');
    
    return `// Generated index file for header models
${exports}
`;
  }
}

interface EndpointInfo {
  method: string;
  path: string;
  operation: OpenAPIV3.OperationObject;
  pathItem?: OpenAPIV3.PathItemObject;
}