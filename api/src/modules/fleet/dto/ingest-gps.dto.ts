import {
    IsArray,
    IsNotEmpty,
    IsNumber,
    IsOptional,
    IsString,
    IsUUID,
    ValidateNested,
    ArrayMaxSize,
    ArrayMinSize,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class GpsLogEntryDto {
    @ApiProperty({ description: 'UUID of the truck being tracked' })
    @IsUUID()
    truck_id: string;

    @ApiProperty({ description: 'GPS latitude (WGS84)', example: 18.5393 })
    @IsNumber()
    lat: number;

    @ApiProperty({ description: 'GPS longitude (WGS84)', example: -72.3366 })
    @IsNumber()
    lng: number;

    @ApiPropertyOptional({ description: 'Speed in km/h' })
    @IsOptional()
    @IsNumber()
    speed_kmh?: number;

    @ApiPropertyOptional({ description: 'Compass heading in degrees (0–360)' })
    @IsOptional()
    @IsNumber()
    heading?: number;

    @ApiPropertyOptional({ description: 'GPS accuracy in meters' })
    @IsOptional()
    @IsNumber()
    accuracy_m?: number;

    @ApiPropertyOptional({ description: 'Altitude in meters above sea level' })
    @IsOptional()
    @IsNumber()
    altitude_m?: number;

    @ApiProperty({ description: 'ISO 8601 timestamp when the position was recorded on the device' })
    @IsString()
    @IsNotEmpty()
    recorded_at: string;
}

export class IngestGpsLogsDto {
    @ApiProperty({
        type: [GpsLogEntryDto],
        description: 'Batch of GPS position logs from the driver\'s phone (max 200 per request)',
    })
    @IsArray()
    @ArrayMinSize(1)
    @ArrayMaxSize(200)
    @ValidateNested({ each: true })
    @Type(() => GpsLogEntryDto)
    logs: GpsLogEntryDto[];
}
