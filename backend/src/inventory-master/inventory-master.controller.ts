import {
  Controller,
  Post,
  Get,
  Param,
  Body,
  UseInterceptors,
  UploadedFile,
  UseGuards,
  BadRequestException,
  Req,
} from '@nestjs/common';
import type { Request } from 'express';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { InventoryMasterService } from './inventory-master.service';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { TenantGuard } from '../auth/tenant.guard';
import { Roles } from '../auth/roles.decorator';
import { FileUploadService } from '../storage/file-upload.service';

/**
 * Evidence (foto, video, nota de voz) attached to inventory items.
 * Allowlist covers the categories the UI offers; deny everything else.
 */
const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'video/mp4',
  'video/quicktime',
  'video/webm',
  'audio/mpeg',
  'audio/mp4',
  'audio/wav',
  'audio/ogg',
  'audio/webm',
];

const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB

// Inventory evidence is referenced from the property dashboard over the
// property's lifetime. 7d TTL matches the ticket/contract/quotation TTL;
// Phase 3 will add URL refresh.
const INVENTORY_SIGNED_URL_TTL_SECONDS = 7 * 24 * 60 * 60;

@ApiTags('inventory-master')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard, TenantGuard)
@Controller('inventory-master')
export class InventoryMasterController {
  constructor(
    private readonly inventoryMasterService: InventoryMasterService,
    private readonly fileUpload: FileUploadService,
  ) {}

  @Post('property/:propertyId')
  @Roles('AGENT', 'ADMIN_TENANT', 'SUPERADMIN')
  @ApiOperation({
    summary: 'Crea un inventario maestro completo para un inmueble',
  })
  async createInventory(
    @Req() req: Request,
    @Param('propertyId') propertyId: string,
    @Body() data: any,
  ) {
    return this.inventoryMasterService.createPropertyInventory(
      propertyId,
      req.tenantId!,
      data,
    );
  }

  @Get('property/:propertyId')
  @Roles('AGENT', 'ADMIN_TENANT', 'SUPERADMIN')
  @ApiOperation({ summary: 'Obtiene el inventario maestro de un inmueble' })
  async getInventory(
    @Req() req: Request,
    @Param('propertyId') propertyId: string,
  ) {
    return this.inventoryMasterService.getPropertyInventory(
      propertyId,
      req.tenantId!,
    );
  }

  @Post('item/:itemId/evidence')
  @Roles('AGENT', 'ADMIN_TENANT', 'SUPERADMIN')
  @ApiOperation({
    summary: 'Agrega evidencia (foto, video, nota de voz) a un ítem',
  })
  async addEvidence(
    @Req() req: Request,
    @Param('itemId') itemId: string,
    @Body() evidenceData: any,
  ) {
    return this.inventoryMasterService.addEvidence(
      itemId,
      req.tenantId!,
      evidenceData,
    );
  }

  @Post('upload')
  @Roles('AGENT', 'ADMIN_TENANT', 'SUPERADMIN')
  @ApiOperation({
    summary: 'Sube un archivo de evidencia (imagen, video, audio)',
  })
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: MAX_FILE_SIZE_BYTES, files: 1 },
      fileFilter: (req, file, cb) => {
        if (ALLOWED_MIME_TYPES.includes(file.mimetype)) {
          cb(null, true);
        } else {
          cb(
            new BadRequestException(
              `Tipo de archivo no permitido: ${file.mimetype}. Solo se aceptan imágenes, video y audio.`,
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
      'inventory',
      file.buffer,
      {
        mimeType: file.mimetype,
        originalName: file.originalname,
        ttlSeconds: INVENTORY_SIGNED_URL_TTL_SECONDS,
      },
    );

    return {
      url,
      name: file.originalname,
      filename,
    };
  }
}
