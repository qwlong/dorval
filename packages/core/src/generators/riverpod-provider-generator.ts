/**
 * Riverpod Provider Generator
 *
 * Generates intelligent Riverpod providers that:
 * - Automatically handle data dependencies
 * - Provide pagination support
 * - Include search with debouncing
 * - Auto-refresh related data on mutations
 */

import { OpenAPIV3 } from 'openapi-types';
import { GeneratedFile } from '../types';
import { TypeMapper } from '../utils';
import { TemplateManager } from '../templates/template-manager';

interface ServiceMethod {
  name: string;
  httpMethod: string;
  path: string;
  returnType: string;
  parameters: Parameter[];
  description?: string;
  operationId: string;
  tags?: string[];
}

interface Parameter {
  name: string;
  type: string;
  in: 'path' | 'query' | 'header' | 'body';
  required: boolean;
  description?: string;
}

interface ProviderDefinition {
  name: string;
  type: 'service' | 'query' | 'mutation' | 'paginated' | 'search' | 'composite';
  method?: ServiceMethod;
  dependencies?: string[];
  refreshTargets?: string[];
  config?: {
    autoDispose?: boolean;
    cacheTime?: number;
    debounceMs?: number;
  };
}

interface ApiRelationship {
  from: string;
  to: string;
  via: string; // property name that links them
  type: 'one-to-one' | 'one-to-many' | 'many-to-many';
}

export class RiverpodProviderGenerator {
  private templateManager: TemplateManager;
  private apiRelationships: Map<string, ApiRelationship[]> = new Map();

  constructor() {
    this.templateManager = new TemplateManager();
  }

  /**
   * Generate all Riverpod provider files
   */
  generateProviders(
    spec: OpenAPIV3.Document,
    services: any[], // ServiceDefinition[]
    config: any
  ): GeneratedFile[] {
    const files: GeneratedFile[] = [];

    // Analyze API relationships
    this.analyzeApiRelationships(spec);

    // Generate base providers
    files.push(this.generateApiClientProvider(config));

    // Generate service providers with smart features
    for (const service of services) {
      const providers = this.generateServiceProviders(service, spec);
      files.push(providers);
    }

    // Generate composite providers for common patterns
    const compositeProviders = this.generateCompositeProviders(spec);
    files.push(...compositeProviders);

    // Generate index file
    files.push(this.generateIndexFile(services));

    return files;
  }

  /**
   * Analyze OpenAPI spec to find relationships between APIs
   */
  private analyzeApiRelationships(spec: OpenAPIV3.Document): void {
    const paths = spec.paths || {};

    // Look for patterns like:
    // - /locations/{locationId}/shifts -> Location has many Shifts
    // - /shifts/{shiftId}/team-members -> Shift has many TeamMembers

    for (const [path, pathItem] of Object.entries(paths)) {
      const pathParts = path.split('/').filter(p => p && !p.startsWith('{'));

      if (pathParts.length >= 2) {
        const parentResource = pathParts[pathParts.length - 2];
        const childResource = pathParts[pathParts.length - 1];

        // Check if this represents a relationship
        if (path.includes('{') && path.includes('}')) {
          const paramMatch = path.match(/\{(\w+)\}/);
          if (paramMatch) {
            const relationship: ApiRelationship = {
              from: parentResource,
              to: childResource,
              via: paramMatch[1],
              type: this.determineRelationType(pathItem as any)
            };

            const existing = this.apiRelationships.get(parentResource) || [];
            existing.push(relationship);
            this.apiRelationships.set(parentResource, existing);
          }
        }
      }
    }
  }

