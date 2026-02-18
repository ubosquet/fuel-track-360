import { IsString, IsOptional, IsNumber, IsEnum } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class SubmitS2LDto {
    @ApiProperty({ description: 'URL or path to the driver\'s signature image' })
    @IsString()
    signature_url: string;

    @ApiPropertyOptional({ description: 'GPS latitude at submission time' })
    @IsOptional()
    @IsNumber()
    gps_lat?: number;

    @ApiPropertyOptional({ description: 'GPS longitude at submission time' })
    @IsOptional()
    @IsNumber()
    gps_lng?: number;
}

export class ReviewS2LDto {
    @ApiProperty({
        description: 'Review decision',
        enum: ['APPROVED', 'REJECTED'],
    })
    @IsEnum(['APPROVED', 'REJECTED'])
    status: 'APPROVED' | 'REJECTED';

    @ApiPropertyOptional({ description: 'Supervisor review notes' })
    @IsOptional()
    @IsString()
    review_notes?: string;
}
