import { IsEmail, IsEnum, IsOptional, IsString, IsBoolean, IsPhoneNumber } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateUserDto {
    @ApiPropertyOptional({ description: 'Full name of the user' })
    @IsOptional()
    @IsString()
    full_name?: string;

    @ApiPropertyOptional({
        description: 'Role of the user',
        enum: ['OWNER', 'ADMIN', 'SUPERVISOR', 'DISPATCHER', 'FINANCE', 'DRIVER']
    })
    @IsOptional()
    @IsEnum(['OWNER', 'ADMIN', 'SUPERVISOR', 'DISPATCHER', 'FINANCE', 'DRIVER'])
    role?: string;

    @ApiPropertyOptional({ description: 'Phone number' })
    @IsOptional()
    @IsString()
    phone?: string;

    @ApiPropertyOptional({ description: 'Email address' })
    @IsOptional()
    @IsEmail()
    email?: string;

    @ApiPropertyOptional({ description: 'Preferred language code (e.g., fr, en)' })
    @IsOptional()
    @IsString()
    preferred_lang?: string;

    @ApiPropertyOptional({ description: 'Account activation status' })
    @IsOptional()
    @IsBoolean()
    is_active?: boolean;
}
