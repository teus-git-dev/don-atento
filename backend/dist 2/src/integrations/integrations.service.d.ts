import { PrismaService } from '../prisma/prisma.service';
import { PropertiesService } from '../properties/properties.service';
export declare class IntegrationsService {
    private prisma;
    private propertiesService;
    private readonly logger;
    constructor(prisma: PrismaService, propertiesService: PropertiesService);
    handleFincaRaizWebhook(tenantId: string, data: any): Promise<{
        status: string;
        type: string;
        id: string;
    }>;
    private handleNewListing;
    private handleNewLead;
    private mapPropertyType;
}
