import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { JwtAuthGuard } from './auth/jwt-auth.guard';
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
import { InventoryMasterModule } from './inventory-master/inventory-master.module';
import { IntegrationsModule } from './integrations/integrations.module';
import { RolesModule } from './roles/roles.module';
import { AccountingModule } from './accounting/accounting.module';
import { InvoicingModule } from './invoicing/invoicing.module';
import { TenantsModule } from './tenants/tenants.module';

@Module({
  imports: [
    PrismaModule,
    AuthModule,
    TicketsModule,
    WhatsappModule,
    PropertiesModule,
    WorkflowsModule,
    UsersModule,
    InventoryTemplatesModule,
    CognitiveModule,
    CrmModule,
    ProvidersModule,
    InventoryMasterModule,
    IntegrationsModule,
    RolesModule,
    AccountingModule,
    InvoicingModule,
    TenantsModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    // Global JWT guard — all routes protected unless decorated with @Public()
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
  ],
})
export class AppModule {}
