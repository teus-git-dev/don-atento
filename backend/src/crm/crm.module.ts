import { Module, forwardRef } from '@nestjs/common';
import { CrmService } from './crm.service';
import { CrmController } from './crm.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { CognitiveModule } from '../cognitive/cognitive.module';
import { WhatsappModule } from '../whatsapp/whatsapp.module';

import { UsersModule } from '../users/users.module';

@Module({
  imports: [
    PrismaModule,
    CognitiveModule,
    UsersModule,
    forwardRef(() => WhatsappModule),
  ],
  controllers: [CrmController],
  providers: [CrmService],
  exports: [CrmService],
})
export class CrmModule {}
