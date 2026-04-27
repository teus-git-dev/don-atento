import { PrismaService } from '../prisma/prisma.service';
import { InventoryReportService } from './inventory-report.service';
import { TicketsService } from '../tickets/tickets.service';
import { InventoryTemplatesService } from '../inventory-templates/inventory-templates.service';
export declare class InventoryMasterService {
    private prisma;
    private inventoryReport;
    private ticketsService;
    private templatesService;
    constructor(prisma: PrismaService, inventoryReport: InventoryReportService, ticketsService: TicketsService, templatesService: InventoryTemplatesService);
    createPropertyInventory(propertyId: string, data: any): Promise<{
        zones: any[];
        propertyId: string;
    }>;
    getPropertyInventory(propertyId: string): Promise<({
        meterReadings: {
            id: string;
            photoUrl: string | null;
            propertyId: string;
            type: import(".prisma/client").$Enums.MeterType;
            value: string;
            readingDate: Date;
        }[];
        accessItems: {
            id: string;
            photoUrl: string | null;
            propertyId: string;
            description: string;
            type: import(".prisma/client").$Enums.AccessType;
            quantity: number;
        }[];
        zones: ({
            items: ({
                evidences: {
                    id: string;
                    inventoryItemId: string;
                    url: string;
                    evidenceType: import(".prisma/client").$Enums.EvidenceType;
                    aiAnalysisStatus: import(".prisma/client").$Enums.AIAnalysisStatus;
                    aiComparisonResult: import(".prisma/client").$Enums.AIComparisonResult | null;
                    captureDate: Date;
                }[];
            } & {
                comments: string | null;
                id: string;
                createdAt: Date;
                name: string;
                propertyId: string;
                description: string | null;
                model: string | null;
                zoneId: string | null;
                category: import(".prisma/client").$Enums.InventoryCategory;
                condition: import(".prisma/client").$Enums.InventoryCondition;
                brand: string | null;
                serialNumber: string | null;
                material: string | null;
                isFunctional: boolean;
                technicalDetails: import("@prisma/client/runtime/client").JsonValue | null;
                expectedLifespanMonths: number | null;
                lastInspectionDate: Date | null;
                quantity: number;
            })[];
        } & {
            id: string;
            name: string;
            propertyId: string | null;
            type: import(".prisma/client").$Enums.ZoneType;
            templateId: string | null;
        })[];
    } & {
        id: string;
        tenantId: string;
        isActive: boolean;
        createdAt: Date;
        status: import(".prisma/client").$Enums.PropertyStatus;
        insuranceCompany: string | null;
        parentPropertyId: string | null;
        propertyType: import(".prisma/client").$Enums.PropertyType;
        title: string;
        description: string | null;
        address: string;
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
        splatUrl: string | null;
        attachments: import("@prisma/client/runtime/client").JsonValue | null;
        accessToken: string | null;
        workflowId: string | null;
        managementEmail: string | null;
        managementPhone: string | null;
        visionAnalysis: import("@prisma/client/runtime/client").JsonValue | null;
        admonEmail: string | null;
        admonName: string | null;
        admonPhone: string | null;
        admonPorteria: string | null;
        visionVideoUrl: import("@prisma/client/runtime/client").JsonValue | null;
    }) | null>;
    addEvidence(itemId: string, evidenceData: any): Promise<{
        id: string;
        inventoryItemId: string;
        url: string;
        evidenceType: import(".prisma/client").$Enums.EvidenceType;
        aiAnalysisStatus: import(".prisma/client").$Enums.AIAnalysisStatus;
        aiComparisonResult: import(".prisma/client").$Enums.AIComparisonResult | null;
        captureDate: Date;
    }>;
    instantiateFromTemplate(propertyId: string, templateId: string): Promise<{
        zones: ({
            items: {
                comments: string | null;
                id: string;
                createdAt: Date;
                name: string;
                propertyId: string;
                description: string | null;
                model: string | null;
                zoneId: string | null;
                category: import(".prisma/client").$Enums.InventoryCategory;
                condition: import(".prisma/client").$Enums.InventoryCondition;
                brand: string | null;
                serialNumber: string | null;
                material: string | null;
                isFunctional: boolean;
                technicalDetails: import("@prisma/client/runtime/client").JsonValue | null;
                expectedLifespanMonths: number | null;
                lastInspectionDate: Date | null;
                quantity: number;
            }[];
        } & {
            id: string;
            name: string;
            propertyId: string | null;
            type: import(".prisma/client").$Enums.ZoneType;
            templateId: string | null;
        })[];
        propertyId: string;
    }>;
    createHandover(propertyId: string, type: 'DELIVERY' | 'RETURN' | 'ASSIGNMENT', handoverData: any): Promise<{
        propertyId: string;
        type: "DELIVERY" | "RETURN" | "ASSIGNMENT";
        updates: any[];
    }>;
}
