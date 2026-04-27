import { EventEmitter } from 'events';
import { WhatsappProvider, WhatsappConnectionStatus } from './whatsapp-provider.interface';
import { AntiBanService } from './anti-ban.service';
export declare class BaileysAdapter extends EventEmitter implements WhatsappProvider {
    private readonly tenantId;
    private readonly authDir;
    private readonly antiBan;
    private readonly logger;
    private sock;
    private status;
    private qrCode;
    private reconnectAttempts;
    private readonly MAX_RECONNECT;
    constructor(tenantId: string, authDir: string, antiBan: AntiBanService);
    connect(): Promise<void>;
    sendText(to: string, text: string): Promise<void>;
    sendImage(to: string, imageUrl: string, caption?: string): Promise<void>;
    sendDocument(to: string, url: string, filename: string): Promise<void>;
    getStatus(): WhatsappConnectionStatus;
    getQrCode(): string | null;
    disconnect(): Promise<void>;
    private normalizeJid;
    private clearSession;
}
