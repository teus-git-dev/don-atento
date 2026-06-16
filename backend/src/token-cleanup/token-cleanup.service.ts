import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';

/**
 * TokenCleanupService — registers the repeatable daily cleanup job
 * into the BullMQ 'token-cleanup' queue at application startup.
 *
 * BullMQ deduplicates repeatable jobs by their (name + pattern) key,
 * so restarting the server is idempotent — no duplicate jobs accumulate.
 *
 * The job itself (the SQL delete) lives in TokenCleanupProcessor.
 * Keeping registration and processing separate lets us unit-test each
 * in isolation without wiring the full queue.
 */
@Injectable()
export class TokenCleanupService implements OnModuleInit {
  private readonly logger = new Logger(TokenCleanupService.name);

  constructor(@InjectQueue('token-cleanup') private readonly queue: Queue) {}

  async onModuleInit() {
    // Remove any stale repeatable job entries (e.g., old cron patterns left
    // over from a previous deploy). This prevents ghost duplicates when the
    // schedule is changed across releases.
    const repeatableJobs = await this.queue.getRepeatableJobs();
    for (const job of repeatableJobs) {
      if (job.name === 'purge-stale-tokens') {
        await this.queue.removeRepeatableByKey(job.key);
        this.logger.log(
          'Removed stale repeatable job entry before re-registration.',
        );
      }
    }

    await this.queue.add(
      'purge-stale-tokens',
      {},
      {
        repeat: {
          // Run daily at 03:00 UTC — low-traffic window.
          pattern: '0 3 * * *',
        },
        // Remove job record from Redis immediately on success or after 1
        // failure — we don't need to keep a history of a simple DELETE.
        removeOnComplete: true,
        removeOnFail: 1,
      },
    );

    this.logger.log(
      'TokenCleanup: repeatable daily job registered (cron: 0 3 * * *).',
    );
  }
}
