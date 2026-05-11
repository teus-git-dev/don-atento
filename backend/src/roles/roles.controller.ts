import {
  Controller,
  Get,
  Post,
  Body,
  Delete,
  Param,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { RolesService } from './roles.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { TenantGuard } from '../auth/tenant.guard';

@ApiTags('roles')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard, TenantGuard)
@Controller('roles')
export class RolesController {
  constructor(private readonly rolesService: RolesService) {}

  @Get()
  async findAll(@Req() req: Request) {
    return this.rolesService.findAllByTenant(req.tenantId!);
  }

  @Post()
  async create(@Req() req: Request, @Body() data: any) {
    // Tenant must come from the JWT (TenantGuard), never from the body.
    return this.rolesService.create({ ...data, tenantId: req.tenantId! });
  }

  @Delete(':id')
  async delete(@Req() req: Request, @Param('id') id: string) {
    return this.rolesService.delete(id, req.tenantId!);
  }
}
