import { InvoicingService } from './invoicing.service';
export declare class InvoicingController {
    private readonly invoicingService;
    constructor(invoicingService: InvoicingService);
    getResolutions(tenantId: string): Promise<{
        id: string;
        tenantId: string;
        isActive: boolean;
        createdAt: Date;
        prefix: string;
        resolutionNumber: string;
        startNumber: number;
        endNumber: number;
        currentNumber: number;
        validFrom: Date;
        validTo: Date;
        technicalKey: string | null;
        softwareId: string | null;
        softwarePin: string | null;
    }[]>;
    createResolution(tenantId: string, body: any): Promise<{
        id: string;
        tenantId: string;
        isActive: boolean;
        createdAt: Date;
        prefix: string;
        resolutionNumber: string;
        startNumber: number;
        endNumber: number;
        currentNumber: number;
        validFrom: Date;
        validTo: Date;
        technicalKey: string | null;
        softwareId: string | null;
        softwarePin: string | null;
    }>;
    getBillingItems(tenantId: string): Promise<({
        account: {
            id: string;
            tenantId: string;
            isActive: boolean;
            createdAt: Date;
            name: string;
            updatedAt: Date;
            level: import(".prisma/client").$Enums.AccountLevel;
            code: string;
            nature: import(".prisma/client").$Enums.AccountNature;
            parentId: string | null;
        };
    } & {
        id: string;
        tenantId: string;
        isActive: boolean;
        createdAt: Date;
        name: string;
        code: string;
        accountId: string;
        basePrice: import("@prisma/client-runtime-utils").Decimal | null;
        taxRate: import("@prisma/client-runtime-utils").Decimal;
    })[]>;
    createBillingItem(tenantId: string, body: any): Promise<{
        id: string;
        tenantId: string;
        isActive: boolean;
        createdAt: Date;
        name: string;
        code: string;
        accountId: string;
        basePrice: import("@prisma/client-runtime-utils").Decimal | null;
        taxRate: import("@prisma/client-runtime-utils").Decimal;
    }>;
    disableBillingItem(tenantId: string, id: string): Promise<{
        id: string;
        tenantId: string;
        isActive: boolean;
        createdAt: Date;
        name: string;
        code: string;
        accountId: string;
        basePrice: import("@prisma/client-runtime-utils").Decimal | null;
        taxRate: import("@prisma/client-runtime-utils").Decimal;
    }>;
    emitInvoice(tenantId: string, body: any): Promise<{
        invoiceId: string;
        sequence: string;
        dianStatus: string;
        zipKey: null;
        message: string;
        xmlPreview: string;
    }>;
}
