// ============================================
// S2L Checklist Item Definitions
// ============================================

import { S2LChecklistItem, S2LChecklistCategory } from '../types/s2l.types';

/**
 * Standard S2L checklist items required before fuel truck dispatch.
 * All items must be marked TRUE for the S2L to be submittable.
 */
export const S2L_CHECKLIST_ITEMS: Omit<S2LChecklistItem, 'value' | 'note'>[] = [
    // ── Vehicle Condition ──
    {
        item_id: 'vc-001',
        label: 'Tires in good condition (no visible damage or low pressure)',
        label_fr: 'Pneus en bon état (pas de dommages visibles ni pression basse)',
        label_ht: 'Kawotchou yo an bon eta (pa gen domaj vizib ni presyon ba)',
        category: 'VEHICLE_CONDITION',
        order: 1,
    },
    {
        item_id: 'vc-002',
        label: 'Brakes tested and functioning properly',
        label_fr: 'Freins testés et fonctionnant correctement',
        label_ht: 'Fren yo teste e yo ap fonksyone kòrèkteman',
        category: 'VEHICLE_CONDITION',
        order: 2,
    },
    {
        item_id: 'vc-003',
        label: 'All lights and indicators working (headlights, brake lights, turn signals)',
        label_fr: 'Tous les feux et indicateurs fonctionnent (phares, feux de freinage, clignotants)',
        label_ht: 'Tout limyè ak endikatè yo ap mache (gwo limyè, limyè fren, klignotan)',
        category: 'VEHICLE_CONDITION',
        order: 3,
    },
    {
        item_id: 'vc-004',
        label: 'No visible fuel or oil leaks from vehicle or tanker',
        label_fr: 'Pas de fuites de carburant ou d\'huile visibles du véhicule ou de la citerne',
        label_ht: 'Pa gen fuit kabiran oswa lwil vizib nan machin nan oswa sitèn nan',
        category: 'VEHICLE_CONDITION',
        order: 4,
    },
    {
        item_id: 'vc-005',
        label: 'Mirrors clean and properly adjusted',
        label_fr: 'Rétroviseurs propres et correctement ajustés',
        label_ht: 'Glas gade dèyè yo pwòp e byen ajiste',
        category: 'VEHICLE_CONDITION',
        order: 5,
    },

    // ── Safety Equipment ──
    {
        item_id: 'se-001',
        label: 'Fire extinguisher present, accessible, and within certification date',
        label_fr: 'Extincteur présent, accessible et dans la date de certification',
        label_ht: 'Estentè dife prezan, aksesib, e nan dat sètifikasyon',
        category: 'SAFETY_EQUIPMENT',
        order: 6,
    },
    {
        item_id: 'se-002',
        label: 'Warning triangles/reflectors present (minimum 3)',
        label_fr: 'Triangles/réflecteurs de signalisation présents (minimum 3)',
        label_ht: 'Triyang/reflektè avètisman prezan (minimòm 3)',
        category: 'SAFETY_EQUIPMENT',
        order: 7,
    },
    {
        item_id: 'se-003',
        label: 'Spill containment kit present and complete',
        label_fr: 'Kit de confinement des déversements présent et complet',
        label_ht: 'Kit pou kontwole devèsman prezan e konplè',
        category: 'SAFETY_EQUIPMENT',
        order: 8,
    },
    {
        item_id: 'se-004',
        label: 'Personal Protective Equipment available (gloves, goggles, boots)',
        label_fr: 'Équipement de protection individuelle disponible (gants, lunettes, bottes)',
        label_ht: 'Ekipman pwoteksyon pèsonèl disponib (gan, linèt, bòt)',
        category: 'SAFETY_EQUIPMENT',
        order: 9,
    },
    {
        item_id: 'se-005',
        label: 'Ground bonding cable/static strap present and undamaged',
        label_fr: 'Câble de mise à la terre/sangle antistatique présent et non endommagé',
        label_ht: 'Kab koneksyon tè/strap antistatik prezan e pa domaje',
        category: 'SAFETY_EQUIPMENT',
        order: 10,
    },

    // ── Documentation ──
    {
        item_id: 'dc-001',
        label: 'Valid vehicle registration documents on board',
        label_fr: 'Documents d\'immatriculation du véhicule valides à bord',
        label_ht: 'Dokiman anrejistreman machin valab abò',
        category: 'DOCUMENTATION',
        order: 11,
    },
    {
        item_id: 'dc-002',
        label: 'Hazardous materials transport permit current',
        label_fr: 'Permis de transport de matières dangereuses à jour',
        label_ht: 'Pèmi transpò materyèl danjere ajou',
        category: 'DOCUMENTATION',
        order: 12,
    },
    {
        item_id: 'dc-003',
        label: 'Emergency response information card accessible in cab',
        label_fr: 'Fiche d\'information d\'intervention d\'urgence accessible dans la cabine',
        label_ht: 'Kat enfòmasyon repons ijans aksesib nan kabìn nan',
        category: 'DOCUMENTATION',
        order: 13,
    },

    // ── Driver Readiness ──
    {
        item_id: 'dr-001',
        label: 'Driver holds valid license for vehicle class',
        label_fr: 'Le chauffeur possède un permis de conduire valide pour la classe du véhicule',
        label_ht: 'Chofè a gen yon pèmi kondwi valab pou klas machin nan',
        category: 'DRIVER_READINESS',
        order: 14,
    },
    {
        item_id: 'dr-002',
        label: 'Driver has completed HAZMAT safety training (current certificate)',
        label_fr: 'Le chauffeur a complété la formation de sécurité HAZMAT (certificat à jour)',
        label_ht: 'Chofè a fini fòmasyon sekirite HAZMAT (sètifika ajou)',
        category: 'DRIVER_READINESS',
        order: 15,
    },
    {
        item_id: 'dr-003',
        label: 'Driver is fit for duty (no signs of fatigue or impairment)',
        label_fr: 'Le chauffeur est apte au service (pas de signes de fatigue ou d\'altération)',
        label_ht: 'Chofè a an kondisyon pou travay (pa gen siy fatig oswa pwoblèm)',
        category: 'DRIVER_READINESS',
        order: 16,
    },

    // ── Loading Preparation ──
    {
        item_id: 'lp-001',
        label: 'Tanker compartments clean and free of residual product',
        label_fr: 'Compartiments de la citerne propres et sans produit résiduel',
        label_ht: 'Konpatiman sitèn yo pwòp e pa gen pwodwi ki rete',
        category: 'LOADING_PREPARATION',
        order: 17,
    },
    {
        item_id: 'lp-002',
        label: 'All valves, hatches, and seals inspected and secure',
        label_fr: 'Toutes les vannes, trappes et joints inspectés et sécurisés',
        label_ht: 'Tout vann, pòt ak jwenti yo enspekte e an sekirite',
        category: 'LOADING_PREPARATION',
        order: 18,
    },
    {
        item_id: 'lp-003',
        label: 'Vapor recovery system connected and operational (if applicable)',
        label_fr: 'Système de récupération des vapeurs connecté et opérationnel (si applicable)',
        label_ht: 'Sistèm rekiperasyon vapè konekte e ap fonksyone (si aplikab)',
        category: 'LOADING_PREPARATION',
        order: 19,
    },
    {
        item_id: 'lp-004',
        label: 'Vehicle engine OFF and keys removed during loading',
        label_fr: 'Moteur du véhicule ÉTEINT et clés retirées pendant le chargement',
        label_ht: 'Motè machin nan ETENN e kle yo retire pandan chajman',
        category: 'LOADING_PREPARATION',
        order: 20,
    },
];

