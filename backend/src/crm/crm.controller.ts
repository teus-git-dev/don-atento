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
  BadRequestException,
  Req,
} from '@nestjs/common';
import { Request } from 'express';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import { CrmService } from './crm.service';
import { LegalAiService } from '../cognitive/legal-ai.service';

/** Allowed MIME types for contract/document uploads */
const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
];

const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB

@Controller('crm')
export class CrmController {
  constructor(
    private readonly crmService: CrmService,
    private readonly legalAi: LegalAiService,
  ) {}

  @Post('prospects')
  create(@Body() data: any, @Req() req: Request) {
    // Use tenantId from JWT (injected by TenantGuard), not from body
    return this.crmService.createProspect({
      ...data,
      tenantId: req['tenantId'],
    });
  }

  @Get('prospects')
  findAll(@Req() req: Request) {
    // tenantId comes from the JWT via TenantGuard — never from query params
    return this.crmService.findAll(req['tenantId']);
  }

  @Patch('prospects/:id')
  update(@Param('id') id: string, @Body() data: any) {
    return this.crmService.updateProspect(id, data);
  }

  @Get('analytics/funnel')
  getFunnel(@Req() req: Request) {
    return this.crmService.getFunnel(req['tenantId']);
  }

  @Get('analytics/sentiment')
  getSentiment(@Req() req: Request) {
    return this.crmService.getSentimentMetrics(req['tenantId']);
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
    return this.crmService.convertToClient(id, req['tenantId']);
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
      req['tenantId'],
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
   * - Files stored in public/uploads; production should redirect to Supabase Storage
   */
  @Post('upload')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: './public/uploads',
        filename: (req, file, cb) => {
          const uniqueSuffix =
            Date.now() + '-' + Math.round(Math.random() * 1e9);
          cb(null, `contract-${uniqueSuffix}${extname(file.originalname)}`);
        },
      }),
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
  uploadFile(@UploadedFile() file: Express.Multer.File) {
    if (!file) return { error: 'No se subió ningún archivo' };

    return {
      url: `/uploads/${file.filename}`,
      name: file.originalname,
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
