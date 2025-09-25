# Riverpod CRUD 模式总结

## 标准 CRUD 架构

### 1. 分层结构

```
├── Models (数据模型)
│   ├── Todo            # 实体
│   ├── CreateTodoDto   # 创建 DTO
│   └── UpdateTodoDto   # 更新 DTO
│
├── Service (API 调用)
│   └── TodoService     # 所有 API 方法
│
├── Providers (状态管理)
│   ├── 基础 Providers
│   │   ├── todoServiceProvider    # Service 实例
│   │   └── todoFilterProvider     # 筛选条件
│   │
│   ├── CRUD Providers
│   │   ├── todosProvider          # 查询列表
│   │   ├── todoProvider           # 查询单个
│   │   ├── createTodoProvider     # 创建
│   │   ├── updateTodoProvider     # 更新
│   │   └── deleteTodoProvider     # 删除
│   │
│   └── 衍生 Providers
│       ├── todoStatsProvider      # 统计
│       ├── todayTodosProvider     # 今日待办
│       └── allTagsProvider        # 所有标签
│
└── UI (界面)
    ├── TodoListScreen     # 列表页
    ├── TodoDetailScreen   # 详情页
    └── CreateTodoDialog   # 创建对话框
```

### 2. CRUD 操作模式

#### 查询 (Read)
```dart
// 简单查询
final todosProvider = FutureProvider<List<Todo>>((ref) async {
  final service = ref.watch(todoServiceProvider);
  final filter = ref.watch(todoFilterProvider);  // 监听筛选条件

  return service.getTodos(
    search: filter.search,
    completed: filter.completed,
  );
});

// 使用
final todos = ref.watch(todosProvider);
```

#### 创建 (Create)
```dart
class CreateTodoNotifier extends StateNotifier<AsyncValue<void>> {
  Future<Todo> create(CreateTodoDto dto) async {
    state = const AsyncValue.loading();

    try {
      final newTodo = await service.createTodo(dto);

      // 刷新列表
      ref.invalidate(todosProvider);

      state = const AsyncValue.data(null);
      return newTodo;
    } catch (e, stack) {
      state = AsyncValue.error(e, stack);
      rethrow;
    }
  }
}
```

#### 更新 (Update)
```dart
class UpdateTodoNotifier extends StateNotifier<AsyncValue<void>> {
  Future<Todo> update(String id, UpdateTodoDto dto) async {
    // 乐观更新
    _optimisticUpdate(id, dto);

    try {
      final updated = await service.updateTodo(id, dto);

      // 刷新相关数据
      ref.invalidate(todoProvider(id));
      ref.invalidate(todosProvider);

      return updated;
    } catch (e) {
      // 回滚
      _rollback(id);
      rethrow;
    }
  }
}
```

#### 删除 (Delete)
```dart
class DeleteTodoNotifier extends StateNotifier<AsyncValue<void>> {
  Future<void> delete(String id) async {
    try {
      await service.deleteTodo(id);

      // 刷新列表
      ref.invalidate(todosProvider);
      ref.invalidate(todoProvider(id));

    } catch (e) {
      // 错误处理
      rethrow;
    }
  }
}
```

## 核心模式

### 1. 自动刷新模式
```dart
// 更新后自动刷新相关数据
ref.invalidate(todosProvider);        // 刷新列表
ref.invalidate(todoProvider(id));     // 刷新详情
ref.invalidate(todoStatsProvider);    // 刷新统计
```

### 2. 筛选模式
```dart
// 筛选条件变化自动重新获取
final filter = ref.watch(todoFilterProvider);
return service.getTodos(filter: filter);
```

### 3. 分页模式
```dart
class PaginationNotifier extends StateNotifier<List<Todo>> {
  int page = 1;
  bool hasMore = true;

  Future<void> loadMore() async {
    if (!hasMore) return;

    final newItems = await service.getTodos(page: page++);
    state = [...state, ...newItems];
    hasMore = newItems.length == pageSize;
  }
}
```

