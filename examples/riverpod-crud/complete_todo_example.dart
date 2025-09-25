// ============================================================
// 完整的 Riverpod CRUD 示例 - Todo 应用
// 展示真实项目中的最佳实践
// ============================================================

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:dio/dio.dart';
import 'package:freezed_annotation/freezed_annotation.dart';

part 'complete_todo_example.freezed.dart';
part 'complete_todo_example.g.dart';

// ============================================================
// 1. 数据模型
// ============================================================

@freezed
class Todo with _$Todo {
  const factory Todo({
    required String id,
    required String title,
    String? description,
    required bool completed,
    required DateTime createdAt,
    DateTime? completedAt,
    List<String>? tags,
  }) = _Todo;

  factory Todo.fromJson(Map<String, dynamic> json) => _$TodoFromJson(json);
}

@freezed
class CreateTodoDto with _$CreateTodoDto {
  const factory CreateTodoDto({
    required String title,
    String? description,
    @Default([]) List<String> tags,
  }) = _CreateTodoDto;

  factory CreateTodoDto.fromJson(Map<String, dynamic> json) => _$CreateTodoDtoFromJson(json);
}

@freezed
class UpdateTodoDto with _$UpdateTodoDto {
  const factory UpdateTodoDto({
    String? title,
    String? description,
    bool? completed,
    List<String>? tags,
  }) = _UpdateTodoDto;

  factory UpdateTodoDto.fromJson(Map<String, dynamic> json) => _$UpdateTodoDtoFromJson(json);
}

// ============================================================
// 2. API Service
// ============================================================

class TodoService {
  final Dio dio;

  TodoService(this.dio);

  // 获取所有 Todos
  Future<List<Todo>> getTodos({
    String? search,
    bool? completed,
    List<String>? tags,
    int page = 1,
    int limit = 20,
  }) async {
    final response = await dio.get('/todos', queryParameters: {
      if (search != null) 'search': search,
      if (completed != null) 'completed': completed,
      if (tags != null && tags.isNotEmpty) 'tags': tags.join(','),
      'page': page,
      'limit': limit,
    });

    return (response.data as List)
        .map((json) => Todo.fromJson(json))
        .toList();
  }

  // 获取单个 Todo
  Future<Todo> getTodo(String id) async {
    final response = await dio.get('/todos/$id');
    return Todo.fromJson(response.data);
  }

  // 创建 Todo
  Future<Todo> createTodo(CreateTodoDto dto) async {
    final response = await dio.post('/todos', data: dto.toJson());
    return Todo.fromJson(response.data);
  }

  // 更新 Todo
  Future<Todo> updateTodo(String id, UpdateTodoDto dto) async {
    final response = await dio.patch('/todos/$id', data: dto.toJson());
    return Todo.fromJson(response.data);
  }

  // 删除 Todo
  Future<void> deleteTodo(String id) async {
    await dio.delete('/todos/$id');
  }

  // 批量删除
  Future<void> deleteTodos(List<String> ids) async {
    await dio.post('/todos/batch-delete', data: {'ids': ids});
  }

  // 切换完成状态
  Future<Todo> toggleTodo(String id) async {
    final response = await dio.post('/todos/$id/toggle');
    return Todo.fromJson(response.data);
  }
}

// ============================================================
// 3. Providers - 基础服务
// ============================================================

// Dio 实例
final dioProvider = Provider<Dio>((ref) {
  return Dio(BaseOptions(
    baseUrl: 'https://api.example.com',
    connectTimeout: Duration(seconds: 5),
    receiveTimeout: Duration(seconds: 3),
  ));
});

// Todo Service
final todoServiceProvider = Provider<TodoService>((ref) {
  return TodoService(ref.watch(dioProvider));
});

// ============================================================
// 4. State - 状态管理
// ============================================================

// 筛选条件状态
@freezed
class TodoFilter with _$TodoFilter {
  const factory TodoFilter({
    String? search,
    bool? showCompleted,
    List<String>? tags,
  }) = _TodoFilter;
}

// 筛选条件 Provider
final todoFilterProvider = StateProvider<TodoFilter>((ref) {
  return const TodoFilter();
});

// ============================================================
// 5. CRUD Providers - 增删改查
// ============================================================

// -------------------- 查询 (Read) --------------------

// 获取 Todo 列表 (带筛选和缓存)
final todosProvider = FutureProvider<List<Todo>>((ref) async {
  final service = ref.watch(todoServiceProvider);
  final filter = ref.watch(todoFilterProvider);

  // 筛选条件变化时自动重新获取
  return service.getTodos(
    search: filter.search,
    completed: filter.showCompleted,
    tags: filter.tags,
  );
});

