import { Module } from '@nestjs/common';
import { InventoryTemplatesService } from './inventory-templates.service';
import { InventoryTemplatesController } from './inventory-templates.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [InventoryTemplatesController],
  providers: [InventoryTemplatesService],
  exports: [InventoryTemplatesService],
})
export class InventoryTemplatesModule {}
