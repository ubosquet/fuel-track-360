import { Module } from '@nestjs/common';
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

@Module({
  imports: [
    // Configuration
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env', '.env.example'],
    }),

    // Database
    DatabaseModule,

    // Feature modules
    AuthModule,
    S2LModule,
    ManifestModule,
    FleetModule,
    AuditModule,
    OrganizationModule,
    SyncModule,
  ],
})
export class AppModule { }
