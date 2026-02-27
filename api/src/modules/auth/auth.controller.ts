import {
    Controller,
    Post,
    Body,
    Get,
    Put,
    Param,
    Query,
    UseGuards,
    Logger,
    ParseUUIDPipe,
    HttpCode,
    HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { FirebaseAuthGuard } from '../../common/guards/firebase-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import type { AuthTokenPayload } from '../../../../packages/shared/src/types/user.types';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
    private readonly logger = new Logger(AuthController.name);

    constructor(private readonly authService: AuthService) { }

    /**
     * Register a new user within the caller's organization.
     * ⚠️  REQUIRES: valid Firebase token + ADMIN or OWNER role.
     * Only an existing ADMIN/OWNER can invite new users.
     */
    @Post('register')
    @UseGuards(FirebaseAuthGuard, RolesGuard)
    @Roles('ADMIN', 'OWNER')
    @ApiBearerAuth()
    @HttpCode(HttpStatus.CREATED)
    @ApiOperation({ summary: 'Register a new user in the caller\'s organization (ADMIN/OWNER only)' })
    async register(
        @Body() body: CreateUserDto,
        @CurrentUser() caller: AuthTokenPayload,
    ) {
        // Force the new user into the caller's own organization — prevents cross-org injection
        return this.authService.createUser({
            ...body,
            organization_id: caller.organization_id,
        });
    }

    @Get('me')
    @UseGuards(FirebaseAuthGuard)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Get current authenticated user profile' })
    async getProfile(@CurrentUser() user: AuthTokenPayload) {
        return this.authService.getUserById(user.user_id);
    }

    @Post('verify')
    @UseGuards(FirebaseAuthGuard)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Verify authentication token and return user info' })
    async verifyToken(@CurrentUser() user: AuthTokenPayload) {
        return {
            valid: true,
            user_id: user.user_id,
            role: user.role,
            organization_id: user.organization_id,
        };
    }

    // ══════════════════════════════════════════════════════════
    // User Management (Admin/Owner only)
    // ══════════════════════════════════════════════════════════

    @Get('users')
    @UseGuards(FirebaseAuthGuard, RolesGuard)
    @Roles('ADMIN', 'OWNER', 'SUPERVISOR')
    @ApiBearerAuth()
    @ApiOperation({ summary: 'List users in the organization' })
    @ApiQuery({ name: 'role', required: false, enum: ['DRIVER', 'DISPATCHER', 'SUPERVISOR', 'FINANCE', 'ADMIN', 'OWNER'] })
    @ApiQuery({ name: 'active', required: false, enum: ['true', 'false', 'all'] })
    async listUsers(
        @CurrentUser() user: AuthTokenPayload,
        @Query('role') role?: string,
        @Query('active') active?: string,
    ) {
        const filters: { role?: string; is_active?: boolean } = {};
        if (role) filters.role = role;
        if (active === 'true') filters.is_active = true;
        else if (active === 'false') filters.is_active = false;
        // 'all' or undefined → no filter (show all)

        return this.authService.getUsersByOrganization(user.organization_id, filters);
    }

    @Get('users/:id')
    @UseGuards(FirebaseAuthGuard, RolesGuard)
    @Roles('ADMIN', 'OWNER', 'SUPERVISOR')
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Get a specific user by ID' })
    async getUser(@Param('id', ParseUUIDPipe) id: string) {
        return this.authService.getUserById(id);
    }

    @Put('users/:id')
    @UseGuards(FirebaseAuthGuard, RolesGuard)
    @Roles('ADMIN', 'OWNER')
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Update a user (name, role, active status)' })
    async updateUser(
        @Param('id', ParseUUIDPipe) id: string,
        @Body() body: UpdateUserDto,
        @CurrentUser() user: AuthTokenPayload,
    ) {
        return this.authService.updateUser(id, user.organization_id, body);
    }
}
