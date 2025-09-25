// ============================================================
// 实际使用示例 - 看看代码有多简洁
// ============================================================

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../providers/order_provider.dart';

// ============================================================
// 1. 购物车图标 - 实时显示数量
// ============================================================

class CartIconButton extends ConsumerWidget {
  @override
  Widget build(BuildContext context, WidgetRef ref) {
    // ✨ 一行代码，自动同步购物车数量
    final itemCount = ref.watch(cartBadgeProvider);

    return Stack(
      children: [
        IconButton(
          icon: Icon(Icons.shopping_cart),
          onPressed: () => Navigator.pushNamed(context, '/cart'),
        ),
        if (itemCount > 0)
          Positioned(
            right: 0,
            top: 0,
            child: Container(
              padding: EdgeInsets.all(2),
              decoration: BoxDecoration(
                color: Colors.red,
                borderRadius: BorderRadius.circular(10),
              ),
              constraints: BoxConstraints(minWidth: 16, minHeight: 16),
              child: Text(
                itemCount.toString(),
                style: TextStyle(color: Colors.white, fontSize: 10),
                textAlign: TextAlign.center,
              ),
            ),
          ),
      ],
    );
  }
}

// ============================================================
// 2. 商品卡片 - 显示库存和购物车状态
// ============================================================

class ProductCard extends ConsumerWidget {
  final String productId;

  const ProductCard({required this.productId});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    // ✨ 实时库存监控
    final stockAsync = ref.watch(productStockProvider(productId));

    // ✨ 是否在购物车中
    final inCart = ref.watch(productInCartStatusProvider(productId));

    return Card(
      child: Column(
        children: [
          // 商品图片
          Image.network('product.jpg'),

          // 库存状态
          stockAsync.when(
            data: (stock) {
              if (stock.quantity == 0) {
                return Chip(
                  label: Text('Out of Stock'),
                  backgroundColor: Colors.red[100],
                );
              } else if (stock.quantity < 5) {
                return Chip(
                  label: Text('Only ${stock.quantity} left!'),
                  backgroundColor: Colors.orange[100],
                );
              }
              return SizedBox.shrink();
            },
            loading: () => LinearProgressIndicator(),
            error: (e, s) => SizedBox.shrink(),
          ),

          // 加入购物车按钮
          ElevatedButton.icon(
            icon: Icon(inCart ? Icons.check : Icons.add_shopping_cart),
            label: Text(inCart ? 'In Cart' : 'Add to Cart'),
            style: ElevatedButton.styleFrom(
              backgroundColor: inCart ? Colors.green : null,
            ),
            onPressed: inCart ? null : () => _addToCart(ref),
          ),
        ],
      ),
    );
  }

  void _addToCart(WidgetRef ref) {
    // ✨ 添加到购物车，所有相关UI自动更新
    ref.read(cartProvider.notifier).addItem(product, 1);
  }
}

// ============================================================
// 3. 购物车页面 - 实时同步，支持撤销
// ============================================================

class CartScreen extends ConsumerWidget {
  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final cart = ref.watch(cartProvider);

