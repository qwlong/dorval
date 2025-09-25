/**
 * Riverpod Providers Generator
 *
 * Generation strategy:
 * - GET requests → FutureProvider (auto-caching)
 * - POST/PUT/PATCH/DELETE → Static methods (auto-refresh related data)
 */

import { OpenAPIV3 } from 'openapi-types';
import { GeneratedFile } from '../types';
import { TypeMapper } from '../utils';
import { TemplateManager } from '../templates/template-manager';

interface ServiceInfo {
  name: string;
  className: string;
  methods: MethodInfo[];
}

interface MethodInfo {
  name: string;
  httpMethod: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  path: string;
  operationId: string;
  returnType: string;
  parameters: ParameterInfo[];
  requestBody?: RequestBodyInfo;
  description?: string;
  tags?: string[];
  // For smart refresh
  refreshTargets?: string[];
}

interface ParameterInfo {
  name: string;
  type: string;
  in: 'path' | 'query' | 'header';
  required: boolean;
  description?: string;
}

interface RequestBodyInfo {
  type: string;
  required: boolean;
}

export interface ProvidersGeneratorConfig {
  style?: 'class' | 'extension' | 'separate';  // default 'class'
  autoDispose?: boolean;  // whether GET requests use autoDispose, default true
  smartRefresh?: boolean;  // whether to analyze refresh relationships, default true
  generateHelpers?: boolean;  // whether to generate helper methods, default true
}

export class ProvidersGenerator {
  private templateManager: TemplateManager;
  private config: ProvidersGeneratorConfig;

  constructor(config: ProvidersGeneratorConfig = {}) {
    this.templateManager = new TemplateManager();
    this.config = {
      style: 'class',
      autoDispose: true,
      smartRefresh: true,
      generateHelpers: true,
      ...config
    };

    // Register Handlebars helpers
    this.registerHelpers();
  }

  private registerHelpers(): void {
    const Handlebars = this.templateManager.getHandlebars();

    // Helper for value comparison
    Handlebars.registerHelper('eq', (a: any, b: any) => a === b);

    // Helper for logical OR
    Handlebars.registerHelper('or', (...args: any[]) => {
      // Last argument is the options object, need to exclude it
      const values = args.slice(0, -1);
      return values.some(v => !!v);
    });
  }

  /**
   * Generate Providers for all Services
   */
  generateProviders(spec: OpenAPIV3.Document, serviceFiles?: GeneratedFile[]): GeneratedFile[] {
    const files: GeneratedFile[] = [];

    // Extract service info from spec
    const services = this.extractServices(spec);

    // Generate Provider class for each Service
    for (const service of services) {
      const providers = this.generateServiceProviders(service, spec);
      files.push(providers);
    }

    // Generate index file
    files.push(this.generateIndexFile(services));

    // Generate base providers (service instances, dio, etc)
    files.push(this.generateBaseProviders(services));

    return files;
  }

  /**
   * Extract service information from OpenAPI spec
   */
  private extractServices(spec: OpenAPIV3.Document): ServiceInfo[] {
    const services: Map<string, ServiceInfo> = new Map();

    // Group paths by tag or create default service
    for (const [path, pathItem] of Object.entries(spec.paths || {})) {
      if (!pathItem) continue;

      for (const method of ['get', 'post', 'put', 'patch', 'delete'] as const) {
        const operation = pathItem[method] as OpenAPIV3.OperationObject | undefined;
        if (!operation) continue;

        // Determine service name from tags or use default
        const serviceName = operation.tags?.[0] || 'default';

        if (!services.has(serviceName)) {
          services.set(serviceName, {
            name: serviceName,
            className: TypeMapper.toPascalCase(serviceName) + 'Service',
            methods: []
          });
        }

        const service = services.get(serviceName)!;

        // Add method to service
        service.methods.push({
          name: operation.operationId || `${method}${path.replace(/[^a-zA-Z0-9]/g, '')}`,
          httpMethod: method.toUpperCase() as any,
          path,
          operationId: operation.operationId || '',
          returnType: this.getReturnType(operation),
          parameters: this.extractParameters(operation),
          requestBody: this.extractRequestBody(operation),
          description: operation.summary || operation.description,
          tags: operation.tags
        });
      }
    }

    return Array.from(services.values());
  }

  /**
   * Get return type from operation
   */
  private getReturnType(operation: OpenAPIV3.OperationObject): string {
    const response = operation.responses?.['200'] || operation.responses?.['201'];
    if (!response || !('content' in response)) return 'void';

    const content = response.content?.['application/json'];
    if (!content?.schema) return 'void';

    return this.schemaToType(content.schema as OpenAPIV3.SchemaObject | OpenAPIV3.ReferenceObject);
  }

