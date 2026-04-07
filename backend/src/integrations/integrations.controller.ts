import { Controller, Post, Body, Query, Logger } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { IntegrationsService } from './integrations.service';

@ApiTags('integrations')
@Controller('integrations')
export class IntegrationsController {
  private readonly logger = new Logger(IntegrationsController.name);

  constructor(private readonly integrationsService: IntegrationsService) {}

  @Post('finca-raiz')
  @ApiOperation({ summary: 'Webhook endpoint for Finca Raiz integration' })
  @ApiQuery({
    name: 'tenantId',
    required: true,
    description: 'ID of the Don Atento tenant',
  })
  async handleFincaRaizWebhook(
    @Query('tenantId') tenantId: string,
    @Body() payload: any,
  ) {
    this.logger.log('Incoming Finca Raiz Webhook');
    return this.integrationsService.handleFincaRaizWebhook(tenantId, payload);
  }
}
