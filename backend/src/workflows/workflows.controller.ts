import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  Req,
} from '@nestjs/common';
import { WorkflowsService } from './workflows.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { TenantGuard } from '../auth/tenant.guard';
import { Roles } from '../auth/roles.decorator';

@Controller('workflows')
@UseGuards(JwtAuthGuard, RolesGuard, TenantGuard)
export class WorkflowsController {
  constructor(private readonly workflowsService: WorkflowsService) {}

  @Get()
  @Roles('AGENT', 'ADMIN_TENANT', 'SUPERADMIN')
  async findAll(@Req() req: any) {
    return this.workflowsService.findAllByTenant(req['tenantId']);
  }

  @Post()
  @Roles('ADMIN_TENANT', 'SUPERADMIN')
  async create(
    @Req() req: any,
    @Body() data: { name: string; description?: string; states?: any[] },
  ) {
    return this.workflowsService.create({ ...data, tenantId: req['tenantId'] });
  }

  @Post('states')
  @Roles('ADMIN_TENANT', 'SUPERADMIN')
  async createState(
    @Req() req: any,
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
    return this.workflowsService.createState(req['tenantId'], data);
  }

  @Post(':id/update')
  @Roles('ADMIN_TENANT', 'SUPERADMIN')
  async update(
    @Req() req: any,
    @Param('id') id: string,
    @Body() data: { name?: string; description?: string },
  ) {
    return this.workflowsService.update(id, req['tenantId'], data);
  }

  @Post(':id/delete-states')
  @Roles('ADMIN_TENANT', 'SUPERADMIN')
  async deleteStates(@Req() req: any, @Param('id') id: string) {
    return this.workflowsService.deleteStatesByWorkflow(id, req['tenantId']);
  }

  @Post(':id/delete')
  @Roles('ADMIN_TENANT', 'SUPERADMIN')
  async delete(@Req() req: any, @Param('id') id: string) {
    return this.workflowsService.delete(id, req['tenantId']);
  }
}
