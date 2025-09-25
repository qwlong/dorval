# Cached Query 详解

## 什么是 Cached Query？

Cached Query 是一个 Flutter/Dart 的数据获取和缓存库，灵感来自 React 生态的：
- React Query (TanStack Query)
- SWR
- RTK Query
- Apollo Client

## 核心概念

### 1. Query（查询）

将异步函数包装成可缓存的查询：

```dart
// 定义一个查询
final userQuery = Query<User>(
  key: ['user', userId],  // 唯一标识符
  queryFn: () async {     // 获取数据的函数
    final response = await dio.get('/api/user/$userId');
    return User.fromJson(response.data);
  },
);

// 使用查询
QueryBuilder<User>(
  query: userQuery,
  builder: (context, state) {
    if (state.status == QueryStatus.loading) {
      return CircularProgressIndicator();
    }
    return Text(state.data!.name);
  },
);
```

### 2. Mutation（变更）

处理数据的创建、更新、删除：

```dart
// 定义一个 mutation
final updateUserMutation = Mutation<User, UpdateUserDto>(
  mutationFn: (dto) async {
    final response = await dio.put('/api/user/${dto.id}', data: dto);
    return User.fromJson(response.data);
  },
  onSuccess: (user, dto, context) {
    // 成功后刷新相关查询
    QueryClient.of(context).invalidateQueries(['user', user.id]);
  },
);

// 使用 mutation
MutationBuilder<User, UpdateUserDto>(
  mutation: updateUserMutation,
  builder: (context, state) {
    return ElevatedButton(
      onPressed: state.status == MutationStatus.loading ? null : () {
        updateUserMutation.mutate(
          UpdateUserDto(id: '1', name: 'New Name'),
        );
      },
      child: state.status == MutationStatus.loading
        ? CircularProgressIndicator()
        : Text('Update'),
    );
  },
);
```

## 工作原理

### 缓存机制

```dart
// 第一次请求
Query(['user', '1'], fetchUser);  // 🌐 网络请求 → 💾 存入缓存

// 5秒后再次请求（在 staleTime 内）
Query(['user', '1'], fetchUser);  // ✅ 直接返回缓存，不请求

// 1分钟后（超过 staleTime，但在 cacheTime 内）
Query(['user', '1'], fetchUser);  // 💾 先返回缓存 → 🌐 后台刷新

// 10分钟后（超过 cacheTime）
Query(['user', '1'], fetchUser);  // 🌐 重新请求
```

### 时间控制

```dart
Query<User>(
  key: ['user', userId],
  queryFn: fetchUser,

  // 数据保鲜时间（这段时间内不会重新请求）
  staleTime: Duration(minutes: 1),

  // 缓存保留时间（这段时间后缓存被清理）
  cacheTime: Duration(minutes: 5),

  // 重新获得焦点时是否刷新
  refetchOnWindowFocus: true,

  // 重试配置
  retry: 3,
  retryDelay: Duration(seconds: 1),
);
```

## 实际使用示例

### 基础查询

```dart
import 'package:cached_query_flutter/cached_query_flutter.dart';

class UserProfile extends StatelessWidget {
  final String userId;

  const UserProfile({required this.userId});

  @override
  Widget build(BuildContext context) {
    return QueryBuilder<User>(
      query: Query(
        key: ['user', userId],
        queryFn: () => UserApi.getUser(userId),
      ),
      builder: (context, state) {
        // state.status: initial | loading | success | error
        // state.data: User?
        // state.error: Object?
        // state.isLoading: bool
        // state.isFetching: bool (后台刷新中)

        if (state.status == QueryStatus.loading) {
          return CircularProgressIndicator();
        }

        if (state.status == QueryStatus.error) {
          return Text('Error: ${state.error}');
        }

        final user = state.data!;
        return Column(
          children: [
            if (state.isFetching) LinearProgressIndicator(),
            Text(user.name),
            Text(user.email),
          ],
        );
      },
    );
  }
}
```

### 无限滚动

```dart
class PostsList extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return InfiniteQueryBuilder<List<Post>, int>(
      query: InfiniteQuery<List<Post>, int>(
        key: ['posts'],
        queryFn: (page) => PostApi.getPosts(page: page, limit: 20),
        getNextPageParam: (lastPage, allPages) {
          if (lastPage.length < 20) return null;  // 没有更多
          return allPages.length + 1;  // 下一页号
        },
      ),
      builder: (context, state) {
        if (state.status == QueryStatus.loading) {
          return CircularProgressIndicator();
        }

        final allPosts = state.data?.expand((page) => page).toList() ?? [];

        return ListView.builder(
          itemCount: allPosts.length + (state.hasNextPage ? 1 : 0),
          itemBuilder: (context, index) {
            if (index == allPosts.length) {
              // 触发加载下一页
              state.fetchNextPage();
              return CircularProgressIndicator();
            }

            return PostCard(post: allPosts[index]);
          },
        );
      },
    );
  }
}
```

