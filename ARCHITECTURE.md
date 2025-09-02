# Dorval Architecture

## Overview

Dorval implements a clean, modular architecture inspired by Orval, adapted for Dart/Flutter code generation from OpenAPI specifications.

## Directory Structure

```
src/
├── composers/              # Schema composition (oneOf, anyOf, allOf)
│   ├── types.ts           # Type definitions
│   ├── base-composer.ts   # Base composer class
│   ├── one-of-composer.ts # oneOf composition
│   ├── any-of-composer.ts # anyOf composition
│   ├── all-of-composer.ts # allOf composition
│   ├── discriminator-handler.ts # Discriminator logic
│   └── index.ts           # Main composer interface
│
├── resolvers/              # Schema and reference resolution
│   ├── schema-resolver.ts # Complex schema resolution
│   └── index.ts
│
├── generators/             # Code generation
│   ├── model-generator.ts # Model generation
│   ├── service-generator.ts # Service generation
│   ├── models.ts          # Model orchestration
│   └── services.ts        # Service orchestration
│
├── parser/                 # OpenAPI parsing
│   ├── openapi-parser.ts  # Main parser
│   ├── endpoints.ts       # Endpoint parsing
│   └── models.ts          # Model parsing
│
├── templates/              # Handlebars templates
│   ├── freezed-model.hbs  # Freezed model template
│   ├── service.hbs        # Service template
│   └── ...
│
└── utils/                  # Utilities
    ├── type-mapper.ts     # Type mapping
    ├── ref-resolver.ts    # Reference resolution
    └── file.ts            # File operations
```

## Key Components

### 1. Composers (`src/composers/`)

Handles OpenAPI schema composition patterns (oneOf, anyOf, allOf) for Dart/Freezed generation.

#### **SchemaComposer**
Main orchestrator that delegates to specific composers based on composition type.

```typescript
const composer = createSchemaComposer(schemas, refResolver, options);

// Detect and compose discriminated unions
const unionInfo = composer.detectDiscriminatedUnion(schema);
if (unionInfo.isDiscriminatedUnion) {
  const result = composer.composeDiscriminatedUnion(name, ...);
}

// Compose top-level compositions
if (composer.hasComposition(schema)) {
  const result = composer.compose(name, schema);
}
```

#### **OneOfComposer**
Generates Freezed sealed classes for oneOf patterns:
- Nullable patterns → `Type?`
- With discriminator → Sealed classes with factory constructors
- Without discriminator → Wrapper classes with dynamic value

#### **AnyOfComposer**
Similar to oneOf but allows multiple valid types simultaneously.
Tracks which types match for proper validation.

#### **AllOfComposer**
Combines properties from multiple schemas into a single model.
Handles property merging and inheritance.

#### **DiscriminatorHandler**
Detects and processes discriminator patterns in schemas.
Maps discriminator values to type names.

### 2. Resolvers (`src/resolvers/`)

#### **SchemaResolver**
Resolves complex schema structures:
- Handles circular references
- Caches resolved schemas
- Determines Dart types from OpenAPI schemas

### 3. Generators (`src/generators/`)

#### **ModelGenerator**
Generates Freezed models from OpenAPI schemas.
Uses composers for complex types.

#### **ServiceGenerator**
Generates API service classes with Dio HTTP client.

### 4. Parser (`src/parser/`)

#### **OpenAPIParser**
Parses OpenAPI specifications:
- Validates against OpenAPI 3.0 spec
- Normalizes nullable patterns
- Extracts schemas and endpoints

## Schema Composition Patterns

### oneOf with Discriminator

**OpenAPI:**
```yaml
MyFeedItem:
  type: object
  properties:
    itemType:
      type: string
      enum: [shift, time_off_request]
    item:
      oneOf:
        - $ref: '#/components/schemas/ShiftResponseDtoV2'
        - $ref: '#/components/schemas/MyFeedTimeOffRequestItem'
```

**Generated Dart:**
```dart
@Freezed(unionKey: 'itemType', unionValueCase: FreezedUnionCase.snake)
sealed class MyFeedItem with _$MyFeedItem {
  const factory MyFeedItem.shift(ShiftResponseDtoV2 item) = _MyFeedItemShift;
  const factory MyFeedItem.timeOffRequest(MyFeedTimeOffRequestItem item) = _MyFeedItemTimeOffRequest;
  
  factory MyFeedItem.fromJson(Map<String, dynamic> json) =>
      _$MyFeedItemFromJson(json);
}
```

### allOf Composition

**OpenAPI:**
```yaml
Dog:
  allOf:
    - $ref: '#/components/schemas/Animal'
    - type: object
      properties:
        breed:
          type: string
```

**Generated Dart:**
```dart
@freezed
class Dog with _$Dog {
  const factory Dog({
    // Properties from Animal
    required String name,
    required int age,
    // Properties from Dog
    required String breed,
  }) = _Dog;
}
```

### Nullable oneOf Pattern

**OpenAPI:**
```yaml
oneOf:
  - type: string
  - type: 'null'
```

**Generated Dart:**
```dart
String? // Simple nullable type
```

## Design Principles

### 1. Separation of Concerns
- **Parsing**: Extract data from OpenAPI
- **Resolution**: Resolve references and types
- **Composition**: Handle complex schema patterns
- **Generation**: Produce Dart code

### 2. Modularity
Each composer can be used independently or as part of the main SchemaComposer.

### 3. Type Safety
Generate strongly-typed Dart code with proper null safety.

### 4. Extensibility
Easy to add new composers or modify existing ones.

## Key Differences from Orval

1. **Target Language**: Dart/Flutter instead of TypeScript
2. **State Management**: Uses Freezed for immutable models
3. **HTTP Client**: Dio instead of Axios
4. **Union Types**: Sealed classes instead of TypeScript unions
5. **Null Safety**: Built-in Dart null safety

## Usage Example

```typescript
import { generateDartCode } from '@dorval/core';

const result = await generateDartCode({
  input: './openapi.yaml',
  output: {
    target: './generated',
    mode: 'split',
    client: 'dio'
  }
});
```

## Future Enhancements

1. **Additional Composers**: Support for more OpenAPI patterns
2. **Custom Templates**: User-definable templates
3. **Plugin System**: Extensible architecture
4. **Better Error Messages**: More helpful error reporting
5. **Performance Optimization**: Caching and parallel processing