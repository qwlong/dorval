import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../generated/providers/shifts_providers.dart';
import '../generated/models/index.dart';

// ============================================================
// Basic usage example - GET requests with parameters
// ============================================================

class ShiftListWithParams extends ConsumerWidget {
  @override
  Widget build(BuildContext context, WidgetRef ref) {
    // Method 1: Use Provider with parameters
    final params = GetShiftsParams(
      date: DateTime.now(),
      locationId: 'loc-123',
      status: 'active',
      page: 1,
      limit: 20,
    );

    final shiftsAsync = ref.watch(ShiftsProviders.all(params));

    return shiftsAsync.when(
      data: (shifts) => ListView.builder(
        itemCount: shifts.length,
        itemBuilder: (context, index) {
          return ListTile(
            title: Text(shifts[index].title),
            subtitle: Text(shifts[index].date.toString()),
          );
        },
      ),
      loading: () => CircularProgressIndicator(),
      error: (e, s) => Text('Error: $e'),
    );
  }
}

// ============================================================
// Pagination usage example
// ============================================================

class ShiftListWithPagination extends ConsumerWidget {
  final String locationId;

  const ShiftListWithPagination({required this.locationId});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    // Use pagination Provider
    final params = GetShiftsParams(
      locationId: locationId,
      limit: 20,
    );

    final paginationState = ref.watch(
      ShiftsProviders.allPaginated(params),
    );

    final notifier = ref.read(
      ShiftsProviders.allPaginated(params).notifier,
    );

    return Scaffold(
      appBar: AppBar(
        title: Text('Shifts'),
        actions: [
          IconButton(
            icon: Icon(Icons.refresh),
            onPressed: () => notifier.refresh(),
          ),
        ],
      ),
      body: RefreshIndicator(
        onRefresh: () async => notifier.refresh(),
        child: _buildBody(paginationState, notifier),
      ),
    );
  }

  Widget _buildBody(
    PaginationState<ShiftResponseDto> state,
    PaginationNotifier<ShiftResponseDto> notifier,
  ) {
    if (state.error != null) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Text('Error: ${state.error}'),
            ElevatedButton(
              onPressed: () => notifier.refresh(),
              child: Text('Retry'),
            ),
          ],
        ),
      );
    }

    if (state.items.isEmpty && state.isLoading) {
      return Center(child: CircularProgressIndicator());
    }

    if (state.items.isEmpty) {
      return Center(child: Text('No shifts found'));
    }

    return ListView.builder(
      itemCount: state.items.length + (state.hasMore ? 1 : 0),
      itemBuilder: (context, index) {
        // If it's the last item and there's more data, show loading indicator
        if (index == state.items.length) {
          // Trigger loading next page
          WidgetsBinding.instance.addPostFrameCallback((_) {
            notifier.loadNextPage();
          });

          return Padding(
            padding: const EdgeInsets.all(16.0),
            child: Center(
              child: state.isLoading
                  ? CircularProgressIndicator()
                  : TextButton(
                      onPressed: () => notifier.loadNextPage(),
                      child: Text('Load More'),
                    ),
            ),
          );
        }

        final shift = state.items[index];
        return ListTile(
          title: Text(shift.title),
          subtitle: Text('${shift.date} - ${shift.location}'),
          trailing: Text(shift.status),
          onTap: () => _viewShiftDetails(context, shift.id),
        );
      },
    );
  }

  void _viewShiftDetails(BuildContext context, String shiftId) {
    Navigator.push(
      context,
      MaterialPageRoute(
        builder: (_) => ShiftDetailScreen(shiftId: shiftId),
      ),
    );
  }
}

// ============================================================
// Infinite scroll example
// ============================================================

class InfiniteScrollShifts extends ConsumerStatefulWidget {
  @override
  _InfiniteScrollShiftsState createState() => _InfiniteScrollShiftsState();
}

