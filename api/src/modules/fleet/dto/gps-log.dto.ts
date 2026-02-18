import { IsString, IsUUID, IsEnum, IsNumber, IsOptional, IsBoolean } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateGpsLogDto {
    @ApiProperty()
    @IsUUID()
    truck_id: string;

    @ApiProperty()
    @IsNumber()
    lat: number;

    @ApiProperty()
    @IsNumber()
    lng: number;

    @ApiPropertyOptional()
    @IsOptional()
    @IsNumber()
    speed_kmh?: number;

    @ApiPropertyOptional()
    @IsOptional()
    @IsNumber()
    heading?: number;

    @ApiPropertyOptional()
    @IsOptional()
    @IsNumber()
    accuracy_m?: number;

    @ApiPropertyOptional()
    @IsOptional()
    @IsNumber()
    altitude_m?: number;

    @ApiProperty()
    @IsString()
    recorded_at: string;
}
