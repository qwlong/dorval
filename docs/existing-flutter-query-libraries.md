# Flutter/Dart 现有的 Query 库

## 主要选择

### 1. **FQuery** (最新，2024/2025)
最接近 React Query 的体验

```dart
// 安装
dependencies:
  fquery: ^latest

// 使用
import 'package:fquery/fquery.dart';

// 包装应用
void main() {
  runApp(
    QueryClientProvider(
      queryClient: QueryClient(),
      child: MyApp(),
    ),
  );
}

// 在组件中使用
class MyWidget extends HookWidget {
  @override
  Widget build(BuildContext context) {
    final query = useQuery<User>(
      'users/1',
      fetcher: () async {
        final response = await api.getUser(1);
        return response;
      },
      cacheDuration: Duration(minutes: 5),
      staleDuration: Duration(minutes: 1),
      refetchInterval: Duration(seconds: 30),
      retryCount: 3,
    );

    if (query.isLoading) return CircularProgressIndicator();
    if (query.isError) return Text('Error: ${query.error}');

    return Text(query.data!.name);
  }
}
```

### 2. **Cached Query**
成熟稳定，文档完善

```dart
// 安装
dependencies:
  cached_query: ^latest
  cached_query_flutter: ^latest

// 使用
import 'package:cached_query_flutter/cached_query_flutter.dart';

// 定义查询
Query<User> getUserQuery(String id) {
  return Query<User>(
    key: ['user', id],
    fetcher: () async => api.getUser(id),
    cacheDuration: Duration(minutes: 5),
  );
}

// 在组件中使用
class MyWidget extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return QueryBuilder<User>(
      query: getUserQuery('1'),
      builder: (context, state) {
        if (state.status == QueryStatus.loading) {
          return CircularProgressIndicator();
        }

        if (state.status == QueryStatus.error) {
          return Text('Error: ${state.error}');
        }

        return Text(state.data!.name);
      },
    );
  }
}

// Mutation
Mutation<User, UpdateUserRequest> updateUserMutation() {
  return Mutation<User, UpdateUserRequest>(
    queryKey: ['updateUser'],
    mutationFn: (variables) async => api.updateUser(variables),
    onSuccess: (data, variables) {
      // 刷新相关查询
      CachedQuery.instance.invalidateQueries(['user', variables.id]);
    },
  );
}
```

### 3. **Flutter Query**
```dart
dependencies:
  flutter_query: ^latest

// 使用
final userQuery = useQuery<User>(
  'user-1',
  () => api.getUser('1'),
  staleDuration: Duration(minutes: 5),
  gcDuration: Duration(minutes: 10),
);
```

## 对比分析

| 特性 | FQuery | Cached Query | Flutter Query | 自己生成 |
|------|--------|--------------|--------------|----------|
| React Query API | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐ | 可定制 |
| 文档完善度 | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ | - |
| 社区活跃度 | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐ | - |
| 自动生成 | ❌ | ❌ | ❌ | ✅ |
| 与 API 集成 | 手动 | 手动 | 手动 | 自动 |
| TypeScript 支持 | - | - | - | ✅ |

## 问题：它们都需要手写

### 现有库的痛点

1. **需要手写每个查询**
```dart
// 每个 API 都要手写
final userQuery = useQuery('user-1', () => api.getUser('1'));
final postsQuery = useQuery('posts', () => api.getPosts());
final commentsQuery = useQuery('comments', () => api.getComments());
// ... 重复 100 次
```

2. **需要手动管理 key**
```dart
// 容易出错，key 不一致导致缓存失效
useQuery(['user', userId], fetcher);  // 这里
invalidateQueries(['users', userId]); // 写错了！
```

3. **需要手动处理类型**
```dart
// 类型不安全
final query = useQuery<dynamic>('data', fetcher);
// 需要手动转换
final user = query.data as User?;
```

## 我们的机会：结合两者优势

### 方案1：生成 FQuery/Cached Query 代码

```dart
// 🎯 自动生成的代码
class GeneratedHooks {
  // 为每个 API 生成 hook
  static QueryResult<ShiftResponseDto> useGetShift(
    WidgetRef ref,
    String shiftId,
  ) {
    return useQuery<ShiftResponseDto>(
      ['shifts', shiftId],  // 自动生成 key
      () => shiftsService.getV1ShiftsShiftId(shiftId),  // 自动绑定 API
      cacheDuration: Duration(minutes: 5),  // 默认配置
    );
  }

  // Mutation 也自动生成
  static Mutation<ShiftResponseDto, UpdateShiftRequestDto> useUpdateShift() {
    return useMutation<ShiftResponseDto, UpdateShiftRequestDto>(
      (variables) => shiftsService.patchV1ShiftsShiftId(
        variables.id,
        variables.data,
      ),
      onSuccess: (data, variables) {
        // 自动刷新相关查询
        invalidateQueries(['shifts', variables.id]);
        invalidateQueries(['shifts', 'list']);
      },
    );
  }
}

// 使用
final shiftQuery = GeneratedHooks.useGetShift(ref, shiftId);
```

### 方案2：生成配置文件

```dart
// 生成 queries.generated.dart
final queries = {
  'getShift': QueryConfig(
    key: (String id) => ['shifts', id],
    fetcher: (String id) => shiftsService.getV1ShiftsShiftId(id),
    invalidates: ['shifts.list', 'shifts.byLocation'],
  ),
  'getShifts': QueryConfig(
    key: (params) => ['shifts', 'list', ...params],
    fetcher: (params) => shiftsService.getV1Shifts(params),
  ),
  // ... 所有 API 的配置
};

// 使用现有库 + 生成的配置
final query = useQuery(
  queries['getShift'].key(shiftId),
  queries['getShift'].fetcher,
);
```

### 方案3：扩展现有库

```dart
// 生成扩展方法
extension ShiftsQueries on QueryClient {
  Query<ShiftResponseDto> getShift(String id) {
    return Query<ShiftResponseDto>(
      key: ['shifts', id],
      fetcher: () => shiftsService.getV1ShiftsShiftId(id),
    );
  }

  Query<List<ShiftResponseDto>> getShifts({
    DateTime? date,
    String? locationId,
  }) {
    return Query<List<ShiftResponseDto>>(
      key: ['shifts', 'list', date, locationId],
      fetcher: () => shiftsService.getV1Shifts(
        date: date,
        locationId: locationId,
      ),
    );
  }
}

// 使用
final shiftQuery = queryClient.getShift(shiftId);
```

## 建议

### 最佳方案：基于 FQuery 或 Cached Query 生成代码

1. **利用成熟框架** - 不重复造轮子
2. **自动生成 Hooks** - 减少样板代码
3. **类型安全** - 从 OpenAPI 生成正确类型
4. **智能失效** - 自动管理查询关系

```javascript
// dorval.config.js
module.exports = {
  input: './openapi.json',
  output: {
    target: './lib/api',
    client: 'dio',
    queryLibrary: 'fquery', // 或 'cached_query'
    generateHooks: true,
    hookOptions: {
      cacheTime: 5, // 分钟
      staleTime: 1, // 分钟
      autoInvalidate: true,
    }
  }
};
```

这样既能利用现有库的稳定性，又能通过代码生成解决重复劳动的问题。你觉得呢？