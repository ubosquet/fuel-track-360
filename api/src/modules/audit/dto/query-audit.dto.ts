import { IsEnum, IsOptional, IsString, IsUUID, IsDateString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class QueryAuditDto {
    @ApiPropertyOptional({ description: 'Filter by entity type (e.g. s2l, manifest, truck)' })
    @IsOptional()
    @IsString()
    entity_type?: string;

    @ApiPropertyOptional({ description: 'Filter by entity UUID' })
    @IsOptional()
    @IsUUID()
    entity_id?: string;

    @ApiPropertyOptional({ description: 'Filter by event type (e.g. S2L_SUBMITTED, MANIFEST_CREATED)' })
    @IsOptional()
    @IsString()
    event_type?: string;

    @ApiPropertyOptional({ description: 'Filter by actor (user) UUID' })
    @IsOptional()
    @IsUUID()
    actor_id?: string;

    @ApiPropertyOptional({ description: 'Start date (ISO 8601)' })
    @IsOptional()
    @IsDateString()
    start_date?: string;

    @ApiPropertyOptional({ description: 'End date (ISO 8601)' })
    @IsOptional()
    @IsDateString()
    end_date?: string;

    @ApiPropertyOptional({ description: 'Page number (default: 1)', default: 1 })
    @IsOptional()
    page?: number;

    @ApiPropertyOptional({ description: 'Results per page (max 100, default: 50)', default: 50 })
    @IsOptional()
    limit?: number;
}
