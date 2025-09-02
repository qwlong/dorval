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
- 🌐 **Multiple HTTP clients** - Support for Dio, HTTP, and Retrofit
- ✅ **Full null safety** - Leveraging Dart's sound null safety
- 🧪 **Mock implementations** - Built-in support for testing

## Project Structure

```
dorval/
├── packages/
│   ├── core/                   # Core generation logic (@dorval/core)
│   │   ├── src/
│   │   │   ├── parser/         # OpenAPI parsing
│   │   │   ├── generators/     # Dart code generators
│   │   │   ├── templates/      # Code templates
│   │   │   └── utils/
│   │   └── package.json
│   │
│   └── dorval/                 # CLI tool (dorval)
│       ├── src/
│       │   ├── bin/           # CLI entry point
│       │   └── commands/      # CLI commands
│       └── package.json
│
└── samples/                    # Example projects
    └── petstore/              # Petstore API example
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
# Using config file
dorval generate

# Using command line options
dorval generate -i ./petstore.yaml -o ./lib/api

# Watch mode (with config file)
dorval watch
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

### Architecture

This project reuses the OpenAPI parsing infrastructure from Orval while implementing Dart-specific code generation:

1. **Parse**: OpenAPI spec → normalized schema (using @apidevtools/swagger-parser)
2. **Transform**: Schema → Dart AST representation
3. **Generate**: AST → Dart code using templates
4. **Format**: Run `dart format` on generated files

## Features

### ✅ Completed
- OpenAPI 3.0 and Swagger 2.0 support
- Dio HTTP client generation with ApiClient wrapper
- Freezed model generation with JSON serialization
- Full null safety support
- Complex type handling (nested objects, arrays, enums)
- Path, query, header, and body parameter support
- All HTTP methods (GET, POST, PUT, DELETE, PATCH)
- Reference resolution for `$ref` schemas
- Custom file naming conventions (`.f.dart` for Freezed models)
- **Custom header consolidation** - Intelligent header class matching and deduplication

### 🚧 In Progress
- Retrofit client generation
- Mock data generation for testing
- Response type preservation (currently returns `Map<String, dynamic>`)
- CLI watch mode for automatic regeneration

### 📋 Planned
- Riverpod integration with providers
- GetX integration
- GraphQL support
- Custom interceptors and transformers
- Watch mode for development

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
├── api_config.dart           # API configuration and constants
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
      
      client: 'dio',                 // HTTP client library
      // Options: 'dio' | 'http' | 'chopper' | 'retrofit'
      // - 'dio': Dio HTTP client (default, recommended)
      // - 'http': Dart's built-in http package
      // - 'chopper': Chopper REST client
      // - 'retrofit': Retrofit-style annotations (experimental)
      
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

Dorval can intelligently consolidate duplicate header classes across your API:

```typescript
export default {
  api: {
    input: './openapi.json',
    output: {
      target: './lib/api',
      override: {
        headers: {
          // Define common header patterns
          definitions: {
            BasicAuth: {
              fields: ['x-api-key'],
              required: ['x-api-key']
            },
            UserContext: {
              fields: ['x-api-key', 'x-user-id', 'x-session-id'],
              required: ['x-api-key', 'x-user-id']  // x-session-id is optional
            },
            AdminContext: {
              fields: ['x-api-key', 'x-admin-id', 'x-permission-level'],
              required: ['x-api-key', 'x-admin-id', 'x-permission-level']
            }
          },
          
          // Enable automatic matching
          customMatch: true,
          matchStrategy: 'exact',  // Matches must have exact same fields and required status
          
          // Auto-consolidate common patterns
          customConsolidate: true,
          consolidationThreshold: 3  // Create shared class if 3+ endpoints use same headers
        }
      }
    }
  }
}
```

**Benefits:**
- **Reduces duplication**: Instead of 85 header classes, you might only need 5-10
- **Order-independent**: Headers with same fields but different order are recognized as identical
- **Required-aware**: Distinguishes between required and optional fields
- **Smart naming**: Auto-generates meaningful names for consolidated classes

**Match Strategies:**
- `exact`: Fields and required status must match exactly (recommended)
- `subset`: Endpoint headers can be a subset of the definition
- `fuzzy`: Best-effort matching using similarity scoring

## Examples

Check out the [samples/petstore](./samples/petstore) directory for a complete example with the Petstore API.

## CLI Usage

```bash
# Generate from OpenAPI spec
dorval generate [options]

Options:
  -c, --config <path>   Path to config file (orval.config.ts)
  -i, --input <path>    OpenAPI spec file or URL
  -o, --output <path>   Output directory
  --client <type>       Client type: dio, http, chopper (default: dio)
  --help               Display help

# Watch mode (requires config file)
dorval watch [options]

Options:
  -c, --config <path>   Path to config file (orval.config.ts)
```

## Troubleshooting

### Common Issues

1. **"Missing loader for extension 'orval.config.mjs'" error**
   - Use command line options: `dorval generate -i spec.yaml -o ./lib`
   - Or create a valid config file (orval.config.ts/js/cjs)

2. **Response types showing as `Map<String, dynamic>`**
   - This is a known issue with reference resolution
   - Workaround: Cast responses manually for now

3. **Duplicate method definitions in services**
   - Check your OpenAPI spec for duplicate operation IDs
   - Ensure unique tags and operation IDs

4. **Build errors after generation**
   - Run `flutter pub get` to fetch dependencies
   - Run `dart run build_runner build` to generate Freezed/JSON files

## Development Roadmap

### 🎯 High Priority Tasks

#### Testing & Quality
- [ ] **Add comprehensive test suite**
  - [ ] Unit tests for parser modules
  - [ ] Unit tests for generators
  - [ ] Integration tests for CLI commands
  - [ ] E2E tests with sample OpenAPI specs
  - [ ] Test coverage reporting (target: 90%+)
  - [ ] CI/CD pipeline with GitHub Actions

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

1. **Response type mapping** - ~~Some complex response types still generate as `Map<String, dynamic>`~~ ✅ Fixed
2. **Duplicate method generation** - ~~Methods sometimes appear twice in service files~~ ✅ Fixed
3. **Large file handling** - Performance issues with very large OpenAPI specs (>10MB)
4. **Error messages** - Improve error messages for invalid OpenAPI specs
5. **Windows compatibility** - Path handling issues on Windows

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