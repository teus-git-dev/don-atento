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
import { RolesGuard } from '../auth/roles.guard';
import { TenantGuard } from '../auth/tenant.guard';
import { Roles } from '../auth/roles.decorator';
import { FileUploadService } from '../storage/file-upload.service';
import { CreateProspectDto } from './dto/create-prospect.dto';
import { UpdateProspectDto } from './dto/update-prospect.dto';
import { CreateProspectTaskDto } from './dto/create-prospect-task.dto';
import { UpdateProspectTaskDto } from './dto/update-prospect-task.dto';
import { StartContractDto } from './dto/start-contract.dto';

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
@UseGuards(JwtAuthGuard, RolesGuard, TenantGuard)
@Controller('crm')
export class CrmController {
  constructor(
    private readonly crmService: CrmService,
    private readonly legalAi: LegalAiService,
    private readonly fileUpload: FileUploadService,
  ) {}

  @Post('prospects')
  @Roles('AGENT', 'ADMIN_TENANT', 'SUPERADMIN')
  create(@Body() data: CreateProspectDto, @Req() req: Request) {
    return this.crmService.createProspect({
      ...data,
      tenantId: req.tenantId!,
    });
  }

  @Get('prospects')
  @Roles('AGENT', 'ADMIN_TENANT', 'SUPERADMIN')
  findAll(@Req() req: Request) {
    return this.crmService.findAll(req.tenantId!);
  }

  @Patch('prospects/:id')
  @Roles('AGENT', 'ADMIN_TENANT', 'SUPERADMIN')
  update(
    @Param('id') id: string,
    @Body() data: UpdateProspectDto,
    @Req() req: Request,
  ) {
    return this.crmService.updateProspect(id, req.tenantId!, data);
  }

  @Get('analytics/funnel')
  @Roles('AGENT', 'ADMIN_TENANT', 'SUPERADMIN')
  getFunnel(@Req() req: Request) {
    return this.crmService.getFunnel(req.tenantId!);
  }

  @Get('analytics/sentiment')
  @Roles('AGENT', 'ADMIN_TENANT', 'SUPERADMIN')
  getSentiment(@Req() req: Request) {
    return this.crmService.getSentimentMetrics(req.tenantId!);
  }

  @Post('prospects/:id/tasks')
  @Roles('AGENT', 'ADMIN_TENANT', 'SUPERADMIN')
  createTask(
    @Param('id') prospectId: string,
    @Body() data: CreateProspectTaskDto,
    @Req() req: Request,
  ) {
    return this.crmService.createTask(prospectId, req.tenantId!, data);
  }

  @Patch('tasks/:taskId')
  @Roles('AGENT', 'ADMIN_TENANT', 'SUPERADMIN')
  updateTask(
    @Param('taskId') taskId: string,
    @Body() data: UpdateProspectTaskDto,
    @Req() req: Request,
  ) {
    return this.crmService.updateTask(taskId, req.tenantId!, data);
  }

  @Post('prospects/:id/convert')
  @Roles('ADMIN_TENANT', 'SUPERADMIN')
  convert(@Param('id') id: string, @Req() req: Request) {
    return this.crmService.convertToClient(id, req.tenantId!);
  }

  @Post('prospects/:id/contract')
  @Roles('AGENT', 'ADMIN_TENANT', 'SUPERADMIN')
  startContract(
    @Param('id') prospectId: string,
    @Query('propertyId') propertyId: string,
    @Req() req: Request,
    @Body() body: StartContractDto,
  ) {
    return this.crmService.startContractProcess(
      prospectId,
      propertyId,
      req.tenantId!,
      body.formData ?? {},
    );
  }

  @Post('contracts/:requestId/generate-draft')
  @Roles('AGENT', 'ADMIN_TENANT', 'SUPERADMIN')
  async generateDraft(
    @Param('requestId') requestId: string,
    @Req() req: Request,
  ) {
    // Block A: verify the contract request belongs to the caller's tenant
    // BEFORE invoking the LLM (which is billable + leaks data of foreign
    // prospects via the draft if requestId is cross-tenant).
    await this.crmService.assertContractRequestBelongsToTenant(
      requestId,
      req.tenantId!,
    );
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
  @Roles('AGENT', 'ADMIN_TENANT', 'SUPERADMIN')
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
  @Roles('ADMIN_TENANT', 'SUPERADMIN')
  approveContract(@Param('requestId') requestId: string, @Req() req: Request) {
    // userId is read from the JWT (req.user.id), NOT from the body —
    // the previous @Body('userId') flow allowed any caller to attribute
    // the approval to another user (identity spoofing on a legal-binding
    // action). Block B retires the body parameter entirely; the
    // global ValidationPipe (whitelist + forbidNonWhitelisted) rejects
    // a stale client that still sends one.
    const reqUser = (req as Request & { user?: { id?: string } }).user;
    if (!reqUser?.id) {
      // JwtAuthGuard guarantees this in practice; defensive throw.
      throw new BadRequestException('Usuario no identificado.');
    }
    return this.crmService.approveContract(
      requestId,
      req.tenantId!,
      reqUser.id,
    );
  }
}
