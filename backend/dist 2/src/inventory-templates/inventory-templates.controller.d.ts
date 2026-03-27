import { InventoryTemplatesService } from './inventory-templates.service';
import { CreateInventoryTemplateDto } from './dto/create-inventory-template.dto';
export declare class InventoryTemplatesController {
    private readonly service;
    constructor(service: InventoryTemplatesService);
    create(dto: CreateInventoryTemplateDto): Promise<{
        zones: ({
            templateItems: {
                id: string;
                name: string;
                description: string | null;
                category: import("@prisma/client").$Enums.InventoryCategory;
                material: string | null;
                zoneId: string | null;
                templateId: string | null;
            }[];
        } & {
            id: string;
            name: string;
            propertyId: string | null;
            type: import("@prisma/client").$Enums.ZoneType;
            templateId: string | null;
        })[];
    } & {
        id: string;
        name: string;
        status: import("@prisma/client").$Enums.TemplateStatus;
        createdAt: Date;
        tenantId: string;
        description: string | null;
    }>;
    findAll(tenantId: string): Promise<({
        zones: ({
            templateItems: {
                id: string;
                name: string;
                description: string | null;
                category: import("@prisma/client").$Enums.InventoryCategory;
                material: string | null;
                zoneId: string | null;
                templateId: string | null;
            }[];
        } & {
            id: string;
            name: string;
            propertyId: string | null;
            type: import("@prisma/client").$Enums.ZoneType;
            templateId: string | null;
        })[];
    } & {
        id: string;
        name: string;
        status: import("@prisma/client").$Enums.TemplateStatus;
        createdAt: Date;
        tenantId: string;
        description: string | null;
    })[]>;
    findOne(id: string): Promise<({
        zones: ({
            templateItems: {
                id: string;
                name: string;
                description: string | null;
                category: import("@prisma/client").$Enums.InventoryCategory;
                material: string | null;
                zoneId: string | null;
                templateId: string | null;
            }[];
        } & {
            id: string;
            name: string;
            propertyId: string | null;
            type: import("@prisma/client").$Enums.ZoneType;
            templateId: string | null;
        })[];
    } & {
        id: string;
        name: string;
        status: import("@prisma/client").$Enums.TemplateStatus;
        createdAt: Date;
        tenantId: string;
        description: string | null;
    }) | null>;
    update(id: string, data: any): Promise<{
        id: string;
        name: string;
        status: import("@prisma/client").$Enums.TemplateStatus;
        createdAt: Date;
        tenantId: string;
        description: string | null;
    }>;
    toggleStatus(id: string): Promise<{
        id: string;
        name: string;
        status: import("@prisma/client").$Enums.TemplateStatus;
        createdAt: Date;
        tenantId: string;
        description: string | null;
    }>;
    remove(id: string): Promise<{
        id: string;
        name: string;
        status: import("@prisma/client").$Enums.TemplateStatus;
        createdAt: Date;
        tenantId: string;
        description: string | null;
    }>;
}
