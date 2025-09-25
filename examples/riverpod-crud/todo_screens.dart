// ============================================================
// UI 层 - 展示如何使用 CRUD Providers
// ============================================================

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'complete_todo_example.dart';

// ============================================================
// 1. Todo 列表页面
// ============================================================

class TodoListScreen extends ConsumerStatefulWidget {
  @override
  ConsumerState<TodoListScreen> createState() => _TodoListScreenState();
}

class _TodoListScreenState extends ConsumerState<TodoListScreen> {
  final _searchController = TextEditingController();
  final _scrollController = ScrollController();

  @override
  void initState() {
    super.initState();

    // 监听滚动，实现无限加载
    _scrollController.addListener(() {
      if (_scrollController.position.pixels >=
          _scrollController.position.maxScrollExtent - 200) {
        ref.read(todosPaginationProvider.notifier).loadMore();
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    // 监听各种状态
    final todosAsync = ref.watch(todosProvider);
    final filter = ref.watch(todoFilterProvider);
    final stats = ref.watch(todoStatsProvider);
    final selectedTodos = ref.watch(selectedTodosProvider);
    final isAllSelected = ref.watch(isAllSelectedProvider);

    return Scaffold(
      appBar: AppBar(
        title: Text('Todos (${stats['total']})'),
        actions: [
          // 批量操作
          if (selectedTodos.isNotEmpty)
            IconButton(
              icon: Icon(Icons.delete),
              onPressed: () => _deleteSelected(),
            ),
          // 添加按钮
          IconButton(
            icon: Icon(Icons.add),
            onPressed: () => _showCreateDialog(),
          ),
        ],
        bottom: PreferredSize(
          preferredSize: Size.fromHeight(120),
          child: Column(
            children: [
              // 搜索框
              Padding(
                padding: EdgeInsets.all(8),
                child: TextField(
                  controller: _searchController,
                  decoration: InputDecoration(
                    hintText: 'Search todos...',
                    prefixIcon: Icon(Icons.search),
                    suffixIcon: filter.search?.isNotEmpty == true
                        ? IconButton(
                            icon: Icon(Icons.clear),
                            onPressed: () {
                              _searchController.clear();
                              ref.read(todoFilterProvider.notifier).update(
                                    (state) => state.copyWith(search: null),
                                  );
                            },
                          )
                        : null,
                  ),
                  onChanged: (value) {
                    // 更新筛选条件，自动触发重新获取
                    ref.read(todoFilterProvider.notifier).update(
                          (state) => state.copyWith(
                            search: value.isEmpty ? null : value,
                          ),
                        );
                  },
                ),
              ),
              // 筛选条件
              SingleChildScrollView(
                scrollDirection: Axis.horizontal,
                child: Row(
                  children: [
                    // 完成状态筛选
                    Padding(
                      padding: EdgeInsets.symmetric(horizontal: 4),
                      child: FilterChip(
                        label: Text('Show Completed'),
                        selected: filter.showCompleted == true,
                        onSelected: (selected) {
                          ref.read(todoFilterProvider.notifier).update(
                                (state) => state.copyWith(
                                  showCompleted: selected ? true : null,
                                ),
                              );
                        },
                      ),
                    ),
                    // 标签筛选
                    ...ref.watch(allTagsProvider).map((tag) =>
                      Padding(
                        padding: EdgeInsets.symmetric(horizontal: 4),
                        child: FilterChip(
                          label: Text(tag),
                          selected: filter.tags?.contains(tag) == true,
                          onSelected: (selected) {
                            ref.read(todoFilterProvider.notifier).update(
                              (state) {
                                final tags = [...(state.tags ?? [])];
                                if (selected) {
                                  tags.add(tag);
                                } else {
                                  tags.remove(tag);
                                }
                                return state.copyWith(
                                  tags: tags.isEmpty ? null : tags,
                                );
                              },
                            );
                          },
                        ),
                      ),
                    ),
                  ],
                ),
              ),
              // 统计信息
              Container(
                padding: EdgeInsets.symmetric(vertical: 8),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceEvenly,
                  children: [
                    Text('Total: ${stats['total']}'),
                    Text('Completed: ${stats['completed']}'),
                    Text('Pending: ${stats['pending']}'),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
      body: todosAsync.when(
        data: (todos) {
          if (todos.isEmpty) {
            return Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Icon(Icons.inbox, size: 64, color: Colors.grey),
                  Text('No todos found'),
                  if (filter.search != null || filter.tags != null)
                    TextButton(
                      onPressed: () {
                        ref.read(todoFilterProvider.notifier).state =
                            TodoFilter();
                      },
                      child: Text('Clear filters'),
                    ),
                ],
              ),
            );
          }

          return RefreshIndicator(
            onRefresh: () async {
              ref.invalidate(todosProvider);
            },
            child: ListView.builder(
              controller: _scrollController,
              itemCount: todos.length,
              itemBuilder: (context, index) {
                final todo = todos[index];
                final isSelected = selectedTodos.contains(todo.id);

                return TodoListTile(
                  todo: todo,
                  isSelected: isSelected,
                  onTap: () => _navigateToDetail(todo.id),
                  onLongPress: () => _toggleSelection(todo.id),
                  onToggle: () => _toggleComplete(todo.id),
                  onDelete: () => _deleteTodo(todo.id),
                );
              },
            ),
          );
        },
        loading: () => Center(child: CircularProgressIndicator()),
        error: (error, stack) => Center(
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(Icons.error, size: 64, color: Colors.red),
              Text('Error: $error'),
              ElevatedButton(
                onPressed: () => ref.invalidate(todosProvider),
                child: Text('Retry'),
              ),
            ],
          ),
        ),
      ),
      // 浮动操作按钮
      floatingActionButton: FloatingActionButton(
        onPressed: _showCreateDialog,
        child: Icon(Icons.add),
      ),
    );
  }

  // 创建 Todo 对话框
  void _showCreateDialog() {
    showDialog(
      context: context,
      builder: (context) => CreateTodoDialog(),
    );
  }

  // 导航到详情页
  void _navigateToDetail(String id) {
    Navigator.push(
      context,
      MaterialPageRoute(
        builder: (_) => TodoDetailScreen(todoId: id),
      ),
    );
  }

  // 切换选择状态
  void _toggleSelection(String id) {
    ref.read(selectedTodosProvider.notifier).update((state) {
      final newSet = Set<String>.from(state);
      if (newSet.contains(id)) {
        newSet.remove(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  }

  // 切换完成状态
  Future<void> _toggleComplete(String id) async {
    await ref.read(updateTodoProvider.notifier).toggle(id);
  }

  // 删除单个
  Future<void> _deleteTodo(String id) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: Text('Delete Todo'),
        content: Text('Are you sure you want to delete this todo?'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: Text('Cancel'),
          ),
          TextButton(
            onPressed: () => Navigator.pop(context, true),
            child: Text('Delete', style: TextStyle(color: Colors.red)),
          ),
        ],
      ),
    );

    if (confirmed == true) {
      await ref.read(deleteTodoProvider.notifier).delete(id);
    }
  }

  // 批量删除
  Future<void> _deleteSelected() async {
    final ids = ref.read(selectedTodosProvider).toList();

    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: Text('Delete ${ids.length} Todos'),
        content: Text('Are you sure you want to delete these todos?'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: Text('Cancel'),
          ),
          TextButton(
            onPressed: () => Navigator.pop(context, true),
            child: Text('Delete', style: TextStyle(color: Colors.red)),
          ),
        ],
      ),
    );

    if (confirmed == true) {
      await ref.read(deleteTodoProvider.notifier).deleteMultiple(ids);
      ref.read(selectedTodosProvider.notifier).state = {};
    }
  }

  @override
  void dispose() {
    _searchController.dispose();
    _scrollController.dispose();
    super.dispose();
  }
}

// ============================================================
// 2. Todo 列表项组件
// ============================================================

class TodoListTile extends StatelessWidget {
  final Todo todo;
  final bool isSelected;
  final VoidCallback onTap;
  final VoidCallback onLongPress;
  final VoidCallback onToggle;
  final VoidCallback onDelete;

