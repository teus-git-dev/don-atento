import { Module } from '@nestjs/common';
import { CognitiveService } from './cognitive.service';
import { CognitiveController } from './cognitive.controller';
import { BrandBrainController } from './brand-brain.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { BrandBrainService } from './brand-brain.service';
import { DocumentGeneratorService } from './document-generator.service';
import { EmailService } from './email.service';
import { MaintenancePredictorService } from './maintenance-predictor.service';
import { AssetRecognitionService } from './asset-recognition.service';

@Module({
  imports: [PrismaModule],
  controllers: [CognitiveController, BrandBrainController],
  providers: [
    CognitiveService, 
    BrandBrainService, 
    DocumentGeneratorService, 
    EmailService, 
    MaintenancePredictorService,
    AssetRecognitionService
  ],
  exports: [
    CognitiveService, 
    BrandBrainService, 
    DocumentGeneratorService, 
    EmailService, 
    MaintenancePredictorService,
    AssetRecognitionService
  ],
})
export class CognitiveModule {}
