# dorval

[![npm version](https://img.shields.io/npm/v/dorval.svg)](https://www.npmjs.com/package/dorval)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

CLI tool for generating type-safe Dart/Flutter API clients from OpenAPI specifications.

## Features

- 🎯 **Type-safe API clients** - Generate strongly-typed Dart code from OpenAPI specs
- ❄️ **Freezed models** - Immutable data classes with copyWith, equality, and more
- 🔄 **JSON serialization** - Built-in fromJson/toJson with json_serializable
- 🌐 **Multiple HTTP clients** - Support for Dio (more clients coming soon)
- 📝 **Full OpenAPI 3.0 support** - Handle complex schemas, references, and more
- 🎨 **Highly configurable** - Control every aspect of code generation
- ⚡ **Fast generation** - Optimized for large APIs
- 🔀 **Smart header consolidation** - Automatically reduces duplicate header classes

## Installation

```bash
# Install globally
npm install -g dorval

# Or use with npx (no installation needed)
npx dorval generate -i ./openapi.yaml -o ./lib/api

# Or add as a dev dependency
npm install --save-dev dorval
```

## Quick Start

```bash
# Generate from a local file
dorval generate -i ./openapi.yaml -o ./lib/api

# Generate from a URL
dorval generate -i https://petstore.swagger.io/v2/swagger.json -o ./lib/api

# Using configuration file (recommended)
dorval generate -c ./dorval.config.ts
```

## Configuration Guide

### Configuration File (Recommended)

Create a `dorval.config.ts` (or `.js`, `.json`) file:

```typescript
export default {
  petstore: {
    input: './petstore.yaml',           // Local file, URL, or OpenAPI object
    output: {
      target: './lib/api',              // Output directory
      mode: 'split',                    // File organization: 'single' | 'split' | 'tags'
      client: 'dio',                    // HTTP client (currently only 'dio' is supported)
      override: {
        generator: {
          freezed: true,                // Generate Freezed models (default: true)
          jsonSerializable: true,       // Add JSON serialization (default: true)
          nullSafety: true,             // Enable null safety (default: true)
          partFiles: true,              // Generate part files (default: true)
          equatable: false              // Add Equatable support (default: false)
        },
        methodNaming: 'operationId'     // 'operationId' | 'methodPath'
      }
    },
    hooks: {
      afterAllFilesWrite: 'dart format .'  // Commands to run after generation
    }
  }
};
```

### Complete Configuration Reference

```typescript
export default {
  apiName: {  // You can have multiple APIs in one config

    // INPUT OPTIONS
    input: {
      target: './path/to/openapi.yaml',  // File path or URL
      // OR provide OpenAPI spec directly:
      // target: { openapi: '3.0.0', info: {...}, paths: {...} }
    },

    // OUTPUT OPTIONS
    output: {
      target: './lib/generated/api',   // Output directory

      mode: 'split',                   // File organization
      // 'single' - All code in one file
      // 'split' - Separate models and services (default)
      // 'tags' - Group by OpenAPI tags

      client: 'dio',                   // HTTP client library (currently only 'dio')

      override: {
        // Generator options
        generator: {
          freezed: true,               // Generate Freezed models
          jsonSerializable: true,      // Add JSON serialization
          nullSafety: true,            // Enable null safety
          partFiles: true,             // Generate part files
          equatable: false,            // Add Equatable support
          copyWith: true,              // Generate copyWith methods
          toString: true,              // Generate toString methods
          equality: true               // Generate equality operators
        },

        // Method naming strategy
        methodNaming: 'operationId',  // How to name service methods
        // 'operationId' - Use OpenAPI operationId (default)
        // 'methodPath' - Generate from HTTP method + path

        // Dio-specific options (future enhancement)
        dio: {
          baseUrl: 'https://api.example.com',  // Override base URL
          interceptors: ['AuthInterceptor']     // Custom interceptors
        }
      }
    },

    // POST-GENERATION HOOKS
    hooks: {
      afterAllFilesWrite: 'dart format .'  // Commands to run after generation
      // Can also be an array: ['dart format .', 'dart analyze']
    }
  }
};
```

### Multiple APIs Configuration

```typescript
export default {
  // User API
  userApi: {
    input: './specs/user-api.yaml',
    output: {
      target: './lib/api/user',
      client: 'dio'
    }
  },

  // Admin API with different settings
  adminApi: {
    input: './specs/admin-api.yaml',
    output: {
      target: './lib/api/admin',
      client: 'dio',
      override: {
        methodNaming: 'methodPath',
        generator: {
          freezed: true,
          equatable: true  // Admin API uses Equatable
        }
      }
    }
  },

  // Public API from URL
  publicApi: {
    input: 'https://api.example.com/public/openapi.json',
    output: {
      target: './lib/api/public',
      mode: 'tags'  // Group by tags
    }
  }
};
```

### Command Line Options

```bash
dorval generate [options]
```

**Options:**
- `-i, --input <path>` - Path or URL to OpenAPI specification
- `-o, --output <path>` - Output directory for generated code
- `-c, --config <path>` - Path to configuration file
- `--client <type>` - HTTP client type (currently only 'dio')
- `-h, --help` - Display help
- `-V, --version` - Display version

## Method Naming Strategies

Control how generated method names look with the `methodNaming` option:

### operationId (default)

Uses the `operationId` field from your OpenAPI specification:

```yaml
# OpenAPI spec
paths:
  /pets/{id}:
    get:
      operationId: showPetById

# Generated Dart method
Future<Pet> showPetById(String id);
```

### methodPath

Generates descriptive names from HTTP method and path:

```yaml
# OpenAPI spec
paths:
  /pets/{id}:
    get: ...
  /users/{userId}/settings:
    post: ...
  /v1/locations/{locationId}/settings:
    put: ...
    
# Generated Dart methods
Future<Pet> getPetsById(String id);
Future<Settings> postUsersByUserIdSettings(String userId, SettingsDto body);
Future<void> putV1LocationsLocationIdSettings(String locationId, SettingsDto body);
```

## Generated File Structure

```
lib/api/
├── api_client.dart          # HTTP client wrapper
├── models/                  # Data models
│   ├── user.f.dart         # Freezed model
│   ├── user.f.freezed.dart # Generated Freezed code
│   ├── user.f.g.dart       # Generated JSON serialization
│   ├── params/             # Request parameter models (if needed)
│   │   ├── get_users_params.f.dart
│   │   └── index.dart
│   ├── headers/            # Header parameter models (if needed)
│   │   ├── auth_headers.f.dart
│   │   └── index.dart
│   └── index.dart          # Barrel exports
└── services/               # API services
    ├── users_service.dart  # Service implementation
    ├── api_exception.dart  # Error handling
    └── index.dart          # Barrel exports
```

## Flutter/Dart Setup

After generating the API client, set up your Flutter project:

### 1. Add Dependencies

```yaml
# pubspec.yaml
dependencies:
  dio: ^5.0.0
  freezed_annotation: ^3.0.0
  json_annotation: ^4.8.1

dev_dependencies:
  build_runner: ^2.4.0
  freezed: ^3.0.0
  json_serializable: ^6.7.0
```

### 2. Run Build Runner

```bash
flutter pub get
flutter pub run build_runner build --delete-conflicting-outputs
```

### 3. Use Generated Code

```dart
import 'package:dio/dio.dart';
import 'api/api_client.dart';
import 'api/services/users_service.dart';
import 'api/models/user.f.dart';

void main() async {
  // Initialize client
  final apiClient = ApiClient(
    dio: Dio(),
    baseUrl: 'https://api.example.com',
  );

  // Create service
  final usersService = UsersService(apiClient);

  // Make type-safe API calls
  final List<User> users = await usersService.getUsers(
    limit: 10,
    offset: 0,
  );

  // Handle errors
  try {
    final user = await usersService.getUserById('123');
    print('User name: ${user.name}');
  } on ApiException catch (e) {
    print('API Error: ${e.message}');
    print('Status Code: ${e.statusCode}');
  }
}
```

## Integration Examples

### package.json Scripts

```json
{
  "scripts": {
    "generate": "dorval generate",
    "generate:watch": "dorval watch -c dorval.config.ts",
    "prebuild": "npm run generate"
  }
}
```

### CI/CD Integration

```yaml
# GitHub Actions
- name: Generate API Client
  run: |
    npm install -g dorval
    dorval generate -c ./dorval.config.ts

# GitLab CI
generate-api:
  script:
    - npx dorval generate -i $API_SPEC_URL -o ./lib/api
```

### With Environment Variables

```typescript
// dorval.config.ts
export default {
  api: {
    input: process.env.API_SPEC_URL || './openapi.yaml',
    output: {
      target: './lib/api',
      override: {
        dio: {
          baseUrl: process.env.API_BASE_URL || 'https://api.example.com'
        }
      }
    }
  }
};
```

## Advanced Usage

### Custom Interceptors

```dart
// lib/interceptors/auth_interceptor.dart
class AuthInterceptor extends Interceptor {
  @override
  void onRequest(RequestOptions options, RequestInterceptorHandler handler) {
    options.headers['Authorization'] = 'Bearer $token';
    super.onRequest(options, handler);
  }
}

// Use in your app
final dio = Dio()..interceptors.add(AuthInterceptor());
final apiClient = ApiClient(dio: dio);
```

### Error Handling

```dart
try {
  final result = await service.someApiCall();
} on ApiException catch (e) {
  switch (e.statusCode) {
    case 401:
      // Handle unauthorized
      break;
    case 404:
      // Handle not found
      break;
    default:
      // Handle other errors
  }
}
```

### Mock Data for Testing

```dart
// test/mocks/mock_users_service.dart
class MockUsersService implements UsersService {
  @override
  Future<List<User>> getUsers({int? limit, int? offset}) async {
    return [
      User(id: '1', name: 'Test User'),
    ];
  }
}
```

## Troubleshooting

### Common Issues

**Generated methods return `Map<String, dynamic>` instead of models**
- Ensure your OpenAPI spec uses `$ref` for response schemas
- Check that models are defined in `components/schemas`

**Duplicate method names in services**
- Use unique `operationId` values in your OpenAPI spec
- Or switch to `methodNaming: 'methodPath'` for automatic unique names

**Import errors in generated Dart code**
- Run `flutter pub get` after generation
- Run `flutter pub run build_runner build`
- Ensure all dependencies are in `pubspec.yaml`

**"Cannot find module '@dorval/core'" error**
- Run `npm install` in your project
- Ensure `@dorval/core` is installed as a dependency

### Debug Mode

Set environment variable for verbose output:

```bash
DEBUG=dorval* dorval generate -c dorval.config.ts
```

## Comparison with Other Tools

| Feature | dorval | OpenAPI Generator | Swagger Codegen |
|---------|--------|-------------------|-----------------|
| Dart/Flutter Focus | ✅ Native | ⚠️ Generic | ⚠️ Generic |
| Freezed Support | ✅ Built-in | ❌ Manual | ❌ Manual |
| TypeScript Config | ✅ Yes | ❌ Java/CLI | ❌ Java/CLI |
| Method Naming Control | ✅ Yes | ⚠️ Limited | ⚠️ Limited |
| NPM Package | ✅ Yes | ❌ Docker/JAR | ❌ Docker/JAR |
| Bundle Size | ✅ ~5MB | ❌ ~100MB+ | ❌ ~100MB+ |
| Header Consolidation | ✅ Smart | ❌ No | ❌ No |

## Migration Guide

### From OpenAPI Generator

1. Install dorval: `npm install -g dorval`
2. Create `dorval.config.ts` with your settings
3. Run `dorval generate`
4. Update imports in your Dart code

### From Swagger Codegen

1. Convert your config to dorval format
2. Replace JAR execution with `dorval generate`
3. Update generated file imports

## Contributing

We welcome contributions! See [CONTRIBUTING.md](https://github.com/qwlong/dorval/blob/master/CONTRIBUTING.md).

## Support

- 📖 [Documentation](https://github.com/qwlong/dorval#readme)
- 🐛 [Report Issues](https://github.com/qwlong/dorval/issues)
- 💬 [Discussions](https://github.com/qwlong/dorval/discussions)

## License

MIT © 2025

## Links

- [GitHub Repository](https://github.com/qwlong/dorval)
- [NPM Package](https://www.npmjs.com/package/dorval)
- [Core Library](https://www.npmjs.com/package/@dorval/core)
- [Changelog](https://github.com/qwlong/dorval/blob/master/CHANGELOG.md)