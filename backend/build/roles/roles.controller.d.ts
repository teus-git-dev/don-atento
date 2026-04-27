import { RolesService } from './roles.service';
export declare class RolesController {
    private readonly rolesService;
    constructor(rolesService: RolesService);
    findAll(tenantId: string): Promise<({
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
    create(data: any): Promise<{
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
