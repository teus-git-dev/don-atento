import { PrismaService } from '../prisma/prisma.service';
export declare class RolesService {
    private prisma;
    constructor(prisma: PrismaService);
    findAllByTenant(tenantId: string): Promise<({
        users: {
            role: import(".prisma/client").$Enums.UserRole;
            id: string;
            email: string;
            tenantId: string | null;
            passwordHash: string;
            firstName: string;
            lastName: string;
            governmentId: string | null;
            roleId: string | null;
            phone: string | null;
            whatsappId: string | null;
            photoUrl: string | null;
            isActive: boolean;
            createdAt: Date;
            additionalContacts: string | null;
            personType: string | null;
            isTaxDeclarant: boolean;
            regimeType: string | null;
            applyReteIva: boolean;
            applyReteFuente: boolean;
            applyReteIca: boolean;
            bankName: string | null;
            accountNumber: string | null;
            providerId: string | null;
            accountType: string | null;
        }[];
    } & {
        id: string;
        tenantId: string;
        createdAt: Date;
        name: string;
        description: string | null;
        permissions: import("@prisma/client/runtime/client").JsonValue | null;
    })[]>;
    create(data: {
        tenantId: string;
        name: string;
        description?: string;
        permissions: any;
    }): Promise<{
        id: string;
        tenantId: string;
        createdAt: Date;
        name: string;
        description: string | null;
        permissions: import("@prisma/client/runtime/client").JsonValue | null;
    }>;
    delete(id: string): Promise<{
        id: string;
        tenantId: string;
        createdAt: Date;
        name: string;
        description: string | null;
        permissions: import("@prisma/client/runtime/client").JsonValue | null;
    }>;
}
