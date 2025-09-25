# Riverpod Integration Implementation Plan

## 目标
为 Dorval 生成的 API 客户端添加 Riverpod 状态管理支持，让开发者可以直接使用生成的 Provider，无需手动编写样板代码。

## 为什么要集成 Riverpod？

### 当前问题
现在生成的代码是这样使用的：
```dart
// 需要手动管理状态
class MyScreen extends StatefulWidget {
  @override
  _MyScreenState createState() => _MyScreenState();
}

class _MyScreenState extends State<MyScreen> {
  final apiClient = ApiClient(baseUrl: 'https://api.example.com');
  late final LocationsService service;
  List<CoreLocationDto>? locations;
  bool isLoading = false;
  String? error;

  @override
  void initState() {
    super.initState();
    service = LocationsService(apiClient);
    loadData();
  }

  Future<void> loadData() async {
    setState(() {
      isLoading = true;
      error = null;
    });

    try {
      final data = await service.getV1CompaniesCoreCompanyIdLocations('company-123');
      setState(() {
        locations = data;
        isLoading = false;
      });
    } catch (e) {
      setState(() {
        error = e.toString();
        isLoading = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    if (isLoading) return CircularProgressIndicator();
    if (error != null) return Text('Error: $error');
    // ... render locations
  }
}
```

### 集成 Riverpod 后
```dart
// 自动生成的 Provider，零样板代码
class MyScreen extends ConsumerWidget {
  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final locationsAsync = ref.watch(
      getCoreLocationsProvider('company-123')
    );

    return locationsAsync.when(
      data: (locations) => LocationsList(locations: locations),
      loading: () => CircularProgressIndicator(),
      error: (error, stack) => ErrorWidget(error),
    );
  }
}
```

## 实施计划

### 第一阶段：基础 Provider 生成（推荐先做这个）

#### 1. 创建新的生成器模块
```
packages/core/src/generators/
├── riverpod-provider-generator.ts  # 新文件
└── templates/
    └── riverpod-provider.hbs      # 新模板
```

#### 2. 生成的文件结构
```
generated-api/
├── models/
├── services/
│   ├── locations_service.dart
│   └── ...
├── providers/                     # 新增
│   ├── locations_provider.dart    # 新增
│   ├── api_client_provider.dart   # 新增
│   └── index.dart                 # 新增
└── api_client.dart
```

#### 3. 生成的 Provider 示例

**api_client_provider.dart:**
```dart
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../api_client.dart';

// API 客户端基础 Provider
final apiClientProvider = Provider<ApiClient>((ref) {
  // 可以在这里配置 baseUrl、拦截器等
  return ApiClient(
    baseUrl: const String.fromEnvironment('API_BASE_URL',
      defaultValue: 'https://api.example.com'),
  );
});
```

**locations_provider.dart:**
```dart
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../services/locations_service.dart';
import '../models/index.dart';
import 'api_client_provider.dart';

// Service Provider - 提供 LocationsService 实例
final locationsServiceProvider = Provider<LocationsService>((ref) {
  final client = ref.watch(apiClientProvider);
  return LocationsService(client);
});

// GET 请求 - 使用 FutureProvider 自动处理异步状态
final getCoreLocationsProvider = FutureProvider.family<
  List<CoreLocationDto>,
  String  // coreCompanyId 参数
>((ref, coreCompanyId) async {
  final service = ref.watch(locationsServiceProvider);
  return service.getV1CompaniesCoreCompanyIdLocations(coreCompanyId);
});

// 带缓存的版本 - 使用 autoDispose 自动清理
final getLocationSettingsProvider = FutureProvider.family.autoDispose<
  LocationSettingsResponseDto,
  String  // locationId 参数
>((ref, locationId) async {
  final service = ref.watch(locationsServiceProvider);

  // 5分钟后自动刷新
  ref.keepAlive();
  Timer(Duration(minutes: 5), () {
    ref.invalidateSelf();
  });

  return service.getV1LocationsLocationIdSettings(locationId);
});
```

### 第二阶段：处理 POST/PUT/PATCH/DELETE 请求

对于修改操作，需要使用 StateNotifier 或 AsyncNotifier：

```dart
// 更新位置设置的 Provider
class UpdateLocationSettingsNotifier extends AutoDisposeAsyncNotifier<void> {
  @override
  FutureOr<void> build() => null;

  Future<LocationSettingsResponseDto> update(
    String locationId,
    LocationSettingsRequestDto body,
  ) async {
    state = const AsyncValue.loading();

    try {
      final service = ref.read(locationsServiceProvider);
      final result = await service.patchV1LocationsLocationIdSettings(
        locationId,
        body,
      );

      // 成功后刷新相关数据
      ref.invalidate(getLocationSettingsProvider(locationId));

      state = const AsyncValue.data(null);
      return result;
    } catch (error, stackTrace) {
      state = AsyncValue.error(error, stackTrace);
      rethrow;
    }
  }
}

final updateLocationSettingsProvider =
  AsyncNotifierProvider.autoDispose<UpdateLocationSettingsNotifier, void>(
    UpdateLocationSettingsNotifier.new,
  );
```

### 第三阶段：配置选项

