import 'package:test/test.dart';
import 'package:dio/dio.dart';
import 'package:mockito/mockito.dart';
import '../lib/api/services/pets_service.dart';
import '../lib/api/models/pet.f.dart';
import '../lib/api/models/new_pet.f.dart';
import '../lib/api/models/category.f.dart';

// Mock class for Dio
class MockDio extends Mock implements Dio {
  @override
  BaseOptions get options => BaseOptions();
}

void main() {
  group('PetsService', () {
    late MockDio mockDio;
    late PetsService petsService;

    setUp(() {
      mockDio = MockDio();
      petsService = PetsService(mockDio);
    });

    test('listPets returns list of pets', () async {
      // Arrange
      final mockResponse = [
        {
          'id': 1,
          'name': 'Fluffy',
          'tag': 'cat',
          'status': 'available',
        },
        {
          'id': 2,
          'name': 'Buddy',
          'tag': 'dog',
          'status': 'sold',
        },
      ];

      when(mockDio.get(
        '/pets',
        queryParameters: anyNamed('queryParameters'),
      )).thenAnswer((_) async => Response(
        data: mockResponse,
        statusCode: 200,
        requestOptions: RequestOptions(path: '/pets'),
      ));

      // Act
      final result = await petsService.listPets(limit: 10);

      // Assert
      expect(result, isA<List>());
      expect((result as List).length, equals(2));
      
      final firstPet = Pet.fromJson(result[0] as Map<String, dynamic>);
      expect(firstPet.name, equals('Fluffy'));
      expect(firstPet.id, equals(1));
    });

    test('showPetById returns a specific pet', () async {
      // Arrange
      final mockPet = {
        'id': 123,
        'name': 'Max',
        'tag': 'dog',
        'status': 'available',
        'category': {
          'id': 1,
          'name': 'Dogs',
        },
      };

      when(mockDio.get('/pets/123')).thenAnswer((_) async => Response(
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
    });

    test('createPets creates a new pet', () async {
      // Arrange
      final newPet = NewPet(
        name: 'Charlie',
        tag: 'rabbit',
        status: 'available',
      );

      final createdPet = {
        'id': 456,
        'name': 'Charlie',
        'tag': 'rabbit',
        'status': 'available',
      };

      when(mockDio.post(
        '/pets',
        data: anyNamed('data'),
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
    });

    test('findPetsByStatus filters pets correctly', () async {
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
        queryParameters: anyNamed('queryParameters'),
      )).thenAnswer((_) async => Response(
        data: availablePets,
        statusCode: 200,
        requestOptions: RequestOptions(path: '/pets/findByStatus'),
      ));

      // Act
      final result = await petsService.findPetsByStatus(['available']);

      // Assert
      expect(result, isA<List>());
      expect((result as List).length, equals(2));
      
      for (var petData in result) {
        final pet = Pet.fromJson(petData as Map<String, dynamic>);
        expect(pet.status, equals('available'));
      }
    });

    test('deletePet removes a pet', () async {
      // Arrange
      when(mockDio.delete('/pets/999')).thenAnswer((_) async => Response(
        statusCode: 204,
        requestOptions: RequestOptions(path: '/pets/999'),
      ));

      // Act & Assert
      expect(() => petsService.deletePet('999'), completes);
    });

    test('handles 404 error correctly', () async {
      // Arrange
      when(mockDio.get('/pets/nonexistent')).thenThrow(
        DioException(
          response: Response(
            statusCode: 404,
            data: {
              'code': 404,
              'message': 'Pet not found',
            },
            requestOptions: RequestOptions(path: '/pets/nonexistent'),
          ),
          requestOptions: RequestOptions(path: '/pets/nonexistent'),
        ),
      );

      // Act & Assert
      expect(
        () => petsService.showPetById('nonexistent'),
        throwsA(isA<DioException>()),
      );
    });
  });
}