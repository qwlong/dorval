// ============================================================
// 使用示例 - 看看生成的 Provider 使用起来有多简单
// ============================================================

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'providers/shifts_provider.dart';
import 'models/index.dart';

// ============================================================
// 1. 简单列表页面 - 自动处理 loading/error/data
// ============================================================

class ShiftsListScreen extends ConsumerWidget {
  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final shiftsAsync = ref.watch(getShiftsListProvider);

    return Scaffold(
      appBar: AppBar(title: Text('Shifts')),
      body: shiftsAsync.when(
        // ✅ 数据加载成功
        data: (shifts) => ListView.builder(
          itemCount: shifts.length,
          itemBuilder: (context, index) {
            final shift = shifts[index];
            return ListTile(
              title: Text(shift.title),
              subtitle: Text('${shift.date} - ${shift.location}'),
              trailing: Chip(label: Text(shift.status)),
              onTap: () => _navigateToDetail(context, shift.id),
            );
          },
        ),
        // ⏳ 加载中
        loading: () => Center(child: CircularProgressIndicator()),
        // ❌ 错误处理
        error: (error, stack) => Center(
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Text('Error: $error'),
              ElevatedButton(
                onPressed: () => ref.invalidate(getShiftsListProvider),
                child: Text('Retry'),
              ),
            ],
          ),
        ),
      ),
    );
  }

  void _navigateToDetail(BuildContext context, String shiftId) {
    Navigator.push(
      context,
      MaterialPageRoute(builder: (_) => ShiftDetailScreen(shiftId: shiftId)),
    );
  }
}

// ============================================================
// 2. 智能分页 - 自动加载更多
// ============================================================

class ShiftsPaginatedScreen extends ConsumerWidget {
  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final paginatedShifts = ref.watch(shiftsPaginationProvider);

    return Scaffold(
      appBar: AppBar(
        title: Text('All Shifts'),
        actions: [
          // 显示总数
          paginatedShifts.maybeWhen(
            data: (data) => Center(
              child: Padding(
                padding: EdgeInsets.all(16),
                child: Text('Total: ${data.totalCount}'),
              ),
            ),
            orElse: () => SizedBox(),
          ),
        ],
      ),
      body: paginatedShifts.when(
        data: (data) => RefreshIndicator(
          onRefresh: () => ref.read(shiftsPaginationProvider.notifier).refresh(),
          child: ListView.builder(
            itemCount: data.items.length + (data.hasMore ? 1 : 0),
            itemBuilder: (context, index) {
              // 到达底部，自动加载更多
              if (index == data.items.length) {
                // 🔄 自动触发加载下一页
                ref.read(shiftsPaginationProvider.notifier).loadNextPage();
                return Padding(
                  padding: EdgeInsets.all(16),
                  child: Center(
                    child: data.isLoadingMore
                        ? CircularProgressIndicator()
                        : Text('Loading more...'),
                  ),
                );
              }

              final shift = data.items[index];
              return Card(
                margin: EdgeInsets.all(8),
                child: ListTile(
                  title: Text(shift.title),
                  subtitle: Text('Page ${(index ~/ 20) + 1}'),
                  trailing: Text('#${index + 1}'),
                ),
              );
            },
          ),
        ),
        loading: () => Center(child: CircularProgressIndicator()),
        error: (e, s) => ErrorWidget(e),
      ),
    );
  }
}

// ============================================================
// 3. 复合数据页面 - 自动并行加载多个 API
// ============================================================

class ShiftDetailScreen extends ConsumerWidget {
  final String shiftId;

  const ShiftDetailScreen({required this.shiftId});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    // 🎯 一行代码，自动加载 shift + location + members + job
    final detailAsync = ref.watch(shiftDetailProvider(shiftId));

