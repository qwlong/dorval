import 'dart:io';
import 'package:dio/dio.dart';
import '../lib/api/api_client.dart';
import '../lib/api/services/pets_service.dart';
import '../lib/api/models/pet.f.dart';
import '../lib/api/models/new_pet.f.dart';
import '../lib/api/models/category.f.dart';
import '../lib/api/models/error.f.dart';

/// Example Petstore API client usage
/// 
/// This demonstrates all CRUD operations with proper error handling
/// and shows how to work with the generated Dart API client.
void main() async {
  // Initialize Dio with base configuration
  final dio = Dio(BaseOptions(
    baseUrl: 'https://petstore.swagger.io/v1',
    connectTimeout: const Duration(seconds: 5),
    receiveTimeout: const Duration(seconds: 3),
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
    },
  ));

  // Add logging interceptor for debugging
  dio.interceptors.add(LogInterceptor(
    requestBody: true,
    responseBody: true,
    error: true,
    requestHeader: false,
    responseHeader: false,
  ));

  // Create the API client wrapper
  final apiClient = ApiClient(dio: dio);
  
  // Create the pets service
  final petsService = PetsService(apiClient.dio);

  print('🐾 Petstore API Demo\n');
  print('=' * 50);

  // Run interactive demo
  await runInteractiveDemo(petsService);
}

/// Run an interactive demo with menu options
Future<void> runInteractiveDemo(PetsService service) async {
  bool running = true;
  
  while (running) {
    print('\n📋 Choose an operation:');
    print('1. List all pets');
    print('2. Create a new pet');
    print('3. Get pet by ID');
    print('4. Find pets by status');
    print('5. Update a pet');
    print('6. Delete a pet');
    print('7. Run all examples');
    print('0. Exit');
    print('\nEnter your choice: ');
    
    final choice = stdin.readLineSync() ?? '0';
    
    switch (choice) {
      case '1':
        await _listPets(service);
        break;
      case '2':
        await _createPet(service);
        break;
      case '3':
        print('Enter pet ID: ');
        final id = stdin.readLineSync();
        if (id != null && id.isNotEmpty) {
          await _getPetById(service, id);
        }
        break;
      case '4':
        await _findPetsByStatus(service);
        break;
      case '5':
        print('Enter pet ID to update: ');
        final id = stdin.readLineSync();
        if (id != null && id.isNotEmpty) {
          await _updatePet(service, id);
        }
        break;
      case '6':
        print('Enter pet ID to delete: ');
        final id = stdin.readLineSync();
        if (id != null && id.isNotEmpty) {
          await _deletePet(service, id);
        }
        break;
      case '7':
        await _runAllExamples(service);
        break;
      case '0':
        running = false;
        print('\n👋 Goodbye!');
        break;
      default:
        print('Invalid choice. Please try again.');
    }
    
    if (running && choice != '7') {
      print('\nPress Enter to continue...');
      stdin.readLineSync();
    }
  }
}

/// Run all examples in sequence
Future<void> _runAllExamples(PetsService service) async {
  print('\n🚀 Running all examples...\n');
  
  // Example 1: List pets
  await _listPets(service);
  
  // Example 2: Create a pet
  final petId = await _createPet(service);
  
  // Example 3: Get pet by ID
  if (petId != null) {
    await _getPetById(service, petId);
  }
  
  // Example 4: Find pets by status
  await _findPetsByStatus(service);
  
  // Example 5: Update pet
  if (petId != null) {
    await _updatePet(service, petId);
  }
  
  // Example 6: Delete pet
  if (petId != null) {
    await _deletePet(service, petId);
  }
}