  const TodoListTile({
    required this.todo,
    required this.isSelected,
    required this.onTap,
    required this.onLongPress,
    required this.onToggle,
    required this.onDelete,
  });

  @override
  Widget build(BuildContext context) {
    return Card(
      margin: EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      color: isSelected ? Colors.blue.withOpacity(0.1) : null,
      child: ListTile(
        leading: Checkbox(
          value: todo.completed,
          onChanged: (_) => onToggle(),
        ),
        title: Text(
          todo.title,
          style: TextStyle(
            decoration: todo.completed ? TextDecoration.lineThrough : null,
          ),
        ),
        subtitle: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            if (todo.description != null) Text(todo.description!),
            if (todo.tags?.isNotEmpty == true)
              Wrap(
                spacing: 4,
                children: todo.tags!.map((tag) =>
                  Chip(
                    label: Text(tag, style: TextStyle(fontSize: 10)),
                    visualDensity: VisualDensity.compact,
                  ),
                ).toList(),
              ),
          ],
        ),
        trailing: IconButton(
          icon: Icon(Icons.delete),
          onPressed: onDelete,
        ),
        onTap: onTap,
        onLongPress: onLongPress,
      ),
    );
  }
}

// ============================================================
// 3. 创建 Todo 对话框
// ============================================================

