import { TicketPriority, TicketSeverity } from '@prisma/client';
export declare class CreateTicketDto {
    tenantId: string;
    propertyId: string;
    reportedByUserId: string;
    workflowId?: string;
    title: string;
    description: string;
    priority?: TicketPriority;
    severity?: TicketSeverity;
    reportedByUserPhone?: string;
    assignedTechnicianId?: string;
    attachments?: any;
}
