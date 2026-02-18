import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Seed demo organization, stations, and admin user for development.
 * This migration is ONLY for development/staging environments.
 */
export class SeedDemoData1708200002 implements MigrationInterface {
    name = 'SeedDemoData1708200002';

    public async up(queryRunner: QueryRunner): Promise<void> {
        // ── Demo Organization ──
        await queryRunner.query(`
      INSERT INTO "organizations" ("id", "name", "code", "country", "currency", "timezone")
      VALUES (
        'a0000000-0000-0000-0000-000000000001',
        'Petrocaribe Haiti Demo',
        'PCHDEMO',
        'HT',
        'HTG',
        'America/Port-au-Prince'
      )
      ON CONFLICT ("code") DO NOTHING
    `);

        // ── Demo Stations ──
        // Terminal (Thor)
        await queryRunner.query(`
      INSERT INTO "stations" ("id", "organization_id", "name", "code", "type", "zone", "gps_lat", "gps_lng", "geofence_radius_m")
      VALUES (
        'b0000000-0000-0000-0000-000000000001',
        'a0000000-0000-0000-0000-000000000001',
        'Terminal Thor',
        'THOR-001',
        'TERMINAL',
        'WEST',
        18.5393,
        -72.3366,
        300
      )
      ON CONFLICT ("organization_id", "code") DO NOTHING
    `);

        // Gas Station (Delmas)
        await queryRunner.query(`
      INSERT INTO "stations" ("id", "organization_id", "name", "code", "type", "zone", "gps_lat", "gps_lng", "geofence_radius_m")
      VALUES (
        'b0000000-0000-0000-0000-000000000002',
        'a0000000-0000-0000-0000-000000000001',
        'Station Delmas 33',
        'DLM-033',
        'GAS_STATION',
        'WEST',
        18.5471,
        -72.3124,
        150
      )
      ON CONFLICT ("organization_id", "code") DO NOTHING
    `);

        // Gas Station (Pétion-Ville)
        await queryRunner.query(`
      INSERT INTO "stations" ("id", "organization_id", "name", "code", "type", "zone", "gps_lat", "gps_lng", "geofence_radius_m")
      VALUES (
        'b0000000-0000-0000-0000-000000000003',
        'a0000000-0000-0000-0000-000000000001',
        'Station Pétion-Ville',
        'PTV-001',
        'GAS_STATION',
        'WEST',
        18.5125,
        -72.2854,
        150
      )
      ON CONFLICT ("organization_id", "code") DO NOTHING
    `);

        // Gas Station (Cap-Haïtien)
        await queryRunner.query(`
      INSERT INTO "stations" ("id", "organization_id", "name", "code", "type", "zone", "gps_lat", "gps_lng", "geofence_radius_m")
      VALUES (
        'b0000000-0000-0000-0000-000000000004',
        'a0000000-0000-0000-0000-000000000001',
        'Station Cap-Haïtien',
        'CAP-001',
        'GAS_STATION',
        'NORTH',
        19.7600,
        -72.2000,
        200
      )
      ON CONFLICT ("organization_id", "code") DO NOTHING
    `);

        // ── Demo Trucks ──
        await queryRunner.query(`
      INSERT INTO "trucks" ("id", "organization_id", "plate_number", "capacity_liters", "compartments", "status")
      VALUES
        ('c0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'AA-00001', 25000, 4, 'AVAILABLE'),
        ('c0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000001', 'AA-00002', 20000, 3, 'AVAILABLE'),
        ('c0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000001', 'BB-00001', 15000, 2, 'MAINTENANCE')
      ON CONFLICT ("organization_id", "plate_number") DO NOTHING
    `);

        // ── Demo Geofences ──
        await queryRunner.query(`
      INSERT INTO "geofences" ("id", "organization_id", "station_id", "name", "geofence_type", "center_lat", "center_lng", "radius_m")
      VALUES
        ('d0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001', 'Terminal Thor Perimeter', 'CIRCLE', 18.5393, -72.3366, 300),
        ('d0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000002', 'Delmas 33 Perimeter', 'CIRCLE', 18.5471, -72.3124, 150),
        ('d0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000003', 'Pétion-Ville Perimeter', 'CIRCLE', 18.5125, -72.2854, 150)
    `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DELETE FROM "geofences" WHERE "organization_id" = 'a0000000-0000-0000-0000-000000000001'`);
        await queryRunner.query(`DELETE FROM "trucks" WHERE "organization_id" = 'a0000000-0000-0000-0000-000000000001'`);
        await queryRunner.query(`DELETE FROM "stations" WHERE "organization_id" = 'a0000000-0000-0000-0000-000000000001'`);
        await queryRunner.query(`DELETE FROM "organizations" WHERE "id" = 'a0000000-0000-0000-0000-000000000001'`);
    }
}
