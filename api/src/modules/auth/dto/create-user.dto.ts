import { IsEmail, IsNotEmpty, IsOptional, IsString, IsEnum, IsPhoneNumber } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * DTO for creating a new user.
 * NOTE: `organization_id` is intentionally absent — the controller always
 * forces the new user into the caller's own organization to prevent
 * cross-org injection. The org is set server-side from the JWT.
 */
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
        enum: ['ADMIN', 'SUPERVISOR', 'DISPATCHER', 'FINANCE', 'DRIVER'],
        // NOTE: OWNER role cannot be assigned via this endpoint — OWNERs must
        // be seeded directly or promoted via a separate privileged operation.
    })
    @IsEnum(['ADMIN', 'SUPERVISOR', 'DISPATCHER', 'FINANCE', 'DRIVER'])
    role: string;

    @ApiPropertyOptional({ description: 'Email address' })
    @IsOptional()
    @IsEmail()
    email?: string;

    @ApiPropertyOptional({ description: 'Phone number' })
    @IsOptional()
    @IsPhoneNumber()
    phone?: string;

    @ApiPropertyOptional({ description: 'Preferred language code (fr, en, ht)' })
    @IsOptional()
    @IsString()
    preferred_lang?: string;
}
