import { Module } from '@nestjs/common';
import { createClient } from '@supabase/supabase-js';
import {
  SUPABASE_BUCKET,
  SUPABASE_CLIENT,
  SupabaseStorageService,
} from './supabase-storage.service';
import { FileUploadService } from './file-upload.service';
import { PrismaModule } from '../prisma/prisma.module';

// Fail-fast at module load: Supabase credentials are required in every
// environment (dev included — Fase 0 decision). Mirrors the JWT_SECRET
// pattern in auth.module.ts.
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const SUPABASE_STORAGE_BUCKET = process.env.SUPABASE_STORAGE_BUCKET;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY || !SUPABASE_STORAGE_BUCKET) {
  throw new Error(
    'FATAL: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, and SUPABASE_STORAGE_BUCKET environment variables are required. Server cannot start without them.',
  );
}

@Module({
  imports: [PrismaModule],
  providers: [
    SupabaseStorageService,
    FileUploadService,
    {
      provide: SUPABASE_CLIENT,
      useFactory: () =>
        createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
          auth: { persistSession: false, autoRefreshToken: false },
        }),
    },
    {
      provide: SUPABASE_BUCKET,
      useValue: SUPABASE_STORAGE_BUCKET,
    },
  ],
  exports: [SupabaseStorageService, FileUploadService],
})
export class StorageModule {}
