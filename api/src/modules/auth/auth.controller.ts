import { Controller, Post, Body, Get, UseGuards, Logger } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { FirebaseAuthGuard } from '../../common/guards/firebase-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
    private readonly logger = new Logger(AuthController.name);

    constructor(private readonly authService: AuthService) { }

    @Post('register')
    @ApiOperation({ summary: 'Register a new user (admin only)' })
    async register(
        @Body()
        body: {
            firebase_uid: string;
            email?: string;
            phone?: string;
            full_name: string;
            role: string;
            organization_id: string;
            preferred_lang?: string;
        },
    ) {
        return this.authService.createUser(body);
    }

    @Get('me')
    @UseGuards(FirebaseAuthGuard)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Get current authenticated user profile' })
    async getProfile(@CurrentUser() user: any) {
        return this.authService.getUserById(user.user_id);
    }

    @Post('verify')
    @UseGuards(FirebaseAuthGuard)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Verify authentication token and return user info' })
    async verifyToken(@CurrentUser() user: any) {
        return {
            valid: true,
            user_id: user.user_id,
            role: user.role,
            organization_id: user.organization_id,
        };
    }
}
