import 'package:dio/dio.dart';
import '../lib/api/api_client.dart';
import '../lib/api/services/pets_service.dart';
import '../lib/api/models/pet.f.dart';
import '../lib/api/models/new_pet.f.dart';
import '../lib/api/models/category.f.dart';
import '../lib/api/models/params/list_pets_params.f.dart';
import '../lib/api/models/params/find_pets_by_status_params.f.dart';

void main() async {
  // Initialize Dio client
  final dio = Dio(BaseOptions(
    baseUrl: 'http://petstore.swagger.io/v1',
    connectTimeout: const Duration(seconds: 5),
    receiveTimeout: const Duration(seconds: 3),
  ));

  // Add logging interceptor
  dio.interceptors.add(LogInterceptor(
    requestBody: true,
    responseBody: true,
  ));

  // Create API client
  final apiClient = ApiClient(dio);
  
  // Create service instance
  final petsService = PetsService(apiClient);

  try {
    print('🐾 Petstore API Demo');
    print('=' * 50);

    // Example 1: List pets
    print('\n📋 Listing pets...');
    final listParams = ListPetsParams(
      limit: 5,
      offset: 0,
    );
    final pets = await petsService.listPets(params: listParams);
    print('Found ${pets.length} pets:');
    for (var pet in pets) {
      print('  - ${pet.name} (ID: ${pet.id})');
    }

    // Example 2: Create a new pet
    print('\n➕ Creating a new pet...');
    final newPet = NewPet(
      name: 'Fluffy',
      tag: 'cat',
      category: Category(
        id: 1,
        name: 'Cats',
      ),
      status: 'available',
      photoUrls: ['https://example.com/fluffy.jpg'],
    );

    final createdPet = await petsService.createPets(newPet);
    print('Created pet: ${createdPet.name} with ID: ${createdPet.id}');

    // Example 3: Get a specific pet
    print('\n🔍 Getting pet by ID...');
    final pet = await petsService.showPetById('1');
    print('Pet details:');
    print('  Name: ${pet.name}');
    print('  ID: ${pet.id}');
    print('  Tag: ${pet.tag}');
    print('  Status: ${pet.status}');

    // Example 4: Find pets by status
    print('\n🔎 Finding pets by status...');
    final statusParams = FindPetsByStatusParams(
      status: ['available'],
    );
    final availablePets = await petsService.findPetsByStatus(params: statusParams);
    print('Found ${availablePets.length} available pets');
    for (var pet in availablePets.take(3)) {
      print('  - ${pet.name} (Status: ${pet.status})');
    }

    // Example 5: Update a pet
    print('\n✏️ Updating a pet...');
    final updateData = NewPet(
      name: 'Fluffy Updated',
      tag: 'cat',
      status: 'sold',
    );
    
    final updatedPet = await petsService.updatePet('1', updateData);
    print('Updated pet: ${updatedPet.name} (Status: ${updatedPet.status})');

    // Example 6: Delete a pet
    print('\n🗑️ Deleting a pet...');
    await petsService.deletePet('999');
    print('Pet deleted successfully');

  } catch (e) {
    print('\n❌ Error: $e');
    if (e is DioException) {
      print('Response: ${e.response?.data}');
      print('Status Code: ${e.response?.statusCode}');
    }
  }
}