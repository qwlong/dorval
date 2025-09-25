// ============================================================
// 自动生成的 Shifts Provider
// 包含智能数据管理、自动依赖处理、分页、搜索等功能
// ============================================================

import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:dio/dio.dart';
import '../services/shifts_service.dart';
import '../services/locations_service.dart';
import '../services/team_members_service.dart';
import '../models/index.dart';
import 'api_client_provider.dart';

// ============================================================
// 基础 Service Provider
// ============================================================

/// Shifts Service 实例
final shiftsServiceProvider = Provider<ShiftsService>((ref) {
  final apiClient = ref.watch(apiClientProvider);
  return ShiftsService(apiClient);
});

// ============================================================
// 基础查询 Providers (自动缓存)
// ============================================================

/// 获取单个 Shift 详情
final getShiftProvider = FutureProvider.family.autoDispose<
  ShiftResponseDto,
  String // shiftId
>((ref, shiftId) async {
  final service = ref.watch(shiftsServiceProvider);

  // 缓存5分钟
  final link = ref.keepAlive();
  Timer(Duration(minutes: 5), () => link.close());

  return service.getV1ShiftsShiftId(shiftId);
});

/// 获取 Shifts 列表 (简单版)
final getShiftsListProvider = FutureProvider.autoDispose<
  List<ShiftResponseDto>
>((ref) async {
  final service = ref.watch(shiftsServiceProvider);
  return service.getV1Shifts();
});

// ============================================================
// 智能分页 Provider
// ============================================================

/// 分页数据模型
class PaginatedShifts {
  final List<ShiftResponseDto> items;
  final int currentPage;
  final int totalPages;
  final int totalCount;
  final bool hasMore;
  final bool isLoadingMore;

  PaginatedShifts({
    required this.items,
    required this.currentPage,
    required this.totalPages,
    required this.totalCount,
    required this.hasMore,
    this.isLoadingMore = false,
  });

  PaginatedShifts copyWith({
    List<ShiftResponseDto>? items,
    int? currentPage,
    int? totalPages,
    int? totalCount,
    bool? hasMore,
    bool? isLoadingMore,
  }) {
    return PaginatedShifts(
      items: items ?? this.items,
      currentPage: currentPage ?? this.currentPage,
      totalPages: totalPages ?? this.totalPages,
      totalCount: totalCount ?? this.totalCount,
      hasMore: hasMore ?? this.hasMore,
      isLoadingMore: isLoadingMore ?? this.isLoadingMore,
    );
  }
}

/// 智能分页 Provider - 自动处理加载更多
class ShiftsPaginationNotifier extends AsyncNotifier<PaginatedShifts> {
  @override
  Future<PaginatedShifts> build() async {
    return _loadPage(1);
  }

  Future<PaginatedShifts> _loadPage(int page) async {
    final service = ref.read(shiftsServiceProvider);
    final response = await service.getV1Shifts(
      page: page,
      limit: 20,
    );

    // 假设 API 返回分页元数据
    return PaginatedShifts(
      items: response.data,
      currentPage: page,
      totalPages: response.totalPages,
      totalCount: response.totalCount,
      hasMore: page < response.totalPages,
    );
  }

  /// 加载下一页
  Future<void> loadNextPage() async {
    final currentState = state.valueOrNull;
    if (currentState == null || !currentState.hasMore || currentState.isLoadingMore) {
      return;
    }

    // 设置加载中状态
    state = AsyncValue.data(
      currentState.copyWith(isLoadingMore: true),
    );

    try {
      final nextPage = await _loadPage(currentState.currentPage + 1);

      // 合并数据
      state = AsyncValue.data(
        currentState.copyWith(
          items: [...currentState.items, ...nextPage.items],
          currentPage: nextPage.currentPage,
          totalPages: nextPage.totalPages,
          totalCount: nextPage.totalCount,
          hasMore: nextPage.hasMore,
          isLoadingMore: false,
        ),
      );
    } catch (e, stack) {
      state = AsyncValue.error(e, stack);
    }
  }

  /// 刷新列表
  Future<void> refresh() async {
    state = const AsyncValue.loading();
    state = await AsyncValue.guard(() => _loadPage(1));
  }
}

