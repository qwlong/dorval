# @dorval/core

[![npm version](https://img.shields.io/npm/v/@dorval/core.svg)](https://www.npmjs.com/package/@dorval/core)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

Core library for generating type-safe Dart/Flutter API clients from OpenAPI specifications.

## Features

- 🎯 **Type-safe API clients** - Generate strongly-typed Dart code from OpenAPI specs
- ❄️ **Freezed models** - Immutable data classes with copyWith, equality, and more
- 🔄 **JSON serialization** - Built-in fromJson/toJson with json_serializable
- 🌐 **Multiple HTTP clients** - Support for Dio, HTTP, Chopper, and Retrofit
- 📝 **Full OpenAPI 3.0 support** - Handle complex schemas, references, and more
- 🎨 **Customizable generation** - Control naming, organization, and features
- ✅ **Null safety** - Full support for Dart's sound null safety
- 🔀 **Smart header consolidation** - Reduce duplicate header classes with definitions
- 🎭 **Discriminated unions** - Proper Freezed union types with `@Freezed(unionKey)` and `@FreezedUnionValue`

## Installation

```bash
npm install @dorval/core
# or
yarn add @dorval/core
# or
pnpm add @dorval/core
```

## Quick Start

```javascript
const { generateDartCode } = require('@dorval/core');

// Basic usage
await generateDartCode({
  input: './openapi.yaml',
  output: {
    target: './lib/api'
  }
});
```

## Complete Configuration

```javascript
const { generateDartCode } = require('@dorval/core');

await generateDartCode({
  // INPUT OPTIONS
  input: './path/to/openapi.yaml',  // or URL or OpenAPI object
  
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
});
```

## Method Naming Strategies

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
Generates method names from HTTP method and path:

```yaml
# OpenAPI spec
paths:
  /pets/{id}:
    get: ...
  /users/{userId}/settings:
    post: ...
    
# Generated Dart methods
Future<Pet> getPetsById(String id);
Future<Settings> postUsersByUserIdSettings(String userId, SettingsDto body);
```

## Usage Examples

### Basic Generation

```javascript
const { generateDartCode } = require('@dorval/core');

async function generate() {
  const result = await generateDartCode({
    input: './petstore.yaml',
    output: {
      target: './lib/api'
    }
  });
  
  console.log(`Generated ${result.length} files`);
}
```

### With Custom Configuration

```javascript
await generateDartCode({
  input: 'https://api.example.com/openapi.json',
  output: {
    target: './lib/generated',
    mode: 'split',
    client: 'dio',
    override: {
      generator: {
        freezed: true,
        jsonSerializable: true
      },
      methodNaming: 'methodPath',
      dio: {
        baseUrl: 'https://api.production.com'
      }
    }
  },
  hooks: {
    afterAllFilesWrite: [
      'dart format ./lib/generated',
      'flutter pub run build_runner build'
    ]
  }
});
```

### Multiple APIs

```javascript
// Generate multiple APIs in one project
const apis = [
  { input: './user-api.yaml', output: { target: './lib/api/user' } },
  { input: './admin-api.yaml', output: { target: './lib/api/admin' } },
  { input: './public-api.yaml', output: { target: './lib/api/public' } }
];

for (const api of apis) {
  await generateDartCode(api);
}
```

### Integration in Build Scripts

```javascript
// package.json
{
  "scripts": {
    "generate:api": "node scripts/generate-api.js",
    "prebuild": "npm run generate:api"
  }
}

// scripts/generate-api.js
const { generateDartCode } = require('@dorval/core');

generateDartCode({
  input: process.env.API_SPEC_URL || './openapi.yaml',
  output: {
    target: './lib/api',
    override: {
      methodNaming: 'methodPath'
    }
  }
}).then(() => {
  console.log('✅ API client generated successfully');
}).catch(console.error);
```

## Generated File Structure

```
lib/api/
├── api_client.dart          # Dio client wrapper
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

## Generated Dart Code Usage

After generation, use the API client in your Flutter app:

```dart
import 'package:dio/dio.dart';
import 'api/api_client.dart';
import 'api/services/users_service.dart';

void main() async {
  // Initialize client
  final apiClient = ApiClient(
    dio: Dio(),
    baseUrl: 'https://api.example.com',
  );
  
  // Create service
  final usersService = UsersService(apiClient);
  
  // Make type-safe API calls
  final users = await usersService.getUsers(
    limit: 10,
    offset: 0,
  );
  
  // Handle errors
  try {
    final user = await usersService.getUserById('123');
  } on ApiException catch (e) {
    print('API Error: ${e.message}');
  }
}
```

## Flutter Dependencies

Add these to your `pubspec.yaml`:

```yaml
dependencies:
  dio: ^5.0.0
  freezed_annotation: ^3.0.0
  json_annotation: ^4.8.1

dev_dependencies:
  build_runner: ^2.4.0
  freezed: ^3.0.0
  json_serializable: ^6.7.0
```

Run build_runner after generation:

```bash
flutter pub run build_runner build --delete-conflicting-outputs
```

## API Reference

### generateDartCode(options)

Main function to generate Dart code from OpenAPI specification.

**Parameters:**
- `options` (DartGeneratorOptions): Configuration object

**Returns:**
- `Promise<GeneratedFile[]>`: Array of generated files

**Throws:**
- Error if OpenAPI spec is invalid
- Error if output directory cannot be created

### Types

```typescript
interface DartGeneratorOptions {
  input: string | OpenAPIObject;
  output: {
    target: string;
    mode?: 'single' | 'split' | 'tags';
    client?: 'dio' | 'http' | 'chopper' | 'retrofit';
    override?: {
      generator?: {
        freezed?: boolean;
        jsonSerializable?: boolean;
        nullSafety?: boolean;
        partFiles?: boolean;
        equatable?: boolean;
      };
      methodNaming?: 'operationId' | 'methodPath';
      dio?: {
        baseUrl?: string;
        interceptors?: string[];
      };
    };
  };
  hooks?: {
    afterAllFilesWrite?: string | string[];
  };
}

interface GeneratedFile {
  path: string;
  content: string;
}
```

## Comparison with Similar Tools

| Feature | @dorval/core | OpenAPI Generator | Swagger Codegen |
|---------|--------------|-------------------|-----------------|
| Dart/Flutter Focus | ✅ Native | ⚠️ Generic | ⚠️ Generic |
| Freezed Support | ✅ Built-in | ❌ Manual | ❌ Manual |
| Dio Integration | ✅ Native | ⚠️ Basic | ⚠️ Basic |
| Method Naming Control | ✅ Yes | ❌ No | ❌ No |
| TypeScript Config | ✅ Yes | ❌ Java/CLI | ❌ Java/CLI |
| Bundle Size | ✅ Small | ❌ Large | ❌ Large |

## Troubleshooting

### Common Issues

**Generated methods return `Map<String, dynamic>` instead of models**
- Check that your OpenAPI spec uses `$ref` for response schemas
- Ensure models are defined in `components/schemas`

**Duplicate method names**
- Use unique `operationId` in your OpenAPI spec
- Or switch to `methodNaming: 'methodPath'`

**Import errors in generated code**
- Run `flutter pub get` after generation
- Run `flutter pub run build_runner build`

## Contributing

Contributions are welcome! Please check out the [main repository](https://github.com/qwlong/dorval).

## License

MIT © 2025

## Links

- [GitHub Repository](https://github.com/qwlong/dorval)
- [NPM Package](https://www.npmjs.com/package/@dorval/core)
- [CLI Package](https://www.npmjs.com/package/dorval)
- [Report Issues](https://github.com/qwlong/dorval/issues)