// ============================================================
// 使用示例 - 看看有多简洁！
// 类似 React Query 的体验
// ============================================================

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'generated_hooks.dart';

// ============================================================
// 1. 最简单的使用 - 获取单个数据
// ============================================================

class ShiftDetailScreen extends ConsumerWidget {
  final String shiftId;

  const ShiftDetailScreen({required this.shiftId});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    // 🎯 一行代码搞定一切！
    final query = useGetShift(ref, shiftId);

    // 自动处理所有状态
    if (query.isLoading && !query.hasData) {
      return Scaffold(
        body: Center(child: CircularProgressIndicator()),
      );
    }

    if (query.isError && !query.hasData) {
      return Scaffold(
        body: Center(
          child: Text('Error: ${query.error}'),
        ),
      );
    }

    // 有数据就显示（即使在刷新中）
    final shift = query.data!;

    return Scaffold(
      appBar: AppBar(
        title: Text(shift.title),
        actions: [
          // 刷新中显示进度
          if (query.isRefreshing)
            Center(
              child: Padding(
                padding: EdgeInsets.all(16),
                child: SizedBox(
                  width: 20,
                  height: 20,
                  child: CircularProgressIndicator(strokeWidth: 2),
                ),
              ),
            ),
        ],
      ),
      body: RefreshIndicator(
        onRefresh: () async {
          // 手动刷新（会自动更新缓存）
          ref.invalidate(['shifts', shiftId]);
        },
        child: ListView(
          children: [
            ListTile(
              title: Text('Date'),
              subtitle: Text(shift.date.toString()),
            ),
            ListTile(
              title: Text('Location'),
              subtitle: Text(shift.locationName),
            ),
            ListTile(
              title: Text('Status'),
              subtitle: Text(shift.status),
            ),
          ],
        ),
      ),
    );
  }
}

// ============================================================
// 2. 带筛选的列表 - 自动缓存不同参数
// ============================================================

class ShiftsListScreen extends ConsumerStatefulWidget {
  @override
  ConsumerState<ShiftsListScreen> createState() => _ShiftsListScreenState();
}

class _ShiftsListScreenState extends ConsumerState<ShiftsListScreen> {
  DateTime? selectedDate;
  String? selectedLocation;
  String? selectedStatus;

  @override
  Widget build(BuildContext context) {
    // 🎯 根据参数自动缓存不同结果
    final query = useGetShifts(
      ref,
      date: selectedDate,
      locationId: selectedLocation,
      status: selectedStatus,
    );

    return Scaffold(
      appBar: AppBar(
        title: Text('Shifts'),
        bottom: PreferredSize(
          preferredSize: Size.fromHeight(60),
          child: Container(
            height: 60,
            child: ListView(
              scrollDirection: Axis.horizontal,
              children: [
                // 筛选条件
                Padding(
                  padding: EdgeInsets.all(8),
                  child: FilterChip(
                    label: Text(selectedDate?.toString() ?? 'All Dates'),
                    onSelected: (_) => _selectDate(),
                  ),
                ),
                Padding(
                  padding: EdgeInsets.all(8),
                  child: FilterChip(
                    label: Text(selectedLocation ?? 'All Locations'),
                    onSelected: (_) => _selectLocation(),
                  ),
                ),
                Padding(
                  padding: EdgeInsets.all(8),
                  child: FilterChip(
                    label: Text(selectedStatus ?? 'All Status'),
                    onSelected: (_) => _selectStatus(),
                  ),
                ),
                if (query.isRefreshing)
                  Padding(
                    padding: EdgeInsets.all(8),
                    child: CircularProgressIndicator(strokeWidth: 2),
                  ),
              ],
            ),
          ),
        ),
      ),
      body: Builder(
        builder: (context) {
          // 初次加载
          if (query.isLoading && !query.hasData) {
            return Center(child: CircularProgressIndicator());
          }

          // 错误但有缓存数据
          if (query.isError && query.hasData) {
            ScaffoldMessenger.of(context).showSnackBar(
              SnackBar(
                content: Text('Failed to refresh: ${query.error}'),
                backgroundColor: Colors.orange,
              ),
            );
          }

          // 显示数据（可能是缓存的）
          final shifts = query.data ?? [];

          return Column(
            children: [
              // 显示数据状态
              if (query.isStale)
                Container(
                  color: Colors.yellow[100],
                  padding: EdgeInsets.all(8),
                  child: Row(
                    children: [
                      Icon(Icons.info, size: 16),
                      SizedBox(width: 8),
                      Text('Showing cached data from ${query.dataUpdatedAt}'),
                    ],
                  ),
                ),

              // 列表
              Expanded(
                child: RefreshIndicator(
                  onRefresh: () async {
                    // 强制刷新
                    ref.invalidate(['shifts', 'list', selectedDate, selectedLocation, selectedStatus]);
                  },
                  child: ListView.builder(
                    itemCount: shifts.length,
                    itemBuilder: (context, index) {
                      final shift = shifts[index];
                      return ListTile(
                        title: Text(shift.title),
                        subtitle: Text('${shift.date} - ${shift.location}'),
                        trailing: Chip(label: Text(shift.status)),
                        onTap: () => _navigateToDetail(shift.id),
                      );
                    },
                  ),
                ),
              ),
            ],
          );
        },
      ),
    );
  }

