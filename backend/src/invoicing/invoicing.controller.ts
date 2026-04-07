import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
} from '@nestjs/common';
import { InvoicingService } from './invoicing.service';

@Controller('invoicing')
export class InvoicingController {
  constructor(private readonly invoicingService: InvoicingService) {}

  // ============================================
  // DIAN RESOLUTIONS
  // ============================================

  @Get('resolutions')
  async getResolutions(@Query('tenantId') tenantId: string) {
    return this.invoicingService.getResolutions(tenantId);
  }

  @Post('resolutions')
  async createResolution(
    @Query('tenantId') tenantId: string,
    @Body() body: any,
  ) {
    return this.invoicingService.createResolution(tenantId, body);
  }

  // ============================================
  // BILLING ITEMS (CATALOGO MESTRO)
  // ============================================

  @Get('items')
  async getBillingItems(@Query('tenantId') tenantId: string) {
    return this.invoicingService.getBillingItems(tenantId);
  }

  @Post('items')
  async createBillingItem(
    @Query('tenantId') tenantId: string,
    @Body() body: any,
  ) {
    return this.invoicingService.createBillingItem(tenantId, body);
  }

  @Patch('items/:id/disable')
  async disableBillingItem(
    @Query('tenantId') tenantId: string,
    @Param('id') id: string,
  ) {
    return this.invoicingService.disableBillingItem(tenantId, id);
  }

  // ============================================
  // INVOICE ENGINE
  // ============================================

  @Post('invoices')
  async emitInvoice(@Query('tenantId') tenantId: string, @Body() body: any) {
    return this.invoicingService.createDraftInvoice(tenantId, body);
  }
}
