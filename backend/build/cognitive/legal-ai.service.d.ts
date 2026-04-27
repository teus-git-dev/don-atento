import { PrismaService } from '../prisma/prisma.service';
export declare class LegalAiService {
    private prisma;
    constructor(prisma: PrismaService);
    generateContractDraft(contractRequestId: string): Promise<{
        id: string;
        tenantId: string;
        createdAt: Date;
        status: import(".prisma/client").$Enums.ContractStatus;
        propertyId: string;
        updatedAt: Date;
        prospectId: string;
        formData: import("@prisma/client/runtime/client").JsonValue | null;
        aiDraft: string | null;
        rejectionReason: string | null;
        approvedByUserId: string | null;
    }>;
}
