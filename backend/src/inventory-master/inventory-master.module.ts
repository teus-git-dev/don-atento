import { Module } from '@nestjs/common';
import { InventoryMasterService } from './inventory-master.service';
import { InventoryMasterController } from './inventory-master.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { InventoryReportService } from './inventory-report.service';
import { WhatsappModule } from '../whatsapp/whatsapp.module';
import { TicketsModule } from '../tickets/tickets.module';
import { InventoryTemplatesModule } from '../inventory-templates/inventory-templates.module';
import { StorageModule } from '../storage/storage.module';

@Module({
  imports: [
    PrismaModule,
    WhatsappModule,
    TicketsModule,
    InventoryTemplatesModule,
    StorageModule,
  ],
  providers: [InventoryMasterService, InventoryReportService],
  controllers: [InventoryMasterController],
  exports: [InventoryMasterService, InventoryReportService],
})
export class InventoryMasterModule {}
