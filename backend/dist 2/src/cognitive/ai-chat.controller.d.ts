import { AiChatService } from './ai-chat.service';
export declare class AiChatController {
    private readonly aiChatService;
    constructor(aiChatService: AiChatService);
    chat(tenantId: string, userId: string, message: string, history: any[]): Promise<{
        reply: string;
        contextUsed: any;
    } | {
        reply: any;
        contextUsed: {
            openTickets: number;
            totalProperties: number;
            providers: number;
            tone: any;
        };
    } | {
        error: string;
    }>;
}
