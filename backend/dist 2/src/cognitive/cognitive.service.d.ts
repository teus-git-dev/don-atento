import { PrismaService } from '../prisma/prisma.service';
import { SentimentAnalysis, InteractionChannel } from '@prisma/client';
import { BrandBrainService } from './brand-brain.service';
import { AiChatService } from './ai-chat.service';
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
        userId: string | null;
        ticketId: string;
        channel: import("@prisma/client").$Enums.InteractionChannel;
        message: string;
        sentimentAnalysis: import("@prisma/client").$Enums.SentimentAnalysis | null;
        sentAt: Date;
    }>;
    getPropertyCognitiveSummary(propertyId: string): Promise<{
        interactions: ({
            user: {
                firstName: string;
                lastName: string;
                role: import("@prisma/client").$Enums.UserRole;
            } | null;
        } & {
            id: string;
            userId: string | null;
            ticketId: string;
            channel: import("@prisma/client").$Enums.InteractionChannel;
            message: string;
            sentimentAnalysis: import("@prisma/client").$Enums.SentimentAnalysis | null;
            sentAt: Date;
        })[];
        summary: {
            totalInteractions: number;
            negativeCount: number;
            positiveCount: number;
            overallHealth: "CRITICAL" | "HEALTHY" | "WARNING";
        };
    }>;
    validateEvidence(fileName: string, fileType: string): Promise<{
        verdict: string;
        confidence: number;
        timestamp: string;
    }>;
    extractContractData(fileName: string, fileType: string, tenantId: string): Promise<{
        success: boolean;
        error: string;
        expertIdentity?: undefined;
        data?: undefined;
        validation?: undefined;
    } | {
        success: boolean;
        expertIdentity: string;
        data: {
            tenantName: string;
            tenantLastName: string;
            tenantId: string;
            tenantPhone: string;
            tenantEmail: string;
            rentAmount: number;
            adminAmount: number;
            startDate: string;
            endDate: string;
            propertyAddress: string;
            agencyName: string;
            agencyNit: string;
        };
        validation: {
            legalPersona: string;
            findings: string[];
            warnings: string[];
        };
        error?: undefined;
    }>;
    validateLegalCompliance(fileName: string): Promise<{
        legalPersona: string;
        findings: string[];
        warnings: string[];
    }>;
    analyzePropertyVision(fileName: string, fileType: string): Promise<{
        success: boolean;
        splatUrl: string;
        analysis: {
            repairs: {
                id: number;
                area: string;
                issue: string;
                severity: string;
            }[];
            overallHealth: number;
            expertIdentity: string;
            recommendation: string;
        };
    }>;
}
