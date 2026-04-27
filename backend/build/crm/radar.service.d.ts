import { AiChatService } from '../cognitive/ai-chat.service';
export interface RadarLead {
    id: string;
    propertyTitle: string;
    ownerName: string;
    phone: string;
    portal: string;
    price: string;
    location: string;
    captureScore: number;
    aiScript: string;
    imageUrl: string;
    url: string;
}
export declare class RadarService {
    private aiChat;
    constructor(aiChat: AiChatService);
    scanPortals(tenantId: string, userId: string): Promise<RadarLead[]>;
}
