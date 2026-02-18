// ============================================
// Zone Definitions
// ============================================

import { Zone } from '../types/fleet.types';

export const ZONES: Record<Zone, { label_en: string; label_fr: string; label_ht: string }> = {
    NORTH: {
        label_en: 'North',
        label_fr: 'Nord',
        label_ht: 'Nò',
    },
    SOUTH: {
        label_en: 'South',
        label_fr: 'Sud',
        label_ht: 'Sid',
    },
    EAST: {
        label_en: 'East',
        label_fr: 'Est',
        label_ht: 'Lès',
    },
    WEST: {
        label_en: 'West',
        label_fr: 'Ouest',
        label_ht: 'Lwès',
    },
};

export const ALL_ZONES: Zone[] = ['NORTH', 'SOUTH', 'EAST', 'WEST'];
