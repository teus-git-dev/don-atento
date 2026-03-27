import { PrismaService } from '../prisma/prisma.service';
export declare class BrandBrainService {
    private prisma;
    private readonly storagePath;
    constructor(prisma: PrismaService);
    getBrandTone(tenantId: string): Promise<{
        tone: string;
        description: string;
        policies: string | null;
        faq: import("@prisma/client/runtime/client").JsonValue;
        alignmentScore: number;
        style: string;
    } | {
        tone: string;
        description: string;
        alignmentScore: number;
        style: string;
        policies?: undefined;
        faq?: undefined;
    }>;
    getToneAlignmentScore(message: string, tenantId: string): Promise<{
        score: number;
        feedback: string;
    }>;
    updateBrain(tenantId: string, data: {
        tone?: string;
        policies?: string;
        faq?: any;
        responseRules?: string;
    }): Promise<{
        id: string;
        tenantId: string;
        updatedAt: Date;
        tone: string;
        policies: string | null;
        faq: import("@prisma/client/runtime/client").JsonValue | null;
        responseRules: string | null;
    }>;
    uploadBrandDocument(tenantId: string, fileName: string, content: Buffer): Promise<{
        success: boolean;
        path: string;
    }>;
    recordContractKnowledge(tenantId: string, summary: string): Promise<{
        id: string;
        tenantId: string;
        updatedAt: Date;
        tone: string;
        policies: string | null;
        faq: import("@prisma/client/runtime/client").JsonValue | null;
        responseRules: string | null;
    }>;
}
