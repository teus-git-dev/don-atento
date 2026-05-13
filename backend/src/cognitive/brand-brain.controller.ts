import { Body, Controller, Get, Put, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { BrandBrainService } from './brand-brain.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { TenantGuard } from '../auth/tenant.guard';
import { FeatureDisabledGuard } from '../inventory-templates/feature-disabled.guard';

@ApiTags('brand-brain')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, TenantGuard)
@Controller('brand-brain')
export class BrandBrainController {
  constructor(private readonly brandBrainService: BrandBrainService) {}

  // Path keeps `:tenantId` segment for backwards-compat with the current
  // frontend (brainService.ts builds `/brand-brain/${tenantId}`). The
  // backend IGNORES the path param and uses `req.tenantId` from the JWT
  // via TenantGuard — closes the CRÍTICO from the 2026-05-13 audit where
  // any user could read or rewrite any tenant's brain by manipulating
  // the path.
  @Get(':tenantId')
  async getBrain(@Req() req: Request) {
    return this.brandBrainService.getBrandTone(req.tenantId!);
  }

  @Put(':tenantId')
  @UseGuards(FeatureDisabledGuard)
  @ApiOperation({ summary: 'Actualiza el brand brain (deshabilitado en v1)' })
  async updateBrain(
    @Req() req: Request,
    @Body()
    body: {
      tone?: string;
      policies?: string;
      faq?: any;
      responseRules?: string;
    },
  ) {
    return this.brandBrainService.updateBrain(req.tenantId!, body);
  }
}
