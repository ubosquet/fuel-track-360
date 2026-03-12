import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ManifestEntity } from '../manifest/entities/manifest.entity';
import { S2LChecklistEntity } from '../s2l/entities/s2l-checklist.entity';

// ─── SLA threshold ──────────────────────────────────────────────────────────
// A delivery is "on time" if transit time (departed → arrived) is ≤ 4 hours.
// Configurable here for future env-based override.
const ON_TIME_SLA_HOURS = 4;
const ON_TIME_SLA_MS = ON_TIME_SLA_HOURS * 60 * 60 * 1000;

// ─── Score formula weights ───────────────────────────────────────────────────
// Score = (on_time_rate * 0.5) + (precision_rate * 0.3) + (completion_rate * 0.2)
// All rates are 0–100. Final score is 0–100.
const W_ON_TIME = 0.5;
const W_PRECISION = 0.3;
const W_COMPLETION = 0.2;

// Precision: deliveries with volume_variance_pct ≤ 1% are "precise"
const PRECISION_THRESHOLD_PCT = 1.0;

// ─── DTOs / return types ─────────────────────────────────────────────────────

export interface AnalyticsPeriod {
    from: Date;
    to: Date;
}

export interface OrgOverview {
    period: { from: string; to: string };
    total_manifests: number;
    completed: number;
    flagged: number;
    cancelled: number;
    completion_rate_pct: number;
    on_time_rate_pct: number;
    avg_transit_time_minutes: number;
    avg_volume_variance_pct: number;
    total_volume_loaded_liters: number;
    total_volume_discharged_liters: number;
}

export interface DriverStats {
    driver_id: string;
    driver_name: string;
    total_deliveries: number;
    completed: number;
    flagged: number;
    on_time: number;
    on_time_rate_pct: number;
    completion_rate_pct: number;
    precision_rate_pct: number;
    avg_transit_time_minutes: number;
    avg_volume_variance_pct: number;
    score: number; // 0–100 composite
    rank?: number;
}

export interface DriverLeaderboardEntry {
    rank: number;
    label: string; // "Driver #1" for peers; full name for admin callers
    score: number;
    on_time_rate_pct: number;
    total_deliveries: number;
    is_self: boolean;
}

export interface StationStats {
    station_id: string;
    station_name: string;
    station_code: string;
    zone: string;
    departures: number;
    arrivals: number;
    avg_transit_time_minutes: number;
    flagged_arrivals: number;
    avg_volume_variance_pct: number;
}

export interface TruckStats {
    truck_id: string;
    plate_number: string;
    total_manifests: number;
    completed: number;
    flagged: number;
    avg_volume_variance_pct: number;
}

// ─── Service ─────────────────────────────────────────────────────────────────

@Injectable()
export class AnalyticsService {
    constructor(
        @InjectRepository(ManifestEntity)
        private readonly manifestRepo: Repository<ManifestEntity>,
        @InjectRepository(S2LChecklistEntity)
        private readonly s2lRepo: Repository<S2LChecklistEntity>,
    ) { }

    // ── helpers ─────────────────────────────────────────────────────────────

    private defaultPeriod(): { from: Date; to: Date } {
        const to = new Date();
        const from = new Date(to);
        from.setDate(from.getDate() - 30);
        return { from, to };
    }

    private parsePeriod(from?: string, to?: string): { from: Date; to: Date } {
        const p = this.defaultPeriod();
        if (from) {
            const d = new Date(from);
            if (isNaN(d.getTime())) throw new Error(`Invalid 'from' date: ${from}`);
            p.from = d;
        }
        if (to) {
            const d = new Date(to);
            if (isNaN(d.getTime())) throw new Error(`Invalid 'to' date: ${to}`);
            p.to = d;
        }
        // Cap range at 90 days to prevent runaway queries
        const MAX_RANGE_MS = 90 * 24 * 60 * 60 * 1000;
        if (p.to.getTime() - p.from.getTime() > MAX_RANGE_MS) {
            p.from = new Date(p.to.getTime() - MAX_RANGE_MS);
        }
        return p;
    }

    private computeScore(
        onTimeRate: number,
        precisionRate: number,
        completionRate: number,
    ): number {
        return Math.round(
            (onTimeRate * W_ON_TIME + precisionRate * W_PRECISION + completionRate * W_COMPLETION) * 10,
        ) / 10;
    }