  /**
   * Convert schema to Dart type
   */
  private schemaToType(schema: OpenAPIV3.SchemaObject | OpenAPIV3.ReferenceObject): string {
    if ('$ref' in schema) {
      const refName = (schema as OpenAPIV3.ReferenceObject).$ref?.split('/').pop() || 'dynamic';
      return TypeMapper.toPascalCase(refName);
    }

    const schemaObj = schema as OpenAPIV3.SchemaObject;

    if (schemaObj.type === 'array') {
      const itemType = schemaObj.items ? this.schemaToType(schemaObj.items as OpenAPIV3.SchemaObject | OpenAPIV3.ReferenceObject) : 'dynamic';
      return `List<${itemType}>`;
    }

    if (schemaObj.type === 'object') {
      // If it has properties, it's likely a model that should be generated
      if (schemaObj.properties) {
        return 'Map<String, dynamic>'; // Will be replaced with proper model in real implementation
      }
      return 'Map<String, dynamic>';
    }

    const typeMap: Record<string, string> = {
      string: 'String',
      number: 'double',
      integer: 'int',
      boolean: 'bool'
    };

    return typeMap[schemaObj.type as string] || 'dynamic';
  }

  /**
   * Extract parameters from operation
   */
  private extractParameters(operation: OpenAPIV3.OperationObject): ParameterInfo[] {
    if (!operation.parameters) return [];

    return operation.parameters.map((param: any) => ({
      name: param.name,
      type: this.parameterToType(param),
      in: param.in,
      required: param.required || false,
      description: param.description
    }));
  }

  /**
   * Convert parameter to Dart type
   */
  private parameterToType(param: any): string {
    if (!param.schema) return 'String';
    return this.schemaToType(param.schema);
  }

  /**
   * Extract request body info
   */
  private extractRequestBody(operation: OpenAPIV3.OperationObject): RequestBodyInfo | undefined {
    if (!operation.requestBody) return undefined;

    const requestBody = operation.requestBody as OpenAPIV3.RequestBodyObject;
    const content = requestBody.content?.['application/json'];

    if (!content?.schema) return undefined;

    return {
      type: this.schemaToType(content.schema as OpenAPIV3.SchemaObject | OpenAPIV3.ReferenceObject),
      required: requestBody.required || false
    };
  }

  /**
   * Generate Providers for a single Service
   */
  private generateServiceProviders(service: ServiceInfo, spec: OpenAPIV3.Document): GeneratedFile {
    const className = `${service.className}Providers`;
    const fileName = TypeMapper.toSnakeCase(service.name) + '_providers';

    // Analyze methods, categorize as queries and mutations
    const queries = service.methods.filter(m => m.httpMethod === 'GET');
    const mutations = service.methods.filter(m => m.httpMethod !== 'GET');

    // Generate Provider or method for each operation
    const providers = queries.map(method => this.generateQueryProvider(method, service));

    // Pass available provider names to mutation methods for smart refresh
    const providerNames = providers.map(p => p.name);
    const methods = mutations.map(method =>
      this.generateMutationMethod(method, service, providerNames)
    );

    // Prepare template data
    const templateData = {
      className,
      serviceName: service.name,
      serviceClassName: service.className,
      providers,
      methods,
      imports: this.generateImports(service),
      config: this.config,
      serviceProviderName: `${TypeMapper.toCamelCase(service.name)}ServiceProvider`,
    };

    // Render template
    const content = this.templateManager.render('providers-class', templateData);

    return {
      path: `providers/${fileName}.dart`,
      content
    };
  }

  /**
   * Generate query Provider (GET requests)
   */
  private generateQueryProvider(method: MethodInfo, service: ServiceInfo): any {
    const providerName = this.getProviderName(method);
    const pathParams = method.parameters.filter(p => p.in === 'path');
    const queryParams = method.parameters.filter(p => p.in === 'query');
    const headerParams = method.parameters.filter(p => p.in === 'header');

    const hasParams = method.parameters.length > 0;
    const hasPathParams = pathParams.length > 0;
    const hasQueryParams = queryParams.length > 0;
    const hasHeaderParams = headerParams.length > 0;

    // Use family if there are any parameters
    const isFamily = hasParams;

    // Check for pagination parameters
    const hasPagination = queryParams.some(p =>
      ['page', 'limit', 'offset', 'pageSize', 'perPage'].includes(p.name.toLowerCase())
    );

    return {
      name: providerName,
      methodName: method.operationId,
      description: method.description,
      returnType: method.returnType,
      isFamily,
      autoDispose: this.config.autoDispose,
      pathParams,
      queryParams,
      headerParams,
      hasPathParams,
      hasQueryParams,
      hasHeaderParams,
      hasPagination,
      paramsClassName: isFamily ? `${TypeMapper.toPascalCase(method.operationId)}Params` : null,
    };
  }

