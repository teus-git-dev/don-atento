import { Injectable, Logger } from '@nestjs/common';
import * as IORedis from 'ioredis';

/**
 * AntiBanService — Motor de protección anti-detección para Baileys.
 *
 * Block F changes:
 *  - Counters now live in Redis (TTL-managed), not an in-memory Map.
 *    This makes the rate-limit guarantees actually hold under
 *    horizontal scaling — three pods no longer count 25/h each in
 *    parallel.
 *  - `canSend` accepts an explicit `isOutbound` flag so the circadian
 *    rhythm rule (no outbound between 22h-7h) actually blocks instead
 *    of just logging. Inbound replies are unconstrained.
 *  - If Redis is unreachable, methods FAIL-CLOSED for outbound
 *    (better to skip a message than to ban the number) and
 *    fail-open for read-only metrics.
 *
 * Implementa las 7 capas del protocolo anti-ban:
 * 1. Gaussian Jitter (delays humanizados)
 * 2. Rate Limiting por ventana de tiempo
 * 3. Ritmo Circadiano (horario activo/pasivo)  ← now enforced
 * 4. Monitoreo de salud del número
 * 5. Personalización de mensajes
 * 6. Simulación de typing
 * 7. Cool-down automático
 */
@Injectable()
export class AntiBanService {
  private readonly logger = new Logger(AntiBanService.name);
  private readonly redis: IORedis.Redis;

  // Configuración de límites seguros
  private readonly LIMITS = {
    MAX_MESSAGES_PER_HOUR: 25,
    MAX_MESSAGES_PER_DAY: 250,
    MAX_NEW_CONTACTS_PER_DAY: 15,
    ACTIVE_HOUR_START: 7, // 7 AM
    ACTIVE_HOUR_END: 22, // 10 PM
    COOLDOWN_MULTIPLIER: 2, // Si se acerca al límite, duplicar delays
  };

  constructor() {
    const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
    this.redis = new IORedis.Redis(redisUrl, {
      lazyConnect: true,
      maxRetriesPerRequest: 1,
      enableOfflineQueue: false,
    });
    this.redis.on('error', (err) =>
      this.logger.warn(
        `[AntiBan Redis] Connection issue: ${err.message} — rate limits may degrade`,
      ),
    );
  }

  /**
   * Genera un delay con distribución Gaussiana para simular comportamiento humano.
   * Nunca produce intervalos exactos — es la base de la anti-detección.
   */
  gaussianDelay(meanMs: number = 4000, stdDevMs: number = 1500): number {
    const u1 = Math.random();
    const u2 = Math.random();
    const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
    return Math.max(1500, Math.round(meanMs + z * stdDevMs));
  }

  /**
   * Aplica un delay humanizado antes de enviar un mensaje.
   * El delay se ajusta según la hora del día y la carga actual.
   */
  async applyDelay(tenantId: string): Promise<void> {
    const hour = new Date().getHours();
    let baseMean = 4000; // 4 segundos base

    // Fuera de horario pico → más lento
    if (
      hour < this.LIMITS.ACTIVE_HOUR_START ||
      hour >= this.LIMITS.ACTIVE_HOUR_END
    ) {
      baseMean = 8000; // 8 segundos fuera de horario
    }

    // Si estamos cerca del límite → cooldown
    const hourCount = await this.getHourCount(tenantId);
    const hourUsage = hourCount / this.LIMITS.MAX_MESSAGES_PER_HOUR;
    if (hourUsage > 0.7) {
      baseMean *= this.LIMITS.COOLDOWN_MULTIPLIER;
      this.logger.warn(
        `[${tenantId}] Approaching hourly limit (${Math.round(hourUsage * 100)}%). Slowing down.`,
      );
    }

    const delay = this.gaussianDelay(baseMean, baseMean * 0.4);
    this.logger.debug(`[${tenantId}] Applying human delay: ${delay}ms`);
    await this.sleep(delay);
  }

