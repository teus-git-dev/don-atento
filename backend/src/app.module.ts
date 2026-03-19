import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { TicketsModule } from './tickets/tickets.module';
import { WhatsappModule } from './whatsapp/whatsapp.module';
import { PrismaModule } from './prisma/prisma.module';
import { PropertiesModule } from './properties/properties.module';
import { WorkflowsModule } from './workflows/workflows.module';
import { UsersModule } from './users/users.module';
import { InventoryTemplatesModule } from './inventory-templates/inventory-templates.module';
import { CognitiveModule } from './cognitive/cognitive.module';
import { CrmModule } from './crm/crm.module';
import { ProvidersModule } from './providers/providers.module';

@Module({
  imports: [
    PrismaModule, 
    TicketsModule, 
    WhatsappModule, 
    PropertiesModule, 
    WorkflowsModule, 
    UsersModule,
    InventoryTemplatesModule,
    CognitiveModule,
    CrmModule,
    ProvidersModule
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
