# 🎯 Dorval

<div align="center">
  <img src="https://github.com/qwlong/dorval/actions/workflows/ci.yml/badge.svg" alt="CI Status" />
  <img src="https://img.shields.io/npm/v/dorval.svg" alt="npm version" />
  <img src="https://img.shields.io/npm/dm/dorval.svg" alt="npm downloads" />
  <img src="https://codecov.io/gh/qwlong/dorval/branch/main/graph/badge.svg" alt="codecov" />
  <img src="https://img.shields.io/github/license/qwlong/dorval.svg" alt="license" />
  <img src="https://img.shields.io/badge/Dart-3.0%2B-blue" alt="dart version" />
  <img src="https://img.shields.io/badge/TypeScript-5.0%2B-blue" alt="typescript version" />
</div>

<div align="center">
  <strong>Generate type-safe Dart/Flutter API clients from OpenAPI specifications</strong>
</div>

<div align="center">
  <sub>Dorval = Dart + Orval. Built on the solid foundation of <a href="https://github.com/orval-labs/orval">Orval</a>'s architecture.</sub>
</div>

## Overview

Dorval brings the power of [Orval](https://orval.dev) to the Dart/Flutter ecosystem, automatically generating:

- 🎯 **Type-safe API clients** - Never worry about API contracts again
- 🔒 **Freezed models** - Immutable data classes with JSON serialization
- 🌐 **HTTP client support** - Dio client with ApiClient wrapper (more coming soon)
- ✅ **Full null safety** - Leveraging Dart's sound null safety
- 🔀 **Smart header consolidation** - Automatically reduces duplicate header classes

## Project Structure

```
dorval/
├── packages/
│   ├── core/                   # Core generation logic (@dorval/core)
│   │   ├── src/
│   │   │   ├── __tests__/      # Test files
│   │   │   ├── generators/     # Dart code generators
│   │   │   ├── getters/        # Schema getters
│   │   │   ├── parser/         # OpenAPI parsing
│   │   │   ├── resolvers/      # Reference resolvers
│   │   │   ├── templates/      # Handlebars templates
│   │   │   ├── utils/          # Utilities
│   │   │   └── writers/        # File writers
│   │   ├── dist/               # Compiled output
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   ├── dorval/                 # CLI tool (dorval)
│   │   ├── src/
│   │   │   ├── bin/           # CLI entry point
│   │   │   ├── commands/      # CLI commands
│   │   │   └── cli.ts         # CLI configuration
│   │   ├── dist/              # Compiled output
│   │   └── package.json
│   │
│   ├── dio/                    # Dio client templates (@dorval/dio)
│   │   ├── src/
│   │   │   └── builders/      # Dio-specific builders
│   │   └── package.json
│   │
│   └── custom/                 # Custom client templates (@dorval/custom)
│       ├── src/
│       │   └── builders/      # Custom client builders
│       └── package.json
│
├── .github/
│   └── workflows/             # GitHub Actions CI/CD
│       ├── ci.yml            # Continuous Integration
│       ├── release.yml       # Auto release (semantic-release)
│       └── manual-publish.yml # Manual backup publish
│
└── docs/                       # Documentation
    ├── PUBLISHING.md          # Publishing guide
    └── RELEASE.md            # Release process
```

## Getting Started

### Installation

#### Install from npm

```bash
# Install globally
npm install -g dorval

# Or use with npx
npx dorval generate -i ./openapi.yaml -o ./lib/api

# Or add as a dev dependency
npm install --save-dev dorval
```

#### Build from source

```bash
# Clone the repository
git clone https://github.com/qwlong/dorval.git
cd dorval

# Install dependencies
yarn install

# Build the project
yarn build

# Link CLI globally (optional)
cd packages/dorval
npm link
```

### Quick Start

1. **Create a configuration file:**

You can use either CommonJS or ES Modules format:

**ES Modules (`dorval.config.js` or `dorval.config.mjs`):**
```javascript
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
        methodNaming: 'methodPath'  // 'operationId' | 'methodPath'
      }
    }
  }
}
```

**CommonJS (`dorval.config.cjs`):**
```javascript
module.exports = {
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
        methodNaming: 'methodPath'  // 'operationId' | 'methodPath'
      }
    }
  }
}
```

**TypeScript (`dorval.config.ts`):**
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
        methodNaming: 'methodPath'  // 'operationId' | 'methodPath'
      }
    }
  }
}
```

2. **Run the generator:**

```bash
# Using config file (auto-detects dorval.config.ts/js/mjs/cjs in current directory)
dorval generate