  /**
   * Generate mutation method (POST/PUT/PATCH/DELETE)
   */
  private generateMutationMethod(method: MethodInfo, service: ServiceInfo, availableProviders: string[]): any {
    const methodName = TypeMapper.toCamelCase(method.operationId);
    const refreshTargets = this.getRefreshTargets(method, availableProviders);

    // Extract parameters
    const pathParams = method.parameters.filter(p => p.in === 'path');
    const queryParams = method.parameters.filter(p => p.in === 'query');
    const headerParams = method.parameters.filter(p => p.in === 'header');

    return {
      name: methodName,
      operationId: method.operationId,
      httpMethod: method.httpMethod,
      description: method.description,
      returnType: method.returnType,
      pathParams,
      queryParams,
      headerParams,
      requestBody: method.requestBody,
      refreshTargets,
      hasRefreshTargets: refreshTargets.length > 0,
    };
  }

  /**
   * Get Provider name - matches service method name
   */
  private getProviderName(method: MethodInfo): string {
    // Use the exact operationId/method name from the service
    // This ensures providers match service methods exactly
    return TypeMapper.toCamelCase(method.operationId);
  }

  /**
   * Analyze refresh targets
   */
  private getRefreshTargets(method: MethodInfo, availableProviders: string[]): string[] {
    const targets: string[] = [];

    // Smart refresh based on mutation type and available providers
    switch (method.httpMethod) {
      case 'POST':
        // After creating, refresh list providers (not detail providers)
        availableProviders.forEach(provider => {
          if (!provider.toLowerCase().includes('byid') &&
              !provider.toLowerCase().includes('detail') &&
              !provider.toLowerCase().includes('single')) {
            targets.push(provider);
          }
        });
        break;

      case 'PUT':
      case 'PATCH':
        // After updating, refresh all providers
        targets.push(...availableProviders);
        break;

      case 'DELETE':
        // After deleting, refresh all providers
        targets.push(...availableProviders);
        break;
    }

    // Remove duplicates
    return [...new Set(targets)];
  }

  /**
   * Extract resource name from path
   */
  private extractResourceName(path: string): string {
    // /api/v1/shifts/{id} -> shifts
    const parts = path.split('/').filter(p => p && !p.startsWith('{') && !p.match(/^v\d+$/));
    return parts[parts.length - 1] || 'resource';
  }

  /**
   * Analyze refresh relationships for entire Service
   */
  private analyzeRefreshTargets(service: ServiceInfo, spec: OpenAPIV3.Document): void {
    // TODO: Implement smarter analysis
    // - Analyze path relationships
    // - Analyze return type relationships
    // - Analyze tag relationships
  }

  /**
   * Generate import statements
   */
  private generateImports(service: ServiceInfo): string[] {
    return [
      "import 'package:flutter_riverpod/flutter_riverpod.dart';",
      `import '../services/${TypeMapper.toSnakeCase(service.name)}_service.dart';`,
      "import '../models/index.dart';",
      "import 'base_providers.dart';",
    ];
  }

  /**
   * Generate base Providers
   */
  private generateBaseProviders(services: ServiceInfo[]): GeneratedFile {
    const serviceProviders = services.map(service => ({
      name: `${TypeMapper.toCamelCase(service.name)}ServiceProvider`,
      camelCaseName: `${TypeMapper.toCamelCase(service.name)}ServiceProvider`,
      className: service.className,
      fileName: TypeMapper.toSnakeCase(service.name),
    }));

    const content = this.templateManager.render('base-providers', {
      serviceProviders,
    });

    return {
      path: 'providers/base_providers.dart',
      content
    };
  }

  /**
   * Generate index file
   */
  private generateIndexFile(services: ServiceInfo[]): GeneratedFile {
    const exports = services.map(service =>
      `export '${TypeMapper.toSnakeCase(service.name)}_providers.dart';`
    ).join('\n');

    const content = `// Generated Providers Index
export 'base_providers.dart';
${exports}
`;

    return {
      path: 'providers/index.dart',
      content
    };
  }
}