import { Controller, Get, Patch, Post, Body, Req, Param, UseGuards, ForbiddenException } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { TenantGuard } from '../auth/tenant.guard';
import { BypassTenantGuard } from '../auth/tenant-bypass.decorator';
import { PrismaService } from '../prisma/prisma.service';
import { ApiBearerAuth, ApiTags, ApiOperation } from '@nestjs/swagger';
import { OnboardingService, ProvisionTenantInput, UpdateTenantAdminInput } from './onboarding.service';

@ApiTags('tenants')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, TenantGuard)
@Controller('tenants')
export class TenantsController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly onboardingService: OnboardingService,
  ) {}

  // ─── SuperAdmin: Provision new Inmobiliaria ───────────────────────────────
  @Post('provision')
  @ApiOperation({ summary: 'SUPERADMIN: Provision a new Inmobiliaria (Tenant + Admin User + Welcome Email)' })
  async provisionTenant(
    @Req() req: any,
    @Body() body: ProvisionTenantInput,
  ) {
    if (req.user?.role !== 'SUPERADMIN') {
      throw new ForbiddenException('Solo los SuperAdmins pueden provisionar nuevas inmobiliarias.');
    }

    const result = await this.onboardingService.provisionNewTenant(body);

    // ⚠ The temporaryPassword is returned ONCE here for the SuperAdmin to copy.
    // It must never be logged, cached, or stored anywhere else.
    return {
      success: true,
      message: `Inmobiliaria "${body.companyName}" provisionada exitosamente.`,
      tenantId: result.tenantId,
      userId: result.userId,
      emailSent: result.emailSent,
      // The SuperAdmin must copy this and store it securely — it will not be shown again
      temporaryPassword: result.temporaryPassword,
    };
  }

  // ─── Auth: Forced Password Change on First Login ──────────────────────────
  @Patch('change-password')
  @ApiOperation({ summary: 'Complete mandatory first-login password reset' })
  async changePassword(
    @Req() req: any,
    @Body() body: { newPassword: string; confirmPassword: string },
  ) {
    const userId = req.user?.id;
    if (!userId) throw new ForbiddenException('No autenticado.');

    if (body.newPassword !== body.confirmPassword) {
      throw new ForbiddenException('Las contraseñas no coinciden.');
    }

    await this.onboardingService.completePasswordReset(userId, body.newPassword);

    return { success: true, message: 'Contraseña actualizada correctamente. Bienvenido/a.' };
  }

  // ─── SuperAdmin: Update Admin User of an existing Tenant ─────────────────
  @Patch(':id/admin')
  @ApiOperation({ summary: 'SUPERADMIN: Update tenant admin user info. Re-sends welcome email if email changes.' })
  async updateTenantAdmin(
    @Req() req: any,
    @Param('id') tenantId: string,
    @Body() body: Omit<UpdateTenantAdminInput, 'tenantId'>,
  ) {
    if (req.user?.role !== 'SUPERADMIN') {
      throw new ForbiddenException('Solo los SuperAdmins pueden modificar el admin de una inmobiliaria.');
    }

    const result = await this.onboardingService.updateTenantAdmin({ ...body, tenantId });

    return {
      success: true,
      emailChanged: result.emailChanged,
      emailSent: result.emailSent,
      message: result.emailChanged
        ? 'Admin actualizado. Se envió un email con nuevas credenciales temporales.'
        : 'Admin actualizado correctamente.',
      // Only present when email changed — show ONCE to SuperAdmin
      ...(result.newTemporaryPassword && { newTemporaryPassword: result.newTemporaryPassword }),
    };
  }

  // ─── SuperAdmin: List all tenants ────────────────────────────────────────
  @BypassTenantGuard()
  @Get()
  @ApiOperation({ summary: 'SUPERADMIN: List all tenants' })
  async listTenants(@Req() req: any) {
    if (req.user?.role !== 'SUPERADMIN') {
      throw new ForbiddenException('Solo los SuperAdmins pueden listar todos los tenants.');
    }
    return this.prisma.tenant.findMany({
      select: { id: true, name: true, nit: true, status: true },
      orderBy: { name: 'asc' },
    });
  }

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
      whatsappConfigured:
        !!tenant?.whatsappPhoneNumberId && !!tenant?.whatsappAccessToken,
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
    @Body()
    body: { whatsappPhoneNumberId: string; whatsappAccessToken: string },
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

    return {
      success: true,
      message: 'Credenciales de WhatsApp guardadas correctamente.',
    };
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
