import { Controller, Get, Param, Post, Body } from '@nestjs/common';
import { CognitiveService } from './cognitive.service';
import { MaintenancePredictorService } from './maintenance-predictor.service';
import { AssetRecognitionService } from './asset-recognition.service';

@Controller('cognitive')
export class CognitiveController {
  constructor(
    private readonly cognitiveService: CognitiveService,
    private readonly maintenancePredictor: MaintenancePredictorService,
    private readonly assetRecognition: AssetRecognitionService
  ) {}

  @Get('property/:id/summary')
  async getPropertySummary(@Param('id') id: string) {
    return this.cognitiveService.getPropertyCognitiveSummary(id);
  }

  @Get('property/:id/health-score')
  async getPropertyHealthScore(@Param('id') id: string) {
    return this.maintenancePredictor.calculatePropertyHealthScore(id);
  }

  @Post('property/:id/vision-onboarding')
  async visionOnboarding(
    @Param('id') id: string,
    @Body() body: { imageUrl: string }
  ) {
    return this.assetRecognition.autoPopulateInventory(id, body.imageUrl);
  }

  @Post('validate-evidence')
  async validateEvidence(@Body() body: { fileName: string; fileType: string }) {
    return this.cognitiveService.validateEvidence(body.fileName, body.fileType);
  }
}
