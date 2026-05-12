import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Query,
  UseInterceptors,
  UploadedFile,
  UseGuards,
  BadRequestException,
  Req,
} from '@nestjs/common';
import type { Request } from 'express';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { CrmService } from './crm.service';
import { LegalAiService } from '../cognitive/legal-ai.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { TenantGuard } from '../auth/tenant.guard';
import { FileUploadService } from '../storage/file-upload.service';

/** Allowed MIME types for contract/document uploads */
const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
];

const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB

// Contracts live long-term in ContractDocument.fileUrl. 24h is too short for
// clients reviewing/signing over multiple days. Matches the quotations TTL in
// cognitive.service.ts. Phase 3 will introduce URL refresh for older records.
const CONTRACT_SIGNED_URL_TTL_SECONDS = 7 * 24 * 60 * 60;

@ApiTags('crm')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, TenantGuard)
@Controller('crm')
export class CrmController {
  constructor(
    private readonly crmService: CrmService,
    private readonly legalAi: LegalAiService,
    private readonly fileUpload: FileUploadService,
  ) {}

  @Post('prospects')
  create(@Body() data: any, @Req() req: Request) {
    // Use tenantId from JWT (injected by TenantGuard), not from body
    return this.crmService.createProspect({
      ...data,
      tenantId: req.tenantId!,
    });
  }

  @Get('prospects')
  findAll(@Req() req: Request) {
    // tenantId comes from the JWT via TenantGuard — never from query params
    return this.crmService.findAll(req.tenantId!);
  }

  @Patch('prospects/:id')
  update(@Param('id') id: string, @Body() data: any) {
    return this.crmService.updateProspect(id, data);
  }

  @Get('analytics/funnel')
  getFunnel(@Req() req: Request) {
    return this.crmService.getFunnel(req.tenantId!);
  }

  @Get('analytics/sentiment')
  getSentiment(@Req() req: Request) {
    return this.crmService.getSentimentMetrics(req.tenantId!);
  }

  @Post('prospects/:id/tasks')
  createTask(@Param('id') prospectId: string, @Body() data: any) {
    return this.crmService.createTask(prospectId, data);
  }

  @Patch('tasks/:taskId')
  updateTask(@Param('taskId') taskId: string, @Body() data: any) {
    return this.crmService.updateTask(taskId, data);
  }

  @Post('prospects/:id/convert')
  convert(@Param('id') id: string, @Req() req: Request) {
    return this.crmService.convertToClient(id, req.tenantId!);
  }

  @Post('prospects/:id/contract')
  startContract(
    @Param('id') prospectId: string,
    @Query('propertyId') propertyId: string,
    @Req() req: Request,
    @Body() formData: any,
  ) {
    return this.crmService.startContractProcess(
      prospectId,
      propertyId,
      req.tenantId!,
      formData,
    );
  }

  @Post('contracts/:requestId/generate-draft')
  generateDraft(@Param('requestId') requestId: string) {
    return this.legalAi.generateContractDraft(requestId);
  }

  /**
   * Secure file upload for contracts and documents.
   * - MIME type allowlist (no executables, scripts, or unknown types)
   * - 10 MB size limit
   * - Files stored in Supabase Storage under <tenantId>/contracts/<random>.<ext>
   *   via FileUploadService (creates FileAsset row, rolls back on DB failure)
   * - Returns a 7-day signed URL (see CONTRACT_SIGNED_URL_TTL_SECONDS).
   */
  @Post('upload')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: {
        fileSize: MAX_FILE_SIZE_BYTES,
        files: 1,
      },
      fileFilter: (req, file, cb) => {
        if (ALLOWED_MIME_TYPES.includes(file.mimetype)) {
          cb(null, true);
        } else {
          cb(
            new BadRequestException(
              `Tipo de archivo no permitido: ${file.mimetype}. Solo se aceptan imágenes, PDF y DOCX.`,
            ),
            false,
          );
        }
      },
    }),
  )
  async uploadFile(
    @UploadedFile() file: Express.Multer.File,
    @Req() req: Request,
  ) {
    if (!file) return { error: 'No se subió ningún archivo' };

    const { url, filename } = await this.fileUpload.upload(
      req.tenantId!,
      'contracts',
      file.buffer,
      {
        mimeType: file.mimetype,
        originalName: file.originalname,
        ttlSeconds: CONTRACT_SIGNED_URL_TTL_SECONDS,
      },
    );

    return {
      url,
      name: file.originalname,
      filename,
    };
  }

  @Post('contracts/:requestId/approve')
  approveContract(
    @Param('requestId') requestId: string,
    @Body('userId') userId: string,
  ) {
    return this.crmService.approveContract(requestId, userId);
  }
}
