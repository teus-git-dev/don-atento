import { Controller, Get, Query } from '@nestjs/common';
import { UsersService } from './users.service';
import { UserRole } from '@prisma/client';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('technicians')
  async findTechnicians(@Query('tenantId') tenantId?: string) {
    return this.usersService.findByRole(UserRole.TECHNICIAN, tenantId);
  }

  @Get('owners')
  async findOwners(@Query('tenantId') tenantId?: string) {
    return this.usersService.findByRole(UserRole.OWNER, tenantId);
  }

  @Get('admin')
  async findAdmin(@Query('tenantId') tenantId: string) {
    return this.usersService.findAdmin(tenantId);
  }

  @Get()
  async findAll(@Query('tenantId') tenantId: string) {
    return this.usersService.findAllByTenant(tenantId);
  }
}
