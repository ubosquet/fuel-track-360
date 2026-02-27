import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';

@Module({
    imports: [
        TypeOrmModule.forRootAsync({
            imports: [ConfigModule],
            inject: [ConfigService],
            useFactory: (configService: ConfigService) => ({
                type: 'postgres',
                host: configService.get<string>('DATABASE_HOST', 'localhost'),
                port: configService.get<number>('DATABASE_PORT', 5432),
                username: configService.get<string>('DATABASE_USER', 'ft360_app'),
                password: configService.get<string>('DATABASE_PASSWORD', 'password'),
                database: configService.get<string>('DATABASE_NAME', 'ft360'),
                ssl: configService.get<string>('DATABASE_SSL', 'false') === 'true'
                    ? { rejectUnauthorized: false }
                    : false,
                entities: [__dirname + '/../**/*.entity{.ts,.js}'],
                migrations: [__dirname + '/migrations/*{.ts,.js}'],
                // synchronize is enabled if:
                //   - APP_ENV=development (local docker compose), OR
                //   - DATABASE_SYNC=true (explicitly set for demo deployments on Railway/etc.)
                // NEVER enable on a production database with real data.
                synchronize:
                    configService.get<string>('APP_ENV') === 'development' ||
                    configService.get<string>('DATABASE_SYNC') === 'true',
                logging: configService.get<string>('LOG_LEVEL') === 'debug',
                extra: {
                    max: 20,
                    idleTimeoutMillis: 30000,
                    connectionTimeoutMillis: 10000,
                },
            }),
        }),
    ],
})
export class DatabaseModule { }
