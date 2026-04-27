import { HttpService } from '@nestjs/axios';
import { TicketsService } from '../tickets/tickets.service';
import { PrismaService } from '../prisma/prisma.service';
import { CognitiveService } from '../cognitive/cognitive.service';
import { CrmService } from '../crm/crm.service';
import { BaileysManager } from './baileys.manager';
export declare enum Intent {
    GREETING = "GREETING",
    MAINTENANCE_REQUEST = "MAINTENANCE_REQUEST",
    PHOTO_SUBMISSION = "PHOTO_SUBMISSION",
    CONFIRMATION = "CONFIRMATION",
    GOODBYE = "GOODBYE",
    STATUS_QUERY = "STATUS_QUERY",
    SURVEY_RESPONSE = "SURVEY_RESPONSE",
    UNKNOWN = "UNKNOWN"
}
export declare class WhatsappService {
    private readonly httpService;
    private readonly ticketsService;
    private readonly prisma;
    private readonly cognitiveService;
    private readonly crmService;
    private readonly baileysManager;
    private readonly logger;
    private conversationState;
    constructor(httpService: HttpService, ticketsService: TicketsService, prisma: PrismaService, cognitiveService: CognitiveService, crmService: CrmService, baileysManager: BaileysManager);
    detectIntent(input: string): Intent;
    processIncomingMessage(from: string, text: string, mediaUrl?: string, phoneNumberId?: string, receivedOnTenantId?: string): Promise<void>;
    sendMessage(to: string, text: string, tenantId?: string): Promise<void>;
}