# Specify a custom config file
dorval generate -c ./my-custom-config.js

# Using command line options (overrides config file)
dorval generate -i ./petstore.yaml -o ./lib/api

# Watch mode (coming soon)
# dorval watch
```

3. **Use the generated code in your Flutter app:**

```dart
import 'package:dio/dio.dart';
import 'api/api_client.dart';
import 'api/services/pets_service.dart';
import 'api/models/index.dart';

void main() async {
  // Initialize the API client
  final apiClient = ApiClient(
    baseUrl: 'https://petstore.swagger.io/v2',
  );
  
  // Create service instance
  final petsService = PetsService(apiClient);
  
  // Type-safe API calls with generated models!
  try {
    // List all pets with optional query parameters
    final pets = await petsService.listPets(
      params: ListPetsParams(limit: 10),
    );
    
    // Create a new pet
    final newPet = NewPet(
      name: 'Fluffy',
      tag: 'cat',
    );
    final createdPet = await petsService.createPets(newPet);
    
    // Get pet by ID
    final pet = await petsService.showPetById('123');
    
    // Update a pet
    final updatedPet = await petsService.updatePet(
      '123',
      NewPet(name: 'Fluffy Updated'),
    );
    
    // Delete a pet
    await petsService.deletePet('123');
    
  } catch (e) {
    if (e is ApiException) {
      print('API Error: ${e.statusCode} - ${e.message}');
    }
  }
  
  // Don't forget to dispose when done
  apiClient.dispose();
}
```

## Programmatic Usage

Dorval can be used programmatically in your Node.js scripts. Both CommonJS and ES Modules are supported:

### ES Modules (`.mjs` or `package.json` with `"type": "module"`)

```javascript
import { generateDartCode } from '@dorval/core';

// Using async/await
const files = await generateDartCode({
  input: './openapi.yaml',
  output: {
    target: './lib/api',
    mode: 'split',
    client: 'dio'
  }
});

console.log(`Generated ${files.length} files`);
```

### CommonJS (`.cjs` or `.js` without `"type": "module"`)

```javascript
const { generateDartCode } = require('@dorval/core');

// Using promises
generateDartCode({
  input: './openapi.yaml',
  output: {
    target: './lib/api',
    mode: 'split',
    client: 'dio'
  }
}).then(files => {
  console.log(`Generated ${files.length} files`);
});

// Or with async/await in CommonJS
(async () => {
  const files = await generateDartCode({
    input: './openapi.yaml',
    output: {
      target: './lib/api',
      mode: 'split',
      client: 'dio'
    }
  });
  console.log(`Generated ${files.length} files`);
})();
```

### TypeScript

```typescript
import { generateDartCode } from '@dorval/core';
import type { DorvalConfig } from '@dorval/core';

const config: DorvalConfig = {
  input: './openapi.yaml',
  output: {
    target: './lib/api',
    mode: 'split',
    client: 'dio'
  }
};

const files = await generateDartCode(config);
console.log(`Generated ${files.length} files`);
```

## Development

### Setup

```bash
# Install dependencies
yarn install

# Build all packages
yarn build

# Run in development mode
yarn dev

