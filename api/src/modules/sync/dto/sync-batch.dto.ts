import {
    IsString,
    IsUUID,
    IsArray,
    IsEnum,
    IsObject,
    IsOptional,
    IsDateString,
    IsNumber,
    IsBoolean,
    ValidateNested,
    ArrayMaxSize,
    ArrayMinSize,
    MaxLength,
    ValidateIf,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

// ════════════════════════════════════════════════════════════
// Enum for allowed operations
// ════════════════════════════════════════════════════════════

export enum SyncOperationType {
    CREATE = 'CREATE',
    UPDATE = 'UPDATE',
    DELETE = 'DELETE',
}

export enum SyncEntityType {
    S2L = 's2l',
    GPS_LOG = 'gps_log',
    MANIFEST = 'manifest',
}

// ════════════════════════════════════════════════════════════
// S2L-specific payload validation
// ════════════════════════════════════════════════════════════

class S2LChecklistItemPayload {
    @IsString()
    @MaxLength(50)
    item_id: string;

    @IsString()
    @MaxLength(200)
    label: string;

    @IsBoolean()
    pass: boolean;
}

export class S2LPayloadDto {
    @IsOptional()
    @IsUUID()
    id?: string;

    @IsOptional()
    @IsUUID()
    truck_id?: string;

    @IsOptional()
    @IsUUID()
    station_id?: string;

    @IsOptional()
    @IsUUID()
    driver_id?: string;

    @IsOptional()
    @IsUUID()
    organization_id?: string;

    @IsOptional()
    @IsString()
    @IsEnum(['DRAFT', 'SUBMITTED', 'APPROVED', 'REJECTED'])
    status?: string;

    @IsOptional()
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => S2LChecklistItemPayload)
    @ArrayMaxSize(30)
    checklist_data?: S2LChecklistItemPayload[];

    @IsOptional()
    @IsBoolean()
    all_items_pass?: boolean;

    @IsOptional()
    @IsNumber()
    gps_lat?: number;

    @IsOptional()
    @IsNumber()
    gps_lng?: number;

    @IsOptional()
    @IsBoolean()
    is_within_geofence?: boolean;

    @IsOptional()
    @IsDateString()
    submitted_at?: string;

    @IsOptional()
    @IsNumber()
    photo_count?: number;

    @IsOptional()
    @IsBoolean()
    offline_created?: boolean;

    @IsOptional()
    @IsUUID()
    sync_id?: string;
}

// ════════════════════════════════════════════════════════════
// GPS Log payload validation
// ════════════════════════════════════════════════════════════

export class GpsLogPayloadDto {
    @IsUUID()
    truck_id: string;

    @IsNumber()
    lat: number;

    @IsNumber()
    lng: number;

    @IsOptional()
    @IsNumber()
    speed_kmh?: number;

    @IsOptional()
    @IsNumber()
    heading?: number;

    @IsOptional()
    @IsNumber()
    accuracy_m?: number;

    @IsOptional()
    @IsNumber()
    altitude_m?: number;

    @IsDateString()
    recorded_at: string;
}

// ════════════════════════════════════════════════════════════
// Manifest payload validation
// ════════════════════════════════════════════════════════════

export class ManifestPayloadDto {
    @IsOptional()
    @IsUUID()
    id?: string;

    @IsOptional()
    @IsString()
    @MaxLength(50)
    manifest_number?: string;

    @IsOptional()
    @IsUUID()
    s2l_id?: string;

    @IsOptional()
    @IsUUID()
    truck_id?: string;

    @IsOptional()
    @IsUUID()
    origin_station_id?: string;

    @IsOptional()
    @IsUUID()
    dest_station_id?: string;

    @IsOptional()
    @IsString()
    @MaxLength(50)
    product_type?: string;

    @IsOptional()
    @IsNumber()
    volume_loaded_liters?: number;

    @IsOptional()
    @IsNumber()
    volume_discharged_liters?: number;

    @IsOptional()
    @IsString()
    @IsEnum(['CREATED', 'LOADED', 'IN_TRANSIT', 'ARRIVED', 'DISCHARGED', 'COMPLETED', 'FLAGGED'])
    status?: string;

    @IsOptional()
    @IsBoolean()
    offline_created?: boolean;

    @IsOptional()
    @IsUUID()
    sync_id?: string;
}

// ════════════════════════════════════════════════════════════
// Single sync operation — the core unit
// ════════════════════════════════════════════════════════════

export class SyncOperationDto {
    @ApiProperty({ description: 'Client-generated UUID for deduplication' })
    @IsUUID()
    sync_id: string;

    @ApiProperty({ enum: SyncOperationType, description: 'Operation type' })
    @IsEnum(SyncOperationType)
    operation: SyncOperationType;

    @ApiProperty({ enum: SyncEntityType, description: 'Entity type to sync' })
    @IsEnum(SyncEntityType)
    entity_type: SyncEntityType;

    @ApiPropertyOptional({ description: 'Server-side entity ID (for UPDATE/DELETE)' })
    @IsOptional()
    @IsUUID()
    entity_id?: string;

    @ApiProperty({ description: 'Entity data payload' })
    @IsObject()
    payload: Record<string, any>;

    @ApiProperty({ description: 'When the operation was queued on client' })
    @IsDateString()
    queued_at: string;
}

// ════════════════════════════════════════════════════════════
// Batch request — wraps multiple operations
// ════════════════════════════════════════════════════════════

export class SyncBatchDto {
    @ApiProperty({
        description: 'Array of sync operations (max 50 per batch)',
        type: [SyncOperationDto],
    })
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => SyncOperationDto)
    @ArrayMinSize(1, { message: 'At least one sync operation is required' })
    @ArrayMaxSize(50, { message: 'Maximum 50 operations per sync batch' })
    operations: SyncOperationDto[];
}
