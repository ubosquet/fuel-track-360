import { IsEnum, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

const TRUCK_STATUSES = [
    'IDLE',
    'EN_ROUTE_TO_TERMINAL',
    'AT_TERMINAL',
    'LOADING',
    'EN_ROUTE_TO_STATION',
    'AT_STATION',
    'DISCHARGING',
    'MAINTENANCE',
] as const;

export type TruckStatus = typeof TRUCK_STATUSES[number];

export class UpdateTruckStatusDto {
    @ApiProperty({
        description: 'New truck operational status',
        enum: TRUCK_STATUSES,
    })
    @IsNotEmpty()
    @IsEnum(TRUCK_STATUSES)
    status: TruckStatus;
}
