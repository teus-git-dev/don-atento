import { InventoryTemplatesService } from './inventory-templates.service';
import { CreateInventoryTemplateDto } from './dto/create-inventory-template.dto';
export declare class InventoryTemplatesController {
    private readonly service;
    constructor(service: InventoryTemplatesService);
    create(dto: CreateInventoryTemplateDto): Promise<{
        items: {
            id: string;
            name: string;
            description: string | null;
            category: import(".prisma/client").$Enums.InventoryCategory;
            material: string | null;
            zoneId: string | null;
            templateId: string | null;
        }[];
        zones: ({
            templateItems: {
                id: string;
                name: string;
                description: string | null;
                category: import(".prisma/client").$Enums.InventoryCategory;
                material: string | null;
                zoneId: string | null;
                templateId: string | null;
            }[];
        } & {
            id: string;
            name: string;
            type: import(".prisma/client").$Enums.ZoneType;
            propertyId: string | null;
            templateId: string | null;
        })[];
    } & {
        id: string;
        name: string;
        description: string | null;
        status: import(".prisma/client").$Enums.TemplateStatus;
        createdAt: Date;
        tenantId: string;
    }>;
    findAll(tenantId: string): Promise<({
        items: {
            id: string;
            name: string;
            description: string | null;
            category: import(".prisma/client").$Enums.InventoryCategory;
            material: string | null;
            zoneId: string | null;
            templateId: string | null;
        }[];
        zones: ({
            templateItems: {
                id: string;
                name: string;
                description: string | null;
                category: import(".prisma/client").$Enums.InventoryCategory;
                material: string | null;
                zoneId: string | null;
                templateId: string | null;
            }[];
        } & {
            id: string;
            name: string;
            type: import(".prisma/client").$Enums.ZoneType;
            propertyId: string | null;
            templateId: string | null;
        })[];
    } & {
        id: string;
        name: string;
        description: string | null;
        status: import(".prisma/client").$Enums.TemplateStatus;
        createdAt: Date;
        tenantId: string;
    })[]>;
    findOne(id: string): Promise<({
        items: {
            id: string;
            name: string;
            description: string | null;
            category: import(".prisma/client").$Enums.InventoryCategory;
            material: string | null;
            zoneId: string | null;
            templateId: string | null;
        }[];
        zones: ({
            templateItems: {
                id: string;
                name: string;
                description: string | null;
                category: import(".prisma/client").$Enums.InventoryCategory;
                material: string | null;
                zoneId: string | null;
                templateId: string | null;
            }[];
        } & {
            id: string;
            name: string;
            type: import(".prisma/client").$Enums.ZoneType;
            propertyId: string | null;
            templateId: string | null;
        })[];
    } & {
        id: string;
        name: string;
        description: string | null;
        status: import(".prisma/client").$Enums.TemplateStatus;
        createdAt: Date;
        tenantId: string;
    }) | null>;
    update(id: string, data: any): Promise<{
        id: string;
        name: string;
        description: string | null;
        status: import(".prisma/client").$Enums.TemplateStatus;
        createdAt: Date;
        tenantId: string;
    }>;
    toggleStatus(id: string): Promise<{
        id: string;
        name: string;
        description: string | null;
        status: import(".prisma/client").$Enums.TemplateStatus;
        createdAt: Date;
        tenantId: string;
    }>;
    remove(id: string): Promise<{
        id: string;
        name: string;
        description: string | null;
        status: import(".prisma/client").$Enums.TemplateStatus;
        createdAt: Date;
        tenantId: string;
    }>;
}
