import { NestFactory } from '@nestjs/core';
import * as dotenv from 'dotenv';
dotenv.config(); // MUST BE BEFORE IMPORTING APP.MODULE TO SET JWT_SECRET!
if (process.env.NODE_ENV !== 'production') {
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
}

import { AppModule } from './app.module';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { ValidationPipe, Logger } from '@nestjs/common';

import helmet from 'helmet';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    rawBody: true,
    bufferLogs: true,
  });

  // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-unsafe-assignment
  const cookieParser = require('cookie-parser');
  // eslint-disable-next-line @typescript-eslint/no-unsafe-call
  app.use(cookieParser());

  app.use(
    helmet({
      crossOriginResourcePolicy: { policy: 'cross-origin' }, // For static uploads
    }),
  );

  app.enableCors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });

  // ── Global validation pipe (strips unknown fields, validates DTOs) ──────────
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // Strip properties not in DTO
      forbidNonWhitelisted: false, // Don't reject requests with unknown fields, just strip them
      transform: true, // Auto-transform payloads to DTO instances
    }),
  );

  // Static files from public/uploads are now served securely via FilesController

  // Swagger docs only available in development
  if (process.env.NODE_ENV !== 'production') {
    const config = new DocumentBuilder()
      .setTitle('Don Atento Connect API')
      .setDescription(
        'Plataforma Plug & Play para inmobiliarias. Automatización de mantenimiento, IA de marca y gestión de ANS.',
      )
      .setVersion('1.0')
      .addBearerAuth()
      .addTag('auth', 'Autenticación y JWT')
      .addTag('properties', 'Gestión de inmuebles y propietarios')
      .addTag('tickets', 'Gestión de mantenimiento y ANS')
      .build();
    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api/docs', app, document);
  }

  const port = process.env.PORT || 3001;
  await app.listen(port);

  const logger = new Logger('Bootstrap');
  logger.log(`Backend server running on http://localhost:${port}`);
  if (process.env.NODE_ENV !== 'production') {
    logger.log(`Swagger docs at http://localhost:${port}/api/docs`);
  }
}
void bootstrap();
