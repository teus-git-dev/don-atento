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
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import { CrmService } from './crm.service';
import { LegalAiService } from '../cognitive/legal-ai.service';

@Controller('crm')
export class CrmController {
  constructor(
    private readonly crmService: CrmService,
    private readonly legalAi: LegalAiService,
  ) {}

  @Post('prospects')
  create(@Body() data: any) {
    return this.crmService.createProspect(data);
  }

  @Get('prospects')
  findAll(@Query('tenantId') tenantId: string) {
    return this.crmService.findAll(tenantId);
  }

  @Patch('prospects/:id')
  update(@Param('id') id: string, @Body() data: any) {
    return this.crmService.updateProspect(id, data);
  }

  @Get('analytics/funnel')
  getFunnel(@Query('tenantId') tenantId: string) {
    return this.crmService.getFunnel(tenantId);
  }

  @Get('analytics/sentiment')
  getSentiment(@Query('tenantId') tenantId: string) {
    return this.crmService.getSentimentMetrics(tenantId);
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
  convert(@Param('id') id: string, @Query('tenantId') tenantId: string) {
    return this.crmService.convertToClient(id, tenantId);
  }

  @Post('prospects/:id/contract')
  startContract(
    @Param('id') prospectId: string,
    @Query('propertyId') propertyId: string,
    @Query('tenantId') tenantId: string,
    @Body() formData: any,
  ) {
    return this.crmService.startContractProcess(
      prospectId,
      propertyId,
      tenantId,
      formData,
    );
  }

  @Post('contracts/:requestId/generate-draft')
  generateDraft(@Param('requestId') requestId: string) {
    return this.legalAi.generateContractDraft(requestId);
  }

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
    }),
  )
  uploadFile(@UploadedFile() file: any) {
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
