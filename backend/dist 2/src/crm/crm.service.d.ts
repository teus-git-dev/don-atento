import { PrismaService } from '../prisma/prisma.service';
import { ProspectSource } from '@prisma/client';
import { BrandBrainService } from '../cognitive/brand-brain.service';
export declare class CrmService {
    private prisma;
    private brandBrain;
    constructor(prisma: PrismaService, brandBrain: BrandBrainService);
    createProspect(data: {
        tenantId: string;
        firstName: string;
        lastName?: string;
        email?: string;
        phone?: string;
        whatsappId?: string;
        source?: ProspectSource;
        assignedAgentId?: string;
        initialMessage?: string;
    }): Promise<{
        id: string;
        status: import("@prisma/client").$Enums.ProspectStatus;
        createdAt: Date;
        email: string | null;
        firstName: string;
        lastName: string | null;
        phone: string | null;
        whatsappId: string | null;
        tenantId: string;
        updatedAt: Date;
        sentiment: import("@prisma/client").$Enums.SentimentAnalysis;
        source: import("@prisma/client").$Enums.ProspectSource;
        assignedAgentId: string | null;
    }>;
    findAll(tenantId: string): Promise<({
        interactions: {
            id: string;
            createdAt: Date;
            userId: string | null;
            sentiment: import("@prisma/client").$Enums.SentimentAnalysis | null;
            channel: import("@prisma/client").$Enums.InteractionChannel;
            message: string;
            prospectId: string;
        }[];
        assignedAgent: {
            id: string;
            email: string;
            firstName: string;
            lastName: string;
        } | null;
        tasks: {
            id: string;
            createdAt: Date;
            description: string | null;
            updatedAt: Date;
            title: string;
            dueDate: Date | null;
            isCompleted: boolean;
            prospectId: string;
        }[];
    } & {
        id: string;
        status: import("@prisma/client").$Enums.ProspectStatus;
        createdAt: Date;
        email: string | null;
        firstName: string;
        lastName: string | null;
        phone: string | null;
        whatsappId: string | null;
        tenantId: string;
        updatedAt: Date;
        sentiment: import("@prisma/client").$Enums.SentimentAnalysis;
        source: import("@prisma/client").$Enums.ProspectSource;
        assignedAgentId: string | null;
    })[]>;
    createTask(prospectId: string, data: {
        title: string;
        description?: string;
        dueDate?: Date;
    }): Promise<{
        id: string;
        createdAt: Date;
        description: string | null;
        updatedAt: Date;
        title: string;
        dueDate: Date | null;
        isCompleted: boolean;
        prospectId: string;
    }>;
    updateTask(taskId: string, data: {
        title?: string;
        description?: string;
        dueDate?: Date;
        isCompleted?: boolean;
    }): Promise<{
        id: string;
        createdAt: Date;
        description: string | null;
        updatedAt: Date;
        title: string;
        dueDate: Date | null;
        isCompleted: boolean;
        prospectId: string;
    }>;
    deleteTask(taskId: string): Promise<{
        id: string;
        createdAt: Date;
        description: string | null;
        updatedAt: Date;
        title: string;
        dueDate: Date | null;
        isCompleted: boolean;
        prospectId: string;
    }>;
    updateProspect(id: string, data: any): Promise<{
        id: string;
        status: import("@prisma/client").$Enums.ProspectStatus;
        createdAt: Date;
        email: string | null;
        firstName: string;
        lastName: string | null;
        phone: string | null;
        whatsappId: string | null;
        tenantId: string;
        updatedAt: Date;
        sentiment: import("@prisma/client").$Enums.SentimentAnalysis;
        source: import("@prisma/client").$Enums.ProspectSource;
        assignedAgentId: string | null;
    }>;
    scoreLead(prospectId: string): Promise<{
        prospectId: string;
        urgencyScore: number;
        qualityLabel: string;
        nextAction: string;
    } | null>;
    addInteraction(prospectId: string, message: string, channel: any): Promise<{
        id: string;
        createdAt: Date;
        userId: string | null;
        sentiment: import("@prisma/client").$Enums.SentimentAnalysis | null;
        channel: import("@prisma/client").$Enums.InteractionChannel;
        message: string;
        prospectId: string;
    }>;
    getFunnel(tenantId: string): Promise<{
        status: import("@prisma/client").$Enums.ProspectStatus;
        count: number;
    }[]>;
    getSentimentMetrics(tenantId: string): Promise<{
        sentiment: import("@prisma/client").$Enums.SentimentAnalysis;
        count: number;
    }[]>;
    convertToClient(prospectId: string, tenantId: string): Promise<{
        id: string;
        createdAt: Date;
        email: string;
        passwordHash: string;
        firstName: string;
        lastName: string;
        governmentId: string | null;
        role: import("@prisma/client").$Enums.UserRole;
        phone: string | null;
        whatsappId: string | null;
        photoUrl: string | null;
        isActive: boolean;
        additionalContacts: string | null;
        personType: string | null;
        isTaxDeclarant: boolean;
        regimeType: string | null;
        applyReteIva: boolean;
        applyReteFuente: boolean;
        applyReteIca: boolean;
        bankName: string | null;
        accountNumber: string | null;
        accountType: string | null;
        tenantId: string | null;
        roleId: string | null;
        providerId: string | null;
    }>;
}