    return Scaffold(
      appBar: AppBar(
        title: Text('Cart (${cart.items.length} items)'),
        actions: [
          TextButton(
            onPressed: cart.items.isEmpty ? null : () => _checkout(context),
            child: Text('Checkout'),
          ),
        ],
      ),
      body: Column(
        children: [
          // 优惠券输入
          if (cart.items.isNotEmpty)
            Padding(
              padding: EdgeInsets.all(16),
              child: Row(
                children: [
                  Expanded(
                    child: TextField(
                      decoration: InputDecoration(
                        labelText: 'Coupon Code',
                        errorText: cart.couponError,
                      ),
                      onSubmitted: (code) =>
                        ref.read(cartProvider.notifier).applyCoupon(code),
                    ),
                  ),
                  if (cart.isApplyingCoupon)
                    CircularProgressIndicator()
                  else if (cart.couponCode != null)
                    Chip(
                      label: Text('-\$${cart.discount}'),
                      backgroundColor: Colors.green[100],
                    ),
                ],
              ),
            ),

          // 购物车列表
          Expanded(
            child: ListView.builder(
              itemCount: cart.items.length,
              itemBuilder: (context, index) {
                final item = cart.items[index];
                return Dismissible(
                  key: Key(item.id),
                  direction: DismissDirection.endToStart,
                  background: Container(
                    color: Colors.red,
                    alignment: Alignment.centerRight,
                    padding: EdgeInsets.only(right: 16),
                    child: Icon(Icons.delete, color: Colors.white),
                  ),
                  // ✨ 滑动删除，支持撤销
                  onDismissed: (_) {
                    ref.read(cartProvider.notifier).removeItem(item.id);

                    // 显示撤销提示
                    ScaffoldMessenger.of(context).showSnackBar(
                      SnackBar(
                        content: Text('${item.name} removed'),
                        action: SnackBarAction(
                          label: 'UNDO',
                          onPressed: () {
                            // 撤销删除
                            ref.read(cartProvider.notifier).addItem(
                              item.product,
                              item.quantity,
                            );
                          },
                        ),
                      ),
                    );
                  },
                  child: ListTile(
                    leading: Image.network(item.imageUrl),
                    title: Text(item.name),
                    subtitle: Text('\$${item.price} x ${item.quantity}'),
                    trailing: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        IconButton(
                          icon: Icon(Icons.remove),
                          onPressed: () => ref.read(cartProvider.notifier)
                            .updateQuantity(item.id, item.quantity - 1),
                        ),
                        Text(item.quantity.toString()),
                        IconButton(
                          icon: Icon(Icons.add),
                          onPressed: () => ref.read(cartProvider.notifier)
                            .updateQuantity(item.id, item.quantity + 1),
                        ),
                      ],
                    ),
                  ),
                );
              },
            ),
          ),

          // 总计
          Container(
            padding: EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: Colors.grey[100],
              boxShadow: [
                BoxShadow(
                  color: Colors.black12,
                  offset: Offset(0, -2),
                  blurRadius: 4,
                ),
              ],
            ),
            child: Column(
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text('Subtotal:'),
                    Text('\$${cart.totalAmount.toStringAsFixed(2)}'),
                  ],
                ),
                if (cart.discount != null)
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text('Discount:'),
                      Text('-\$${cart.discount!.toStringAsFixed(2)}',
                        style: TextStyle(color: Colors.green)),
                    ],
                  ),
                Divider(),
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text('Total:', style: TextStyle(
                      fontSize: 18,
                      fontWeight: FontWeight.bold,
                    )),
                    Text('\$${cart.finalAmount.toStringAsFixed(2)}',
                      style: TextStyle(
                        fontSize: 18,
                        fontWeight: FontWeight.bold,
                      )),
                  ],
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  void _checkout(BuildContext context) {
    Navigator.pushNamed(context, '/checkout');
  }
}

// ============================================================
// 4. 结算页面 - 多步骤流程，实时进度
// ============================================================

class CheckoutScreen extends ConsumerStatefulWidget {
  @override
  ConsumerState<CheckoutScreen> createState() => _CheckoutScreenState();
}

class _CheckoutScreenState extends ConsumerState<CheckoutScreen> {
  final _formKey = GlobalKey<FormState>();
  late CheckoutData checkoutData;

  @override
  Widget build(BuildContext context) {
    final cart = ref.watch(cartProvider);
    final orderCreation = ref.watch(createOrderProvider);
    final progress = ref.watch(orderCreationProgressProvider);

    return Scaffold(
      appBar: AppBar(title: Text('Checkout')),
      body: orderCreation.when(
        data: (result) {
          if (result != null) {
            // ✅ 订单创建成功
            return Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Icon(Icons.check_circle, color: Colors.green, size: 64),
                  Text('Order Created!', style: TextStyle(fontSize: 24)),
                  Text('Order #${result.order.id}'),
                  ElevatedButton(
                    onPressed: () => Navigator.pushReplacementNamed(
                      context,
                      '/order-tracking',
                      arguments: result.order.id,
                    ),
                    child: Text('Track Order'),
                  ),
                ],
              ),
            );
          }

          // 显示结算表单
          return Form(
            key: _formKey,
            child: ListView(
              padding: EdgeInsets.all(16),
              children: [
                // 配送地址
                Card(
                  child: Padding(
                    padding: EdgeInsets.all(16),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text('Shipping Address',
                          style: Theme.of(context).textTheme.titleLarge),
                        // ... 地址表单字段
                      ],
                    ),
                  ),
                ),

                // 支付方式
                Card(
                  child: Padding(
                    padding: EdgeInsets.all(16),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text('Payment Method',
                          style: Theme.of(context).textTheme.titleLarge),
                        // ... 支付方式选择
                      ],
                    ),
                  ),
                ),