class _InfiniteScrollShiftsState extends ConsumerState<InfiniteScrollShifts> {
  final ScrollController _scrollController = ScrollController();

  @override
  void initState() {
    super.initState();
    _scrollController.addListener(_onScroll);
  }

  @override
  void dispose() {
    _scrollController.dispose();
    super.dispose();
  }

  void _onScroll() {
    if (_scrollController.position.pixels >=
        _scrollController.position.maxScrollExtent - 200) {
      // When scrolling to 200 pixels from bottom, load next page
      final notifier = ref.read(
        ShiftsProviders.allPaginated(GetShiftsParams()).notifier,
      );
      notifier.loadNextPage();
    }
  }

  @override
  Widget build(BuildContext context) {
    final paginationState = ref.watch(
      ShiftsProviders.allPaginated(GetShiftsParams()),
    );

    return Scaffold(
      appBar: AppBar(title: Text('Infinite Scroll')),
      body: ListView.builder(
        controller: _scrollController,
        itemCount: paginationState.items.length + 1,
        itemBuilder: (context, index) {
          if (index == paginationState.items.length) {
            if (!paginationState.hasMore) {
              return Padding(
                padding: const EdgeInsets.all(16.0),
                child: Center(child: Text('No more items')),
              );
            }
            if (paginationState.isLoading) {
              return Padding(
                padding: const EdgeInsets.all(16.0),
                child: Center(child: CircularProgressIndicator()),
              );
            }
            return SizedBox.shrink();
          }

          final shift = paginationState.items[index];
          return ListTile(
            title: Text(shift.title),
            subtitle: Text(shift.date.toString()),
          );
        },
      ),
    );
  }
}

// ============================================================
// Filter and search example
// ============================================================

class FilteredShiftList extends ConsumerStatefulWidget {
  @override
  _FilteredShiftListState createState() => _FilteredShiftListState();
}

class _FilteredShiftListState extends ConsumerState<FilteredShiftList> {
  String? selectedLocation;
  String? selectedStatus;
  DateTime? selectedDate;
  String searchQuery = '';

  @override
  Widget build(BuildContext context) {
    // Create parameters based on filter conditions
    final params = GetShiftsParams(
      locationId: selectedLocation,
      status: selectedStatus,
      date: selectedDate,
      search: searchQuery.isEmpty ? null : searchQuery,
    );

    // Watch Provider with parameters
    final shiftsAsync = ref.watch(ShiftsProviders.all(params));

    return Scaffold(
      appBar: AppBar(
        title: Text('Filtered Shifts'),
        bottom: PreferredSize(
          preferredSize: Size.fromHeight(120),
          child: _buildFilters(),
        ),
      ),
      body: shiftsAsync.when(
        data: (shifts) => _buildShiftList(shifts),
        loading: () => Center(child: CircularProgressIndicator()),
        error: (e, s) => Center(child: Text('Error: $e')),
      ),
    );
  }

