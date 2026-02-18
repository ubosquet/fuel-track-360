import { Controller, Get } from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

@ApiTags('health')
@Controller('health')
@SkipThrottle() // Cloud Run probes shouldn't be rate-limited
export class HealthController {
    constructor(
        @InjectDataSource() private readonly dataSource: DataSource,
    ) { }

    @Get()
    @ApiOperation({ summary: 'Health check — verifies API and database connectivity' })
    @ApiResponse({ status: 200, description: 'Service is healthy' })
    @ApiResponse({ status: 503, description: 'Service is unhealthy' })
    async check() {
        const checks: Record<string, { status: string; latency_ms?: number; error?: string }> = {};

        // ── Database check ──
        const dbStart = Date.now();
        try {
            await this.dataSource.query('SELECT 1');
            checks['database'] = {
                status: 'healthy',
                latency_ms: Date.now() - dbStart,
            };
        } catch (error) {
            checks['database'] = {
                status: 'unhealthy',
                latency_ms: Date.now() - dbStart,
                error: error.message,
            };
        }

        const allHealthy = Object.values(checks).every(c => c.status === 'healthy');

        return {
            status: allHealthy ? 'healthy' : 'degraded',
            timestamp: new Date().toISOString(),
            uptime_seconds: Math.floor(process.uptime()),
            version: process.env.npm_package_version || '1.0.0',
            checks,
        };
    }
}