  /**
   * Determine relationship type from OpenAPI path item
   */
  private determineRelationType(pathItem: OpenAPIV3.PathItemObject): 'one-to-one' | 'one-to-many' | 'many-to-many' {
    // Check GET response to determine if it returns array or single item
    const getOp = pathItem.get;
    if (getOp && getOp.responses && getOp.responses['200']) {
      const response = getOp.responses['200'] as OpenAPIV3.ResponseObject;
      const content = response.content?.['application/json'];
      if (content?.schema) {
        const schema = content.schema as OpenAPIV3.SchemaObject;
        if (schema.type === 'array') {
          return 'one-to-many';
        }
      }
    }
    return 'one-to-one';
  }

  /**
   * Generate API client provider
   */
  private generateApiClientProvider(config: any): GeneratedFile {
    const content = `import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../api_client.dart';
import '../api_config.dart';

/// Global API client provider
/// Configure your API settings here
final apiClientProvider = Provider<ApiClient>((ref) {
  // Watch for configuration changes
  final config = ref.watch(apiConfigProvider);

  return ApiClient(
    baseUrl: config.baseUrl,
    connectTimeout: config.connectTimeout,
    receiveTimeout: config.receiveTimeout,
    interceptors: [
      // Add authentication interceptor
      AuthInterceptor(ref),
      // Add logging in debug mode
      if (kDebugMode) LoggingInterceptor(),
      // Add retry logic
      RetryInterceptor(maxRetries: 3),
    ],
  );
});

/// API configuration provider
/// Can be overridden for different environments
final apiConfigProvider = Provider<ApiConfig>((ref) {
  return ApiConfig(
    baseUrl: const String.fromEnvironment(
      'API_BASE_URL',
      defaultValue: 'https://api.example.com',
    ),
    connectTimeout: const Duration(seconds: 30),
    receiveTimeout: const Duration(seconds: 30),
  );
});

/// Authentication state provider
final authTokenProvider = StateProvider<String?>((ref) => null);

/// Authentication interceptor
class AuthInterceptor extends Interceptor {
  final Ref ref;

  AuthInterceptor(this.ref);

  @override
  void onRequest(RequestOptions options, RequestInterceptorHandler handler) {
    final token = ref.read(authTokenProvider);
    if (token != null) {
      options.headers['Authorization'] = 'Bearer $token';
    }
    handler.next(options);
  }
}

/// Retry interceptor for failed requests
class RetryInterceptor extends Interceptor {
  final int maxRetries;
  int _retryCount = 0;

  RetryInterceptor({this.maxRetries = 3});

  @override
  void onError(DioException err, ErrorInterceptorHandler handler) async {
    if (_shouldRetry(err) && _retryCount < maxRetries) {
      _retryCount++;

      // Exponential backoff
      await Future.delayed(Duration(seconds: _retryCount * 2));

      try {
        final response = await err.requestOptions.fetch();
        handler.resolve(response);
      } catch (e) {
        handler.next(err);
      }
    } else {
      handler.next(err);
    }
  }

  bool _shouldRetry(DioException err) {
    return err.type == DioExceptionType.connectionTimeout ||
           err.type == DioExceptionType.receiveTimeout ||
           (err.response?.statusCode ?? 0) >= 500;
  }
}
`;

    return {
      path: 'providers/api_client_provider.dart',
      content
    };
  }

  /**
   * Generate smart providers for a service
   */
  private generateServiceProviders(service: any, spec: OpenAPIV3.Document): GeneratedFile {
    const providers: ProviderDefinition[] = [];
    const className = TypeMapper.toDartClassName(service.name);
    const fileName = TypeMapper.toSnakeCase(service.name);

    // Service instance provider
    providers.push({
      name: `${TypeMapper.toCamelCase(service.name)}ServiceProvider`,
      type: 'service',
    });

    // Analyze each method and generate appropriate providers
    for (const method of service.methods) {
      const methodProviders = this.analyzeAndGenerateMethodProviders(method, service);
      providers.push(...methodProviders);
    }

    // Generate composite providers for related data
    const compositeProviders = this.generateCompositeProvidersForService(service, spec);
    providers.push(...compositeProviders);

    // Render template
    const content = this.templateManager.render('riverpod-provider', {
      className,
      serviceName: service.name,
      providers,
      imports: this.generateImports(service),
      hasSearch: providers.some(p => p.type === 'search'),
      hasPagination: providers.some(p => p.type === 'paginated'),
      hasComposite: providers.some(p => p.type === 'composite'),
    });

    return {
      path: `providers/${fileName}_provider.dart`,
      content
    };
  }

