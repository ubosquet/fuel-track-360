import 'dart:async';
import 'dart:convert';
import '../database/database.dart';
import '../../features/auth/data/auth_repository.dart';
import 'package:connectivity_plus/connectivity_plus.dart';
import 'package:dio/dio.dart';

/// SyncEngine — Manages offline-to-online synchronization
///
/// Protocol:
/// 1. All field operations first write to local Drift DB
/// 2. Each write creates a SyncQueue entry with a UUID sync_id
/// 3. When connectivity is restored, SyncEngine processes the queue
/// 4. Server returns status per sync_id (COMPLETED/FAILED/CONFLICT)
/// 5. Completed items are marked as synced; failures retry with backoff
class SyncEngine {
  final AppDatabase db;
  final Dio dio;
  final Connectivity connectivity;

  Timer? _syncTimer;
  bool _isSyncing = false;
  static const Duration _syncInterval = Duration(seconds: 30);
  static const int _maxRetries = 5;
  static const int _batchSize = 50;

  SyncEngine({
    required this.db,
    required this.dio,
    required this.connectivity,
  });

  /// Start the periodic sync engine
  void start() {
    _syncTimer?.cancel();
    _syncTimer = Timer.periodic(_syncInterval, (_) => _processQueue());

    // Also sync immediately when connectivity changes
    connectivity.onConnectivityChanged.listen((results) {
      if (results.any((r) => r != ConnectivityResult.none)) {
        _processQueue();
      }
    });
  }

  void stop() {
    _syncTimer?.cancel();
    _syncTimer = null;
  }

  /// Enqueue an offline operation
  Future<void> enqueue({
    required String syncId,
    required String operation,
    required String entityType,
    required String entityId,
    required Map<String, dynamic> payload,
  }) async {
    await db.into(db.syncQueue).insert(
      SyncQueueCompanion.insert(
        syncId: syncId,
        operation: operation,
        entityType: entityType,
        entityId: entityId,
        payload: jsonEncode(payload),
        queuedAt: DateTime.now(),
      ),
    );
  }

  /// Process pending items in the sync queue
  Future<void> _processQueue() async {
    if (_isSyncing) return;

    final connectivityResult = await connectivity.checkConnectivity();
    if (connectivityResult.every((r) => r == ConnectivityResult.none)) return;

    _isSyncing = true;

    try {
      // Get pending items (oldest first, limited to batch size)
      final pending = await (db.select(db.syncQueue)
        ..where((t) => t.status.equals('PENDING'))
        ..where((t) => t.retryCount.isSmallerThan(const Variable(_maxRetries)))
        ..orderBy([(t) => OrderingTerm.asc(t.queuedAt)])
        ..limit(_batchSize))
        .get();

      if (pending.isEmpty) return;

      // Build batch payload
      final operations = pending.map((item) => {
        return {
          'sync_id': item.syncId,
          'operation': item.operation,
          'entity_type': item.entityType,
          'entity_id': item.entityId,
          'payload': jsonDecode(item.payload),
          'queued_at': item.queuedAt.toIso8601String(),
        };
      }).toList();

      // Send to server
      final response = await dio.post(
        '/api/v1/sync/batch',
        data: {'operations': operations},
      );

      if (response.statusCode == 200 || response.statusCode == 201) {
        final results = response.data as List;
        for (final result in results) {
          final syncId = result['sync_id'];
          final status = result['status'];

          if (status == 'COMPLETED') {
            // Mark as completed and update entity's isSynced flag
            await (db.update(db.syncQueue)
              ..where((t) => t.syncId.equals(syncId)))
              .write(SyncQueueCompanion(
                status: const Value('COMPLETED'),
                processedAt: Value(DateTime.now()),
              ));

            // Update the entity's sync status in local DB
            await _markEntitySynced(
              pending.firstWhere((p) => p.syncId == syncId),
              result['server_id'],
            );
          } else {
            // Increment retry count
            await (db.update(db.syncQueue)
              ..where((t) => t.syncId.equals(syncId)))
              .write(SyncQueueCompanion(
                retryCount: Value(
                  pending.firstWhere((p) => p.syncId == syncId).retryCount + 1,
                ),
                errorMessage: Value(result['error'] ?? 'Unknown error'),
              ));
          }
        }
      }
    } catch (e) {
      // Network error — will retry on next cycle
    } finally {
      _isSyncing = false;
    }
  }

  Future<void> _markEntitySynced(SyncQueueData item, String? serverId) async {
    switch (item.entityType) {
      case 's2l':
        await (db.update(db.s2lChecklists)
          ..where((t) => t.id.equals(item.entityId)))
          .write(const S2lChecklistsCompanion(isSynced: Value(true)));
        break;
      case 'manifest':
        await (db.update(db.manifests)
          ..where((t) => t.id.equals(item.entityId)))
          .write(const ManifestsCompanion(isSynced: Value(true)));
        break;
      case 'gps_log':
        await (db.update(db.gpsLogs)
          ..where((t) => t.id.equals(item.entityId)))
          .write(const GpsLogsCompanion(isSynced: Value(true)));
        break;
    }
  }

  /// Get sync queue statistics
  Future<Map<String, int>> getStats() async {
    final pending = await (db.select(db.syncQueue)
      ..where((t) => t.status.equals('PENDING')))
      .get();
    final failed = await (db.select(db.syncQueue)
      ..where((t) => t.retryCount.isBiggerOrEqual(const Variable(_maxRetries))))
      .get();

    return {
      'pending': pending.length,
      'failed': failed.length,
    };
  }
}
