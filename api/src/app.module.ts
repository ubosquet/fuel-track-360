import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from './modules/auth/auth.module';
import { S2LModule } from './modules/s2l/s2l.module';
import { ManifestModule } from './modules/manifest/manifest.module';
import { FleetModule } from './modules/fleet/fleet.module';
import { AuditModule } from './modules/audit/audit.module';
import { OrganizationModule } from './modules/organization/organization.module';
import { SyncModule } from './modules/sync/sync.module';
import { DatabaseModule } from './database/database.module';
import { StorageModule } from './modules/storage/storage.module';
import { HealthModule } from './modules/health/health.module';

@Module({
  imports: [
    // Configuration
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env', '.env.example'],
    }),

    // Rate limiting — 100 requests per 60s per IP (default)
    ThrottlerModule.forRoot([
      {
        name: 'default',
        ttl: 60000,  // 60 seconds
        limit: 100,  // 100 requests per minute
      },
      {
        name: 'sync',
        ttl: 60000,
        limit: 20,   // Sync batches are heavier — 20 per minute
      },
    ]),

    // Database
    DatabaseModule,

    // Cloud Storage
    StorageModule,

    // Feature modules
    AuthModule,
    S2LModule,
    ManifestModule,
    FleetModule,
    AuditModule,
    OrganizationModule,
    SyncModule,
    HealthModule,
  ],
  providers: [
    // Apply rate limiting globally to all routes
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule { }
