import { IsEmail, IsNotEmpty, IsOptional, IsString, IsEnum, IsUUID, IsPhoneNumber } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateUserDto {
    @ApiProperty({ description: 'Firebase Auth UID' })
    @IsString()
    @IsNotEmpty()
    firebase_uid: string;

    @ApiProperty({ description: 'Full name of the user' })
    @IsString()
    @IsNotEmpty()
    full_name: string;

    @ApiProperty({
        description: 'Role of the user',
        enum: ['OWNER', 'ADMIN', 'SUPERVISOR', 'DISPATCHER', 'FINANCE', 'DRIVER']
    })
    @IsEnum(['OWNER', 'ADMIN', 'SUPERVISOR', 'DISPATCHER', 'FINANCE', 'DRIVER'])
    role: string;

    @ApiProperty({ description: 'Organization ID this user belongs to' })
    @IsUUID()
    organization_id: string;

    @ApiPropertyOptional({ description: 'Email address' })
    @IsOptional()
    @IsEmail()
    email?: string;

    @ApiPropertyOptional({ description: 'Phone number' })
    @IsOptional()
    @IsPhoneNumber() // Note: This requires 'libphonenumber-js' usually, but class-validator handles it if configured
    phone?: string;

    @ApiPropertyOptional({ description: 'Preferred language code' })
    @IsOptional()
    @IsString()
    preferred_lang?: string;
}
