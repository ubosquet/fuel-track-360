import { IsDateString, IsNumber, IsOptional, IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class AddPhotoDto {
    @ApiProperty({ description: 'Type of photo (FRONT, REAR, etc.)' })
    @IsString()
    @IsNotEmpty()
    photo_type: string;

    @ApiProperty({ description: 'Storage path in GCS' })
    @IsString()
    @IsNotEmpty()
    storage_path: string;

    @ApiPropertyOptional({ description: 'Size of file in bytes' })
    @IsOptional()
    @IsNumber()
    file_size_bytes?: number;

    @ApiPropertyOptional({ description: 'GPS Latitude' })
    @IsOptional()
    @IsNumber()
    gps_lat?: number;

    @ApiPropertyOptional({ description: 'GPS Longitude' })
    @IsOptional()
    @IsNumber()
    gps_lng?: number;

    @ApiProperty({ description: 'ISO 8601 timestamp' })
    @IsDateString()
    captured_at: string;
}
