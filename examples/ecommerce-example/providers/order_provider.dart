// ============================================================
// 电商订单系统 - Riverpod Provider 生成示例
// 展示真实业务场景下的复杂数据管理
// ============================================================

import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../models/index.dart';
import '../services/index.dart';

// ============================================================
// 场景1：购物车实时同步
// 问题：购物车需要在多个页面保持同步（商品列表、购物车页、结算页）
// ============================================================

/// 购物车状态管理 - 全局单例，实时同步
class CartNotifier extends Notifier<Cart> {
  @override
  Cart build() {
    // 初始化时从本地存储恢复购物车
    _loadFromLocal();
    return Cart(items: [], totalAmount: 0);
  }

  /// 添加商品到购物车
  Future<void> addItem(Product product, int quantity) async {
    state = state.copyWith(isLoading: true);

    try {
      // 调用 API
      final updatedCart = await ref.read(cartServiceProvider)
        .addToCart(product.id, quantity);

      // 更新状态
      state = updatedCart;

      // ✨ 自动同步到所有使用购物车的页面
      // 不需要手动通知，所有页面自动更新！

      // 同时更新商品的购买状态（显示"已加入购物车"）
      ref.invalidate(productInCartStatusProvider(product.id));

      // 更新购物车角标数字
      ref.invalidate(cartBadgeProvider);

    } catch (e) {
      state = state.copyWith(
        isLoading: false,
        error: e.toString(),
      );
    }
  }

  /// 更新商品数量
  Future<void> updateQuantity(String itemId, int quantity) async {
    if (quantity <= 0) {
      return removeItem(itemId);
    }

    // 乐观更新 - 立即更新 UI
    final oldState = state;
    state = state.copyWith(
      items: state.items.map((item) {
        if (item.id == itemId) {
          return item.copyWith(quantity: quantity);
        }
        return item;
      }).toList(),
    );

    try {
      // 后台同步到服务器
      await ref.read(cartServiceProvider)
        .updateCartItem(itemId, quantity);

      // 重新计算总价
      _recalculateTotal();

    } catch (e) {
      // 失败时回滚
      state = oldState;
      _showError('Failed to update quantity');
    }
  }

  /// 移除商品
  Future<void> removeItem(String itemId) async {
    // 保存要删除的商品，用于撤销
    final removedItem = state.items.firstWhere((i) => i.id == itemId);

    // 乐观删除
    state = state.copyWith(
      items: state.items.where((i) => i.id != itemId).toList(),
    );

    try {
      await ref.read(cartServiceProvider).removeFromCart(itemId);

      // 显示撤销提示
      _showUndoSnackbar(removedItem);

      // 刷新相关数据
      ref.invalidate(productInCartStatusProvider(removedItem.productId));
      ref.invalidate(cartBadgeProvider);

    } catch (e) {
      // 失败时恢复
      state = state.copyWith(
        items: [...state.items, removedItem],
      );
    }
  }

  /// 应用优惠券
  Future<void> applyCoupon(String couponCode) async {
    state = state.copyWith(isApplyingCoupon: true);

    try {
      // 验证优惠券
      final discount = await ref.read(couponServiceProvider)
        .validateCoupon(couponCode, state.totalAmount);

      state = state.copyWith(
        couponCode: couponCode,
        discount: discount,
        finalAmount: state.totalAmount - discount,
        isApplyingCoupon: false,
      );

    } catch (e) {
      state = state.copyWith(
        isApplyingCoupon: false,
        couponError: 'Invalid coupon code',
      );
    }
  }

  void _recalculateTotal() {
    final total = state.items.fold<double>(
      0,
      (sum, item) => sum + (item.price * item.quantity),
    );

    state = state.copyWith(
      totalAmount: total,
      finalAmount: total - (state.discount ?? 0),
    );
  }

  void _loadFromLocal() async {
    final localCart = await ref.read(localStorageProvider).getCart();
    if (localCart != null) {
      state = localCart;
    }
  }

  void _showUndoSnackbar(CartItem item) {
    // 显示撤销提示
  }

  void _showError(String message) {
    // 显示错误
  }
}

final cartProvider = NotifierProvider<CartNotifier, Cart>(
  CartNotifier.new,
);

/// 购物车角标数字
final cartBadgeProvider = Provider<int>((ref) {
  final cart = ref.watch(cartProvider);
  return cart.items.fold(0, (sum, item) => sum + item.quantity);
});

/// 商品是否在购物车中
final productInCartStatusProvider = Provider.family<bool, String>((ref, productId) {
  final cart = ref.watch(cartProvider);
  return cart.items.any((item) => item.productId == productId);
});

// ============================================================
// 场景2：订单创建流程（多步骤、多API协调）
// 问题：创建订单需要调用多个API，处理复杂的错误回滚
// ============================================================

/// 订单创建流程管理
class CreateOrderNotifier extends AsyncNotifier<OrderCreationResult?> {
  @override
  FutureOr<OrderCreationResult?> build() => null;

