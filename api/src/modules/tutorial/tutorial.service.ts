import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserTutorialStateEntity } from './entities/user-tutorial-state.entity';

// ─── Tutorial step definition (code-defined, not DB-stored) ─────────────────

export interface TutorialStep {
    id: string;       // e.g. "dashboard-tour-v1"
    title: string;
    description: string;
    route: string;       // the page this step highlights
    roles: string[];     // roles that see this step
    since_date: string;       // ISO date — "new feature" cutoff
    icon?: string;
}

export const TUTORIAL_STEPS: TutorialStep[] = [
    // ── Common ──────────────────────────────────────────────────────────────
    {
        id: 'welcome-v1',
        title: 'Bienvenue sur Fuel-Track-360 👋',
        description: 'Votre plateforme de gestion de carburant en temps réel. Laissez-nous vous faire visiter.',
        route: '/dashboard',
        roles: ['OWNER', 'ADMIN', 'BILLING_ADMIN', 'ONBOARDING_ADMIN', 'SUPERVISOR', 'DISPATCHER', 'DRIVER', 'FINANCE'],
        since_date: '2026-01-01',
    },
    // ── Owner / Admin ────────────────────────────────────────────────────────
    {
        id: 'admin-analytics-v1',
        title: '📊 Analytics & Rapports',
        description: 'Suivez la performance globale de votre flotte, de vos chauffeurs et de vos stations en temps réel.',
        route: '/analytics',
        roles: ['OWNER', 'ADMIN', 'SUPERVISOR'],
        since_date: '2026-01-01',
    },
    {
        id: 'admin-team-v1',
        title: '👥 Gestion de l\'équipe',
        description: 'Invitez votre équipe via le lien QR unique, gérez les rôles et approuvez les nouvelles demandes d\'adhésion.',
        route: '/team',
        roles: ['OWNER', 'ADMIN', 'ONBOARDING_ADMIN'],
        since_date: '2026-01-01',
    },
    {
        id: 'admin-support-v1',
        title: '🔑 Tokens de support',
        description: 'Générez des tokens temporaires pour permettre à notre équipe support de reproduire vos tickets en toute sécurité.',
        route: '/settings',
        roles: ['OWNER', 'ADMIN'],
        since_date: '2026-01-01',
    },
    {
        id: 'admin-ai-v1',
        title: '🤖 Analyses IA — Gemini',
        description: 'Détectez automatiquement les anomalies de manifeste et les patterns de rejet S2L grâce à l\'IA.',
        route: '/analytics',
        roles: ['OWNER', 'ADMIN', 'SUPERVISOR'],
        since_date: '2026-03-01',
    },
    // ── Billing Admin ────────────────────────────────────────────────────────
    {
        id: 'billing-settings-v1',
        title: '💳 Abonnement & Facturation',
        description: 'Gérez votre plan, consultez vos factures et mettez à jour vos informations de paiement.',
        route: '/settings',
        roles: ['BILLING_ADMIN', 'OWNER'],
        since_date: '2026-01-01',
    },
    // ── Driver ───────────────────────────────────────────────────────────────
    {
        id: 'driver-manifests-v1',
        title: '📋 Vos manifestes',
        description: 'Accédez à vos livraisons du jour, consultez l\'historique et déclarez vos volumes.',
        route: '/manifests',
        roles: ['DRIVER'],
        since_date: '2026-01-01',
    },
    {
        id: 'driver-s2l-v1',
        title: '✅ Checklist Sécurité S2L',
        description: 'Completez votre vérification sécurité avant chaque chargement. Requise pour démarrer une livraison.',
        route: '/s2l',
        roles: ['DRIVER'],
        since_date: '2026-01-01',
    },
    {
        id: 'driver-performance-v1',
        title: '🏆 Mon Score de Performance',
        description: 'Suivez vos livraisons à temps, votre précision volume et comparez-vous anonymement à vos collègues.',
        route: '/analytics/my-performance',
        roles: ['DRIVER'],
        since_date: '2026-01-01',
    },
    {
        id: 'driver-coach-v1',
        title: '🤖 Coaching IA Personnalisé',
        description: 'Gemini analyse vos performances et vous donne des conseils personnalisés en français pour progresser.',
        route: '/analytics/my-performance',
        roles: ['DRIVER'],
        since_date: '2026-03-01',
    },
    // ── Dispatcher ───────────────────────────────────────────────────────────
    {
        id: 'dispatcher-manifests-v1',
        title: '📋 Gestion des Manifestes',
        description: 'Suivez toutes les livraisons en temps réel, affectez les chauffeurs et gérez les statuts.',
        route: '/manifests',
        roles: ['DISPATCHER', 'SUPERVISOR'],
        since_date: '2026-01-01',
    },
    // ── Finance ──────────────────────────────────────────────────────────────
    {
        id: 'finance-reports-v1',
        title: '💰 Rapports Financiers',
        description: 'Consultez les volumes livrés, les KPIs de flotte et exportez les données pour la comptabilité.',
        route: '/analytics',
        roles: ['FINANCE'],
        since_date: '2026-01-01',
    },
];

