import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  Delete,
  Param,
  UseGuards,
  Req,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { UserRole } from '@prisma/client';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { TenantGuard } from '../auth/tenant.guard';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

@ApiTags('users')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard, TenantGuard)
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('technicians')
  async findTechnicians(@Req() req: any) {
    return this.usersService.findByRole(UserRole.TECHNICIAN, req['tenantId']);
  }

  @Get('owners')
  async findOwners(@Req() req: any) {
    return this.usersService.findByRole(UserRole.OWNER, req['tenantId']);
  }

  @Get('admin')
  async findAdmin(@Req() req: any) {
    return this.usersService.findAdmin(req['tenantId']);
  }

  @Get()
  async findAll(@Req() req: any) {
    return this.usersService.findAllByTenant(req['tenantId']);
  }

  @Post()
  async create(@Req() req: any, @Body() data: any) {
    data.tenantId = req['tenantId'];
    return this.usersService.create(data);
  }

  @Delete(':id')
  async delete(@Req() req: any, @Param('id') id: string) {
    return this.usersService.delete(id, req['tenantId']);
  }
}
