import 'package:test/test.dart';
import 'package:dio/dio.dart';

import '../lib/api/api_client.dart';
import '../lib/api/services/pets_service.dart';
import '../lib/api/services/api_exception.dart';
import '../lib/api/models/pet.f.dart';
import '../lib/api/models/new_pet.f.dart';
import '../lib/api/models/category.f.dart';

/// A test interceptor that returns mock responses
class MockInterceptor extends Interceptor {
  final Map<String, dynamic> responses;
  
  MockInterceptor({required this.responses});
  
  @override
  void onRequest(RequestOptions options, RequestInterceptorHandler handler) {
    final key = '${options.method} ${options.path}';
    if (responses.containsKey(key)) {
      final mockData = responses[key];
      handler.resolve(
        Response(
          requestOptions: options,
          data: mockData['data'],
          statusCode: mockData['statusCode'] ?? 200,
          statusMessage: mockData['statusMessage'] ?? 'OK',
        ),
      );
    } else {
      handler.next(options);
    }
  }
}

void main() {
  group('PetsService Tests', () {
    late Dio dio;
    late ApiClient apiClient;
    late PetsService petsService;
    late MockInterceptor mockInterceptor;

    setUp(() {
      dio = Dio();
      dio.options.baseUrl = 'https://petstore.swagger.io/v1';
      
      // Create API client with the mock dio
      apiClient = ApiClient(dioClient: dio);
      petsService = PetsService(apiClient);
      
      // Clear any existing interceptors
      dio.interceptors.clear();
    });

    group('List Pets', () {
      test('should return list of pets successfully', () async {
        // Arrange
        final mockResponse = [
          {
            'id': 1,
            'name': 'Fluffy',
            'tag': 'cat',
            'status': 'available',
            'category': {'id': 1, 'name': 'Cats'},
            'photoUrls': ['https://example.com/fluffy.jpg'],
          },
          {
            'id': 2,
            'name': 'Buddy',
            'tag': 'dog',
            'status': 'sold',
            'category': {'id': 2, 'name': 'Dogs'},
            'photoUrls': ['https://example.com/buddy.jpg'],
          },
        ];
        
        mockInterceptor = MockInterceptor(
          responses: {
            'GET /pets': {
              'data': mockResponse,
              'statusCode': 200,
            },
          },
        );
        dio.interceptors.add(mockInterceptor);
        
        // Act
        final result = await petsService.listPets();
        
        // Assert
        expect(result, isNotNull);
        expect(result, isA<List<Pet>>());
        expect(result.length, equals(2));
        expect(result[0].name, equals('Fluffy'));
        expect(result[1].name, equals('Buddy'));
      });

      test('should handle empty list', () async {
        // Arrange
        mockInterceptor = MockInterceptor(
          responses: {
            'GET /pets': {
              'data': [],
              'statusCode': 200,
            },
          },
        );
        dio.interceptors.add(mockInterceptor);
        
        // Act
        final result = await petsService.listPets();
        
        // Assert
        expect(result, isNotNull);
        expect(result, isA<List<Pet>>());
        expect(result.length, equals(0));
      });

      test('should handle error response', () async {
        // Arrange - Don't mock, let real error happen
        dio.interceptors.add(
          InterceptorsWrapper(
            onRequest: (options, handler) {
              handler.reject(
                DioException(
                  requestOptions: options,
                  response: Response(
                    requestOptions: options,
                    statusCode: 500,
                    data: {'message': 'Internal Server Error'},
                  ),
                  type: DioExceptionType.badResponse,
                ),
              );
            },
          ),
        );
        
        // Act & Assert
        expect(
          () => petsService.listPets(),
          throwsA(isA<ApiException>()),
        );
      });
    });

    group('Get Pet by ID', () {
      test('should return pet successfully', () async {
        // Arrange
        final mockPet = {
          'id': 1,
          'name': 'Fluffy',
          'tag': 'cat',
          'status': 'available',
          'category': {'id': 1, 'name': 'Cats'},
          'photoUrls': ['https://example.com/fluffy.jpg'],
        };
        
        mockInterceptor = MockInterceptor(
          responses: {
            'GET /pets/1': {
              'data': mockPet,
              'statusCode': 200,
            },
          },
        );
        dio.interceptors.add(mockInterceptor);
        
        // Act
        final result = await petsService.showPetById('1');
        
        // Assert
        expect(result, isNotNull);
        expect(result, isA<Pet>());
        expect(result.name, equals('Fluffy'));
        expect(result.id, equals(1));
      });

      test('should handle 404 not found', () async {
        // Arrange - Use interceptor to reject with error
        dio.interceptors.add(
          InterceptorsWrapper(
            onRequest: (options, handler) {
              if (options.path.contains('/pets/999')) {
                handler.reject(
                  DioException(
                    requestOptions: options,
                    response: Response(
                      requestOptions: options,
                      statusCode: 404,
                      data: {'message': 'Pet not found'},
                    ),
                    type: DioExceptionType.badResponse,
                  ),
                );
              } else {
                handler.next(options);
              }
            },
          ),
        );
        
        // Act & Assert
        expect(
          () => petsService.showPetById('999'),
          throwsA(isA<ApiException>()),
        );
      });
    });

    group('Create Pet', () {
      test('should create pet successfully', () async {
        // Arrange
        final newPet = NewPet(
          name: 'Fluffy',
          tag: 'cat',
        );
        
        final createdPet = {
          'id': 3,
          'name': 'Fluffy',
          'tag': 'cat',
          'status': 'available',
        };
        
        mockInterceptor = MockInterceptor(
          responses: {
            'POST /pets': {
              'data': createdPet,
              'statusCode': 201,
            },
          },
        );
        dio.interceptors.add(mockInterceptor);
        
        // Act
        final result = await petsService.createPets(newPet);
        
        // Assert
        expect(result, isNotNull);
        expect(result, isA<Pet>());
        expect(result.name, equals('Fluffy'));
        expect(result.id, equals(3));
      });

      test('should handle validation error', () async {
        // Arrange
        final invalidPet = NewPet(
          name: '', // Empty name
          tag: 'cat',
        );
        
        dio.interceptors.add(
          InterceptorsWrapper(
            onRequest: (options, handler) {
              if (options.method == 'POST' && options.path.contains('/pets')) {
                handler.reject(
                  DioException(
                    requestOptions: options,
                    response: Response(
                      requestOptions: options,
                      statusCode: 400,
                      data: {'message': 'Validation failed'},
                    ),
                    type: DioExceptionType.badResponse,
                  ),
                );
              } else {
                handler.next(options);
              }
            },
          ),
        );
        
        // Act & Assert
        expect(
          () => petsService.createPets(invalidPet),
          throwsA(isA<ApiException>()),
        );
      });
    });

    group('Update Pet', () {
      test('should update pet successfully', () async {
        // Arrange
        final updateData = NewPet(
          name: 'Fluffy Updated',
          tag: 'cat',
        );
        
        final updatedPet = {
          'id': 1,
          'name': 'Fluffy Updated',
          'tag': 'cat',
          'status': 'available',
        };
        
        mockInterceptor = MockInterceptor(
          responses: {
            'PUT /pets/1': {
              'data': updatedPet,
              'statusCode': 200,
            },
          },
        );
        dio.interceptors.add(mockInterceptor);
        
        // Act
        final result = await petsService.updatePet('1', updateData);
        
        // Assert
        expect(result, isNotNull);
        expect(result, isA<Pet>());
        expect(result.name, equals('Fluffy Updated'));
        expect(result.id, equals(1));
      });
    });

    group('Delete Pet', () {
      test('should delete pet successfully', () async {
        // Arrange
        mockInterceptor = MockInterceptor(
          responses: {
            'DELETE /pets/1': {
              'data': null,
              'statusCode': 204,
            },
          },
        );
        dio.interceptors.add(mockInterceptor);
        
        // Act & Assert
        // deletePet returns void, so we just verify it doesn't throw
        await expectLater(
          petsService.deletePet('1'),
          completes,
        );
      });

      test('should handle 404 when deleting non-existent pet', () async {
        // Arrange - Use interceptor to reject with error
        dio.interceptors.add(
          InterceptorsWrapper(
            onRequest: (options, handler) {
              if (options.method == 'DELETE' && options.path.contains('/pets/999')) {
                handler.reject(
                  DioException(
                    requestOptions: options,
                    response: Response(
                      requestOptions: options,
                      statusCode: 404,
                      data: {'message': 'Pet not found'},
                    ),
                    type: DioExceptionType.badResponse,
                  ),
                );
              } else {
                handler.next(options);
              }
            },
          ),
        );
        
        // Act & Assert
        expect(
          () => petsService.deletePet('999'),
          throwsA(isA<ApiException>()),
        );
      });
    });

    group('Find Pets by Status', () {
      test('should return pets with matching status', () async {
        // Arrange
        final availablePets = [
          {
            'id': 1,
            'name': 'Fluffy',
            'status': 'available',
          },
          {
            'id': 3,
            'name': 'Max',
            'status': 'available',
          },
        ];
        
        mockInterceptor = MockInterceptor(
          responses: {
            'GET /pets/findByStatus': {
              'data': availablePets,
              'statusCode': 200,
            },
          },
        );
        dio.interceptors.add(mockInterceptor);
        
        // Act
        final result = await petsService.findPetsByStatus();
        
        // Assert
        expect(result, isNotNull);
        expect(result, isA<List<Pet>>());
        expect(result.length, equals(2));
        expect(result[0].status, equals('available'));
        expect(result[1].status, equals('available'));
      });
    });
  });

  group('Model Tests', () {
    test('Pet model should serialize/deserialize correctly', () {
      // Create a pet with category
      final category = Category(id: 1, name: 'Cats');
      final pet = Pet(
        id: 1,
        name: 'Fluffy',
        category: category,
        photoUrls: ['https://example.com/fluffy.jpg'],
        status: 'available',
      );
      
      // Convert to JSON
      final json = pet.toJson();
      expect(json['id'], equals(1));
      expect(json['name'], equals('Fluffy'));
      expect(json['category'], isNotNull);
      expect(json['category']['name'], equals('Cats'));
      
      // Convert back from JSON
      final petFromJson = Pet.fromJson(json);
      expect(petFromJson.id, equals(pet.id));
      expect(petFromJson.name, equals(pet.name));
      expect(petFromJson.category?.name, equals('Cats'));
    });

    test('NewPet model should serialize correctly', () {
      final newPet = NewPet(
        name: 'Buddy',
        tag: 'dog',
      );
      
      final json = newPet.toJson();
      expect(json['name'], equals('Buddy'));
      expect(json['tag'], equals('dog'));
    });

    test('Category model should handle null values', () {
      final category = Category();
      
      final json = category.toJson();
      expect(json['id'], isNull);
      expect(json['name'], isNull);
      
      final categoryFromJson = Category.fromJson({});
      expect(categoryFromJson.id, isNull);
      expect(categoryFromJson.name, isNull);
    });
  });
}