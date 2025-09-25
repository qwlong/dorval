# useQuery 方案对比 - 真正的价值

## 核心理念：像 React Query 一样简单

### 🎯 最核心的改变

```dart
// 🚀 只需要这一行！
final query = useGetShift(ref, shiftId);

// 自动获得：
// ✅ 数据缓存
// ✅ 后台刷新
// ✅ 错误重试
// ✅ 乐观更新
// ✅ 请求去重
// ✅ 状态管理
```

## 对比：获取并显示数据

### ❌ 传统方式（现在）
```dart
class _ScreenState extends State<Screen> {
  ShiftResponseDto? shift;
  LocationResponseDto? location;
  bool isLoading = true;
  String? error;

  @override
  void initState() {
    super.initState();
    _loadData();
  }

  Future<void> _loadData() async {
    setState(() {
      isLoading = true;
      error = null;
    });

    try {
      final shiftData = await shiftsService.getShift(widget.shiftId);
      final locationData = await locationsService.getLocation(shiftData.locationId);

      setState(() {
        shift = shiftData;
        location = locationData;
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
    if (shift == null) return Text('No data');

    return Column(
      children: [
        Text(shift!.title),
        Text(location?.name ?? 'Loading...'),
      ],
    );
  }
}
```

### ✅ useQuery 方式
```dart
class Screen extends ConsumerWidget {
  @override
  Widget build(BuildContext context, WidgetRef ref) {
    // 一行获取数据
    final shiftQuery = useGetShift(ref, shiftId);

    // 依赖查询
    final locationQuery = shiftQuery.data != null
        ? useGetLocation(ref, shiftQuery.data!.locationId)
        : null;

    if (shiftQuery.isLoading) return CircularProgressIndicator();
    if (shiftQuery.isError) return Text('Error: ${shiftQuery.error}');

    return Column(
      children: [
        Text(shiftQuery.data!.title),
        if (locationQuery?.data != null)
          Text(locationQuery.data!.name),
      ],
    );
  }
}
```

## 杀手级功能

### 1. 🎯 自动缓存管理

```dart
// 第一次调用：从 API 获取
final query1 = useGetShift(ref, "shift-1");  // 🌐 网络请求

// 5分钟内再次调用：从缓存返回
final query2 = useGetShift(ref, "shift-1");  // 💾 缓存，瞬间返回

// 不同参数：独立缓存
final query3 = useGetShift(ref, "shift-2");  // 🌐 新的网络请求
```

### 2. 🔄 智能后台刷新

```dart
final query = useGetShifts(ref);

// 数据状态：
// query.isLoading    - 首次加载
// query.isRefreshing - 后台刷新（显示旧数据）
// query.isStale      - 数据过期（但仍可用）

// UI 可以显示缓存数据，同时后台刷新
if (query.hasData) {
  // 显示数据（即使正在刷新）
  return ShiftsList(query.data!);
}
```

### 3. 🚀 乐观更新

```dart
final updateMutation = useUpdateShift(ref);

// 乐观更新 - UI 立即响应
await updateMutation.mutateOptimistic(
  shiftId,
  updateData,
  optimisticData: shift.copyWith(title: "New Title"),  // 立即显示
);

// 如果失败，自动回滚到原始数据
```

### 4. 🎨 请求去重

```dart
// 同时发起相同请求，只会真正执行一次
Future.wait([
  useGetShift(ref, "shift-1"),  // 发起请求
  useGetShift(ref, "shift-1"),  // 等待第一个
  useGetShift(ref, "shift-1"),  // 等待第一个
]);
// 只有 1 次网络请求！
```

### 5. 🔗 依赖查询

```dart
// 第二个查询依赖第一个的结果
final userQuery = useGetCurrentUser(ref);
final shiftsQuery = userQuery.data != null
    ? useGetUserShifts(ref, userQuery.data!.id)
    : null;
```

### 6. 📄 无限滚动（内置）

```dart
final infiniteQuery = useInfiniteShifts(ref);

// 使用超简单
ListView.builder(
  itemCount: infiniteQuery.data.length,
  itemBuilder: (context, index) {
    if (index == infiniteQuery.data.length - 1) {
      infiniteQuery.fetchNextPage();  // 自动加载下一页
    }
    return ShiftCard(infiniteQuery.data[index]);
  },
);
```

### 7. 🔍 智能失效策略

```dart
// 更新后，自动刷新相关查询
final updateMutation = useUpdateShift(ref);

await updateMutation.mutate(shiftId, data);
// 自动刷新：
// ✅ getShift(shiftId)
// ✅ getShiftsList()
// ✅ getLocationShifts(locationId)
// ✅ getShiftsByDate(date)
```

## 生成策略

### 每个 API 方法生成对应的 Hook

```typescript
// 分析 OpenAPI
paths:
  /shifts/{id}:
    get: getShift
    patch: updateShift
  /shifts:
    get: getShifts
    post: createShift

// 生成 Hooks
- useGetShift()      // Query Hook
- useGetShifts()     // Query Hook
- useCreateShift()   // Mutation Hook
- useUpdateShift()   // Mutation Hook
```

### 智能识别模式

```typescript
// 识别分页
if (hasPageParam && returnsList) {
  generateInfiniteHook();  // useInfiniteShifts
}

// 识别搜索
if (hasSearchParam) {
  addDebounce(300);  // 自动防抖
}

// 识别关联
if (path.includes('/{parentId}/children')) {
  addInvalidation(['parent', parentId]);  // 更新时刷新父级
}
```

## 实际收益

### 代码量减少
- **状态管理**：-90%（几乎不用写）
- **错误处理**：-80%（内置重试）
- **缓存逻辑**：-100%（全自动）
- **数据同步**：-100%（全自动）

### 性能提升
- **减少请求**：自动去重、缓存
- **更快响应**：乐观更新、缓存优先
- **更好体验**：后台刷新、预加载

### 开发效率
- **学习成本**：熟悉 React Query 的人秒懂
- **调试简单**：状态可视化
- **错误更少**：自动处理边界情况

## 实施计划

### Phase 1：基础 Query（1周）
- `useQuery` - 基础查询
- 缓存管理
- 状态管理

### Phase 2：Mutation（1周）
- `useMutation` - 数据变更
- 乐观更新
- 自动失效

### Phase 3：高级功能（2周）
- `useInfiniteQuery` - 无限滚动
- 预加载
- 离线支持

## 为什么这个有价值？

1. **不是简单包装** - 而是完整的数据获取方案
2. **解决真正痛点** - 缓存、同步、状态管理
3. **符合趋势** - React Query 已经是标准
4. **立即见效** - 第一天就能少写 70% 代码

这才是真正有价值的集成，你觉得呢？