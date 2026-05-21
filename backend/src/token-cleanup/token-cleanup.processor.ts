import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { PrismaService } from '../prisma/prisma.service';

/**
 * TokenCleanupProcessor — executes the stale-token DELETE for the
 * 'token-cleanup' BullMQ queue.
 *
 * Deletion windows (matching the SQL in AUDIT_REPORT.md):
 *  - usedAt IS NOT NULL AND usedAt < NOW() - 30 days:
 *    Keeps recent reuse-detection signal for forensics.
 *  - expiresAt < NOW() - 7 days:
 *    Purges naturally-abandoned expired sessions.
 *
 * Prisma doesn't support raw date arithmetic in a `deleteMany` where-clause,
 * so we use `$executeRaw` with parameterized SQL (no string interpolation).
 * The return value is the number of rows deleted.
 */
@Processor('token-cleanup')
export class TokenCleanupProcessor extends WorkerHost {
  private readonly logger = new Logger(TokenCleanupProcessor.name);

  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async process(job: Job): Promise<void> {
    this.logger.log(`TokenCleanup: starting job id=${job.id}`);

    try {
      // Rows used (rotated) more than 30 days ago — reuse-detection window expired.
      const deletedUsed: number = await this.prisma.$executeRaw`
        DELETE FROM "RefreshToken"
        WHERE "usedAt" IS NOT NULL
          AND "usedAt" < NOW() - INTERVAL '30 days'
      `;

      // Rows that expired more than 7 days ago and were never rotated/used —
      // i.e. abandoned sessions whose access window has fully lapsed.
      const deletedExpired: number = await this.prisma.$executeRaw`
        DELETE FROM "RefreshToken"
        WHERE "usedAt" IS NULL
          AND "expiresAt" < NOW() - INTERVAL '7 days'
      `;

      const total = deletedUsed + deletedExpired;
      this.logger.log(
        `TokenCleanup: complete — deletedUsed=${deletedUsed} deletedExpired=${deletedExpired} total=${total}`,
      );
    } catch (err) {
      this.logger.error('TokenCleanup: job failed', err as Error);
      // Re-throw so BullMQ marks the job as failed and retries according
      // to the queue's default retry policy (1 attempt only — removeOnFail: 1).
      throw err;
    }
  }
}
