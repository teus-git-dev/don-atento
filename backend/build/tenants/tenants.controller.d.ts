import { PrismaService } from '../prisma/prisma.service';
export declare class TenantsController {
    private readonly prisma;
    constructor(prisma: PrismaService);
    getMyTenant(req: any): Promise<{
        id: string | undefined;
        name: string | undefined;
        whatsappPhoneNumberId: string | null;
        whatsappProvider: string;
        whatsappConfigured: boolean;
        whatsappAccessTokenMasked: string | null;
    }>;
    saveWhatsappConfig(req: any, body: {
        whatsappPhoneNumberId: string;
        whatsappAccessToken: string;
    }): Promise<{
        success: boolean;
        message: string;
    }>;
    disconnectWhatsapp(req: any): Promise<{
        success: boolean;
        message: string;
    }>;
}