class CreateTodoDialog extends ConsumerStatefulWidget {
  @override
  ConsumerState<CreateTodoDialog> createState() => _CreateTodoDialogState();
}

class _CreateTodoDialogState extends ConsumerState<CreateTodoDialog> {
  final _formKey = GlobalKey<FormState>();
  final _titleController = TextEditingController();
  final _descriptionController = TextEditingController();
  final List<String> _tags = [];

  @override
  Widget build(BuildContext context) {
    final createState = ref.watch(createTodoProvider);

    return AlertDialog(
      title: Text('Create New Todo'),
      content: Form(
        key: _formKey,
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            // 标题输入
            TextFormField(
              controller: _titleController,
              decoration: InputDecoration(
                labelText: 'Title',
                hintText: 'Enter todo title',
              ),
              validator: (value) {
                if (value == null || value.isEmpty) {
                  return 'Please enter a title';
                }
                return null;
              },
            ),
            SizedBox(height: 16),
            // 描述输入
            TextFormField(
              controller: _descriptionController,
              decoration: InputDecoration(
                labelText: 'Description (Optional)',
                hintText: 'Enter todo description',
              ),
              maxLines: 3,
            ),
            SizedBox(height: 16),
            // 标签输入
            Wrap(
              spacing: 8,
              children: [
                ..._tags.map((tag) =>
                  Chip(
                    label: Text(tag),
                    onDeleted: () {
                      setState(() {
                        _tags.remove(tag);
                      });
                    },
                  ),
                ),
                ActionChip(
                  label: Icon(Icons.add),
                  onPressed: _addTag,
                ),
              ],
            ),
            // 错误提示
            if (createState.hasError)
              Padding(
                padding: EdgeInsets.only(top: 16),
                child: Text(
                  'Error: ${createState.error}',
                  style: TextStyle(color: Colors.red),
                ),
              ),
          ],
        ),
      ),
      actions: [
        TextButton(
          onPressed: createState.isLoading ? null : () {
            Navigator.pop(context);
          },
          child: Text('Cancel'),
        ),
        ElevatedButton(
          onPressed: createState.isLoading ? null : _create,
          child: createState.isLoading
              ? SizedBox(
                  width: 20,
                  height: 20,
                  child: CircularProgressIndicator(strokeWidth: 2),
                )
              : Text('Create'),
        ),
      ],
    );
  }

  void _addTag() async {
    final tag = await showDialog<String>(
      context: context,
      builder: (context) {
        final controller = TextEditingController();
        return AlertDialog(
          title: Text('Add Tag'),
          content: TextField(
            controller: controller,
            decoration: InputDecoration(hintText: 'Enter tag'),
            autofocus: true,
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(context),
              child: Text('Cancel'),
            ),
            ElevatedButton(
              onPressed: () => Navigator.pop(context, controller.text),
              child: Text('Add'),
            ),
          ],
        );
      },
    );

    if (tag != null && tag.isNotEmpty && !_tags.contains(tag)) {
      setState(() {
        _tags.add(tag);
      });
    }
  }

  Future<void> _create() async {
    if (!_formKey.currentState!.validate()) return;

    try {
      await ref.read(createTodoProvider.notifier).create(
        CreateTodoDto(
          title: _titleController.text,
          description: _descriptionController.text.isEmpty
              ? null
              : _descriptionController.text,
          tags: _tags,
        ),
      );

      Navigator.pop(context);
    } catch (e) {
      // 错误已经在 Provider 中处理
    }
  }

  @override
  void dispose() {
    _titleController.dispose();
    _descriptionController.dispose();
    super.dispose();
  }
}

