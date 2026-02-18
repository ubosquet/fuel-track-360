import { IsEnum, IsNotEmpty, IsNumber, IsOptional, IsString, Min, Max } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateStationDto {
    @ApiProperty({ description: 'Station name' })
    @IsString()
    @IsNotEmpty()
    name: string;

    @ApiProperty({ description: 'Station unique code' })
    @IsString()
    @IsNotEmpty()
    code: string;

    @ApiProperty({ enum: ['TERMINAL', 'STATION'], description: 'Type of station' })
    @IsEnum(['TERMINAL', 'STATION'])
    type: 'TERMINAL' | 'STATION';

    @ApiPropertyOptional({ enum: ['NORTH', 'SOUTH', 'EAST', 'WEST'], description: 'Geographic zone' })
    @IsOptional()
    @IsEnum(['NORTH', 'SOUTH', 'EAST', 'WEST'])
    zone?: 'NORTH' | 'SOUTH' | 'EAST' | 'WEST';

    @ApiPropertyOptional({ description: 'Physical address' })
    @IsOptional()
    @IsString()
    address?: string;

    @ApiProperty({ description: 'GPS Latitude' })
    @IsNumber()
    @Min(-90)
    @Max(90)
    gps_lat: number;

    @ApiProperty({ description: 'GPS Longitude' })
    @IsNumber()
    @Min(-180)
    @Max(180)
    gps_lng: number;

    @ApiPropertyOptional({ description: 'Geofence radius in meters (default 500)' })
    @IsOptional()
    @IsNumber()
    geofence_radius_m?: number;
}
