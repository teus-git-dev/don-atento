import { PrismaService } from '../prisma/prisma.service';
import { SentimentAnalysis, InteractionChannel } from '@prisma/client';
import { BrandBrainService } from './brand-brain.service';
import { AiChatService } from './ai-chat.service';
import { TicketPriority } from '@prisma/client';
export declare class CognitiveService {
    private prisma;
    private brandBrain;
    private aiChatService;
    constructor(prisma: PrismaService, brandBrain: BrandBrainService, aiChatService: AiChatService);
    generateAiChatResponse(tenantId: string, userId: string, message: string): Promise<{
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
    generateResponse(ticketId: string, message: string, from: string, tenantId: string): Promise<{
        shortResponse: string;
        longEmail: string;
        sentiment: SentimentAnalysis;
        alignment: {
            score: number;
            feedback: string;
        };
    }>;
    logInteraction(ticketId: string, userId: string | null, message: string, channel: InteractionChannel, sentiment?: SentimentAnalysis): Promise<{
        id: string;
        channel: import(".prisma/client").$Enums.InteractionChannel;
        message: string;
        sentimentAnalysis: import(".prisma/client").$Enums.SentimentAnalysis | null;
        sentAt: Date;
        ticketId: string;
        userId: string | null;
    }>;
    getPropertyCognitiveSummary(propertyId: string): Promise<{
        interactions: ({
            user: {
                role: import(".prisma/client").$Enums.UserRole;
                firstName: string;
                lastName: string;
            } | null;
        } & {
            id: string;
            channel: import(".prisma/client").$Enums.InteractionChannel;
            message: string;
            sentimentAnalysis: import(".prisma/client").$Enums.SentimentAnalysis | null;
            sentAt: Date;
            ticketId: string;
            userId: string | null;
        })[];
        summary: {
            totalInteractions: number;
            negativeCount: number;
            positiveCount: number;
            overallHealth: "CRITICAL" | "HEALTHY" | "WARNING";
        };
    }>;
    validateEvidence(fileName: string, fileType: string, description?: string): Promise<{
        verdict: string;
        confidence: number;
        isCoherent: boolean;
    }>;
    classifyPriority(title: string, description: string): Promise<{
        priority: TicketPriority;
        reason: string;
    }>;
    generateExecutiveQuotation(tenantId: string, items: {
        description: string;
        price: number;
        quantity: number;
    }[]): Promise<string>;
    generateQuotationDocx(tenantId: string, ticketId: string, items: {
        description: string;
        price: number;
        quantity: number;
    }[]): Promise<string>;
    generateQuotationPdf(tenantId: string, ticketId: string, items: {
        description: string;
        price: number;
        quantity: number;
    }[]): Promise<string>;
    processQuoteDocument(tenantId: string, attachmentUrl: string): Promise<string>;
}
