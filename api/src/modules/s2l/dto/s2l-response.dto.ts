import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class S2LResponseDto {
    @ApiProperty()
    id: string;

    @ApiProperty()
    organization_id: string;

    @ApiProperty()
    truck_id: string;

    @ApiProperty()
    driver_id: string;

    @ApiProperty()
    station_id: string;

    @ApiProperty()
    status: string;

    @ApiProperty()
    checklist_data: any[];

    @ApiProperty()
    all_items_pass: boolean;

    @ApiPropertyOptional()
    signature_url?: string;

    @ApiPropertyOptional()
    submitted_at?: string;

    @ApiPropertyOptional()
    reviewed_by?: string;

    @ApiPropertyOptional()
    reviewed_at?: string;

    @ApiPropertyOptional()
    review_notes?: string;

    @ApiPropertyOptional()
    gps_lat?: number;

    @ApiPropertyOptional()
    gps_lng?: number;

    @ApiPropertyOptional()
    is_within_geofence?: boolean;

    @ApiProperty()
    offline_created: boolean;

    @ApiPropertyOptional()
    sync_id?: string;

    @ApiPropertyOptional()
    photos?: any[];

    @ApiProperty()
    created_at: string;

    @ApiProperty()
    updated_at: string;
}
