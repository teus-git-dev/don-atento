import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { ValidationPipe } from '@nestjs/common';
import * as dotenv from 'dotenv';

import { join } from 'path';
import * as express from 'express';
import helmet from 'helmet';

async function bootstrap() {
  dotenv.config();
  console.log(
    '[Bootstrap] JWT_SECRET loaded:',
    process.env.JWT_SECRET ? 'YES' : 'NO',
  );
  const app = await NestFactory.create(AppModule);
  app.setGlobalPrefix('api');
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
      forbidNonWhitelisted: false, // Permissive for now — log but don't reject
      transform: true, // Auto-transform payloads to DTO instances
    }),
  );

  // Serve static files from public/uploads
  app.use('/uploads', express.static(join(process.cwd(), 'public/uploads')));

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

  const port = process.env.PORT || 3001;
  await app.listen(port);
  console.log(`Backend server running on http://localhost:${port}`);
  console.log(
    `Swagger documentation available at http://localhost:${port}/api/docs`,
  );
}
bootstrap();
