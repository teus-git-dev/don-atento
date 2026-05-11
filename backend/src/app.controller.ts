import { Controller, Get, HttpException, HttpStatus } from '@nestjs/common';
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
  async healthCheck() {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return {
        status: 'ok',
        db: 'ok',
        uptime: Math.floor(process.uptime()),
      };
    } catch {
      throw new HttpException(
        {
          status: 'degraded',
          db: 'unreachable',
          uptime: Math.floor(process.uptime()),
        },
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }
  }
}