  /**
   * Analyze method and generate appropriate provider types
   */
  private analyzeAndGenerateMethodProviders(method: any, service: any): ProviderDefinition[] {
    const providers: ProviderDefinition[] = [];
    const methodName = method.name;

    // Check if it's a list endpoint
    const returnsList = method.returnType.startsWith('List<');

    // Check for pagination parameters
    const hasPagination = method.parameters.some((p: any) =>
      ['page', 'limit', 'offset', 'pageSize'].includes(p.name)
    );

    // Check for search/filter parameters
    const hasSearch = method.parameters.some((p: any) =>
      ['query', 'search', 'q', 'filter'].includes(p.name)
    );

    if (method.httpMethod === 'GET') {
      if (hasPagination && returnsList) {
        // Generate paginated provider
        providers.push({
          name: `${methodName}PaginatedProvider`,
          type: 'paginated',
          method,
          config: {
            autoDispose: false, // Keep paginated data in memory
          }
        });
      }

      if (hasSearch) {
        // Generate search provider with debouncing
        providers.push({
          name: `${methodName}SearchProvider`,
          type: 'search',
          method,
          config: {
            debounceMs: 300,
            autoDispose: true,
          }
        });
      }

      // Always generate basic query provider
      providers.push({
        name: `${methodName}Provider`,
        type: 'query',
        method,
        config: {
          autoDispose: true,
          cacheTime: 5, // 5 minutes
        }
      });
    } else {
      // POST, PUT, PATCH, DELETE - generate mutation provider
      const refreshTargets = this.findRefreshTargets(method, service);

      providers.push({
        name: `${methodName}Provider`,
        type: 'mutation',
        method,
        refreshTargets,
        config: {
          autoDispose: true,
        }
      });
    }

    return providers;
  }

  /**
   * Find which providers should be refreshed after a mutation
   */
  private findRefreshTargets(method: any, service: any): string[] {
    const targets: string[] = [];
    const resourceName = this.extractResourceName(method.path);

    // Refresh list providers after create/update/delete
    if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(method.httpMethod)) {
      // Refresh the list provider
      targets.push(`get${TypeMapper.toPascalCase(resourceName)}ListProvider`);

      // If updating/deleting specific item, refresh its detail provider
      if (method.path.includes('{')) {
        targets.push(`get${TypeMapper.toPascalCase(resourceName)}Provider`);
      }

      // Find related resources that might need refresh
      const relationships = this.apiRelationships.get(resourceName) || [];
      for (const rel of relationships) {
        targets.push(`get${TypeMapper.toPascalCase(rel.to)}Provider`);
      }
    }

