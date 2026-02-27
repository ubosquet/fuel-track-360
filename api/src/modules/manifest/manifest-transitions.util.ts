/**
 * Manifest State Machine
 *
 * Defines the only valid status transitions for a manifest.
 * Any transition not listed here will be rejected with a BadRequestException.
 *
 * State diagram:
 *
 *  CREATED → LOADING → IN_TRANSIT → ARRIVED → DISCHARGING → COMPLETED
 *                                                           ↘ FLAGGED (auto, on volume variance > 2%)
 *  Any state → CANCELLED  (supervisor/admin only, enforced in controller via @Roles)
 */

export type ManifestStatus =
    | 'CREATED'
    | 'LOADING'
    | 'IN_TRANSIT'
    | 'ARRIVED'
    | 'DISCHARGING'
    | 'COMPLETED'
    | 'FLAGGED'
    | 'CANCELLED';

/**
 * Allowed forward transitions per status.
 * Key = current status, Value = set of states the manifest can move INTO.
 */
export const MANIFEST_TRANSITIONS: Readonly<Record<ManifestStatus, ManifestStatus[]>> = {
    CREATED: ['LOADING', 'CANCELLED'],
    LOADING: ['IN_TRANSIT', 'CANCELLED'],
    IN_TRANSIT: ['ARRIVED', 'CANCELLED'],
    ARRIVED: ['DISCHARGING', 'CANCELLED'],
    DISCHARGING: ['COMPLETED', 'CANCELLED'],   // FLAGGED is set automatically by the service
    COMPLETED: [],                            // terminal — no further transitions
    FLAGGED: ['COMPLETED'],                 // FLAGGED can be resolved to COMPLETED after review
    CANCELLED: [],                            // terminal
};

/**
 * Validate that a status transition is allowed.
 * Returns the error message string, or `null` if the transition is valid.
 */
export function validateManifestTransition(
    from: ManifestStatus,
    to: ManifestStatus,
): string | null {
    const allowed = MANIFEST_TRANSITIONS[from];
    if (!allowed) {
        return `Unknown current manifest status: '${from}'`;
    }
    if (!allowed.includes(to)) {
        return (
            `Invalid manifest status transition: ${from} → ${to}. ` +
            `Allowed from '${from}': [${allowed.join(', ') || 'none — terminal state'}].`
        );
    }
    return null;
}
