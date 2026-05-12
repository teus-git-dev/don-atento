import { Inject, Injectable, Logger } from '@nestjs/common';
import { SupabaseClient } from '@supabase/supabase-js';
import { randomBytes } from 'crypto';
import { extname } from 'path';

export const SUPABASE_CLIENT = Symbol('SUPABASE_CLIENT');
export const SUPABASE_BUCKET = Symbol('SUPABASE_BUCKET');

export type StorageCategory =
  | 'tickets'
  | 'contracts'
  | 'inventory'
  | 'quotations'
  | 'brand'
  | 'inventory-reports'
  | 'legacy';

export interface UploadOptions {
  mimeType: string;
  originalName: string;
}

export interface UploadResult {
  bucketKey: string;
  filename: string;
}

/**
 * Wraps @supabase/supabase-js Storage with a tenant-scoped key convention.
 *
 * Keys follow `<tenantId>/<category>/<random>.<ext>`. The tenant prefix is
 * defense in depth — even if the FileAsset tenant check in FilesController
 * were ever bypassed, cross-tenant access would still require guessing a
 * 16-byte random filename inside another tenant's prefix.
 *
 * download() buffers the full object in memory rather than streaming. Upload
 * sites already cap files at 10 MB; the trade-off is intentional simplicity.
 */
@Injectable()
export class SupabaseStorageService {
  private readonly logger = new Logger(SupabaseStorageService.name);

  constructor(
    @Inject(SUPABASE_CLIENT) private readonly client: SupabaseClient,
    @Inject(SUPABASE_BUCKET) private readonly bucket: string,
  ) {}

  async upload(
    tenantId: string,
    category: StorageCategory,
    buffer: Buffer,
    opts: UploadOptions,
  ): Promise<UploadResult> {
    if (!tenantId) {
      throw new Error('SupabaseStorageService.upload: tenantId is required');
    }

    const ext = extname(opts.originalName).toLowerCase();
    const filename = `${randomBytes(16).toString('hex')}${ext}`;
    const bucketKey = `${tenantId}/${category}/${filename}`;

    const { error } = await this.client.storage
      .from(this.bucket)
      .upload(bucketKey, buffer, {
        contentType: opts.mimeType,
        upsert: false,
      });

    if (error) {
      this.logger.error(
        `Upload failed for tenant=${tenantId} category=${category}: ${error.message}`,
      );
      throw new Error(`Storage upload failed: ${error.message}`);
    }

    return { bucketKey, filename };
  }

  async download(bucketKey: string): Promise<Buffer> {
    const { data, error } = await this.client.storage
      .from(this.bucket)
      .download(bucketKey);

    if (error || !data) {
      this.logger.warn(
        `Download failed for key=${bucketKey}: ${error?.message}`,
      );
      throw new Error(
        `Storage download failed: ${error?.message || 'no data'}`,
      );
    }

    const arrayBuffer = await data.arrayBuffer();
    return Buffer.from(arrayBuffer);
  }

  async signedUrl(bucketKey: string, ttlSeconds?: number): Promise<string> {
    if (!ttlSeconds) {
      const parts = bucketKey.split('/');
      const category = parts.length >= 2 ? parts[1] : 'legacy';

      switch (category) {
        case 'quotations':
          ttlSeconds = 604_800; // 7 days
          break;
        case 'contracts':
          ttlSeconds = 2_592_000; // 30 days
          break;
        case 'tickets':
        case 'brand':
        default:
          ttlSeconds = 86_400; // 24 hours
          break;
      }
    }

    const { data, error } = await this.client.storage
      .from(this.bucket)
      .createSignedUrl(bucketKey, ttlSeconds);

    if (error || !data?.signedUrl) {
      this.logger.error(
        `Signed URL failed for key=${bucketKey}: ${error?.message}`,
      );
      throw new Error(`Signed URL failed: ${error?.message || 'no url'}`);
    }

    return data.signedUrl;
  }

  async delete(bucketKey: string): Promise<void> {
    const { error } = await this.client.storage
      .from(this.bucket)
      .remove([bucketKey]);

    if (error) {
      this.logger.warn(`Delete failed for key=${bucketKey}: ${error.message}`);
      throw new Error(`Storage delete failed: ${error.message}`);
    }
  }
}