// 获取单个 Todo
final todoProvider = FutureProvider.family<Todo, String>((ref, id) async {
  final service = ref.watch(todoServiceProvider);
  return service.getTodo(id);
});

// 分页加载 Todos
class TodosPaginationNotifier extends StateNotifier<AsyncValue<List<Todo>>> {
  final Ref ref;
  int _currentPage = 1;
  bool _hasMore = true;
  final List<Todo> _allTodos = [];

  TodosPaginationNotifier(this.ref) : super(const AsyncValue.loading()) {
    loadInitial();
  }

  Future<void> loadInitial() async {
    state = const AsyncValue.loading();
    _currentPage = 1;
    _allTodos.clear();

    try {
      final service = ref.read(todoServiceProvider);
      final filter = ref.read(todoFilterProvider);

      final todos = await service.getTodos(
        search: filter.search,
        completed: filter.showCompleted,
        tags: filter.tags,
        page: 1,
        limit: 20,
      );

      _allTodos.addAll(todos);
      _hasMore = todos.length == 20;
      state = AsyncValue.data(_allTodos.toList());
    } catch (e, stack) {
      state = AsyncValue.error(e, stack);
    }
  }

  Future<void> loadMore() async {
    if (!_hasMore || state.isLoading) return;

    try {
      final service = ref.read(todoServiceProvider);
      final filter = ref.read(todoFilterProvider);

      _currentPage++;
      final todos = await service.getTodos(
        search: filter.search,
        completed: filter.showCompleted,
        tags: filter.tags,
        page: _currentPage,
        limit: 20,
      );

      _allTodos.addAll(todos);
      _hasMore = todos.length == 20;
      state = AsyncValue.data(_allTodos.toList());
    } catch (e, stack) {
      _currentPage--; // 回滚页码
      state = AsyncValue.error(e, stack);
    }
  }

  void refresh() {
    loadInitial();
  }
}

final todosPaginationProvider =
    StateNotifierProvider<TodosPaginationNotifier, AsyncValue<List<Todo>>>((ref) {
  return TodosPaginationNotifier(ref);
});

// -------------------- 创建 (Create) --------------------

class CreateTodoNotifier extends StateNotifier<AsyncValue<void>> {
  final Ref ref;

  CreateTodoNotifier(this.ref) : super(const AsyncValue.data(null));

  Future<Todo> create(CreateTodoDto dto) async {
    state = const AsyncValue.loading();

    try {
      final service = ref.read(todoServiceProvider);
      final newTodo = await service.createTodo(dto);

      // 刷新列表
      ref.invalidate(todosProvider);
      ref.read(todosPaginationProvider.notifier).refresh();

      // 显示成功消息
      _showSnackbar('Todo created successfully');

      state = const AsyncValue.data(null);
      return newTodo;
    } catch (e, stack) {
      state = AsyncValue.error(e, stack);
      _showSnackbar('Failed to create todo: $e', isError: true);
      rethrow;
    }
  }

  void _showSnackbar(String message, {bool isError = false}) {
    // 实际项目中通过 BuildContext 或全局 key 显示
    print(message);
  }
}

final createTodoProvider = StateNotifierProvider<CreateTodoNotifier, AsyncValue<void>>((ref) {
  return CreateTodoNotifier(ref);
});

// -------------------- 更新 (Update) --------------------

class UpdateTodoNotifier extends StateNotifier<AsyncValue<void>> {
  final Ref ref;

  UpdateTodoNotifier(this.ref) : super(const AsyncValue.data(null));

  Future<Todo> update(String id, UpdateTodoDto dto) async {
    state = const AsyncValue.loading();

    // 保存旧数据用于回滚
    final oldTodo = await ref.read(todoProvider(id).future);

    try {
      // 乐观更新 - 立即更新 UI
      _optimisticUpdate(id, oldTodo, dto);

      final service = ref.read(todoServiceProvider);
      final updatedTodo = await service.updateTodo(id, dto);

      // 刷新相关数据
      ref.invalidate(todoProvider(id));
      ref.invalidate(todosProvider);

      state = const AsyncValue.data(null);
      return updatedTodo;
    } catch (e, stack) {
      // 失败时回滚
      _rollback(id, oldTodo);
      state = AsyncValue.error(e, stack);
      rethrow;
    }
  }

  Future<void> toggle(String id) async {
    try {
      final service = ref.read(todoServiceProvider);
      final updatedTodo = await service.toggleTodo(id);

      // 刷新数据
      ref.invalidate(todoProvider(id));
      ref.invalidate(todosProvider);
    } catch (e) {
      _showSnackbar('Failed to toggle todo: $e', isError: true);
    }
  }

