import 'dart:io';
import 'dart:typed_data';
import 'package:image_picker/image_picker.dart';
import 'package:path_provider/path_provider.dart';
import 'package:path/path.dart' as p;
import 'package:uuid/uuid.dart';

/// PhotoService — Handles camera capture and image compression
///
/// Compression strategy for Haiti's low-bandwidth environment:
/// - Target: 200–400 KB per photo (down from 4–8 MB raw)
/// - Quality: 70% JPEG (visually indistinguishable for compliance photos)
/// - Max dimension: 1280px on longest side
/// - Format: Always JPEG (best compression for photos)
class PhotoService {
  final ImagePicker _picker = ImagePicker();
  static const _uuid = Uuid();

  /// Maximum dimension for the longest side of the image.
  /// 1280px is sufficient for compliance review on a tablet/desktop.
  static const int maxDimension = 1280;

  /// JPEG quality percentage. 70 gives excellent visual quality
  /// at roughly 1/10th the raw file size.
  static const int jpegQuality = 70;

  /// Capture a photo from the device camera with automatic compression
  ///
  /// Returns a [CapturedPhoto] with the compressed local file path,
  /// original and compressed sizes for analytics.
  Future<CapturedPhoto?> capturePhoto({
    required String photoType,
    CameraDevice preferredCamera = CameraDevice.rear,
  }) async {
    final XFile? image = await _picker.pickImage(
      source: ImageSource.camera,
      preferredCameraDevice: preferredCamera,
      maxWidth: maxDimension.toDouble(),
      maxHeight: maxDimension.toDouble(),
      imageQuality: jpegQuality,
    );

    if (image == null) return null; // User cancelled

    // Read the compressed image
    final bytes = await image.readAsBytes();

    // Save to app-local directory with a unique name
    final localDir = await _getPhotoDirectory();
    final filename = '${photoType.toLowerCase()}_${_uuid.v4()}.jpg';
    final localPath = p.join(localDir.path, filename);
    final localFile = File(localPath);
    await localFile.writeAsBytes(bytes);

    return CapturedPhoto(
      localPath: localPath,
      photoType: photoType,
      sizeBytes: bytes.length,
      capturedAt: DateTime.now(),
    );
  }

  /// Pick a photo from the gallery (for cases where camera is unavailable)
  Future<CapturedPhoto?> pickFromGallery({
    required String photoType,
  }) async {
    final XFile? image = await _picker.pickImage(
      source: ImageSource.gallery,
      maxWidth: maxDimension.toDouble(),
      maxHeight: maxDimension.toDouble(),
      imageQuality: jpegQuality,
    );

    if (image == null) return null;

    final bytes = await image.readAsBytes();

    final localDir = await _getPhotoDirectory();
    final filename = '${photoType.toLowerCase()}_${_uuid.v4()}.jpg';
    final localPath = p.join(localDir.path, filename);
    final localFile = File(localPath);
    await localFile.writeAsBytes(bytes);

    return CapturedPhoto(
      localPath: localPath,
      photoType: photoType,
      sizeBytes: bytes.length,
      capturedAt: DateTime.now(),
    );
  }

  /// Delete a local photo file (cleanup after successful sync)
  Future<void> deleteLocal(String localPath) async {
    final file = File(localPath);
    if (await file.exists()) {
      await file.delete();
    }
  }

  /// Get total size of all unsynced photos (for sync status display)
  Future<int> getUnsyncedPhotosSizeBytes(List<String> localPaths) async {
    int total = 0;
    for (final path in localPaths) {
      final file = File(path);
      if (await file.exists()) {
        total += await file.length();
      }
    }
    return total;
  }

  /// Get the app-local directory for storing captured photos
  Future<Directory> _getPhotoDirectory() async {
    final appDir = await getApplicationDocumentsDirectory();
    final photoDir = Directory(p.join(appDir.path, 'ft360_photos'));
    if (!await photoDir.exists()) {
      await photoDir.create(recursive: true);
    }
    return photoDir;
  }
}

/// Represents a captured and compressed photo on the local filesystem
class CapturedPhoto {
  final String localPath;
  final String photoType;
  final int sizeBytes;
  final DateTime capturedAt;

  const CapturedPhoto({
    required this.localPath,
    required this.photoType,
    required this.sizeBytes,
    required this.capturedAt,
  });

  /// Human-readable file size (e.g., "342 KB")
  String get formattedSize {
    if (sizeBytes < 1024) return '$sizeBytes B';
    if (sizeBytes < 1024 * 1024) return '${(sizeBytes / 1024).toStringAsFixed(0)} KB';
    return '${(sizeBytes / (1024 * 1024)).toStringAsFixed(1)} MB';
  }
}
