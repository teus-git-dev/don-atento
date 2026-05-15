import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { StorageModule } from '../storage/storage.module';
import { ContractsService } from './contracts.service';
import { ContractsController } from './contracts.controller';

@Module({
  imports: [PrismaModule, StorageModule],
  controllers: [ContractsController],
  providers: [ContractsService],
  exports: [ContractsService],
})
export class ContractsModule {}
