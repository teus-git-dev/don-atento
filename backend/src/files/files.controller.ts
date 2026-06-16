import {
  Controller,
  Get,
  Param,
  Req,
  Res,
  UseGuards,
  NotFoundException,
  StreamableFile,
  Logger,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { join } from 'path';
import { createReadStream, existsSync } from 'fs';
import { Readable } from 'stream';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { TenantGuard } from '../auth/tenant.guard';
import { PrismaService } from '../prisma/prisma.service';
import { SupabaseStorageService } from '../storage/supabase-storage.service';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';

// Refresh endpoint hands out 24h URLs by default. Same as the Supabase
// storage default; matches the rest of the migration.
const REFRESH_SIGNED_URL_TTL_SECONDS = 24 * 60 * 60;

@ApiTags('files')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, TenantGuard)
@Controller('uploads')
export class FilesController {
  private readonly logger = new Logger(FilesController.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: SupabaseStorageService,
  ) {}

  @Get(':filename/signed-url')
  @ApiOperation({
    summary: 'Get a fresh 24h signed URL for a previously uploaded file',
  })
  async getSignedUrl(
    @Req() req: Request,
    @Param('filename') filename: string,
  ): Promise<{ url: string; expiresAt: string }> {
    if (filename.includes('..') || filename.includes('/')) {
      throw new NotFoundException('Invalid filename');
    }

    const asset = await this.prisma.fileAsset.findUnique({
      where: { filename },
    });
    if (!asset || asset.tenantId !== (req.user as any).tenantId) {
      throw new NotFoundException('File not found');
    }

    if (!asset.bucketKey) {
      // Legacy file (Phase 4 backfill not yet complete). Can't mint a
      // signed URL because the file is on disk, not Supabase.
      throw new NotFoundException(
        'File not available for signed URL (legacy disk file)',
      );
    }

    const url = await this.storage.signedUrl(
      asset.bucketKey,
      REFRESH_SIGNED_URL_TTL_SECONDS,
    );
    const expiresAt = new Date(
      Date.now() + REFRESH_SIGNED_URL_TTL_SECONDS * 1000,
    ).toISOString();

    return { url, expiresAt };
  }

  @Get(':filename')
  @ApiOperation({ summary: 'Securely fetch an uploaded file' })
  async getFile(
    @Req() req: Request,
    @Param('filename') filename: string,
    @Res({ passthrough: true }) res: Response,
  ): Promise<StreamableFile> {
    // Basic path traversal protection
    if (filename.includes('..') || filename.includes('/')) {
      throw new NotFoundException('Invalid filename');
    }

    // Verify the file belongs to the caller's tenant via FileAsset metadata.
    // Same NotFoundException for "no record" and "wrong tenant" so we don't
    // leak whether the filename exists in another tenant.
    const asset = await this.prisma.fileAsset.findUnique({
      where: { filename },
    });
    if (!asset || asset.tenantId !== (req.user as any).tenantId) {
      throw new NotFoundException('File not found');
    }

    // Use the recorded MIME type from FileAsset instead of guessing from
    // extension — upload-side validation already enforced an allowlist.
    const contentType = asset.mimeType || 'application/octet-stream';

    res.set({
      'Content-Type': contentType,
      'Content-Disposition': `inline; filename="${filename}"`,
    });

    // Phase 2 uploads have bucketKey set → stream from Supabase.
    // Pre-migration / dev-only files fall back to local disk (Phase 4
    // backfill will eventually eliminate this branch).
    if (asset.bucketKey) {
      try {
        const buffer = await this.storage.download(asset.bucketKey);
        return new StreamableFile(Readable.from(buffer));
      } catch (err) {
        this.logger.warn(
          `Supabase download failed for ${filename} (bucketKey=${asset.bucketKey}): ${(err as Error).message}`,
        );
        throw new NotFoundException('File not found');
      }
    }

    const file = join(process.cwd(), 'public/uploads', filename);
    if (!existsSync(file)) {
      throw new NotFoundException('File not found');
    }
    return new StreamableFile(createReadStream(file));
  }
}
