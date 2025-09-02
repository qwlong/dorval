# Dorval Usage Example

This example demonstrates how to use Dorval to generate a Dart API client from an OpenAPI specification.

## Installation

```bash
# Install Dorval globally
npm install -g dorval

# Or use it in your project
npm install --save-dev dorval
```

## Basic Usage

### 1. Create a Configuration File

Create `dorval.config.js` in your project root:

```javascript
module.exports = {
  petstore: {
    input: './petstore.yaml',
    output: {
      target: './lib/api',
      mode: 'split',
      client: 'dio',
      override: {
        useFreezed: true,
        nullSafety: true,
        namingConvention: 'camelCase'
      }
    }
  }
};
```

### 2. Run Dorval

```bash
dorval
```

## Advanced Configuration

### Multiple APIs

```javascript
module.exports = {
  // First API
  users: {
    input: 'https://api.example.com/users/openapi.json',
    output: {
      target: './lib/api/users',
      mode: 'split',
      client: 'dio'
    }
  },
  
  // Second API  
  products: {
    input: './specs/products.yaml',
    output: {
      target: './lib/api/products',
      mode: 'split',
      client: 'dio'
    }
  }
};
```

### Custom Templates

```javascript
module.exports = {
  api: {
    input: './openapi.yaml',
    output: {
      target: './lib/api',
      mode: 'split',
      client: 'dio',
      override: {
        templates: {
          model: './templates/custom-model.hbs',
          service: './templates/custom-service.hbs'
        }
      }
    }
  }
};
```

### Output Modes

#### Split Mode (Recommended)
Generates separate files for models and services:

```
lib/api/
├── models/
│   ├── user.f.dart
│   ├── product.f.dart
│   └── index.dart
├── services/
│   ├── users_service.dart
│   ├── products_service.dart
│   ├── api_exception.dart
│   └── index.dart
├── api_client.dart
└── api_config.dart
```

#### Single Mode
Generates everything in one file:

```javascript
output: {
  target: './lib/api.dart',
  mode: 'single'
}
```

## Generated Code Usage

### Initialize the API Client

```dart
import 'package:your_app/api/api_client.dart';
import 'package:your_app/api/services/index.dart';

void main() {
  // Create API client
  final apiClient = ApiClient(
    baseUrl: 'https://api.example.com',
    interceptors: [
      // Add your interceptors
    ],
  );
  
  // Create service instances
  final usersService = UsersService(apiClient);
  final productsService = ProductsService(apiClient);
}
```

### Making API Calls

```dart
// Get all users
Future<List<User>> getUsers() async {
  try {
    final users = await usersService.getUsers(
      page: 1,
      limit: 20,
    );
    return users;
  } on ApiException catch (e) {
    print('API Error: ${e.message}');
    rethrow;
  }
}

// Create a new user
Future<User> createUser(String name, String email) async {
  final newUser = User(
    name: name,
    email: email,
  );
  
  return await usersService.createUser(newUser);
}

// Update user
Future<User> updateUser(String id, User user) async {
  return await usersService.updateUser(id, user);
}

// Delete user
Future<void> deleteUser(String id) async {
  await usersService.deleteUser(id);
}
```

### Working with Models

```dart
import 'package:your_app/api/models/index.dart';

// Create model instance
final user = User(
  id: '123',
  name: 'John Doe',
  email: 'john@example.com',
  createdAt: DateTime.now(),
);

// Convert to JSON
final json = user.toJson();

// Parse from JSON
final userFromJson = User.fromJson(json);

// Using Freezed features
final updatedUser = user.copyWith(
  name: 'Jane Doe',
);
```

### Error Handling

```dart
try {
  final result = await api.someMethod();
} on ApiException catch (e) {
  switch (e.statusCode) {
    case 401:
      // Handle unauthorized
      break;
    case 404:
      // Handle not found
      break;
    case 500:
      // Handle server error
      break;
    default:
      // Handle other errors
  }
}
```

## Features

### ✅ Supported OpenAPI Features
- OpenAPI 3.0 and 3.1
- All HTTP methods (GET, POST, PUT, DELETE, PATCH, etc.)
- Path, query, header, and cookie parameters
- Request bodies (JSON, FormData, URL-encoded)
- Multiple response types
- Authentication schemes
- Enums with proper Dart generation
- Nullable types
- Arrays and nested objects
- allOf, oneOf, anyOf schemas
- Discriminated unions with Freezed

### ✅ Dart Features
- Null safety
- Freezed for immutable models
- JSON serialization
- Type-safe API calls
- Custom headers
- Interceptors
- Error handling
- Debug logging

### ✅ Advanced Features
- Custom header consolidation
- Multiple output modes
- Custom templates
- Hooks for customization
- TypeScript configuration support

## CLI Options

```bash
# Generate from specific config
dorval --config ./custom-config.js

# Generate specific API
dorval --api users

# Watch mode
dorval --watch

# Verbose output
dorval --verbose

# Clean output directory first
dorval --clean
```

## Programmatic Usage

```javascript
const { generateDartCode } = require('@dorval/core');

async function generate() {
  const files = await generateDartCode({
    input: './openapi.yaml',
    output: {
      target: './lib/api',
      mode: 'split',
      client: 'dio'
    }
  });
  
  console.log(`Generated ${files.length} files`);
}

generate();
```

## Flutter Integration

Add dependencies to `pubspec.yaml`:

```yaml
dependencies:
  dio: ^5.0.0
  freezed_annotation: ^2.0.0
  json_annotation: ^4.8.0

dev_dependencies:
  build_runner: ^2.3.0
  freezed: ^2.3.0
  json_serializable: ^6.6.0
```

Run build_runner after generation:

```bash
flutter pub run build_runner build --delete-conflicting-outputs
```

## Comparison with Orval

| Feature | Orval (TypeScript) | Dorval (Dart) |
|---------|-------------------|---------------|
| OpenAPI 3.0 | ✅ | ✅ |
| OpenAPI 3.1 | ✅ | ✅ |
| Axios client | ✅ | ❌ |
| Fetch client | ✅ | ❌ |
| Dio client | ❌ | ✅ |
| React Query | ✅ | ❌ |
| SWR | ✅ | ❌ |
| Vue Query | ✅ | ❌ |
| Freezed models | ❌ | ✅ |
| Zod validation | ✅ | ❌ |
| Mock generation | ✅ | 🚧 |
| Custom templates | ✅ | ✅ |

## Contributing

Dorval follows Orval's architecture for consistency. When contributing:

1. Keep the directory structure aligned with Orval
2. Use the same patterns and conventions
3. Add tests for new features
4. Update documentation

## License

MIT