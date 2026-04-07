import { Module } from '@nestjs/common';
import { CognitiveService } from './cognitive.service';
import { CognitiveController } from './cognitive.controller';
import { BrandBrainController } from './brand-brain.controller';
import { AiChatController } from './ai-chat.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { BrandBrainService } from './brand-brain.service';
import { AiChatService } from './ai-chat.service';
import { DocumentGeneratorService } from './document-generator.service';
import { EmailService } from './email.service';
import { MaintenancePredictorService } from './maintenance-predictor.service';
import { LegalAiService } from './legal-ai.service';

@Module({
  imports: [PrismaModule],
  controllers: [CognitiveController, BrandBrainController, AiChatController],
  providers: [
    CognitiveService,
    BrandBrainService,
    DocumentGeneratorService,
    EmailService,
    MaintenancePredictorService,
    AiChatService,
    LegalAiService,
  ],
  exports: [
    CognitiveService,
    BrandBrainService,
    DocumentGeneratorService,
    EmailService,
    MaintenancePredictorService,
    LegalAiService,
  ],
})
export class CognitiveModule {}
