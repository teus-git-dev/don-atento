import { Module, forwardRef } from '@nestjs/common';
import { TicketsService } from './tickets.service';
import { TicketsController } from './tickets.controller';
import { WhatsappModule } from '../whatsapp/whatsapp.module';
import { CognitiveModule } from '../cognitive/cognitive.module';
import { PrismaModule } from '../prisma/prisma.module';
import { SlaMatrixService } from './sla-matrix.service';
import { SurveyTokenService } from './survey-token.service';
import { StorageModule } from '../storage/storage.module';

@Module({
  imports: [
    forwardRef(() => WhatsappModule),
    CognitiveModule,
    PrismaModule,
    StorageModule,
  ],
  controllers: [TicketsController],
  providers: [TicketsService, SlaMatrixService, SurveyTokenService],
  exports: [TicketsService, SlaMatrixService, SurveyTokenService],
})
export class TicketsModule {}
