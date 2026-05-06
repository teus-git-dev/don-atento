import { Controller, Get, Param, Res, UseGuards, NotFoundException, StreamableFile } from '@nestjs/common';
import { Response } from 'express';
import { join } from 'path';
import { createReadStream, existsSync } from 'fs';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';

@ApiTags('files')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('uploads')
export class FilesController {
  @Get(':filename')
  @ApiOperation({ summary: 'Securely fetch an uploaded file' })
  getFile(@Param('filename') filename: string, @Res({ passthrough: true }) res: Response): StreamableFile {
    // Basic path traversal protection
    if (filename.includes('..') || filename.includes('/')) {
      throw new NotFoundException('Invalid filename');
    }

    const file = join(process.cwd(), 'public/uploads', filename);

    if (!existsSync(file)) {
      throw new NotFoundException('File not found');
    }

    // Set appropriate headers based on file extension (basic implementation)
    const ext = filename.split('.').pop()?.toLowerCase();
    let contentType = 'application/octet-stream';
    if (ext === 'jpg' || ext === 'jpeg') contentType = 'image/jpeg';
    else if (ext === 'png') contentType = 'image/png';
    else if (ext === 'gif') contentType = 'image/gif';
    else if (ext === 'webp') contentType = 'image/webp';
    else if (ext === 'pdf') contentType = 'application/pdf';
    else if (ext === 'mp4') contentType = 'video/mp4';

    res.set({
      'Content-Type': contentType,
      'Content-Disposition': `inline; filename="${filename}"`,
    });

    const stream = createReadStream(file);
    return new StreamableFile(stream);
  }
}
