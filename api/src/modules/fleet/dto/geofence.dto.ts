import { IsUUID, IsString, IsNumber, IsOptional, IsEnum, IsBoolean } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateGeofenceDto {
    @ApiProperty()
    @IsUUID()
    station_id: string;

    @ApiProperty()
    @IsString()
    name: string;

    @ApiProperty()
    @IsNumber()
    center_lat: number;

    @ApiProperty()
    @IsNumber()
    center_lng: number;

    @ApiPropertyOptional()
    @IsOptional()
    @IsNumber()
    radius_m?: number;

    @ApiPropertyOptional({ enum: ['CIRCLE', 'POLYGON'] })
    @IsOptional()
    @IsEnum(['CIRCLE', 'POLYGON'])
    geofence_type?: 'CIRCLE' | 'POLYGON';
}