  void _selectDate() async {
    final date = await showDatePicker(
      context: context,
      initialDate: selectedDate ?? DateTime.now(),
      firstDate: DateTime.now(),
      lastDate: DateTime.now().add(Duration(days: 365)),
    );
    if (date != null) {
      setState(() => selectedDate = date);
    }
  }

  void _selectLocation() {
    // 显示位置选择
  }

  void _selectStatus() {
    // 显示状态选择
  }

  void _navigateToDetail(String shiftId) {
    Navigator.push(
      context,
      MaterialPageRoute(
        builder: (_) => ShiftDetailScreen(shiftId: shiftId),
      ),
    );
  }
}

// ============================================================
// 3. Mutation - 更新数据
// ============================================================

class EditShiftScreen extends ConsumerWidget {
  final String shiftId;
  final ShiftResponseDto initialData;

  const EditShiftScreen({
    required this.shiftId,
    required this.initialData,
  });

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    // 🎯 使用 Mutation Hook
    final updateMutation = useUpdateShift(ref);

    return Scaffold(
      appBar: AppBar(
        title: Text('Edit Shift'),
        actions: [
          // 保存按钮
          IconButton(
            icon: updateMutation.state.isLoading
                ? SizedBox(
                    width: 20,
                    height: 20,
                    child: CircularProgressIndicator(strokeWidth: 2),
                  )
                : Icon(Icons.save),
            onPressed: updateMutation.state.isLoading
                ? null
                : () => _save(context, ref, updateMutation),
          ),
        ],
      ),
      body: Form(
        child: ListView(
          padding: EdgeInsets.all(16),
          children: [
            // 显示错误
            if (updateMutation.state.isError)
              Container(
                color: Colors.red[100],
                padding: EdgeInsets.all(16),
                margin: EdgeInsets.only(bottom: 16),
                child: Text(
                  'Update failed: ${updateMutation.state.error}',
                  style: TextStyle(color: Colors.red[900]),
                ),
              ),

            // 显示成功
            if (updateMutation.state.isSuccess)
              Container(
                color: Colors.green[100],
                padding: EdgeInsets.all(16),
                margin: EdgeInsets.only(bottom: 16),
                child: Text(
                  'Shift updated successfully!',
                  style: TextStyle(color: Colors.green[900]),
                ),
              ),

            TextFormField(
              initialValue: initialData.title,
              decoration: InputDecoration(labelText: 'Title'),
              onSaved: (value) => _title = value,
            ),
            TextFormField(
              initialValue: initialData.description,
              decoration: InputDecoration(labelText: 'Description'),
              onSaved: (value) => _description = value,
            ),
            // ... 其他字段
          ],
        ),
      ),
    );
  }

  String? _title;
  String? _description;

  Future<void> _save(
    BuildContext context,
    WidgetRef ref,
    UseUpdateShift mutation,
  ) async {
    try {
      // 🔄 乐观更新 - UI 立即响应
      await mutation.mutateOptimistic(
        shiftId,
        UpdateShiftRequestDto(
          title: _title,
          description: _description,
        ),
        optimisticData: initialData.copyWith(
          title: _title,
          description: _description,
        ),
      );

      // ✅ 成功
      // 所有相关查询都会自动刷新！
      Navigator.pop(context);

    } catch (e) {
      // 错误已经在 mutation.state 中
      // 乐观更新会自动回滚
    }
  }
}

