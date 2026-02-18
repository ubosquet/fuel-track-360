import { PartialType } from '@nestjs/swagger';
import { CreateStationDto } from './create-station.dto';
import { IsBoolean, IsOptional } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateStationDto extends PartialType(CreateStationDto) {
    @ApiPropertyOptional({ description: 'Activate/Deactivate station' })
    @IsOptional()
    @IsBoolean()
    is_active?: boolean;
}