  /// 创建订单 - 处理复杂的多步骤流程
  Future<Order> createOrder(CheckoutData checkoutData) async {
    state = const AsyncValue.loading();

    try {
      // Step 1: 验证库存
      _updateProgress('Checking inventory...', 0.2);
      final stockCheck = await _checkInventory(checkoutData.items);
      if (!stockCheck.isAvailable) {
        throw OrderException('Some items are out of stock', stockCheck.unavailableItems);
      }

      // Step 2: 锁定库存
      _updateProgress('Reserving items...', 0.4);
      final reservationId = await _reserveInventory(checkoutData.items);

      try {
        // Step 3: 计算运费和税费
        _updateProgress('Calculating shipping...', 0.5);
        final shippingCost = await _calculateShipping(
          checkoutData.shippingAddress,
          checkoutData.shippingMethod,
        );

        final tax = await _calculateTax(
          checkoutData.items,
          checkoutData.shippingAddress,
        );

        // Step 4: 处理支付
        _updateProgress('Processing payment...', 0.7);
        final paymentResult = await _processPayment(
          checkoutData.paymentMethod,
          checkoutData.totalAmount + shippingCost + tax,
        );

        if (!paymentResult.success) {
          throw PaymentException(paymentResult.errorMessage);
        }

        // Step 5: 创建订单
        _updateProgress('Creating order...', 0.9);
        final order = await ref.read(orderServiceProvider).createOrder(
          CreateOrderRequest(
            items: checkoutData.items,
            shippingAddress: checkoutData.shippingAddress,
            billingAddress: checkoutData.billingAddress,
            paymentId: paymentResult.transactionId,
            shippingCost: shippingCost,
            tax: tax,
            couponCode: checkoutData.couponCode,
            reservationId: reservationId,
          ),
        );

        // Step 6: 清空购物车
        _updateProgress('Finalizing...', 0.95);
        await ref.read(cartProvider.notifier).clear();

        // ✨ 智能刷新所有相关数据
        _refreshAfterOrderCreation(order);

        state = AsyncValue.data(OrderCreationResult(
          order: order,
          paymentId: paymentResult.transactionId,
        ));

        return order;

      } catch (e) {
        // 回滚库存锁定
        await _releaseInventory(reservationId);
        rethrow;
      }

    } catch (e, stack) {
      state = AsyncValue.error(e, stack);
      rethrow;
    }
  }

  Future<StockCheckResult> _checkInventory(List<CartItem> items) async {
    final service = ref.read(inventoryServiceProvider);
    return service.checkAvailability(
      items.map((i) => StockCheckRequest(i.productId, i.quantity)).toList(),
    );
  }

  Future<String> _reserveInventory(List<CartItem> items) async {
    final service = ref.read(inventoryServiceProvider);
    return service.reserveItems(items, Duration(minutes: 15));
  }

  Future<void> _releaseInventory(String reservationId) async {
    try {
      await ref.read(inventoryServiceProvider).releaseReservation(reservationId);
    } catch (e) {
      // Log error but don't throw - this is cleanup
    }
  }

  Future<double> _calculateShipping(Address address, ShippingMethod method) async {
    final rates = await ref.read(shippingServiceProvider)
      .calculateRates(address, method);
    return rates.cost;
  }

  Future<double> _calculateTax(List<CartItem> items, Address address) async {
    return ref.read(taxServiceProvider)
      .calculateTax(items, address);
  }

  Future<PaymentResult> _processPayment(PaymentMethod method, double amount) async {
    return ref.read(paymentServiceProvider)
      .processPayment(method, amount);
  }

  void _updateProgress(String message, double progress) {
    // 更新进度条
    ref.read(orderCreationProgressProvider.notifier).state = OrderProgress(
      message: message,
      progress: progress,
    );
  }

  void _refreshAfterOrderCreation(Order order) {
    // 刷新订单列表
    ref.invalidate(myOrdersProvider);

    // 刷新用户积分（订单可能产生积分）
    ref.invalidate(userPointsProvider);

    // 刷新推荐商品（基于购买历史）
    ref.invalidate(recommendedProductsProvider);

    // 刷新库存显示
    for (final item in order.items) {
      ref.invalidate(productStockProvider(item.productId));
    }

    // 触发订单追踪
    ref.read(orderTrackingProvider(order.id));
  }
}

final createOrderProvider = AsyncNotifierProvider<CreateOrderNotifier, OrderCreationResult?>(
  CreateOrderNotifier.new,
);

/// 订单创建进度
final orderCreationProgressProvider = StateProvider<OrderProgress?>((ref) => null);

// ============================================================
// 场景3：实时订单追踪
// 问题：订单状态需要实时更新，支持 WebSocket/轮询
// ============================================================

