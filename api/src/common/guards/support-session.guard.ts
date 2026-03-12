import {
    Injectable,
    CanActivate,
    ExecutionContext,
    ForbiddenException,
    Logger,
} from '@nestjs/common';
import { SupportService } from '../../modules/support/support.service';
import type { Request } from 'express';

/**
 * Validates a support session JWT issued by POST /support/session.
 *
 * Access rules enforced here:
 *  - READ-ONLY:  any non-GET HTTP method is hard-blocked (403).
 *  - SCOPED: the support payload is injected into `request.support_context`
 *    so downstream controllers can optionally scope queries to the
 *    `organization_id` carried in the JWT.
 *
 * Usage: apply INSTEAD of (or in addition to) FirebaseAuthGuard on
 * support-facing read routes.
 */
@Injectable()
export class SupportSessionGuard implements CanActivate {
    private readonly logger = new Logger(SupportSessionGuard.name);

    constructor(private readonly supportService: SupportService) { }

    canActivate(context: ExecutionContext): boolean {
        const request = context.switchToHttp().getRequest<Request & { support_context?: any }>();

        // Hard-block writes
        const method = request.method.toUpperCase();
        if (!['GET', 'HEAD', 'OPTIONS'].includes(method)) {
            throw new ForbiddenException(
                'Support sessions are read-only — write operations are not permitted.',
            );
        }

        const authHeader = request.headers.authorization ?? '';
        if (!authHeader.startsWith('Bearer ')) {
            throw new ForbiddenException('Missing support session token');
        }

        const raw = authHeader.replace('Bearer ', '');
        const payload = this.supportService.validateJwt(raw);

        // Inject context so controllers and services can use it
        request.support_context = {
            organization_id: payload.organization_id,
            ticket_ref: payload.ticket_ref,
            redeemed_by_email: payload.redeemed_by_email,
            support_token_id: payload.support_token_id,
        };

        this.logger.log(
            `[SUPPORT] ${payload.redeemed_by_email} accessing org ${payload.organization_id} ` +
            `(ticket: ${payload.ticket_ref})`,
        );

        return true;
    }
}
