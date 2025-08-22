# 🧪 Dorval Tests

This directory contains integration tests and test specifications for the Dorval code generator.

## Directory Structure

```
tests/
├── specifications/      # OpenAPI test specifications
│   ├── petstore.yaml   # Basic API with CRUD operations
│   └── advanced.yaml   # Advanced features (allOf, oneOf, enums)
│
├── configs/            # Test configuration files
│   ├── basic.config.ts      # Basic configuration
│   ├── advanced.config.ts   # Advanced features test
│   └── multi-api.config.ts  # Multiple APIs test
│
├── generated/          # Generated test output (git ignored)
│   ├── petstore/      # Basic API output
│   ├── advanced/      # Advanced features output
│   └── multi/         # Multiple APIs output
│
└── run-tests.sh       # Test runner script
```

## Running Tests

### Run All Tests
```bash
./run-tests.sh
```

### Run Specific Test
```bash
# Test basic Petstore API
node ../packages/dorval/dist/bin/dorval.js generate \
  -c configs/basic.config.ts

# Test advanced features
node ../packages/dorval/dist/bin/dorval.js generate \
  -c configs/advanced.config.ts

# Test multiple APIs
node ../packages/dorval/dist/bin/dorval.js generate \
  -c configs/multi-api.config.ts
```

## Test Specifications

### 1. petstore.yaml
Basic OpenAPI 3.0 specification testing:
- CRUD operations (GET, POST, PUT, DELETE)
- Path parameters
- Query parameters
- Request bodies
- Response schemas
- References ($ref)
- Arrays
- Enums

### 2. advanced.yaml
Advanced OpenAPI features testing:
- `allOf` composition
- `oneOf` unions with discriminators
- `anyOf` combinations
- Nullable fields
- Nested objects
- Complex enums
- UUID formats
- Date-time formats
- Pattern validation
- Min/max constraints

## Test Configurations

### basic.config.ts
- Standard Freezed model generation
- Dio client
- Split file mode
- JSON serialization

### advanced.config.ts
- All basic features plus:
- Custom headers
- Post-generation hooks
- Clean output directory
- Additional Freezed features (copyWith, equal, toString)

### multi-api.config.ts
- Multiple API definitions in one config
- Different output modes (split vs single)
- Separate output directories

## Expected Output

After running tests, the `generated/` directory should contain:

### Basic Test Output
```
generated/petstore/
├── api_client.dart         # Dio client wrapper
├── api_config.dart         # Configuration
├── models/
│   ├── pet.f.dart         # Pet model
│   ├── category.f.dart    # Category model
│   ├── error.f.dart       # Error model
│   └── index.dart         # Barrel exports
└── services/
    ├── pets_service.dart  # Pet endpoints
    └── index.dart         # Barrel exports
```

### Advanced Test Output
```
generated/advanced/
├── api_client.dart
├── api_config.dart
├── models/
│   ├── user.f.dart           # User with allOf
│   ├── user_role.f.dart      # Enum
│   ├── user_status.f.dart    # Enum
│   ├── document.f.dart       # OneOf union
│   ├── text_document.f.dart  # Discriminated type
│   ├── image_document.f.dart # Discriminated type
│   ├── video_document.f.dart # Discriminated type
│   └── index.dart
└── services/
    └── default_service.dart
```

## Adding New Tests

1. **Create a specification** in `specifications/`:
```yaml
# specifications/my-test.yaml
openapi: '3.0.0'
info:
  title: My Test API
  version: 1.0.0
paths:
  # ... your test paths
```

2. **Create a configuration** in `configs/`:
```typescript
// configs/my-test.config.ts
export default defineConfig({
  myTest: {
    input: '../specifications/my-test.yaml',
    output: {
      target: '../generated/my-test',
      // ... configuration
    }
  }
});
```

3. **Run the test**:
```bash
node ../packages/dorval/dist/bin/dorval.js generate \
  -c configs/my-test.config.ts
```

## Validation

Generated code should:
1. ✅ Compile without errors
2. ✅ Pass Dart analysis (`dart analyze`)
3. ✅ Have proper null safety
4. ✅ Include all expected files
5. ✅ Handle all OpenAPI features correctly

## Known Issues

- Response types currently generate as `Map<String, dynamic>` instead of typed models
- Some complex oneOf/anyOf combinations may not generate correctly
- Discriminator mapping needs improvement

## Contributing

When adding new test cases:
1. Include both the OpenAPI spec and config file
2. Document what features are being tested
3. Add assertions to verify correct generation
4. Update this README with the new test