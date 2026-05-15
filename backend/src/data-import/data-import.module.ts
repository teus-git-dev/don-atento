import { Module } from '@nestjs/common';
import { DataImportController } from './data-import.controller';
import { DataImportService } from './data-import.service';
import { PrismaModule } from '../prisma/prisma.module';
import { TenantsModule } from '../tenants/tenants.module';

// Block B retired the global `MulterModule.register(...)` here. The
// per-handler @UseInterceptors(FileInterceptor(...)) in the
// controller now carries the storage/limits/fileFilter — single
// source of truth, easier to audit per-route.
@Module({
  imports: [PrismaModule, TenantsModule],
  controllers: [DataImportController],
  providers: [DataImportService],
  exports: [DataImportService],
})
export class DataImportModule {}
