import 'package:drift/drift.dart';
import 'dart:io';
import 'package:drift/native.dart';
import 'package:path_provider/path_provider.dart';
import 'package:path/path.dart' as p;

part 'database.g.dart';

// ════════════════════════════════════════════════════════════
// TABLES — Mirror the PostgreSQL schema for offline-first
// ════════════════════════════════════════════════════════════

class Organizations extends Table {
  TextColumn get id => text()();
  TextColumn get name => text()();
  TextColumn get code => text()();
  TextColumn get country => text().withDefault(const Constant('HT'))();
  TextColumn get currency => text().withDefault(const Constant('HTG'))();
  TextColumn get timezone => text().withDefault(const Constant('America/Port-au-Prince'))();
  BoolColumn get isActive => boolean().withDefault(const Constant(true))();
  DateTimeColumn get createdAt => dateTime()();
  DateTimeColumn get updatedAt => dateTime()();

  @override
  Set<Column> get primaryKey => {id};
}

class Users extends Table {
  TextColumn get id => text()();
  TextColumn get organizationId => text().references(Organizations, #id)();
  TextColumn get firebaseUid => text().unique()();
  TextColumn get email => text().nullable()();
  TextColumn get phone => text().nullable()();
  TextColumn get fullName => text()();
  TextColumn get role => text()(); // DRIVER, DISPATCHER, SUPERVISOR, etc.
  TextColumn get preferredLang => text().withDefault(const Constant('fr'))();
  BoolColumn get isActive => boolean().withDefault(const Constant(true))();
  DateTimeColumn get lastLoginAt => dateTime().nullable()();
  DateTimeColumn get createdAt => dateTime()();
  DateTimeColumn get updatedAt => dateTime()();

  @override
  Set<Column> get primaryKey => {id};
}

class Stations extends Table {
  TextColumn get id => text()();
  TextColumn get organizationId => text().references(Organizations, #id)();
  TextColumn get name => text()();
  TextColumn get code => text()();
  TextColumn get type => text()(); // TERMINAL, GAS_STATION
  TextColumn get zone => text().nullable()();
  TextColumn get address => text().nullable()();
  RealColumn get gpsLat => real()();
  RealColumn get gpsLng => real()();
  IntColumn get geofenceRadiusM => integer().withDefault(const Constant(200))();
  BoolColumn get isActive => boolean().withDefault(const Constant(true))();
  DateTimeColumn get createdAt => dateTime()();
  DateTimeColumn get updatedAt => dateTime()();

  @override
  Set<Column> get primaryKey => {id};
}

class Trucks extends Table {
  TextColumn get id => text()();
  TextColumn get organizationId => text().references(Organizations, #id)();
  TextColumn get plateNumber => text()();
  IntColumn get capacityLiters => integer().nullable()();
  IntColumn get compartments => integer().withDefault(const Constant(1))();
  TextColumn get driverId => text().nullable().references(Users, #id)();
  TextColumn get status => text().withDefault(const Constant('AVAILABLE'))();
  RealColumn get currentLat => real().nullable()();
  RealColumn get currentLng => real().nullable()();
  DateTimeColumn get lastGpsAt => dateTime().nullable()();
  BoolColumn get isActive => boolean().withDefault(const Constant(true))();
  DateTimeColumn get createdAt => dateTime()();
  DateTimeColumn get updatedAt => dateTime()();

  @override
  Set<Column> get primaryKey => {id};
}

class S2lChecklists extends Table {
  TextColumn get id => text()();
  TextColumn get organizationId => text().references(Organizations, #id)();
  TextColumn get truckId => text().references(Trucks, #id)();
  TextColumn get driverId => text().references(Users, #id)();
  TextColumn get stationId => text().references(Stations, #id)();
  TextColumn get status => text().withDefault(const Constant('DRAFT'))();
  TextColumn get checklistData => text()(); // JSON serialized
  BoolColumn get allItemsPass => boolean().withDefault(const Constant(false))();
  TextColumn get signatureUrl => text().nullable()();
  DateTimeColumn get submittedAt => dateTime().nullable()();
  TextColumn get reviewedBy => text().nullable()();
  DateTimeColumn get reviewedAt => dateTime().nullable()();
  TextColumn get reviewNotes => text().nullable()();
  RealColumn get gpsLat => real().nullable()();
  RealColumn get gpsLng => real().nullable()();
  BoolColumn get isWithinGeofence => boolean().nullable()();
  BoolColumn get offlineCreated => boolean().withDefault(const Constant(true))();
  TextColumn get syncId => text().nullable()();
  BoolColumn get isSynced => boolean().withDefault(const Constant(false))();
  DateTimeColumn get createdAt => dateTime()();
  DateTimeColumn get updatedAt => dateTime()();

  @override
  Set<Column> get primaryKey => {id};
}

class S2lPhotos extends Table {
  TextColumn get id => text()();
  TextColumn get s2lId => text().references(S2lChecklists, #id)();
  TextColumn get photoType => text()();
  TextColumn get localPath => text()(); // local file path
  TextColumn get storagePath => text().nullable()(); // Cloud Storage path (after upload)
  IntColumn get fileSizeBytes => integer().nullable()();
  RealColumn get gpsLat => real().nullable()();
  RealColumn get gpsLng => real().nullable()();
  DateTimeColumn get capturedAt => dateTime()();
  DateTimeColumn get uploadedAt => dateTime().nullable()();
  BoolColumn get isSynced => boolean().withDefault(const Constant(false))();
  DateTimeColumn get createdAt => dateTime()();

  @override
  Set<Column> get primaryKey => {id};
}

class Manifests extends Table {
  TextColumn get id => text()();
  TextColumn get organizationId => text().references(Organizations, #id)();
  TextColumn get manifestNumber => text()();
  TextColumn get s2lId => text().references(S2lChecklists, #id)();
  TextColumn get truckId => text().references(Trucks, #id)();
  TextColumn get driverId => text().references(Users, #id)();
  TextColumn get originStationId => text().references(Stations, #id)();
  TextColumn get destStationId => text().references(Stations, #id)();
  TextColumn get productType => text()();
  RealColumn get volumeLoadedLiters => real().nullable()();
  RealColumn get volumeDischargedLiters => real().nullable()();
  RealColumn get volumeVariancePct => real().nullable()();
  TextColumn get status => text().withDefault(const Constant('CREATED'))();
  DateTimeColumn get loadedAt => dateTime().nullable()();
  DateTimeColumn get departedAt => dateTime().nullable()();
  DateTimeColumn get arrivedAt => dateTime().nullable()();
  DateTimeColumn get dischargedAt => dateTime().nullable()();
  DateTimeColumn get completedAt => dateTime().nullable()();
  BoolColumn get offlineCreated => boolean().withDefault(const Constant(true))();
  TextColumn get syncId => text().nullable()();
  BoolColumn get isSynced => boolean().withDefault(const Constant(false))();
  DateTimeColumn get createdAt => dateTime()();
  DateTimeColumn get updatedAt => dateTime()();

  @override
  Set<Column> get primaryKey => {id};
}

class GpsLogs extends Table {
  TextColumn get id => text()();
  TextColumn get truckId => text().references(Trucks, #id)();
  RealColumn get lat => real()();
  RealColumn get lng => real()();
  RealColumn get speedKmh => real().nullable()();
  RealColumn get heading => real().nullable()();
  RealColumn get accuracyM => real().nullable()();
  RealColumn get altitudeM => real().nullable()();
  DateTimeColumn get recordedAt => dateTime()();
  BoolColumn get isSynced => boolean().withDefault(const Constant(false))();
  DateTimeColumn get createdAt => dateTime()();

  @override
  Set<Column> get primaryKey => {id};
}

/// Sync queue — tracks pending offline operations
class SyncQueue extends Table {
  IntColumn get id => integer().autoIncrement()();
  TextColumn get syncId => text()();
  TextColumn get operation => text()(); // CREATE, UPDATE, DELETE
  TextColumn get entityType => text()(); // s2l, manifest, gps_log
  TextColumn get entityId => text()();
  TextColumn get payload => text()(); // JSON serialized
  IntColumn get retryCount => integer().withDefault(const Constant(0))();
  TextColumn get status => text().withDefault(const Constant('PENDING'))(); // PENDING, IN_PROGRESS, COMPLETED, FAILED
  TextColumn get errorMessage => text().nullable()();
  DateTimeColumn get queuedAt => dateTime()();
  DateTimeColumn get processedAt => dateTime().nullable()();
}

// ════════════════════════════════════════════════════════════
// DATABASE
// ════════════════════════════════════════════════════════════

@DriftDatabase(tables: [
  Organizations,
  Users,
  Stations,
  Trucks,
  S2lChecklists,
  S2lPhotos,
  Manifests,
  GpsLogs,
  SyncQueue,
])
class AppDatabase extends _$AppDatabase {
  AppDatabase() : super(_openConnection());

  @override
  int get schemaVersion => 1;

  @override
  MigrationStrategy get migration {
    return MigrationStrategy(
      onCreate: (Migrator m) async {
        await m.createAll();
      },
      onUpgrade: (Migrator m, int from, int to) async {
        // Future migrations go here
      },
    );
  }
}

LazyDatabase _openConnection() {
  return LazyDatabase(() async {
    final dbFolder = await getApplicationDocumentsDirectory();
    final file = File(p.join(dbFolder.path, 'ft360.sqlite'));
    return NativeDatabase.createInBackground(file);
  });
}
