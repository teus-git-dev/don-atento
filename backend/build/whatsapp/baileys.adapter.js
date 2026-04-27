"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.BaileysAdapter = void 0;
const common_1 = require("@nestjs/common");
const baileys_1 = __importStar(require("@whiskeysockets/baileys"));
const path = __importStar(require("path"));
const fs = __importStar(require("fs"));
const events_1 = require("events");
const pino_1 = __importDefault(require("pino"));
class BaileysAdapter extends events_1.EventEmitter {
    tenantId;
    authDir;
    antiBan;
    logger;
    sock = null;
    status = 'disconnected';
    qrCode = null;
    reconnectAttempts = 0;
    MAX_RECONNECT = 5;
    constructor(tenantId, authDir, antiBan) {
        super();
        this.tenantId = tenantId;
        this.authDir = authDir;
        this.antiBan = antiBan;
        this.logger = new common_1.Logger(`BaileysAdapter:${tenantId}`);
    }
    async connect() {
        this.status = 'connecting';
        this.logger.log('Initiating Baileys connection...');
        const sessionDir = path.join(this.authDir, this.tenantId);
        if (!fs.existsSync(sessionDir)) {
            fs.mkdirSync(sessionDir, { recursive: true });
        }
        const { state, saveCreds } = await (0, baileys_1.useMultiFileAuthState)(sessionDir);
        const { version } = await (0, baileys_1.fetchLatestBaileysVersion)();
        this.sock = (0, baileys_1.default)({
            version,
            auth: {
                creds: state.creds,
                keys: (0, baileys_1.makeCacheableSignalKeyStore)(state.keys, (0, pino_1.default)({ level: 'silent' })),
            },
            printQRInTerminal: false,
            logger: (0, pino_1.default)({ level: 'silent' }),
            browser: ['Don Atento', 'Chrome', '120.0.0'],
            generateHighQualityLinkPreview: false,
            syncFullHistory: false,
        });
        this.sock.ev.on('creds.update', saveCreds);
        this.sock.ev.on('connection.update', (update) => {
            const { connection, lastDisconnect, qr } = update;
            if (qr) {
                this.qrCode = qr;
                this.status = 'qr_required';
                this.logger.log('QR Code generated. Waiting for scan...');
                this.emit('qr', qr);
            }
            if (connection === 'close') {
                const statusCode = lastDisconnect?.error?.output?.statusCode;
                const shouldReconnect = statusCode !== baileys_1.DisconnectReason.loggedOut;
                this.logger.warn(`Connection closed. Status: ${statusCode}. Reconnect: ${shouldReconnect}`);
                if (shouldReconnect && this.reconnectAttempts < this.MAX_RECONNECT) {
                    this.reconnectAttempts++;
                    const delay = this.antiBan.gaussianDelay(5000, 2000);
                    this.logger.log(`Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts}/${this.MAX_RECONNECT})...`);
                    setTimeout(() => this.connect(), delay);
                }
                else {
                    this.status = 'disconnected';
                    this.emit('disconnected', { reason: statusCode });
                    if (statusCode === baileys_1.DisconnectReason.loggedOut) {
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
        this.sock.ev.on('messages.upsert', (m) => {
            if (m.type !== 'notify')
                return;
            for (const msg of m.messages) {
                if (msg.key.fromMe)
                    continue;
                const jid = msg.key.remoteJid;
                if (!jid)
                    continue;
                const normalizedJid = jid.includes(':') ? jid.split(':')[0] + (jid.includes('@lid') ? '@lid' : '@s.whatsapp.net') : jid;
                const text = msg.message?.conversation ||
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
    async sendText(to, text) {
        if (!this.sock || this.status !== 'connected') {
            this.logger.warn('Cannot send: not connected');
            return;
        }
        const jid = this.normalizeJid(to);
        const check = this.antiBan.canSend(this.tenantId, to);
        if (!check.allowed) {
            this.logger.warn(`Message blocked by anti-ban: ${check.reason}`);
            return;
        }
        await this.sock.presenceSubscribe(jid);
        await this.sock.sendPresenceUpdate('composing', jid);
        await this.antiBan.applyDelay(this.tenantId);
        await this.sock.sendMessage(jid, { text });
        await this.sock.sendPresenceUpdate('paused', jid);
        this.antiBan.recordSent(this.tenantId, to);
        this.logger.debug(`Message sent to ${to}`);
    }
    async sendImage(to, imageUrl, caption) {
        if (!this.sock || this.status !== 'connected')
            return;
        const jid = this.normalizeJid(to);
        const check = this.antiBan.canSend(this.tenantId, to);
        if (!check.allowed)
            return;
        await this.antiBan.applyDelay(this.tenantId);
        await this.sock.sendMessage(jid, {
            image: { url: imageUrl },
            caption: caption || '',
        });
        this.antiBan.recordSent(this.tenantId, to);
    }
    async sendDocument(to, url, filename) {
        if (!this.sock || this.status !== 'connected')
            return;
        const jid = this.normalizeJid(to);
        const check = this.antiBan.canSend(this.tenantId, to);
        if (!check.allowed)
            return;
        await this.antiBan.applyDelay(this.tenantId);
        await this.sock.sendMessage(jid, {
            document: { url },
            mimetype: 'application/pdf',
            fileName: filename,
        });
        this.antiBan.recordSent(this.tenantId, to);
    }
    getStatus() {
        return this.status;
    }
    getQrCode() {
        return this.qrCode;
    }
    async disconnect() {
        if (this.sock) {
            await this.sock.logout();
            this.sock = null;
        }
        this.status = 'disconnected';
        this.qrCode = null;
    }
    normalizeJid(to) {
        if (to.includes('@'))
            return to;
        if (to.length > 15) {
            return `${to}@lid`;
        }
        const cleaned = to.replace(/[^0-9]/g, '');
        return `${cleaned}@s.whatsapp.net`;
    }
    clearSession() {
        const sessionDir = path.join(this.authDir, this.tenantId);
        if (fs.existsSync(sessionDir)) {
            fs.rmSync(sessionDir, { recursive: true, force: true });
        }
    }
}
exports.BaileysAdapter = BaileysAdapter;
//# sourceMappingURL=baileys.adapter.js.map