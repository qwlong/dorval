// ============================================================
// 简单方案：每个 API 一个 Provider
// 自动生成，开箱即用
// ============================================================

import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:dio/dio.dart';
import '../services/shifts_service.dart';
import '../models/index.dart';

// ============================================================
// 方案1：最简单 - 每个 API 方法一个 FutureProvider
// ============================================================

// GET /shifts - 获取班次列表
final getShiftsProvider = FutureProvider.autoDispose<List<ShiftResponseDto>>((ref) async {
  final service = ref.watch(shiftsServiceProvider);
  return service.getV1Shifts();
});

// GET /shifts 带参数版本 - 使用 family
final getShiftsWithParamsProvider = FutureProvider.family.autoDispose<
  List<ShiftResponseDto>,
  GetShiftsParams
>((ref, params) async {
  final service = ref.watch(shiftsServiceProvider);
  return service.getV1Shifts(
    date: params.date,
    locationId: params.locationId,
    status: params.status,
    page: params.page,
    limit: params.limit,
  );
});

// GET /shifts/{id} - 获取单个班次
final getShiftByIdProvider = FutureProvider.family.autoDispose<
  ShiftResponseDto,
  String  // shiftId
>((ref, shiftId) async {
  final service = ref.watch(shiftsServiceProvider);
  return service.getV1ShiftsShiftId(shiftId);
});

// POST /shifts - 创建班次（需要特殊处理）
class CreateShiftNotifier extends AutoDisposeAsyncNotifier<ShiftResponseDto?> {
  @override
  FutureOr<ShiftResponseDto?> build() => null;

  Future<ShiftResponseDto> create(CreateShiftRequestDto dto) async {
    state = const AsyncValue.loading();

    try {
      final service = ref.read(shiftsServiceProvider);
      final result = await service.postV1Shifts(dto);

      // 创建成功后，刷新列表
      ref.invalidate(getShiftsProvider);

      state = AsyncValue.data(result);
      return result;
    } catch (e, stack) {
      state = AsyncValue.error(e, stack);
      rethrow;
    }
  }
}

final createShiftProvider = AsyncNotifierProvider.autoDispose<
  CreateShiftNotifier,
  ShiftResponseDto?
>(CreateShiftNotifier.new);

// PATCH /shifts/{id} - 更新班次
class UpdateShiftNotifier extends AutoDisposeAsyncNotifier<ShiftResponseDto?> {
  @override
  FutureOr<ShiftResponseDto?> build() => null;

  Future<ShiftResponseDto> update(String shiftId, UpdateShiftRequestDto dto) async {
    state = const AsyncValue.loading();

    try {
      final service = ref.read(shiftsServiceProvider);
      final result = await service.patchV1ShiftsShiftId(shiftId, dto);

      // 更新成功后，刷新相关数据
      ref.invalidate(getShiftByIdProvider(shiftId));
      ref.invalidate(getShiftsProvider);

      state = AsyncValue.data(result);
      return result;
    } catch (e, stack) {
      state = AsyncValue.error(e, stack);
      rethrow;
    }
  }
}

final updateShiftProvider = AsyncNotifierProvider.autoDispose<
  UpdateShiftNotifier,
  ShiftResponseDto?
>(UpdateShiftNotifier.new);

// DELETE /shifts/{id} - 删除班次
class DeleteShiftNotifier extends AutoDisposeAsyncNotifier<void> {
  @override
  FutureOr<void> build() => null;

  Future<void> delete(String shiftId) async {
    state = const AsyncValue.loading();

    try {
      final service = ref.read(shiftsServiceProvider);
      await service.deleteV1ShiftsShiftId(shiftId);

      // 删除成功后，刷新列表
      ref.invalidate(getShiftsProvider);
      ref.invalidate(getShiftByIdProvider(shiftId));

      state = const AsyncValue.data(null);
    } catch (e, stack) {
      state = AsyncValue.error(e, stack);
      rethrow;
    }
  }
}

final deleteShiftProvider = AsyncNotifierProvider.autoDispose<
  DeleteShiftNotifier,
  void
>(DeleteShiftNotifier.new);

// ============================================================
// 方案2：更简洁 - 使用通用 API Provider
// ============================================================

/// 通用 API 执行器 - 处理 loading/error 状态
class ApiExecutor<T> {
  final Ref ref;
  final Future<T> Function() execute;
  final List<Provider>? invalidateOnSuccess;

  ApiExecutor({
    required this.ref,
    required this.execute,
    this.invalidateOnSuccess,
  });

  Future<T> call() async {
    try {
      final result = await execute();

      // 成功后刷新指定的 providers
      invalidateOnSuccess?.forEach((provider) {
        ref.invalidate(provider);
      });

      return result;
    } catch (e) {
      // 统一错误处理
      throw ApiException(e);
    }
  }
}

/// 为每个 API 生成简单的 Provider
class ShiftsProviders {
  // GET 请求 - 直接用 FutureProvider
  static final getAll = FutureProvider.autoDispose<List<ShiftResponseDto>>((ref) async {
    return ref.watch(shiftsServiceProvider).getV1Shifts();
  });

  static final getById = FutureProvider.family.autoDispose<ShiftResponseDto, String>(
    (ref, id) async {
      return ref.watch(shiftsServiceProvider).getV1ShiftsShiftId(id);
    },
  );

  static final getByLocation = FutureProvider.family.autoDispose<
    List<ShiftResponseDto>,
    String  // locationId
  >((ref, locationId) async {
    return ref.watch(shiftsServiceProvider).getV1LocationsLocationIdShifts(locationId);
  });

