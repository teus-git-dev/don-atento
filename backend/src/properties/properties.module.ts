import { Module } from '@nestjs/common';
import { PropertiesService } from './properties.service';
import { PropertiesController } from './properties.controller';
import { BulkImportService } from './bulk-import.service';

@Module({
  controllers: [PropertiesController],
  providers: [PropertiesService, BulkImportService],
  exports: [PropertiesService, BulkImportService],
})
export class PropertiesModule {}
