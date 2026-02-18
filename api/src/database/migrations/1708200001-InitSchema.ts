import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Initial database schema for Fuel-Track-360
 * Creates all tables, indexes, and constraints
 */
export class InitSchema1708200001 implements MigrationInterface {
    name = 'InitSchema1708200001';

    public async up(queryRunner: QueryRunner): Promise<void> {
        // ──────────────────────────────────────────────
        // 1. Extensions
        // ──────────────────────────────────────────────
        await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);
        await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "pgcrypto"`);

        // ──────────────────────────────────────────────
        // 2. ENUMs
        // ──────────────────────────────────────────────
        await queryRunner.query(`
      CREATE TYPE "user_role_enum" AS ENUM (
        'DRIVER', 'DISPATCHER', 'SUPERVISOR', 'FINANCE', 'ADMIN', 'OWNER'
      )
    `);
        await queryRunner.query(`
      CREATE TYPE "preferred_lang_enum" AS ENUM ('fr', 'en', 'ht')
    `);
        await queryRunner.query(`
      CREATE TYPE "truck_status_enum" AS ENUM (
        'AVAILABLE', 'LOADING', 'IN_TRANSIT', 'UNLOADING', 'MAINTENANCE', 'OUT_OF_SERVICE'
      )
    `);
        await queryRunner.query(`
      CREATE TYPE "s2l_status_enum" AS ENUM (
        'DRAFT', 'SUBMITTED', 'APPROVED', 'REJECTED', 'EXPIRED'
      )
    `);
        await queryRunner.query(`
      CREATE TYPE "s2l_photo_type_enum" AS ENUM (
        'TRUCK_FRONT', 'TRUCK_REAR', 'TRUCK_LEFT', 'TRUCK_RIGHT',
        'SEAL', 'VALVE', 'COMPARTMENT', 'DOCUMENT', 'OTHER'
      )
    `);
        await queryRunner.query(`
      CREATE TYPE "manifest_status_enum" AS ENUM (
        'CREATED', 'LOADING', 'IN_TRANSIT', 'ARRIVED', 'DISCHARGING',
        'COMPLETED', 'FLAGGED', 'CANCELLED'
      )
    `);
        await queryRunner.query(`
      CREATE TYPE "product_type_enum" AS ENUM (
        'GASOLINE', 'DIESEL', 'KEROSENE', 'LPG'
      )
    `);
        await queryRunner.query(`
      CREATE TYPE "station_type_enum" AS ENUM ('TERMINAL', 'GAS_STATION')
    `);
        await queryRunner.query(`
      CREATE TYPE "geofence_type_enum" AS ENUM ('CIRCLE', 'POLYGON')
    `);

        // ──────────────────────────────────────────────
        // 3. Organizations
        // ──────────────────────────────────────────────
        await queryRunner.query(`
      CREATE TABLE "organizations" (
        "id"          UUID DEFAULT uuid_generate_v4() NOT NULL,
        "name"        VARCHAR(255) NOT NULL,
        "code"        VARCHAR(50) NOT NULL UNIQUE,
        "country"     VARCHAR(5) NOT NULL DEFAULT 'HT',
        "currency"    VARCHAR(5) NOT NULL DEFAULT 'HTG',
        "timezone"    VARCHAR(50) NOT NULL DEFAULT 'America/Port-au-Prince',
        "is_active"   BOOLEAN NOT NULL DEFAULT true,
        "created_at"  TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_at"  TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "PK_organizations" PRIMARY KEY ("id")
      )
    `);

        // ──────────────────────────────────────────────
        // 4. Stations
        // ──────────────────────────────────────────────
        await queryRunner.query(`
      CREATE TABLE "stations" (
        "id"                UUID DEFAULT uuid_generate_v4() NOT NULL,
        "organization_id"   UUID NOT NULL,
        "name"              VARCHAR(255) NOT NULL,
        "code"              VARCHAR(50) NOT NULL,
        "type"              "station_type_enum" NOT NULL DEFAULT 'GAS_STATION',
        "zone"              VARCHAR(50),
        "address"           TEXT,
        "gps_lat"           DECIMAL(10,7) NOT NULL,
        "gps_lng"           DECIMAL(10,7) NOT NULL,
        "geofence_radius_m" INTEGER NOT NULL DEFAULT 200,
        "is_active"         BOOLEAN NOT NULL DEFAULT true,
        "created_at"        TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_at"        TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "PK_stations" PRIMARY KEY ("id"),
        CONSTRAINT "FK_stations_org" FOREIGN KEY ("organization_id")
          REFERENCES "organizations"("id") ON DELETE CASCADE,
        CONSTRAINT "UQ_station_code_org" UNIQUE ("organization_id", "code")
      )
    `);
        await queryRunner.query(`
      CREATE INDEX "IDX_stations_org" ON "stations" ("organization_id")
    `);

        // ──────────────────────────────────────────────
        // 5. Users
        // ──────────────────────────────────────────────
        await queryRunner.query(`
      CREATE TABLE "users" (
        "id"              UUID DEFAULT uuid_generate_v4() NOT NULL,
        "organization_id" UUID NOT NULL,
        "firebase_uid"    VARCHAR(128) NOT NULL UNIQUE,
        "email"           VARCHAR(255),
        "phone"           VARCHAR(30),
        "full_name"       VARCHAR(255) NOT NULL,
        "role"            "user_role_enum" NOT NULL DEFAULT 'DRIVER',
        "preferred_lang"  "preferred_lang_enum" NOT NULL DEFAULT 'fr',
        "is_active"       BOOLEAN NOT NULL DEFAULT true,
        "last_login_at"   TIMESTAMPTZ,
        "created_at"      TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_at"      TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "PK_users" PRIMARY KEY ("id"),
        CONSTRAINT "FK_users_org" FOREIGN KEY ("organization_id")
          REFERENCES "organizations"("id") ON DELETE CASCADE
      )
    `);
        await queryRunner.query(`
      CREATE INDEX "IDX_users_firebase" ON "users" ("firebase_uid")
    `);
        await queryRunner.query(`
      CREATE INDEX "IDX_users_org" ON "users" ("organization_id")
    `);
        await queryRunner.query(`
      CREATE INDEX "IDX_users_role" ON "users" ("role")
    `);

        // ──────────────────────────────────────────────
        // 6. Trucks
        // ──────────────────────────────────────────────
        await queryRunner.query(`
      CREATE TABLE "trucks" (
        "id"              UUID DEFAULT uuid_generate_v4() NOT NULL,
        "organization_id" UUID NOT NULL,
        "plate_number"    VARCHAR(20) NOT NULL,
        "capacity_liters" INTEGER,
        "compartments"    INTEGER DEFAULT 1,
        "driver_id"       UUID,
        "status"          "truck_status_enum" NOT NULL DEFAULT 'AVAILABLE',
        "current_lat"     DECIMAL(10,7),
        "current_lng"     DECIMAL(10,7),
        "last_gps_at"     TIMESTAMPTZ,
        "is_active"       BOOLEAN NOT NULL DEFAULT true,
        "created_at"      TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_at"      TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "PK_trucks" PRIMARY KEY ("id"),
        CONSTRAINT "FK_trucks_org" FOREIGN KEY ("organization_id")
          REFERENCES "organizations"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_trucks_driver" FOREIGN KEY ("driver_id")
          REFERENCES "users"("id") ON DELETE SET NULL,
        CONSTRAINT "UQ_truck_plate_org" UNIQUE ("organization_id", "plate_number")
      )
    `);
        await queryRunner.query(`
      CREATE INDEX "IDX_trucks_org" ON "trucks" ("organization_id")
    `);
        await queryRunner.query(`
      CREATE INDEX "IDX_trucks_status" ON "trucks" ("status")
    `);

        // ──────────────────────────────────────────────
        // 7. GPS Logs (high-volume, time-partitioned ready)
        // ──────────────────────────────────────────────
        await queryRunner.query(`
      CREATE TABLE "gps_logs" (
        "id"          UUID DEFAULT uuid_generate_v4() NOT NULL,
        "truck_id"    UUID NOT NULL,
        "lat"         DECIMAL(10,7) NOT NULL,
        "lng"         DECIMAL(10,7) NOT NULL,
        "speed_kmh"   DECIMAL(6,2),
        "heading"     DECIMAL(5,2),
        "accuracy_m"  DECIMAL(6,2),
        "altitude_m"  DECIMAL(8,2),
        "recorded_at" TIMESTAMPTZ NOT NULL,
        "synced_at"   TIMESTAMPTZ DEFAULT now(),
        "created_at"  TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "PK_gps_logs" PRIMARY KEY ("id"),
        CONSTRAINT "FK_gps_logs_truck" FOREIGN KEY ("truck_id")
          REFERENCES "trucks"("id") ON DELETE CASCADE
      )
    `);
        await queryRunner.query(`
      CREATE INDEX "IDX_gps_logs_truck_time" ON "gps_logs" ("truck_id", "recorded_at" DESC)
    `);

        // ──────────────────────────────────────────────
        // 8. Geofences
        // ──────────────────────────────────────────────
        await queryRunner.query(`
      CREATE TABLE "geofences" (
        "id"            UUID DEFAULT uuid_generate_v4() NOT NULL,
        "organization_id" UUID NOT NULL,
        "station_id"    UUID NOT NULL,
        "name"          VARCHAR(255) NOT NULL,
        "geofence_type" "geofence_type_enum" NOT NULL DEFAULT 'CIRCLE',
        "center_lat"    DECIMAL(10,7) NOT NULL,
        "center_lng"    DECIMAL(10,7) NOT NULL,
        "radius_m"      INTEGER DEFAULT 200,
        "polygon_coords" JSONB,
        "is_active"     BOOLEAN NOT NULL DEFAULT true,
        "created_at"    TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_at"    TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "PK_geofences" PRIMARY KEY ("id"),
        CONSTRAINT "FK_geofences_org" FOREIGN KEY ("organization_id")
          REFERENCES "organizations"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_geofences_station" FOREIGN KEY ("station_id")
          REFERENCES "stations"("id") ON DELETE CASCADE
      )
    `);
        await queryRunner.query(`
      CREATE INDEX "IDX_geofences_station" ON "geofences" ("station_id")
    `);

        // ──────────────────────────────────────────────
        // 9. S2L Checklists
        // ──────────────────────────────────────────────
        await queryRunner.query(`
      CREATE TABLE "s2l_checklists" (
        "id"                UUID DEFAULT uuid_generate_v4() NOT NULL,
        "organization_id"   UUID NOT NULL,
        "truck_id"          UUID NOT NULL,
        "driver_id"         UUID NOT NULL,
        "station_id"        UUID NOT NULL,
        "status"            "s2l_status_enum" NOT NULL DEFAULT 'DRAFT',
        "checklist_data"    JSONB NOT NULL DEFAULT '[]',
        "all_items_pass"    BOOLEAN NOT NULL DEFAULT false,
        "signature_url"     TEXT,
        "submitted_at"      TIMESTAMPTZ,
        "reviewed_by"       UUID,
        "reviewed_at"       TIMESTAMPTZ,
        "review_notes"      TEXT,
        "gps_lat"           DECIMAL(10,7),
        "gps_lng"           DECIMAL(10,7),
        "is_within_geofence" BOOLEAN,
        "offline_created"   BOOLEAN NOT NULL DEFAULT false,
        "sync_id"           UUID,
        "created_at"        TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_at"        TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "PK_s2l_checklists" PRIMARY KEY ("id"),
        CONSTRAINT "FK_s2l_org" FOREIGN KEY ("organization_id")
          REFERENCES "organizations"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_s2l_truck" FOREIGN KEY ("truck_id")
          REFERENCES "trucks"("id") ON DELETE RESTRICT,
        CONSTRAINT "FK_s2l_driver" FOREIGN KEY ("driver_id")
          REFERENCES "users"("id") ON DELETE RESTRICT,
        CONSTRAINT "FK_s2l_station" FOREIGN KEY ("station_id")
          REFERENCES "stations"("id") ON DELETE RESTRICT,
        CONSTRAINT "FK_s2l_reviewer" FOREIGN KEY ("reviewed_by")
          REFERENCES "users"("id") ON DELETE SET NULL
      )
    `);
        await queryRunner.query(`
      CREATE INDEX "IDX_s2l_org_status" ON "s2l_checklists" ("organization_id", "status")
    `);
        await queryRunner.query(`
      CREATE INDEX "IDX_s2l_driver" ON "s2l_checklists" ("driver_id")
    `);
        await queryRunner.query(`
      CREATE INDEX "IDX_s2l_truck" ON "s2l_checklists" ("truck_id")
    `);
        await queryRunner.query(`
      CREATE UNIQUE INDEX "IDX_s2l_sync_id" ON "s2l_checklists" ("sync_id") WHERE "sync_id" IS NOT NULL
    `);

        // ──────────────────────────────────────────────
        // 10. S2L Photos
        // ──────────────────────────────────────────────
        await queryRunner.query(`
      CREATE TABLE "s2l_photos" (
        "id"              UUID DEFAULT uuid_generate_v4() NOT NULL,
        "s2l_id"          UUID NOT NULL,
        "photo_type"      "s2l_photo_type_enum" NOT NULL,
        "storage_path"    TEXT NOT NULL,
        "file_size_bytes" INTEGER,
        "gps_lat"         DECIMAL(10,7),
        "gps_lng"         DECIMAL(10,7),
        "captured_at"     TIMESTAMPTZ NOT NULL,
        "uploaded_at"     TIMESTAMPTZ DEFAULT now(),
        "created_at"      TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "PK_s2l_photos" PRIMARY KEY ("id"),
        CONSTRAINT "FK_s2l_photos_s2l" FOREIGN KEY ("s2l_id")
          REFERENCES "s2l_checklists"("id") ON DELETE CASCADE
      )
    `);
        await queryRunner.query(`
      CREATE INDEX "IDX_s2l_photos_s2l" ON "s2l_photos" ("s2l_id")
    `);

        // ──────────────────────────────────────────────
        // 11. Manifests
        // ──────────────────────────────────────────────
        await queryRunner.query(`
      CREATE TABLE "manifests" (
        "id"                      UUID DEFAULT uuid_generate_v4() NOT NULL,
        "organization_id"         UUID NOT NULL,
        "manifest_number"         VARCHAR(30) NOT NULL UNIQUE,
        "s2l_id"                  UUID NOT NULL,
        "truck_id"                UUID NOT NULL,
        "driver_id"               UUID NOT NULL,
        "origin_station_id"       UUID NOT NULL,
        "dest_station_id"         UUID NOT NULL,
        "product_type"            "product_type_enum" NOT NULL,
        "volume_loaded_liters"    DECIMAL(10,2),
        "volume_discharged_liters" DECIMAL(10,2),
        "volume_variance_pct"     DECIMAL(5,2),
        "status"                  "manifest_status_enum" NOT NULL DEFAULT 'CREATED',
        "loaded_at"               TIMESTAMPTZ,
        "departed_at"             TIMESTAMPTZ,
        "arrived_at"              TIMESTAMPTZ,
        "discharged_at"           TIMESTAMPTZ,
        "completed_at"            TIMESTAMPTZ,
        "offline_created"         BOOLEAN NOT NULL DEFAULT false,
        "sync_id"                 UUID,
        "created_at"              TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_at"              TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "PK_manifests" PRIMARY KEY ("id"),
        CONSTRAINT "FK_manifest_org" FOREIGN KEY ("organization_id")
          REFERENCES "organizations"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_manifest_s2l" FOREIGN KEY ("s2l_id")
          REFERENCES "s2l_checklists"("id") ON DELETE RESTRICT,
        CONSTRAINT "FK_manifest_truck" FOREIGN KEY ("truck_id")
          REFERENCES "trucks"("id") ON DELETE RESTRICT,
        CONSTRAINT "FK_manifest_driver" FOREIGN KEY ("driver_id")
          REFERENCES "users"("id") ON DELETE RESTRICT,
        CONSTRAINT "FK_manifest_origin" FOREIGN KEY ("origin_station_id")
          REFERENCES "stations"("id") ON DELETE RESTRICT,
        CONSTRAINT "FK_manifest_dest" FOREIGN KEY ("dest_station_id")
          REFERENCES "stations"("id") ON DELETE RESTRICT
      )
    `);
        await queryRunner.query(`
      CREATE INDEX "IDX_manifest_org_status" ON "manifests" ("organization_id", "status")
    `);
        await queryRunner.query(`
      CREATE INDEX "IDX_manifest_s2l" ON "manifests" ("s2l_id")
    `);
        await queryRunner.query(`
      CREATE INDEX "IDX_manifest_driver" ON "manifests" ("driver_id")
    `);
        await queryRunner.query(`
      CREATE UNIQUE INDEX "IDX_manifest_sync_id" ON "manifests" ("sync_id") WHERE "sync_id" IS NOT NULL
    `);

        // ──────────────────────────────────────────────
        // 12. Audit Events (immutable — INSERT ONLY)
        // ──────────────────────────────────────────────
        await queryRunner.query(`
      CREATE TABLE "audit_events" (
        "id"                UUID DEFAULT uuid_generate_v4() NOT NULL,
        "organization_id"   UUID NOT NULL,
        "entity_type"       VARCHAR(50) NOT NULL,
        "entity_id"         VARCHAR(255) NOT NULL,
        "event_type"        VARCHAR(100) NOT NULL,
        "actor_id"          UUID NOT NULL,
        "actor_role"        VARCHAR(30) NOT NULL,
        "payload"           JSONB DEFAULT '{}',
        "gps_lat"           DECIMAL(10,7),
        "gps_lng"           DECIMAL(10,7),
        "ip_address"        VARCHAR(45),
        "user_agent"        TEXT,
        "created_at"        TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "PK_audit_events" PRIMARY KEY ("id")
      )
    `);
        await queryRunner.query(`
      CREATE INDEX "IDX_audit_org_entity" ON "audit_events" ("organization_id", "entity_type", "entity_id")
    `);
        await queryRunner.query(`
      CREATE INDEX "IDX_audit_actor" ON "audit_events" ("actor_id")
    `);
        await queryRunner.query(`
      CREATE INDEX "IDX_audit_time" ON "audit_events" ("created_at" DESC)
    `);

        // ──────────────────────────────────────────────
        // 13. Protect audit_events from UPDATE/DELETE
        // ──────────────────────────────────────────────
        await queryRunner.query(`
      CREATE OR REPLACE FUNCTION prevent_audit_modification()
      RETURNS TRIGGER AS $$
      BEGIN
        RAISE EXCEPTION 'Audit events are immutable and cannot be modified or deleted';
      END;
      $$ LANGUAGE plpgsql;
    `);
        await queryRunner.query(`
      CREATE TRIGGER trg_audit_no_update
        BEFORE UPDATE OR DELETE ON "audit_events"
        FOR EACH ROW
        EXECUTE FUNCTION prevent_audit_modification();
    `);

        // ──────────────────────────────────────────────
        // 14. Auto-update updated_at trigger
        // ──────────────────────────────────────────────
        await queryRunner.query(`
      CREATE OR REPLACE FUNCTION update_updated_at_column()
      RETURNS TRIGGER AS $$
      BEGIN
        NEW.updated_at = now();
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;
    `);

        const tablesWithUpdatedAt = [
            'organizations', 'stations', 'users', 'trucks',
            'geofences', 's2l_checklists', 'manifests',
        ];
        for (const table of tablesWithUpdatedAt) {
            await queryRunner.query(`
        CREATE TRIGGER trg_${table}_updated_at
          BEFORE UPDATE ON "${table}"
          FOR EACH ROW
          EXECUTE FUNCTION update_updated_at_column();
      `);
        }
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Drop triggers first
        const tablesWithUpdatedAt = [
            'organizations', 'stations', 'users', 'trucks',
            'geofences', 's2l_checklists', 'manifests',
        ];
        for (const table of tablesWithUpdatedAt) {
            await queryRunner.query(`DROP TRIGGER IF EXISTS trg_${table}_updated_at ON "${table}"`);
        }
        await queryRunner.query(`DROP TRIGGER IF EXISTS trg_audit_no_update ON "audit_events"`);
        await queryRunner.query(`DROP FUNCTION IF EXISTS update_updated_at_column()`);
        await queryRunner.query(`DROP FUNCTION IF EXISTS prevent_audit_modification()`);

        // Drop tables in reverse dependency order
        await queryRunner.query(`DROP TABLE IF EXISTS "audit_events" CASCADE`);
        await queryRunner.query(`DROP TABLE IF EXISTS "manifests" CASCADE`);
        await queryRunner.query(`DROP TABLE IF EXISTS "s2l_photos" CASCADE`);
        await queryRunner.query(`DROP TABLE IF EXISTS "s2l_checklists" CASCADE`);
        await queryRunner.query(`DROP TABLE IF EXISTS "geofences" CASCADE`);
        await queryRunner.query(`DROP TABLE IF EXISTS "gps_logs" CASCADE`);
        await queryRunner.query(`DROP TABLE IF EXISTS "trucks" CASCADE`);
        await queryRunner.query(`DROP TABLE IF EXISTS "users" CASCADE`);
        await queryRunner.query(`DROP TABLE IF EXISTS "stations" CASCADE`);
        await queryRunner.query(`DROP TABLE IF EXISTS "organizations" CASCADE`);

        // Drop ENUMs
        await queryRunner.query(`DROP TYPE IF EXISTS "geofence_type_enum"`);
        await queryRunner.query(`DROP TYPE IF EXISTS "station_type_enum"`);
        await queryRunner.query(`DROP TYPE IF EXISTS "product_type_enum"`);
        await queryRunner.query(`DROP TYPE IF EXISTS "manifest_status_enum"`);
        await queryRunner.query(`DROP TYPE IF EXISTS "s2l_photo_type_enum"`);
        await queryRunner.query(`DROP TYPE IF EXISTS "s2l_status_enum"`);
        await queryRunner.query(`DROP TYPE IF EXISTS "truck_status_enum"`);
        await queryRunner.query(`DROP TYPE IF EXISTS "preferred_lang_enum"`);
        await queryRunner.query(`DROP TYPE IF EXISTS "user_role_enum"`);
    }
}