### 依赖查询

```dart
class TeamDetails extends StatelessWidget {
  final String teamId;

  @override
  Widget build(BuildContext context) {
    return QueryBuilder<Team>(
      query: Query(
        key: ['team', teamId],
        queryFn: () => TeamApi.getTeam(teamId),
      ),
      builder: (context, teamState) {
        if (!teamState.hasData) {
          return CircularProgressIndicator();
        }

        final team = teamState.data!;

        // 第二个查询依赖第一个的结果
        return QueryBuilder<List<Member>>(
          query: Query(
            key: ['members', team.id],
            queryFn: () => TeamApi.getMembers(team.id),
            // 只有当 team 加载成功后才执行
            enabled: teamState.hasData,
          ),
          builder: (context, membersState) {
            return Column(
              children: [
                Text(team.name),
                if (membersState.hasData)
                  ...membersState.data!.map((m) => Text(m.name)),
              ],
            );
          },
        );
      },
    );
  }
}
```

### 乐观更新

```dart
final updatePostMutation = Mutation<Post, UpdatePostDto>(
  mutationFn: (dto) => PostApi.updatePost(dto),
  onMutate: (dto) {
    // 乐观更新：立即更新缓存
    final oldPost = queryClient.getQueryData<Post>(['post', dto.id]);

    queryClient.setQueryData<Post>(
      ['post', dto.id],
      oldPost?.copyWith(title: dto.title),
    );

    // 返回上下文，用于回滚
    return oldPost;
  },
  onError: (error, dto, context) {
    // 失败时回滚
    if (context != null) {
      queryClient.setQueryData<Post>(
        ['post', dto.id],
        context as Post,
      );
    }
  },
  onSuccess: (post, dto, context) {
    // 成功后刷新列表
    queryClient.invalidateQueries(['posts']);
  },
);
```

## 与 React Query 的对比

| 特性 | React Query | Cached Query |
|-----|------------|--------------|
| 查询缓存 | ✅ useQuery | ✅ Query |
| 变更处理 | ✅ useMutation | ✅ Mutation |
| 无限查询 | ✅ useInfiniteQuery | ✅ InfiniteQuery |
| 乐观更新 | ✅ | ✅ |
| 后台刷新 | ✅ | ✅ |
| 窗口焦点刷新 | ✅ | ✅ |
| 查询失效 | ✅ invalidateQueries | ✅ invalidateQueries |
| 依赖查询 | ✅ enabled | ✅ enabled |
| DevTools | ✅ | ⚠️ 基础版 |

## 为什么选择 Cached Query？

### 优点
1. **成熟稳定** - 在生产环境中广泛使用
2. **API 友好** - 类似 React Query，容易上手
3. **文档完善** - 有详细文档和示例
4. **功能完整** - 覆盖大部分使用场景
5. **性能优秀** - 使用 Dart streams，只更新需要的部分

### 缺点
1. **需要手写查询** - 每个 API 都要定义
2. **样板代码多** - QueryBuilder 包装较繁琐
3. **类型不够智能** - 需要手动指定泛型

## 我们可以改进的地方

### 自动生成 Cached Query 代码

```dart
// 🎯 生成的代码
class GeneratedQueries {
  // 为每个 API 生成查询
  static Query<ShiftResponseDto> getShift(String shiftId) {
    return Query<ShiftResponseDto>(
      key: ['shifts', shiftId],  // 自动生成 key
      queryFn: () => shiftsService.getV1ShiftsShiftId(shiftId),
      staleTime: Duration(minutes: 5),  // 默认配置
      cacheTime: Duration(minutes: 10),
    );
  }

  // 生成 Mutation
  static Mutation<ShiftResponseDto, UpdateShiftRequestDto> updateShift() {
    return Mutation<ShiftResponseDto, UpdateShiftRequestDto>(
      mutationFn: (dto) => shiftsService.patchV1ShiftsShiftId(
        dto.id,
        dto.toJson(),
      ),
      onSuccess: (data, variables, context) {
        // 自动刷新相关查询
        CachedQuery.instance.invalidateQueries(['shifts', variables.id]);
        CachedQuery.instance.invalidateQueries(['shifts', 'list']);
      },
    );
  }
}

// 使用
QueryBuilder<ShiftResponseDto>(
  query: GeneratedQueries.getShift(shiftId),  // 一行搞定
  builder: (context, state) {
    // ...
  },
);
```

这样结合了 Cached Query 的稳定性和代码生成的便利性！