    return targets;
  }

  /**
   * Generate composite providers that combine multiple API calls
   */
  private generateCompositeProvidersForService(service: any, spec: OpenAPIV3.Document): ProviderDefinition[] {
    const providers: ProviderDefinition[] = [];
    const resourceName = this.extractResourceName(service.name);

    // Example: ShiftDetails provider that combines shift, location, and team members
    const relationships = this.apiRelationships.get(resourceName) || [];

    if (relationships.length > 0) {
      // Generate a "with details" provider
      providers.push({
        name: `${resourceName}WithDetailsProvider`,
        type: 'composite',
        dependencies: relationships.map(r => `get${TypeMapper.toPascalCase(r.to)}Provider`),
        config: {
          autoDispose: true,
          cacheTime: 10,
        }
      });
    }

    return providers;
  }

  /**
   * Generate composite providers for common patterns
   */
  private generateCompositeProviders(spec: OpenAPIV3.Document): GeneratedFile[] {
    const files: GeneratedFile[] = [];

    // Generate dashboard provider that combines multiple data sources
    const dashboardProvider = this.generateDashboardProvider(spec);
    if (dashboardProvider) {
      files.push(dashboardProvider);
    }

    return files;
  }

  /**
   * Generate a dashboard provider that combines multiple data sources
   */
  private generateDashboardProvider(spec: OpenAPIV3.Document): GeneratedFile | null {
    // Look for common dashboard-related endpoints
    const dashboardEndpoints = this.findDashboardEndpoints(spec);

    if (dashboardEndpoints.length === 0) {
      return null;
    }

    const content = `import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../models/index.dart';
import 'index.dart';

/// Dashboard data combining multiple sources
class DashboardData {
  final List<dynamic> recentItems;
  final Map<String, int> statistics;
  final List<dynamic> upcomingEvents;

  DashboardData({
    required this.recentItems,
    required this.statistics,
    required this.upcomingEvents,
  });
}

/// Composite dashboard provider
final dashboardProvider = FutureProvider<DashboardData>((ref) async {
  // Parallel fetch all dashboard data
  final results = await Future.wait([
    ${dashboardEndpoints.map(e => `ref.watch(${e}.future)`).join(',\n    ')},
  ]);

  return DashboardData(
    recentItems: results[0] as List<dynamic>,
    statistics: _calculateStatistics(results),
    upcomingEvents: results[2] as List<dynamic>,
  );
});

Map<String, int> _calculateStatistics(List<dynamic> results) {
  // Calculate statistics from fetched data
  return {
    'total': results[0].length,
    'pending': results[1].length,
    'completed': results[2].length,
  };
}
`;

    return {
      path: 'providers/dashboard_provider.dart',
      content
    };
  }

  /**
   * Find endpoints that would be useful for a dashboard
   */
  private findDashboardEndpoints(spec: OpenAPIV3.Document): string[] {
    const endpoints: string[] = [];
    const paths = spec.paths || {};

    for (const [path, pathItem] of Object.entries(paths)) {
      // Look for endpoints that might be dashboard-related
      if (path.includes('stats') ||
          path.includes('summary') ||
          path.includes('recent') ||
          path.includes('upcoming') ||
          path.includes('dashboard')) {
        const operationId = (pathItem as any).get?.operationId;
        if (operationId) {
          endpoints.push(`${operationId}Provider`);
        }
      }
    }

    return endpoints;
  }

  /**
   * Generate index file for providers
   */
  private generateIndexFile(services: any[]): GeneratedFile {
    const exports = services.map(s =>
      `export '${TypeMapper.toSnakeCase(s.name)}_provider.dart';`
    ).join('\n');

    const content = `// Riverpod Providers Index
export 'api_client_provider.dart';
${exports}
export 'dashboard_provider.dart';
export 'common_providers.dart';
`;

    return {
      path: 'providers/index.dart',
      content
    };
  }

  /**
   * Generate imports for a service
   */
  private generateImports(service: any): string[] {
    return [
      "import 'package:flutter_riverpod/flutter_riverpod.dart';",
      "import 'package:dio/dio.dart';",
      "import '../services/${TypeMapper.toSnakeCase(service.name)}_service.dart';",
      "import '../models/index.dart';",
      "import 'api_client_provider.dart';",
    ];
  }

  /**
   * Extract resource name from path or service name
   */
  private extractResourceName(pathOrName: string): string {
    // Extract from path like /api/v1/shifts/{id}
    if (pathOrName.startsWith('/')) {
      const parts = pathOrName.split('/').filter(p => p && !p.startsWith('{'));
      return parts[parts.length - 1];
    }
    // Extract from service name like ShiftsService
    return pathOrName.replace(/Service$/i, '').toLowerCase();
  }
}