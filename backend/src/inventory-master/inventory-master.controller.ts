import { Controller, Post, Get, Param, Body, UseInterceptors, UploadedFile } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { InventoryMasterService } from './inventory-master.service';
import { ApiTags, ApiOperation } from '@nestjs/swagger';

@ApiTags('inventory-master')
@Controller('inventory-master')
export class InventoryMasterController {
  constructor(private readonly inventoryMasterService: InventoryMasterService) {}

  @Post('property/:propertyId')
  @ApiOperation({ summary: 'Crea un inventario maestro completo para un inmueble' })
  async createInventory(
    @Param('propertyId') propertyId: string,
    @Body() data: any,
  ) {
    return this.inventoryMasterService.createPropertyInventory(propertyId, data);
  }

  @Get('property/:propertyId')
  @ApiOperation({ summary: 'Obtiene el inventario maestro de un inmueble' })
  async getInventory(@Param('propertyId') propertyId: string) {
    return this.inventoryMasterService.getPropertyInventory(propertyId);
  }

  @Post('item/:itemId/evidence')
  @ApiOperation({ summary: 'Agrega evidencia (foto, video, nota de voz) a un ítem' })
  async addEvidence(
    @Param('itemId') itemId: string,
    @Body() evidenceData: any,
  ) {
    return this.inventoryMasterService.addEvidence(itemId, evidenceData);
  }

  @Post('upload')
  @ApiOperation({ summary: 'Sube un archivo de evidencia (imagen, video, audio)' })
  @UseInterceptors(FileInterceptor('file', {
    storage: diskStorage({
      destination: './public/uploads',
      filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
        cb(null, `${file.fieldname}-${uniqueSuffix}${extname(file.originalname)}`);
      },
    }),
  }))
  uploadFile(@UploadedFile() file: any) {
    return {
      url: `/uploads/${file.filename}`,
    };
  }
}
