import { Module, forwardRef } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { WhatsappService } from './whatsapp.service';
import { WhatsappController } from './whatsapp.controller';
import { BaileysController } from './baileys.controller';
import { BaileysManager } from './baileys.manager';
import { AntiBanService } from './anti-ban.service';
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
  controllers: [WhatsappController, BaileysController],
  providers: [WhatsappService, BaileysManager, AntiBanService],
  exports: [WhatsappService, BaileysManager, AntiBanService],
})
export class WhatsappModule {}
