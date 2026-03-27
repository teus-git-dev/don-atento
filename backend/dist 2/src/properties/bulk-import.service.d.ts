import { PropertiesService } from './properties.service';
import { PrismaService } from '../prisma/prisma.service';
export declare class BulkImportService {
    private readonly propertiesService;
    private readonly prisma;
    constructor(propertiesService: PropertiesService, prisma: PrismaService);
    processImport(tenantId: string, data: any[]): Promise<{
        total: number;
        imported: number;
        skipped: number;
        errors: string[];
    }>;
    private smartMap;
    private mapType;
}
