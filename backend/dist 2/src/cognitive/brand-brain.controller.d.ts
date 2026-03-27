import { BrandBrainService } from './brand-brain.service';
export declare class BrandBrainController {
    private readonly brandBrainService;
    constructor(brandBrainService: BrandBrainService);
    getBrain(tenantId: string): Promise<{
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
    updateBrain(tenantId: string, body: {
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
}
