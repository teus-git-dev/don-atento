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
import { CreateInventoryTemplateDto, UpdateInventoryTemplateDto } from './dto/create-inventory-template.dto';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { TenantGuard } from '../auth/tenant.guard';
import { FeatureDisabledGuard } from './feature-disabled.guard';

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
  @UseGuards(FeatureDisabledGuard)
  @ApiOperation({ summary: 'Crea una plantilla (deshabilitado en v1)' })
  async create(@Body() dto: CreateInventoryTemplateDto) {
    return this.service.create(dto);
  }

  @Patch(':id')
  @UseGuards(FeatureDisabledGuard)
  @ApiOperation({ summary: 'Actualiza una plantilla (deshabilitado en v1)' })
  async update(@Param('id') id: string, @Body() data: UpdateInventoryTemplateDto) {
    return this.service.update(id, data);
  }

  @Patch(':id/toggle-status')
  @UseGuards(FeatureDisabledGuard)
  @ApiOperation({
    summary: 'Activa o desactiva una plantilla (deshabilitado en v1)',
  })
  async toggleStatus(@Param('id') id: string) {
    return this.service.toggleStatus(id);
  }

  @Delete(':id')
  @UseGuards(FeatureDisabledGuard)
  @ApiOperation({ summary: 'Elimina una plantilla (deshabilitado en v1)' })
  async remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}