final shiftsPaginationProvider = AsyncNotifierProvider<
  ShiftsPaginationNotifier,
  PaginatedShifts
>(ShiftsPaginationNotifier.new);

// ============================================================
// 智能搜索 Provider (带防抖)
// ============================================================

/// 搜索参数
class ShiftSearchParams {
  final String query;
  final DateTime? startDate;
  final DateTime? endDate;
  final String? locationId;
  final String? status;

  ShiftSearchParams({
    required this.query,
    this.startDate,
    this.endDate,
    this.locationId,
    this.status,
  });

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is ShiftSearchParams &&
          query == other.query &&
          startDate == other.startDate &&
          endDate == other.endDate &&
          locationId == other.locationId &&
          status == other.status;

  @override
  int get hashCode => Object.hash(query, startDate, endDate, locationId, status);
}

/// 智能搜索 Provider - 自动防抖，避免频繁请求
final searchShiftsProvider = FutureProvider.family.autoDispose<
  List<ShiftResponseDto>,
  ShiftSearchParams
>((ref, params) async {
  // 防抖处理 - 等待300ms
  await Future.delayed(Duration(milliseconds: 300));

  // 如果在等待期间参数变化了，这个请求会被自动取消
  final service = ref.watch(shiftsServiceProvider);

  return service.searchShifts(
    query: params.query,
    startDate: params.startDate,
    endDate: params.endDate,
    locationId: params.locationId,
    status: params.status,
  );
});

// ============================================================
// 复合数据 Provider (自动组合多个 API)
// ============================================================

/// Shift 详细信息（包含关联数据）
class ShiftDetailData {
  final ShiftResponseDto shift;
  final LocationResponseDto location;
  final List<TeamMemberResponseDto> eligibleMembers;
  final List<TeamMemberResponseDto> assignedMembers;
  final JobResponseDto? requiredJob;

  ShiftDetailData({
    required this.shift,
    required this.location,
    required this.eligibleMembers,
    required this.assignedMembers,
    this.requiredJob,
  });
}

/// 智能组合 Provider - 自动并行加载相关数据
final shiftDetailProvider = FutureProvider.family.autoDispose<
  ShiftDetailData,
  String // shiftId
>((ref, shiftId) async {
  // 1. 先获取 shift 基本信息
  final shift = await ref.watch(getShiftProvider(shiftId).future);

  // 2. 并行加载所有相关数据
  final (location, eligibleMembers, assignedMembers, requiredJob) = await (
    // 获取位置信息
    ref.watch(getLocationProvider(shift.locationId).future),

    // 获取可分配的员工
    ref.watch(getEligibleMembersProvider(
      LocationMembersParams(
        locationId: shift.locationId,
        date: shift.date,
      ),
    ).future),

    // 获取已分配的员工
    ref.watch(getShiftMembersProvider(shiftId).future),

    // 获取职位要求（如果有）
    shift.requiredJobId != null
      ? ref.watch(getJobProvider(shift.requiredJobId!).future)
      : Future.value(null),
  ).wait;

  return ShiftDetailData(
    shift: shift,
    location: location as LocationResponseDto,
    eligibleMembers: eligibleMembers as List<TeamMemberResponseDto>,
    assignedMembers: assignedMembers as List<TeamMemberResponseDto>,
    requiredJob: requiredJob as JobResponseDto?,
  );
});

// ============================================================
// 智能 Mutation Providers (自动刷新相关数据)
// ============================================================

/// 创建 Shift
class CreateShiftNotifier extends AsyncNotifier<ShiftResponseDto?> {
  @override
  FutureOr<ShiftResponseDto?> build() => null;

  Future<ShiftResponseDto> create(CreateShiftRequestDto request) async {
    state = const AsyncValue.loading();

    try {
      final service = ref.read(shiftsServiceProvider);
      final result = await service.postV1Shifts(request);

      // ✨ 智能刷新：自动刷新所有相关数据
      _refreshRelatedData(result);

      state = AsyncValue.data(result);
      return result;
    } catch (e, stack) {
      state = AsyncValue.error(e, stack);
      rethrow;
    }
  }

