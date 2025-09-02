/// Custom exception for API errors
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
    return 'ApiException: [$statusCode] $message';
  }
}
