import { Controller, Post, Get, Body, Param, UseGuards, Request } from '@nestjs/common';
import { ContractsService } from './contracts.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { TenantGuard } from '../auth/tenant.guard';

@Controller('contracts')
@UseGuards(JwtAuthGuard, TenantGuard)
export class ContractsController {
  constructor(private readonly contractsService: ContractsService) {}

  @Post('upload')
  async uploadContract(
    @Request() req: any,
    @Body('propertyId') propertyId: string,
    @Body('fileUrl') fileUrl: string,
  ) {
    const tenantId = req.user.tenantId;
    return this.contractsService.createDocumentRecord(tenantId, propertyId, fileUrl);
  }

  @Get('property/:propertyId')
  async getDocuments(
    @Request() req: any,
    @Param('propertyId') propertyId: string,
  ) {
    const tenantId = req.user.tenantId;
    return this.contractsService.getDocumentsByProperty(tenantId, propertyId);
  }
}