    private pct(num: number, den: number): number {
        if (!den) return 0;
        return Math.round((num / den) * 1000) / 10; // 1 decimal
    }

    // ── Org Overview ─────────────────────────────────────────────────────────

    async getOrgOverview(
        organizationId: string,
        fromRaw?: string,
        toRaw?: string,
    ): Promise<OrgOverview> {
        const { from, to } = this.parsePeriod(fromRaw, toRaw);

        const manifests = await this.manifestRepo
            .createQueryBuilder('m')
            .where('m.organization_id = :organizationId', { organizationId })
            .andWhere('m.created_at BETWEEN :from AND :to', { from, to })
            .getMany();

        const completed = manifests.filter((m) => m.status === 'COMPLETED' || m.status === 'FLAGGED');
        const flagged = manifests.filter((m) => m.status === 'FLAGGED');
        const cancelled = manifests.filter((m) => m.status === 'CANCELLED');

        const transitTimes = completed
            .filter((m) => m.departed_at && m.arrived_at)
            .map((m) => new Date(m.arrived_at).getTime() - new Date(m.departed_at).getTime());

        const onTimeCount = transitTimes.filter((ms) => ms <= ON_TIME_SLA_MS).length;

        const variances = completed
            .filter((m) => m.volume_variance_pct != null)
            .map((m) => Number(m.volume_variance_pct));

        const totalLoaded = manifests.reduce((s, m) => s + (Number(m.volume_loaded_liters) || 0), 0);
        const totalDischarged = completed.reduce((s, m) => s + (Number(m.volume_discharged_liters) || 0), 0);

        return {
            period: { from: from.toISOString(), to: to.toISOString() },
            total_manifests: manifests.length,
            completed: completed.length,
            flagged: flagged.length,
            cancelled: cancelled.length,
            completion_rate_pct: this.pct(completed.length, manifests.length),
            on_time_rate_pct: this.pct(onTimeCount, transitTimes.length),
            avg_transit_time_minutes: transitTimes.length
                ? Math.round(transitTimes.reduce((a, b) => a + b, 0) / transitTimes.length / 60000)
                : 0,
            avg_volume_variance_pct: variances.length
                ? Math.round((variances.reduce((a, b) => a + b, 0) / variances.length) * 10) / 10
                : 0,
            total_volume_loaded_liters: Math.round(totalLoaded),
            total_volume_discharged_liters: Math.round(totalDischarged),
        };
    }

    // ── Driver analytics ──────────────────────────────────────────────────────

    async getDriversStats(
        organizationId: string,
        fromRaw?: string,
        toRaw?: string,
    ): Promise<DriverStats[]> {
        const { from, to } = this.parsePeriod(fromRaw, toRaw);

        const manifests = await this.manifestRepo
            .createQueryBuilder('m')
            .leftJoinAndSelect('m.driver', 'driver')
            .where('m.organization_id = :organizationId', { organizationId })
            .andWhere('m.created_at BETWEEN :from AND :to', { from, to })
            .getMany();

        // Group by driver
        const byDriver = new Map<string, ManifestEntity[]>();
        for (const m of manifests) {
            const key = m.driver_id;
            if (!byDriver.has(key)) byDriver.set(key, []);
            byDriver.get(key)!.push(m);
        }

        const stats: DriverStats[] = [];
        for (const [driverId, driverManifests] of byDriver.entries()) {
            const completed = driverManifests.filter(
                (m) => m.status === 'COMPLETED' || m.status === 'FLAGGED',
            );
            const flagged = driverManifests.filter((m) => m.status === 'FLAGGED');

            const transitTimes = completed
                .filter((m) => m.departed_at && m.arrived_at)
                .map((m) => new Date(m.arrived_at).getTime() - new Date(m.departed_at).getTime());

            const onTimeCount = transitTimes.filter((ms) => ms <= ON_TIME_SLA_MS).length;

            const variances = completed
                .filter((m) => m.volume_variance_pct != null)
                .map((m) => Number(m.volume_variance_pct));

            const preciseCount = variances.filter((v) => v <= PRECISION_THRESHOLD_PCT).length;

            const onTimeRate = this.pct(onTimeCount, transitTimes.length);
            const precisionRate = this.pct(preciseCount, variances.length);
            const completionRate = this.pct(completed.length, driverManifests.length);

            // Resolve name from first manifest's joined driver relation
            const driverName = driverManifests[0]?.driver?.full_name ?? driverId;

            stats.push({
                driver_id: driverId,
                driver_name: driverName,
                total_deliveries: driverManifests.length,
                completed: completed.length,
                flagged: flagged.length,
                on_time: onTimeCount,
                on_time_rate_pct: onTimeRate,
                completion_rate_pct: completionRate,
                precision_rate_pct: precisionRate,
                avg_transit_time_minutes: transitTimes.length
                    ? Math.round(transitTimes.reduce((a, b) => a + b, 0) / transitTimes.length / 60000)
                    : 0,
                avg_volume_variance_pct: variances.length
                    ? Math.round((variances.reduce((a, b) => a + b, 0) / variances.length) * 10) / 10
                    : 0,
                score: this.computeScore(onTimeRate, precisionRate, completionRate),
            });
        }

        // Sort desc by score
        stats.sort((a, b) => b.score - a.score);

        // Assign rank
        stats.forEach((s, i) => { s.rank = i + 1; });

        return stats;
    }

