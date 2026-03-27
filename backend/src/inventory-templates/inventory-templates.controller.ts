import { Controller, Post, Get, Param, Body, Delete, Patch, Query } from '@nestjs/common';
import { InventoryTemplatesService } from './inventory-templates.service';
import { CreateInventoryTemplateDto } from './dto/create-inventory-template.dto';
import { ApiTags, ApiOperation } from '@nestjs/swagger';

@ApiTags('inventory-templates')
@Controller('inventory-templates')
export class InventoryTemplatesController {
  constructor(private readonly service: InventoryTemplatesService) {}

  @Post()
  async create(@Body() dto: CreateInventoryTemplateDto) {
    return this.service.create(dto);
  }

  @Get()
  async findAll(@Query('tenantId') tenantId: string) {
    return this.service.findAll(tenantId);
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Actualiza una plantilla de inventario' })
  async update(@Param('id') id: string, @Body() data: any) {
    return this.service.update(id, data);
  }

  @Patch(':id/toggle-status')
  @ApiOperation({ summary: 'Activa o desactiva una plantilla' })
  async toggleStatus(@Param('id') id: string) {
    return this.service.toggleStatus(id);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Elimina una plantilla' })
  async remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}
