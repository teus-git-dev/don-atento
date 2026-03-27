import { Controller, Get, Post, Body, Patch, Param, Query } from '@nestjs/common';
import { CrmService } from './crm.service';

@Controller('crm')
export class CrmController {
  constructor(private readonly crmService: CrmService) {}

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
}