/// 订单实时追踪 - 使用 Stream 支持实时更新
final orderTrackingProvider = StreamProvider.family<OrderStatus, String>((ref, orderId) async* {
  // 初始状态
  final initialStatus = await ref.read(orderServiceProvider).getOrderStatus(orderId);
  yield initialStatus;

  // WebSocket 实时更新
  final wsService = ref.read(webSocketServiceProvider);
  await for (final update in wsService.subscribeToOrder(orderId)) {
    yield update;

    // 如果订单完成，更新其他相关数据
    if (update.status == 'delivered') {
      ref.invalidate(userPointsProvider);
      ref.invalidate(purchaseHistoryProvider);
    }
  }
});

/// 批量订单追踪 - 追踪多个订单
final multipleOrdersTrackingProvider = FutureProvider.family<Map<String, OrderStatus>, List<String>>(
  (ref, orderIds) async {
    // 并行获取所有订单状态
    final futures = orderIds.map((id) =>
      ref.watch(orderTrackingProvider(id).future)
    );

    final statuses = await Future.wait(futures);

    return Map.fromIterables(orderIds, statuses);
  },
);

// ============================================================
// 场景4：智能商品推荐（基于多维度数据）
// ============================================================

/// 个性化推荐 - 结合多个数据源
final recommendedProductsProvider = FutureProvider<List<Product>>((ref) async {
  // 获取多维度数据
  final (userProfile, purchaseHistory, browsingHistory, cartItems) = await (
    ref.watch(userProfileProvider.future),
    ref.watch(purchaseHistoryProvider.future),
    ref.watch(browsingHistoryProvider.future),
    ref.watch(cartProvider.future),
  ).wait;

  // 获取推荐
  final recommendations = await ref.read(recommendationServiceProvider).getRecommendations(
    RecommendationRequest(
      userId: userProfile.id,
      recentPurchases: purchaseHistory.take(10).toList(),
      recentViews: browsingHistory.take(20).toList(),
      cartItems: cartItems.items,
      preferences: userProfile.preferences,
    ),
  );

  return recommendations;
});

// ============================================================
// 场景5：库存实时监控和预警
// ============================================================

/// 商品库存监控
final productStockProvider = StreamProvider.family<StockInfo, String>((ref, productId) async* {
  // 初始库存
  final initial = await ref.read(inventoryServiceProvider).getStock(productId);
  yield initial;

  // 实时监控库存变化
  final stream = ref.read(inventoryServiceProvider).watchStock(productId);
  await for (final stock in stream) {
    yield stock;

    // 库存预警
    if (stock.quantity < stock.lowStockThreshold) {
      ref.read(stockAlertsProvider.notifier).addAlert(
        StockAlert(
          productId: productId,
          currentStock: stock.quantity,
          threshold: stock.lowStockThreshold,
          severity: stock.quantity == 0 ? 'critical' : 'warning',
        ),
      );
    }
  }
});

/// 库存预警列表
class StockAlertsNotifier extends Notifier<List<StockAlert>> {
  @override
  List<StockAlert> build() => [];

  void addAlert(StockAlert alert) {
    state = [...state.where((a) => a.productId != alert.productId), alert];
  }

  void dismissAlert(String productId) {
    state = state.where((a) => a.productId != productId).toList();
  }
}

final stockAlertsProvider = NotifierProvider<StockAlertsNotifier, List<StockAlert>>(
  StockAlertsNotifier.new,
);

// ============================================================
// 场景6：订单分析仪表板
// ============================================================

/// 订单统计仪表板 - 组合多个数据源
final orderDashboardProvider = FutureProvider<OrderDashboard>((ref) async {
  // 并行加载所有需要的数据
  final (
    todayOrders,
    weekOrders,
    monthOrders,
    pendingOrders,
    revenue,
    topProducts,
    customerStats,
  ) = await (
    ref.watch(ordersbyDateRangeProvider(DateRange.today()).future),
    ref.watch(ordersbyDateRangeProvider(DateRange.thisWeek()).future),
    ref.watch(ordersbyDateRangeProvider(DateRange.thisMonth()).future),
    ref.watch(pendingOrdersProvider.future),
    ref.watch(revenueProvider.future),
    ref.watch(topSellingProductsProvider.future),
    ref.watch(customerStatsProvider.future),
  ).wait;

  return OrderDashboard(
    todayCount: todayOrders.length,
    todayRevenue: _calculateRevenue(todayOrders),
    weekCount: weekOrders.length,
    weekRevenue: _calculateRevenue(weekOrders),
    monthCount: monthOrders.length,
    monthRevenue: _calculateRevenue(monthOrders),
    pendingCount: pendingOrders.length,
    topProducts: topProducts,
    conversionRate: customerStats.conversionRate,
    averageOrderValue: revenue.total / monthOrders.length,
    growthRate: _calculateGrowthRate(weekOrders, lastWeekOrders),
  );
});

double _calculateRevenue(List<Order> orders) {
  return orders.fold(0.0, (sum, order) => sum + order.total);
}

double _calculateGrowthRate(List<Order> current, List<Order> previous) {
  if (previous.isEmpty) return 0;
  final currentRevenue = _calculateRevenue(current);
  final previousRevenue = _calculateRevenue(previous);
  return ((currentRevenue - previousRevenue) / previousRevenue) * 100;
}