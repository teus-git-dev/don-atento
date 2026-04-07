import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  Delete,
  Param,
} from '@nestjs/common';
import { RolesService } from './roles.service';

@Controller('roles')
export class RolesController {
  constructor(private readonly rolesService: RolesService) {}

  @Get()
  async findAll(@Query('tenantId') tenantId: string) {
    return this.rolesService.findAllByTenant(tenantId);
  }

  @Post()
  async create(@Body() data: any) {
    return this.rolesService.create(data);
  }

  @Delete(':id')
  async delete(@Param('id') id: string) {
    return this.rolesService.delete(id);
  }
}