  // POST/PUT/PATCH/DELETE - 用函数包装
  static Future<ShiftResponseDto> create(
    WidgetRef ref,
    CreateShiftRequestDto dto,
  ) async {
    final result = await ref.read(shiftsServiceProvider).postV1Shifts(dto);

    // 刷新列表
    ref.invalidate(getAll);

    return result;
  }

  static Future<ShiftResponseDto> update(
    WidgetRef ref,
    String id,
    UpdateShiftRequestDto dto,
  ) async {
    final result = await ref.read(shiftsServiceProvider).patchV1ShiftsShiftId(id, dto);

    // 刷新相关数据
    ref.invalidate(getById(id));
    ref.invalidate(getAll);

    return result;
  }

  static Future<void> delete(
    WidgetRef ref,
    String id,
  ) async {
    await ref.read(shiftsServiceProvider).deleteV1ShiftsShiftId(id);

    // 刷新列表
    ref.invalidate(getAll);
    ref.invalidate(getById(id));
  }
}

// ============================================================
// 方案3：最小化 - 只包装查询，变更直接调用
// ============================================================

/// 只为 GET 请求生成 Provider，其他直接用 Service
extension ShiftsProvidersMinimal on ShiftsService {
  /// GET 请求自动缓存
  static final shifts = FutureProvider.autoDispose<List<ShiftResponseDto>>((ref) {
    return ref.watch(shiftsServiceProvider).getV1Shifts();
  });

  static final shift = FutureProvider.family.autoDispose<ShiftResponseDto, String>((ref, id) {
    return ref.watch(shiftsServiceProvider).getV1ShiftsShiftId(id);
  });

  /// POST/PUT/DELETE 直接调用，手动刷新
  static Future<void> createAndRefresh(
    WidgetRef ref,
    CreateShiftRequestDto dto,
  ) async {
    await ref.read(shiftsServiceProvider).postV1Shifts(dto);
    ref.invalidate(shifts);
  }
}

// ============================================================
// 使用示例
// ============================================================

class ShiftListScreen extends ConsumerWidget {
  @override
  Widget build(BuildContext context, WidgetRef ref) {
    // 方案1：直接使用 Provider
    final shiftsAsync = ref.watch(getShiftsProvider);

    // 或者带参数
    final filteredShifts = ref.watch(
      getShiftsWithParamsProvider(
        GetShiftsParams(
          date: DateTime.now(),
          locationId: 'loc-123',
        ),
      ),
    );

    // 方案2：使用类方法
    final shifts2 = ref.watch(ShiftsProviders.getAll);

    // 方案3：最简单
    final shifts3 = ref.watch(ShiftsProvidersMinimal.shifts);

    return Scaffold(
      appBar: AppBar(title: Text('Shifts')),
      body: shiftsAsync.when(
        data: (shifts) => ListView.builder(
          itemCount: shifts.length,
          itemBuilder: (context, index) {
            final shift = shifts[index];
            return ListTile(
              title: Text(shift.title),
              subtitle: Text(shift.date.toString()),
              trailing: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  // 编辑
                  IconButton(
                    icon: Icon(Icons.edit),
                    onPressed: () => _editShift(ref, shift.id),
                  ),
                  // 删除
                  IconButton(
                    icon: Icon(Icons.delete),
                    onPressed: () => _deleteShift(ref, shift.id),
                  ),
                ],
              ),
            );
          },
        ),
        loading: () => Center(child: CircularProgressIndicator()),
        error: (e, s) => Center(child: Text('Error: $e')),
      ),
      floatingActionButton: FloatingActionButton(
        onPressed: () => _createShift(ref),
        child: Icon(Icons.add),
      ),
    );
  }

  Future<void> _createShift(WidgetRef ref) async {
    // 方案1：使用 Notifier
    await ref.read(createShiftProvider.notifier).create(
      CreateShiftRequestDto(title: 'New Shift'),
    );

    // 方案2：使用类方法
    await ShiftsProviders.create(
      ref,
      CreateShiftRequestDto(title: 'New Shift'),
    );

    // 方案3：直接调用 Service + 手动刷新
    await ref.read(shiftsServiceProvider).postV1Shifts(
      CreateShiftRequestDto(title: 'New Shift'),
    );
    ref.invalidate(getShiftsProvider);
  }

  Future<void> _editShift(WidgetRef ref, String id) async {
    // 简单直接
    await ref.read(shiftsServiceProvider).patchV1ShiftsShiftId(
      id,
      UpdateShiftRequestDto(title: 'Updated'),
    );

    // 刷新
    ref.invalidate(getShiftsProvider);
    ref.invalidate(getShiftByIdProvider(id));
  }

  Future<void> _deleteShift(WidgetRef ref, String id) async {
    // 直接调用
    await ref.read(shiftsServiceProvider).deleteV1ShiftsShiftId(id);

    // 刷新列表
    ref.invalidate(getShiftsProvider);
  }
}

// ============================================================
// 参数类型（自动生成）
// ============================================================

class GetShiftsParams {
  final DateTime? date;
  final String? locationId;
  final String? status;
  final int? page;
  final int? limit;

  GetShiftsParams({
    this.date,
    this.locationId,
    this.status,
    this.page,
    this.limit,
  });

  @override
  bool operator ==(Object other) =>
    identical(this, other) ||
    other is GetShiftsParams &&
      date == other.date &&
      locationId == other.locationId &&
      status == other.status &&
      page == other.page &&
      limit == other.limit;

  @override
  int get hashCode => Object.hash(date, locationId, status, page, limit);
}