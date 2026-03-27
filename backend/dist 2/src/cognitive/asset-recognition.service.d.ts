import { PrismaService } from '../prisma/prisma.service';
export declare class AssetRecognitionService {
    private prisma;
    constructor(prisma: PrismaService);
    recognizeAssetsFromImage(imageUrl: string): Promise<any[]>;
    autoPopulateInventory(propertyId: string, imageUrl: string): Promise<{
        message: string;
        items: {
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
        }[];
    }>;
}
