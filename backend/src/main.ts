import { NestFactory, HttpAdapterHost } from '@nestjs/core';
import * as dotenv from 'dotenv';
dotenv.config(); // MUST BE BEFORE IMPORTING APP.MODULE TO SET JWT_SECRET!

import { AppModule } from './app.module';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { ValidationPipe, Logger } from '@nestjs/common';
import { Logger as PinoLogger } from 'nestjs-pino';

import helmet from 'helmet';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    rawBody: true,
    bufferLogs: true,
  });

  const cookieParser = require('cookie-parser');
  app.use(cookieParser());

  app.use(
    helmet({
      crossOriginResourcePolicy: { policy: 'cross-origin' }, // For static uploads
    }),
  );

  // ── Security: Restrict CORS to the known frontend origin ──────────────────
  const allowedOrigins = [
    process.env.FRONTEND_URL || 'http://localhost:3000',
    'http://localhost:3000',
    'http://localhost:3001',
    'http://localhost:3002', // Next.js fallback port when 3000 is taken
  ];

  app.enableCors({
    origin: (
      origin: string | undefined,
      callback: (err: Error | null, allow?: boolean) => void,
    ) => {
      // Allow requests with no origin (mobile apps, Postman, curl, Swagger)
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error(`CORS policy: origin '${origin}' not allowed`));
      }
    },
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
  });

  // ── Global validation pipe (strips unknown fields, validates DTOs) ──────────
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // Strip properties not in DTO
      forbidNonWhitelisted: true, // Reject requests with unknown fields
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
bootstrap();