    // ── Driver self-report ────────────────────────────────────────────────────

    async getMyStats(
        driverId: string,
        organizationId: string,
        fromRaw?: string,
        toRaw?: string,
    ): Promise<{
        stats: DriverStats;
        rank: number;
        total_drivers: number;
        prev_period_score: number | null;
    }> {
        // Current period
        const allDrivers = await this.getDriversStats(organizationId, fromRaw, toRaw);
        const myStats = allDrivers.find((d) => d.driver_id === driverId);

        if (!myStats) {
            // Driver has no deliveries in this period — return empty stats
            return {
                stats: {
                    driver_id: driverId,
                    driver_name: '',
                    total_deliveries: 0,
                    completed: 0,
                    flagged: 0,
                    on_time: 0,
                    on_time_rate_pct: 0,
                    completion_rate_pct: 0,
                    precision_rate_pct: 0,
                    avg_transit_time_minutes: 0,
                    avg_volume_variance_pct: 0,
                    score: 0,
                    rank: allDrivers.length + 1,
                },
                rank: allDrivers.length + 1,
                total_drivers: allDrivers.length,
                prev_period_score: null,
            };
        }

        // Previous period — same duration, shifted back
        const { from, to } = this.parsePeriod(fromRaw, toRaw);
        const durationMs = to.getTime() - from.getTime();
        const prevFrom = new Date(from.getTime() - durationMs);
        const prevTo = new Date(from);
        const prevDrivers = await this.getDriversStats(
            organizationId,
            prevFrom.toISOString(),
            prevTo.toISOString(),
        );
        const prevMyStats = prevDrivers.find((d) => d.driver_id === driverId);

        return {
            stats: myStats,
            rank: myStats.rank!,
            total_drivers: allDrivers.length,
            prev_period_score: prevMyStats?.score ?? null,
        };
    }

    // ── Leaderboard (privacy-aware) ───────────────────────────────────────────

    async getLeaderboard(
        organizationId: string,
        requestingDriverId: string,
        isAdminCaller: boolean,
        fromRaw?: string,
        toRaw?: string,
    ): Promise<DriverLeaderboardEntry[]> {
        const all = await this.getDriversStats(organizationId, fromRaw, toRaw);

        return all.map((d) => ({
            rank: d.rank!,
            // Admins/supervisors see real names; drivers see anonymized labels except themselves
            label: isAdminCaller || d.driver_id === requestingDriverId
                ? d.driver_name
                : `Driver #${d.rank}`,
            score: d.score,
            on_time_rate_pct: d.on_time_rate_pct,
            total_deliveries: d.total_deliveries,
            is_self: d.driver_id === requestingDriverId,
        }));
    }

    // ── Station analytics ─────────────────────────────────────────────────────

