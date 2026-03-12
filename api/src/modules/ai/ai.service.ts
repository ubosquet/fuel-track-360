import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThan } from 'typeorm';
import { GeminiService } from './gemini.service';
import { ManifestEntity } from '../manifest/entities/manifest.entity';
import { S2LChecklistEntity } from '../s2l/entities/s2l-checklist.entity';

// ─── Result types (structured Gemini outputs) ─────────────────────────────────

export type RootCause = 'DRIVER_ERROR' | 'EQUIPMENT_FAULT' | 'MEASUREMENT_ERROR' | 'ROUTE_RELATED' | 'UNKNOWN';
export type RecommendedAction = 'FLAG_FOR_REVIEW' | 'EQUIPMENT_CHECK' | 'RECOUNT' | 'MONITOR' | 'ESCALATE';
export type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH';

export interface ManifestAnalysisResult {
    root_cause_probability: RootCause;
    confidence: number; // 0–1
    explanation: string;
    recommended_action: RecommendedAction;
    similar_incidents: number;
    key_factors: string[];
}

export interface DriverCoachResult {
    strengths: string[];
    improvement_areas: string[];
    weekly_goal: string;
    motivational_message: string;
    score_breakdown: {
        on_time: string;
        precision: string;
        completion: string;
    };
}

export interface S2LPattern {
    pattern_type: string;
    frequency: number;
    affected_drivers: string[];
    affected_sites: string[];
    recommendation: string;
}

export interface S2LPatternResult {
    patterns: S2LPattern[];
    overall_risk: RiskLevel;
    summary: string;
    top_finding: string;
}

export interface RiskAnalysisResult {
    risk_score: number;
    explanation: string;
    recommendation: string;
}

// ─── Service ──────────────────────────────────────────────────────────────────

@Injectable()
export class AIService {
    private readonly logger = new Logger(AIService.name);

    constructor(
        private readonly gemini: GeminiService,
        @InjectRepository(ManifestEntity)
        private readonly manifestRepo: Repository<ManifestEntity>,
        @InjectRepository(S2LChecklistEntity)
        private readonly s2lRepo: Repository<S2LChecklistEntity>,
    ) { }

    // ── 0. GPS Telemetry Risk Analyzer ───────────────────────────────────────
    
    async analyzeRisk(promptContext: string): Promise<RiskAnalysisResult> {
        const systemPrompt = `
You are an expert GPS telemetry and anomaly detection AI for a logistics SaaS.
Analyze the provided GPS data context and determine if this represents a high-risk anomaly (e.g. fuel theft, prolonged unauthorized stop, route deviation).

Respond ONLY with valid JSON matching this exact schema:
{
  "risk_score": <number between 0 and 100>,
  "explanation": "<short explanation of why this risk score was assigned>",
  "recommendation": "<actionable recommendation to resolve or investigate>"
}
`;
        this.logger.log(`Analyzing GPS Risk Telemetry...`);
        return this.gemini.generateStructured<RiskAnalysisResult>(systemPrompt, promptContext);
    }

    // ── 1. Manifest Anomaly Analyzer ─────────────────────────────────────────