// ============================================================
// 4. Todo 详情/编辑页面
// ============================================================

class TodoDetailScreen extends ConsumerStatefulWidget {
  final String todoId;

  const TodoDetailScreen({required this.todoId});

  @override
  ConsumerState<TodoDetailScreen> createState() => _TodoDetailScreenState();
}

class _TodoDetailScreenState extends ConsumerState<TodoDetailScreen> {
  bool _isEditing = false;
  late TextEditingController _titleController;
  late TextEditingController _descriptionController;
  List<String> _tags = [];

  @override
  void initState() {
    super.initState();
    _titleController = TextEditingController();
    _descriptionController = TextEditingController();
  }

  @override
  Widget build(BuildContext context) {
    final todoAsync = ref.watch(todoProvider(widget.todoId));
    final updateState = ref.watch(updateTodoProvider);
    final deleteState = ref.watch(deleteTodoProvider);

    return Scaffold(
      appBar: AppBar(
        title: Text(_isEditing ? 'Edit Todo' : 'Todo Details'),
        actions: [
          if (!_isEditing)
            IconButton(
              icon: Icon(Icons.edit),
              onPressed: todoAsync.hasValue ? () => _startEditing(todoAsync.value!) : null,
            ),
          if (_isEditing) ...[
            IconButton(
              icon: Icon(Icons.close),
              onPressed: _cancelEditing,
            ),
            IconButton(
              icon: updateState.isLoading
                  ? SizedBox(
                      width: 20,
                      height: 20,
                      child: CircularProgressIndicator(strokeWidth: 2),
                    )
                  : Icon(Icons.check),
              onPressed: updateState.isLoading ? null : _saveChanges,
            ),
          ],
          if (!_isEditing)
            IconButton(
              icon: Icon(Icons.delete),
              onPressed: deleteState.isLoading ? null : _delete,
            ),
        ],
      ),
      body: todoAsync.when(
        data: (todo) {
          return Padding(
            padding: EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // 完成状态
                SwitchListTile(
                  title: Text('Completed'),
                  value: todo.completed,
                  onChanged: _isEditing ? null : (_) => _toggleComplete(),
                ),
                Divider(),
                // 标题
                if (_isEditing)
                  TextFormField(
                    controller: _titleController,
                    decoration: InputDecoration(labelText: 'Title'),
                  )
                else
                  ListTile(
                    title: Text('Title'),
                    subtitle: Text(
                      todo.title,
                      style: TextStyle(fontSize: 18),
                    ),
                  ),
                // 描述
                if (_isEditing)
                  TextFormField(
                    controller: _descriptionController,
                    decoration: InputDecoration(labelText: 'Description'),
                    maxLines: 3,
                  )
                else if (todo.description != null)
                  ListTile(
                    title: Text('Description'),
                    subtitle: Text(todo.description!),
                  ),
                // 标签
                ListTile(
                  title: Text('Tags'),
                  subtitle: Wrap(
                    spacing: 8,
                    children: [
                      if (_isEditing) ...[
                        ..._tags.map((tag) =>
                          Chip(
                            label: Text(tag),
                            onDeleted: () {
                              setState(() {
                                _tags.remove(tag);
                              });
                            },
                          ),
                        ),
                        ActionChip(
                          label: Icon(Icons.add),
                          onPressed: _addTag,
                        ),
                      ] else if (todo.tags?.isNotEmpty == true)
                        ...todo.tags!.map((tag) => Chip(label: Text(tag)))
                      else
                        Text('No tags'),
                    ],
                  ),
                ),
                // 元信息
                Divider(),
                ListTile(
                  title: Text('Created At'),
                  subtitle: Text(todo.createdAt.toString()),
                ),
                if (todo.completedAt != null)
                  ListTile(
                    title: Text('Completed At'),
                    subtitle: Text(todo.completedAt.toString()),
                  ),
              ],
            ),
          );
        },
        loading: () => Center(child: CircularProgressIndicator()),
        error: (error, stack) => Center(
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(Icons.error, size: 64, color: Colors.red),
              Text('Error: $error'),
              ElevatedButton(
                onPressed: () => ref.invalidate(todoProvider(widget.todoId)),
                child: Text('Retry'),
              ),
            ],
          ),
        ),
      ),
    );
  }

  void _startEditing(Todo todo) {
    setState(() {
      _isEditing = true;
      _titleController.text = todo.title;
      _descriptionController.text = todo.description ?? '';
      _tags = List.from(todo.tags ?? []);
    });
  }

  void _cancelEditing() {
    setState(() {
      _isEditing = false;
    });
  }

  Future<void> _saveChanges() async {
    try {
      await ref.read(updateTodoProvider.notifier).update(
        widget.todoId,
        UpdateTodoDto(
          title: _titleController.text,
          description: _descriptionController.text.isEmpty
              ? null
              : _descriptionController.text,
          tags: _tags,
        ),
      );

      setState(() {
        _isEditing = false;
      });
    } catch (e) {
      // 错误已经在 Provider 中处理
    }
  }

  Future<void> _toggleComplete() async {
    await ref.read(updateTodoProvider.notifier).toggle(widget.todoId);
  }

  void _addTag() async {
    // 复用创建对话框的逻辑
    final tag = await showDialog<String>(
      context: context,
      builder: (context) {
        final controller = TextEditingController();
        return AlertDialog(
          title: Text('Add Tag'),
          content: TextField(
            controller: controller,
            decoration: InputDecoration(hintText: 'Enter tag'),
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(context),
              child: Text('Cancel'),
            ),
            ElevatedButton(
              onPressed: () => Navigator.pop(context, controller.text),
              child: Text('Add'),
            ),
          ],
        );
      },
    );

    if (tag != null && tag.isNotEmpty && !_tags.contains(tag)) {
      setState(() {
        _tags.add(tag);
      });
    }
  }

  Future<void> _delete() async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: Text('Delete Todo'),
        content: Text('Are you sure you want to delete this todo?'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: Text('Cancel'),
          ),
          TextButton(
            onPressed: () => Navigator.pop(context, true),
            child: Text('Delete', style: TextStyle(color: Colors.red)),
          ),
        ],
      ),
    );

    if (confirmed == true) {
      await ref.read(deleteTodoProvider.notifier).delete(widget.todoId);
      Navigator.pop(context);
    }
  }

  @override
  void dispose() {
    _titleController.dispose();
    _descriptionController.dispose();
    super.dispose();
  }
}