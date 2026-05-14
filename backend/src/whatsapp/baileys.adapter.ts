import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import makeWASocket, {
  DisconnectReason,
  useMultiFileAuthState,
  WASocket,
  fetchLatestBaileysVersion,
  makeCacheableSignalKeyStore,
} from '@whiskeysockets/baileys';
import { Boom } from '@hapi/boom';
import * as path from 'path';
import * as fs from 'fs';
import { EventEmitter } from 'events';
import pino from 'pino';
import {
  WhatsappProvider,
  WhatsappConnectionStatus,
} from './whatsapp-provider.interface';
import { AntiBanService } from './anti-ban.service';

/**
 * BaileysAdapter — Proveedor gratuito de WhatsApp vía protocolo WA Web.
 *
 * Cada instancia representa UNA conexión de WhatsApp para UN tenant.
 * Se autentica mediante QR Code y persiste la sesión en disco.
 *
 * IMPORTANTE: Esta clase NO se inyecta directamente como singleton.
 * Se instancia dinámicamente por tenant desde BaileysManager.
 */
export class BaileysAdapter extends EventEmitter implements WhatsappProvider {
  private readonly logger: Logger;
  private sock: WASocket | null = null;
  private status: WhatsappConnectionStatus = 'disconnected';
  private qrCode: string | null = null;
  private reconnectAttempts = 0;
  private readonly MAX_RECONNECT = 5;

  constructor(
    private readonly tenantId: string,
    private readonly authDir: string,
    private readonly antiBan: AntiBanService,
  ) {
    super();
    this.logger = new Logger(`BaileysAdapter:${tenantId}`);
  }

  /**
   * Inicia la conexión con WhatsApp Web.
   * Si no hay sesión guardada, genera un QR para escanear.
   */
  async connect(): Promise<void> {
    this.status = 'connecting';
    this.logger.log('Initiating Baileys connection...');

    // Crear directorio de auth si no existe
    const sessionDir = path.join(this.authDir, this.tenantId);
    if (!fs.existsSync(sessionDir)) {
      fs.mkdirSync(sessionDir, { recursive: true });
    }

    const { state, saveCreds } = await useMultiFileAuthState(sessionDir);
    const { version } = await fetchLatestBaileysVersion();

    this.sock = makeWASocket({
      version,
      auth: {
        creds: state.creds,
        keys: makeCacheableSignalKeyStore(
          state.keys,
          pino({ level: 'silent' }) as any,
        ),
      },
      printQRInTerminal: false, // Lo manejamos nosotros
      logger: pino({ level: 'silent' }) as any,
      // Anti-ban: Simular cliente real
      browser: ['Don Atento', 'Chrome', '120.0.0'],
      generateHighQualityLinkPreview: false,
      syncFullHistory: false,
    });

    // --- Event Handlers ---

    // Credenciales actualizadas → guardar
    this.sock.ev.on('creds.update', saveCreds);

    // Estado de conexión
    this.sock.ev.on('connection.update', (update) => {
      const { connection, lastDisconnect, qr } = update;

      if (qr) {
        this.qrCode = qr;
        this.status = 'qr_required';
        this.logger.log('QR Code generated. Waiting for scan...');
        this.emit('qr', qr);
      }

      if (connection === 'close') {
        const statusCode = (lastDisconnect?.error as Boom)?.output?.statusCode;
        const shouldReconnect = statusCode !== DisconnectReason.loggedOut;

        this.logger.warn(
          `Connection closed. Status: ${statusCode}. Reconnect: ${shouldReconnect}`,
        );

        if (shouldReconnect && this.reconnectAttempts < this.MAX_RECONNECT) {
          this.reconnectAttempts++;
          const delay = this.antiBan.gaussianDelay(5000, 2000);
          this.logger.log(
            `Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts}/${this.MAX_RECONNECT})...`,
          );
          setTimeout(() => this.connect(), delay);
        } else {
          this.status = 'disconnected';
          this.emit('disconnected', { reason: statusCode });
          if (statusCode === DisconnectReason.loggedOut) {
            // Sesión cerrada — limpiar archivos de auth
            this.logger.warn('Logged out. Clearing session files.');
            this.clearSession();
          }
        }
      }

      if (connection === 'open') {
        this.status = 'connected';
        this.qrCode = null;
        this.reconnectAttempts = 0;
        this.logger.log('✅ Connected to WhatsApp successfully!');
        this.emit('connected');
      }
    });

    // Mensajes entrantes
    this.sock.ev.on('messages.upsert', (m) => {
      if (m.type !== 'notify') return; // Solo mensajes nuevos

      for (const msg of m.messages) {
        if (msg.key.fromMe) continue; // Ignorar mensajes propios

        const jid = msg.key.remoteJid;
        if (!jid) continue;

        // Normalizar JID (maneja @lid y @s.whatsapp.net)
        const normalizedJid = jid.includes(':')
          ? jid.split(':')[0] +
            (jid.includes('@lid') ? '@lid' : '@s.whatsapp.net')
          : jid;

        const text =
          msg.message?.conversation ||
          msg.message?.extendedTextMessage?.text ||
          '';
        const mediaType = msg.message?.imageMessage
          ? 'image'
          : msg.message?.videoMessage
            ? 'video'
            : msg.message?.documentMessage
              ? 'document'
              : null;

        this.emit('message', {
          from: normalizedJid,
          text,
          mediaType,
          rawMessage: msg,
          timestamp: msg.messageTimestamp,
        });
      }
    });
  }