# Run tests
yarn test
```

### Commit Convention

This project uses [Conventional Commits](https://www.conventionalcommits.org/) for automatic versioning and changelog generation.

#### Commit Format
```
<type>(<scope>): <subject>

<body>

<footer>
```

#### Commit Types & Version Bumps

| Type | Version | Description | Example |
|------|---------|-------------|---------|
| `fix` | Patch (0.2.0 → 0.2.1) | Bug fixes | `fix: resolve null reference in parser` |
| `feat` | Minor (0.2.0 → 0.3.0) | New features | `feat: add support for oneOf schemas` |
| `feat!` or `BREAKING CHANGE` | Major (0.2.0 → 1.0.0) | Breaking changes | `feat!: change API structure` |
| `perf` | Patch | Performance improvements | `perf: optimize model generation` |
| `docs` | No release | Documentation only | `docs: update configuration guide` |
| `style` | No release | Code style changes | `style: format code` |
| `refactor` | No release | Code refactoring | `refactor: simplify parser logic` |
| `test` | No release | Test changes | `test: add parser tests` |
| `chore` | No release | Maintenance tasks | `chore: update dependencies` |
| `chore(deps)` | Patch | Dependency updates | `chore(deps): update dio to v5.4` |

#### Examples

```bash
# Bug fix (patch release)
git commit -m "fix: handle nullable array items correctly"

# New feature (minor release)
git commit -m "feat: add Retrofit client support"

# Breaking change (major release)
git commit -m "feat!: rename generateDartCode to generate

BREAKING CHANGE: The main API function has been renamed for consistency"

# Multiple changes in one commit
git commit -m "feat(models): add union type support

- Add oneOf schema handling
- Generate Freezed union types
- Support discriminator property

Closes #123"
```

#### Scope Examples
- `core`: Core generation logic
- `cli`: CLI tool changes
- `models`: Model generation
- `services`: Service generation
- `parser`: OpenAPI parser
- `templates`: Template changes
- `deps`: Dependencies

### Architecture

This project reuses the OpenAPI parsing infrastructure from Orval while implementing Dart-specific code generation:

1. **Parse**: OpenAPI spec → normalized schema (using @apidevtools/swagger-parser)
2. **Transform**: Schema → Dart AST representation
3. **Generate**: AST → Dart code using templates
4. **Format**: Run `dart format` on generated files

## Features

### ✅ Completed
- **OpenAPI 3.0 and Swagger 2.0 support** - Full spec parsing and validation
- **Dio HTTP client generation** - Complete with ApiClient wrapper
- **Freezed model generation** - Immutable models with JSON serialization
- **Full null safety support** - Leveraging Dart's sound null safety
- **Complex type handling** - Nested objects, arrays, enums, oneOf/discriminators
- **All parameter types** - Path, query, header, and body parameters
- **All HTTP methods** - GET, POST, PUT, DELETE, PATCH, HEAD, OPTIONS
- **Reference resolution** - Complete `$ref` and component resolution
- **Smart header consolidation** - Automatic deduplication of header classes
- **Query parameter flattening** - Complex objects serialized to query strings
- **Inline object extraction** - Generates proper classes for inline schemas
- **Custom file naming** - `.f.dart` extension for Freezed models
- **Automated CI/CD** - GitHub Actions with semantic-release
- **Dual package support** - Both CommonJS and ES Modules
- **Comprehensive test suite** - 396 tests with 100% pass rate

### 🚧 In Progress
- **Watch mode** - Auto-regeneration on spec changes
- **Additional HTTP clients** - Retrofit, Chopper, HTTP package support
- **Mock data generation** - Test fixtures from schemas
- **Performance optimization** - For large OpenAPI specs

### 📋 Planned
- **State management integrations** - Riverpod, GetX, Bloc
- **GraphQL support** - Generate GraphQL clients
- **Custom interceptors** - User-defined request/response handlers
- **Interactive CLI wizard** - Guided configuration setup
- **VS Code extension** - IDE integration
- **API documentation generation** - From OpenAPI descriptions

## Generated Code Features

### ApiClient
The generated `ApiClient` class provides:
- **Automatic base URL configuration** from OpenAPI spec
- **Built-in error handling** with status code interceptors
- **Debug logging** enabled via environment variable
- **Request/response timeout** configuration
- **Default headers** management
- **Custom interceptors** support
- **Automatic retry logic** for failed requests (configurable)

### Service Classes
Each service class includes:
- **Type-safe methods** for all endpoints
- **Automatic parameter handling** (path, query, header, body)
- **Proper null safety** with nullable parameters
- **Exception handling** with custom `ApiException`
- **Response type mapping** to generated models
- **Request cancellation** support via `CancelToken`

### Model Classes
Generated with Freezed for:
- **Immutability** by default
- **JSON serialization/deserialization**
- **CopyWith** methods for easy updates
- **Equality operators** and hashCode
- **toString** implementations
- **Union types** for oneOf/discriminated unions
- **Nested object** support

### Parameter Classes
Separate parameter classes for:
- **Query parameters** with automatic null filtering
- **Header parameters** with consolidation support
- **Type-safe parameter** passing
- **Optional vs required** distinction

## Generated File Structure

```
lib/api/
├── api_client.dart           # Dio client wrapper with configuration
├── models/                   # Data models
│   ├── pet.f.dart           # Freezed model definition
│   ├── pet.f.freezed.dart   # Generated Freezed code
│   ├── pet.f.g.dart         # Generated JSON serialization
│   ├── params/              # Parameter classes
│   │   ├── list_pets_params.f.dart
│   │   └── index.dart
│   ├── headers/             # Header classes (if custom headers)
│   │   ├── api_key_header.f.dart
│   │   └── index.dart
│   └── index.dart           # Barrel export file
└── services/                 # API services
    ├── pets_service.dart    # Service with typed methods
    ├── api_exception.dart   # Custom exception handling
    └── index.dart           # Barrel export file
