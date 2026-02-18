import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class FleetStatusDto {
    @ApiProperty()
    truck_id: string;

    @ApiProperty()
    plate_number: string;

    @ApiProperty()
    status: string;

    @ApiPropertyOptional()
    driver_name?: string;

    @ApiPropertyOptional()
    current_lat?: number;

    @ApiPropertyOptional()
    current_lng?: number;

    @ApiPropertyOptional()
    last_gps_at?: string;

    @ApiPropertyOptional()
    current_station?: string;

    @ApiPropertyOptional()
    is_within_geofence?: boolean;
}