  /**
   * Envía un mensaje de texto con protección anti-ban.
   */
  async sendText(
    to: string,
    text: string,
    options: { isOutbound?: boolean } = {},
  ): Promise<void> {
    if (!this.sock || this.status !== 'connected') {
      this.logger.warn('Cannot send: not connected');
      return;
    }

    const jid = this.normalizeJid(to);

    // Anti-ban: verificar límites. Defaults to outbound (proactive)
    // — replies to inbound messages should pass `isOutbound: false`
    // explicitly to bypass the circadian rule.
    const isOutbound = options.isOutbound ?? true;
    const check = await this.antiBan.canSend(this.tenantId, to, isOutbound);
    if (!check.allowed) {
      this.logger.warn(`Message blocked by anti-ban: ${check.reason}`);
      return;
    }

    // Anti-ban: simular typing
    await this.sock.presenceSubscribe(jid);
    await this.sock.sendPresenceUpdate('composing', jid);

    // Anti-ban: delay humanizado
    await this.antiBan.applyDelay(this.tenantId);

    // Enviar
    await this.sock.sendMessage(jid, { text });

    // Anti-ban: parar typing
    await this.sock.sendPresenceUpdate('paused', jid);

    // Anti-ban: registrar envío
    await this.antiBan.recordSent(this.tenantId, to);

    this.logger.debug(`Message sent to ${to}`);
  }

  /**
   * Envía una imagen con caption opcional.
   */
  async sendImage(
    to: string,
    imageUrl: string,
    caption?: string,
  ): Promise<void> {
    if (!this.sock || this.status !== 'connected') return;

    const jid = this.normalizeJid(to);
    const check = await this.antiBan.canSend(this.tenantId, to, true);
    if (!check.allowed) return;

    await this.antiBan.applyDelay(this.tenantId);

    await this.sock.sendMessage(jid, {
      image: { url: imageUrl },
      caption: caption || '',
    });

    await this.antiBan.recordSent(this.tenantId, to);
  }

  /**
   * Envía un documento.
   */
  async sendDocument(to: string, url: string, filename: string): Promise<void> {
    if (!this.sock || this.status !== 'connected') return;

    const jid = this.normalizeJid(to);
    const check = await this.antiBan.canSend(this.tenantId, to, true);
    if (!check.allowed) return;

    await this.antiBan.applyDelay(this.tenantId);

    await this.sock.sendMessage(jid, {
      document: { url },
      mimetype: 'application/pdf',
      fileName: filename,
    });

    await this.antiBan.recordSent(this.tenantId, to);
  }

  getStatus(): WhatsappConnectionStatus {
    return this.status;
  }

  getQrCode(): string | null {
    return this.qrCode;
  }

  async disconnect(): Promise<void> {
    if (this.sock) {
      await this.sock.logout();
      this.sock = null;
    }
    this.status = 'disconnected';
    this.qrCode = null;
  }

  private normalizeJid(to: string): string {
    if (to.includes('@')) return to; // Ya está normalizado

    // Si el ID parece un LID (generalmente muy largo o con formato específico)
    // o si el sistema lo detectó previamente como LID.
    // Como regla general: Si tiene más de 15 dígitos y no empieza por un código de país conocido de forma estándar,
    // o si simplemente queremos ser robustos, dejamos que Baileys lo maneje.
    if (to.length > 15) {
      return `${to}@lid`;
    }

    const cleaned = to.replace(/[^0-9]/g, '');
    return `${cleaned}@s.whatsapp.net`;
  }

  private clearSession(): void {
    const sessionDir = path.join(this.authDir, this.tenantId);
    if (fs.existsSync(sessionDir)) {
      fs.rmSync(sessionDir, { recursive: true, force: true });
    }
  }
}