### 4. 乐观更新模式
```dart
// 立即更新 UI，失败时回滚
final oldData = state;
state = newData;  // 乐观更新

try {
  await api.update(newData);
} catch (e) {
  state = oldData;  // 回滚
}
```

### 5. 批量操作模式
```dart
// 多选状态
final selectedIdsProvider = StateProvider<Set<String>>((ref) => {});

// 批量删除
Future<void> deleteMultiple(List<String> ids) async {
  await service.batchDelete(ids);

  // 刷新所有相关数据
  for (final id in ids) {
    ref.invalidate(todoProvider(id));
  }
  ref.invalidate(todosProvider);
}
```

## 与生成代码结合

### 现在：手写所有 Providers
```dart
// 需要手写每个 CRUD Provider
final todosProvider = FutureProvider<List<Todo>>(...);
final createTodoProvider = StateNotifierProvider<CreateTodoNotifier, ...>(...);
final updateTodoProvider = StateNotifierProvider<UpdateTodoNotifier, ...>(...);
final deleteTodoProvider = StateNotifierProvider<DeleteTodoNotifier, ...>(...);
```

### 理想：生成 CRUD Providers
```dart
// 自动生成标准 CRUD
@GenerateCrud('todos', TodoService)
class TodoProviders {
  // 自动生成:
  // - todosProvider (列表)
  // - todoProvider (详情)
  // - createTodoProvider
  // - updateTodoProvider
  // - deleteTodoProvider
  // - todosPaginationProvider
  // - todosSearchProvider
}

// 使用
final todos = ref.watch(TodoProviders.todosProvider);
await ref.read(TodoProviders.createProvider.notifier).create(dto);
```

### 生成配置
```javascript
// dorval.config.js
module.exports = {
  output: {
    crud: {
      enabled: true,
      patterns: {
        list: true,      // 列表查询
        detail: true,    // 详情查询
        create: true,    // 创建
        update: true,    // 更新
        delete: true,    // 删除
        pagination: true, // 分页
        search: true,    // 搜索
        batch: true,     // 批量操作
      },
      autoRefresh: true, // 自动刷新相关数据
      optimisticUpdate: true, // 乐观更新
    }
  }
};
```

## 最佳实践

### 1. 状态分离
- **查询状态**: 用 `FutureProvider`
- **操作状态**: 用 `StateNotifierProvider<AsyncValue>`
- **UI 状态**: 用 `StateProvider`

### 2. 错误处理
```dart
// Provider 层处理
try {
  // 操作
} catch (e, stack) {
  state = AsyncValue.error(e, stack);
  // 可选：显示 SnackBar
  _showError(e);
  rethrow;  // 让 UI 也能处理
}

// UI 层处理
try {
  await ref.read(createProvider.notifier).create(dto);
  // 成功
} catch (e) {
  // 失败
}
```

### 3. 加载状态
```dart
// 使用 AsyncValue
final state = ref.watch(createProvider);

if (state.isLoading) {
  return CircularProgressIndicator();
}

if (state.hasError) {
  return Text('Error: ${state.error}');
}
```

### 4. 数据一致性
```dart
// 操作后刷新所有相关数据
ref.invalidate(todosProvider);       // 列表
ref.invalidate(todoProvider(id));    // 详情
ref.invalidate(todoStatsProvider);   // 统计
ref.invalidate(relatedProvider);     // 相关数据
```

## 总结

### Riverpod CRUD 的特点
1. **声明式** - 定义状态，UI 自动响应
2. **全局状态** - 任何地方都能访问
3. **自动刷新** - invalidate 机制
4. **类型安全** - 编译时检查

### 痛点
1. **样板代码多** - 每个 CRUD 都要写一遍
2. **模式重复** - 相同的模式反复实现
3. **容易遗漏** - 忘记刷新某个 Provider

### 生成代码的价值
1. **减少重复** - 自动生成标准 CRUD
2. **保证一致** - 统一的模式
3. **不易出错** - 自动处理刷新逻辑