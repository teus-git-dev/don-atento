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
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { DataImportService } from './data-import.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { TenantGuard } from '../auth/tenant.guard';
import { Roles } from '../auth/roles.decorator';

@ApiTags('data-import')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard, TenantGuard)
@Roles('ADMIN_TENANT', 'SUPERADMIN')
@Controller('data-import')
export class DataImportController {
  constructor(private readonly dataImportService: DataImportService) {}

  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
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
  async saveTemplate(@Req() req: Request, @Body() body: any) {
    const { name, categoryId, mapping } = body;
    return this.dataImportService.saveTemplate(
      req.tenantId!,
      name,
      categoryId,
      mapping,
    );
  }

  @Get('templates')
  async getTemplates(@Req() req: Request) {
    return this.dataImportService.getTemplates(req.tenantId!);
  }

  @Post('execute')
  @UseInterceptors(FileInterceptor('file'))
  async executeImport(
    @UploadedFile() file: Express.Multer.File,
    @Req() req: Request,
    @Body('templateId') templateId: string,
    @Body('categoryId') categoryId: string,
    @Body('mapping') mappingRaw: string,
  ) {
    if (!file) throw new BadRequestException('No file uploaded');
    // mapping arrives as a JSON string from FormData
    const mapping = mappingRaw ? JSON.parse(mappingRaw) : undefined;
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
