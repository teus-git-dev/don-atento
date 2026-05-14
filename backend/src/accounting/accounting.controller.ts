import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { AccountingService } from './accounting.service';
import { AnnulJournalEntryDto } from './dto/annul-journal-entry.dto';
import { CreateJournalEntryDto } from './dto/create-journal-entry.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { TenantGuard } from '../auth/tenant.guard';
import { Roles } from '../auth/roles.decorator';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';

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
  @ApiOperation({ summary: 'Crear asiento contable (DRAFT)' })
  async createJournalEntry(
    @Req() req: any,
    @Body() body: CreateJournalEntryDto,
  ) {
    const tenantId = req['tenantId'];
    const userId = req.user.id;
    return this.accountingService.createJournalEntry(tenantId, body, userId);
  }

  @Post('journal-entries/:id/post')
  @Roles('ADMIN_TENANT', 'SUPERADMIN')
  @ApiOperation({
    summary: 'Postear asiento (DRAFT → POSTED, atómico, audit trail)',
  })
  async postJournalEntry(@Req() req: any, @Param('id') id: string) {
    const tenantId = req['tenantId'];
    const userId = req.user.id;
    return this.accountingService.postJournalEntry(tenantId, id, userId);
  }

  @Post('journal-entries/:id/annul')
  @Roles('ADMIN_TENANT', 'SUPERADMIN')
  @ApiOperation({
    summary: 'Anular asiento POSTED (registra annulledAt/by/reason)',
  })
  async annulJournalEntry(
    @Req() req: any,
    @Param('id') id: string,
    @Body() body: AnnulJournalEntryDto,
  ) {
    const tenantId = req['tenantId'];
    const userId = req.user.id;
    return this.accountingService.annulJournalEntry(
      tenantId,
      id,
      userId,
      body.reason,
    );
  }

  @Get('puc')
  @Roles('ADMIN_TENANT', 'SUPERADMIN')
  @ApiOperation({
    summary: 'PUC del tenant (cuentas activas por default)',
  })
  @ApiQuery({ name: 'includeInactive', required: false, example: 'false' })
  async getPuc(
    @Req() req: any,
    @Query('includeInactive') includeInactive?: string,
  ) {
    const tenantId = req['tenantId'];
    return this.accountingService.getPuc(tenantId, includeInactive === 'true');
  }

  @Get('journal-entries')
  @Roles('ADMIN_TENANT', 'SUPERADMIN')
  @ApiOperation({ summary: 'Listar asientos (paginado, filtros opcionales)' })
  @ApiQuery({ name: 'page', required: false, example: '1' })
  @ApiQuery({ name: 'limit', required: false, example: '20' })
  @ApiQuery({ name: 'dateFrom', required: false, example: '2026-01-01' })
  @ApiQuery({ name: 'dateTo', required: false, example: '2026-12-31' })
  @ApiQuery({
    name: 'status',
    required: false,
    enum: ['DRAFT', 'POSTED', 'ANNULLED'],
  })
  @ApiQuery({ name: 'accountId', required: false })
  @ApiQuery({ name: 'documentType', required: false })
  async getJournalEntries(
    @Req() req: any,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
    @Query('status') status?: string,
    @Query('accountId') accountId?: string,
    @Query('documentType') documentType?: string,
  ) {
    const tenantId = req['tenantId'];
    const pageNum = Math.max(1, page ? parseInt(page, 10) : 1);
    const requestedLimit = limit ? parseInt(limit, 10) : 20;
    const limitNum = Math.max(1, isNaN(requestedLimit) ? 20 : requestedLimit);
    return this.accountingService.getJournalEntries(tenantId, {
      page: pageNum,
      limit: limitNum,
      dateFrom,
      dateTo,
      status,
      accountId,
      documentType,
    });
  }
}
