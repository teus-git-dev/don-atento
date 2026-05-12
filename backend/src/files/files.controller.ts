import {
  Controller,
  Get,
  Param,
  Req,
  Res,
  UseGuards,
  NotFoundException,
  StreamableFile,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { join } from 'path';
import { createReadStream, existsSync } from 'fs';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { TenantGuard } from '../auth/tenant.guard';
import { PrismaService } from '../prisma/prisma.service';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';

@ApiTags('files')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, TenantGuard)
@Controller('uploads')
export class FilesController {
  constructor(private readonly prisma: PrismaService) {}

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
    if (!asset || asset.tenantId !== req.tenantId) {
      throw new NotFoundException('File not found');
    }

    const file = join(process.cwd(), 'public/uploads', filename);

    if (!existsSync(file)) {
      throw new NotFoundException('File not found');
    }

    // Use the recorded MIME type from FileAsset instead of guessing from
    // extension — upload-side validation already enforced an allowlist.
    const contentType = asset.mimeType || 'application/octet-stream';

    res.set({
      'Content-Type': contentType,
      'Content-Disposition': `inline; filename="${filename}"`,
    });

    const stream = createReadStream(file);
    return new StreamableFile(stream);
  }
}