    async analyzeManifest(
        manifestId: string,
        organizationId: string,
    ): Promise<ManifestAnalysisResult> {
        const manifest = await this.manifestRepo.findOne({
            where: { id: manifestId, organization_id: organizationId },
            relations: ['driver', 'truck', 'origin_station', 'dest_station'],
        });

        if (!manifest) throw new NotFoundException('Manifest not found');

        // Fetch driver's last 30 deliveries for context
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        const driverHistory = await this.manifestRepo.find({
            where: {
                driver_id: manifest.driver_id,
                organization_id: organizationId,
            },
            order: { created_at: 'DESC' },
            take: 30,
        });

        const driverFlaggedCount = driverHistory.filter((m) =>
            m.status === 'FLAGGED' || (m.volume_variance_pct != null && m.volume_variance_pct > 2),
        ).length;

        const truckHistory = await this.manifestRepo.find({
            where: {
                truck_id: manifest.truck_id,
                organization_id: organizationId,
            },
            order: { created_at: 'DESC' },
            take: 30,
        });

        const truckFlaggedCount = truckHistory.filter((m) =>
            m.status === 'FLAGGED' || (m.volume_variance_pct != null && m.volume_variance_pct > 2),
        ).length;

        const systemPrompt = `
You are a fuel logistics anomaly analyst for a SaaS platform called Fuel-Track-360.
You analyse flagged manifests where the fuel volume delivered differs significantly from the volume loaded.

Your task: Given the manifest data and historical context below, identify the most likely root cause
of the volume discrepancy and recommend an action.

Respond ONLY with valid JSON matching this exact schema:
{
  "root_cause_probability": "DRIVER_ERROR" | "EQUIPMENT_FAULT" | "MEASUREMENT_ERROR" | "ROUTE_RELATED" | "UNKNOWN",
  "confidence": <0.0 to 1.0>,
  "explanation": "<2-3 sentence plain English explanation>",
  "recommended_action": "FLAG_FOR_REVIEW" | "EQUIPMENT_CHECK" | "RECOUNT" | "MONITOR" | "ESCALATE",
  "similar_incidents": <integer count>,
  "key_factors": ["<factor 1>", "<factor 2>", ...]
}
`;

        const userContext = `
MANIFEST:
- ID: ${manifest.id}
- Number: ${manifest.manifest_number}
- Status: ${manifest.status}
- Product: ${manifest.product_type}
- Volume Loaded: ${manifest.volume_loaded_liters} L
- Volume Discharged: ${manifest.volume_discharged_liters} L
- Volume Variance: ${manifest.volume_variance_pct?.toFixed(2)}%
- Route: ${manifest.origin_station?.name ?? 'Unknown'} → ${manifest.dest_station?.name ?? 'Unknown'}
- Departed At: ${manifest.departed_at?.toISOString() ?? 'N/A'}
- Arrived At: ${manifest.arrived_at?.toISOString() ?? 'N/A'}

DRIVER HISTORY (last 30 deliveries):
- Driver Name: ${manifest.driver?.full_name ?? 'Unknown'}
- Total Recent Deliveries: ${driverHistory.length}
- Flagged/High Variance: ${driverFlaggedCount}
- Driver Variance Rate: ${driverHistory.length > 0 ? ((driverFlaggedCount / driverHistory.length) * 100).toFixed(1) : 0}%

TRUCK HISTORY (last 30 deliveries):
- Truck Plate: ${manifest.truck?.plate_number ?? 'Unknown'}
- Total Recent Uses: ${truckHistory.length}
- Flagged/High Variance: ${truckFlaggedCount}
- Truck Variance Rate: ${truckHistory.length > 0 ? ((truckFlaggedCount / truckHistory.length) * 100).toFixed(1) : 0}%

Based on this data, what is the most probable root cause of the variance?
`;

        this.logger.log(`Analyzing manifest ${manifestId} with Gemini`);
        return this.gemini.generateStructured<ManifestAnalysisResult>(systemPrompt, userContext);
    }

    // ── 2. Driver Performance Coach ──────────────────────────────────────────

    async coachDriver(
        driverId: string,
        organizationId: string,
    ): Promise<DriverCoachResult> {
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        const manifests = await this.manifestRepo.find({
            where: { driver_id: driverId, organization_id: organizationId },
            order: { created_at: 'DESC' },
            take: 50,
        });

        if (manifests.length === 0) {
            // Return a default encouraging message for new drivers
            return {
                strengths: ['Nouveau chauffeur avec un profil vierge'],
                improvement_areas: ['Accumuler des livraisons pour établir une réputation'],
                weekly_goal: 'Compléter votre première semaine de livraisons avec un écart de volume < 1%',
                motivational_message: "Bienvenue dans l'équipe ! Chaque grande carrière commence par une première livraison.",
                score_breakdown: { on_time: 'N/A', precision: 'N/A', completion: 'N/A' },
            };
        }

        const completed = manifests.filter((m) => ['COMPLETED', 'FLAGGED'].includes(m.status)).length;
        const flagged = manifests.filter((m) => m.status === 'FLAGGED').length;
        const FOUR_HOURS = 4 * 60 * 60 * 1000;
        const onTime = manifests.filter((m) =>
            m.departed_at && m.arrived_at &&
            new Date(m.arrived_at).getTime() - new Date(m.departed_at).getTime() <= FOUR_HOURS,
        ).length;
        const precision = manifests.filter((m) =>
            m.volume_variance_pct != null && m.volume_variance_pct <= 1,
        ).length;

        const onTimeRate = completed > 0 ? Math.round((onTime / completed) * 100) : 0;
        const precisionRate = completed > 0 ? Math.round((precision / completed) * 100) : 0;
        const completionRate = manifests.length > 0 ? Math.round((completed / manifests.length) * 100) : 0;
        const score = Math.round(onTimeRate * 0.5 + precisionRate * 0.3 + completionRate * 0.2);

        const systemPrompt = `
You are an expert performance coach for fuel delivery drivers at a logistics SaaS called Fuel-Track-360.
Your job is to analyse a driver's performance data and produce personalised, encouraging, and actionable coaching feedback.

Be specific, positive, and data-driven. Use motivational language. Keep each point concise (1-2 sentences).
The output language should be French (this is a Haitian/French-speaking context).

Respond ONLY with valid JSON matching this exact schema:
{
  "strengths": ["<strength 1>", "<strength 2>"],
  "improvement_areas": ["<area 1>", "<area 2>"],
  "weekly_goal": "<one specific, measurable weekly goal>",
  "motivational_message": "<2-3 sentence motivational closing>",
  "score_breakdown": {
    "on_time": "<interpretation of on-time rate>",
    "precision": "<interpretation of volume precision>",
    "completion": "<interpretation of completion rate>"
  }
}
`;

        const userContext = `
DRIVER PERFORMANCE (last 30 days):
- Total manifests: ${manifests.length}
- Completed: ${completed}  |  Flagged: ${flagged}
- Completion rate: ${completionRate}%
- On-time deliveries (≤ 4h transit): ${onTime} / ${completed} = ${onTimeRate}%
- Volume precision (≤ 1% variance): ${precision} / ${completed} = ${precisionRate}%
- Composite score: ${score} / 100

Context: The platform tracks fuel delivery from loading terminals to service stations in Haiti.
SLA: deliveries must arrive within 4 hours. Volume variance > 2% triggers a FLAGGED status.
`;

        this.logger.log(`Coaching driver ${driverId} with Gemini`);
        return this.gemini.generateStructured<DriverCoachResult>(systemPrompt, userContext);
    }

