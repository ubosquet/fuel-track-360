import {
    validateManifestTransition,
    MANIFEST_TRANSITIONS,
    ManifestStatus,
} from './manifest-transitions.util';

describe('Manifest State Machine — validateManifestTransition()', () => {

    // ──────────────────────────────────────────
    // Happy-path: all valid forward transitions
    // ──────────────────────────────────────────

    describe('valid forward transitions', () => {
        const validCases: [ManifestStatus, ManifestStatus][] = [
            ['CREATED', 'LOADING'],
            ['LOADING', 'IN_TRANSIT'],
            ['IN_TRANSIT', 'ARRIVED'],
            ['ARRIVED', 'DISCHARGING'],
            ['DISCHARGING', 'COMPLETED'],
            ['FLAGGED', 'COMPLETED'],     // Flagged manifests can be resolved
            ['CREATED', 'CANCELLED'],     // Can cancel at any early stage
            ['LOADING', 'CANCELLED'],
            ['IN_TRANSIT', 'CANCELLED'],
            ['ARRIVED', 'CANCELLED'],
            ['DISCHARGING', 'CANCELLED'],
        ];

        test.each(validCases)(
            '%s → %s should be allowed',
            (from, to) => {
                const result = validateManifestTransition(from, to);
                expect(result).toBeNull();
            },
        );
    });

    // ──────────────────────────────────────────
    // Invalid / forbidden transitions
    // ──────────────────────────────────────────

    describe('invalid transitions — should return an error message', () => {
        const invalidCases: [ManifestStatus, ManifestStatus][] = [
            ['CREATED', 'IN_TRANSIT'],    // skip a step
            ['CREATED', 'ARRIVED'],       // skip multiple steps
            ['CREATED', 'DISCHARGING'],
            ['CREATED', 'COMPLETED'],
            ['LOADING', 'ARRIVED'],       // skip
            ['LOADING', 'COMPLETED'],
            ['IN_TRANSIT', 'LOADING'],       // go backwards
            ['ARRIVED', 'IN_TRANSIT'],    // go backwards
            ['DISCHARGING', 'LOADING'],       // go far backwards
            ['COMPLETED', 'LOADING'],       // terminal state — no exit
            ['COMPLETED', 'CREATED'],
            ['COMPLETED', 'FLAGGED'],
            ['CANCELLED', 'CREATED'],       // terminal state — no exit
            ['CANCELLED', 'LOADING'],
            ['FLAGGED', 'LOADING'],       // FLAGGED only resolves to COMPLETED
            ['FLAGGED', 'DISCHARGING'],
        ];

        test.each(invalidCases)(
            '%s → %s should be rejected',
            (from, to) => {
                const result = validateManifestTransition(from, to);
                expect(result).not.toBeNull();
                expect(typeof result).toBe('string');
                expect(result).toContain(from);   // error message must mention current state
            },
        );
    });

    // ──────────────────────────────────────────
    // Terminal states: verify no exits
    // ──────────────────────────────────────────

    describe('terminal states have no outbound transitions', () => {
        it('COMPLETED is terminal', () => {
            expect(MANIFEST_TRANSITIONS['COMPLETED']).toHaveLength(0);
        });

        it('CANCELLED is terminal', () => {
            expect(MANIFEST_TRANSITIONS['CANCELLED']).toHaveLength(0);
        });
    });

    // ──────────────────────────────────────────
    // Transition map completeness
    // ──────────────────────────────────────────

    describe('transition map covers all statuses', () => {
        const allStatuses: ManifestStatus[] = [
            'CREATED', 'LOADING', 'IN_TRANSIT', 'ARRIVED',
            'DISCHARGING', 'COMPLETED', 'FLAGGED', 'CANCELLED',
        ];

        it('all manifest statuses are defined in MANIFEST_TRANSITIONS', () => {
            for (const status of allStatuses) {
                expect(MANIFEST_TRANSITIONS).toHaveProperty(status);
                expect(Array.isArray(MANIFEST_TRANSITIONS[status])).toBe(true);
            }
        });
    });
});
