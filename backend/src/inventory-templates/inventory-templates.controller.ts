import {
  Controller,
  Post,
  Get,
  Param,
  Body,
  Delete,
  Patch,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import { InventoryTemplatesService } from './inventory-templates.service';
import {
  CreateInventoryTemplateDto,
  UpdateInventoryTemplateDto,
} from './dto/create-inventory-template.dto';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { TenantGuard } from '../auth/tenant.guard';

@ApiTags('inventory-templates')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, TenantGuard)
@Controller('inventory-templates')
export class InventoryTemplatesController {
  constructor(private readonly service: InventoryTemplatesService) {}

  // ── Read-only endpoints (v1: tenant-scoped via JWT) ────────────────────────

  @Get()
  async findAll(@Req() req: Request) {
    return this.service.findAll(req.tenantId!);
  }

  @Get(':id')
  async findOne(@Req() req: Request, @Param('id') id: string) {
    return this.service.findOne(id, req.tenantId!);
  }

  // ── Write endpoints (disabled in v1; full remediation deferred post-v1) ───

  @Post()
  @ApiOperation({ summary: 'Crea una plantilla' })
  async create(@Req() req: Request, @Body() dto: CreateInventoryTemplateDto) {
    dto.tenantId = req.tenantId!;
    return this.service.create(dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Actualiza una plantilla' })
  async update(
    @Req() req: Request,
    @Param('id') id: string,
    @Body() data: UpdateInventoryTemplateDto,
  ) {
    return this.service.update(id, req.tenantId!, data);
  }

  @Patch(':id/toggle-status')
  @ApiOperation({
    summary: 'Activa o desactiva una plantilla',
  })
  async toggleStatus(@Req() req: Request, @Param('id') id: string) {
    return this.service.toggleStatus(id, req.tenantId!);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Elimina una plantilla' })
  async remove(@Req() req: Request, @Param('id') id: string) {
    return this.service.remove(id, req.tenantId!);
  }
}
