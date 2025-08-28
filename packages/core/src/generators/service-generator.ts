/**
 * Generate Dart service classes
 */

import type { OpenAPIV3 } from 'openapi-types';
import { OpenAPIObject, DartGeneratorOptions, GeneratedFile, ClientGeneratorBuilder } from '../types';
import { OpenAPIParser } from '../parser/openapi-parser';
import { EndpointGenerator, EndpointMethod } from './endpoint-generator';
import { TemplateManager } from '../templates/template-manager';
import { TypeMapper } from '../utils/type-mapper';
import { ParamsGenerator } from './params-generator';
import { ConfigurableHeaderGenerator } from './configurable-header-generator';
import { CustomHeaderMatcher } from './custom-header-matcher';
import * as fs from 'fs-extra';
import * as path from 'path';

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
  private configurableHeaderGenerator: ConfigurableHeaderGenerator | null = null;
  private customHeaderMatcher: CustomHeaderMatcher | null = null;
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
    let methodTemplatePath = path.join(__dirname, 'templates', 'service-method.hbs');
    if (!fs.existsSync(methodTemplatePath)) {
      methodTemplatePath = path.join(__dirname, '../templates/service-method.hbs');
    }
    if (!fs.existsSync(methodTemplatePath)) {
      methodTemplatePath = path.join(__dirname, 'service-method.hbs');
    }
    const methodTemplateContent = fs.readFileSync(methodTemplatePath, 'utf-8');
    this.templateManager.registerPartial('service-method', methodTemplateContent);
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
          const customBuilder = require('@dorval/custom');
          this.clientBuilder = customBuilder.builder()();
          console.log('Loaded @dorval/custom client builder');
        } catch (e) {
          // Try relative path
          const customBuilder = require('../../custom/dist');
          this.clientBuilder = customBuilder.builder()();
          console.log('Loaded custom client builder from relative path');
        }
      } else if (clientType === 'dio') {
        // Try to load Dio client builder
        try {
          const dioBuilder = require('@dorval/dio');
          this.clientBuilder = dioBuilder.builder()();
          console.log('Loaded @dorval/dio client builder');
        } catch (e) {
          // Try relative path
          const dioBuilder = require('../../dio/dist');
          this.clientBuilder = dioBuilder.builder()();
          console.log('Loaded dio client builder from relative path');
        }
      } else {
        // Default to Dio
        try {
          const dioBuilder = require('@dorval/dio');
          this.clientBuilder = dioBuilder.builder()();
        } catch (e) {
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
      this.customHeaderMatcher = new CustomHeaderMatcher(options.output.override.headers as any);
      console.log('Initialized CustomHeaderMatcher with config:', options.output.override.headers);
    } else if (options.output.override?.sharedHeaders) {
      // Legacy shared headers configuration
      this.configurableHeaderGenerator = new ConfigurableHeaderGenerator(
        options.output.override.sharedHeaders
      );
    }
    
    // Store the original spec - it should already have $refs preserved from parseOpenAPISpec
    this.originalSpec = spec;
    
    // Debug: Check if the original spec still has $refs
    console.log('DEBUG: Original spec paths at service generator start:', JSON.stringify(this.originalSpec?.paths, null, 2));
    
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
    if (this.customHeaderMatcher) {
      // Generate consolidated header files from custom-matcher
      const consolidatedHeaderFiles = this.generateConsolidatedHeaderFiles();
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
      const report = this.customHeaderMatcher.generateReport();
      console.log('\n' + report);
      console.log(`Total header files generated: ${allHeaderFiles.length} (${consolidatedHeaderFiles.length} consolidated, ${headerFiles.length} endpoint-specific)`);
    } else if (this.configurableHeaderGenerator) {
      // Generate shared header files
      const sharedHeaderFiles = this.configurableHeaderGenerator.generateSharedHeaderFiles();
      files.push(...sharedHeaderFiles);
      files.push(...headerFiles); // Add any non-shared header files
      
      // Generate index for all header files
      const allHeaderFiles = [...sharedHeaderFiles, ...headerFiles];
      if (allHeaderFiles.length > 0) {
        const headersIndexContent = this.generateHeadersIndex(allHeaderFiles);
        files.push({
          path: 'models/headers/index.dart',
          content: headersIndexContent
        });
      }
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
        if (this.customHeaderMatcher) {
          const matchedClassName = this.customHeaderMatcher.findMatchingHeaderClass(
            path,
            endpointMethod.headers
          );
          
          if (matchedClassName) {
            // Found a match - use the consolidated header class
            endpointMethod.headersModelName = matchedClassName;
            console.log(`Matched endpoint ${path} to header class: ${matchedClassName}`);
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
        } else if (this.configurableHeaderGenerator) {
          // Legacy configurable header generator
          const headerModelName = this.configurableHeaderGenerator.getHeaderModelName(
            endpointMethod.methodName,
            endpointMethod.headers
          );
          
          if (headerModelName) {
            endpointMethod.headersModelName = headerModelName;
            
            // Only generate individual file if it's not a shared model
            if (!this.configurableHeaderGenerator.isSharedModel(headerModelName) &&
                !generatedParamModels.has(headerModelName)) {
              const headersModel = this.configurableHeaderGenerator.generateHeaderModel(
                endpointMethod.methodName,
                endpointMethod.headers
              );
              if (headersModel) {
                headerFiles.push(headersModel);
                generatedParamModels.add(headerModelName);
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
    
    // Add imports for parameter and header models if any were generated
    if (paramFiles.length > 0) {
      imports.add('../models/params/index.dart');
    }
    if (headerFiles.length > 0) {
      imports.add('../models/headers/index.dart');
    }
    
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
  
  /**
   * Generate consolidated header files from custom-matcher definitions
   */
  private generateConsolidatedHeaderFiles(): GeneratedFile[] {
    if (!this.customHeaderMatcher || !this.options?.output.override?.headers) {
      return [];
    }
    
    const files: GeneratedFile[] = [];
    const config = this.options.output.override.headers;
    const generatedSignatures = new Set<string>();
    
    // Generate files for each unique header class (based on sorted signature)
    if (config.definitions) {
      Object.entries(config.definitions).forEach(([className, definition]) => {
        const fields = Array.isArray(definition.fields) 
          ? definition.fields.map(f => ({ 
              name: f, 
              required: definition.required?.includes(f) ?? true,
              type: 'String' // Default type for array-style definitions
            }))
          : Object.entries(definition.fields).map(([name, info]) => ({
              name,
              required: typeof info === 'object' && info !== null ? info.required ?? true : true,
              type: typeof info === 'object' && info !== null && 'type' in info ? (info as any).type : 'String'
            }));
        
        // Create a signature for this header definition (sorted for consistency)
        const signature = fields
          .map(f => `${f.name}:${f.required ? 'R' : 'O'}`)
          .sort()
          .join('|');
        
        // Only generate if we haven't seen this signature before
        if (!generatedSignatures.has(signature)) {
          generatedSignatures.add(signature);
          
          const headerParams = fields.map(f => ({
            originalName: f.name,
            paramName: TypeMapper.toCamelCase(f.name.replace(/-/g, '_')),
            dartName: TypeMapper.toCamelCase(f.name.replace(/-/g, '_')),
            type: f.type || 'String',
            required: f.required,
            description: ''
          }));
          
          // Create a custom header model directly with the correct class name
          const headersClassName = className.endsWith('Headers') ? className : className + 'Headers';
          const fileName = TypeMapper.toSnakeCase(className);
          
          const properties = headerParams.map(header => ({
            name: header.dartName,
            type: header.type || 'String',
            required: header.required,
            description: header.description,
            jsonKey: header.dartName !== header.originalName ? header.originalName : undefined
          }));
          
          const content = this.templateManager.render('freezed-model', {
            className: headersClassName,
            fileName: fileName,  // Pass the actual file name without extension
            isEnum: false,
            properties,
            hasJsonKey: properties.some(p => p.jsonKey),
            hasDescription: properties.some(p => p.description)
          });
          
          files.push({
            path: `models/headers/${fileName}.f.dart`,
            content
          });
        }
      });
    }
    
    return files;
  }
}

interface EndpointInfo {
  method: string;
  path: string;
  operation: OpenAPIV3.OperationObject;
  pathItem?: OpenAPIV3.PathItemObject;
}