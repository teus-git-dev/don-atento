import { Controller, Get, Post, Body, Patch, Param, Delete, Query } from '@nestjs/common';
import { ProvidersService } from './providers.service';
import { ProviderSpecialty } from '@prisma/client';

@Controller('providers')
export class ProvidersController {
  constructor(private readonly providersService: ProvidersService) {}

  @Get()
  findAll(@Query('tenantId') tenantId: string) {
    return this.providersService.findAll(tenantId);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.providersService.findOne(id);
  }

  @Post()
  create(
    @Query('tenantId') tenantId: string,
    @Body() data: {
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
    }
  ) {
    return this.providersService.create(tenantId, data);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() data: any) {
    return this.providersService.update(id, data);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.providersService.remove(id);
  }

  @Post(':id/assign-technician/:userId')
  assignTechnician(
    @Param('id') id: string,
    @Param('userId') userId: string
  ) {
    return this.providersService.assignTechnician(id, userId);
  }
}
