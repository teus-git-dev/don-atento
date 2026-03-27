import { InventoryMasterService } from './inventory-master.service';
export declare class InventoryMasterController {
    private readonly inventoryMasterService;
    constructor(inventoryMasterService: InventoryMasterService);
    createInventory(propertyId: string, data: any): Promise<{
        zones: any[];
        propertyId: string;
    }>;
    getInventory(propertyId: string): Promise<({
        zones: ({
            items: ({
                evidences: {
                    id: string;
                    url: string;
                    inventoryItemId: string;
                    evidenceType: import("@prisma/client").$Enums.EvidenceType;
                    aiAnalysisStatus: import("@prisma/client").$Enums.AIAnalysisStatus;
                    aiComparisonResult: import("@prisma/client").$Enums.AIComparisonResult | null;
                    captureDate: Date;
                }[];
            } & {
                comments: string | null;
                id: string;
                name: string;
                createdAt: Date;
                description: string | null;
                category: import("@prisma/client").$Enums.InventoryCategory;
                material: string | null;
                zoneId: string | null;
                propertyId: string;
                model: string | null;
                condition: import("@prisma/client").$Enums.InventoryCondition;
                brand: string | null;
                serialNumber: string | null;
                quantity: number;
                isFunctional: boolean;
                technicalDetails: import("@prisma/client/runtime/client").JsonValue | null;
                expectedLifespanMonths: number | null;
                lastInspectionDate: Date | null;
            })[];
        } & {
            id: string;
            name: string;
            propertyId: string | null;
            type: import("@prisma/client").$Enums.ZoneType;
            templateId: string | null;
        })[];
        meterReadings: {
            id: string;
            photoUrl: string | null;
            propertyId: string;
            type: import("@prisma/client").$Enums.MeterType;
            value: string;
            readingDate: Date;
        }[];
        accessItems: {
            id: string;
            photoUrl: string | null;
            description: string;
            propertyId: string;
            type: import("@prisma/client").$Enums.AccessType;
            quantity: number;
        }[];
    } & {
        id: string;
        status: import("@prisma/client").$Enums.PropertyStatus;
        createdAt: Date;
        isActive: boolean;
        tenantId: string;
        description: string | null;
        address: string;
        propertyType: import("@prisma/client").$Enums.PropertyType;
        title: string;
        city: string;
        department: string;
        country: string;
        latitude: number | null;
        longitude: number | null;
        areaM2: number | null;
        rooms: number | null;
        bathrooms: number | null;
        propertyCode: string | null;
        isVip: boolean;
        rentAmount: import("@prisma/client-runtime-utils").Decimal | null;
        adminAmount: import("@prisma/client-runtime-utils").Decimal | null;
        taxAmount: import("@prisma/client-runtime-utils").Decimal | null;
        managementName: string | null;
        managementNit: string | null;
        insuranceCompany: string | null;
        splatUrl: string | null;
        attachments: import("@prisma/client/runtime/client").JsonValue | null;
        accessToken: string | null;
        managementEmail: string | null;
        managementPhone: string | null;
        visionAnalysis: import("@prisma/client/runtime/client").JsonValue | null;
        visionVideoUrl: string | null;
        parentPropertyId: string | null;
        workflowId: string | null;
    }) | null>;
    addEvidence(itemId: string, evidenceData: any): Promise<{
        id: string;
        url: string;
        inventoryItemId: string;
        evidenceType: import("@prisma/client").$Enums.EvidenceType;
        aiAnalysisStatus: import("@prisma/client").$Enums.AIAnalysisStatus;
        aiComparisonResult: import("@prisma/client").$Enums.AIComparisonResult | null;
        captureDate: Date;
    }>;
    uploadFile(file: any): {
        url: string;
    };
}