  /**
   * Verifica si es seguro enviar un mensaje.
   *
   * @param isOutbound  true if this is a proactive message from the
   *   server, false if it's a reply to an inbound message. Outbound
   *   is blocked outside `ACTIVE_HOUR_START..ACTIVE_HOUR_END`; inbound
   *   replies are always allowed (a client conversation at 23h still
   *   gets a response).
   */
  async canSend(
    tenantId: string,
    contactId: string,
    isOutbound = true,
  ): Promise<{ allowed: boolean; reason?: string }> {
    // Check horario — only enforced for outbound proactive sends.
    if (isOutbound) {
      const hour = new Date().getHours();
      if (
        hour < this.LIMITS.ACTIVE_HOUR_START ||
        hour >= this.LIMITS.ACTIVE_HOUR_END
      ) {
        return {
          allowed: false,
          reason: `Outside active hours (${hour}h). Outbound proactive messages paused (active ${this.LIMITS.ACTIVE_HOUR_START}h-${this.LIMITS.ACTIVE_HOUR_END}h).`,
        };
      }
    }

    // Check rate limits via Redis. If Redis is unreachable we
    // fail-closed for outbound (skip the send rather than risk a
    // ban) and fail-open for inbound replies.
    let hourCount = 0;
    let dayCount = 0;
    let newContactsToday = 0;
    try {
      hourCount = await this.getHourCount(tenantId);
      dayCount = await this.getDayCount(tenantId);
      const isKnownContact = await this.redis.sismember(
        this.dayContactsKey(tenantId),
        contactId,
      );
      if (!isKnownContact) {
        newContactsToday = await this.redis.scard(
          this.dayContactsKey(tenantId),
        );
      }
    } catch (err) {
      this.logger.warn(
        `[AntiBan Redis] read failed for tenant=${tenantId}: ${(err as Error).message}`,
      );
      if (isOutbound) {
        return { allowed: false, reason: 'Rate limit store unavailable' };
      }
      return { allowed: true };
    }

    if (hourCount >= this.LIMITS.MAX_MESSAGES_PER_HOUR) {
      return {
        allowed: false,
        reason: `Hourly limit reached (${this.LIMITS.MAX_MESSAGES_PER_HOUR}/h)`,
      };
    }

    if (dayCount >= this.LIMITS.MAX_MESSAGES_PER_DAY) {
      return {
        allowed: false,
        reason: `Daily limit reached (${this.LIMITS.MAX_MESSAGES_PER_DAY}/day)`,
      };
    }

    if (newContactsToday >= this.LIMITS.MAX_NEW_CONTACTS_PER_DAY) {
      return {
        allowed: false,
        reason: `New contact limit reached (${this.LIMITS.MAX_NEW_CONTACTS_PER_DAY}/day)`,
      };
    }

    return { allowed: true };
  }

  /**
   * Registra un mensaje enviado para el tracking de rate limits.
   * Best-effort: if Redis is down, the recorder is a no-op (the
   * canSend guard will already have been more conservative).
   */
  async recordSent(tenantId: string, contactId: string): Promise<void> {
    try {
      const hourKey = this.hourKey(tenantId);
      const dayKey = this.dayKey(tenantId);
      const contactsKey = this.dayContactsKey(tenantId);
      await this.redis
        .multi()
        .incr(hourKey)
        .expire(hourKey, 3600)
        .incr(dayKey)
        .expire(dayKey, 86400)
        .sadd(contactsKey, contactId)
        .expire(contactsKey, 86400)
        .exec();
    } catch (err) {
      this.logger.warn(
        `[AntiBan Redis] recordSent failed for tenant=${tenantId}: ${(err as Error).message}`,
      );
    }
  }

  /**
   * Obtiene métricas de salud del número para un tenant.
   */
  async getHealthMetrics(tenantId: string) {
    let messagesLastHour = 0;
    let messagesLast24h = 0;
    let uniqueContactsToday = 0;
    try {
      messagesLastHour = await this.getHourCount(tenantId);
      messagesLast24h = await this.getDayCount(tenantId);
      uniqueContactsToday = await this.redis.scard(
        this.dayContactsKey(tenantId),
      );
    } catch {
      // fall-through with zeros — dashboard shows GREEN, log already
      // captured the Redis warning.
    }

    const hourUsage = messagesLastHour / this.LIMITS.MAX_MESSAGES_PER_HOUR;
    const dayUsage = messagesLast24h / this.LIMITS.MAX_MESSAGES_PER_DAY;

    let warningLevel: 'GREEN' | 'YELLOW' | 'RED' = 'GREEN';
    if (hourUsage > 0.7 || dayUsage > 0.7) warningLevel = 'YELLOW';
    if (hourUsage > 0.9 || dayUsage > 0.9) warningLevel = 'RED';

    return {
      messagesLastHour,
      messagesLast24h,
      uniqueContactsToday,
      hourUsagePercent: Math.round(hourUsage * 100),
      dayUsagePercent: Math.round(dayUsage * 100),
      warningLevel,
      limits: this.LIMITS,
    };
  }

  // --- Private helpers ---

  private hourKey(tenantId: string): string {
    return `wa:antiban:${tenantId}:hour`;
  }
  private dayKey(tenantId: string): string {
    return `wa:antiban:${tenantId}:day`;
  }
  private dayContactsKey(tenantId: string): string {
    return `wa:antiban:${tenantId}:contacts:day`;
  }

  private async getHourCount(tenantId: string): Promise<number> {
    const raw = await this.redis.get(this.hourKey(tenantId));
    return raw ? parseInt(raw, 10) : 0;
  }
  private async getDayCount(tenantId: string): Promise<number> {
    const raw = await this.redis.get(this.dayKey(tenantId));
    return raw ? parseInt(raw, 10) : 0;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
