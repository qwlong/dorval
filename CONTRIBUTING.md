# 🤝 Contributing to Dorval

Thank you for your interest in contributing to Dorval! We welcome contributions of all kinds - from bug fixes to new features, documentation improvements to test coverage.

## Development Setup

### Prerequisites

- **Node.js** >= 18.0.0
- **Yarn** >= 4.0.0 (we use Yarn workspaces)
- **TypeScript** 5.0+ knowledge
- **Dart SDK** >= 3.0.0 (for testing generated code)
- **Flutter SDK** (optional, for running sample app)
- **Git** for version control

### Getting Started

1. **Fork and clone the repository:**
   ```bash
   # Fork on GitHub first, then:
   git clone https://github.com/YOUR_USERNAME/dorval.git
   cd orval-dart
   
   # Add upstream remote
   git remote add upstream https://github.com/qwlong/dorval.git
   ```

2. **Install dependencies:**
   ```bash
   yarn install
   ```

3. **Build the project:**
   ```bash
   yarn build
   ```

4. **Run tests:**
   ```bash
   yarn test
   ```

## 📁 Project Structure

```
orval-dart/
├── packages/
│   ├── core/                   # Core generation logic (@dorval/core)
│   │   ├── src/
│   │   │   ├── generators/     # Code generators for Dart
│   │   │   ├── parser/         # OpenAPI spec parsing
│   │   │   ├── templates/      # Handlebars templates
│   │   │   ├── utils/          # Utilities and helpers
│   │   │   └── __tests__/      # Unit tests
│   │   └── dist/               # Compiled output
│   │
│   └── dorval/                 # CLI tool (dorval npm package)
│       ├── src/
│       │   ├── bin/            # CLI entry point
│       │   └── commands/       # CLI commands
│       └── dist/               # Compiled output
│
├── samples/                     # Example projects
│   └── petstore/               # Petstore sample application
│
├── reference/                   # Reference code from Orval
├── test/                        # Integration tests
└── docs/                        # Documentation (if any)
```

## Development Workflow

### Working on Core Logic

1. Navigate to the core package:
   ```bash
   cd packages/core
   ```

2. Run in watch mode:
   ```bash
   yarn dev
   ```

3. Write tests for new features:
   ```bash
   yarn test:watch
   ```

### 🎨 Working on Templates

Templates are located in `packages/core/src/templates/`. We use Handlebars for templating.

#### Available Templates:
- `freezed-model.hbs` - Freezed data models
- `service.hbs` - API service classes
- `service-method.hbs` - Individual API methods
- `dio-client.hbs` - Dio client wrapper
- `params-model.hbs` - Parameter models
- `enum.hbs` - Enum definitions

#### Template Variables:
```handlebars
{{className}}          # Class name (PascalCase)
{{fileName}}           # File name (snake_case)
{{type}}               # Dart type
{{nullable}}           # ? for nullable
{{required}}           # required keyword
{{#each properties}}   # Iterate properties
{{#if condition}}      # Conditionals
```

#### Example Template:
```handlebars
import 'package:freezed_annotation/freezed_annotation.dart';

part '{{fileName}}.freezed.dart';
part '{{fileName}}.g.dart';

@freezed
class {{className}} with _${{className}} {
  const factory {{className}}({
    {{#each properties}}
    {{#if required}}required {{/if}}{{dartType}}{{#if nullable}}?{{/if}} {{name}},
    {{/each}}
  }) = _{{className}};

  factory {{className}}.fromJson(Map<String, dynamic> json) =>
      _${{className}}FromJson(json);
}
```

### 🧪 Testing

#### Unit Tests
```bash
# Run all tests
yarn test

# Run tests in watch mode
yarn test:watch

# Run specific test file
yarn test packages/core/src/__tests__/type-mapper.test.ts

# Run with coverage
yarn test:coverage
```

#### Integration Tests
```bash
# Generate test API
node generate-shift-api.js

# Check generated files
ls -la generated-shift-api/
```

#### Testing Generated Dart Code
```bash
# Generate code for sample app
cd samples/petstore
dorval generate

# Run Dart analysis
dart analyze lib/api

# Run Flutter tests
flutter test
```

## 🎨 Code Style

### TypeScript
- Use **TypeScript strict mode**
- Follow **ESLint** rules (run `yarn lint`)
- Format with **Prettier** (run `yarn format`)
- Add **JSDoc** comments for public APIs
- Use **meaningful variable names**
- Prefer **const** over let
- Use **async/await** over promises

### Dart (Generated Code)
- Follow **Dart style guide**
- Use **dart format** for formatting
- Ensure **null safety** compliance
- Add **dartdoc** comments where appropriate

### Commit Messages
Follow conventional commits:
```
feat: add retrofit client support
fix: resolve enum generation issue
docs: update README examples
test: add parser unit tests
refactor: simplify type mapper
```

## Submitting Changes

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/my-feature`
3. Make your changes
4. Add tests for new functionality
5. Ensure all tests pass: `yarn test`
6. Format code: `yarn format`
7. Commit with descriptive message
8. Push to your fork
9. Create a Pull Request

## Pull Request Guidelines

- Describe what changes you've made
- Reference any related issues
- Include test coverage for new features
- Update documentation if needed
- Ensure CI passes

## Reporting Issues

- Use GitHub Issues
- Provide clear reproduction steps
- Include OpenAPI spec sample if relevant
- Mention your environment (Node version, OS, etc.)

## 🎯 Areas for Contribution

### High Priority
- 🔴 **Fix response type mapping** - Services should return typed models, not `Map<String, dynamic>`
- 🔴 **Resolve duplicate method generation** - Some services have duplicate method definitions
- 🔴 **Improve `$ref` resolution** - Better handling of OpenAPI references

### Features
- 🟡 **Retrofit client support** - Add Retrofit as an alternative to Dio
- 🟡 **Mock generation** - Generate mock implementations for testing
- 🟡 **GraphQL support** - Extend to support GraphQL schemas
- 🟢 **Watch mode** - Auto-regenerate on spec changes
- 🟢 **Custom interceptors** - Support for custom HTTP interceptors
- 🟢 **Validation** - Runtime validation of API responses

### Documentation
- 📝 API documentation
- 📝 More examples
- 📝 Video tutorials
- 📝 Migration guides

### Testing
- 🧪 Increase test coverage (target: 90%)
- 🧪 Add E2E tests
- 🧪 Test more OpenAPI edge cases

## 💬 Getting Help

- **Questions**: Open a [GitHub Discussion](https://github.com/qwlong/dorval/discussions)
- **Bugs**: File an [Issue](https://github.com/qwlong/dorval/issues)
- **Ideas**: Start a discussion or open an RFC issue
- **Chat**: Join our community (coming soon)

## 🏆 Recognition

Contributors will be:
- Listed in the README
- Mentioned in release notes
- Given credit in relevant documentation

## 📄 License

By contributing, you agree that your contributions will be licensed under the MIT License.

---

**Thank you for helping make Dorval better!** 🚀