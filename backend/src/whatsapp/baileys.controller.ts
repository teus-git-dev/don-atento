import { Controller, Post, Get, Delete, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { BaileysManager } from './baileys.manager';
import { AntiBanService } from './anti-ban.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { TenantGuard } from '../auth/tenant.guard';
import { Roles } from '../auth/roles.decorator';

/**
 * BaileysController — API para gestión de conexiones Baileys por tenant.
 *
 * Endpoints:
 * - POST   /baileys/connect     → Inicia conexión, retorna QR si es necesario
 * - GET    /baileys/status      → Estado de conexión + métricas anti-ban
 * - GET    /baileys/qr          → Obtener QR code actual (polling)
 * - DELETE /baileys/disconnect  → Desconectar sesión
 * - GET    /baileys/health      → Métricas de salud del número
 *
 * Authorization: Writes / QR-revealing reads are restricted to
 * ADMIN_TENANT and SUPERADMIN because possession of the QR is
 * equivalent to taking over the tenant's WhatsApp number; disconnect
 * can sabotage operations. Status / health reads are open to AGENT
 * too so dashboards can show connection state.
 */
@ApiTags('baileys')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard, TenantGuard)
@Controller('baileys')
export class BaileysController {
  constructor(
    private readonly baileysManager: BaileysManager,
    private readonly antiBan: AntiBanService,
  ) {}

  @Post('connect')
  @Roles('ADMIN_TENANT', 'SUPERADMIN')
  @ApiOperation({ summary: 'Iniciar conexión Baileys para el tenant actual' })
  async connect(@Req() req: Request) {
    const tenantId = req.tenantId!;
    const result = await this.baileysManager.connectTenant(tenantId);
    return {
      success: true,
      status: result.status,
      qr: result.qr || null,
      message:
        result.status === 'qr_required'
          ? 'Escanea el código QR con WhatsApp desde tu teléfono.'
          : result.status === 'connected'
            ? '¡WhatsApp conectado exitosamente vía Baileys!'
            : 'Conectando...',
    };
  }

  @Get('status')
  @Roles('AGENT', 'ADMIN_TENANT', 'SUPERADMIN')
  @ApiOperation({ summary: 'Estado de conexión Baileys del tenant' })
  getStatus(@Req() req: Request) {
    const tenantId = req.tenantId!;
    const info = this.baileysManager.getConnectionStatus(tenantId);
    // Strip QR from the AGENT-facing status response — possession of
    // the QR grants WhatsApp control. Only the dedicated GET /qr
    // endpoint (ADMIN_TENANT+) returns it.
    const { qr: _qr, ...sanitized } = info;
    return {
      success: true,
      ...sanitized,
    };
  }

  @Get('qr')
  @Roles('ADMIN_TENANT', 'SUPERADMIN')
  @ApiOperation({ summary: 'Obtener QR code actual para vincular' })
  getQr(@Req() req: Request) {
    const tenantId = req.tenantId!;
    const info = this.baileysManager.getConnectionStatus(tenantId);
    return {
      success: true,
      status: info.status,
      qr: info.qr || null,
    };
  }

  @Delete('disconnect')
  @Roles('ADMIN_TENANT', 'SUPERADMIN')
  @ApiOperation({ summary: 'Desconectar Baileys del tenant' })
  async disconnect(@Req() req: Request) {
    const tenantId = req.tenantId!;
    await this.baileysManager.disconnectTenant(tenantId);
    return {
      success: true,
      message: 'Baileys desconectado exitosamente.',
    };
  }

  @Get('health')
  @Roles('AGENT', 'ADMIN_TENANT', 'SUPERADMIN')
  @ApiOperation({ summary: 'Métricas de salud anti-ban del número' })
  async getHealth(@Req() req: Request) {
    const tenantId = req.tenantId!;
    const health = await this.antiBan.getHealthMetrics(tenantId);
    return {
      success: true,
      ...health,
    };
  }
}
