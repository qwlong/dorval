// ============================================================
// 生成的 Query Hooks - 类似 React Query 的体验
// 直接在组件中使用，自动处理一切
// ============================================================

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:dio/dio.dart';

// ============================================================
// 核心 Query 系统（这部分是框架代码，只需要一次）
// ============================================================

/// Query 结果
class QueryResult<T> {
  final T? data;
  final bool isLoading;
  final bool isRefreshing;
  final bool isError;
  final Object? error;
  final DateTime? dataUpdatedAt;
  final bool isStale;

  const QueryResult({
    this.data,
    this.isLoading = false,
    this.isRefreshing = false,
    this.isError = false,
    this.error,
    this.dataUpdatedAt,
    this.isStale = false,
  });

  /// 是否有数据（即使是旧的）
  bool get hasData => data != null;

  /// 是否成功
  bool get isSuccess => hasData && !isError && !isLoading;

  /// 是否空闲
  bool get isIdle => !hasData && !isLoading && !isError;
}

/// Mutation 结果
class MutationResult<TData, TVariables> {
  final TData? data;
  final TVariables? variables;
  final bool isLoading;
  final bool isError;
  final bool isSuccess;
  final Object? error;

  const MutationResult({
    this.data,
    this.variables,
    this.isLoading = false,
    this.isError = false,
    this.isSuccess = false,
    this.error,
  });

  /// 是否空闲（未执行）
  bool get isIdle => !isLoading && !isError && !isSuccess;
}

/// Query 配置
class QueryConfig {
  final Duration staleTime;
  final Duration cacheTime;
  final int retryCount;
  final Duration retryDelay;
  final bool refetchOnMount;
  final bool refetchOnWindowFocus;
  final bool enabled;

  const QueryConfig({
    this.staleTime = const Duration(minutes: 5),
    this.cacheTime = const Duration(minutes: 10),
    this.retryCount = 3,
    this.retryDelay = const Duration(seconds: 1),
    this.refetchOnMount = true,
    this.refetchOnWindowFocus = true,
    this.enabled = true,
  });
}

// ============================================================
// 生成的 Hooks（每个 API 方法生成一个）
// ============================================================

/// 🎯 获取班次详情 - 自动生成的 Hook
QueryResult<ShiftResponseDto> useGetShift(
  WidgetRef ref,
  String shiftId, {
  QueryConfig? config,
}) {
  final queryKey = ['shifts', shiftId];

  // 内部 Provider（自动生成，用户不需要关心）
  final provider = FutureProvider.family<ShiftResponseDto, String>((ref, id) async {
    // 检查缓存
    final cached = ref.read(queryCacheProvider).get<ShiftResponseDto>(queryKey);
    if (cached != null && !cached.isStale) {
      return cached.data!;
    }

    // 调用 API
    final service = ref.read(shiftsServiceProvider);
    final data = await service.getV1ShiftsShiftId(id);

    // 更新缓存
    ref.read(queryCacheProvider).set(queryKey, data, config?.staleTime);

    return data;
  });

  // 监听状态
  final asyncValue = ref.watch(provider(shiftId));

  // 转换为 QueryResult
  return asyncValue.when(
    data: (data) => QueryResult(
      data: data,
      isLoading: false,
      isError: false,
      dataUpdatedAt: DateTime.now(),
    ),
    loading: () => QueryResult(
      isLoading: true,
      data: ref.read(queryCacheProvider).get<ShiftResponseDto>(queryKey)?.data,
    ),
    error: (error, stack) => QueryResult(
      isError: true,
      error: error,
      data: ref.read(queryCacheProvider).get<ShiftResponseDto>(queryKey)?.data,
    ),
  );
}

/// 🎯 获取班次列表 - 支持筛选
QueryResult<List<ShiftResponseDto>> useGetShifts(
  WidgetRef ref, {
  DateTime? date,
  String? locationId,
  String? status,
  QueryConfig? config,
}) {
  final queryKey = ['shifts', 'list', date, locationId, status];

  final provider = FutureProvider<List<ShiftResponseDto>>((ref) async {
    // 检查缓存
    final cached = ref.read(queryCacheProvider).get<List<ShiftResponseDto>>(queryKey);
    if (cached != null && !cached.isStale) {
      return cached.data!;
    }

    // 调用 API
    final service = ref.read(shiftsServiceProvider);
    final data = await service.getV1Shifts(
      date: date,
      locationId: locationId,
      status: status,
    );

    // 更新缓存
    ref.read(queryCacheProvider).set(queryKey, data, config?.staleTime);

    return data;
  });

  final asyncValue = ref.watch(provider);

  return asyncValue.when(
    data: (data) => QueryResult(
      data: data,
      isLoading: false,
      isError: false,
      dataUpdatedAt: DateTime.now(),
    ),
    loading: () => QueryResult(
      isLoading: true,
      data: ref.read(queryCacheProvider).get<List<ShiftResponseDto>>(queryKey)?.data,
    ),
    error: (error, stack) => QueryResult(
      isError: true,
      error: error,
      data: ref.read(queryCacheProvider).get<List<ShiftResponseDto>>(queryKey)?.data,
    ),
  );
}

/// 🎯 更新班次 - Mutation Hook
class UseUpdateShift {
  final WidgetRef _ref;
  final _stateProvider = StateProvider<MutationResult<ShiftResponseDto, UpdateShiftRequestDto>>((ref) {
    return const MutationResult();
  });

  UseUpdateShift(this._ref);

  /// 当前状态
  MutationResult<ShiftResponseDto, UpdateShiftRequestDto> get state {
    return _ref.watch(_stateProvider);
  }

