import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { CognitiveService } from './cognitive.service';
import { MaintenancePredictorService } from './maintenance-predictor.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { TenantGuard } from '../auth/tenant.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { FeatureDisabledGuard } from '../inventory-templates/feature-disabled.guard';

@ApiTags('cognitive')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, TenantGuard)
@Controller('cognitive')
export class CognitiveController {
  constructor(
    private readonly cognitiveService: CognitiveService,
    private readonly maintenancePredictor: MaintenancePredictorService,
  ) {}

  // Used by frontend: `inmuebles/[id]/inspeccion/page.tsx`. Service now
  // filters tickets by both propertyId and the caller's tenantId — cross-
  // tenant read of property interactions is closed.
  @Get('property/:id/summary')
  async getPropertySummary(@Req() req: Request, @Param('id') id: string) {
    return this.cognitiveService.getPropertyCognitiveSummary(id, req.tenantId!);
  }

  // No frontend consumer (verified via grep 2026-05-13). Gated until v2;
  // service-level tenant scoping deferred.
  @Get('property/:id/health-score')
  @UseGuards(FeatureDisabledGuard)
  async getPropertyHealthScore(@Param('id') id: string) {
    return this.maintenancePredictor.calculatePropertyHealthScore(id);
  }

  // No frontend consumer (verified via grep). Gated until v2.
  @Post('validate-evidence')
  @UseGuards(FeatureDisabledGuard)
  async validateEvidence(
    @Body() body: { fileName: string; fileType: string; description?: string },
  ) {
    return this.cognitiveService.validateEvidence(
      body.fileName,
      body.fileType,
      body.description,
    );
  }

  // No frontend consumer (verified via grep). Gated until v2.
  @Post('classify-priority')
  @UseGuards(FeatureDisabledGuard)
  async classifyPriority(@Body() body: { title: string; description: string }) {
    return this.cognitiveService.classifyPriority(body.title, body.description);
  }

  // FinOps board — SUPERADMIN only (gated in Block 1).
  @Get('finops/analytics')
  @UseGuards(RolesGuard)
  @Roles('SUPERADMIN')
  async getFinOpsAnalytics() {
    return this.cognitiveService.getFinOpsAnalytics();
  }
}