```

## Configuration Options

### Complete Configuration Reference

```typescript
export default {
  apiName: {  // Name your API (can have multiple APIs in one config)
    input: './openapi.yaml',        // Path to OpenAPI spec file or URL
    output: {
      target: './lib/api',           // Output directory path
      
      mode: 'split',                 // File organization mode
      // Options: 'single' | 'split' | 'tags'
      // - 'single': All code in one file
      // - 'split': Separate files for models and services (default)
      // - 'tags': Group by OpenAPI tags
      
      client: 'dio',                 // HTTP client library (currently only 'dio' is supported)
      // Future options planned: 'http' | 'chopper' | 'retrofit'
      
      override: {
        generator: {
          freezed: true,             // Use Freezed for immutable models
          jsonSerializable: true,    // Add JSON serialization
          nullSafety: true,          // Enable null safety (default: true)
          partFiles: true,           // Generate part files (default: true)
          equatable: false           // Add Equatable support (default: false)
        },
        
        methodNaming: 'methodPath',  // Method naming strategy
        // Options: 'operationId' | 'methodPath'
        // - 'operationId': Use OpenAPI operationId
        // - 'methodPath': Generate from HTTP method + path (e.g., getUsersById)
        
        dio: {
          baseUrl: 'https://api.example.com',  // Override base URL
          interceptors: ['AuthInterceptor']    // Custom interceptors
        },
        
        // Custom header consolidation (new feature!)
        headers: {
          // Define reusable header classes
          definitions: {
            ApiKeyHeader: {
              fields: ['x-api-key'],
              required: ['x-api-key'],
              description: 'API key authentication'
            },
            CompanyHeaders: {
              fields: ['x-api-key', 'x-company-id', 'x-user-id'],
              required: ['x-api-key', 'x-company-id'],  // x-user-id is optional
              description: 'Company context headers'
            }
          },
          
          // Optional: Map specific endpoints to header classes
          mapping: {
            '/v1/health/*': 'ApiKeyHeader',
            '/v1/companies/**': 'CompanyHeaders'
          },
          
          // Enable smart header matching
          customMatch: true,           // Auto-match endpoints to header definitions
          matchStrategy: 'exact',      // 'exact' | 'subset' | 'fuzzy'
          customConsolidate: true,     // Auto-create shared classes for common patterns
          consolidationThreshold: 3    // Min endpoints to trigger consolidation
        }
      }
    },
    hooks: {
      afterAllFilesWrite: 'dart format .'  // Commands to run after generation
    }
  }
}
```

### Configuration Examples

#### Basic Configuration
```typescript
export default {
  petstore: {
    input: './petstore.yaml',
    output: {
      target: './lib/api'
    }
  }
}
```

#### Advanced Configuration
```typescript
export default {
  myApi: {
    input: './tests/openapi.json',
    output: {
      target: './generated-api',
      mode: 'split',
      client: 'dio',
      override: {
        generator: {
          freezed: true,
          jsonSerializable: true,
          nullSafety: true
        },
        methodNaming: 'methodPath'  // getUsersById instead of getUserById
      }
    },
    hooks: {
      afterAllFilesWrite: [
        'dart format ./generated-api',
        'flutter pub run build_runner build'
      ]
    }
  }
}
```

#### Header Consolidation Configuration

Dorval can intelligently consolidate duplicate header classes across your API. Instead of generating a separate header class for each endpoint (which could result in 100+ nearly identical classes), you can define common header patterns that will be reused.

##### How `definitions` Works

The `definitions` object lets you define reusable header classes that match common patterns in your API:

```typescript
export default {
  api: {
    input: './openapi.json',
    output: {
      target: './lib/api',
      override: {
        headers: {
          definitions: {
            // Public endpoints - API key only
            PublicHeaders: {
              fields: ['x-api-key'],
              required: ['x-api-key'],
              description: 'Public API authentication'
            },

            // Authenticated user endpoints
            AuthHeaders: {
              fields: ['x-api-key', 'authorization'],
              required: ['x-api-key', 'authorization'],
              description: 'Authenticated user headers'
            },

            // Multi-tenant endpoints (most common pattern)
            TenantHeaders: {
              fields: ['x-api-key', 'authorization', 'x-tenant-id'],
              required: ['x-api-key', 'authorization', 'x-tenant-id'],
              description: 'Multi-tenant context headers'
            },

            // Admin endpoints with optional impersonation
            AdminHeaders: {
              fields: ['x-api-key', 'authorization', 'x-tenant-id', 'x-impersonate-user'],
              required: ['x-api-key', 'authorization'],  // tenant and impersonate are optional
              description: 'Admin headers with optional impersonation'
            }
          }
        }
      }
    }
  }
}
```

##### Generated Output

With the above configuration, Dorval generates:

**1. Consolidated header classes** (in `models/headers/`):
```dart
// tenant_headers.f.dart
@freezed
abstract class TenantHeaders with _$TenantHeaders {
  const factory TenantHeaders({
    @JsonKey(name: 'x-api-key')
    required String xApiKey,

    @JsonKey(name: 'authorization')
    required String authorization,

    @JsonKey(name: 'x-tenant-id')
    required String xTenantId,
  }) = _TenantHeaders;

