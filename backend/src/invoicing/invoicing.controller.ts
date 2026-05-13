import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { InvoicingService } from './invoicing.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { TenantGuard } from '../auth/tenant.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { CreateResolutionDto } from './dto/create-resolution.dto';
import { CreateBillingItemDto } from './dto/create-billing-item.dto';
import { CreateInvoiceDto } from './dto/create-invoice.dto';

@ApiTags('invoicing')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard, TenantGuard)
@Roles('ADMIN_TENANT', 'SUPERADMIN')
@Controller('invoicing')
export class InvoicingController {
  constructor(private readonly invoicingService: InvoicingService) {}

  // ============================================
  // DIAN RESOLUTIONS
  // ============================================

  @Get('resolutions')
  async getResolutions(@Req() req: Request) {
    return this.invoicingService.getResolutions(req.tenantId!);
  }

  @Post('resolutions')
  async createResolution(
    @Req() req: Request,
    @Body() body: CreateResolutionDto,
  ) {
    return this.invoicingService.createResolution(req.tenantId!, body);
  }

  // ============================================
  // BILLING ITEMS (CATALOGO MAESTRO)
  // ============================================

  @Get('items')
  async getBillingItems(@Req() req: Request) {
    return this.invoicingService.getBillingItems(req.tenantId!);
  }

  @Post('items')
  async createBillingItem(
    @Req() req: Request,
    @Body() body: CreateBillingItemDto,
  ) {
    return this.invoicingService.createBillingItem(req.tenantId!, body);
  }

  @Patch('items/:id/disable')
  async disableBillingItem(@Req() req: Request, @Param('id') id: string) {
    return this.invoicingService.disableBillingItem(req.tenantId!, id);
  }

  // ============================================
  // INVOICE ENGINE
  // ============================================

  @Post('invoices')
  async emitInvoice(@Req() req: Request, @Body() body: CreateInvoiceDto) {
    return this.invoicingService.createDraftInvoice(req.tenantId!, body);
  }
}