  void _optimisticUpdate(String id, Todo oldTodo, UpdateTodoDto dto) {
    // 实现乐观更新逻辑
    // 可以通过临时 Provider 或 StateNotifier 实现
  }

  void _rollback(String id, Todo oldTodo) {
    // 实现回滚逻辑
  }

  void _showSnackbar(String message, {bool isError = false}) {
    print(message);
  }
}

final updateTodoProvider = StateNotifierProvider<UpdateTodoNotifier, AsyncValue<void>>((ref) {
  return UpdateTodoNotifier(ref);
});

// -------------------- 删除 (Delete) --------------------

class DeleteTodoNotifier extends StateNotifier<AsyncValue<void>> {
  final Ref ref;

  DeleteTodoNotifier(this.ref) : super(const AsyncValue.data(null));

  Future<void> delete(String id) async {
    state = const AsyncValue.loading();

    try {
      final service = ref.read(todoServiceProvider);
      await service.deleteTodo(id);

      // 刷新列表
      ref.invalidate(todosProvider);
      ref.invalidate(todoProvider(id));

      _showSnackbar('Todo deleted successfully');
      state = const AsyncValue.data(null);
    } catch (e, stack) {
      state = AsyncValue.error(e, stack);
      _showSnackbar('Failed to delete todo: $e', isError: true);
      rethrow;
    }
  }

  Future<void> deleteMultiple(List<String> ids) async {
    state = const AsyncValue.loading();

    try {
      final service = ref.read(todoServiceProvider);
      await service.deleteTodos(ids);

      // 刷新数据
      ref.invalidate(todosProvider);
      for (final id in ids) {
        ref.invalidate(todoProvider(id));
      }

      _showSnackbar('${ids.length} todos deleted');
      state = const AsyncValue.data(null);
    } catch (e, stack) {
      state = AsyncValue.error(e, stack);
      _showSnackbar('Failed to delete todos: $e', isError: true);
      rethrow;
    }
  }

  void _showSnackbar(String message, {bool isError = false}) {
    print(message);
  }
}

final deleteTodoProvider = StateNotifierProvider<DeleteTodoNotifier, AsyncValue<void>>((ref) {
  return DeleteTodoNotifier(ref);
});

// ============================================================
// 6. 衍生状态 Providers
// ============================================================

// 统计信息
final todoStatsProvider = Provider<Map<String, int>>((ref) {
  final todosAsync = ref.watch(todosProvider);

  return todosAsync.maybeWhen(
    data: (todos) => {
      'total': todos.length,
      'completed': todos.where((t) => t.completed).length,
      'pending': todos.where((t) => !t.completed).length,
    },
    orElse: () => {'total': 0, 'completed': 0, 'pending': 0},
  );
});

// 今日待办
final todayTodosProvider = Provider<List<Todo>>((ref) {
  final todosAsync = ref.watch(todosProvider);
  final now = DateTime.now();

  return todosAsync.maybeWhen(
    data: (todos) => todos.where((todo) {
      return todo.createdAt.year == now.year &&
          todo.createdAt.month == now.month &&
          todo.createdAt.day == now.day;
    }).toList(),
    orElse: () => [],
  );
});

// 标签列表
final allTagsProvider = Provider<List<String>>((ref) {
  final todosAsync = ref.watch(todosProvider);

  return todosAsync.maybeWhen(
    data: (todos) {
      final tags = <String>{};
      for (final todo in todos) {
        if (todo.tags != null) {
          tags.addAll(todo.tags!);
        }
      }
      return tags.toList()..sort();
    },
    orElse: () => [],
  );
});

// ============================================================
// 7. 选择状态管理
// ============================================================

// 多选状态
final selectedTodosProvider = StateProvider<Set<String>>((ref) => {});

// 是否全选
final isAllSelectedProvider = Provider<bool>((ref) {
  final todos = ref.watch(todosProvider).valueOrNull ?? [];
  final selected = ref.watch(selectedTodosProvider);

  if (todos.isEmpty) return false;
  return todos.every((todo) => selected.contains(todo.id));
});

// 切换全选
final toggleAllSelectionProvider = Provider<void Function()>((ref) {
  return () {
    final todos = ref.read(todosProvider).valueOrNull ?? [];
    final selected = ref.read(selectedTodosProvider.notifier);

    if (ref.read(isAllSelectedProvider)) {
      selected.state = {};
    } else {
      selected.state = todos.map((t) => t.id).toSet();
    }
  };
});