// ============================================================
// 4. 无限滚动 - 自动分页
// ============================================================

class InfiniteShiftsScreen extends ConsumerStatefulWidget {
  @override
  ConsumerState<InfiniteShiftsScreen> createState() => _InfiniteShiftsScreenState();
}

class _InfiniteShiftsScreenState extends ConsumerState<InfiniteShiftsScreen> {
  late final UseInfiniteShifts infiniteQuery;
  final ScrollController _scrollController = ScrollController();

  @override
  void initState() {
    super.initState();

    // 🎯 初始化无限查询
    infiniteQuery = useInfiniteShifts(ref);
    infiniteQuery.fetchNextPage();

    // 监听滚动
    _scrollController.addListener(() {
      if (_scrollController.position.pixels >=
          _scrollController.position.maxScrollExtent - 200) {
        infiniteQuery.fetchNextPage();
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: Text('All Shifts')),
      body: RefreshIndicator(
        onRefresh: () => infiniteQuery.refetch(),
        child: ListView.builder(
          controller: _scrollController,
          itemCount: infiniteQuery.data.length + (infiniteQuery.hasNextPage ? 1 : 0),
          itemBuilder: (context, index) {
            // 加载更多指示器
            if (index == infiniteQuery.data.length) {
              return Padding(
                padding: EdgeInsets.all(16),
                child: Center(
                  child: infiniteQuery.isLoadingNext
                      ? CircularProgressIndicator()
                      : Text('Loading more...'),
                ),
              );
            }

            final shift = infiniteQuery.data[index];
            return ListTile(
              title: Text(shift.title),
              subtitle: Text('Item #${index + 1}'),
            );
          },
        ),
      ),
    );
  }

  @override
  void dispose() {
    _scrollController.dispose();
    super.dispose();
  }
}

// ============================================================
// 5. 依赖查询 - 一个查询依赖另一个
// ============================================================

class ShiftWithLocationScreen extends ConsumerWidget {
  final String shiftId;

  const ShiftWithLocationScreen({required this.shiftId});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    // 第一个查询：获取班次
    final shiftQuery = useGetShift(ref, shiftId);

    // 第二个查询：基于班次获取位置（依赖查询）
    final locationQuery = shiftQuery.data != null
        ? useGetLocation(ref, shiftQuery.data!.locationId)
        : null;

    return Scaffold(
      appBar: AppBar(title: Text('Shift & Location')),
      body: Column(
        children: [
          // 班次信息
          if (shiftQuery.isLoading)
            CircularProgressIndicator()
          else if (shiftQuery.data != null)
            Card(
              child: ListTile(
                title: Text(shiftQuery.data!.title),
                subtitle: Text('Shift loaded'),
              ),
            ),

          // 位置信息（依赖班次）
          if (locationQuery?.isLoading ?? false)
            CircularProgressIndicator()
          else if (locationQuery?.data != null)
            Card(
              child: ListTile(
                title: Text(locationQuery!.data!.name),
                subtitle: Text('Location loaded'),
              ),
            ),
        ],
      ),
    );
  }
}

// ============================================================
// 6. 预加载 - 鼠标悬停时预加载
// ============================================================

class ShiftCardWithPrefetch extends ConsumerWidget {
  final String shiftId;
  final String title;

  const ShiftCardWithPrefetch({
    required this.shiftId,
    required this.title,
  });

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return MouseRegion(
      onEnter: (_) {
        // 🎯 鼠标悬停时预加载数据
        // 数据会被缓存，点击进入详情页时立即显示
        ref.read(shiftsServiceProvider).getV1ShiftsShiftId(shiftId).then((data) {
          ref.read(queryCacheProvider).set(['shifts', shiftId], data);
        });
      },
      child: Card(
        child: ListTile(
          title: Text(title),
          subtitle: Text('Hover to prefetch'),
          onTap: () {
            Navigator.push(
              context,
              MaterialPageRoute(
                builder: (_) => ShiftDetailScreen(shiftId: shiftId),
              ),
            );
          },
        ),
      ),
    );
  }
}