                // 订单摘要
                Card(
                  child: Padding(
                    padding: EdgeInsets.all(16),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text('Order Summary',
                          style: Theme.of(context).textTheme.titleLarge),
                        ...cart.items.map((item) => ListTile(
                          title: Text(item.name),
                          trailing: Text('\$${item.price * item.quantity}'),
                        )),
                        Divider(),
                        ListTile(
                          title: Text('Total', style: TextStyle(
                            fontWeight: FontWeight.bold)),
                          trailing: Text('\$${cart.finalAmount}',
                            style: TextStyle(fontWeight: FontWeight.bold)),
                        ),
                      ],
                    ),
                  ),
                ),

                // 下单按钮
                ElevatedButton(
                  onPressed: _placeOrder,
                  child: Padding(
                    padding: EdgeInsets.all(16),
                    child: Text('Place Order', style: TextStyle(fontSize: 18)),
                  ),
                ),
              ],
            ),
          );
        },
        loading: () {
          // ⏳ 显示创建订单进度
          return Center(
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                CircularProgressIndicator(value: progress?.progress),
                SizedBox(height: 16),
                Text(progress?.message ?? 'Processing...'),
              ],
            ),
          );
        },
        error: (error, stack) {
          // ❌ 错误处理
          return Center(
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Icon(Icons.error, color: Colors.red, size: 64),
                Text('Order Failed', style: TextStyle(fontSize: 24)),
                Text(error.toString()),
                ElevatedButton(
                  onPressed: () => ref.invalidate(createOrderProvider),
                  child: Text('Try Again'),
                ),
              ],
            ),
          );
        },
      ),
    );
  }

  Future<void> _placeOrder() async {
    if (!_formKey.currentState!.validate()) return;

    // ✨ 创建订单 - 处理所有复杂流程
    try {
      await ref.read(createOrderProvider.notifier).createOrder(checkoutData);
    } catch (e) {
      // 错误已经被 Provider 处理
    }
  }
}

// ============================================================
// 5. 订单追踪页面 - 实时更新
// ============================================================

class OrderTrackingScreen extends ConsumerWidget {
  final String orderId;

  const OrderTrackingScreen({required this.orderId});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    // ✨ 实时订单状态 - WebSocket 自动更新
    final trackingAsync = ref.watch(orderTrackingProvider(orderId));

    return Scaffold(
      appBar: AppBar(title: Text('Order #$orderId')),
      body: trackingAsync.when(
        data: (status) => Column(
          children: [
            // 进度指示器
            OrderProgressIndicator(
              currentStep: status.currentStep,
              steps: [
                'Order Placed',
                'Payment Confirmed',
                'Preparing',
                'Shipped',
                'Out for Delivery',
                'Delivered',
              ],
            ),

            // 当前状态详情
            Card(
              margin: EdgeInsets.all(16),
              child: ListTile(
                leading: Icon(_getStatusIcon(status.status)),
                title: Text(status.statusText),
                subtitle: Text(status.lastUpdated.toString()),
              ),
            ),

            // 预计送达时间
            if (status.estimatedDelivery != null)
              Card(
                margin: EdgeInsets.symmetric(horizontal: 16),
                child: ListTile(
                  leading: Icon(Icons.schedule),
                  title: Text('Estimated Delivery'),
                  subtitle: Text(status.estimatedDelivery.toString()),
                ),
              ),

            // 配送员信息
            if (status.deliveryPerson != null)
              Card(
                margin: EdgeInsets.all(16),
                child: ListTile(
                  leading: CircleAvatar(
                    backgroundImage: NetworkImage(status.deliveryPerson!.photo),
                  ),
                  title: Text(status.deliveryPerson!.name),
                  subtitle: Text('Your delivery partner'),
                  trailing: IconButton(
                    icon: Icon(Icons.phone),
                    onPressed: () => _callDeliveryPerson(status.deliveryPerson!),
                  ),
                ),
              ),

            // 实时位置（如果在配送中）
            if (status.status == 'out_for_delivery' && status.location != null)
              Expanded(
                child: GoogleMap(
                  initialCameraPosition: CameraPosition(
                    target: status.location!,
                    zoom: 14,
                  ),
                  markers: {
                    Marker(
                      markerId: MarkerId('delivery'),
                      position: status.location!,
                      infoWindow: InfoWindow(title: 'Delivery Location'),
                    ),
                  },
                ),
              ),
          ],
        ),
        loading: () => Center(child: CircularProgressIndicator()),
        error: (e, s) => ErrorWidget(e),
      ),
    );
  }

  IconData _getStatusIcon(String status) {
    switch (status) {
      case 'placed': return Icons.receipt;
      case 'confirmed': return Icons.check;
      case 'preparing': return Icons.restaurant;
      case 'shipped': return Icons.local_shipping;
      case 'out_for_delivery': return Icons.delivery_dining;
      case 'delivered': return Icons.done_all;
      default: return Icons.info;
    }
  }

  void _callDeliveryPerson(DeliveryPerson person) {
    // 拨打电话
  }
}

