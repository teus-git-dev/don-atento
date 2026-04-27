import { PropertyType } from '@prisma/client';
export declare class CreatePropertyDto {
    tenantId: string;
    propertyCode?: string;
    propertyType: PropertyType;
    title: string;
    description?: string;
    address: string;
    city: string;
    department: string;
    country: string;
    isVip?: boolean;
    parentPropertyId?: string;
    rentAmount?: number;
    adminAmount?: number;
    taxAmount?: number;
    managementName?: string;
    managementNit?: string;
    insuranceCompany?: string;
    splatUrl?: string;
    ownerInfo?: any;
    tenantInfo?: any;
    latitude?: number;
    longitude?: number;
}
