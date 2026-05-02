import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { ContractsService } from './contracts.service';
import { ContractsController } from './contracts.controller';
import { ContractsProcessor } from './contracts.processor';

@Module({
  imports: [PrismaModule],
  controllers: [ContractsController],
  providers: [ContractsService, ContractsProcessor],
  exports: [ContractsService],
})
export class ContractsModule {}
