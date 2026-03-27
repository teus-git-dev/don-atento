import { Controller, Get, Post, Body, Query } from '@nestjs/common';
import { WorkflowsService } from './workflows.service';

@Controller('workflows')
export class WorkflowsController {
  constructor(private readonly workflowsService: WorkflowsService) {}

  @Get()
  async findAll(@Query('tenantId') tenantId: string) {
    return this.workflowsService.findAllByTenant(tenantId);
  }

  @Post()
  async create(@Body() data: { tenantId: string; name: string; description?: string }) {
    return this.workflowsService.create(data);
  }

  @Post('states')
  async createState(@Body() data: {
    workflowId: string;
    name: string;
    order: number;
    assignedRole?: any;
    assignedUserId?: string;
    aiInstructions?: string;
    slaHours?: number;
    color?: string;
  }) {
    return this.workflowsService.createState(data);
  }
}
