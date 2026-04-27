import { PrismaService } from '../prisma/prisma.service';
export declare class WorkflowsService {
    private prisma;
    constructor(prisma: PrismaService);
    findAllByTenant(tenantId: string): Promise<({
        states: ({
            responsible: {
                id: string;
                tenantId: string | null;
                createdAt: Date;
                email: string;
                passwordHash: string;
                firstName: string;
                lastName: string;
                governmentId: string | null;
                role: import(".prisma/client").$Enums.UserRole;
                roleId: string | null;
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
                providerId: string | null;
                accountType: string | null;
            } | null;
        } & {
            id: string;
            name: string;
            order: number;
            workflowId: string;
            assignedRole: import(".prisma/client").$Enums.UserRole | null;
            slaHours: number | null;
            color: string | null;
            aiInstructions: string | null;
            assignedUserId: string | null;
        })[];
    } & {
        id: string;
        tenantId: string;
        name: string;
        description: string | null;
        createdAt: Date;
    })[]>;
    create(data: {
        tenantId: string;
        name: string;
        description?: string;
        states?: any[];
    }): Promise<{
        states: {
            id: string;
            name: string;
            order: number;
            workflowId: string;
            assignedRole: import(".prisma/client").$Enums.UserRole | null;
            slaHours: number | null;
            color: string | null;
            aiInstructions: string | null;
            assignedUserId: string | null;
        }[];
    } & {
        id: string;
        tenantId: string;
        name: string;
        description: string | null;
        createdAt: Date;
    }>;
    createState(data: {
        workflowId: string;
        name: string;
        order: number;
        assignedRole?: any;
        assignedUserId?: string;
        aiInstructions?: string;
        slaHours?: number;
        color?: string;
    }): Promise<{
        id: string;
        name: string;
        order: number;
        workflowId: string;
        assignedRole: import(".prisma/client").$Enums.UserRole | null;
        slaHours: number | null;
        color: string | null;
        aiInstructions: string | null;
        assignedUserId: string | null;
    }>;
    getInitialState(workflowId: string): Promise<{
        id: string;
        name: string;
        order: number;
        workflowId: string;
        assignedRole: import(".prisma/client").$Enums.UserRole | null;
        slaHours: number | null;
        color: string | null;
        aiInstructions: string | null;
        assignedUserId: string | null;
    } | null>;
    update(id: string, data: {
        name?: string;
        description?: string;
    }): Promise<{
        id: string;
        tenantId: string;
        name: string;
        description: string | null;
        createdAt: Date;
    }>;
    deleteStatesByWorkflow(workflowId: string): Promise<import(".prisma/client").Prisma.BatchPayload>;
    delete(id: string): Promise<{
        id: string;
        tenantId: string;
        name: string;
        description: string | null;
        createdAt: Date;
    }>;
}
