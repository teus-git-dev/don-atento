import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  Req,
  UseGuards,
} from '@nestjs/common';
import { AccountingService } from './accounting.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { TenantGuard } from '../auth/tenant.guard';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';

@ApiTags('accounting')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, TenantGuard)
@Controller('accounting')
export class AccountingController {
  constructor(private readonly accountingService: AccountingService) {}

  @Post('journal-entries')
  async createJournalEntry(@Req() req: any, @Body() body: any) {
    const tenantId = req['tenantId'];
    const userId = req.user.id;
    return this.accountingService.createJournalEntry(tenantId, body, userId);
  }

  @Post('journal-entries/:id/post')
  async postJournalEntry(@Req() req: any, @Param('id') id: string) {
    const tenantId = req['tenantId'];
    return this.accountingService.postJournalEntry(tenantId, id);
  }

  @Get('puc')
  async getPuc(@Req() req: any) {
    const tenantId = req['tenantId'];
    return this.accountingService.getPuc(tenantId);
  }

  @Get('journal-entries')
  async getJournalEntries(@Req() req: any) {
    const tenantId = req['tenantId'];
    return this.accountingService.getJournalEntries(tenantId);
  }
}
