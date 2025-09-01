/**
 * Generate Dio API client
 */

import { OpenAPIObject } from '../types';
import { DartGeneratorOptions, GeneratedFile } from '../types';
import { TemplateManager } from '../templates/template-manager';
import { OpenAPIParser } from '../parser/openapi-parser';

export async function generateClient(
  spec: OpenAPIObject,
  options: DartGeneratorOptions
): Promise<GeneratedFile[]> {
  const files: GeneratedFile[] = [];
  const templateManager = new TemplateManager();
  
  // Parse spec for info
  const parser = new OpenAPIParser();
  await parser.parse(spec);
  
  // Generate base API client
  const clientContent = generateDioClient(parser, options, templateManager);
  
  files.push({
    path: 'api_client.dart',
    content: clientContent
  });
  
  return files;
}

function generateDioClient(
  parser: OpenAPIParser,
  options: DartGeneratorOptions,
  templateManager: TemplateManager
): string {
  const info = parser.getInfo();
  const baseUrl = options.output.override?.dio?.baseUrl || parser.getBaseUrl();
  const hasAuth = parser.hasAuthentication();
  const securitySchemes = parser.getSecuritySchemes();
  
  // Check for Bearer auth
  const hasBearerAuth = Object.values(securitySchemes).some(
    scheme => scheme.type === 'http' && scheme.scheme === 'bearer'
  );
  
  const templateData = {
    apiTitle: info.title,
    apiVersion: info.version || '1.0',
    apiDescription: info.description || '',
    baseUrl: baseUrl,
    defaultBaseUrl: baseUrl || 'https://api.example.com',
    hasAuth: hasAuth || hasBearerAuth,
    hasInterceptors: (options.output.override?.dio?.interceptors?.length ?? 0) > 0,
    hasErrorInterceptor: true,
    enableLogging: 'kDebugMode', // Flutter's debug mode constant
    connectTimeout: 30,
    receiveTimeout: 30,
    defaultHeaders: {
      'X-API-Version': info.version,
    }
  };
  
  return templateManager.render('dio-client', templateData);
}

function generateApiConfig(
  parser: OpenAPIParser,
  options: DartGeneratorOptions
): string {
  const info = parser.getInfo();
  const baseUrl = options.output.override?.dio?.baseUrl || parser.getBaseUrl();
  
  return `/// API Configuration
class ApiConfig {
  static const String apiVersion = '${info.version}';
  static const String apiTitle = '${info.title}';
  ${info.description ? `static const String apiDescription = '${info.description.replace(/'/g, "\\'")}';` : ''}
  
  static const String defaultBaseUrl = '${baseUrl}';
  
  // Environment-specific base URLs
  static String get baseUrl {
    // You can implement environment detection here
    // For example, using Flutter's kDebugMode or environment variables
    return defaultBaseUrl;
  }
  
  // API endpoints
  static const String basePath = '/api/v1';
  
  // Timeouts
  static const Duration connectTimeout = Duration(seconds: 30);
  static const Duration receiveTimeout = Duration(seconds: 30);
  
  // Headers
  static Map<String, String> get defaultHeaders => {
    'X-API-Version': apiVersion,
    'Accept': 'application/json',
    'Content-Type': 'application/json',
  };
}
`;
}