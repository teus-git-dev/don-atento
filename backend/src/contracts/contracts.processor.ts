import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

/**
 * ContractsProcessor is kept as a standalone service for future BullMQ integration.
 * When Redis becomes available, this becomes a @Processor('contracts-ai') worker.
 */
@Injectable()
export class ContractsProcessor {
  private readonly logger = new Logger(ContractsProcessor.name);
  constructor(private prisma: PrismaService) {}
}