    async getStationsStats(
        organizationId: string,
        fromRaw?: string,
        toRaw?: string,
    ): Promise<StationStats[]> {
        const { from, to } = this.parsePeriod(fromRaw, toRaw);

        const manifests = await this.manifestRepo
            .createQueryBuilder('m')
            .leftJoinAndSelect('m.origin_station', 'origin')
            .leftJoinAndSelect('m.dest_station', 'dest')
            .where('m.organization_id = :organizationId', { organizationId })
            .andWhere('m.created_at BETWEEN :from AND :to', { from, to })
            .getMany();

        const stationMap = new Map<string, {
            name: string; code: string; zone: string;
            departures: ManifestEntity[]; arrivals: ManifestEntity[];
        }>();

        for (const m of manifests) {
            // Origin
            if (m.origin_station_id) {
                if (!stationMap.has(m.origin_station_id)) {
                    stationMap.set(m.origin_station_id, {
                        name: m.origin_station?.name ?? m.origin_station_id,
                        code: m.origin_station?.code ?? '',
                        zone: m.origin_station?.zone ?? '',
                        departures: [],
                        arrivals: [],
                    });
                }
                stationMap.get(m.origin_station_id)!.departures.push(m);
            }
            // Destination
            if (m.dest_station_id) {
                if (!stationMap.has(m.dest_station_id)) {
                    stationMap.set(m.dest_station_id, {
                        name: m.dest_station?.name ?? m.dest_station_id,
                        code: m.dest_station?.code ?? '',
                        zone: m.dest_station?.zone ?? '',
                        departures: [],
                        arrivals: [],
                    });
                }
                stationMap.get(m.dest_station_id)!.arrivals.push(m);
            }
        }

        const stats: StationStats[] = [];
        for (const [stationId, data] of stationMap.entries()) {
            const completed = data.arrivals.filter(
                (m) => m.status === 'COMPLETED' || m.status === 'FLAGGED',
            );
            const flaggedArrivals = data.arrivals.filter((m) => m.status === 'FLAGGED');

            const transitTimes = completed
                .filter((m) => m.departed_at && m.arrived_at)
                .map((m) => new Date(m.arrived_at).getTime() - new Date(m.departed_at).getTime());

            const variances = completed
                .filter((m) => m.volume_variance_pct != null)
                .map((m) => Number(m.volume_variance_pct));

            stats.push({
                station_id: stationId,
                station_name: data.name,
                station_code: data.code,
                zone: data.zone,
                departures: data.departures.length,
                arrivals: data.arrivals.length,
                avg_transit_time_minutes: transitTimes.length
                    ? Math.round(transitTimes.reduce((a, b) => a + b, 0) / transitTimes.length / 60000)
                    : 0,
                flagged_arrivals: flaggedArrivals.length,
                avg_volume_variance_pct: variances.length
                    ? Math.round((variances.reduce((a, b) => a + b, 0) / variances.length) * 10) / 10
                    : 0,
            });
        }

        return stats.sort((a, b) => b.arrivals + b.departures - (a.arrivals + a.departures));
    }

    // ── Truck analytics ───────────────────────────────────────────────────────

    async getTrucksStats(
        organizationId: string,
        fromRaw?: string,
        toRaw?: string,
    ): Promise<TruckStats[]> {
        const { from, to } = this.parsePeriod(fromRaw, toRaw);

        const manifests = await this.manifestRepo
            .createQueryBuilder('m')
            .leftJoinAndSelect('m.truck', 'truck')
            .where('m.organization_id = :organizationId', { organizationId })
            .andWhere('m.created_at BETWEEN :from AND :to', { from, to })
            .getMany();

        const byTruck = new Map<string, ManifestEntity[]>();
        for (const m of manifests) {
            if (!byTruck.has(m.truck_id)) byTruck.set(m.truck_id, []);
            byTruck.get(m.truck_id)!.push(m);
        }

        const stats: TruckStats[] = [];
        for (const [truckId, truckManifests] of byTruck.entries()) {
            const completed = truckManifests.filter(
                (m) => m.status === 'COMPLETED' || m.status === 'FLAGGED',
            );
            const flagged = truckManifests.filter((m) => m.status === 'FLAGGED');

            const variances = completed
                .filter((m) => m.volume_variance_pct != null)
                .map((m) => Number(m.volume_variance_pct));

            stats.push({
                truck_id: truckId,
                plate_number: truckManifests[0]?.truck?.plate_number ?? truckId,
                total_manifests: truckManifests.length,
                completed: completed.length,
                flagged: flagged.length,
                avg_volume_variance_pct: variances.length
                    ? Math.round((variances.reduce((a, b) => a + b, 0) / variances.length) * 10) / 10
                    : 0,
            });
        }

        return stats.sort((a, b) => b.total_manifests - a.total_manifests);
    }
}
