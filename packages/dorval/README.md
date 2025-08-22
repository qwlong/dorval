# dorval

[![npm version](https://img.shields.io/npm/v/dorval.svg)](https://www.npmjs.com/package/dorval)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

CLI tool for generating type-safe Dart/Flutter API clients from OpenAPI specifications.

## Features

- 🎯 **Type-safe API clients** - Generate strongly-typed Dart code from OpenAPI specs
- ❄️ **Freezed models** - Immutable data classes with copyWith, equality, and more
- 🔄 **JSON serialization** - Built-in fromJson/toJson with json_serializable
- 🌐 **Multiple HTTP clients** - Support for Dio, HTTP, Chopper, and Retrofit
- 📝 **Full OpenAPI 3.0 support** - Handle complex schemas, references, and more
- 👀 **Watch mode** - Auto-regenerate on spec changes during development
- 🎨 **Highly configurable** - Control every aspect of code generation
- ⚡ **Fast generation** - Optimized for large APIs

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

### 1. Basic Command Line Usage

```bash
# Generate from a local file
dorval generate -i ./openapi.yaml -o ./lib/api

# Generate from a URL
dorval generate -i https://petstore.swagger.io/v2/swagger.json -o ./lib/api

# Specify client type
dorval generate -i ./spec.yaml -o ./lib/api --client dio
```

### 2. Using Configuration File (Recommended)

Create a `dorval.config.ts` (or `.js`, `.json`):

```typescript
export default {
  petstore: {
    input: './petstore.yaml',
    output: {
      target: './lib/api',
      mode: 'split',
      client: 'dio',
      override: {
        generator: {
          freezed: true,
          jsonSerializable: true,
          nullSafety: true
        },
        methodNaming: 'methodPath'
      }
    }
  }
};
```

Then run:

```bash
dorval generate

# Or specify config path
dorval generate -c ./custom.config.ts
```

## Complete Configuration Guide

### Configuration File Options

```typescript
export default {
  apiName: {  // You can have multiple APIs in one config
    
    // INPUT OPTIONS
    input: './path/to/openapi.yaml',  // Local file, URL, or OpenAPI object
    
    // OUTPUT OPTIONS
    output: {
      target: './lib/generated/api',   // Output directory
      
      mode: 'split',                   // File organization
      // 'single' - All code in one file
      // 'split' - Separate models and services (default)
      // 'tags' - Group by OpenAPI tags
      
      client: 'dio',                   // HTTP client library
      // 'dio' - Feature-rich, supports interceptors (default)
      // 'http' - Lightweight, built-in Dart package
      // 'chopper' - Code generation based
      // 'retrofit' - Annotation-based (experimental)
      
      override: {
        // Generator options
        generator: {
          freezed: true,               // Generate Freezed models (default: true)
          jsonSerializable: true,      // Add JSON serialization (default: true)
          nullSafety: true,            // Enable null safety (default: true)
          partFiles: true,             // Generate part files (default: true)
          equatable: false             // Add Equatable support (default: false)
        },
        
        // Method naming strategy
        methodNaming: 'operationId',  // How to name service methods
        // 'operationId' - Use OpenAPI operationId (default)
        // 'methodPath' - Generate from HTTP method + path
        
        // Dio-specific options
        dio: {
          baseUrl: 'https://api.example.com',  // Override base URL
          interceptors: ['AuthInterceptor']     // Custom interceptors
        }
      }
    },
    
    // POST-GENERATION HOOKS
    hooks: {
      afterAllFilesWrite: 'dart format .'  // Commands to run after generation
      // Can also be an array: ['dart format .', 'flutter pub get']
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
        methodNaming: 'operationId',
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

## CLI Commands & Options

### generate

Generate Dart API client from OpenAPI specification.

```bash
dorval generate [options]
```

**Options:**
- `-i, --input <path>` - Path or URL to OpenAPI specification
- `-o, --output <path>` - Output directory for generated code
- `-c, --config <path>` - Path to configuration file
- `--client <type>` - HTTP client type (dio|http|chopper|retrofit)
- `-h, --help` - Display help
- `-V, --version` - Display version

**Examples:**

```bash
# Simple generation
dorval generate -i api.yaml -o ./lib

# With specific client
dorval generate -i api.yaml -o ./lib --client dio

# Using config file
dorval generate -c ./my-config.js

# From URL
dorval generate -i https://api.example.com/openapi.json -o ./lib
```

### watch

Watch OpenAPI spec for changes and regenerate automatically.

```bash
dorval watch [options]
```

**Options:**
- `-c, --config <path>` - Path to configuration file (required)

**Example:**

```bash
# Watch for changes
dorval watch -c ./dorval.config.ts
```

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
├── api_config.dart          # API configuration
├── models/                  # Data models
│   ├── user.f.dart         # Freezed model
│   ├── user.f.freezed.dart # Generated Freezed code
│   ├── user.f.g.dart       # Generated JSON serialization
│   ├── params/             # Request parameter models
│   │   ├── get_users_params.f.dart
│   │   └── index.dart
│   ├── headers/            # Header parameter models
│   │   ├── get_users_headers.f.dart
│   │   └── index.dart
│   └── index.dart          # Barrel exports
└── services/               # API services
    ├── users_service.dart  # Service implementation
    ├── api_exception.dart  # Error handling
    └── index.dart          # Barrel exports
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

## Flutter/Dart Setup

After generating the API client, set up your Flutter project:

### 1. Add Dependencies

```yaml
# pubspec.yaml
dependencies:
  dio: ^5.0.0
  freezed_annotation: ^2.4.1
  json_annotation: ^4.8.1

dev_dependencies:
  build_runner: ^2.4.0
  freezed: ^2.4.0
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

**"Missing loader for extension 'orval.config.mjs'" error**
- Use `.ts`, `.js`, or `.json` config files instead
- Or use command line options: `dorval generate -i spec.yaml -o ./lib`

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
| Watch Mode | ✅ Yes | ❌ No | ❌ No |
| Method Naming Control | ✅ Yes | ❌ No | ❌ No |
| NPM Package | ✅ Yes | ❌ Docker/JAR | ❌ Docker/JAR |
| Bundle Size | ✅ Small | ❌ Large | ❌ Large |

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
- 📧 [Email Support](mailto:support@dorval.dev)

## License

MIT © 2025

## Links

- [GitHub Repository](https://github.com/qwlong/dorval)
- [NPM Package](https://www.npmjs.com/package/dorval)
- [Core Library](https://www.npmjs.com/package/@dorval/core)
- [Petstore Example](https://github.com/qwlong/dorval/tree/master/samples/petstore)
- [Changelog](https://github.com/qwlong/dorval/blob/master/CHANGELOG.md)