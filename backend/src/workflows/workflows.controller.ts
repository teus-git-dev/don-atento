import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import type { Request } from 'express';
import { WorkflowsService } from './workflows.service';
import { CreateWorkflowDto } from './dto/create-workflow.dto';
import { CreateWorkflowStateDto } from './dto/create-workflow-state.dto';
import { UpdateWorkflowDto } from './dto/update-workflow.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { TenantGuard } from '../auth/tenant.guard';
import { Roles } from '../auth/roles.decorator';

/**
 * Server-side cap on `?limit=`. Same value as properties to keep page
 * sizes uniform across the dashboard.
 */
const MAX_PAGE_LIMIT = 100;

@ApiTags('workflows')
@ApiBearerAuth()
@Controller('workflows')
@UseGuards(JwtAuthGuard, RolesGuard, TenantGuard)
export class WorkflowsController {
  constructor(private readonly workflowsService: WorkflowsService) {}

  @Get()
  @Roles('AGENT', 'ADMIN_TENANT', 'SUPERADMIN')
  @ApiOperation({ summary: 'Listar workflows del tenant (paginado)' })
  @ApiQuery({ name: 'page', required: false, example: '1' })
  @ApiQuery({ name: 'limit', required: false, example: '20' })
  async findAll(
    @Req() req: Request,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const pageNum = Math.max(1, page ? parseInt(page, 10) : 1);
    const requestedLimit = limit ? parseInt(limit, 10) : 20;
    const limitNum = Math.min(
      Math.max(1, isNaN(requestedLimit) ? 20 : requestedLimit),
      MAX_PAGE_LIMIT,
    );
    return this.workflowsService.findAllByTenant(
      req.tenantId!,
      pageNum,
      limitNum,
    );
  }

  @Post()
  @Roles('ADMIN_TENANT', 'SUPERADMIN')
  @ApiOperation({ summary: 'Crear nuevo workflow (con estados opcionales)' })
  async create(@Req() req: Request, @Body() data: CreateWorkflowDto) {
    return this.workflowsService.create({ ...data, tenantId: req.tenantId! });
  }

  @Post('states')
  @Roles('ADMIN_TENANT', 'SUPERADMIN')
  @ApiOperation({
    summary: 'Agregar un estado a un workflow existente del tenant',
  })
  // Guard: tenantId must be set by TenantGuard before reaching this handler
  async createState(@Req() req: Request, @Body() data: CreateWorkflowStateDto) {
    return this.workflowsService.createState(req.tenantId!, data);
  }

  @Patch(':id')
  @Roles('ADMIN_TENANT', 'SUPERADMIN')
  @ApiOperation({ summary: 'Actualizar nombre / descripción de un workflow' })
  async update(
    @Req() req: Request,
    @Param('id') id: string,
    @Body() data: UpdateWorkflowDto,
  ) {
    return this.workflowsService.update(id, req.tenantId!, data);
  }

  @Delete(':id/states')
  @Roles('ADMIN_TENANT', 'SUPERADMIN')
  @ApiOperation({
    summary: 'Eliminar todos los estados de un workflow (mantiene el workflow)',
  })
  async deleteStates(@Req() req: Request, @Param('id') id: string) {
    return this.workflowsService.deleteStatesByWorkflow(id, req.tenantId!);
  }

  @Delete(':id')
  @Roles('ADMIN_TENANT', 'SUPERADMIN')
  @ApiOperation({
    summary: 'Eliminar un workflow y sus estados (operación atómica)',
  })
  async delete(@Req() req: Request, @Param('id') id: string) {
    return this.workflowsService.delete(id, req.tenantId!);
  }
}
