import 'package:dio/dio.dart';
import 'services/index.dart';

/// Base API client using Dio
/// 
/// This client handles all HTTP requests to the Swagger Petstore API.
/// Base URL: http://petstore.swagger.io/v1
class ApiClient {
  // API Configuration Constants
  static const String apiVersion = '1.0.0';
  static const String apiTitle = 'Swagger Petstore';
  static const String defaultBaseUrl = 'http://petstore.swagger.io/v1';
  
  late final Dio dio;
  final String baseUrl;
  
  ApiClient({
    String? baseUrl,
    Dio? dioClient,
  }) : baseUrl = baseUrl ?? 'http://petstore.swagger.io/v1' {
    dio = dioClient ?? Dio();
    dio.options.baseUrl = this.baseUrl;
    
    // Set default headers
    dio.options.headers = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'X-API-Version': '1.0.0',
    };
    
    // Set default timeout
    dio.options.connectTimeout = const Duration(seconds: 30);
    dio.options.receiveTimeout = const Duration(seconds: 30);
    
    
    
    // Add logging interceptor in debug mode
    if (const bool.fromEnvironment(&#x27;DEBUG&#x27;, defaultValue: false)) {
      dio.interceptors.add(LogInterceptor(
        request: true,
        requestHeader: true,
        requestBody: true,
        responseHeader: true,
        responseBody: true,
        error: true,
        logPrint: (obj) => print(obj),
      ));
    }
    
    // Add error handling interceptor
    dio.interceptors.add(
      InterceptorsWrapper(
        onError: (DioException error, handler) {
          // Handle common errors
          if (error.response != null) {
            switch (error.response?.statusCode) {
              case 401:
                // Handle unauthorized
                _handleUnauthorized();
                break;
              case 403:
                // Handle forbidden
                _handleForbidden();
                break;
              case 404:
                // Handle not found
                break;
              case 500:
              case 502:
              case 503:
                // Handle server errors
                _handleServerError(error);
                break;
            }
          }
          handler.next(error);
        },
      ),
    );
  }
  
  
  void _handleUnauthorized() {
    // Clear auth token and redirect to login
    // You can emit an event or call a callback here
  }
  
  void _handleForbidden() {
    // Handle forbidden access
  }
  
  void _handleServerError(DioException error) {
    // Log server error or show notification
  }
  
  /// Create a new instance with custom configuration
  ApiClient copyWith({
    String? baseUrl,
    Dio? dioClient,
  }) {
    return ApiClient(
      baseUrl: baseUrl ?? this.baseUrl,
      dioClient: dioClient ?? dio,
    );
  }
  
  /// Dispose of the client
  void dispose() {
    dio.close();
  }
  
  // HTTP method wrappers
  
  /// Perform GET request
  Future<Response<T>> get<T>(
    String path, {
    Map<String, dynamic>? queryParameters,
    Options? options,
    CancelToken? cancelToken,
    void Function(int, int)? onReceiveProgress,
  }) {
    return dio.get<T>(
      path,
      queryParameters: queryParameters,
      options: options,
      cancelToken: cancelToken,
      onReceiveProgress: onReceiveProgress,
    );
  }
  
  /// Perform POST request
  Future<Response<T>> post<T>(
    String path, {
    dynamic data,
    Map<String, dynamic>? queryParameters,
    Options? options,
    CancelToken? cancelToken,
    void Function(int, int)? onSendProgress,
    void Function(int, int)? onReceiveProgress,
  }) {
    return dio.post<T>(
      path,
      data: data,
      queryParameters: queryParameters,
      options: options,
      cancelToken: cancelToken,
      onSendProgress: onSendProgress,
      onReceiveProgress: onReceiveProgress,
    );
  }
  
  /// Perform PUT request
  Future<Response<T>> put<T>(
    String path, {
    dynamic data,
    Map<String, dynamic>? queryParameters,
    Options? options,
    CancelToken? cancelToken,
    void Function(int, int)? onSendProgress,
    void Function(int, int)? onReceiveProgress,
  }) {
    return dio.put<T>(
      path,
      data: data,
      queryParameters: queryParameters,
      options: options,
      cancelToken: cancelToken,
      onSendProgress: onSendProgress,
      onReceiveProgress: onReceiveProgress,
    );
  }
  
  /// Perform PATCH request
  Future<Response<T>> patch<T>(
    String path, {
    dynamic data,
    Map<String, dynamic>? queryParameters,
    Options? options,
    CancelToken? cancelToken,
    void Function(int, int)? onSendProgress,
    void Function(int, int)? onReceiveProgress,
  }) {
    return dio.patch<T>(
      path,
      data: data,
      queryParameters: queryParameters,
      options: options,
      cancelToken: cancelToken,
      onSendProgress: onSendProgress,
      onReceiveProgress: onReceiveProgress,
    );
  }
  
  /// Perform DELETE request
  Future<Response<T>> delete<T>(
    String path, {
    dynamic data,
    Map<String, dynamic>? queryParameters,
    Options? options,
    CancelToken? cancelToken,
  }) {
    return dio.delete<T>(
      path,
      data: data,
      queryParameters: queryParameters,
      options: options,
      cancelToken: cancelToken,
    );
  }
  
  /// Perform HEAD request
  Future<Response<T>> head<T>(
    String path, {
    dynamic data,
    Map<String, dynamic>? queryParameters,
    Options? options,
    CancelToken? cancelToken,
  }) {
    return dio.head<T>(
      path,
      data: data,
      queryParameters: queryParameters,
      options: options,
      cancelToken: cancelToken,
    );
  }
}