    return Scaffold(
      appBar: AppBar(title: Text('Shift Detail')),
      body: detailAsync.when(
        data: (detail) => SingleChildScrollView(
          padding: EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Shift 基本信息
              Card(
                child: ListTile(
                  title: Text(detail.shift.title),
                  subtitle: Text(detail.shift.description),
                  trailing: Chip(label: Text(detail.shift.status)),
                ),
              ),

              SizedBox(height: 16),

              // 位置信息 - 自动加载的
              Text('Location', style: Theme.of(context).textTheme.titleLarge),
              Card(
                child: ListTile(
                  leading: Icon(Icons.location_on),
                  title: Text(detail.location.name),
                  subtitle: Text(detail.location.address),
                ),
              ),

              SizedBox(height: 16),

              // 职位要求 - 自动加载的
              if (detail.requiredJob != null) ...[
                Text('Required Job', style: Theme.of(context).textTheme.titleLarge),
                Card(
                  child: ListTile(
                    leading: Icon(Icons.work),
                    title: Text(detail.requiredJob!.title),
                    subtitle: Text(detail.requiredJob!.department),
                  ),
                ),
                SizedBox(height: 16),
              ],

              // 可分配员工 - 自动加载的
              Text('Eligible Members (${detail.eligibleMembers.length})',
                style: Theme.of(context).textTheme.titleLarge),
              ...detail.eligibleMembers.map((member) => Card(
                child: ListTile(
                  leading: CircleAvatar(child: Text(member.initials)),
                  title: Text(member.fullName),
                  subtitle: Text(member.primaryJob ?? 'No job'),
                  trailing: ElevatedButton(
                    onPressed: () => _assignMember(ref, member.id),
                    child: Text('Assign'),
                  ),
                ),
              )),

              SizedBox(height: 16),

              // 已分配员工 - 自动加载的
              Text('Assigned Members (${detail.assignedMembers.length})',
                style: Theme.of(context).textTheme.titleLarge),
              ...detail.assignedMembers.map((member) => Card(
                child: ListTile(
                  leading: CircleAvatar(child: Text(member.initials)),
                  title: Text(member.fullName),
                  trailing: IconButton(
                    icon: Icon(Icons.remove_circle),
                    onPressed: () => _removeMember(ref, member.id),
                  ),
                ),
              )),
            ],
          ),
        ),
        loading: () => Center(child: CircularProgressIndicator()),
        error: (e, s) => Center(child: Text('Error: $e')),
      ),
    );
  }

  void _assignMember(WidgetRef ref, String memberId) {
    // 分配员工的逻辑
  }

  void _removeMember(WidgetRef ref, String memberId) {
    // 移除员工的逻辑
  }
}

// ============================================================
// 4. 智能搜索 - 自动防抖
// ============================================================

class ShiftSearchScreen extends ConsumerStatefulWidget {
  @override
  ConsumerState<ShiftSearchScreen> createState() => _ShiftSearchScreenState();
}

class _ShiftSearchScreenState extends ConsumerState<ShiftSearchScreen> {
  final _searchController = TextEditingController();
  DateTime? _selectedDate;
  String? _selectedLocation;
  String? _selectedStatus;

  @override
  Widget build(BuildContext context) {
    // 构建搜索参数
    final searchParams = ShiftSearchParams(
      query: _searchController.text,
      startDate: _selectedDate,
      locationId: _selectedLocation,
      status: _selectedStatus,
    );

    // 🔍 智能搜索 - 自动防抖300ms
    final searchResults = ref.watch(searchShiftsProvider(searchParams));

    return Scaffold(
      appBar: AppBar(
        title: TextField(
          controller: _searchController,
          decoration: InputDecoration(
            hintText: 'Search shifts...',
            border: InputBorder.none,
          ),
          onChanged: (_) => setState(() {}), // 触发重建
        ),
      ),
      body: Column(
        children: [
          // 筛选条件
          Container(
            height: 50,
            child: ListView(
              scrollDirection: Axis.horizontal,
              children: [
                // 日期筛选
                Padding(
                  padding: EdgeInsets.all(8),
                  child: FilterChip(
                    label: Text(_selectedDate?.toString() ?? 'Any Date'),
                    onSelected: (_) => _selectDate(),
                  ),
                ),
                // 位置筛选
                Padding(
                  padding: EdgeInsets.all(8),
                  child: FilterChip(
                    label: Text(_selectedLocation ?? 'Any Location'),
                    onSelected: (_) => _selectLocation(),
                  ),
                ),
                // 状态筛选
                Padding(
                  padding: EdgeInsets.all(8),
                  child: FilterChip(
                    label: Text(_selectedStatus ?? 'Any Status'),
                    onSelected: (_) => _selectStatus(),
                  ),
                ),
              ],
            ),
          ),

          // 搜索结果
          Expanded(
            child: searchResults.when(
              data: (shifts) => ListView.builder(
                itemCount: shifts.length,
                itemBuilder: (context, index) {
                  final shift = shifts[index];
                  return ListTile(
                    title: Text(shift.title),
                    subtitle: Text('${shift.date} - ${shift.location}'),
                  );
                },
              ),
              loading: () => Center(child: CircularProgressIndicator()),
              error: (e, s) => Center(child: Text('Search failed: $e')),
            ),
          ),
        ],
      ),
    );
  }

