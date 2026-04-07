import { Controller, Get, Post, Body, Param, Put } from '@nestjs/common';
import { BrandBrainService } from './brand-brain.service';

@Controller('brand-brain')
export class BrandBrainController {
  constructor(private readonly brandBrainService: BrandBrainService) {}

  @Get(':tenantId')
  async getBrain(@Param('tenantId') tenantId: string) {
    return this.brandBrainService.getBrandTone(tenantId);
  }

  @Put(':tenantId')
  async updateBrain(
    @Param('tenantId') tenantId: string,
    @Body()
    body: {
      tone?: string;
      policies?: string;
      faq?: any;
      responseRules?: string;
    },
  ) {
    return this.brandBrainService.updateBrain(tenantId, body);
  }
}
