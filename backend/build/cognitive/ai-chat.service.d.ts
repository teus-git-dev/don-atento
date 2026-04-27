import { PrismaService } from '../prisma/prisma.service';
import { BrandBrainService } from './brand-brain.service';
export declare class AiChatService {
    private prisma;
    private brandBrain;
    constructor(prisma: PrismaService, brandBrain: BrandBrainService);
    processChat(tenantId: string, userId: string, message: string, history?: any[]): Promise<{
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
    }>;
    private fallbackSimulation;
}
