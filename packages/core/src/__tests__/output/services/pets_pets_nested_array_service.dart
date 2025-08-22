import 'package:dio/dio.dart';
import '../api_client.dart';
import '../models/index.dart';
import '../models/params/index.dart';

class PetsPetsNestedArrayService {
  final ApiClient client;
  
  PetsPetsNestedArrayService(this.client);
  
      /// List all pets as nested array
  Future<PetsNestedArray> listPetsNestedArray( {
    ListPetsNestedArrayParams? params,
    
  }) async {
    const path = '/pets-nested-array';
    
    // Build query parameters
    final queryParameters = params?.toJson() ?? <String, dynamic>{};
    
    
    try {
      final response = await client.get<PetsNestedArray>(
        '/pets-nested-array',
        queryParameters: queryParameters,
      );
      
      return PetsNestedArray.fromJson(response.data as Map<String, dynamic>);
    } on DioException catch (e) {
      throw ApiException(
        statusCode: e.response?.statusCode,
        message: e.message ?? 'Unknown error occurred',
        error: e,
      );
    }
  }
}

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
