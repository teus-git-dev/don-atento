import { InventoryCategory } from '@prisma/client';
declare class CreateInventoryTemplateItemDto {
    name: string;
    category: InventoryCategory;
    material?: string;
    description?: string;
}
export declare class CreateInventoryTemplateDto {
    tenantId: string;
    name: string;
    description?: string;
    items: CreateInventoryTemplateItemDto[];
}
export {};
