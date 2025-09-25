# 为什么 Flutter 用 Riverpod 多，useQuery 少？

## 核心原因

### 1. 🎯 Flutter 不是 React

**React 的哲学：函数式 + Hooks**
```jsx
// React 天然适合 hooks
function Component() {
  const query = useQuery('key', fetcher);  // 自然
  const [state, setState] = useState();    // 自然
  return <div>{query.data}</div>;
}
```

**Flutter 的哲学：面向对象 + Widget**
```dart
// Flutter 是 OOP，hooks 显得别扭
class MyWidget extends HookWidget {  // 需要特殊 Widget
  @override
  Widget build(BuildContext context) {
    final query = useQuery('key', fetcher);  // 不自然
    return Text(query.data);
  }
}
```

### 2. 📚 生态系统差异

**React 生态：**
- ✅ Hooks 是官方标准
- ✅ 所有库都支持 hooks
- ✅ useQuery 符合 React 习惯

**Flutter 生态：**
- ❌ Hooks 是第三方 (flutter_hooks)
- ❌ 大部分库不用 hooks
- ❌ Provider/Riverpod 是主流

### 3. 🔧 Riverpod 的优势

**Riverpod 更符合 Flutter 思维：**

```dart
// Riverpod: 声明式，全局状态
final userProvider = FutureProvider<User>((ref) async {
  return await api.getUser();
});

// 任何地方都能用
class AnyWidget extends ConsumerWidget {
  Widget build(context, ref) {
    final user = ref.watch(userProvider);
    return user.when(
      data: (u) => Text(u.name),
      loading: () => CircularProgressIndicator(),
      error: (e, s) => Text('Error'),
    );
  }
}
```

**vs useQuery 需要局部状态：**

```dart
// useQuery: 函数式，局部状态
class MyWidget extends HookWidget {
  Widget build(context) {
    // 状态绑定到这个 Widget
    final query = useQuery('user', () => api.getUser());

    // 其他 Widget 无法访问这个查询
    return Text(query.data?.name ?? '');
  }
}
```

### 4. 🌍 全局 vs 局部

**Riverpod = 全局状态管理**
```dart
// 定义一次
final cartProvider = StateNotifierProvider<Cart>(...);

// 到处都能用
ref.watch(cartProvider);  // 页面 A
ref.watch(cartProvider);  // 页面 B
ref.watch(cartProvider);  // 页面 C
```

**useQuery = 局部数据获取**
```dart
// 每个地方都要重新查询
useQuery('cart', getCart);  // 页面 A
useQuery('cart', getCart);  // 页面 B
useQuery('cart', getCart);  // 页面 C
// 虽然有缓存，但代码重复
```

### 5. 🏗️ 架构模式

**Flutter 偏爱分层架构：**
```dart
// Repository 层
class UserRepository {
  Future<User> getUser(String id) => api.getUser(id);
}

// Provider 层
final userProvider = FutureProvider.family<User, String>((ref, id) {
  return ref.watch(userRepositoryProvider).getUser(id);
});

// UI 层
class UserScreen extends ConsumerWidget {
  Widget build(context, ref) {
    return ref.watch(userProvider(userId)).when(...);
  }
}
```

**useQuery 打破了分层：**
```dart
class UserScreen extends HookWidget {
  Widget build(context) {
    // API 调用直接在 UI 层？
    final query = useQuery('user', () => api.getUser());
    // 违反了 Flutter 的架构习惯
  }
}
```

## 社区选择的原因

### 为什么选 Riverpod？

1. **Flutter 官方推荐的模式**
   - Provider 是 Flutter 团队推荐
   - Riverpod 是 Provider 的改进版

2. **更好的测试性**
   ```dart
   // Riverpod 容易测试
   final container = ProviderContainer(
     overrides: [
       userProvider.overrideWithValue(AsyncValue.data(mockUser)),
     ],
   );
   ```

3. **更好的类型安全**
   ```dart
   // Riverpod 编译时检查
   final user = ref.watch(userProvider);  // 类型明确
   ```

4. **符合 Flutter 习惯**
   - Widget 树思维
   - 依赖注入模式
   - 声明式编程

### 为什么 useQuery 不流行？

1. **需要额外依赖**
   - flutter_hooks
   - cached_query/fquery
   - 增加学习成本

