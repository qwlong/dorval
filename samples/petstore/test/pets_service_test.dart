import 'package:test/test.dart';
import 'package:dio/dio.dart';
import 'package:mockito/annotations.dart';
import 'package:mockito/mockito.dart';

import '../lib/api/api_client.dart';
import '../lib/api/services/pets_service.dart';
import '../lib/api/models/pet.f.dart';
import '../lib/api/models/new_pet.f.dart';
import '../lib/api/models/category.f.dart';
import '../lib/api/models/error.f.dart' as api_error;

import 'pets_service_test.mocks.dart';

// Generate mock classes
@GenerateMocks([Dio, ApiClient])
void main() {
  group('PetsService Tests', () {
    late MockDio mockDio;
    late PetsService petsService;

    setUp(() {
      mockDio = MockDio();
      petsService = PetsService(mockDio);
      
      // Setup default base options
      when(mockDio.options).thenReturn(BaseOptions(
        baseUrl: 'https://petstore.swagger.io/v1',
      ));
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

        when(mockDio.get(
          '/pets',
          queryParameters: anyNamed('queryParameters'),
          options: anyNamed('options'),
        )).thenAnswer((_) async => Response(
          data: mockResponse,
          statusCode: 200,
          requestOptions: RequestOptions(path: '/pets'),
        ));

        // Act
        final result = await petsService.listPets(limit: 10, offset: 0);

        // Assert
        expect(result, isA<List>());
        expect((result as List).length, equals(2));
        
        final firstPet = Pet.fromJson(result[0] as Map<String, dynamic>);
        expect(firstPet.name, equals('Fluffy'));
        expect(firstPet.id, equals(1));
        expect(firstPet.status, equals('available'));
        expect(firstPet.category?.name, equals('Cats'));
        
        final secondPet = Pet.fromJson(result[1] as Map<String, dynamic>);
        expect(secondPet.name, equals('Buddy'));
        expect(secondPet.status, equals('sold'));
      });

      test('should handle empty list response', () async {
        // Arrange
        when(mockDio.get(
          '/pets',
          queryParameters: anyNamed('queryParameters'),
          options: anyNamed('options'),
        )).thenAnswer((_) async => Response(
          data: [],
          statusCode: 200,
          requestOptions: RequestOptions(path: '/pets'),
        ));

        // Act
        final result = await petsService.listPets();

        // Assert
        expect(result, isA<List>());
        expect((result as List).isEmpty, isTrue);
      });

      test('should pass query parameters correctly', () async {
        // Arrange
        when(mockDio.get(
          '/pets',
          queryParameters: {'limit': 5, 'offset': 10},
          options: anyNamed('options'),
        )).thenAnswer((_) async => Response(
          data: [],
          statusCode: 200,
          requestOptions: RequestOptions(path: '/pets'),
        ));

        // Act
        await petsService.listPets(limit: 5, offset: 10);

        // Assert
        verify(mockDio.get(
          '/pets',
          queryParameters: {'limit': 5, 'offset': 10},
          options: anyNamed('options'),
        )).called(1);
      });
    });

    group('Get Pet by ID', () {
      test('should return specific pet successfully', () async {
        // Arrange
        final mockPet = {
          'id': 123,
          'name': 'Max',
          'tag': 'dog',
          'status': 'available',
          'category': {
            'id': 2,
            'name': 'Dogs',
          },
          'photoUrls': [
            'https://example.com/max1.jpg',
            'https://example.com/max2.jpg',
          ],
        };

        when(mockDio.get(
          '/pets/123',
          options: anyNamed('options'),
        )).thenAnswer((_) async => Response(
          data: mockPet,
          statusCode: 200,
          requestOptions: RequestOptions(path: '/pets/123'),
        ));

        // Act
        final result = await petsService.showPetById('123');

        // Assert
        expect(result, isA<Map<String, dynamic>>());
        final pet = Pet.fromJson(result as Map<String, dynamic>);
        expect(pet.id, equals(123));
        expect(pet.name, equals('Max'));
        expect(pet.category?.name, equals('Dogs'));
        expect(pet.photoUrls?.length, equals(2));
      });

      test('should handle 404 not found error', () async {
        // Arrange
        when(mockDio.get(
          '/pets/999',
          options: anyNamed('options'),
        )).thenThrow(
          DioException(
            response: Response(
              statusCode: 404,
              data: {
                'code': 404,
                'message': 'Pet not found',
              },
              requestOptions: RequestOptions(path: '/pets/999'),
            ),
            requestOptions: RequestOptions(path: '/pets/999'),
            type: DioExceptionType.badResponse,
          ),
        );

        // Act & Assert
        expect(
          () => petsService.showPetById('999'),
          throwsA(isA<DioException>()
            .having((e) => e.response?.statusCode, 'status', 404)),
        );
      });
    });

    group('Create Pet', () {
      test('should create new pet successfully', () async {
        // Arrange
        final newPet = NewPet(
          name: 'Charlie',
          tag: 'rabbit',
          status: 'available',
          category: Category(id: 3, name: 'Rabbits'),
          photoUrls: ['https://example.com/charlie.jpg'],
        );

        final createdPet = {
          'id': 456,
          'name': 'Charlie',
          'tag': 'rabbit',
          'status': 'available',
          'category': {'id': 3, 'name': 'Rabbits'},
          'photoUrls': ['https://example.com/charlie.jpg'],
        };

        when(mockDio.post(
          '/pets',
          data: anyNamed('data'),
          options: anyNamed('options'),
        )).thenAnswer((_) async => Response(
          data: createdPet,
          statusCode: 201,
          requestOptions: RequestOptions(path: '/pets'),
        ));

        // Act
        final result = await petsService.createPets(newPet.toJson());

        // Assert
        expect(result, isA<Map<String, dynamic>>());
        final pet = Pet.fromJson(result as Map<String, dynamic>);
        expect(pet.id, equals(456));
        expect(pet.name, equals('Charlie'));
        expect(pet.tag, equals('rabbit'));
        expect(pet.category?.name, equals('Rabbits'));
      });

      test('should handle validation error', () async {
        // Arrange
        final invalidPet = {}; // Missing required fields

        when(mockDio.post(
          '/pets',
          data: invalidPet,
          options: anyNamed('options'),
        )).thenThrow(
          DioException(
            response: Response(
              statusCode: 400,
              data: {
                'code': 400,
                'message': 'Invalid pet data: name is required',
              },
              requestOptions: RequestOptions(path: '/pets'),
            ),
            requestOptions: RequestOptions(path: '/pets'),
            type: DioExceptionType.badResponse,
          ),
        );

        // Act & Assert
        expect(
          () => petsService.createPets(invalidPet),
          throwsA(isA<DioException>()
            .having((e) => e.response?.statusCode, 'status', 400)),
        );
      });
    });

    group('Update Pet', () {
      test('should update pet successfully', () async {
        // Arrange
        final updateData = NewPet(
          name: 'Max Updated',
          tag: 'dog',
          status: 'sold',
        );

        final updatedPet = {
          'id': 123,
          'name': 'Max Updated',
          'tag': 'dog',
          'status': 'sold',
        };

        when(mockDio.put(
          '/pets/123',
          data: anyNamed('data'),
          options: anyNamed('options'),
        )).thenAnswer((_) async => Response(
          data: updatedPet,
          statusCode: 200,
          requestOptions: RequestOptions(path: '/pets/123'),
        ));

        // Act
        final result = await petsService.updatePet('123', updateData.toJson());

        // Assert
        expect(result, isA<Map<String, dynamic>>());
        final pet = Pet.fromJson(result as Map<String, dynamic>);
        expect(pet.name, equals('Max Updated'));
        expect(pet.status, equals('sold'));
      });
    });

    group('Delete Pet', () {
      test('should delete pet successfully', () async {
        // Arrange
        when(mockDio.delete(
          '/pets/123',
          options: anyNamed('options'),
        )).thenAnswer((_) async => Response(
          statusCode: 204,
          requestOptions: RequestOptions(path: '/pets/123'),
        ));

        // Act & Assert
        expect(() => petsService.deletePet('123'), completes);
        
        verify(mockDio.delete(
          '/pets/123',
          options: anyNamed('options'),
        )).called(1);
      });

      test('should handle delete of non-existent pet', () async {
        // Arrange
        when(mockDio.delete(
          '/pets/999',
          options: anyNamed('options'),
        )).thenThrow(
          DioException(
            response: Response(
              statusCode: 404,
              data: {
                'code': 404,
                'message': 'Pet not found',
              },
              requestOptions: RequestOptions(path: '/pets/999'),
            ),
            requestOptions: RequestOptions(path: '/pets/999'),
            type: DioExceptionType.badResponse,
          ),
        );

        // Act & Assert
        expect(
          () => petsService.deletePet('999'),
          throwsA(isA<DioException>()
            .having((e) => e.response?.statusCode, 'status', 404)),
        );
      });
    });

    group('Find Pets by Status', () {
      test('should filter pets by single status', () async {
        // Arrange
        final availablePets = [
          {
            'id': 1,
            'name': 'Fluffy',
            'status': 'available',
          },
          {
            'id': 2,
            'name': 'Max',
            'status': 'available',
          },
        ];

        when(mockDio.get(
          '/pets/findByStatus',
          queryParameters: {'status': ['available']},
          options: anyNamed('options'),
        )).thenAnswer((_) async => Response(
          data: availablePets,
          statusCode: 200,
          requestOptions: RequestOptions(path: '/pets/findByStatus'),
        ));

        // Act
        final result = await petsService.findPetsByStatus(status: ['available']);

        // Assert
        expect(result, isA<List>());
        expect((result as List).length, equals(2));
        
        for (var petData in result) {
          final pet = Pet.fromJson(petData as Map<String, dynamic>);
          expect(pet.status, equals('available'));
        }
      });

      test('should filter pets by multiple statuses', () async {
        // Arrange
        final mixedPets = [
          {
            'id': 1,
            'name': 'Fluffy',
            'status': 'available',
          },
          {
            'id': 2,
            'name': 'Max',
            'status': 'pending',
          },
          {
            'id': 3,
            'name': 'Buddy',
            'status': 'available',
          },
        ];

        when(mockDio.get(
          '/pets/findByStatus',
          queryParameters: {'status': ['available', 'pending']},
          options: anyNamed('options'),
        )).thenAnswer((_) async => Response(
          data: mixedPets,
          statusCode: 200,
          requestOptions: RequestOptions(path: '/pets/findByStatus'),
        ));

        // Act
        final result = await petsService.findPetsByStatus(
          status: ['available', 'pending'],
        );

        // Assert
        expect(result, isA<List>());
        expect((result as List).length, equals(3));
        
        final statuses = result.map((petData) {
          final pet = Pet.fromJson(petData as Map<String, dynamic>);
          return pet.status;
        }).toSet();
        
        expect(statuses, containsAll(['available', 'pending']));
      });

      test('should handle invalid status value', () async {
        // Arrange
        when(mockDio.get(
          '/pets/findByStatus',
          queryParameters: {'status': ['invalid']},
          options: anyNamed('options'),
        )).thenThrow(
          DioException(
            response: Response(
              statusCode: 400,
              data: {
                'code': 400,
                'message': 'Invalid status value',
              },
              requestOptions: RequestOptions(path: '/pets/findByStatus'),
            ),
            requestOptions: RequestOptions(path: '/pets/findByStatus'),
            type: DioExceptionType.badResponse,
          ),
        );

        // Act & Assert
        expect(
          () => petsService.findPetsByStatus(status: ['invalid']),
          throwsA(isA<DioException>()
            .having((e) => e.response?.statusCode, 'status', 400)),
        );
      });
    });

    group('Error Handling', () {
      test('should properly parse error response', () async {
        // Arrange
        final errorData = {
          'code': 500,
          'message': 'Internal server error',
        };

        when(mockDio.get(
          '/pets',
          queryParameters: anyNamed('queryParameters'),
          options: anyNamed('options'),
        )).thenThrow(
          DioException(
            response: Response(
              statusCode: 500,
              data: errorData,
              requestOptions: RequestOptions(path: '/pets'),
            ),
            requestOptions: RequestOptions(path: '/pets'),
            type: DioExceptionType.badResponse,
          ),
        );

        // Act
        try {
          await petsService.listPets();
          fail('Should have thrown an exception');
        } on DioException catch (e) {
          // Assert
          expect(e.response?.statusCode, equals(500));
          expect(e.response?.data, equals(errorData));
          
          final error = api_error.Error.fromJson(e.response?.data);
          expect(error.code, equals(500));
          expect(error.message, equals('Internal server error'));
        }
      });

      test('should handle network connection error', () async {
        // Arrange
        when(mockDio.get(
          '/pets',
          queryParameters: anyNamed('queryParameters'),
          options: anyNamed('options'),
        )).thenThrow(
          DioException(
            requestOptions: RequestOptions(path: '/pets'),
            type: DioExceptionType.connectionError,
            error: 'Connection failed',
          ),
        );

        // Act & Assert
        expect(
          () => petsService.listPets(),
          throwsA(isA<DioException>()
            .having((e) => e.type, 'type', DioExceptionType.connectionError)),
        );
      });

      test('should handle timeout error', () async {
        // Arrange
        when(mockDio.get(
          '/pets',
          queryParameters: anyNamed('queryParameters'),
          options: anyNamed('options'),
        )).thenThrow(
          DioException(
            requestOptions: RequestOptions(path: '/pets'),
            type: DioExceptionType.connectionTimeout,
          ),
        );

        // Act & Assert
        expect(
          () => petsService.listPets(),
          throwsA(isA<DioException>()
            .having((e) => e.type, 'type', DioExceptionType.connectionTimeout)),
        );
      });
    });
  });
}