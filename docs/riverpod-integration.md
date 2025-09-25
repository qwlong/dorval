# Riverpod Integration for Dorval Generated Code

## Overview
This document outlines strategies for integrating Riverpod state management with Dorval-generated API clients.

## Integration Approaches

### 1. Provider Generation Approach (Recommended)
Generate Riverpod providers alongside service classes for seamless integration.

#### Benefits
- Zero boilerplate for consumers
- Type-safe providers out of the box
- Automatic dependency injection
- Built-in caching and state management

#### Implementation Strategy

##### Option 1A: Generate Separate Provider Files
```dart
// Generated: providers/locations_provider.dart
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../services/locations_service.dart';
import '../api_client.dart';

// Service provider
final locationsServiceProvider = Provider<LocationsService>((ref) {
  final apiClient = ref.watch(apiClientProvider);
  return LocationsService(apiClient);
});

// Method-specific providers with caching
final getCoreLocationsProvider = FutureProvider.family<
  List<CoreLocationDto>,
  String
>((ref, coreCompanyId) async {
  final service = ref.watch(locationsServiceProvider);
  return service.getV1CompaniesCoreCompanyIdLocations(coreCompanyId);
});

// With auto-dispose for memory management
final getLocationSettingsProvider = FutureProvider.family.autoDispose<
  LocationSettingsResponseDto,
  String
>((ref, locationId) async {
  final service = ref.watch(locationsServiceProvider);
  return service.getV1LocationsLocationIdSettings(locationId);
});

// Mutation providers using StateNotifier
class UpdateLocationSettingsNotifier extends StateNotifier<AsyncValue<LocationSettingsResponseDto?>> {
  final LocationsService _service;

  UpdateLocationSettingsNotifier(this._service) : super(const AsyncValue.data(null));

  Future<void> update(String locationId, LocationSettingsRequestDto body) async {
    state = const AsyncValue.loading();
    state = await AsyncValue.guard(() =>
      _service.patchV1LocationsLocationIdSettings(locationId, body)
    );
  }
}

final updateLocationSettingsProvider = StateNotifierProvider<
  UpdateLocationSettingsNotifier,
  AsyncValue<LocationSettingsResponseDto?>
>((ref) {
  final service = ref.watch(locationsServiceProvider);
  return UpdateLocationSettingsNotifier(service);
});
```

##### Option 1B: Generate Providers Inside Service Classes
```dart
// Generated: services/locations_service.dart
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:dio/dio.dart';
import '../api_client.dart';

class LocationsService {
  final ApiClient client;

  LocationsService(this.client);

  // Service provider
  static final provider = Provider<LocationsService>((ref) {
    final apiClient = ref.watch(apiClientProvider);
    return LocationsService(apiClient);
  });

  // Method providers
  static final getCoreLocationsProvider = FutureProvider.family<
    List<CoreLocationDto>,
    String
  >((ref, coreCompanyId) async {
    final service = ref.watch(provider);
    return service.getV1CompaniesCoreCompanyIdLocations(coreCompanyId);
  });

  // Existing methods...
  Future<List<CoreLocationDto>> getV1CompaniesCoreCompanyIdLocations(
    String coreCompanyId, {
    AllHeaders? headers,
  }) async {
    // ... existing implementation
  }
}
```

### 2. Repository Pattern with Riverpod
Generate repository classes that wrap services with Riverpod integration.

```dart
// Generated: repositories/locations_repository.dart
import 'package:flutter_riverpod/flutter_riverpod.dart';

class LocationsRepository {
  final LocationsService _service;

  LocationsRepository(this._service);

  Future<List<CoreLocationDto>> getCoreLocations(String coreCompanyId) {
    return _service.getV1CompaniesCoreCompanyIdLocations(coreCompanyId);
  }

  // Add caching, retry logic, etc.
}

final locationsRepositoryProvider = Provider<LocationsRepository>((ref) {
  final service = ref.watch(locationsServiceProvider);
  return LocationsRepository(service);
});
```

### 3. Extension Methods Approach
Add Riverpod extensions without modifying generated code.

```dart
// User-created: extensions/locations_extensions.dart
import 'package:flutter_riverpod/flutter_riverpod.dart';

extension LocationsServiceProviders on LocationsService {
  static final provider = Provider<LocationsService>((ref) {
    final apiClient = ref.watch(apiClientProvider);
    return LocationsService(apiClient);
  });
}

// Usage
final locationsService = ref.watch(LocationsServiceProviders.provider);
```

## Configuration Options

### Generator Configuration
Add Riverpod options to dorval.config.js:

```javascript
module.exports = {
  input: './openapi.json',
  output: {
    target: './lib/api',
    client: 'dio',
    riverpod: {
      enabled: true,
      approach: 'providers', // 'providers' | 'repository' | 'inline'
      generateMutations: true,
      autoDispose: true,
      cacheTime: 5, // minutes
      providerScope: 'family', // 'simple' | 'family' | 'autoDispose'
    }
  }
};
```

