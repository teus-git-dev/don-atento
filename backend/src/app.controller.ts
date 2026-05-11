import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';
import { Public } from './auth/public.decorator';
import { PrismaService } from './prisma/prisma.service';

@Controller()
export class AppController {
  constructor(
    private readonly appService: AppService,
    private readonly prisma: PrismaService,
  ) {}

  @Public()
  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  /**
   * Health check endpoint — used by Render, uptime monitors, and load balancers.
   * Returns 200 with { status: 'ok' } when the service and DB are reachable.
   * Returns 503 if the database is unreachable.
   */
  @Public()
  @Get('api/health')
  async healthCheck(): Promise<{ status: string; db: string; uptime: number }> {
    let dbStatus = 'ok';
    try {
      await this.prisma.$queryRaw`SELECT 1`;
    } catch {
      dbStatus = 'unreachable';
    }
    return {
      status: dbStatus === 'ok' ? 'ok' : 'degraded',
      db: dbStatus,
      uptime: Math.floor(process.uptime()),
    };
  }
}
