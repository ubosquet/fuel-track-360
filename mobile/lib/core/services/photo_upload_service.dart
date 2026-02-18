import 'dart:io';
import 'package:dio/dio.dart';
import 'package:firebase_auth/firebase_auth.dart';

/// PhotoUploadService — Handles uploading compressed photos to the API
///
/// This service is responsible for:
/// 1. Uploading photo files via multipart/form-data to the NestJS API
/// 2. Uploading signature images
/// 3. Returning the server storage path on success
///
/// Works in tandem with the SyncEngine:
/// - Online: uploads immediately when called
/// - Offline: SyncEngine queues the metadata, and this service
///   handles the actual file upload when connectivity is restored
class PhotoUploadService {
  final Dio _dio;

  PhotoUploadService({required Dio dio}) : _dio = dio;

  /// Upload a photo file for a specific S2L checklist
  ///
  /// Returns the created photo record from the server,
  /// or throws on failure (network, validation, etc.)
  Future<Map<String, dynamic>> uploadS2LPhoto({
    required String s2lId,
    required String localPath,
    required String photoType,
    required DateTime capturedAt,
    double? gpsLat,
    double? gpsLng,
  }) async {
    final file = File(localPath);
    if (!await file.exists()) {
      throw Exception('Photo file not found at $localPath');
    }

    final formData = FormData.fromMap({
      'photo': await MultipartFile.fromFile(
        localPath,
        filename: localPath.split('/').last,
      ),
      'photo_type': photoType,
      'captured_at': capturedAt.toIso8601String(),
      if (gpsLat != null) 'gps_lat': gpsLat.toString(),
      if (gpsLng != null) 'gps_lng': gpsLng.toString(),
    });

    // Inject Firebase auth token
    final user = FirebaseAuth.instance.currentUser;
    final token = await user?.getIdToken();

    final response = await _dio.post(
      '/s2l/$s2lId/photos/upload',
      data: formData,
      options: Options(
        headers: {
          if (token != null) 'Authorization': 'Bearer $token',
          'Content-Type': 'multipart/form-data',
        },
        // Increase timeout for file uploads over slow connections
        sendTimeout: const Duration(minutes: 2),
        receiveTimeout: const Duration(minutes: 2),
      ),
      onSendProgress: (sent, total) {
        final percent = total > 0 ? (sent / total * 100).toStringAsFixed(0) : '?';
        // Progress can be forwarded to UI via a callback or stream
        // ignore: avoid_print
        print('Uploading photo: $percent%');
      },
    );

    return response.data as Map<String, dynamic>;
  }

  /// Upload a signature image for a specific S2L checklist
  Future<Map<String, dynamic>> uploadSignature({
    required String s2lId,
    required String localPath,
  }) async {
    final file = File(localPath);
    if (!await file.exists()) {
      throw Exception('Signature file not found at $localPath');
    }

    final formData = FormData.fromMap({
      'signature': await MultipartFile.fromFile(
        localPath,
        filename: 'signature.png',
      ),
    });

    final user = FirebaseAuth.instance.currentUser;
    final token = await user?.getIdToken();

    final response = await _dio.post(
      '/s2l/$s2lId/signature/upload',
      data: formData,
      options: Options(
        headers: {
          if (token != null) 'Authorization': 'Bearer $token',
          'Content-Type': 'multipart/form-data',
        },
        sendTimeout: const Duration(minutes: 1),
        receiveTimeout: const Duration(minutes: 1),
      ),
    );

    return response.data as Map<String, dynamic>;
  }
}
