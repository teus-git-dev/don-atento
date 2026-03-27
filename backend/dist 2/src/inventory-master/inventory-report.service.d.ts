import { PrismaService } from '../prisma/prisma.service';
import { WhatsappService } from '../whatsapp/whatsapp.service';
export declare class InventoryReportService {
    private prisma;
    private whatsapp;
    constructor(prisma: PrismaService, whatsapp: WhatsappService);
    generateInventoryPDF(propertyId: string): Promise<Buffer>;
    sendInventoryReport(propertyId: string, type: 'CHECK_IN' | 'CHECK_OUT'): Promise<void>;
}