在 `dorval.config.js` 中添加配置：

```javascript
module.exports = {
  input: './openapi.json',
  output: {
    target: './lib/api',
    client: 'dio',
    riverpod: {
      enabled: true,              // 是否启用 Riverpod
      generateProviders: true,     // 生成 Provider 文件
      autoDispose: true,          // 默认使用 autoDispose
      separateFiles: true,        // 每个 service 一个 provider 文件
      stateManagement: 'async_notifier', // 'state_notifier' | 'async_notifier'
    }
  }
};
```

## 技术实现细节

### 1. 修改现有生成流程

在 `packages/core/src/index.ts` 中：

```typescript
export async function generateDartCode(config: DorvalConfig): Promise<GeneratedFile[]> {
  // ... 现有代码

  // 新增：生成 Riverpod Providers
  if (config.output.riverpod?.enabled) {
    const providerGenerator = new RiverpodProviderGenerator();
    const providerFiles = await providerGenerator.generate(
      services,
      config.output.riverpod
    );
    files.push(...providerFiles);
  }

  return files;
}
```

### 2. Provider 生成器实现

```typescript
// packages/core/src/generators/riverpod-provider-generator.ts
export class RiverpodProviderGenerator {
  private templateManager: TemplateManager;

  constructor() {
    this.templateManager = new TemplateManager();
  }

  generate(
    services: ServiceDefinition[],
    config: RiverpodConfig
  ): GeneratedFile[] {
    const files: GeneratedFile[] = [];

    // 生成基础 Provider
    files.push(this.generateApiClientProvider());

    // 为每个 service 生成 providers
    for (const service of services) {
      files.push(this.generateServiceProvider(service, config));
    }

    // 生成 index 文件
    files.push(this.generateIndexFile(services));

    return files;
  }

  private generateServiceProvider(
    service: ServiceDefinition,
    config: RiverpodConfig
  ): GeneratedFile {
    const providers = [];

    // Service provider
    providers.push({
      name: `${service.name}Provider`,
      type: 'service',
      returnType: service.className,
    });

    // Method providers
    for (const method of service.methods) {
      if (method.httpMethod === 'GET') {
        providers.push({
          name: `${method.name}Provider`,
          type: 'query',
          method: method,
          useFamily: method.parameters.length > 0,
          autoDispose: config.autoDispose,
        });
      } else {
        providers.push({
          name: `${method.name}Provider`,
          type: 'mutation',
          method: method,
          stateManagement: config.stateManagement,
        });
      }
    }

    const content = this.templateManager.render('riverpod-provider', {
      service,
      providers,
      config,
    });

    return {
      path: `providers/${toSnakeCase(service.name)}_provider.dart`,
      content,
    };
  }
}
```

## 使用示例

### 基础查询
```dart
class LocationsListScreen extends ConsumerWidget {
  final String companyId;

  const LocationsListScreen({required this.companyId});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final locationsAsync = ref.watch(
      getCoreLocationsProvider(companyId)
    );

    return Scaffold(
      appBar: AppBar(title: Text('Locations')),
      body: locationsAsync.when(
        data: (locations) => ListView.builder(
          itemCount: locations.length,
          itemBuilder: (context, index) => ListTile(
            title: Text(locations[index].name),
            subtitle: Text(locations[index].address),
          ),
        ),
        loading: () => Center(child: CircularProgressIndicator()),
        error: (error, stack) => Center(
          child: Column(
            children: [
              Text('Error: $error'),
              ElevatedButton(
                onPressed: () => ref.invalidate(
                  getCoreLocationsProvider(companyId)
                ),
                child: Text('Retry'),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
```

### 数据更新
```dart
class EditLocationScreen extends ConsumerWidget {
  final String locationId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final updateState = ref.watch(updateLocationSettingsProvider);

    return Scaffold(
      body: Form(
        onSubmit: () async {
          final notifier = ref.read(updateLocationSettingsProvider.notifier);

          try {
            await notifier.update(
              locationId,
              LocationSettingsRequestDto(
                // ... form data
              ),
            );

            // 成功后返回
            Navigator.pop(context);
          } catch (e) {
            // 错误处理
            ScaffoldMessenger.of(context).showSnackBar(
              SnackBar(content: Text('Update failed: $e')),
            );
          }
        },
      ),
    );
  }
}
```

## 优势总结

1. **自动状态管理** - 不需要手动管理 loading、error、data 状态
2. **自动缓存** - Riverpod 自动缓存请求结果
3. **类型安全** - 完全类型安全的 Provider
4. **易于测试** - Provider 可以轻松 mock 和测试
5. **响应式更新** - 数据变化自动触发 UI 更新
6. **内存管理** - autoDispose 自动清理不用的数据

## 下一步行动

1. **创建 RiverpodProviderGenerator 类** ✅ 优先级：高
2. **创建 Handlebars 模板** ✅ 优先级：高
3. **添加配置选项** ✅ 优先级：中
4. **编写测试** ✅ 优先级：高
5. **创建示例项目** ✅ 优先级：中
6. **编写文档** ✅ 优先级：低

建议先从第一阶段开始，实现基础的 GET 请求 Provider 生成，这样可以快速看到效果并获得反馈。