/// Example 1: List all pets
Future<void> _listPets(PetsService service) async {
  print('\n📋 Listing pets...');
  print('-' * 30);
  
  try {
    // Note: The API currently returns Map<String, dynamic>
    // We need to manually cast to the correct type
    final response = await service.listPets(limit: 10, offset: 0);
    
    if (response is List) {
      if (response.isEmpty) {
        print('No pets found.');
      } else {
        print('Found ${response.length} pets:\n');
        for (var i = 0; i < response.length && i < 5; i++) {
          final petData = response[i] as Map<String, dynamic>;
          final pet = Pet.fromJson(petData);
          print('  ${i + 1}. ${pet.name}');
          print('     ID: ${pet.id}');
          if (pet.tag != null) print('     Tag: ${pet.tag}');
          if (pet.status != null) print('     Status: ${pet.status}');
          if (pet.category != null) {
            print('     Category: ${pet.category!.name}');
          }
          print('');
        }
        if (response.length > 5) {
          print('  ... and ${response.length - 5} more pets\n');
        }
      }
    } else {
      print('Unexpected response type: ${response.runtimeType}');
    }
  } on DioException catch (e) {
    _handleDioError(e);
  }
}

/// Example 2: Create a new pet
Future<String?> _createPet(PetsService service) async {
  print('\n➕ Creating a new pet...');
  print('-' * 30);
  
  try {
    // Generate unique name with timestamp
    final timestamp = DateTime.now().millisecondsSinceEpoch;
    final petName = 'Buddy_$timestamp';
    
    final newPet = NewPet(
      name: petName,
      tag: 'dog',
      category: Category(
        id: 1,
        name: 'Dogs',
      ),
      photoUrls: [
        'https://example.com/photos/buddy1.jpg',
        'https://example.com/photos/buddy2.jpg',
      ],
      status: 'available',
    );
    
    print('Creating pet with name: ${newPet.name}');
    print('Category: ${newPet.category?.name}');
    print('Status: ${newPet.status}');
    
    final response = await service.createPets(newPet.toJson());
    
    if (response is Map<String, dynamic>) {
      final createdPet = Pet.fromJson(response);
      print('\n✅ Pet created successfully!');
      print('  ID: ${createdPet.id}');
      print('  Name: ${createdPet.name}');
      return createdPet.id?.toString();
    } else {
      print('Unexpected response type: ${response.runtimeType}');
      return null;
    }
  } on DioException catch (e) {
    _handleDioError(e);
    return null;
  }
}

/// Example 3: Get pet by ID
Future<void> _getPetById(PetsService service, String petId) async {
  print('\n🔍 Getting pet by ID: $petId...');
  print('-' * 30);
  
  try {
    final response = await service.showPetById(petId);
    
    if (response is Map<String, dynamic>) {
      final pet = Pet.fromJson(response);
      print('\n✅ Found pet:');
      print('  ID: ${pet.id}');
      print('  Name: ${pet.name}');
      print('  Tag: ${pet.tag ?? "N/A"}');
      print('  Status: ${pet.status ?? "N/A"}');
      
      if (pet.category != null) {
        print('  Category:');
        print('    ID: ${pet.category!.id}');
        print('    Name: ${pet.category!.name}');
      }
      
      if (pet.photoUrls != null && pet.photoUrls!.isNotEmpty) {
        print('  Photo URLs:');
        for (var url in pet.photoUrls!) {
          print('    - $url');
        }
      }
    } else if (response == null) {
      print('Pet not found');
    } else {
      print('Unexpected response type: ${response.runtimeType}');
    }
  } on DioException catch (e) {
    _handleDioError(e);
  }
}

/// Example 4: Find pets by status
Future<void> _findPetsByStatus(PetsService service) async {
  print('\n🔎 Finding pets by status...');
  print('-' * 30);
  
  try {
    print('Choose status (comma-separated):');
    print('  available, pending, sold');
    print('Enter status: ');
    
    final input = stdin.readLineSync() ?? 'available';
    final statuses = input.split(',').map((s) => s.trim()).toList();
    
    print('\nSearching for pets with status: ${statuses.join(', ')}');
    
    final response = await service.findPetsByStatus(status: statuses);
    
    if (response is List) {
      if (response.isEmpty) {
        print('No pets found with the specified status.');
      } else {
        print('Found ${response.length} pets:\n');
        
        // Group by status
        final Map<String, List<Pet>> petsByStatus = {};
        for (var petData in response) {
          if (petData is Map<String, dynamic>) {
            final pet = Pet.fromJson(petData);
            final status = pet.status ?? 'unknown';
            petsByStatus.putIfAbsent(status, () => []).add(pet);
          }
        }
        
        // Display grouped results
        petsByStatus.forEach((status, pets) {
          print('  📊 Status: "$status" (${pets.length} pets)');
          for (var i = 0; i < pets.length && i < 3; i++) {
            print('     - ${pets[i].name} (ID: ${pets[i].id})');
          }
          if (pets.length > 3) {
            print('     ... and ${pets.length - 3} more');
          }
          print('');
        });
      }
    } else {
      print('Unexpected response type: ${response.runtimeType}');
    }
  } on DioException catch (e) {
    _handleDioError(e);
  }
}

