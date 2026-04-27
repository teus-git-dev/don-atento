import { PrismaService } from '../prisma/prisma.service';
import { DianXmlService } from './dian-xml.service';
import { DianCryptoService } from './dian-crypto.service';
import { DianSoapService } from './dian-soap.service';
import { Prisma } from '@prisma/client';
export declare class InvoicingService {
    private readonly prisma;
    private readonly dianXml;
    private readonly dianCrypto;
    private readonly dianSoap;
    constructor(prisma: PrismaService, dianXml: DianXmlService, dianCrypto: DianCryptoService, dianSoap: DianSoapService);
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
    createResolution(tenantId: string, data: any): Promise<{
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
        basePrice: Prisma.Decimal | null;
        taxRate: Prisma.Decimal;
    })[]>;
    createBillingItem(tenantId: string, data: any): Promise<{
        id: string;
        tenantId: string;
        isActive: boolean;
        createdAt: Date;
        name: string;
        code: string;
        accountId: string;
        basePrice: Prisma.Decimal | null;
        taxRate: Prisma.Decimal;
    }>;
    disableBillingItem(tenantId: string, id: string): Promise<{
        id: string;
        tenantId: string;
        isActive: boolean;
        createdAt: Date;
        name: string;
        code: string;
        accountId: string;
        basePrice: Prisma.Decimal | null;
        taxRate: Prisma.Decimal;
    }>;
    createDraftInvoice(tenantId: string, data: any): Promise<{
        invoiceId: string;
        sequence: string;
        dianStatus: string;
        zipKey: null;
        message: string;
        xmlPreview: string;
    }>;
}
