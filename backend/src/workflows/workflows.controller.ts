import { Controller, Get, Post, Body, Query, Param, UseGuards, Req } from '@nestjs/common';
import { WorkflowsService } from './workflows.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { TenantGuard } from '../auth/tenant.guard';

@Controller('workflows')
@UseGuards(JwtAuthGuard, TenantGuard)
export class WorkflowsController {
  constructor(private readonly workflowsService: WorkflowsService) {}

  @Get()
  async findAll(@Req() req: any) {
    const tenantId = req.user.tenantId;
    return this.workflowsService.findAllByTenant(tenantId);
  }

  @Post()
  async create(
    @Req() req: any,
    @Body() data: { name: string; description?: string; states?: any[] },
  ) {
    const tenantId = req.user.tenantId;
    return this.workflowsService.create({ ...data, tenantId });
  }

  @Post('states')
  async createState(
    @Body()
    data: {
      workflowId: string;
      name: string;
      order: number;
      assignedRole?: any;
      assignedUserId?: string;
      aiInstructions?: string;
      slaHours?: number;
      color?: string;
    },
  ) {
    return this.workflowsService.createState(data);
  }

  @Post(':id/update')
  async update(
    @Param('id') id: string,
    @Body() data: { name?: string; description?: string },
  ) {
    return this.workflowsService.update(id, data);
  }

  @Post(':id/delete-states')
  async deleteStates(@Param('id') id: string) {
    return this.workflowsService.deleteStatesByWorkflow(id);
  }

  @Post(':id/delete')
  async delete(@Param('id') id: string) {
    return await this.workflowsService.delete(id);
  }
}
