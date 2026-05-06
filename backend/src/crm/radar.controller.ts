import { Controller, Get, UseGuards, Req } from '@nestjs/common';
import { RadarService } from './radar.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { TenantGuard } from '../auth/tenant.guard';

@Controller('crm/radar')
@UseGuards(JwtAuthGuard, TenantGuard)
export class RadarController {
  constructor(private readonly radarService: RadarService) {}

  @Get('scan')
  async scan(@Req() req: any) {
    const tenantId = req.user.tenantId;
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
