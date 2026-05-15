import {
  Controller,
  Post,
  UseInterceptors,
  UploadedFile,
  Body,
  Get,
  BadRequestException,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { DataImportService } from './data-import.service';
import { SaveTemplateDto } from './dto/save-template.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { TenantGuard } from '../auth/tenant.guard';
import { Roles } from '../auth/roles.decorator';

/**
 * MIME allowlist for XLSX uploads. Block B introduces the explicit
 * check — pre-Block-B `FileInterceptor('file')` (without options)
 * accepted any MIME type and the buffer went straight to
 * `node-xlsx.parse`, opening a path for zip-bomb DoS / malformed
 * archive parsing exploits.
 */
const ALLOWED_MIME_TYPES = [
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
  'application/vnd.ms-excel', // .xls
  'application/octet-stream', // some browsers send this for .xlsx; node-xlsx will reject if not actually XLSX
];

const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB — reduced from 50 MB

@ApiTags('data-import')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard, TenantGuard)
@Roles('ADMIN_TENANT', 'SUPERADMIN')
@Controller('data-import')
export class DataImportController {
  constructor(private readonly dataImportService: DataImportService) {}

  @Post('upload')
  @ApiOperation({ summary: 'Subir archivo XLS para previsualización' })
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
              `Tipo de archivo no permitido: ${file.mimetype}. Solo se aceptan .xlsx y .xls.`,
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
    @Body('categoryId') categoryId: string,
  ) {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }
    return this.dataImportService.parseFileAndPreview(
      file.buffer,
      file.originalname,
      req.tenantId!,
      categoryId,
    );
  }

  @Post('templates')
  @ApiOperation({ summary: 'Guardar template de mapping para reutilizar' })
  async saveTemplate(@Req() req: Request, @Body() body: SaveTemplateDto) {
    return this.dataImportService.saveTemplate(
      req.tenantId!,
      body.name,
      body.categoryId,
      body.mapping,
    );
  }

  @Get('templates')
  @ApiOperation({ summary: 'Listar templates del tenant' })
  async getTemplates(@Req() req: Request) {
    return this.dataImportService.getTemplates(req.tenantId!);
  }

  @Post('execute')
  @ApiOperation({ summary: 'Ejecutar import con un template existente' })
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
              `Tipo de archivo no permitido: ${file.mimetype}. Solo se aceptan .xlsx y .xls.`,
            ),
            false,
          );
        }
      },
    }),
  )
  async executeImport(
    @UploadedFile() file: Express.Multer.File,
    @Req() req: Request,
    @Body('templateId') templateId: string,
    @Body('categoryId') categoryId: string,
    @Body('mapping') mappingRaw: string,
  ) {
    if (!file) throw new BadRequestException('No file uploaded');
    // Block B: parse mapping JSON inside try/catch so malformed
    // input produces a 400 instead of an unhandled SyntaxError 500.
    let mapping: Record<string, string> | undefined;
    if (mappingRaw) {
      try {
        mapping = JSON.parse(mappingRaw);
      } catch {
        throw new BadRequestException('mapping debe ser JSON válido');
      }
    }
    return this.dataImportService.executeImport(
      file.buffer,
      file.originalname,
      req.tenantId!,
      templateId,
      categoryId,
      mapping,
    );
  }
}
