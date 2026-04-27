import { WhatsappService } from './whatsapp.service';
export declare class WhatsappController {
    private readonly whatsappService;
    constructor(whatsappService: WhatsappService);
    verifyWebhook(mode: string, token: string, challenge: string): string;
    handleIncomingMessage(body: any): Promise<"EVENT_RECEIVED" | "NOT_A_WHATSAPP_EVENT">;
}
