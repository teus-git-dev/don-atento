import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
  Req,
} from '@nestjs/common';
import { ProvidersService } from './providers.service';
import { ProviderSpecialty } from '@prisma/client';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { TenantGuard } from '../auth/tenant.guard';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

@ApiTags('providers')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard, TenantGuard)
@Controller('providers')
export class ProvidersController {
  constructor(private readonly providersService: ProvidersService) {}

  @Get()
  findAll(@Req() req: any) {
    return this.providersService.findAll(req['tenantId']);
  }

  @Get(':id')
  findOne(@Req() req: any, @Param('id') id: string) {
    return this.providersService.findOne(id, req['tenantId']);
  }

  @Post()
  create(
    @Req() req: any,
    @Body()
    data: {
      name: string;
      nit?: string;
      email?: string;
      phone?: string;
      address?: string;
      specialty: ProviderSpecialty;
      contactName?: string;
      contactLastName?: string;
      contactId?: string;
      contactPhone?: string;
      photoUrl?: string;
      legalArl?: string;
      legalSst?: boolean;
      legalPolicyNumber?: string;
      additionalContacts?: any[];
    },
  ) {
    return this.providersService.create(req['tenantId'], data);
  }

  @Patch(':id')
  update(@Req() req: any, @Param('id') id: string, @Body() data: any) {
    return this.providersService.update(id, req['tenantId'], data);
  }

  @Delete(':id')
  remove(@Req() req: any, @Param('id') id: string) {
    return this.providersService.remove(id, req['tenantId']);
  }

  @Post(':id/assign-technician/:userId')
  assignTechnician(@Req() req: any, @Param('id') id: string, @Param('userId') userId: string) {
    return this.providersService.assignTechnician(id, userId, req['tenantId']);
  }
}
