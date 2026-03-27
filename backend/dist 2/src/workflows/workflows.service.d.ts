import { PrismaService } from '../prisma/prisma.service';
export declare class WorkflowsService {
    private prisma;
    constructor(prisma: PrismaService);
    findAllByTenant(tenantId: string): Promise<({
        states: ({
            responsible: {
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
            } | null;
        } & {
            id: string;
            name: string;
            order: number;
            assignedRole: import("@prisma/client").$Enums.UserRole | null;
            slaHours: number | null;
            color: string | null;
            assignedUserId: string | null;
            workflowId: string;
        })[];
    } & {
        id: string;
        name: string;
        createdAt: Date;
        tenantId: string;
        description: string | null;
    })[]>;
    create(data: {
        tenantId: string;
        name: string;
        description?: string;
    }): Promise<{
        id: string;
        name: string;
        createdAt: Date;
        tenantId: string;
        description: string | null;
    }>;
    createState(data: {
        workflowId: string;
        name: string;
        order: number;
        assignedRole?: any;
        assignedUserId?: string;
        slaHours?: number;
        color?: string;
    }): Promise<{
        id: string;
        name: string;
        order: number;
        assignedRole: import("@prisma/client").$Enums.UserRole | null;
        slaHours: number | null;
        color: string | null;
        assignedUserId: string | null;
        workflowId: string;
    }>;
    getInitialState(workflowId: string): Promise<{
        id: string;
        name: string;
        order: number;
        assignedRole: import("@prisma/client").$Enums.UserRole | null;
        slaHours: number | null;
        color: string | null;
        assignedUserId: string | null;
        workflowId: string;
    } | null>;
}
