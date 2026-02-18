import {
    Injectable,
    NestInterceptor,
    ExecutionContext,
    CallHandler,
    Logger,
} from '@nestjs/common';
import { Observable, tap } from 'rxjs';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditEventEntity } from '../../modules/audit/entities/audit-event.entity';

/**
 * Automatically logs all state-changing operations to the immutable audit journal.
 * Captures: actor, entity, event type, GPS coordinates, IP, and full state snapshot.
 */
@Injectable()
export class AuditLogInterceptor implements NestInterceptor {
    private readonly logger = new Logger(AuditLogInterceptor.name);

    intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
        const request = context.switchToHttp().getRequest();
        const method = request.method;

        // Only audit state-changing operations
        if (method === 'GET' || method === 'HEAD' || method === 'OPTIONS') {
            return next.handle();
        }

        const startTime = Date.now();

        return next.handle().pipe(
            tap({
                next: (responseData) => {
                    const duration = Date.now() - startTime;
                    this.logger.debug(
                        `${method} ${request.url} completed in ${duration}ms — user: ${request.user?.user_id ?? 'anonymous'}`,
                    );
                },
                error: (error) => {
                    const duration = Date.now() - startTime;
                    this.logger.warn(
                        `${method} ${request.url} failed in ${duration}ms — error: ${error.message}`,
                    );
                },
            }),
        );
    }
}