  void _selectDate() async {
    final date = await showDatePicker(
      context: context,
      initialDate: _selectedDate ?? DateTime.now(),
      firstDate: DateTime.now(),
      lastDate: DateTime.now().add(Duration(days: 365)),
    );
    if (date != null) {
      setState(() => _selectedDate = date);
    }
  }

  void _selectLocation() {
    // 显示位置选择对话框
  }

  void _selectStatus() {
    // 显示状态选择对话框
  }
}

// ============================================================
// 5. 数据修改 - 自动刷新相关数据
// ============================================================

class EditShiftScreen extends ConsumerWidget {
  final String shiftId;

  const EditShiftScreen({required this.shiftId});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final shiftAsync = ref.watch(getShiftProvider(shiftId));
    final updateState = ref.watch(updateShiftProvider);

    return Scaffold(
      appBar: AppBar(
        title: Text('Edit Shift'),
        actions: [
          // 保存按钮
          IconButton(
            icon: updateState.isLoading
                ? CircularProgressIndicator(strokeWidth: 2)
                : Icon(Icons.save),
            onPressed: updateState.isLoading ? null : () => _save(ref),
          ),
        ],
      ),
      body: shiftAsync.when(
        data: (shift) => _buildForm(shift, ref),
        loading: () => Center(child: CircularProgressIndicator()),
        error: (e, s) => ErrorWidget(e),
      ),
    );
  }

  Widget _buildForm(ShiftResponseDto shift, WidgetRef ref) {
    return Form(
      child: ListView(
        padding: EdgeInsets.all(16),
        children: [
          TextFormField(
            initialValue: shift.title,
            decoration: InputDecoration(labelText: 'Title'),
            onSaved: (value) => _title = value,
          ),
          // ... 其他表单字段
        ],
      ),
    );
  }

  String? _title;

  Future<void> _save(WidgetRef ref) async {
    try {
      // 🚀 更新数据
      await ref.read(updateShiftProvider.notifier).update(
        shiftId,
        UpdateShiftRequestDto(
          title: _title,
          // ... 其他字段
        ),
      );

      // ✅ 成功后，所有相关数据都会自动刷新！
      // - 列表页自动更新
      // - 详情页自动更新
      // - 统计数据自动更新
      // - 相关位置的数据自动更新

      // 返回上一页
      Navigator.of(ref.context).pop();
    } catch (e) {
      // 错误处理
      ScaffoldMessenger.of(ref.context).showSnackBar(
        SnackBar(content: Text('Update failed: $e')),
      );
    }
  }
}

// ============================================================
// 6. 实时统计 - 数据自动同步
// ============================================================

class ShiftsDashboard extends ConsumerWidget {
  @override
  Widget build(BuildContext context, WidgetRef ref) {
    // 📊 统计数据 - 任何 shift 更新后自动刷新
    final statsAsync = ref.watch(shiftsStatisticsProvider);
    // 📅 今日班次
    final todayShifts = ref.watch(getShiftsByDateProvider(DateTime.now()));
    // 👤 我的班次
    final myShifts = ref.watch(myShiftsProvider);

    return Scaffold(
      appBar: AppBar(title: Text('Dashboard')),
      body: Column(
        children: [
          // 统计卡片
          statsAsync.when(
            data: (stats) => Container(
              height: 100,
              child: ListView(
                scrollDirection: Axis.horizontal,
                children: [
                  _StatCard('Total', stats['total']!, Colors.blue),
                  _StatCard('Open', stats['open']!, Colors.green),
                  _StatCard('Filled', stats['filled']!, Colors.orange),
                  _StatCard('Completed', stats['completed']!, Colors.grey),
                ],
              ),
            ),
            loading: () => SizedBox(height: 100),
            error: (e, s) => SizedBox(),
          ),

          // 今日班次
          Expanded(
            child: todayShifts.when(
              data: (shifts) => ListView.builder(
                itemCount: shifts.length,
                itemBuilder: (context, index) => ListTile(
                  title: Text(shifts[index].title),
                  subtitle: Text('Today'),
                ),
              ),
              loading: () => Center(child: CircularProgressIndicator()),
              error: (e, s) => ErrorWidget(e),
            ),
          ),
        ],
      ),
    );
  }

  Widget _StatCard(String label, int value, Color color) {
    return Card(
      margin: EdgeInsets.all(8),
      color: color.withOpacity(0.1),
      child: Container(
        width: 100,
        padding: EdgeInsets.all(16),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Text(
              value.toString(),
              style: TextStyle(fontSize: 24, fontWeight: FontWeight.bold),
            ),
            Text(label),
          ],
        ),
      ),
    );
  }
}