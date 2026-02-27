import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';
import helmet from 'helmet';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule);

  // ── Security Middleware ──
  app.use(helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
    // Minimal CSP that allows Swagger UI inline scripts/styles
    // while keeping XSS protection active.
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'"],  // Swagger UI requires inline scripts
        styleSrc: ["'self'", "'unsafe-inline'"],  // Swagger UI requires inline styles
        imgSrc: ["'self'", 'data:', 'https:'],
        connectSrc: ["'self'"],
        fontSrc: ["'self'", 'https://fonts.gstatic.com'],
      },
    },
  }));

  // ── Body size limit: prevent oversized sync payloads ──
  app.use(require('express').json({ limit: '5mb' }));
  app.use(require('express').urlencoded({ extended: true, limit: '5mb' }));

  const configService = app.get(ConfigService);
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

  // Swagger documentation
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

  await app.listen(port);
  logger.log(`🚀 Fuel-Track-360 API running on port ${port}`);
  logger.log(`📚 Swagger docs available at http://localhost:${port}/docs`);
  logger.log(`🌍 Environment: ${configService.get('APP_ENV', 'development')}`);
}

bootstrap();
