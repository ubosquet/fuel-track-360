import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../database/database.dart';

// ── Database Provider ──
final databaseProvider = Provider<AppDatabase>((ref) {
  final db = AppDatabase();
  ref.onDispose(() => db.close());
  return db;
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

// ── Sync Stats ──
final syncStatsProvider = FutureProvider<Map<String, int>>((ref) async {
  return {'pending': 0, 'failed': 0};
});
