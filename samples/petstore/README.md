# 🐾 Petstore API Sample

This sample demonstrates how to use Dorval to generate a type-safe Dart API client from an OpenAPI specification.

## 📁 Project Structure

```
petstore/
├── petstore.yaml          # OpenAPI specification
├── dorval.config.js       # Dorval configuration
├── generate.js            # Generation script
├── pubspec.yaml           # Dart dependencies
├── lib/
│   └── api/              # Generated API code
│       ├── api_client.dart      # Dio client wrapper
│       ├── api_config.dart      # API configuration
│       ├── models/              # Data models
│       │   ├── pet.f.dart      # Pet model (Freezed)
│       │   ├── new_pet.f.dart  # NewPet model
│       │   ├── category.f.dart # Category model
│       │   ├── error.f.dart    # Error model
│       │   └── params/          # Parameter models
│       └── services/            # API services
│           └── pets_service.dart # Pet endpoints
├── bin/
│   └── main.dart         # Interactive example
└── test/
    └── pets_service_test.dart # Unit tests
```

## 🚀 Getting Started

### 1. Generate the API Client

```bash
# From the petstore directory
node generate.js

# Or using yarn script
yarn generate
```

### 2. Install Dart Dependencies

```bash
dart pub get
```

### 3. Generate Freezed Files

```bash
dart run build_runner build --delete-conflicting-outputs
```

### 4. Run the Example

```bash
dart run bin/main.dart
```

## 📝 Generated Code

The generator creates:

### Models
- **Pet**: Complete pet model with all properties
- **NewPet**: Model for creating/updating pets
- **Category**: Pet category model
- **Error**: API error response model

### Services
- **PetsService**: All pet-related API endpoints
  - `listPets()` - Get a list of pets
  - `createPets()` - Create a new pet
  - `showPetById()` - Get a specific pet
  - `updatePet()` - Update an existing pet
  - `deletePet()` - Delete a pet
  - `findPetsByStatus()` - Find pets by status

## 💡 Usage Examples

### Basic Usage

```dart
import 'package:dio/dio.dart';
import 'lib/api/services/pets_service.dart';
import 'lib/api/models/pet.f.dart';

void main() async {
  // Setup Dio client
  final dio = Dio(BaseOptions(
    baseUrl: 'http://petstore.swagger.io/v1',
  ));

  // Create service
  final petsService = PetsService(dio);

  // List pets
  final pets = await petsService.listPets(limit: 10);
  
  // Note: Currently returns Map<String, dynamic>
  // Cast to Pet model manually
  if (pets is List) {
    for (var petData in pets) {
      final pet = Pet.fromJson(petData as Map<String, dynamic>);
      print('Pet: ${pet.name}');
    }
  }
}
```

### With Error Handling

```dart
try {
  final pet = await petsService.showPetById('123');
  if (pet != null) {
    final petModel = Pet.fromJson(pet as Map<String, dynamic>);
    print('Found: ${petModel.name}');
  }
} on DioException catch (e) {
  if (e.response?.statusCode == 404) {
    print('Pet not found');
  } else {
    print('API error: ${e.message}');
  }
}
```

### Creating a Pet

```dart
final newPet = NewPet(
  name: 'Buddy',
  tag: 'dog',
  category: Category(id: 1, name: 'Dogs'),
  status: 'available',
);

final created = await petsService.createPets(newPet.toJson());
print('Created pet with ID: ${created['id']}');
```

## 🔧 Configuration

The `dorval.config.js` file controls generation:

```javascript
module.exports = {
  petstore: {
    input: './petstore.yaml',        // OpenAPI spec
    output: {
      mode: 'split',                 // File organization
      target: './lib/api',           // Output directory
      client: 'dio',                 // Client type
      clean: true,                   // Clean output directory
      override: {
        generator: {
          freezed: true,             // Use Freezed
          jsonSerializable: true,    // JSON support
          nullSafety: true,          // Null safety
          copyWith: true,            // Generate copyWith
          equal: true,               // Generate equality
        },
        dio: {
          baseUrl: 'https://petstore.swagger.io/v1',
        },
        methodNaming: 'operationId', // Use operationId for method names
      }
    }
  }
}
```

### Generation Options

```bash
# Use inline configuration (default)
yarn generate

# Use dorval.config.js file
yarn generate:config

# Clean and build everything
yarn build
```

## 📚 API Documentation

### Available Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/pets` | List all pets |
| POST | `/pets` | Create a new pet |
| GET | `/pets/{petId}` | Get a specific pet |
| PUT | `/pets/{petId}` | Update a pet |
| DELETE | `/pets/{petId}` | Delete a pet |
| GET | `/pets/findByStatus` | Find pets by status |

### Status Values
- `available` - Pet is available for adoption
- `pending` - Adoption pending
- `sold` - Pet has been adopted

## 🐛 Known Issues

1. **Response Types**: API methods currently return `Map<String, dynamic>` instead of typed models. Manual casting is required.

2. **Null Safety**: Some properties may need null checking even when marked as required in the OpenAPI spec.

## 🤝 Contributing

This is a sample project. For contributions to Dorval itself, see the main project repository.

## 📄 License

MIT