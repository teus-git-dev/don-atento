import { Controller, Get, Patch, Body, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { TenantGuard } from '../auth/tenant.guard';
import { PrismaService } from '../prisma/prisma.service';
import { ApiBearerAuth, ApiTags, ApiOperation } from '@nestjs/swagger';

@ApiTags('tenants')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, TenantGuard)
@Controller('tenants')
export class TenantsController {
  constructor(private readonly prisma: PrismaService) {}

  @Get('me')
  @ApiOperation({ summary: 'Get current tenant WhatsApp config (masked)' })
  async getMyTenant(@Req() req: any) {
    const tenantId = req['tenantId'];
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      select: {
        id: true,
        name: true,
        whatsappPhoneNumberId: true,
        whatsappAccessToken: true,
        whatsappProvider: true,
      },
    });

    return {
      id: tenant?.id,
      name: tenant?.name,
      whatsappPhoneNumberId: tenant?.whatsappPhoneNumberId ?? null,
      whatsappProvider: tenant?.whatsappProvider || 'meta',
      whatsappConfigured: !!tenant?.whatsappPhoneNumberId && !!tenant?.whatsappAccessToken,
      // Mask the token for display
      whatsappAccessTokenMasked: tenant?.whatsappAccessToken
        ? `${tenant.whatsappAccessToken.substring(0, 8)}...${tenant.whatsappAccessToken.slice(-4)}`
        : null,
    };
  }

  @Patch('whatsapp-config')
  @ApiOperation({ summary: 'Save WhatsApp credentials for the current tenant' })
  async saveWhatsappConfig(
    @Req() req: any,
    @Body() body: { whatsappPhoneNumberId: string; whatsappAccessToken: string },
  ) {
    const tenantId = req['tenantId'];

    if (!body.whatsappPhoneNumberId || !body.whatsappAccessToken) {
      return { success: false, message: 'Faltan campos requeridos.' };
    }

    await this.prisma.tenant.update({
      where: { id: tenantId },
      data: {
        whatsappPhoneNumberId: body.whatsappPhoneNumberId.trim(),
        whatsappAccessToken: body.whatsappAccessToken.trim(),
      },
    });

    return { success: true, message: 'Credenciales de WhatsApp guardadas correctamente.' };
  }

  @Patch('whatsapp-disconnect')
  @ApiOperation({ summary: 'Disconnect WhatsApp from the current tenant' })
  async disconnectWhatsapp(@Req() req: any) {
    const tenantId = req['tenantId'];

    await this.prisma.tenant.update({
      where: { id: tenantId },
      data: {
        whatsappPhoneNumberId: null,
        whatsappAccessToken: null,
      },
    });

    return { success: true, message: 'WhatsApp desconectado correctamente.' };
  }
}