  Widget _buildFilters() {
    return Container(
      color: Colors.white,
      padding: EdgeInsets.all(16),
      child: Column(
        children: [
          // Search box
          TextField(
            decoration: InputDecoration(
              hintText: 'Search shifts...',
              prefixIcon: Icon(Icons.search),
              border: OutlineInputBorder(),
            ),
            onChanged: (value) {
              setState(() => searchQuery = value);
            },
          ),
          SizedBox(height: 8),
          Row(
            children: [
              // Location filter
              Expanded(
                child: DropdownButtonFormField<String?>(
                  value: selectedLocation,
                  decoration: InputDecoration(
                    labelText: 'Location',
                    border: OutlineInputBorder(),
                  ),
                  items: [
                    DropdownMenuItem(value: null, child: Text('All')),
                    DropdownMenuItem(value: 'loc-1', child: Text('Location 1')),
                    DropdownMenuItem(value: 'loc-2', child: Text('Location 2')),
                  ],
                  onChanged: (value) {
                    setState(() => selectedLocation = value);
                  },
                ),
              ),
              SizedBox(width: 8),
              // Status filter
              Expanded(
                child: DropdownButtonFormField<String?>(
                  value: selectedStatus,
                  decoration: InputDecoration(
                    labelText: 'Status',
                    border: OutlineInputBorder(),
                  ),
                  items: [
                    DropdownMenuItem(value: null, child: Text('All')),
                    DropdownMenuItem(value: 'open', child: Text('Open')),
                    DropdownMenuItem(value: 'filled', child: Text('Filled')),
                    DropdownMenuItem(value: 'cancelled', child: Text('Cancelled')),
                  ],
                  onChanged: (value) {
                    setState(() => selectedStatus = value);
                  },
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildShiftList(List<ShiftResponseDto> shifts) {
    if (shifts.isEmpty) {
      return Center(child: Text('No shifts found'));
    }

    return ListView.builder(
      itemCount: shifts.length,
      itemBuilder: (context, index) {
        final shift = shifts[index];
        return ListTile(
          title: Text(shift.title),
          subtitle: Text('${shift.date} - ${shift.location}'),
          trailing: Chip(
            label: Text(shift.status),
            backgroundColor: _getStatusColor(shift.status),
          ),
        );
      },
    );
  }

  Color _getStatusColor(String status) {
    switch (status.toLowerCase()) {
      case 'open':
        return Colors.green.shade100;
      case 'filled':
        return Colors.blue.shade100;
      case 'cancelled':
        return Colors.red.shade100;
      default:
        return Colors.grey.shade100;
    }
  }
}

// ============================================================
// Detail page example
// ============================================================

class ShiftDetailScreen extends ConsumerWidget {
  final String shiftId;

  const ShiftDetailScreen({required this.shiftId});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final shiftAsync = ref.watch(ShiftsProviders.byId(shiftId));

    return Scaffold(
      appBar: AppBar(
        title: Text('Shift Details'),
        actions: [
          PopupMenuButton<String>(
            onSelected: (value) async {
              switch (value) {
                case 'edit':
                  await _editShift(ref, shiftId);
                  break;
                case 'delete':
                  await _deleteShift(context, ref, shiftId);
                  break;
              }
            },
            itemBuilder: (context) => [
              PopupMenuItem(value: 'edit', child: Text('Edit')),
              PopupMenuItem(value: 'delete', child: Text('Delete')),
            ],
          ),
        ],
      ),
      body: shiftAsync.when(
        data: (shift) => _buildDetails(shift),
        loading: () => Center(child: CircularProgressIndicator()),
        error: (e, s) => Center(child: Text('Error: $e')),
      ),
    );
  }

  Widget _buildDetails(ShiftResponseDto shift) {
    return Padding(
      padding: const EdgeInsets.all(16.0),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text('Title: ${shift.title}', style: TextStyle(fontSize: 18)),
          SizedBox(height: 8),
          Text('Date: ${shift.date}'),
          Text('Location: ${shift.location}'),
          Text('Status: ${shift.status}'),
          // ... more details
        ],
      ),
    );
  }

  Future<void> _editShift(WidgetRef ref, String shiftId) async {
    try {
      await ShiftsProviders.update(
        ref,
        shiftId,
        UpdateShiftRequestDto(title: 'Updated Title'),
      );
    } catch (e) {
      // Error handling
    }
  }

  Future<void> _deleteShift(
    BuildContext context,
    WidgetRef ref,
    String shiftId,
  ) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: Text('Confirm Delete'),
        content: Text('Are you sure you want to delete this shift?'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: Text('Cancel'),
          ),
          TextButton(
            onPressed: () => Navigator.pop(context, true),
            child: Text('Delete'),
          ),
        ],
      ),
    );

    if (confirmed == true) {
      try {
        await ShiftsProviders.delete(ref, shiftId);
        Navigator.pop(context);
      } catch (e) {
        // Error handling
      }
    }
  }
}