  factory TenantHeaders.fromJson(Map<String, dynamic> json) =>
      _$TenantHeadersFromJson(json);
}
```

**2. Services use the consolidated headers**:
```dart
// Instead of 100+ unique header classes, services reuse the definitions:
class UsersService {
  Future<List<User>> getUsers({
    GetUsersParams? params,
    TenantHeaders? headers,  // Reused across many endpoints!
  }) async { ... }
}
```

##### Matching Logic

Dorval matches endpoints to header definitions by:

1. **Extracting headers** from each endpoint in the OpenAPI spec
2. **Comparing fields** with each definition (order-independent)
3. **Checking required status** matches
4. **Selecting the best match** or generating endpoint-specific class if no match

##### Example: Before vs After

**Before consolidation** (without definitions):
```
models/headers/
├── get_users_headers.f.dart
├── post_users_headers.f.dart
├── get_orders_headers.f.dart
├── post_orders_headers.f.dart
├── get_products_headers.f.dart
├── ... (100+ nearly identical files!)
```

**After consolidation** (with definitions):
```
models/headers/
├── public_headers.f.dart      # Used by public endpoints
├── auth_headers.f.dart        # Used by authenticated endpoints
├── tenant_headers.f.dart      # Used by most endpoints
├── admin_headers.f.dart       # Used by admin endpoints
└── index.dart
```

**Result: 100+ header classes → 4 reusable classes!**

##### Advanced Options

```typescript
headers: {
  definitions: { ... },

  // Enable automatic matching (default: true)
  customMatch: true,

  // Match strategy
  matchStrategy: 'exact',  // 'exact' | 'subset' | 'fuzzy'

  // Auto-create shared classes for common patterns not in definitions
  customConsolidate: true,
  consolidationThreshold: 3  // Min endpoints to trigger auto-consolidation
}
```

**Match Strategies:**
- `exact`: Fields and required status must match exactly (recommended)
- `subset`: Endpoint headers can be a subset of the definition
- `fuzzy`: Best-effort matching using similarity scoring

## Examples

Sample projects are coming soon. For now, refer to the configuration examples above.

## CLI Usage

```bash
# Generate from OpenAPI spec
dorval generate [options]