// ─── Service ─────────────────────────────────────────────────────────────────

export interface TutorialStateResponse {
    tutorial_enabled: boolean;
    steps_to_show: TutorialStep[];
    completed_steps: string[];
    dismissed_steps: string[];
}

@Injectable()
export class TutorialService {
    private readonly logger = new Logger(TutorialService.name);

    constructor(
        @InjectRepository(UserTutorialStateEntity)
        private readonly tutRepo: Repository<UserTutorialStateEntity>,
    ) { }

    private async getOrCreateState(userId: string): Promise<UserTutorialStateEntity> {
        let state = await this.tutRepo.findOne({ where: { user_id: userId } });
        if (!state) {
            state = this.tutRepo.create({
                user_id: userId,
                tutorial_enabled: true,
                last_tutorial_seen_at: null,
                completed_steps: [],
                dismissed_steps: [],
            });
            state = await this.tutRepo.save(state);
        }
        return state;
    }

    async getState(userId: string, role: string, lastLoginAt: Date | null): Promise<TutorialStateResponse> {
        const state = await this.getOrCreateState(userId);

        if (!state.tutorial_enabled) {
            return {
                tutorial_enabled: false,
                steps_to_show: [],
                completed_steps: state.completed_steps,
                dismissed_steps: state.dismissed_steps,
            };
        }

        const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;
        const now = Date.now();

        const stepsToShow = TUTORIAL_STEPS.filter((step) => {
            // Only steps for this role
            if (!step.roles.includes(role)) return false;
            // Already completed → never re-show
            if (state.completed_steps.includes(step.id)) return false;
            // Already dismissed → skip unless it's a new feature
            if (state.dismissed_steps.includes(step.id)) return false;

            // New feature logic: show if
            // - user hasn't seen tutorial at all (first login), OR
            // - step was added after the user's last interaction AND user has been idle 30+ days
            const stepDate = new Date(step.since_date).getTime();
            const lastSeen = state.last_tutorial_seen_at ? new Date(state.last_tutorial_seen_at).getTime() : 0;
            const lastLogin = lastLoginAt ? lastLoginAt.getTime() : 0;

            const isNew = lastSeen === 0; // first time
            const isNewFeature = stepDate > lastSeen;
            const isUserIdle30Days = (now - lastLogin) >= THIRTY_DAYS_MS;

            return isNew || (isNewFeature && isUserIdle30Days);
        });

        return {
            tutorial_enabled: true,
            steps_to_show: stepsToShow,
            completed_steps: state.completed_steps,
            dismissed_steps: state.dismissed_steps,
        };
    }

    async completeSteps(userId: string, stepIds: string[]): Promise<void> {
        const state = await this.getOrCreateState(userId);
        const updated = [...new Set([...state.completed_steps, ...stepIds])];
        await this.tutRepo.update(state.id, {
            completed_steps: updated,
            last_tutorial_seen_at: new Date(),
        });
    }

    async dismissStep(userId: string, stepId: string): Promise<void> {
        const state = await this.getOrCreateState(userId);
        const updated = [...new Set([...state.dismissed_steps, stepId])];
        await this.tutRepo.update(state.id, {
            dismissed_steps: updated,
            last_tutorial_seen_at: new Date(),
        });
    }

    async toggleTutorial(userId: string, enabled: boolean): Promise<void> {
        const state = await this.getOrCreateState(userId);
        // When re-enabling, reset dismissed steps so the user sees everything again
        const updates: Partial<UserTutorialStateEntity> = { tutorial_enabled: enabled };
        if (enabled) updates.dismissed_steps = [];
        await this.tutRepo.update(state.id, updates);
        this.logger.log(`Tutorial ${enabled ? 'enabled' : 'disabled'} for user ${userId}`);
    }
}
