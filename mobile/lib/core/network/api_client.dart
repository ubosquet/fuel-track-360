import 'package:dio/dio.dart';
import 'package:firebase_auth/firebase_auth.dart';

/// API client with Firebase token auto-injection
class ApiClient {
  late final Dio _dio;

  ApiClient({String? baseUrl}) {
    _dio = Dio(BaseOptions(
      baseUrl: baseUrl ?? 'http://10.0.2.2:3000/api/v1', // Android emulator → host
      connectTimeout: const Duration(seconds: 30),
      receiveTimeout: const Duration(seconds: 30),
      headers: {'Content-Type': 'application/json'},
    ));

    _dio.interceptors.add(InterceptorsWrapper(
      onRequest: (options, handler) async {
        final user = FirebaseAuth.instance.currentUser;
        if (user != null) {
          final token = await user.getIdToken();
          options.headers['Authorization'] = 'Bearer $token';
        }
        return handler.next(options);
      },
      onError: (error, handler) {
        // TODO: handle 401 → re-auth, 503 → offline queue
        return handler.next(error);
      },
    ));
  }

  // ── S2L ──
  Future<Map<String, dynamic>> createS2L(Map<String, dynamic> data) async {
    final res = await _dio.post('/s2l', data: data);
    return res.data;
  }

  Future<Map<String, dynamic>> submitS2L(String id, String signatureUrl) async {
    final res = await _dio.patch('/s2l/$id/submit', data: {'signature_url': signatureUrl});
    return res.data;
  }

  // ── Manifests ──
  Future<Map<String, dynamic>> createManifest(Map<String, dynamic> data) async {
    final res = await _dio.post('/manifests', data: data);
    return res.data;
  }

  // ── GPS ──
  Future<void> sendGpsLog(Map<String, dynamic> data) async {
    await _dio.post('/fleet/gps', data: data);
  }

  // ── Sync ──
  Future<List<dynamic>> syncBatch(List<Map<String, dynamic>> operations) async {
    final res = await _dio.post('/sync/batch', data: {'operations': operations});
    return res.data;
  }

  // ── Auth ──
  Future<Map<String, dynamic>> getProfile() async {
    final res = await _dio.get('/auth/me');
    return res.data;
  }
}
