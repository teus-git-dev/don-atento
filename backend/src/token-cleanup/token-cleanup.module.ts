import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { PrismaModule } from '../prisma/prisma.module';
import { TokenCleanupProcessor } from './token-cleanup.processor';
import { TokenCleanupService } from './token-cleanup.service';

/**
 * TokenCleanupModule — wires the BullMQ queue and processor that
 * purges stale `RefreshToken` rows daily.
 *
 * Queue: 'token-cleanup'
 * Connection: REDIS_URL env var (same Redis used by WhatsappService).
 *
 * The module registers itself at bootstrap (via TokenCleanupService.onModuleInit)
 * with a repeatable job so restarts are idempotent — BullMQ deduplicates
 * repeatable jobs by their pattern+name key.
 */
@Module({
  imports: [
    PrismaModule,
    BullModule.registerQueue({
      name: 'token-cleanup',
      // Use full REDIS_URL (e.g. redis://user:pass@host:port) when available
      // (Render, Railway, etc.). Fall back to individual host/port for bare
      // local Redis instances that don't expose a URL.
      connection: process.env.REDIS_URL
        ? { url: process.env.REDIS_URL, lazyConnect: true, maxRetriesPerRequest: 1, enableOfflineQueue: false }
        : { host: process.env.REDIS_HOST ?? 'localhost', port: Number(process.env.REDIS_PORT ?? 6379), lazyConnect: true, maxRetriesPerRequest: 1, enableOfflineQueue: false },
    }),
  ],
  providers: [TokenCleanupService, TokenCleanupProcessor],
})
export class TokenCleanupModule {}

