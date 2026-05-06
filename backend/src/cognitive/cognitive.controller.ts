import { Controller, Get, Param, Post, Body } from '@nestjs/common';
import { CognitiveService } from './cognitive.service';
import { MaintenancePredictorService } from './maintenance-predictor.service';

@Controller('cognitive')
export class CognitiveController {
  constructor(
    private readonly cognitiveService: CognitiveService,
    private readonly maintenancePredictor: MaintenancePredictorService,
  ) {}

  @Get('property/:id/summary')
  async getPropertySummary(@Param('id') id: string) {
    return this.cognitiveService.getPropertyCognitiveSummary(id);
  }

  @Get('property/:id/health-score')
  async getPropertyHealthScore(@Param('id') id: string) {
    return this.maintenancePredictor.calculatePropertyHealthScore(id);
  }

  @Post('validate-evidence')
  async validateEvidence(
    @Body() body: { fileName: string; fileType: string; description?: string },
  ) {
    return this.cognitiveService.validateEvidence(
      body.fileName,
      body.fileType,
      body.description,
    );
  }

  @Post('classify-priority')
  async classifyPriority(@Body() body: { title: string; description: string }) {
    return this.cognitiveService.classifyPriority(body.title, body.description);
  }

  @Get('finops/analytics')
  async getFinOpsAnalytics() {
    return this.cognitiveService.getFinOpsAnalytics();
  }
}