/**
 * Get checklist items with default values (all false)
 */
export function getDefaultChecklistItems(): S2LChecklistItem[] {
    return S2L_CHECKLIST_ITEMS.map((item) => ({
        ...item,
        value: false,
        note: '',
    }));
}

/**
 * Get checklist items grouped by category
 */
export function getChecklistByCategory(): Record<S2LChecklistCategory, Omit<S2LChecklistItem, 'value' | 'note'>[]> {
    const grouped: Record<string, Omit<S2LChecklistItem, 'value' | 'note'>[]> = {};
    for (const item of S2L_CHECKLIST_ITEMS) {
        if (!grouped[item.category]) {
            grouped[item.category] = [];
        }
        grouped[item.category].push(item);
    }
    return grouped as Record<S2LChecklistCategory, Omit<S2LChecklistItem, 'value' | 'note'>[]>;
}

/**
 * Category labels in all supported languages
 */
export const S2L_CATEGORY_LABELS: Record<S2LChecklistCategory, { en: string; fr: string; ht: string }> = {
    VEHICLE_CONDITION: {
        en: 'Vehicle Condition',
        fr: 'État du Véhicule',
        ht: 'Kondisyon Machin',
    },
    SAFETY_EQUIPMENT: {
        en: 'Safety Equipment',
        fr: 'Équipement de Sécurité',
        ht: 'Ekipman Sekirite',
    },
    DOCUMENTATION: {
        en: 'Documentation',
        fr: 'Documentation',
        ht: 'Dokimantasyon',
    },
    DRIVER_READINESS: {
        en: 'Driver Readiness',
        fr: 'Aptitude du Chauffeur',
        ht: 'Preparasyon Chofè',
    },
    LOADING_PREPARATION: {
        en: 'Loading Preparation',
        fr: 'Préparation au Chargement',
        ht: 'Preparasyon Chajman',
    },
};
