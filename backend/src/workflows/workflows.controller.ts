import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { WorkflowsService } from './workflows.service';
import { CreateWorkflowDto } from './dto/create-workflow.dto';
import { CreateWorkflowStateDto } from './dto/create-workflow-state.dto';
import { UpdateWorkflowDto } from './dto/update-workflow.dto';
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
  async create(@Req() req: any, @Body() data: CreateWorkflowDto) {
    return this.workflowsService.create({ ...data, tenantId: req['tenantId'] });
  }

  @Post('states')
  @Roles('ADMIN_TENANT', 'SUPERADMIN')
  async createState(
    @Req() req: any,
    @Body() data: CreateWorkflowStateDto,
  ) {
    return this.workflowsService.createState(req['tenantId'], data);
  }

  @Patch(':id')
  @Roles('ADMIN_TENANT', 'SUPERADMIN')
  async update(
    @Req() req: any,
    @Param('id') id: string,
    @Body() data: UpdateWorkflowDto,
  ) {
    return this.workflowsService.update(id, req['tenantId'], data);
  }

  @Delete(':id/states')
  @Roles('ADMIN_TENANT', 'SUPERADMIN')
  async deleteStates(@Req() req: any, @Param('id') id: string) {
    return this.workflowsService.deleteStatesByWorkflow(id, req['tenantId']);
  }

  @Delete(':id')
  @Roles('ADMIN_TENANT', 'SUPERADMIN')
  async delete(@Req() req: any, @Param('id') id: string) {
    return this.workflowsService.delete(id, req['tenantId']);
  }
}
