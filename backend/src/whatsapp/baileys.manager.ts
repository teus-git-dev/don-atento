import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { BaileysAdapter } from './baileys.adapter';
import { AntiBanService } from './anti-ban.service';
import { WhatsappConnectionStatus } from './whatsapp-provider.interface';
import * as path from 'path';

/**
 * BaileysManager — Gestiona múltiples instancias de BaileysAdapter.
 *
 * Cada tenant que use Baileys tiene su propia instancia de adapter
 * con sesión independiente y métricas anti-ban separadas.
 */
@Injectable()
export class BaileysManager implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(BaileysManager.name);
  private adapters = new Map<string, BaileysAdapter>();
  /**
   * In-flight connect promises keyed by tenantId. Prevents concurrent
   * `connectTenant(tenant)` calls from racing each other during the
   * 3-second wait window — the second caller awaits the same promise
   * instead of spawning a parallel adapter.
   */
  private connecting = new Map<
    string,
    Promise<{ status: WhatsappConnectionStatus; qr?: string }>
  >();
  private readonly authBaseDir = path.join(
    process.cwd(),
    'storage',
    'baileys_sessions',
  );

  // Callback para mensajes entrantes — se inyecta desde WhatsappModule
  private onMessageCallback:
    | ((
        tenantId: string,
        from: string,
        text: string,
        mediaType?: string,
      ) => Promise<void>)
    | null = null;

  constructor(
    private readonly prisma: PrismaService,
    private readonly antiBan: AntiBanService,
  ) {}

  async onModuleInit() {
    this.logger.log(
      'Initializing Baileys Manager: Auto-connecting active tenants...',
    );
    try {
      const activeTenants = await this.prisma.tenant.findMany({
        where: { whatsappProvider: 'baileys' },
      });

      for (const tenant of activeTenants) {
        this.logger.log(
          `Auto-starting Baileys session for tenant: ${tenant.id}`,
        );
        // Lo iniciamos en background para no bloquear el arranque total del servidor
        this.connectTenant(tenant.id).catch((err) => {
          this.logger.error(
            `Failed to auto-connect tenant ${tenant.id}: ${err.message}`,
          );
        });
      }
    } catch (error) {
      this.logger.error('Error during Baileys auto-connection:', error.message);
    }
  }

  /**
   * Registra el callback para procesar mensajes entrantes.
   */
  setMessageHandler(
    handler: (
      tenantId: string,
      from: string,
      text: string,
      mediaType?: string,
    ) => Promise<void>,
  ) {
    this.onMessageCallback = handler;
  }

  /**
   * Conecta un tenant a Baileys. Retorna el QR code si necesita autenticación.
   *
   * Idempotente: concurrent calls for the same tenant share the
   * single in-flight promise instead of racing each other.
   */
  async connectTenant(
    tenantId: string,
  ): Promise<{ status: WhatsappConnectionStatus; qr?: string }> {
    // Si ya existe y está conectado, retornar status
    if (this.adapters.has(tenantId)) {
      const adapter = this.adapters.get(tenantId)!;
      const status = adapter.getStatus();
      if (status === 'connected') {
        return { status };
      }
      if (status === 'qr_required') {
        return { status, qr: adapter.getQrCode() || undefined };
      }
    }

    // Dedup concurrent connect() calls within the QR-wait window.
    const existing = this.connecting.get(tenantId);
    if (existing) {
      this.logger.log(
        `connectTenant(${tenantId}): joining in-flight connection`,
      );
      return existing;
    }

    const promise = this.doConnect(tenantId).finally(() => {
      this.connecting.delete(tenantId);
    });
    this.connecting.set(tenantId, promise);
    return promise;
  }

  private async doConnect(
    tenantId: string,
  ): Promise<{ status: WhatsappConnectionStatus; qr?: string }> {
    // Crear nueva instancia
    const adapter = new BaileysAdapter(
      tenantId,
      this.authBaseDir,
      this.antiBan,
    );

    // Escuchar eventos
    adapter.on(
      'message',
      async (data: { from: string; text: string; mediaType?: string }) => {
        if (this.onMessageCallback) {
          try {
            await this.onMessageCallback(
              tenantId,
              data.from,
              data.text,
              data.mediaType || undefined,
            );
          } catch (err) {
            this.logger.error(
              `Error processing incoming message for tenant ${tenantId}:`,
              err,
            );
          }
        }
      },
    );

    adapter.on('connected', async () => {
      this.logger.log(`✅ Tenant ${tenantId} connected via Baileys`);
      // Actualizar estado en DB
      try {
        await this.prisma.tenant.update({
          where: { id: tenantId },
          data: { whatsappProvider: 'baileys' },
        });
      } catch (e) {
        this.logger.warn(
          `Could not update tenant provider field: ${e.message}`,
        );
      }
    });

    adapter.on('disconnected', (data: { reason: number }) => {
      this.logger.warn(
        `Tenant ${tenantId} disconnected from Baileys. Reason: ${data.reason}`,
      );
    });

    this.adapters.set(tenantId, adapter);

    // Iniciar conexión
    await adapter.connect();

    // Esperar un poco para que genere el QR o se reconecte
    await new Promise((resolve) => setTimeout(resolve, 3000));

    const status = adapter.getStatus();
    return {
      status,
      qr:
        status === 'qr_required' ? adapter.getQrCode() || undefined : undefined,
    };
  }

  /**
   * Obtiene el adapter de un tenant.
   *
   * Strict mode: returns ONLY the adapter for the requested tenantId,
   * never another tenant's. The previous cross-tenant fallback (loop
   * over all adapters, return first connected) sent outbound messages
   * from the wrong tenant's WhatsApp number — recipients saw a
   * foreign number and the message was billed / reputation-attributed
   * to the wrong tenant. Callers should treat `null` as "tenant has
   * no Baileys session" and route via Meta or skip.
   */
  getAdapter(tenantId: string): BaileysAdapter | null {
    return this.adapters.get(tenantId) ?? null;
  }

  /**
   * Envía un mensaje a través de Baileys para un tenant específico.
   */
  async sendMessage(
    tenantId: string,
    to: string,
    text: string,
  ): Promise<boolean> {
    const adapter = this.adapters.get(tenantId);
    if (!adapter || adapter.getStatus() !== 'connected') {
      this.logger.warn(
        `Cannot send via Baileys for tenant ${tenantId}: not connected`,
      );
      return false;
    }

    await adapter.sendText(to, text);
    return true;
  }

  /**
   * Obtiene el estado de conexión de un tenant.
   */
  getConnectionStatus(tenantId: string): {
    status: WhatsappConnectionStatus;
    qr?: string;
    health?: any;
  } {
    const adapter = this.adapters.get(tenantId);
    if (!adapter) {
      return { status: 'disconnected' };
    }

    return {
      status: adapter.getStatus(),
      qr:
        adapter.getStatus() === 'qr_required'
          ? adapter.getQrCode() || undefined
          : undefined,
      health: this.antiBan.getHealthMetrics(tenantId),
    };
  }

  /**
   * Desconecta un tenant de Baileys.
   */
  async disconnectTenant(tenantId: string): Promise<void> {
    const adapter = this.adapters.get(tenantId);
    if (adapter) {
      await adapter.disconnect();
      this.adapters.delete(tenantId);
      this.logger.log(`Tenant ${tenantId} disconnected from Baileys`);
    }
  }

  async onModuleDestroy() {
    this.logger.log('Shutting down all Baileys connections...');
    for (const [tenantId, adapter] of this.adapters) {
      try {
        await adapter.disconnect();
      } catch (e) {
        this.logger.warn(
          `Error disconnecting tenant ${tenantId}: ${e.message}`,
        );
      }
    }
    this.adapters.clear();
  }
}