    // ── 3. S2L Rejection Pattern Detector ───────────────────────────────────

    async scanS2LPatterns(
        organizationId: string,
        fromDate?: string,
    ): Promise<S2LPatternResult> {
        const since = fromDate
            ? new Date(fromDate)
            : (() => { const d = new Date(); d.setDate(d.getDate() - 30); return d; })();

        const rejectedS2Ls = await this.s2lRepo.find({
            where: {
                organization_id: organizationId,
                created_at: MoreThan(since) as any,
            },
            relations: ['driver', 'truck', 'station'],
            order: { created_at: 'DESC' },
            take: 200,
        });

        const failed = rejectedS2Ls.filter((s) =>
            s.status === 'REJECTED',
        );

        if (failed.length === 0) {
            return {
                patterns: [],
                overall_risk: 'LOW',
                summary: 'Aucun rejet S2L détecté sur la période analysée.',
                top_finding: 'Aucun problème détecté.',
            };
        }

        // Aggregate for the prompt
        const driverCounts: Record<string, number> = {};
        const siteCounts: Record<string, number> = {};
        const truckCounts: Record<string, number> = {};

        for (const s2l of failed) {
            const driver = s2l.driver?.full_name ?? s2l.driver_id ?? 'Unknown';
            const site = (s2l as any).station?.name ?? (s2l as any).station_id ?? 'Unknown';
            const truck = s2l.truck?.plate_number ?? s2l.truck_id ?? 'Unknown';
            driverCounts[driver] = (driverCounts[driver] ?? 0) + 1;
            siteCounts[site] = (siteCounts[site] ?? 0) + 1;
            truckCounts[truck] = (truckCounts[truck] ?? 0) + 1;
        }

        const topDrivers = Object.entries(driverCounts)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5)
            .map(([name, count]) => `${name} (${count}x)`);

        const topSites = Object.entries(siteCounts)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5)
            .map(([name, count]) => `${name} (${count}x)`);

        const topTrucks = Object.entries(truckCounts)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 3)
            .map(([plate, count]) => `${plate} (${count}x)`);

        const systemPrompt = `
You are a safety and compliance analyst for a fuel logistics SaaS called Fuel-Track-360.
Your task: analyse patterns in S2L (Safe-to-Load) checklist rejections.

An S2L checklist is completed before a fuel truck loads. A REJECTED S2L means there was a safety or
compliance issue before loading could begin. Patterns in rejections indicate systemic risk.

Respond ONLY with a JSON object matching this schema:
{
  "patterns": [
    {
      "pattern_type": "<short descriptive name>",
      "frequency": <integer>,
      "affected_drivers": ["<name>", ...],
      "affected_sites": ["<site>", ...],
      "recommendation": "<specific actionable recommendation>"
    }
  ],
  "overall_risk": "LOW" | "MEDIUM" | "HIGH",
  "summary": "<2-3 sentence plain-language summary>",
  "top_finding": "<single most critical finding>"
}

If no clear patterns exist, return an empty patterns array with appropriate risk and summary.
`;

        const userContext = `
S2L REJECTION ANALYSIS (period: last 30 days):
- Total S2L records analysed: ${rejectedS2Ls.length}
- Total Rejected / Failed: ${failed.length}
- Rejection rate: ${((failed.length / rejectedS2Ls.length) * 100).toFixed(1)}%

DRIVERS WITH MOST REJECTIONS:
${topDrivers.join('\n')}

SITES WITH MOST REJECTIONS:
${topSites.join('\n')}

TRUCKS MOST OFTEN INVOLVED:
${topTrucks.join('\n')}

Based on this data, identify patterns and systemic risks. Surface the most actionable insights.
`;

        this.logger.log(`Scanning S2L patterns for org ${organizationId} with Gemini`);
        return this.gemini.generateStructured<S2LPatternResult>(systemPrompt, userContext);
    }
}
