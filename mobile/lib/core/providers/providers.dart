import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:dio/dio.dart';
import 'package:connectivity_plus/connectivity_plus.dart';
import '../database/database.dart';
import '../services/photo_service.dart';
import '../services/photo_upload_service.dart';
import '../sync/sync_engine.dart';

// ── Database Provider ──
final databaseProvider = Provider<AppDatabase>((ref) {
  final db = AppDatabase();
  ref.onDispose(() => db.close());
  return db;
});

// ── Networking ──
final dioProvider = Provider<Dio>((ref) {
  return Dio(BaseOptions(
    baseUrl: 'http://10.0.2.2:3000/api/v1', // Android emulator → host
    connectTimeout: const Duration(seconds: 30),
    receiveTimeout: const Duration(seconds: 30),
  ));
});

// ── Photo Services ──
final photoServiceProvider = Provider<PhotoService>((ref) {
  return PhotoService();
});

final photoUploadServiceProvider = Provider<PhotoUploadService>((ref) {
  final dio = ref.watch(dioProvider);
  return PhotoUploadService(dio: dio);
});

// ── Sync Engine ──
final syncEngineProvider = Provider<SyncEngine>((ref) {
  final db = ref.watch(databaseProvider);
  final dio = ref.watch(dioProvider);
  final photoUpload = ref.watch(photoUploadServiceProvider);

  final engine = SyncEngine(
    db: db,
    dio: dio,
    connectivity: Connectivity(),
    photoUploadService: photoUpload,
  );

  // Auto-start sync engine
  engine.start();
  ref.onDispose(() => engine.stop());

  return engine;
});

// ── Auth State ──
enum AuthStatus { unauthenticated, loading, authenticated }

class AuthState {
  final AuthStatus status;
  final String? uid;
  final String? displayName;
  final String? role;
  final String? organizationId;

  const AuthState({
    this.status = AuthStatus.unauthenticated,
    this.uid,
    this.displayName,
    this.role,
    this.organizationId,
  });

  AuthState copyWith({
    AuthStatus? status,
    String? uid,
    String? displayName,
    String? role,
    String? organizationId,
  }) {
    return AuthState(
      status: status ?? this.status,
      uid: uid ?? this.uid,
      displayName: displayName ?? this.displayName,
      role: role ?? this.role,
      organizationId: organizationId ?? this.organizationId,
    );
  }
}

final authProvider = StateNotifierProvider<AuthNotifier, AuthState>((ref) {
  return AuthNotifier();
});

class AuthNotifier extends StateNotifier<AuthState> {
  AuthNotifier() : super(const AuthState());

  void setAuthenticated({
    required String uid,
    required String displayName,
    required String role,
    required String organizationId,
  }) {
    state = AuthState(
      status: AuthStatus.authenticated,
      uid: uid,
      displayName: displayName,
      role: role,
      organizationId: organizationId,
    );
  }

  void setLoading() {
    state = state.copyWith(status: AuthStatus.loading);
  }

  void setUnauthenticated() {
    state = const AuthState();
  }
}

// ── Connectivity ──
final connectivityProvider = StateProvider<bool>((ref) => true);

// ── Sync Stats (from real SyncEngine data) ──
final syncStatsProvider = FutureProvider<Map<String, int>>((ref) async {
  final engine = ref.watch(syncEngineProvider);
  return engine.getStats();
});
