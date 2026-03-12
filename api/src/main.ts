import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';
import helmet from 'helmet';
import compression from 'compression';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);

  const env = configService.get('APP_ENV', 'development');
  const isDev = env !== 'production';

  // ── Performance: GZIP Compression ──
  // Compresses JSON payloads to reduce bandwidth by ~70% on slow networks
  app.use(compression());

  // ── Security Middleware ──
  app.use(helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
    contentSecurityPolicy: {
      directives: isDev
        ? {
          // Dev-only: allow inline scripts/styles for Swagger UI
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'", "'unsafe-inline'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          imgSrc: ["'self'", 'data:', 'https:'],
          connectSrc: ["'self'"],
          fontSrc: ["'self'", 'https://fonts.gstatic.com'],
        }
        : {
          // Production: strict CSP, no inline
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'"],
          styleSrc: ["'self'"],
          imgSrc: ["'self'", 'data:', 'https:'],
          connectSrc: ["'self'"],
          fontSrc: ["'self'", 'https://fonts.gstatic.com'],
        },
    },
  }));

  // ── Body size limit: prevent oversized sync payloads ──
  app.use(require('express').json({ limit: '5mb' }));
  app.use(require('express').urlencoded({ extended: true, limit: '5mb' }));

  const port = configService.get<number>('APP_PORT', 8080);
  const prefix = configService.get<string>('API_PREFIX', 'api/v1');
  const corsOrigins = configService.get<string>('CORS_ORIGINS', 'http://localhost:3000');

  // Global prefix
  app.setGlobalPrefix(prefix);

  // CORS
  app.enableCors({
    origin: corsOrigins.split(','),
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Organization-Id'],
    credentials: true,
  });

  // Global pipes
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  // Global filters
  app.useGlobalFilters(new HttpExceptionFilter());

  // Global interceptors
  app.useGlobalInterceptors(new TransformInterceptor());

  // Swagger documentation — dev/staging only
  // Never expose the full API schema in production.
  if (isDev) {
    const swaggerConfig = new DocumentBuilder()
      .setTitle('Fuel-Track-360 API')
      .setDescription('API for fuel logistics management — Haiti fuel distributors')
      .setVersion('1.0')
      .addBearerAuth()
      .addTag('auth', 'Authentication & Authorization')
      .addTag('s2l', 'Safe to Load — Safety Compliance')
      .addTag('manifest', 'Delivery Manifests')
      .addTag('fleet', 'Fleet Tracking & GPS')
      .addTag('audit', 'Audit Journal')
      .addTag('sync', 'Offline Sync Engine')
      .addTag('organization', 'Organization Management')
      .build();
    const document = SwaggerModule.createDocument(app, swaggerConfig);
    SwaggerModule.setup('docs', app, document);
    logger.log(`📚 Swagger docs available at http://localhost:${port}/docs`);
  }

  await app.listen(port);
  logger.log(`🚀 Fuel-Track-360 API running on port ${port}`);
  logger.log(`🌍 Environment: ${env}`);
}

bootstrap();