/// Example 5: Update a pet
Future<void> _updatePet(PetsService service, String petId) async {
  print('\n✏️ Updating pet ID: $petId...');
  print('-' * 30);
  
  try {
    // First, get the current pet data
    print('Fetching current pet data...');
    final currentResponse = await service.showPetById(petId);
    
    if (currentResponse is Map<String, dynamic>) {
      final currentPet = Pet.fromJson(currentResponse);
      print('Current pet: ${currentPet.name}');
      print('Current status: ${currentPet.status}');
      
      // Update with new data
      final updatedPet = NewPet(
        name: '${currentPet.name}_Updated',
        tag: 'updated',
        category: currentPet.category,
        status: 'sold',
        photoUrls: currentPet.photoUrls,
      );
      
      print('\nUpdating to:');
      print('  Name: ${updatedPet.name}');
      print('  Tag: ${updatedPet.tag}');
      print('  Status: ${updatedPet.status}');
      
      final response = await service.updatePet(
        petId,
        updatedPet.toJson(),
      );
      
      if (response is Map<String, dynamic>) {
        final pet = Pet.fromJson(response);
        print('\n✅ Pet updated successfully!');
        print('  New name: ${pet.name}');
        print('  New tag: ${pet.tag}');
        print('  New status: ${pet.status}');
      } else {
        print('Unexpected response type: ${response.runtimeType}');
      }
    } else {
      print('Pet not found');
    }
  } on DioException catch (e) {
    _handleDioError(e);
  }
}

/// Example 6: Delete a pet
Future<void> _deletePet(PetsService service, String petId) async {
  print('\n🗑️ Deleting pet ID: $petId...');
  print('-' * 30);
  
  print('Are you sure you want to delete this pet? (y/n): ');
  final confirm = stdin.readLineSync()?.toLowerCase();
  
  if (confirm != 'y') {
    print('Deletion cancelled.');
    return;
  }
  
  try {
    await service.deletePet(petId);
    print('✅ Pet deleted successfully!');
    
    // Verify deletion
    print('\nVerifying deletion...');
    try {
      final response = await service.showPetById(petId);
      if (response != null) {
        print('⚠️ Warning: Pet may still exist in the system');
      }
    } on DioException catch (e) {
      if (e.response?.statusCode == 404) {
        print('✅ Confirmed: Pet no longer exists');
      } else {
        throw e;
      }
    }
  } on DioException catch (e) {
    _handleDioError(e);
  }
}

/// Handle Dio errors with detailed information
void _handleDioError(DioException e) {
  print('\n❌ API Error:');
  
  if (e.response != null) {
    print('  Status Code: ${e.response!.statusCode}');
    print('  Status Message: ${e.response!.statusMessage}');
    
    // Try to parse error response
    if (e.response!.data is Map<String, dynamic>) {
      try {
        final error = Error.fromJson(e.response!.data);
        print('  Error Details:');
        print('    Code: ${error.code}');
        print('    Message: ${error.message}');
      } catch (_) {
        print('  Response Data: ${e.response!.data}');
      }
    } else if (e.response!.data is String) {
      print('  Response: ${e.response!.data}');
    }
  } else {
    // Network or connection errors
    switch (e.type) {
      case DioExceptionType.connectionTimeout:
        print('  Connection timeout - server took too long to respond');
        break;
      case DioExceptionType.receiveTimeout:
        print('  Receive timeout - server response was too slow');
        break;
      case DioExceptionType.connectionError:
        print('  Connection error - check your internet connection');
        print('  Details: ${e.message}');
        break;
      case DioExceptionType.cancel:
        print('  Request was cancelled');
        break;
      default:
        print('  Unexpected error: ${e.message}');
    }
  }
}