import {
    Controller,
    Get,
    Post,
    Put,
    Body,
    UseGuards,
    HttpCode,
    HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { TutorialService } from './tutorial.service';
import { FirebaseAuthGuard } from '../../common/guards/firebase-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthTokenPayload } from '../../../../packages/shared/src/types/user.types';
import { AuthService } from '../auth/auth.service';

class CompleteStepsDto { step_ids!: string[]; }
class DismissStepDto { step_id!: string; }
class ToggleDto { enabled!: boolean; }

@ApiTags('tutorial')
@ApiBearerAuth()
@Controller('tutorial')
@UseGuards(FirebaseAuthGuard)
export class TutorialController {
    constructor(
        private readonly tutService: TutorialService,
        private readonly authService: AuthService,
    ) { }

    @Get('state')
    @ApiOperation({ summary: 'Get tutorial steps to show for the current user + role' })
    async getState(@CurrentUser() user: AuthTokenPayload) {
        // Fetch last_login_at from DB for the idle 30-day trigger
        const dbUser = await this.authService.getUserById(user.user_id);
        return this.tutService.getState(user.user_id, user.role, dbUser.last_login_at);
    }

    @Post('complete')
    @HttpCode(HttpStatus.NO_CONTENT)
    @ApiOperation({ summary: 'Mark one or more tutorial steps as completed' })
    async complete(
        @Body() body: CompleteStepsDto,
        @CurrentUser() user: AuthTokenPayload,
    ) {
        await this.tutService.completeSteps(user.user_id, body.step_ids);
    }

    @Post('dismiss')
    @HttpCode(HttpStatus.NO_CONTENT)
    @ApiOperation({ summary: 'Dismiss (skip) a tutorial step' })
    async dismiss(
        @Body() body: DismissStepDto,
        @CurrentUser() user: AuthTokenPayload,
    ) {
        await this.tutService.dismissStep(user.user_id, body.step_id);
    }

    @Put('toggle')
    @HttpCode(HttpStatus.NO_CONTENT)
    @ApiOperation({ summary: 'Enable or disable the tutorial for the current user' })
    async toggle(
        @Body() body: ToggleDto,
        @CurrentUser() user: AuthTokenPayload,
    ) {
        await this.tutService.toggleTutorial(user.user_id, body.enabled);
    }
}