  void _refreshRelatedData(ShiftResponseDto shift) {
    // 刷新列表
    ref.invalidate(getShiftsListProvider);
    ref.invalidate(shiftsPaginationProvider);

    // 刷新该位置的 shifts
    ref.invalidate(getShiftsByLocationProvider(shift.locationId));

    // 刷新该日期的 shifts
    ref.invalidate(getShiftsByDateProvider(shift.date));

    // 刷新统计数据
    ref.invalidate(shiftsStatisticsProvider);
  }
}

final createShiftProvider = AsyncNotifierProvider<
  CreateShiftNotifier,
  ShiftResponseDto?
>(CreateShiftNotifier.new);

/// 更新 Shift
class UpdateShiftNotifier extends AsyncNotifier<void> {
  @override
  FutureOr<void> build() => null;

  Future<ShiftResponseDto> update(String shiftId, UpdateShiftRequestDto request) async {
    state = const AsyncValue.loading();

    try {
      final service = ref.read(shiftsServiceProvider);
      final result = await service.patchV1ShiftsShiftId(shiftId, request);

      // ✨ 智能刷新：根据更新内容智能判断需要刷新的数据
      _smartRefresh(shiftId, request, result);

      state = const AsyncValue.data(null);
      return result;
    } catch (e, stack) {
      state = AsyncValue.error(e, stack);
      rethrow;
    }
  }

  void _smartRefresh(String shiftId, UpdateShiftRequestDto request, ShiftResponseDto result) {
    // 总是刷新该 shift 的详情
    ref.invalidate(getShiftProvider(shiftId));
    ref.invalidate(shiftDetailProvider(shiftId));

    // 如果改了位置，刷新相关位置的数据
    if (request.locationId != null) {
      ref.invalidate(getShiftsByLocationProvider(request.locationId!));
      // 也要刷新原位置的数据
      final oldShift = ref.read(getShiftProvider(shiftId)).valueOrNull;
      if (oldShift != null && oldShift.locationId != request.locationId) {
        ref.invalidate(getShiftsByLocationProvider(oldShift.locationId));
      }
    }

    // 如果改了日期，刷新相关日期的数据
    if (request.date != null) {
      ref.invalidate(getShiftsByDateProvider(request.date!));
    }

    // 如果改了状态，刷新统计
    if (request.status != null) {
      ref.invalidate(shiftsStatisticsProvider);
    }

    // 刷新列表
    ref.invalidate(getShiftsListProvider);
  }
}

final updateShiftProvider = AsyncNotifierProvider<
  UpdateShiftNotifier,
  void
>(UpdateShiftNotifier.new);

// ============================================================
// 衍生 Providers (基于其他 Provider 的计算)
// ============================================================

/// 按位置筛选的 Shifts
final getShiftsByLocationProvider = FutureProvider.family<
  List<ShiftResponseDto>,
  String // locationId
>((ref, locationId) async {
  final allShifts = await ref.watch(getShiftsListProvider.future);
  return allShifts.where((s) => s.locationId == locationId).toList();
});

/// 按日期筛选的 Shifts
final getShiftsByDateProvider = FutureProvider.family<
  List<ShiftResponseDto>,
  DateTime // date
>((ref, date) async {
  final allShifts = await ref.watch(getShiftsListProvider.future);
  return allShifts.where((s) => isSameDay(s.date, date)).toList();
});

/// 我的 Shifts
final myShiftsProvider = FutureProvider<List<ShiftResponseDto>>((ref) async {
  final currentUserId = ref.watch(currentUserIdProvider);
  if (currentUserId == null) return [];

  final service = ref.watch(shiftsServiceProvider);
  return service.getV1TeamMembersTeamMemberIdShifts(currentUserId);
});

/// Shifts 统计数据
final shiftsStatisticsProvider = FutureProvider<Map<String, int>>((ref) async {
  final shifts = await ref.watch(getShiftsListProvider.future);

  return {
    'total': shifts.length,
    'open': shifts.where((s) => s.status == 'open').length,
    'filled': shifts.where((s) => s.status == 'filled').length,
    'completed': shifts.where((s) => s.status == 'completed').length,
    'cancelled': shifts.where((s) => s.status == 'cancelled').length,
  };
});

// ============================================================
// 实用工具函数
// ============================================================

bool isSameDay(DateTime a, DateTime b) {
  return a.year == b.year && a.month == b.month && a.day == b.day;
}