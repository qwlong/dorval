# 实际对比：有 Riverpod vs 没有 Riverpod

## 基于你的 Shift Scheduling API 的真实对比

### 场景：获取某个位置的所有班次并显示

#### ❌ 现在生成的代码（没有 Riverpod）

```dart
// 需要手写的状态管理代码
class LocationShiftsScreen extends StatefulWidget {
  final String locationId;

  const LocationShiftsScreen({required this.locationId});

  @override
  _LocationShiftsScreenState createState() => _LocationShiftsScreenState();
}

class _LocationShiftsScreenState extends State<LocationShiftsScreen> {
  final apiClient = ApiClient(baseUrl: 'https://api.example.com');
  late final ShiftsService shiftsService;
  late final LocationsService locationsService;

  List<ShiftResponseDto>? shifts;
  LocationSettingsResponseDto? location;
  bool isLoading = true;
  String? error;

  @override
  void initState() {
    super.initState();
    shiftsService = ShiftsService(apiClient);
    locationsService = LocationsService(apiClient);
    _loadData();
  }

  Future<void> _loadData() async {
    setState(() {
      isLoading = true;
      error = null;
    });

    try {
      // 需要手动处理并行加载
      final results = await Future.wait([
        shiftsService.getV1LocationsLocationIdShifts(widget.locationId),
        locationsService.getV1LocationsLocationIdSettings(widget.locationId),
      ]);

      setState(() {
        shifts = results[0] as List<ShiftResponseDto>;
        location = results[1] as LocationSettingsResponseDto;
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
    if (isLoading) {
      return Scaffold(
        body: Center(child: CircularProgressIndicator()),
      );
    }

    if (error != null) {
      return Scaffold(
        body: Center(
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Text('Error: $error'),
              ElevatedButton(
                onPressed: _loadData,
                child: Text('Retry'),
              ),
            ],
          ),
        ),
      );
    }

    return Scaffold(
      appBar: AppBar(
        title: Text(location?.locationName ?? 'Shifts'),
      ),
      body: RefreshIndicator(
        onRefresh: _loadData,
        child: ListView.builder(
          itemCount: shifts?.length ?? 0,
          itemBuilder: (context, index) {
            final shift = shifts![index];
            return ListTile(
              title: Text(shift.title),
              subtitle: Text(shift.date.toString()),
            );
          },
        ),
      ),
    );
  }
}
```

#### ✅ 如果生成 Riverpod Provider

**生成的 Provider 文件：**
```dart
// 🎯 自动生成的 providers/shifts_provider.dart

import 'package:flutter_riverpod/flutter_riverpod.dart';

// 获取位置的班次列表
final getLocationShiftsProvider = FutureProvider.family<
  List<ShiftResponseDto>,
  String  // locationId
>((ref, locationId) async {
  final service = ref.watch(shiftsServiceProvider);
  return service.getV1LocationsLocationIdShifts(locationId);
});

// 获取位置设置
final getLocationSettingsProvider = FutureProvider.family<
  LocationSettingsResponseDto,
  String  // locationId
>((ref, locationId) async {
  final service = ref.watch(locationsServiceProvider);
  return service.getV1LocationsLocationIdSettings(locationId);
});

// 组合：位置详情 + 班次列表
final locationWithShiftsProvider = FutureProvider.family<
  LocationWithShifts,
  String  // locationId
>((ref, locationId) async {
  // 自动并行加载
  final (settings, shifts) = await (
    ref.watch(getLocationSettingsProvider(locationId).future),
    ref.watch(getLocationShiftsProvider(locationId).future),
  ).wait;

  return LocationWithShifts(
    settings: settings,
    shifts: shifts,
  );
});
```

**使用代码：**
```dart
// 使用变得超级简单
class LocationShiftsScreen extends ConsumerWidget {
  final String locationId;

  const LocationShiftsScreen({required this.locationId});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final dataAsync = ref.watch(locationWithShiftsProvider(locationId));

    return Scaffold(
      appBar: AppBar(
        title: dataAsync.maybeWhen(
          data: (data) => Text(data.settings.locationName),
          orElse: () => Text('Loading...'),
        ),
      ),
      body: dataAsync.when(
        data: (data) => RefreshIndicator(
          onRefresh: () => ref.refresh(locationWithShiftsProvider(locationId).future),
          child: ListView.builder(
            itemCount: data.shifts.length,
            itemBuilder: (context, index) {
              final shift = data.shifts[index];
              return ListTile(
                title: Text(shift.title),
                subtitle: Text(shift.date.toString()),
              );
            },
          ),
        ),
        loading: () => Center(child: CircularProgressIndicator()),
        error: (error, stack) => Center(
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Text('Error: $error'),
              ElevatedButton(
                onPressed: () => ref.invalidate(locationWithShiftsProvider(locationId)),
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

### 代码量对比

| 部分 | 无 Riverpod | 有 Riverpod | 差异 |
|-----|------------|-------------|------|
| 状态定义 | 15 行 | 0 行 | -100% |
| 初始化 | 8 行 | 0 行 | -100% |
| 数据加载 | 25 行 | 自动生成 | -100% |
| 错误处理 | 20 行 | 3 行 | -85% |
| UI 代码 | 45 行 | 25 行 | -44% |
| **总计** | **113 行** | **28 行** | **-75%** |

### 更重要的是：数据同步

#### 场景：更新班次后，需要刷新多个地方

**❌ 没有 Riverpod：**
```dart
// 在编辑页面
await shiftsService.updateShift(shiftId, data);

// 需要手动通知其他页面刷新
// 1. 用 EventBus？
eventBus.fire(ShiftUpdatedEvent(shiftId));

// 2. 用 callback？
widget.onShiftUpdated?.call();

// 3. 用 setState？
// 只能刷新当前页面...

// 很容易遗漏某个地方
```

**✅ 有 Riverpod：**
```dart
// 更新班次
await ref.read(updateShiftProvider.notifier).update(shiftId, data);

// 自动刷新（在 Provider 里配置好）：
// ✅ 班次列表
// ✅ 班次详情
// ✅ 位置的班次
// ✅ 日历视图
// ✅ 统计数据
```

### 真正的价值

1. **不是生成业务逻辑** - 业务逻辑还是要写
2. **是生成状态管理** - 这部分是重复的样板代码
3. **自动处理数据流** - loading、error、data 状态
4. **智能缓存和刷新** - 避免重复请求

### 生成策略

```javascript
// dorval.config.js
module.exports = {
  input: './openapi.json',
  output: {
    target: './lib/api',
    client: 'dio',
    riverpod: {
      enabled: true,
      // 简单模式：只生成基础 Provider
      mode: 'simple',  // 'simple' | 'smart' | 'full'

      // simple: 每个 API 方法一个 Provider
      // smart: 自动识别关联，生成组合 Provider
      // full: 包括分页、搜索、mutations 等
    }
  }
};
```

### 渐进式采用

第一步：只生成最基础的 Provider
```dart
// 每个 GET 方法生成一个 FutureProvider
final getShiftProvider = FutureProvider.family<Shift, String>((ref, id) async {
  return ref.watch(shiftsServiceProvider).getShift(id);
});
```

第二步：识别常见模式
```dart
// 识别分页
if (hasPageParam && returnsList) {
  // 生成分页 Provider
}

// 识别搜索
if (hasSearchParam) {
  // 生成带防抖的搜索 Provider
}
```

第三步：生成组合 Provider
```dart
// 基于 API 路径分析关系
// /locations/{id}/shifts -> 位置和班次有关系
// 生成组合 Provider
```

这样更实际，你觉得呢？