/**
 * Generate Dart service classes
 */

import type { OpenAPIV3 } from 'openapi-types';
import { OpenAPIObject, DartGeneratorOptions, GeneratedFile } from '../types';
import { OpenAPIParser } from '../parser/openapi-parser';
import { EndpointGenerator, EndpointMethod } from './endpoint-generator';
import { TemplateManager } from '../templates/template-manager';
import { TypeMapper } from '../utils/type-mapper';
import { ParamsGenerator } from './params-generator';
import { ConfigurableHeaderGenerator } from './configurable-header-generator';
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
  private schemas: Record<string, any> = {};
  private originalSpec: OpenAPIObject | null = null;
  private options: DartGeneratorOptions | null = null;

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
    
    // Initialize configurable header generator if shared headers are configured
    if (options.output.override?.sharedHeaders) {
      this.configurableHeaderGenerator = new ConfigurableHeaderGenerator(
        options.output.override.sharedHeaders
      );
    }
    
    // Store the original spec - it should already have $refs preserved from parseOpenAPISpec
    this.originalSpec = spec;
    const parser = new OpenAPIParser();
    // Use parseWithoutDereference to preserve $refs
    await parser.parseWithoutDereference(spec);
    
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
    const endpointsByTag = this.getEndpointsByTag(parser);
    
    // Generate a service class for each tag
    for (const [tag, endpoints] of endpointsByTag.entries()) {
      const service = this.createServiceClass(tag, endpoints, parser, paramFiles, headerFiles);
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
    if (this.configurableHeaderGenerator) {
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
  private getEndpointsByTag(parser: OpenAPIParser): Map<string, EndpointInfo[]> {
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
    parser: OpenAPIParser,
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
        // Use configurable header generator if available
        if (this.configurableHeaderGenerator) {
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
    
    // Get tag description if available
    const tagInfo = parser.getTags().find(t => t.name === tag);
    
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