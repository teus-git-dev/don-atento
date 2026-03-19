import { Injectable, Inject, forwardRef } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTicketDto } from './dto/create-ticket.dto';
import { Ticket, TicketPriority, RelationType } from '@prisma/client';
import { WhatsappService } from '../whatsapp/whatsapp.service';
import { EmailService } from '../cognitive/email.service';
import { CognitiveService } from '../cognitive/cognitive.service';
import { SlaMatrixService } from './sla-matrix.service';

@Injectable()
export class TicketsService {
  constructor(
    private prisma: PrismaService,
    @Inject(forwardRef(() => WhatsappService))
    private whatsappService: WhatsappService,
    private slaMatrix: SlaMatrixService,
    private emailService: EmailService,
    private cognitiveService: CognitiveService,
  ) {}

  async createTicket(data: CreateTicketDto): Promise<Ticket> {
    // 1. Initial State from Workflow (if provided)
    let initialStateId: string | undefined;
    if (data.workflowId) {
      const workflow = await this.prisma.workflow.findUnique({
        where: { id: data.workflowId },
        include: { states: { orderBy: { order: 'asc' }, take: 1 } },
      });
      if (workflow && workflow.states.length > 0) {
        initialStateId = workflow.states[0].id;
      }
    }

    // 2. Map DTO to Prisma data
    const ticket = await this.prisma.ticket.create({
      data: {
        tenantId: data.tenantId,
        propertyId: data.propertyId,
        reportedByUserId: data.reportedByUserId,
        workflowId: data.workflowId,
        currentStateId: initialStateId,
        reportedByUserPhone: data.reportedByUserPhone,
        assignedTechnicianId: data.assignedTechnicianId,
        priority: (data.priority as TicketPriority) || TicketPriority.MEDIUM,
        title: data.title,
        description: data.description,
      },
      include: {
        property: {
          include: {
            relations: {
              include: { user: true }
            }
          }
        },
        assignedTechnician: true,
        currentState: true,
        reportedByUser: true
      }
    });

    // 3. Calculate SLA (New Pillar)
    const dueDate = await this.slaMatrix.calculateDueDate(ticket.id);
    
    // 4. Automated Notifications (Phase 10)
    const ticketWithSla = { ...ticket, dueDate };
    this.sendTicketNotifications(ticketWithSla).catch(err => console.error("Notification Error:", err));

    return ticket;
  }

  private async sendTicketNotifications(ticket: any) {
    const property = ticket.property;
    const tenantRel = property.relations.find((r: any) => r.relationType === RelationType.TENANT);
    const ownerRel = property.relations.find((r: any) => r.relationType === RelationType.OWNER);

    const reporter = ticket.reportedByUser;
    const technician = ticket.assignedTechnician;

    // Omnichannel logic for WhatsApp (Short Response)
    const { shortResponse, longEmail } = await this.cognitiveService.generateResponse(
      ticket.id,
      ticket.description,
      reporter.phone || 'SYSTEM',
      ticket.tenantId
    );

    const messageToReporter = `Hola ${reporter.firstName}, ${shortResponse}`;
    
    // Notify Reporter (if WhatsApp available)
    if (reporter.phone) await this.whatsappService.sendMessage(reporter.phone, messageToReporter);

    // Notify Tenant (if different from reporter)
    if (tenantRel?.user?.phone && tenantRel.user.id !== reporter.id) {
        const messageToTenant = `Hola ${tenantRel.user.firstName}, se ha reportado una novedad en tu inmueble: "${ticket.title}". Estaremos informándote de los avances.`;
        await this.whatsappService.sendMessage(tenantRel.user.phone, messageToTenant);
    }

    // Notify Owner (Omnichannel: WhatsApp + Formal Email)
    if (ownerRel?.user?.phone) {
        const messageToOwner = `Don Atento Informa: Se ha generado un requerimiento de mantenimiento ("${ticket.title}") para su propiedad "${property.title}".`;
        await this.whatsappService.sendMessage(ownerRel.user.phone, messageToOwner);
    }

    if (ownerRel?.user?.email) {
        await this.emailService.sendFormalReport(
            ownerRel.user.email,
            property.title,
            longEmail
        );
    }
  }

  async findLatestByPhone(phone: string): Promise<Ticket | null> {
    return this.prisma.ticket.findFirst({
      where: { reportedByUserPhone: phone },
      orderBy: { createdAt: 'desc' },
      include: {
        currentState: true,
      }
    });
  }

  async updateStatus(id: string, statusId: string): Promise<Ticket> {
    return this.prisma.ticket.update({
      where: { id },
      data: { currentStateId: statusId },
      include: { currentState: true }
    });
  }

  async transitionState(id: string, userId: string, newStateId: string): Promise<Ticket> {
    const newState = await this.prisma.workflowState.findUnique({ where: { id: newStateId } });
    const isResolved = newState?.name.toLowerCase().includes('resuelto');

    const ticket = await this.prisma.ticket.update({
      where: { id },
      data: { 
        currentStateId: newStateId,
        resolvedAt: isResolved ? new Date() : undefined,
      },
      include: {
        currentState: true,
        property: true,
        assignedTechnician: true,
        reportedByUser: true,
      }
    });

    if (isResolved && ticket.reportedByUserPhone) {
      const surveyMessage = `¡Hola! Don Atento informa: Tu requerimiento "${ticket.title}" ha sido marcado como RESUELTO. \n\n¿Cómo calificarías nuestro servicio? Responde con un número del 1 al 5 (donde 5 es excelente).`;
      await this.whatsappService.sendMessage(ticket.reportedByUserPhone, surveyMessage);
    }

    return ticket;
  }

  async updateSatisfaction(id: string, stars: number, comment?: string): Promise<Ticket> {
    return this.prisma.ticket.update({
      where: { id },
      data: { 
        satisfactionStars: stars,
        satisfactionComment: comment,
      },
    });
  }

  async findAllByTenant(tenantId: string) {
    return this.prisma.ticket.findMany({
      where: { tenantId },
      include: {
        property: true,
        reportedByUser: true,
        assignedTechnician: true,
        currentState: true,
        interactions: {
          orderBy: { sentAt: 'desc' },
          take: 5
        }
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findAllByTechnician(technicianId: string) {
    return this.prisma.ticket.findMany({
      where: { assignedTechnicianId: technicianId },
      include: {
        property: true,
        currentState: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }
}
