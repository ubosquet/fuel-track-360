import { IsString, IsNumber, IsOptional, IsNotEmpty } from 'class-validator';

export class DeviceGpsIngestDto {
    @IsString()
    @IsNotEmpty()
    imei: string; // Hardware device ID

    @IsNumber()
    @IsNotEmpty()
    lat: number;

    @IsNumber()
    @IsNotEmpty()
    lng: number;

    @IsNumber()
    @IsOptional()
    speed_kmh?: number;

    @IsNumber()
    @IsOptional()
    heading?: number;

    @IsString()
    @IsNotEmpty()
    recorded_at: string;
}