## Template Examples

### Provider Generation Template
```handlebars
{{#if riverpod.enabled}}
import 'package:flutter_riverpod/flutter_riverpod.dart';

// Service provider
final {{camelCase name}}ServiceProvider = Provider<{{className}}Service>((ref) {
  final apiClient = ref.watch(apiClientProvider);
  return {{className}}Service(apiClient);
});

{{#each methods}}
// {{description}}
{{#if isQuery}}
final {{camelCase name}}Provider = FutureProvider{{#if hasParams}}.family{{/if}}{{#if riverpod.autoDispose}}.autoDispose{{/if}}<
  {{returnType}},
  {{#if hasParams}}{{paramsType}}{{/if}}
>({{#if hasParams}}(ref, params){{else}}(ref){{/if}} async {
  final service = ref.watch({{camelCase ../name}}ServiceProvider);
  return service.{{name}}({{#if hasParams}}params{{/if}});
});
{{else}}
// Mutation provider for {{name}}
class {{pascalCase name}}Notifier extends StateNotifier<AsyncValue<{{returnType}}?>> {
  final {{../className}}Service _service;

  {{pascalCase name}}Notifier(this._service) : super(const AsyncValue.data(null));

  Future<void> execute({{#each params}}{{type}} {{name}}{{#unless @last}}, {{/unless}}{{/each}}) async {
    state = const AsyncValue.loading();
    state = await AsyncValue.guard(() =>
      _service.{{name}}({{#each params}}{{name}}{{#unless @last}}, {{/unless}}{{/each}})
    );
  }
}

final {{camelCase name}}Provider = StateNotifierProvider<
  {{pascalCase name}}Notifier,
  AsyncValue<{{returnType}}?>
>((ref) {
  final service = ref.watch({{camelCase ../name}}ServiceProvider);
  return {{pascalCase name}}Notifier(service);
});
{{/if}}
{{/each}}
{{/if}}
```

## Usage Examples

### Basic Usage
```dart
// In a ConsumerWidget
class LocationsScreen extends ConsumerWidget {
  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final locationsAsync = ref.watch(
      getCoreLocationsProvider('company-123')
    );

    return locationsAsync.when(
      data: (locations) => ListView.builder(
        itemCount: locations.length,
        itemBuilder: (context, index) =>
          ListTile(title: Text(locations[index].name)),
      ),
      loading: () => CircularProgressIndicator(),
      error: (error, stack) => Text('Error: $error'),
    );
  }
}
```

### With Mutations
```dart
class UpdateLocationScreen extends ConsumerWidget {
  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final updateState = ref.watch(updateLocationSettingsProvider);

    return ElevatedButton(
      onPressed: updateState.isLoading ? null : () {
        ref.read(updateLocationSettingsProvider.notifier).update(
          'location-123',
          LocationSettingsRequestDto(/* ... */),
        );
      },
      child: updateState.isLoading
        ? CircularProgressIndicator()
        : Text('Update'),
    );
  }
}
```

### With Refresh/Invalidation
```dart
// Refresh data
ref.refresh(getCoreLocationsProvider('company-123'));

// Invalidate to force refetch on next read
ref.invalidate(getCoreLocationsProvider);
```

## Benefits of Each Approach

### Provider Generation (Recommended)
✅ **Pros:**
- Zero boilerplate for users
- Automatic caching and state management
- Type-safe family providers for parameterized calls
- Built-in loading/error states
- Easy refresh/invalidation

❌ **Cons:**
- Larger generated code size
- May need customization for complex scenarios

### Repository Pattern
✅ **Pros:**
- Clean separation of concerns
- Easy to add custom logic (caching, retry)
- Testable

❌ **Cons:**
- Additional abstraction layer
- More generated code

### Extension Methods
✅ **Pros:**
- No changes to generated code
- User has full control
- Minimal generated code size

❌ **Cons:**
- Manual work for users
- No automatic provider generation

## Recommended Implementation Plan

1. **Phase 1: Basic Provider Generation**
   - Generate service providers
   - Generate simple FutureProviders for GET methods
   - Add configuration options

2. **Phase 2: Advanced Features**
   - Add StateNotifier for mutations (POST/PUT/PATCH/DELETE)
   - Add family providers for parameterized calls
   - Add autoDispose options

3. **Phase 3: Optimizations**
   - Add caching strategies
   - Add refresh/invalidation helpers
   - Add error handling utilities

4. **Phase 4: Additional Patterns**
   - Repository pattern option
   - AsyncNotifier support (Riverpod 2.0+)
   - Code generation for common UI patterns

## Next Steps

1. Choose the preferred approach (recommend Option 1A)
2. Create Handlebars templates for provider generation
3. Add configuration options to generator
4. Implement provider generation logic
5. Add tests for generated providers
6. Create documentation and examples