  /// 执行更新
  Future<ShiftResponseDto> mutate(String shiftId, UpdateShiftRequestDto data) async {
    // 设置 loading 状态
    _ref.read(_stateProvider.notifier).state = MutationResult(
      isLoading: true,
      variables: data,
    );

    try {
      // 调用 API
      final service = _ref.read(shiftsServiceProvider);
      final result = await service.patchV1ShiftsShiftId(shiftId, data);

      // 更新状态
      _ref.read(_stateProvider.notifier).state = MutationResult(
        data: result,
        variables: data,
        isSuccess: true,
      );

      // 🔄 智能刷新相关查询
      _invalidateRelatedQueries(shiftId, data);

      return result;
    } catch (error) {
      // 错误状态
      _ref.read(_stateProvider.notifier).state = MutationResult(
        isError: true,
        error: error,
        variables: data,
      );
      rethrow;
    }
  }

  /// 乐观更新
  Future<ShiftResponseDto> mutateOptimistic(
    String shiftId,
    UpdateShiftRequestDto data, {
    required ShiftResponseDto optimisticData,
  }) async {
    // 立即更新缓存（乐观更新）
    final queryKey = ['shifts', shiftId];
    final oldData = _ref.read(queryCacheProvider).get<ShiftResponseDto>(queryKey);
    _ref.read(queryCacheProvider).set(queryKey, optimisticData);

    try {
      return await mutate(shiftId, data);
    } catch (error) {
      // 失败时回滚
      if (oldData != null) {
        _ref.read(queryCacheProvider).set(queryKey, oldData.data!);
      }
      rethrow;
    }
  }

  void _invalidateRelatedQueries(String shiftId, UpdateShiftRequestDto data) {
    // 刷新详情
    _ref.invalidate(['shifts', shiftId]);

    // 刷新列表
    _ref.invalidate(['shifts', 'list']);

    // 如果改了位置，刷新该位置的列表
    if (data.locationId != null) {
      _ref.invalidate(['shifts', 'byLocation', data.locationId]);
    }

    // 如果改了日期，刷新该日期的列表
    if (data.date != null) {
      _ref.invalidate(['shifts', 'byDate', data.date]);
    }
  }
}

/// 使用 Mutation Hook
UseUpdateShift useUpdateShift(WidgetRef ref) => UseUpdateShift(ref);

/// 🎯 无限滚动查询 - 自动分页
class UseInfiniteShifts {
  final WidgetRef _ref;
  final List<List<ShiftResponseDto>> _pages = [];
  int _currentPage = 1;
  bool _hasNextPage = true;
  bool _isLoadingNext = false;

  UseInfiniteShifts(this._ref);

  /// 所有数据（扁平化）
  List<ShiftResponseDto> get data {
    return _pages.expand((page) => page).toList();
  }

  /// 是否有下一页
  bool get hasNextPage => _hasNextPage;

  /// 是否正在加载下一页
  bool get isLoadingNext => _isLoadingNext;

  /// 加载下一页
  Future<void> fetchNextPage() async {
    if (!_hasNextPage || _isLoadingNext) return;

    _isLoadingNext = true;

    try {
      final service = _ref.read(shiftsServiceProvider);
      final nextPage = await service.getV1Shifts(
        page: _currentPage,
        limit: 20,
      );

      _pages.add(nextPage);
      _currentPage++;
      _hasNextPage = nextPage.length == 20;
    } finally {
      _isLoadingNext = false;
    }
  }

  /// 刷新（重新开始）
  Future<void> refetch() async {
    _pages.clear();
    _currentPage = 1;
    _hasNextPage = true;
    await fetchNextPage();
  }
}

/// 使用无限滚动 Hook
UseInfiniteShifts useInfiniteShifts(WidgetRef ref) => UseInfiniteShifts(ref);

// ============================================================
// 缓存管理（框架代码）
// ============================================================

class QueryCache {
  final Map<String, CachedData> _cache = {};

  CachedData<T>? get<T>(List<dynamic> queryKey) {
    final key = queryKey.toString();
    final cached = _cache[key];
    if (cached == null) return null;

    // 检查是否过期
    if (DateTime.now().difference(cached.updatedAt) > cached.cacheTime) {
      _cache.remove(key);
      return null;
    }

    return cached as CachedData<T>;
  }

  void set<T>(List<dynamic> queryKey, T data, [Duration? staleTime]) {
    final key = queryKey.toString();
    _cache[key] = CachedData(
      data: data,
      updatedAt: DateTime.now(),
      staleTime: staleTime ?? Duration(minutes: 5),
      cacheTime: Duration(minutes: 10),
    );
  }

  void invalidate(List<dynamic> queryKey) {
    final key = queryKey.toString();
    _cache.remove(key);
  }

  void clear() {
    _cache.clear();
  }
}

class CachedData<T> {
  final T data;
  final DateTime updatedAt;
  final Duration staleTime;
  final Duration cacheTime;

  CachedData({
    required this.data,
    required this.updatedAt,
    required this.staleTime,
    required this.cacheTime,
  });

  bool get isStale {
    return DateTime.now().difference(updatedAt) > staleTime;
  }
}

final queryCacheProvider = Provider((ref) => QueryCache());

// ============================================================
// Services（需要先生成）
// ============================================================

final shiftsServiceProvider = Provider((ref) {
  final client = ref.watch(apiClientProvider);
  return ShiftsService(client);
});

final apiClientProvider = Provider((ref) {
  return ApiClient(baseUrl: 'https://api.example.com');
});