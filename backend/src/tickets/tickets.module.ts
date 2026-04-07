import { Module, forwardRef } from '@nestjs/common';
import { TicketsService } from './tickets.service';
import { TicketsController } from './tickets.controller';
import { WhatsappModule } from '../whatsapp/whatsapp.module';
import { CognitiveModule } from '../cognitive/cognitive.module';
import { PrismaModule } from '../prisma/prisma.module';
import { SlaMatrixService } from './sla-matrix.service';

@Module({
  imports: [forwardRef(() => WhatsappModule), CognitiveModule, PrismaModule],
  controllers: [TicketsController],
  providers: [TicketsService, SlaMatrixService],
  exports: [TicketsService, SlaMatrixService],
})
export class TicketsModule {}
