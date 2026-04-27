import { OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { BaileysAdapter } from './baileys.adapter';
import { AntiBanService } from './anti-ban.service';
import { WhatsappConnectionStatus } from './whatsapp-provider.interface';
export declare class BaileysManager implements OnModuleInit, OnModuleDestroy {
    private readonly prisma;
    private readonly antiBan;
    private readonly logger;
    private adapters;
    private readonly authBaseDir;
    private onMessageCallback;
    constructor(prisma: PrismaService, antiBan: AntiBanService);
    onModuleInit(): Promise<void>;
    setMessageHandler(handler: (tenantId: string, from: string, text: string, mediaType?: string) => Promise<void>): void;
    connectTenant(tenantId: string): Promise<{
        status: WhatsappConnectionStatus;
        qr?: string;
    }>;
    getAdapter(tenantId: string): BaileysAdapter | null;
    sendMessage(tenantId: string, to: string, text: string): Promise<boolean>;
    getConnectionStatus(tenantId: string): {
        status: WhatsappConnectionStatus;
        qr?: string;
        health?: any;
    };
    disconnectTenant(tenantId: string): Promise<void>;
    onModuleDestroy(): Promise<void>;
}
