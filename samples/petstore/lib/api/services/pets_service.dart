import 'package:dio/dio.dart';
import '../api_client.dart';
import 'api_exception.dart';
import '../models/index.dart';

class PetsService {
  final ApiClient client;
  
  PetsService(this.client);
  
  /// List all pets
  Future<List<Pet>> listPets( {
    ListPetsParams? params,
    
  }) async {
    const path = '/pets';
    
    // Build query parameters
    // Use standard toJson for simple parameters
    final paramsJson = params?.toJson() ?? <String, dynamic>{};
    final queryParameters = <String, dynamic>{
      for (final entry in paramsJson.entries)
        if (entry.value != null) entry.key: entry.value,
    };
    
    
    try {
      final response = await client.get(
        path,
        queryParameters: queryParameters,
      );
      
      return (response.data as List<dynamic>)
          .map((item) => Pet.fromJson(item as Map<String, dynamic>))
          .toList();
    } on DioException catch (e) {
      throw ApiException(
        statusCode: e.response?.statusCode,
        message: e.message ?? 'Unknown error occurred',
        error: e,
      );
    }
  }
  /// Create a pet
  Future<Pet> createPets(
    NewPet body,) async {
    const path = '/pets';
    
    
    
    try {
      final response = await client.post(
        path,
        data: body,
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
  /// Info for a specific pet
  Future<Pet> showPetById(
    String petId,) async {
    // Build path with parameters
    final path = '/pets/{petId}'.replaceAll('{petId}', petId.toString());
    
    
    
    try {
      final response = await client.get(
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
  /// Update a pet
  Future<Pet> updatePet(
    String petId,
    NewPet body,) async {
    // Build path with parameters
    final path = '/pets/{petId}'.replaceAll('{petId}', petId.toString());
    
    
    
    try {
      final response = await client.put(
        path,
        data: body,
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
  /// Delete a pet
  Future<void> deletePet(
    String petId,) async {
    // Build path with parameters
    final path = '/pets/{petId}'.replaceAll('{petId}', petId.toString());
    
    
    
    try {
      final response = await client.delete(
        path,
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
  /// Find pets by status
  Future<List<Pet>> findPetsByStatus( {
    FindPetsByStatusParams? params,
    
  }) async {
    const path = '/pets/findByStatus';
    
    // Build query parameters
    // Use standard toJson for simple parameters
    final paramsJson = params?.toJson() ?? <String, dynamic>{};
    final queryParameters = <String, dynamic>{
      for (final entry in paramsJson.entries)
        if (entry.value != null) entry.key: entry.value,
    };
    
    
    try {
      final response = await client.get(
        path,
        queryParameters: queryParameters,
      );
      
      return (response.data as List<dynamic>)
          .map((item) => Pet.fromJson(item as Map<String, dynamic>))
          .toList();
    } on DioException catch (e) {
      throw ApiException(
        statusCode: e.response?.statusCode,
        message: e.message ?? 'Unknown error occurred',
        error: e,
      );
    }
  }
}
