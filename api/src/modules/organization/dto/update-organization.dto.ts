import { IsOptional, IsString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateOrganizationDto {
    @ApiPropertyOptional({ description: 'Organization name' })
    @IsOptional()
    @IsString()
    name?: string;

    @ApiPropertyOptional({ description: 'Country code (e.g. CA)' })
    @IsOptional()
    @IsString()
    country?: string;

    @ApiPropertyOptional({ description: 'Currency code (e.g. CAD)' })
    @IsOptional()
    @IsString()
    currency?: string;

    @ApiPropertyOptional({ description: 'Timezone (e.g. America/Toronto)' })
    @IsOptional()
    @IsString()
    timezone?: string;
}