2. **社区惯性**
   - 教程都用 Provider/Riverpod
   - 开源项目都用 Riverpod
   - 新手跟着主流走

3. **概念不匹配**
   - Flutter 开发者多来自原生开发
   - 不熟悉 React 的 hooks 概念
   - 更习惯传统的状态管理

## 实际案例对比

### 购物车功能

**Riverpod 方式（Flutter 主流）：**
```dart
// 全局购物车状态
final cartProvider = StateNotifierProvider<CartNotifier, Cart>((ref) {
  return CartNotifier();
});

// 任何页面都能访问
class ProductPage extends ConsumerWidget {
  Widget build(context, ref) {
    final cart = ref.watch(cartProvider);
    return Text('Items: ${cart.items.length}');
  }
}

class CheckoutPage extends ConsumerWidget {
  Widget build(context, ref) {
    final cart = ref.watch(cartProvider);  // 同一个购物车
    return Text('Total: ${cart.total}');
  }
}
```

**useQuery 方式：**
```dart
// 每个地方都要查询
class ProductPage extends HookWidget {
  Widget build(context) {
    final query = useQuery('cart', () => api.getCart());
    return Text('Items: ${query.data?.items.length ?? 0}');
  }
}

class CheckoutPage extends HookWidget {
  Widget build(context) {
    final query = useQuery('cart', () => api.getCart());  // 重复
    return Text('Total: ${query.data?.total ?? 0}');
  }
}
```

## 但是，useQuery 也有价值

### 适合的场景

1. **纯数据获取，不需要全局状态**
   ```dart
   // 用户详情页，只在这里用
   final userQuery = useQuery('user-123', getUserDetails);
   ```

2. **需要复杂缓存策略**
   ```dart
   // 搜索结果，需要缓存不同关键词
   final searchQuery = useQuery(
     ['search', keyword],
     () => searchAPI(keyword),
     staleTime: Duration(minutes: 5),
   );
   ```

3. **团队熟悉 React**
   - 从 React 转来的团队
   - 想保持一致的模式

## 我们的策略建议

### 混合方案：Riverpod + 生成的 Query Helpers

```dart
// 🎯 生成 Riverpod Provider，但加入 Query 的概念

// 1. 基础 Provider（Riverpod 风格）
final shiftProvider = FutureProvider.family<Shift, String>((ref, id) {
  return ref.watch(shiftsServiceProvider).getShift(id);
});

// 2. 带缓存控制的 Provider（Query 概念）
final shiftQueryProvider = StateNotifierProvider.family<
  QueryNotifier<Shift>,
  QueryState<Shift>,
  String
>((ref, id) {
  return QueryNotifier(
    fetcher: () => ref.watch(shiftsServiceProvider).getShift(id),
    cacheTime: Duration(minutes: 5),
    staleTime: Duration(minutes: 1),
  );
});

// 3. 使用时
class ShiftScreen extends ConsumerWidget {
  Widget build(context, ref) {
    // Riverpod 风格，但有 Query 的能力
    final shiftQuery = ref.watch(shiftQueryProvider(shiftId));

    if (shiftQuery.isStale && !shiftQuery.isFetching) {
      // 后台刷新
      ref.read(shiftQueryProvider(shiftId).notifier).refetch();
    }

    return shiftQuery.when(
      data: (shift) => ShiftDetails(shift),
      loading: () => LoadingIndicator(),
      error: (e) => ErrorWidget(e),
    );
  }
}
```

### 生成策略

```javascript
// dorval.config.js
module.exports = {
  output: {
    stateManagement: 'riverpod',  // 主流选择
    queryFeatures: true,           // 加入 Query 概念
    generateCaching: true,         // 生成缓存逻辑
  }
};
```

## 总结

### 为什么 Riverpod 是主流？
1. **符合 Flutter 哲学** - OOP、Widget、全局状态
2. **社区标准** - 官方推荐、教程多、生态好
3. **架构清晰** - 分层明确、测试容易

### 为什么 useQuery 不流行？
1. **概念不匹配** - Flutter 不是 React
2. **额外复杂度** - 需要 flutter_hooks
3. **社区惯性** - 大家都用 Riverpod

### 我们的机会？
**结合两者优点**：
- 用 Riverpod 的架构（主流）
- 加入 Query 的能力（缓存、刷新）
- 通过生成代码降低复杂度

你觉得这个方向对吗？