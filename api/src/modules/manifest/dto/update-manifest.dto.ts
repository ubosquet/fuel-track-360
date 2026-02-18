import { IsString, IsNumber, IsOptional, IsEnum } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateManifestStatusDto {
    @ApiProperty({
        enum: ['CREATED', 'LOADING', 'IN_TRANSIT', 'ARRIVED', 'DISCHARGING', 'COMPLETED', 'FLAGGED', 'CANCELLED'],
    })
    @IsEnum(['CREATED', 'LOADING', 'IN_TRANSIT', 'ARRIVED', 'DISCHARGING', 'COMPLETED', 'FLAGGED', 'CANCELLED'])
    status: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsNumber()
    volume_loaded_liters?: number;

    @ApiPropertyOptional()
    @IsOptional()
    @IsNumber()
    volume_discharged_liters?: number;
}
