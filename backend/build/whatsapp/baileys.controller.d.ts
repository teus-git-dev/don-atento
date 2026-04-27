import { BaileysManager } from './baileys.manager';
import { AntiBanService } from './anti-ban.service';
export declare class BaileysController {
    private readonly baileysManager;
    private readonly antiBan;
    constructor(baileysManager: BaileysManager, antiBan: AntiBanService);
    connect(req: any): Promise<{
        success: boolean;
        status: import("./whatsapp-provider.interface").WhatsappConnectionStatus;
        qr: string | null;
        message: string;
    }>;
    getStatus(req: any): {
        status: import("./whatsapp-provider.interface").WhatsappConnectionStatus;
        qr?: string;
        health?: any;
        success: boolean;
    };
    getQr(req: any): {
        success: boolean;
        status: import("./whatsapp-provider.interface").WhatsappConnectionStatus;
        qr: string | null;
    };
    disconnect(req: any): Promise<{
        success: boolean;
        message: string;
    }>;
    getHealth(req: any): {
        messagesLastHour: number;
        messagesLast24h: number;
        uniqueContactsToday: number;
        hourUsagePercent: number;
        dayUsagePercent: number;
        warningLevel: "GREEN" | "YELLOW" | "RED";
        limits: {
            MAX_MESSAGES_PER_HOUR: number;
            MAX_MESSAGES_PER_DAY: number;
            MAX_NEW_CONTACTS_PER_DAY: number;
            ACTIVE_HOUR_START: number;
            ACTIVE_HOUR_END: number;
            COOLDOWN_MULTIPLIER: number;
        };
        success: boolean;
    };
}
