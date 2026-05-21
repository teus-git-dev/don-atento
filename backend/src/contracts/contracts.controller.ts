import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import type { Request } from 'express';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { ContractsService } from './contracts.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { TenantGuard } from '../auth/tenant.guard';
import { Roles } from '../auth/roles.decorator';
import { FileUploadService } from '../storage/file-upload.service';

/**
 * Contracts surface — legally binding documents per Ley 820 de 2003.
 *
 * Authorization matrix:
 *  - reads (`getDocuments`)         → AGENT, ADMIN_TENANT, SUPERADMIN
 *  - writes (`uploadContract`, delete) → ADMIN_TENANT, SUPERADMIN only
 *
 * Block C migrates uploads from body-supplied URL to multipart upload
 * via FileUploadService — same pattern as tickets / crm / properties.
 * The file lands in Supabase Storage under `<tenantId>/contracts/`
 * and a FileAsset row is created atomically. The body-supplied URL
 * (and its stored-URL-injection risk) is retired.
 */

/** MIME types accepted for contract uploads. */
const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
  'application/msword', // legacy .doc
  'image/jpeg',
  'image/png',
];

/** Max upload size. Contracts are typically PDF/DOCX in MB range. */
const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB

/** Signed URL TTL for contract previews. Matches the TTL used by
 *  tickets / crm uploads — contracts are reviewed over multiple
 *  days, so 7d is the floor. Phase 3 will add URL refresh. */
const CONTRACT_SIGNED_URL_TTL_SECONDS = 7 * 24 * 60 * 60;

@ApiTags('contracts')
@ApiBearerAuth()
@Controller('contracts')
@UseGuards(JwtAuthGuard, RolesGuard, TenantGuard)
export class ContractsController {
  constructor(
    private readonly contractsService: ContractsService,
    private readonly fileUpload: FileUploadService,
  ) {}

  @Post('upload')
  @Roles('ADMIN_TENANT', 'SUPERADMIN')
  @ApiOperation({
    summary: 'Subir documento de contrato (PDF/DOCX/imagen — multipart)',
  })
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: MAX_FILE_SIZE_BYTES, files: 1 },
      fileFilter: (_req, file, cb) => {
        if (ALLOWED_MIME_TYPES.includes(file.mimetype)) {
          cb(null, true);
        } else {
          cb(
            new BadRequestException(
              `Tipo de archivo no permitido: ${file.mimetype}. Solo se aceptan PDF, DOCX, DOC e imágenes.`,
            ),
            false,
          );
        }
      },
    }),
  )
  async uploadContract(
    @Req() req: Request,
    @UploadedFile() file: Express.Multer.File,
    @Body('propertyId') propertyId: string,
  ) {
    const tenantId = req.tenantId!;
    if (!file) {
      throw new BadRequestException('No se subió ningún archivo');
    }
    if (!propertyId || typeof propertyId !== 'string') {
      throw new BadRequestException('propertyId es requerido');
    }

    const { url, filename } = await this.fileUpload.upload(
      tenantId,
      'contracts',
      file.buffer,
      {
        mimeType: file.mimetype,
        originalName: file.originalname,
        ttlSeconds: CONTRACT_SIGNED_URL_TTL_SECONDS,
      },
    );

    const document = await this.contractsService.createDocumentRecord(
      tenantId,
      propertyId,
      url,
    );

    return {
      ...document,
      filename,
      signedUrl: url,
    };
  }

  @Get('property/:propertyId')
  @Roles('AGENT', 'ADMIN_TENANT', 'SUPERADMIN')
  @ApiOperation({
    summary: 'Listar documentos contractuales de una propiedad (paginado)',
  })
  @ApiQuery({ name: 'page', required: false, example: '1' })
  @ApiQuery({ name: 'limit', required: false, example: '20' })
  async getDocuments(
    @Req() req: Request,
    @Param('propertyId') propertyId: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const tenantId = req.tenantId!;
    const pageNum = Math.max(1, page ? parseInt(page, 10) : 1);
    const requestedLimit = limit ? parseInt(limit, 10) : 20;
    const limitNum = Math.max(1, isNaN(requestedLimit) ? 20 : requestedLimit);
    return this.contractsService.getDocumentsByProperty(
      tenantId,
      propertyId,
      pageNum,
      limitNum,
    );
  }

  @Delete(':id')
  @Roles('ADMIN_TENANT', 'SUPERADMIN')
  @ApiOperation({
    summary: 'Eliminar registro de documento contractual (no borra el archivo)',
  })
  async deleteDocument(@Req() req: Request, @Param('id') id: string) {
    const tenantId = req.tenantId!;
    return this.contractsService.deleteDocument(id, tenantId);
  }
}
