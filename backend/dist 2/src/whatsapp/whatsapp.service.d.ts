import { HttpService } from '@nestjs/axios';
import { TicketsService } from '../tickets/tickets.service';
import { PrismaService } from '../prisma/prisma.service';
import { CognitiveService } from '../cognitive/cognitive.service';
import { CrmService } from '../crm/crm.service';
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
    constructor(httpService: HttpService, ticketsService: TicketsService, prisma: PrismaService, cognitiveService: CognitiveService, crmService: CrmService);
    detectIntent(input: string): Intent;
    processIncomingMessage(from: string, text: string, mediaUrl?: string): Promise<void>;
    sendMessage(to: string, text: string): Promise<void>;
}
