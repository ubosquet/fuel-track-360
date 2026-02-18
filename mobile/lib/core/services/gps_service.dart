import 'package:geolocator/geolocator.dart';

/// GPS Service — Handles location permissions and tracking
class GpsService {
  /// Check and request location permissions
  static Future<bool> ensurePermissions() async {
    bool serviceEnabled = await Geolocator.isLocationServiceEnabled();
    if (!serviceEnabled) return false;

    LocationPermission permission = await Geolocator.checkPermission();
    if (permission == LocationPermission.denied) {
      permission = await Geolocator.requestPermission();
      if (permission == LocationPermission.denied) return false;
    }
    if (permission == LocationPermission.deniedForever) return false;
    return true;
  }

  /// Get current position
  static Future<Position?> getCurrentPosition() async {
    if (!await ensurePermissions()) return null;
    return Geolocator.getCurrentPosition(
      locationSettings: const LocationSettings(
        accuracy: LocationAccuracy.high,
        distanceFilter: 10, // meters
      ),
    );
  }

  /// Start background tracking (for en-route logging)
  static Stream<Position> getPositionStream() {
    return Geolocator.getPositionStream(
      locationSettings: const LocationSettings(
        accuracy: LocationAccuracy.high,
        distanceFilter: 50, // Log every 50m
      ),
    );
  }

  /// Calculate distance between two points (meters)
  static double distanceBetween(double lat1, double lng1, double lat2, double lng2) {
    return Geolocator.distanceBetween(lat1, lng1, lat2, lng2);
  }

  /// Check if position is within a geofence
  static bool isWithinGeofence({
    required double lat,
    required double lng,
    required double fenceLat,
    required double fenceLng,
    required double radiusMeters,
  }) {
    final distance = distanceBetween(lat, lng, fenceLat, fenceLng);
    return distance <= radiusMeters;
  }
}
