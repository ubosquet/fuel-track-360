import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class ApiKeyGuard implements CanActivate {
    constructor(private configService: ConfigService) {}

    canActivate(context: ExecutionContext): boolean {
        const request = context.switchToHttp().getRequest();
        // Check for api key in header as `x-api-key`
        const receivedKey = request.headers['x-api-key'] || request.query['api_key'];
        const configuredKey = this.configService.get<string>('HARDWARE_API_KEY');

        if (!configuredKey) {
            // Failsafe in case ENV variable is not configured
            throw new UnauthorizedException('API Key authentication is not configured on this server');
        }

        if (receivedKey === configuredKey) {
            return true;
        }

        throw new UnauthorizedException('Invalid API Key');
    }
}
