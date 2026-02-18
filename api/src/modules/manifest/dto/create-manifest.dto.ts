import { IsUUID, IsString, IsNumber, IsOptional, IsBoolean, IsEnum } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateManifestDto {
    @ApiProperty({ description: 'Approved S2L ID (must be APPROVED)' })
    @IsUUID()
    s2l_id: string;

    @ApiProperty()
    @IsUUID()
    truck_id: string;

    @ApiProperty()
    @IsUUID()
    origin_station_id: string;

    @ApiProperty()
    @IsUUID()
    dest_station_id: string;

    @ApiProperty({ enum: ['GASOLINE', 'DIESEL', 'KEROSENE', 'LPG'] })
    @IsEnum(['GASOLINE', 'DIESEL', 'KEROSENE', 'LPG'])
    product_type: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsNumber()
    volume_loaded_liters?: number;

    @ApiPropertyOptional()
    @IsOptional()
    @IsUUID()
    sync_id?: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsBoolean()
    offline_created?: boolean;
}
