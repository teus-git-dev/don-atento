import { Controller, Post, Get, Body, Param, Query } from '@nestjs/common';
import { AccountingService } from './accounting.service';

@Controller('accounting')
export class AccountingController {
  constructor(private readonly accountingService: AccountingService) {}

  @Post('journal-entries')
  async createJournalEntry(
    @Query('tenantId') tenantId: string,
    @Body() body: any,
    @Query('userId') userId: string,
  ) {
    return this.accountingService.createJournalEntry(tenantId, body, userId);
  }

  @Post('journal-entries/:id/post')
  async postJournalEntry(
    @Query('tenantId') tenantId: string,
    @Param('id') id: string,
  ) {
    return this.accountingService.postJournalEntry(tenantId, id);
  }

  @Get('puc')
  async getPuc(@Query('tenantId') tenantId: string) {
    return this.accountingService.getPuc(tenantId);
  }

  @Get('journal-entries')
  async getJournalEntries(@Query('tenantId') tenantId: string) {
    return this.accountingService.getJournalEntries(tenantId);
  }
}
