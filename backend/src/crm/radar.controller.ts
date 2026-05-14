import { Controller, Get, UseGuards, Req } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { RadarService } from './radar.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { TenantGuard } from '../auth/tenant.guard';
import { Roles } from '../auth/roles.decorator';

@ApiTags('crm-radar')
@ApiBearerAuth()
@Controller('crm/radar')
@UseGuards(JwtAuthGuard, RolesGuard, TenantGuard)
export class RadarController {
  constructor(private readonly radarService: RadarService) {}

  @Get('scan')
  // Radar fires outbound scraping (cluster IP) and consumes LLM tokens
  // per call. Restricted to ADMIN_TENANT/SUPERADMIN to prevent abuse by
  // lower-privileged tenant users who could otherwise spike outbound
  // traffic, get the cluster banned from fincaraiz.com.co, and burn
  // through the tenant's token budget.
  @Roles('ADMIN_TENANT', 'SUPERADMIN')
  @ApiOperation({
    summary: 'Escanear portales externos por leads (rate-limited)',
  })
  async scan(@Req() req: any) {
    const tenantId = req['tenantId'];
    const userId = req.user.id;
    const leads = await this.radarService.scanPortals(tenantId, userId);
    return {
      success: true,
      timestamp: new Date().toISOString(),
      count: leads.length,
      leads,
    };
  }
}
