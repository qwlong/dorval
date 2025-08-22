import 'package:dio/dio.dart';
import '../api_client.dart';
import '../models/index.dart';
import '../models/params/index.dart';

class PetsService {
  final ApiClient client;
  
  PetsService(this.client);
  
      /// List all pets
  Future<PetsArray> listPets( {
    ListPetsParams? params,
    
  }) async {
    const path = '/pets';
    
    // Build query parameters
    final queryParameters = params?.toJson() ?? <String, dynamic>{};
    
    
    try {
      final response = await client.get<PetsArray>(
        '/pets',
        queryParameters: queryParameters,
      );
      
      return PetsArray.fromJson(response.data as Map<String, dynamic>);
    } on DioException catch (e) {
      throw ApiException(
        statusCode: e.response?.statusCode,
        message: e.message ?? 'Unknown error occurred',
        error: e,
      );
    }
  }
      /// Create a pet
  Future<void> createPets(
    Map<String, dynamic> body,) async {
    const path = '/pets';
    
    
    
    try {
      final response = await client.post(
        '/pets',
        data: body,
      );
      
      return;
    } on DioException catch (e) {
      throw ApiException(
        statusCode: e.response?.statusCode,
        message: e.message ?? 'Unknown error occurred',
        error: e,
      );
    }
  }
      /// Info for a specific pet
  Future<Pet> showPetById(
    String petId,
    String testId,) async {
    // Build path with parameters
    final path = '/pets/{petId}'.replaceAll('{petId}', petId.toString()).replaceAll('{testId}', testId.toString());
    
    
    
    try {
      final response = await client.get<Pet>(
        path,
      );
      
      return Pet.fromJson(response.data as Map<String, dynamic>);
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
