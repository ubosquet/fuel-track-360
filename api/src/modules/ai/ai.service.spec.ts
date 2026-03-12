import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException } from '@nestjs/common';
import { AIService } from './ai.service';
import { GeminiService } from './gemini.service';
import { ManifestEntity } from '../manifest/entities/manifest.entity';
import { S2LChecklistEntity } from '../s2l/entities/s2l-checklist.entity';

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const ORG_ID = 'org-0001';
const DRV_ID = 'drv-0001';
const MFT_ID = 'mft-0001';

function makeManifest(overrides: Partial<ManifestEntity> = {}): ManifestEntity {
    const base: Partial<ManifestEntity> = {
        id: MFT_ID,
        organization_id: ORG_ID,
        driver_id: DRV_ID,
        truck_id: 'truck-001',
        status: 'FLAGGED',
        product_type: 'DIESEL',
        volume_loaded_liters: 20000,
        volume_discharged_liters: 19500,
        volume_variance_pct: 2.5,
        departed_at: new Date('2026-03-07T10:00:00Z'),
        arrived_at: new Date('2026-03-07T12:00:00Z'),
        manifest_number: 'FT360-001',
        driver: { full_name: 'Jean Dupont' } as any,
        truck: { plate_number: 'AA-123-BB' } as any,
        origin_station: { name: 'Terminal Nord' } as any,
        dest_station: { name: 'Station Sud' } as any,
    };
    return { ...base, ...overrides } as ManifestEntity;
}

// ─── Mocks ────────────────────────────────────────────────────────────────────

const GEMINI_ANALYSIS = {
    root_cause_probability: 'EQUIPMENT_FAULT',
    confidence: 0.72,
    explanation: 'The truck meter shows consistent under-reads.',
    recommended_action: 'EQUIPMENT_CHECK',
    similar_incidents: 3,
    key_factors: ['Truck flagged 3x in 30 days', 'consistent direction of error'],
};

const GEMINI_COACH = {
    strengths: ['Livraisons toujours à temps'],
    improvement_areas: ['Réduire la variance volume'],
    weekly_goal: 'Maintenir un écart < 1% sur 5 livraisons',
    motivational_message: 'Continuez comme ça !',
    score_breakdown: { on_time: 'Excellent', precision: 'À améliorer', completion: 'Bon' },
};

const GEMINI_PATTERNS = {
    patterns: [{ pattern_type: 'Driver repeat', frequency: 5, affected_drivers: ['Jean'], affected_sites: ['TN'], recommendation: 'Training' }],
    overall_risk: 'MEDIUM',
    summary: 'Un chauffeur montre des rejections répétées.',
    top_finding: 'Jean Dupont: 5 rejections en 30 jours.',
};

function makeGemini() {
    return { generateStructured: jest.fn() };
}

function makeManifestRepo(manifest?: ManifestEntity, history: ManifestEntity[] = []) {
    return {
        findOne: jest.fn().mockResolvedValue(manifest ?? null),
        find: jest.fn().mockResolvedValue(history),
    };
}

function makeS2LRepo(records: any[] = []) {
    return { find: jest.fn().mockResolvedValue(records) };
}