// ============================================================
// 6. 管理后台 - 实时监控仪表板
// ============================================================

class AdminDashboard extends ConsumerWidget {
  @override
  Widget build(BuildContext context, WidgetRef ref) {
    // ✨ 一行代码获取完整的仪表板数据
    final dashboardAsync = ref.watch(orderDashboardProvider);

    // ✨ 库存预警
    final stockAlerts = ref.watch(stockAlertsProvider);

    return Scaffold(
      appBar: AppBar(
        title: Text('Admin Dashboard'),
        actions: [
          // 库存预警图标
          if (stockAlerts.isNotEmpty)
            IconButton(
              icon: Badge(
                label: Text(stockAlerts.length.toString()),
                child: Icon(Icons.warning, color: Colors.orange),
              ),
              onPressed: () => _showStockAlerts(context, stockAlerts),
            ),
        ],
      ),
      body: dashboardAsync.when(
        data: (dashboard) => GridView.count(
          crossAxisCount: 2,
          padding: EdgeInsets.all(16),
          children: [
            // 今日订单
            _DashboardCard(
              title: 'Today Orders',
              value: dashboard.todayCount.toString(),
              subtitle: '\$${dashboard.todayRevenue.toStringAsFixed(2)}',
              icon: Icons.today,
              color: Colors.blue,
            ),

            // 本周订单
            _DashboardCard(
              title: 'This Week',
              value: dashboard.weekCount.toString(),
              subtitle: '\$${dashboard.weekRevenue.toStringAsFixed(2)}',
              icon: Icons.date_range,
              color: Colors.green,
            ),

            // 待处理订单
            _DashboardCard(
              title: 'Pending',
              value: dashboard.pendingCount.toString(),
              subtitle: 'Need attention',
              icon: Icons.pending,
              color: Colors.orange,
            ),

            // 增长率
            _DashboardCard(
              title: 'Growth',
              value: '${dashboard.growthRate.toStringAsFixed(1)}%',
              subtitle: 'vs last week',
              icon: dashboard.growthRate > 0 ? Icons.trending_up : Icons.trending_down,
              color: dashboard.growthRate > 0 ? Colors.green : Colors.red,
            ),

            // 转化率
            _DashboardCard(
              title: 'Conversion',
              value: '${dashboard.conversionRate.toStringAsFixed(1)}%',
              subtitle: 'Cart to order',
              icon: Icons.shopping_cart_checkout,
              color: Colors.purple,
            ),

            // 平均订单价值
            _DashboardCard(
              title: 'Avg Order',
              value: '\$${dashboard.averageOrderValue.toStringAsFixed(2)}',
              subtitle: 'This month',
              icon: Icons.attach_money,
              color: Colors.teal,
            ),
          ],
        ),
        loading: () => Center(child: CircularProgressIndicator()),
        error: (e, s) => ErrorWidget(e),
      ),
    );
  }

  void _showStockAlerts(BuildContext context, List<StockAlert> alerts) {
    showModalBottomSheet(
      context: context,
      builder: (context) => ListView.builder(
        itemCount: alerts.length,
        itemBuilder: (context, index) {
          final alert = alerts[index];
          return ListTile(
            leading: Icon(
              alert.severity == 'critical' ? Icons.error : Icons.warning,
              color: alert.severity == 'critical' ? Colors.red : Colors.orange,
            ),
            title: Text('Product #${alert.productId}'),
            subtitle: Text('Stock: ${alert.currentStock} (threshold: ${alert.threshold})'),
            trailing: TextButton(
              onPressed: () => ref.read(stockAlertsProvider.notifier)
                .dismissAlert(alert.productId),
              child: Text('Dismiss'),
            ),
          );
        },
      ),
    );
  }
}

class _DashboardCard extends StatelessWidget {
  final String title;
  final String value;
  final String subtitle;
  final IconData icon;
  final Color color;

  const _DashboardCard({
    required this.title,
    required this.value,
    required this.subtitle,
    required this.icon,
    required this.color,
  });

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Padding(
        padding: EdgeInsets.all(16),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(icon, color: color, size: 32),
            SizedBox(height: 8),
            Text(value, style: TextStyle(
              fontSize: 24,
              fontWeight: FontWeight.bold,
            )),
            Text(title, style: TextStyle(color: Colors.grey)),
            Text(subtitle, style: TextStyle(
              fontSize: 12,
              color: Colors.grey[600],
            )),
          ],
        ),
      ),
    );
  }
}