
# 简单方案：每个 API 一个 Provider

## 核心理念
不要过度设计！每个 API 方法生成一个简单的 Provider 就够了。

## 三种方案对比

### 方案1：标准 Provider（推荐）
```dart
// GET - 用 FutureProvider
final getShiftsProvider = FutureProvider.autoDispose<List<Shift>>((ref) {
  return ref.watch(shiftsServiceProvider).getShifts();
});

// POST/PUT/DELETE - 用 AsyncNotifier
final createShiftProvider = AsyncNotifierProvider<CreateShiftNotifier, Shift?>(...);

// 使用
final shifts = ref.watch(getShiftsProvider);
await ref.read(createShiftProvider.notifier).create(dto);
```

**优点：**
- ✅ 标准 Riverpod 模式
- ✅ 自动处理 loading/error
- ✅ 支持 autoDispose

**缺点：**
- ❌ 代码稍多

### 方案2：类封装（最简洁）
```dart
class ShiftsProviders {
  // GET - Provider
  static final getAll = FutureProvider((ref) =>
    ref.watch(shiftsServiceProvider).getShifts()
  );

  // POST - 方法
  static Future<Shift> create(WidgetRef ref, CreateShiftDto dto) async {
    final result = await ref.read(shiftsServiceProvider).createShift(dto);
    ref.invalidate(getAll);  // 刷新列表
    return result;
  }
}

// 使用
final shifts = ref.watch(ShiftsProviders.getAll);
await ShiftsProviders.create(ref, dto);
```

**优点：**
- ✅ 代码最少
- ✅ 容易理解
- ✅ 灵活

**缺点：**
- ❌ POST/PUT 没有 loading 状态管理

### 方案3：混合模式（平衡）
```dart
// 只为 GET 生成 Provider（需要缓存）
final getShiftsProvider = FutureProvider((ref) => ...);

// POST/PUT/DELETE 直接调用 + 手动刷新
await ref.read(shiftsServiceProvider).createShift(dto);
ref.invalidate(getShiftsProvider);
```

**优点：**
- ✅ 简单直接
- ✅ 只在需要缓存的地方用 Provider

**缺点：**
- ❌ 需要手动管理刷新

## 生成策略

### 1. 分析 OpenAPI 路径
```yaml
paths:
  /shifts:
    get: getShifts       → FutureProvider
    post: createShift    → AsyncNotifier 或 方法

  /shifts/{id}:
    get: getShift        → FutureProvider.family
    patch: updateShift   → AsyncNotifier 或 方法
    delete: deleteShift  → AsyncNotifier 或 方法
```

### 2. 生成规则
```typescript
function generateProvider(operation) {
  if (operation.method === 'GET') {
    // 查询 -> FutureProvider
    if (operation.hasPathParams) {
      return generateFamilyProvider(operation);
    }
    return generateSimpleProvider(operation);
  } else {
    // 变更 -> AsyncNotifier 或方法
    return generateMutationProvider(operation);
  }
}
```

### 3. 智能刷新
```typescript
// 分析 API 关系，自动生成刷新逻辑
POST /shifts -> 刷新 GET /shifts
PATCH /shifts/{id} -> 刷新 GET /shifts/{id} 和 GET /shifts
DELETE /shifts/{id} -> 刷新 GET /shifts
```

## 实际生成效果

### 输入：OpenAPI
```yaml
/shifts:
  get:
    operationId: getShifts
    parameters:
      - name: date
      - name: locationId
  post:
    operationId: createShift
    requestBody:
      $ref: '#/CreateShiftDto'

/shifts/{id}:
  get:
    operationId: getShift
  patch:
    operationId: updateShift
  delete:
    operationId: deleteShift
```

