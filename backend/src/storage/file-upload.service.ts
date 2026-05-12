import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  StorageCategory,
  SupabaseStorageService,
} from './supabase-storage.service';

const DEFAULT_SIGNED_URL_TTL_SECONDS = 24 * 60 * 60;

export interface FileUploadOptions {
  mimeType: string;
  originalName: string;
  /** Override the 24h default (e.g. 7d for quotations and contracts). */
  ttlSeconds?: number;
}

export interface FileUploadResult {
  url: string;
  filename: string;
  bucketKey: string;
}

/**
 * Per-site upload contract for the public/uploads → Supabase migration:
 *   1. Upload bytes to Supabase under <tenantId>/<category>/<random>.<ext>
 *   2. Record a FileAsset row with bucketKey, mimeType, originalName, size
 *   3. Return a signed URL (24h default; per-call override via ttlSeconds)
 *
 * Rolls back the Supabase object if the FileAsset insert fails. Rollback
 * failure is logged but does not shadow the original error.
 */
@Injectable()
export class FileUploadService {
  private readonly logger = new Logger(FileUploadService.name);

  constructor(
    private storage: SupabaseStorageService,
    private prisma: PrismaService,
  ) {}

  async upload(
    tenantId: string,
    category: StorageCategory,
    buffer: Buffer,
    opts: FileUploadOptions,
  ): Promise<FileUploadResult> {
    const { bucketKey, filename } = await this.storage.upload(
      tenantId,
      category,
      buffer,
      { mimeType: opts.mimeType, originalName: opts.originalName },
    );

    try {
      await this.prisma.fileAsset.create({
        data: {
          tenantId,
          filename,
          bucketKey,
          originalName: opts.originalName,
          mimeType: opts.mimeType,
          sizeBytes: buffer.length,
        },
      });
    } catch (err) {
      await this.storage.delete(bucketKey).catch((cleanupErr: Error) => {
        this.logger.error(
          `Failed to rollback Supabase object after FileAsset insert failure: bucketKey=${bucketKey} cleanupErr=${cleanupErr.message}`,
        );
      });
      throw err;
    }

    const url = await this.storage.signedUrl(
      bucketKey,
      opts.ttlSeconds ?? DEFAULT_SIGNED_URL_TTL_SECONDS,
    );

    return { url, filename, bucketKey };
  }
}
