import { IsString, IsOptional, IsEnum } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateS2LDto {
    @ApiPropertyOptional({ enum: ['DRAFT', 'SUBMITTED', 'APPROVED', 'REJECTED', 'EXPIRED'] })
    @IsOptional()
    @IsEnum(['DRAFT', 'SUBMITTED', 'APPROVED', 'REJECTED', 'EXPIRED'])
    status?: 'DRAFT' | 'SUBMITTED' | 'APPROVED' | 'REJECTED' | 'EXPIRED';

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    signature_url?: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    review_notes?: string;
}