### 输出：Dart Providers
```dart
// ===== 自动生成的 Providers =====

// GET /shifts
final getShiftsProvider = FutureProvider.family<
  List<ShiftResponseDto>,
  GetShiftsParams?  // 可选参数
>((ref, params) async {
  final service = ref.watch(shiftsServiceProvider);
  return service.getShifts(
    date: params?.date,
    locationId: params?.locationId,
  );
});

// GET /shifts/{id}
final getShiftProvider = FutureProvider.family<
  ShiftResponseDto,
  String  // id
>((ref, id) async {
  final service = ref.watch(shiftsServiceProvider);
  return service.getShift(id);
});

// POST /shifts
final createShiftProvider = AsyncNotifierProvider<
  CreateShiftNotifier,
  ShiftResponseDto?
>(CreateShiftNotifier.new);

class CreateShiftNotifier extends AsyncNotifier<ShiftResponseDto?> {
  @override
  FutureOr<ShiftResponseDto?> build() => null;

  Future<ShiftResponseDto> execute(CreateShiftDto dto) async {
    state = const AsyncValue.loading();
    try {
      final service = ref.read(shiftsServiceProvider);
      final result = await service.createShift(dto);

      // 自动刷新相关查询
      ref.invalidate(getShiftsProvider);

      state = AsyncValue.data(result);
      return result;
    } catch (e, stack) {
      state = AsyncValue.error(e, stack);
      rethrow;
    }
  }
}

// PATCH /shifts/{id}
final updateShiftProvider = AsyncNotifierProvider<
  UpdateShiftNotifier,
  ShiftResponseDto?
>(UpdateShiftNotifier.new);

class UpdateShiftNotifier extends AsyncNotifier<ShiftResponseDto?> {
  @override
  FutureOr<ShiftResponseDto?> build() => null;

  Future<ShiftResponseDto> execute(String id, UpdateShiftDto dto) async {
    state = const AsyncValue.loading();
    try {
      final service = ref.read(shiftsServiceProvider);
      final result = await service.updateShift(id, dto);

      // 自动刷新相关查询
      ref.invalidate(getShiftProvider(id));
      ref.invalidate(getShiftsProvider);

      state = AsyncValue.data(result);
      return result;
    } catch (e, stack) {
      state = AsyncValue.error(e, stack);
      rethrow;
    }
  }
}

// DELETE /shifts/{id}
final deleteShiftProvider = AsyncNotifierProvider<
  DeleteShiftNotifier,
  void
>(DeleteShiftNotifier.new);

class DeleteShiftNotifier extends AsyncNotifier<void> {
  @override
  FutureOr<void> build() => null;

  Future<void> execute(String id) async {
    state = const AsyncValue.loading();
    try {
      final service = ref.read(shiftsServiceProvider);
      await service.deleteShift(id);

      // 自动刷新
      ref.invalidate(getShiftProvider(id));
      ref.invalidate(getShiftsProvider);

      state = const AsyncValue.data(null);
    } catch (e, stack) {
      state = AsyncValue.error(e, stack);
      rethrow;
    }
  }
}
```

## 使用体验

### 查询数据
```dart
// 超简单
final shifts = ref.watch(getShiftsProvider(null));
final shift = ref.watch(getShiftProvider(shiftId));

// 带参数
final filtered = ref.watch(
  getShiftsProvider(GetShiftsParams(date: today))
);
```

### 创建/更新/删除
```dart
// 创建
await ref.read(createShiftProvider.notifier).execute(dto);

// 更新
await ref.read(updateShiftProvider.notifier).execute(id, dto);

// 删除
await ref.read(deleteShiftProvider.notifier).execute(id);

// 数据会自动刷新！
```

## 配置选项

```javascript
// dorval.config.js
module.exports = {
  output: {
    providers: {
      style: 'standard',  // 'standard' | 'class' | 'minimal'

      // GET 请求配置
      query: {
        autoDispose: true,    // 自动清理
        cacheTime: 5,         // 缓存时间（分钟）
      },

      // POST/PUT/DELETE 配置
      mutation: {
        style: 'notifier',    // 'notifier' | 'method'
        autoRefresh: true,    // 自动刷新相关查询
      },

      // 智能分析
      smartRefresh: true,     // 分析 API 关系，自动刷新
    }
  }
};
```

## 价值总结

1. **简单直接** - 每个 API 一个 Provider，不过度设计
2. **自动缓存** - GET 请求自动缓存
3. **自动刷新** - 变更后自动刷新相关数据
4. **类型安全** - 从 OpenAPI 生成正确类型
5. **零学习成本** - 就是标准的 Riverpod

这样简单的方案你觉得怎么样？