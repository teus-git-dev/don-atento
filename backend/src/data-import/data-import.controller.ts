import { Controller, Post, UseInterceptors, UploadedFile, Body, Get, Param, BadRequestException } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { DataImportService } from './data-import.service';
import { Public } from '../auth/public.decorator';

@Controller('data-import')
export class DataImportController {
  constructor(private readonly dataImportService: DataImportService) {}

  @Public()
  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  async uploadFile(
    @UploadedFile() file: Express.Multer.File,
    @Body('tenantId') tenantId: string,
    @Body('categoryId') categoryId: string,
  ) {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }
    if (!tenantId) {
      throw new BadRequestException('tenantId is required');
    }
    return this.dataImportService.parseFileAndPreview(file.buffer, file.originalname, tenantId, categoryId);
  }

  @Public()
  @Post('templates')
  async saveTemplate(@Body() body: any) {
    const { tenantId, name, categoryId, mapping } = body;
    return this.dataImportService.saveTemplate(tenantId, name, categoryId, mapping);
  }

  @Public()
  @Get('templates/:tenantId')
  async getTemplates(@Param('tenantId') tenantId: string) {
    return this.dataImportService.getTemplates(tenantId);
  }

  @Public()
  @Post('execute')
  @UseInterceptors(FileInterceptor('file'))
  async executeImport(
    @UploadedFile() file: Express.Multer.File,
    @Body('tenantId') tenantId: string,
    @Body('templateId') templateId: string,
    @Body('categoryId') categoryId: string,
    @Body('mapping') mappingRaw: string,
  ) {
    if (!file) throw new BadRequestException('No file uploaded');
    if (!tenantId) throw new BadRequestException('tenantId is required');
    // mapping arrives as a JSON string from FormData
    const mapping = mappingRaw ? JSON.parse(mappingRaw) : undefined;
    return this.dataImportService.executeImport(file.buffer, file.originalname, tenantId, templateId, categoryId, mapping);
  }
}
