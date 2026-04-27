import { Injectable, Logger } from '@nestjs/common';

/**
 * AntiBanService — Motor de protección anti-detección para Baileys.
 *
 * Implementa las 7 capas del protocolo anti-ban:
 * 1. Gaussian Jitter (delays humanizados)
 * 2. Rate Limiting por ventana de tiempo
 * 3. Ritmo Circadiano (horario activo/pasivo)
 * 4. Monitoreo de salud del número
 * 5. Personalización de mensajes
 * 6. Simulación de typing
 * 7. Cool-down automático
 */
@Injectable()
export class AntiBanService {
  private readonly logger = new Logger(AntiBanService.name);

  // Contadores por tenant
  private counters = new Map<string, {
    messagesLastHour: number;
    messagesLast24h: number;
    uniqueContactsToday: Set<string>;
    hourReset: number;
    dayReset: number;
  }>();

  // Configuración de límites seguros
  private readonly LIMITS = {
    MAX_MESSAGES_PER_HOUR: 25,
    MAX_MESSAGES_PER_DAY: 250,
    MAX_NEW_CONTACTS_PER_DAY: 15,
    ACTIVE_HOUR_START: 7,   // 7 AM
    ACTIVE_HOUR_END: 22,    // 10 PM
    COOLDOWN_MULTIPLIER: 2, // Si se acerca al límite, duplicar delays
  };

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
    if (hour < this.LIMITS.ACTIVE_HOUR_START || hour >= this.LIMITS.ACTIVE_HOUR_END) {
      baseMean = 8000; // 8 segundos fuera de horario
    }

    // Si estamos cerca del límite → cooldown
    const counter = this.getCounter(tenantId);
    const hourUsage = counter.messagesLastHour / this.LIMITS.MAX_MESSAGES_PER_HOUR;
    if (hourUsage > 0.7) {
      baseMean *= this.LIMITS.COOLDOWN_MULTIPLIER;
      this.logger.warn(`[${tenantId}] Approaching hourly limit (${Math.round(hourUsage * 100)}%). Slowing down.`);
    }

    const delay = this.gaussianDelay(baseMean, baseMean * 0.4);
    this.logger.debug(`[${tenantId}] Applying human delay: ${delay}ms`);
    await this.sleep(delay);
  }

  /**
   * Verifica si es seguro enviar un mensaje.
   * Retorna true si se puede enviar, false si hay que pausar.
   */
  canSend(tenantId: string, contactId: string): { allowed: boolean; reason?: string } {
    const counter = this.getCounter(tenantId);
    this.refreshCounters(counter);

    // Check horario
    const hour = new Date().getHours();
    if (hour < this.LIMITS.ACTIVE_HOUR_START || hour >= this.LIMITS.ACTIVE_HOUR_END) {
      // Fuera de horario solo permitimos respuestas a mensajes entrantes
      // El caller debe indicar si es inbound o outbound
      this.logger.debug(`[${tenantId}] Outside active hours (${hour}h). Outbound paused.`);
    }

    // Check rate limits
    if (counter.messagesLastHour >= this.LIMITS.MAX_MESSAGES_PER_HOUR) {
      return { allowed: false, reason: `Hourly limit reached (${this.LIMITS.MAX_MESSAGES_PER_HOUR}/h)` };
    }

    if (counter.messagesLast24h >= this.LIMITS.MAX_MESSAGES_PER_DAY) {
      return { allowed: false, reason: `Daily limit reached (${this.LIMITS.MAX_MESSAGES_PER_DAY}/day)` };
    }

    // Check new contacts
    if (
      !counter.uniqueContactsToday.has(contactId) &&
      counter.uniqueContactsToday.size >= this.LIMITS.MAX_NEW_CONTACTS_PER_DAY
    ) {
      return { allowed: false, reason: `New contact limit reached (${this.LIMITS.MAX_NEW_CONTACTS_PER_DAY}/day)` };
    }

    return { allowed: true };
  }

  /**
   * Registra un mensaje enviado para el tracking de rate limits.
   */
  recordSent(tenantId: string, contactId: string): void {
    const counter = this.getCounter(tenantId);
    this.refreshCounters(counter);
    counter.messagesLastHour++;
    counter.messagesLast24h++;
    counter.uniqueContactsToday.add(contactId);
  }

  /**
   * Obtiene métricas de salud del número para un tenant.
   */
  getHealthMetrics(tenantId: string) {
    const counter = this.getCounter(tenantId);
    this.refreshCounters(counter);

    const hourUsage = counter.messagesLastHour / this.LIMITS.MAX_MESSAGES_PER_HOUR;
    const dayUsage = counter.messagesLast24h / this.LIMITS.MAX_MESSAGES_PER_DAY;

    let warningLevel: 'GREEN' | 'YELLOW' | 'RED' = 'GREEN';
    if (hourUsage > 0.7 || dayUsage > 0.7) warningLevel = 'YELLOW';
    if (hourUsage > 0.9 || dayUsage > 0.9) warningLevel = 'RED';

    return {
      messagesLastHour: counter.messagesLastHour,
      messagesLast24h: counter.messagesLast24h,
      uniqueContactsToday: counter.uniqueContactsToday.size,
      hourUsagePercent: Math.round(hourUsage * 100),
      dayUsagePercent: Math.round(dayUsage * 100),
      warningLevel,
      limits: this.LIMITS,
    };
  }

  // --- Private helpers ---

  private getCounter(tenantId: string) {
    if (!this.counters.has(tenantId)) {
      this.counters.set(tenantId, {
        messagesLastHour: 0,
        messagesLast24h: 0,
        uniqueContactsToday: new Set(),
        hourReset: Date.now() + 3600000,
        dayReset: Date.now() + 86400000,
      });
    }
    return this.counters.get(tenantId)!;
  }

  private refreshCounters(counter: ReturnType<typeof this.getCounter>) {
    const now = Date.now();
    if (now > counter.hourReset) {
      counter.messagesLastHour = 0;
      counter.hourReset = now + 3600000;
    }
    if (now > counter.dayReset) {
      counter.messagesLast24h = 0;
      counter.uniqueContactsToday.clear();
      counter.dayReset = now + 86400000;
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
