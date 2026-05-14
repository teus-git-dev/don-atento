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
import { RolesGuard } from '../auth/roles.guard';
import { TenantGuard } from '../auth/tenant.guard';
import { Roles } from '../auth/roles.decorator';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';

/**
 * Accounting surfaces are restricted to ADMIN_TENANT / SUPERADMIN —
 * journal entries, the PUC and the journal listing affect DIAN-
 * regulated financial state. Pre-Block-A any TENANT_USER could
 * create / post / read these (RolesGuard wasn't even registered).
 *
 * If an 'ACCOUNTANT' role is introduced post-v1, expand the
 * @Roles() lists in this file; do NOT widen them to AGENT or
 * lower-privilege roles.
 */
@ApiTags('accounting')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard, TenantGuard)
@Controller('accounting')
export class AccountingController {
  constructor(private readonly accountingService: AccountingService) {}

  @Post('journal-entries')
  @Roles('ADMIN_TENANT', 'SUPERADMIN')
  async createJournalEntry(@Req() req: any, @Body() body: any) {
    const tenantId = req['tenantId'];
    const userId = req.user.id;
    return this.accountingService.createJournalEntry(tenantId, body, userId);
  }

  @Post('journal-entries/:id/post')
  @Roles('ADMIN_TENANT', 'SUPERADMIN')
  async postJournalEntry(@Req() req: any, @Param('id') id: string) {
    const tenantId = req['tenantId'];
    return this.accountingService.postJournalEntry(tenantId, id);
  }

  @Get('puc')
  @Roles('ADMIN_TENANT', 'SUPERADMIN')
  async getPuc(@Req() req: any) {
    const tenantId = req['tenantId'];
    return this.accountingService.getPuc(tenantId);
  }

  @Get('journal-entries')
  @Roles('ADMIN_TENANT', 'SUPERADMIN')
  async getJournalEntries(@Req() req: any) {
    const tenantId = req['tenantId'];
    return this.accountingService.getJournalEntries(tenantId);
  }
}
