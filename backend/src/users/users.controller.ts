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
import type { Request } from 'express';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UserRole } from '@prisma/client';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { TenantGuard } from '../auth/tenant.guard';
import { Roles } from '../auth/roles.decorator';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

@ApiTags('users')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard, TenantGuard)
@Roles('ADMIN_TENANT', 'SUPERADMIN')
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('technicians')
  async findTechnicians(@Req() req: Request) {
    return this.usersService.findByRole(UserRole.TECHNICIAN, req.tenantId!);
  }

  @Get('tenants')
  async findTenants(
    @Req() req: Request,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const pageNum = page ? parseInt(page, 10) : 1;
    const limitNum = limit ? parseInt(limit, 10) : 10;
    return this.usersService.findByRole(
      UserRole.TENANT_USER,
      req.tenantId!,
      pageNum,
      limitNum,
    );
  }

  @Get('owners')
  async findOwners(
    @Req() req: Request,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const pageNum = page ? parseInt(page, 10) : 1;
    const limitNum = limit ? parseInt(limit, 10) : 10;
    return this.usersService.findByRole(
      UserRole.OWNER,
      req.tenantId!,
      pageNum,
      limitNum,
    );
  }

  @Get('admin')
  async findAdmin(@Req() req: Request) {
    return this.usersService.findAdmin(req.tenantId!);
  }

  @Get()
  async findAll(
    @Req() req: Request,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const pageNum = Math.max(1, page ? parseInt(page, 10) : 1);
    const requestedLimit = limit ? parseInt(limit, 10) : 20;
    const limitNum = Math.max(1, isNaN(requestedLimit) ? 20 : requestedLimit);
    return this.usersService.findAllByTenant(req.tenantId!, pageNum, limitNum);
  }

  @Post()
  async create(@Req() req: Request, @Body() data: CreateUserDto) {
    return this.usersService.create({
      ...data,
      tenantId: req.tenantId!,
    });
  }

  @Delete(':id')
  async delete(@Req() req: Request, @Param('id') id: string) {
    return this.usersService.delete(id, req.tenantId!);
  }

  @Get(':id/details')
  async getUserDetails(@Req() req: Request, @Param('id') id: string) {
    return this.usersService.getUserDetails(id, req.tenantId!);
  }
}