async function build(manifestRepo: any, s2lRepo: any, gemini: any) {
    const module: TestingModule = await Test.createTestingModule({
        providers: [
            AIService,
            { provide: GeminiService, useValue: gemini },
            { provide: getRepositoryToken(ManifestEntity), useValue: manifestRepo },
            { provide: getRepositoryToken(S2LChecklistEntity), useValue: s2lRepo },
        ],
    }).compile();
    return module.get<AIService>(AIService);
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('AIService', () => {

    // ── analyzeManifest ─────────────────────────────────────────────────────

    describe('analyzeManifest()', () => {
        it('returns Gemini analysis for a flagged manifest', async () => {
            const manifest = makeManifest();
            const gemini = makeGemini();
            gemini.generateStructured.mockResolvedValue(GEMINI_ANALYSIS);

            const svc = await build(makeManifestRepo(manifest, [manifest]), makeS2LRepo(), gemini);
            const result = await svc.analyzeManifest(MFT_ID, ORG_ID);

            expect(result.root_cause_probability).toBe('EQUIPMENT_FAULT');
            expect(result.confidence).toBeGreaterThan(0);
            expect(result.recommended_action).toBe('EQUIPMENT_CHECK');
        });

        it('throws NotFoundException when manifest does not exist', async () => {
            const gemini = makeGemini();
            const svc = await build(makeManifestRepo(), makeS2LRepo(), gemini);
            await expect(svc.analyzeManifest('bad-id', ORG_ID)).rejects.toThrow(NotFoundException);
        });

        it('passes driver + truck history context to Gemini', async () => {
            const manifest = makeManifest();
            const gemini = makeGemini();
            gemini.generateStructured.mockResolvedValue(GEMINI_ANALYSIS);

            const history = [makeManifest({ status: 'FLAGGED' }), makeManifest()];
            const svc = await build(makeManifestRepo(manifest, history), makeS2LRepo(), gemini);
            await svc.analyzeManifest(MFT_ID, ORG_ID);

            expect(gemini.generateStructured).toHaveBeenCalledTimes(1);
            const contextArg: string = gemini.generateStructured.mock.calls[0][1];
            expect(contextArg).toContain('Jean Dupont');
            expect(contextArg).toContain('AA-123-BB');
        });
    });

    // ── coachDriver ─────────────────────────────────────────────────────────

    describe('coachDriver()', () => {
        it('returns coaching tips for a driver with deliveries', async () => {
            const manifests = [
                makeManifest({ status: 'COMPLETED', volume_variance_pct: 0.5 }),
                makeManifest({ status: 'COMPLETED', volume_variance_pct: 0.8 }),
            ];
            const gemini = makeGemini();
            gemini.generateStructured.mockResolvedValue(GEMINI_COACH);

            const svc = await build(makeManifestRepo(undefined, manifests), makeS2LRepo(), gemini);
            const result = await svc.coachDriver(DRV_ID, ORG_ID);

            expect(result.strengths.length).toBeGreaterThan(0);
            expect(result.weekly_goal).toBeDefined();
        });

        it('returns a default message for a driver with no deliveries (no Gemini call)', async () => {
            const gemini = makeGemini();
            const svc = await build(makeManifestRepo(undefined, []), makeS2LRepo(), gemini);
            const result = await svc.coachDriver(DRV_ID, ORG_ID);

            expect(result.strengths).toBeDefined();
            expect(gemini.generateStructured).not.toHaveBeenCalled();
        });
    });

    // ── scanS2LPatterns ─────────────────────────────────────────────────────

    describe('scanS2LPatterns()', () => {
        it('returns patterns from Gemini when rejections exist', async () => {
            const gemini = makeGemini();
            gemini.generateStructured.mockResolvedValue(GEMINI_PATTERNS);

            const s2lRecords = [
                { status: 'REJECTED', driver: { full_name: 'Jean' }, truck: { plate_number: 'AA' }, driver_id: DRV_ID, truck_id: 't1' },
                { status: 'FAILED', driver: { full_name: 'Jean' }, truck: { plate_number: 'AA' }, driver_id: DRV_ID, truck_id: 't1' },
            ];

            const svc = await build(makeManifestRepo(), makeS2LRepo(s2lRecords), gemini);
            const result = await svc.scanS2LPatterns(ORG_ID);

            expect(result.overall_risk).toBe('MEDIUM');
            expect(result.patterns.length).toBeGreaterThan(0);
        });

        it('returns LOW risk with empty patterns when no rejections found', async () => {
            const gemini = makeGemini();
            const svc = await build(makeManifestRepo(), makeS2LRepo([]), gemini);
            const result = await svc.scanS2LPatterns(ORG_ID);

            expect(result.overall_risk).toBe('LOW');
            expect(result.patterns).toEqual([]);
            expect(gemini.generateStructured).not.toHaveBeenCalled();
        });
    });
});