Options:
  -c, --config <path>   Path to config file (orval.config.ts)
  -i, --input <path>    OpenAPI spec file or URL
  -o, --output <path>   Output directory
  --client <type>       Client type (currently only 'dio')
  --help               Display help

# Watch mode (coming soon)
# dorval watch [options]
```

## Troubleshooting

### Common Issues

1. **"Cannot find module '@dorval/core'" error**
   - Ensure you've installed dorval: `npm install -g dorval`
   - Or use npx: `npx dorval generate -i spec.yaml -o ./lib`

2. **Generated methods return correct model types**
   - ✅ Fixed: Response types are now properly mapped to generated models
   - Models are generated with proper Freezed annotations

3. **Import errors in generated Dart code**
   - Run `flutter pub get` after generation
   - Run `flutter pub run build_runner build --delete-conflicting-outputs`
   - Ensure all dependencies are in `pubspec.yaml`

4. **Duplicate header classes**
   - ✅ Fixed: Smart header consolidation automatically reduces duplicates
   - Configure consolidation threshold in config file if needed

## Development Roadmap

### ✅ Completed Features

- ✅ **Comprehensive test suite** - 396 tests, 100% passing
- ✅ **CI/CD pipeline** - GitHub Actions with automated testing
- ✅ **Semantic release** - Automated versioning and npm publishing
- ✅ **Smart header consolidation** - Reduces duplicate header classes
- ✅ **Proper response type mapping** - Models correctly typed
- ✅ **OneOf with discriminator** - Generates proper Freezed union types with `@Freezed(unionKey)` and `@FreezedUnionValue`
- ✅ **Inline object handling** - Generates nested classes instead of Map
- ✅ **Query parameter flattening** - Complex objects properly serialized

### 🎯 High Priority Tasks

#### Testing & Quality
- [ ] **Expand test coverage**
  - [x] Unit tests for generators (✅ Done)
  - [x] Integration tests (✅ Done)
  - [ ] More E2E tests with real-world OpenAPI specs
  - [ ] Performance benchmarks
  - [ ] Test coverage badges

#### Client Implementations
- [ ] **Custom client support**
  - [ ] Allow users to provide custom HTTP client implementations
  - [ ] Support for custom request/response interceptors
  - [ ] Custom error handling strategies
  - [ ] Request retry logic configuration
  
- [ ] **Additional HTTP clients**
  - [ ] Complete Retrofit implementation
  - [ ] Chopper client support
  - [ ] Built-in HTTP package support
  - [ ] GraphQL client generation

#### Core Features
- [ ] **Enhanced type handling**
  - [ ] Better support for oneOf/anyOf/allOf
  - [ ] Discriminated unions with proper type checking
  - [ ] Recursive type definitions
  - [ ] Better handling of nullable types
  
- [ ] **Configuration improvements**
  - [ ] Support for .dorvalrc configuration files
  - [ ] Environment-specific configurations
  - [ ] Global vs project-specific settings
  - [ ] Configuration validation and error messages

### 🚀 Medium Priority Features

#### Developer Experience
- [ ] **CLI enhancements**
  - [ ] Interactive configuration wizard
  - [ ] Watch mode with hot reload
  - [ ] Diff view for regenerated files
  - [ ] Dry-run mode to preview changes
  - [ ] Progress indicators for large specs

- [ ] **IDE integrations**
  - [ ] VS Code extension
  - [ ] IntelliJ/Android Studio plugin
  - [ ] Code completion for generated APIs
  - [ ] Inline documentation from OpenAPI descriptions

#### Flutter Ecosystem Integration
- [ ] **State management integrations**
  - [ ] Riverpod providers generation
  - [ ] Bloc/Cubit pattern support
  - [ ] GetX controllers generation
  - [ ] Provider package integration
  
- [ ] **Testing utilities**
  - [ ] Mock server generation
  - [ ] Fake data generators from schemas
  - [ ] Test fixtures from OpenAPI examples
  - [ ] Integration with mockito

### 🌟 Nice-to-Have Features

#### Advanced Generation
- [ ] **Code optimization**
  - [ ] Tree-shaking unused models
  - [ ] Lazy loading for large APIs
  - [ ] Code splitting by feature/module
  - [ ] Minification options

- [ ] **Documentation**
  - [ ] Generate API documentation website
  - [ ] Dartdoc comments from OpenAPI descriptions
  - [ ] Usage examples generation
  - [ ] Postman collection export

#### Community Features
- [ ] **Plugin system**
  - [ ] Custom template support
  - [ ] Hook system for pre/post generation
  - [ ] Custom validators
  - [ ] Community plugin marketplace

- [ ] **Multi-language support**
  - [ ] Generate both Dart and TypeScript from same spec
  - [ ] Shared model definitions
  - [ ] Cross-platform type safety

### 🐛 Known Issues to Fix

1. **Large file handling** - Performance issues with very large OpenAPI specs (>10MB)
2. **Error messages** - Improve error messages for invalid OpenAPI specs
3. **Windows compatibility** - Path handling issues on Windows
4. **Watch mode** - Not yet implemented
5. **Multiple client support** - Currently only Dio is supported

### 📊 Performance Goals

- Generate 1000+ endpoints in < 5 seconds
- Support OpenAPI specs up to 50MB
- Memory usage < 500MB for large specs
- Incremental generation for faster updates

### 🔧 Technical Debt

- [ ] Refactor parser to use visitor pattern
- [ ] Improve template organization
- [ ] Add proper logging system
- [ ] Implement caching for parsed specs
- [ ] Better error recovery during generation
- [ ] Standardize naming conventions across codebase

### 📚 Documentation Needs

- [ ] Complete API reference documentation
- [ ] Video tutorials for common use cases
- [ ] Migration guide from other generators
- [ ] Best practices guide
- [ ] Troubleshooting guide
- [ ] Performance optimization guide

## Contributing

We welcome contributions! See [CONTRIBUTING.md](./CONTRIBUTING.md) for guidelines.

Want to help? Check the roadmap above and pick a task! We welcome contributions of all sizes.

## License

MIT © 2025

## Acknowledgments

Built on top of the excellent [Orval](https://orval.dev) project.