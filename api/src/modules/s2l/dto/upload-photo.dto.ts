import {
    IsString,
    IsEnum,
    IsOptional,
    IsNumber,
    IsDateString,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum PhotoType {
    FRONT = 'FRONT',
    REAR = 'REAR',
    COMPARTMENT = 'COMPARTMENT',
    SAFETY_EQUIPMENT = 'SAFETY_EQUIPMENT',
    OTHER = 'OTHER',
}

export class UploadPhotoDto {
    @ApiProperty({
        description: 'Type of photo being uploaded',
        enum: PhotoType,
        example: 'FRONT',
    })
    @IsEnum(PhotoType, {
        message:
            'photo_type must be one of: FRONT, REAR, COMPARTMENT, SAFETY_EQUIPMENT, OTHER. ' +
            'Type de photo invalide. ' +
            'Tip foto sa a pa valab.',
    })
    photo_type: PhotoType;

    @ApiPropertyOptional({ description: 'GPS latitude where photo was captured' })
    @IsOptional()
    @IsNumber()
    gps_lat?: number;

    @ApiPropertyOptional({ description: 'GPS longitude where photo was captured' })
    @IsOptional()
    @IsNumber()
    gps_lng?: number;

    @ApiProperty({ description: 'ISO timestamp when photo was captured on device' })
    @IsDateString()
    captured_at: string;
}
