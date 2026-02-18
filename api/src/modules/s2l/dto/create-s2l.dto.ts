import {
    IsString,
    IsUUID,
    IsArray,
    IsBoolean,
    IsOptional,
    IsNumber,
    ValidateNested,
    IsEnum,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

class ChecklistItemDto {
    @ApiProperty()
    @IsString()
    item_id: string;

    @ApiProperty()
    @IsString()
    label: string;

    @ApiProperty()
    @IsBoolean()
    value: boolean;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    note?: string;
}

export class CreateS2LDto {
    @ApiProperty({ description: 'Truck ID' })
    @IsUUID()
    truck_id: string;

    @ApiProperty({ description: 'Station ID where S2L is performed (Terminal)' })
    @IsUUID()
    station_id: string;

    @ApiProperty({ description: 'Checklist items', type: [ChecklistItemDto] })
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => ChecklistItemDto)
    checklist_data: ChecklistItemDto[];

    @ApiPropertyOptional({ description: 'GPS latitude at submission' })
    @IsOptional()
    @IsNumber()
    gps_lat?: number;

    @ApiPropertyOptional({ description: 'GPS longitude at submission' })
    @IsOptional()
    @IsNumber()
    gps_lng?: number;

    @ApiPropertyOptional({ description: 'Client-generated sync ID for offline deduplication' })
    @IsOptional()
    @IsUUID()
    sync_id?: string;

    @ApiPropertyOptional({ description: 'Whether this was created offline' })
    @IsOptional()
    @IsBoolean()
    offline_created?: boolean;
}
