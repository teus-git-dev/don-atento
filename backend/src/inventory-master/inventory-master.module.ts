import { Module } from '@nestjs/common';
import { InventoryMasterService } from './inventory-master.service';
import { InventoryMasterController } from './inventory-master.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { InventoryReportService } from './inventory-report.service';
import { WhatsappModule } from '../whatsapp/whatsapp.module';
import { StorageModule } from '../storage/storage.module';

// Block C cleanup: `TicketsModule` and `InventoryTemplatesModule`
// imports were retired together with the dead `createHandover` and
// `instantiateFromTemplate` methods in inventory-master.service.
// They were the only consumers — keeping the imports would have
// introduced unused module dependencies.
@Module({
  imports: [PrismaModule, WhatsappModule, StorageModule],
  providers: [InventoryMasterService, InventoryReportService],
  controllers: [InventoryMasterController],
  exports: [InventoryMasterService, InventoryReportService],
})
export class InventoryMasterModule {}
