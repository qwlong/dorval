/// API Configuration
class ApiConfig {
  static const String apiVersion = '1.0.0';
  static const String apiTitle = 'Swagger Petstore';
  
  
  static const String defaultBaseUrl = 'http://petstore.swagger.io/v1';
  
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
