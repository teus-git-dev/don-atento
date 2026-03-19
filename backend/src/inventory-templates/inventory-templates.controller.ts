import { Controller, Post, Get, Body, Param, Query, Delete } from '@nestjs/common';
import { InventoryTemplatesService } from './inventory-templates.service';
import { CreateInventoryTemplateDto } from './dto/create-inventory-template.dto';

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

  @Delete(':id')
  async remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}
