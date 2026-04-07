import { Module, forwardRef } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { WhatsappService } from './whatsapp.service';
import { WhatsappController } from './whatsapp.controller';
import { TicketsModule } from '../tickets/tickets.module';
import { PrismaModule } from '../prisma/prisma.module';
import { PropertiesModule } from '../properties/properties.module';
import { CognitiveModule } from '../cognitive/cognitive.module';
import { CrmModule } from '../crm/crm.module';

@Module({
  imports: [
    HttpModule,
    forwardRef(() => TicketsModule),
    PrismaModule,
    PropertiesModule,
    CognitiveModule,
    forwardRef(() => CrmModule),
  ],
  controllers: [WhatsappController],
  providers: [WhatsappService],
  exports: [WhatsappService],
})
export class WhatsappModule {}
