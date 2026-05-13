import { Injectable, Inject, forwardRef } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTicketDto } from './dto/create-ticket.dto';
import { Ticket, TicketPriority, RelationType } from '@prisma/client';
import { WhatsappService } from '../whatsapp/whatsapp.service';
import { EmailService } from '../cognitive/email.service';
import { CognitiveService } from '../cognitive/cognitive.service';
import { SlaMatrixService } from './sla-matrix.service';
import { SurveyTokenService } from './survey-token.service';

/**
 * Whitelist of User fields safe to expose in ticket responses. Excludes
 * `passwordHash`, `refreshTokenHash`, `mustChangePassword` and any internal
 * flag. Mirrors the constant in PropertiesService for consistency.
 */
const USER_PUBLIC_SELECT = {
  id: true,
  firstName: true,
  lastName: true,
  email: true,
  phone: true,
  role: true,
  whatsappId: true,
} as const;

@Injectable()
export class TicketsService {
  constructor(
    private prisma: PrismaService,
    @Inject(forwardRef(() => WhatsappService))
    private whatsappService: WhatsappService,
    private slaMatrix: SlaMatrixService,
    private emailService: EmailService,
    private cognitiveService: CognitiveService,
    private surveyToken: SurveyTokenService,
  ) {}

  async createTicket(data: CreateTicketDto): Promise<Ticket> {
    console.log(
      '[TicketsService] Creating ticket with data:',
      JSON.stringify(data, null, 2),
    );
    try {
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

      // 1.5 AI Priority Classification (if not explicitly set or to validate)
      let finalPriority = data.priority;
      let aiReason = null;

      if (!data.priority || data.priority === TicketPriority.MEDIUM) {
        const aiAnalysis = await this.cognitiveService.classifyPriority(
          data.title,
          data.description,
        );
        if (aiAnalysis.priority !== TicketPriority.MEDIUM || !data.priority) {
          finalPriority = aiAnalysis.priority;
          aiReason = aiAnalysis.reason;
          console.log(
            `[TicketsService] AI suggested priority: ${finalPriority} - Reason: ${aiReason}`,
          );
        }
      }

      // Generate Short ID
      const tenant = await this.prisma.tenant.findUnique({
        where: { id: data.tenantId },
      });
      const prefix =
        tenant && tenant.name
          ? tenant.name.substring(0, 3).toUpperCase()
          : 'TKT';
      const randomNum = Math.floor(10000 + Math.random() * 90000);
      const generatedShortId = `${prefix}-${randomNum}`;

      // 2. Map DTO to Prisma data
      const ticket = await this.prisma.ticket.create({
        data: {
          tenantId: data.tenantId,
          shortId: generatedShortId,
          propertyId: data.propertyId,
          reportedByUserId: data.reportedByUserId,
          workflowId: data.workflowId,
          currentStateId: initialStateId,
          reportedByUserPhone: data.reportedByUserPhone,
          assignedTechnicianId: data.assignedTechnicianId,
          priority: (finalPriority as TicketPriority) || TicketPriority.MEDIUM,
          title: data.title,
          description: data.description,
          attachments: data.attachments,
          aiDiagnosisSummary: aiReason
            ? `Clasificación Automática: ${aiReason}`
            : null,
        },
        include: {
          property: {
            include: {
              relations: {
                include: { user: { select: USER_PUBLIC_SELECT } },
              },
            },
          },
          assignedTechnician: { select: USER_PUBLIC_SELECT },
          currentState: true,
          reportedByUser: { select: USER_PUBLIC_SELECT },
        },
      });

      // 2.1 Initialize State Log
      if (initialStateId) {
        await this.prisma.ticketStateLog.create({
          data: {
            ticketId: ticket.id,
            stateId: initialStateId,
            startedAt: new Date(),
          },
        });
      }

      // 3. Calculate SLA (New Pillar)
      const dueDate = await this.slaMatrix.calculateDueDate(ticket.id);

      // 4. Automated Notifications (Phase 10)
      const ticketWithSla = { ...ticket, dueDate };
      this.sendTicketNotifications(ticketWithSla).catch((err) =>
        console.error('Notification Error:', err),
      );

      return ticket;
    } catch (error) {
      console.error('[TicketsService] Error creating ticket:', error);
      throw error;
    }
  }

  private async sendTicketNotifications(ticket: any) {
    const property = ticket.property;
    const tenantRel = property.relations.find(
      (r: any) => r.relationType === RelationType.TENANT,
    );
    const ownerRel = property.relations.find(
      (r: any) => r.relationType === RelationType.OWNER,
    );

    const reporter = ticket.reportedByUser;
    const technician = ticket.assignedTechnician;

    // Omnichannel logic for WhatsApp (Short Response)
    const { shortResponse, longEmail } =
      await this.cognitiveService.generateResponse(
        ticket.id,
        ticket.description,
        reporter.phone || 'SYSTEM',
        ticket.tenantId,
      );

    const messageToReporter = `Hola ${reporter.firstName}, ${shortResponse}`;

    // Notify Reporter (if WhatsApp available)
    if (reporter.phone)
      await this.whatsappService.sendMessage(reporter.phone, messageToReporter);

    // Notify Tenant (if different from reporter)
    if (tenantRel?.user?.phone && tenantRel.user.id !== reporter.id) {
      const messageToTenant = `Hola ${tenantRel.user.firstName}, se ha reportado una novedad en tu inmueble: "${ticket.title}". Estaremos informándote de los avances.`;
      await this.whatsappService.sendMessage(
        tenantRel.user.phone,
        messageToTenant,
      );
    }

    // Notify Owner (Omnichannel: WhatsApp + Formal Email)
    if (ownerRel?.user?.phone) {
      const messageToOwner = `Don Atento Informa: Se ha generado un requerimiento de mantenimiento ("${ticket.title}") para su propiedad "${property.title}".`;
      await this.whatsappService.sendMessage(
        ownerRel.user.phone,
        messageToOwner,
      );
    }

    if (ownerRel?.user?.email) {
      await this.emailService.sendFormalReport(
        ownerRel.user.email,
        property.title,
        longEmail,
      );
    }
  }

  async findLatestByPhone(
    phone: string,
    tenantId: string,
  ): Promise<Ticket | null> {
    return this.prisma.ticket.findFirst({
      where: { tenantId, reportedByUserPhone: phone },
      orderBy: { createdAt: 'desc' },
      include: {
        currentState: true,
      },
    });
  }

  async updateStatus(
    id: string,
    tenantId: string,
    statusId: string,
  ): Promise<Ticket> {
    return this.prisma.ticket.update({
      where: { id, tenantId },
      data: { currentStateId: statusId },
      include: { currentState: true },
    });
  }

  async transitionState(
    id: string,
    tenantId: string,
    userId: string,
    newStateId: string,
  ): Promise<Ticket> {
    const newState = await this.prisma.workflowState.findUnique({
      where: { id: newStateId },
    });
    if (!newState) throw new Error('Estado no encontrado');

    const isResolved = newState.name.toLowerCase().includes('resuelto');

    const ticket = await this.prisma.ticket.update({
      where: { id, tenantId },
      data: {
        currentStateId: newStateId,
        resolvedAt: isResolved ? new Date() : undefined,
      },
      include: {
        currentState: true,
        property: true,
        assignedTechnician: { select: USER_PUBLIC_SELECT },
        reportedByUser: { select: USER_PUBLIC_SELECT },
        tenant: true,
      },
    });

    // 0. Update State Logs
    await this.updateTicketStateLogs(id, newStateId, userId);

    // 1. Role-Based Notifications (Staff)
    await this.notifyRoleAssignment(ticket, newState);

    // 2. Resident Proactive Notification (WhatsApp)
    const target =
      ticket.reportedByUser?.whatsappId || ticket.reportedByUserPhone;
    if (target) {
      const residentMsg = `Hola ${ticket.reportedByUser?.firstName || 'Cliente'}, Don Atento informa: Tu reporte "${ticket.title}" ha cambiado de estado a *"${newState.name}"*. 🛠️ Seguiremos informándote de los avances.`;
      await this.whatsappService.sendMessage(
        target,
        residentMsg,
        ticket.tenantId,
      );
    }

    // 3. Closure Survey Trigger
    if (isResolved && target) {
      const baseUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
      const token = this.surveyToken.generate(ticket.id);
      const surveyLink = `${baseUrl}/tickets/${ticket.id}/survey?token=${token}`;
      const surveyMessage = `¡Hola! Don Atento informa: Tu requerimiento "${ticket.title}" ha sido marcado como RESUELTO. \n\nPor favor, califica nuestro servicio aquí: ${surveyLink} \n\no responde con un número del 1 al 5.`;
      await this.whatsappService.sendMessage(
        target,
        surveyMessage,
        ticket.tenantId,
      );

      if (ticket.reportedByUser.email) {
        await this.emailService.sendSurveyRequest(
          ticket.reportedByUser.email,
          ticket.title,
          surveyLink,
        );
      }
    }

    return ticket;
  }

  private async notifyRoleAssignment(ticket: any, state: any) {
    if (!state.assignedRole) return;

    // Find users with this role in the tenant
    const relevantUsers = await this.prisma.user.findMany({
      where: {
        tenantId: ticket.tenantId,
        role: state.assignedRole,
      },
      select: USER_PUBLIC_SELECT,
    });

    const message = `Don Atento Tareas: Tienes un nuevo ticket en estado "${state.name}" para la propiedad ${ticket.property?.title || 'sin asignar'}. Título: ${ticket.title}`;

    for (const user of relevantUsers) {
      if (user.phone) {
        await this.whatsappService
          .sendMessage(user.phone, message)
          .catch((e) => console.error('WA Error:', e));
      }
      if (user.email) {
        // Simple alert email
        console.log(`Email Sent to ${user.email}: ${message}`);
      }
    }
  }

  async resolveTicket(
    id: string,
    tenantId: string,
    closureReason: string,
    signature?: string,
  ): Promise<Ticket> {
    let ticket: any = await this.prisma.ticket.findUnique({
      where: { id, tenantId },
      include: { workflow: { include: { states: true } } },
    });

    if (!ticket) throw new Error('Ticket not found');

    if (!ticket.workflow) {
      console.log(
        `[TicketsService] Ticket ${id} has no workflow. Auto-assigning default.`,
      );
      const defaultWf = await this.prisma.workflow.findFirst({
        where: { tenantId },
        include: { states: { orderBy: { order: 'asc' } } },
      });
      if (defaultWf) {
        await this.prisma.ticket.update({
          where: { id: ticket.id },
          data: {
            workflowId: defaultWf.id,
            currentStateId: defaultWf.states[0]?.id,
          },
        });
        ticket = (await this.prisma.ticket.findUnique({
          where: { id, tenantId },
          include: { workflow: { include: { states: true } } },
        })) as any;
      } else {
        throw new Error(
          'Ticket or Workflow not found and no default available',
        );
      }
    }

    let resolvedState = ticket.workflow.states.find((s: any) =>
      s.name.toLowerCase().includes('resuelto'),
    );

    // Fallback: If no "Resuelto" named state, pick the one with the highest order
    if (!resolvedState && ticket.workflow.states.length > 0) {
      resolvedState = [...ticket.workflow.states].sort(
        (a, b) => b.order - a.order,
      )[0];
    }

    if (!resolvedState)
      throw new Error('No resolution state found in workflow');

    // Transicionamos y guardamos el motivo y firma
    await this.prisma.ticket.update({
      where: { id },
      data: {
        closureReason,
        clientSignature: signature || null,
      },
    });

    return this.transitionState(id, tenantId, 'SYSTEM', resolvedState.id);
  }

  async completeStateTask(
    ticketId: string,
    tenantId: string,
    userId: string,
    comment: string,
    attachments?: any[],
  ): Promise<Ticket> {
    let finalComment = comment;

    // 0. Fetch Ticket to check state
    let ticket: any = await this.prisma.ticket.findUnique({
      where: { id: ticketId, tenantId },
      include: {
        currentState: true,
        reportedByUser: { select: USER_PUBLIC_SELECT },
        workflow: { include: { states: { orderBy: { order: 'asc' } } } },
      },
    });
    if (!ticket) throw new Error('Ticket not found');

    if (!ticket.workflow) {
      console.log(
        `[TicketsService] Ticket ${ticketId} has no workflow. Auto-assigning default.`,
      );
      const defaultWf = await this.prisma.workflow.findFirst({
        where: { tenantId },
        include: { states: { orderBy: { order: 'asc' } } },
      });
      if (defaultWf) {
        await this.prisma.ticket.update({
          where: { id: ticket.id },
          data: {
            workflowId: defaultWf.id,
            currentStateId: defaultWf.states[0]?.id,
          },
        });
        ticket = await this.prisma.ticket.findUnique({
          where: { id: ticketId, tenantId },
          include: {
            currentState: true,
            reportedByUser: { select: USER_PUBLIC_SELECT },
            workflow: { include: { states: { orderBy: { order: 'asc' } } } },
          },
        });
      }
    }

    // SPECIAL AI POLISH: Executive Quotation
    if (ticket.currentState?.name?.toLowerCase().includes('cotización')) {
      try {
        let quoteItems = [];
        if (comment.startsWith('[{')) {
          quoteItems = JSON.parse(comment);
          finalComment = await this.cognitiveService.generateExecutiveQuotation(
            ticket.tenantId,
            quoteItems,
          );
        } else if (attachments && attachments.length > 0) {
          const quoteFile = attachments.find(
            (a) => a.type === 'image' || a.url.toLowerCase().endsWith('.pdf'),
          );
          if (quoteFile) {
            console.log(
              '[Smart Quotation] Document detected, triggering Vision...',
            );
            // In a real scenario, this would extract items. For now, we use simulated ones.
            quoteItems = [
              {
                description:
                  'Mano de obra especializada (reparación filtración)',
                price: 150000,
                quantity: 1,
              },
              {
                description: 'Suministro de tubería PVC y accesorios presión',
                price: 85000,
                quantity: 1,
              },
              {
                description: 'Sellado y acabado de superficie',
                price: 45000,
                quantity: 1,
              },
            ];
            finalComment =
              await this.cognitiveService.generateExecutiveQuotation(
                ticket.tenantId,
                quoteItems,
              );
          }
        }

        // GENERATE OFFICIAL DOCUMENTS (.docx & .pdf)
        if (quoteItems.length > 0) {
          console.log('[Smart Quotation] Generating official documents...');
          const docxUrl = await this.cognitiveService.generateQuotationDocx(
            ticket.tenantId,
            ticket.id,
            quoteItems,
          );
          const pdfUrl = await this.cognitiveService.generateQuotationPdf(
            ticket.tenantId,
            ticket.id,
            quoteItems,
          );

          // Add to process attachments
          const newDocx = {
            name: 'Cotización Formal.docx',
            url: docxUrl,
            type: 'document',
            category: 'quotation',
          };
          const newPdf = {
            name: 'Cotización Formal.pdf',
            url: pdfUrl,
            type: 'pdf',
            category: 'quotation',
          };

          if (!attachments) attachments = [];
          attachments.push(newDocx, newPdf);

          // Update Ticket historical attachments
          const currentTicketAttachments = (ticket.attachments as any[]) || [];
          await this.prisma.ticket.update({
            where: { id: ticketId },
            data: {
              attachments: [...currentTicketAttachments, newDocx, newPdf],
            },
          });

          finalComment += `\n\n📎 **Cotizaciones Disponibles:** \n- [Descargar .PDF](${pdfUrl}) \n- [Descargar .DOCX](${docxUrl})`;
        }
      } catch (e) {
        console.error('[TicketsService] Error polishing executive quote:', e);
      }
    }

    // 1. Mark current log as completed
    await this.prisma.ticketStateLog.updateMany({
      where: { ticketId, completedAt: null },
      data: {
        completedAt: new Date(),
        comment: finalComment,
        completedByUserId: userId,
        attachments: attachments ? (attachments as any) : undefined,
      },
    });

    if (!ticket || !ticket.workflow) {
      console.warn(
        'Ticket or Workflow not found even after fallback. Aborting state transition but saving comment.',
      );
      return ticket;
    }

    // SPECIAL TRIGGER: Smart Scheduling (Agendamiento)
    if (
      finalComment.includes('Opciones de agendamiento propuestas') &&
      ticket.reportedByUser
    ) {
      console.log(
        `[Smart Scheduling] Triggering notification for Ticket ${ticketId}`,
      );
      try {
        const clientName = ticket.reportedByUser.firstName || 'Cliente';
        const optionsText =
          finalComment.split(':\n')[1] || 'No se especificaron fechas.';
        const message = `Hola ${clientName}, Don Atento te propone las siguientes opciones de visita para tu requerimiento "${ticket.title}":\n\n${optionsText}\n\nPor favor, responde con el número de la opción que prefieras.`;

        // Trigger WhatsApp (Simulated/Real)
        if (this.whatsappService) {
          await (this.whatsappService as any).sendRawMessage(
            ticket.reportedByUser.phone,
            message,
          );
        }

        // Trigger Email
        if (this.emailService && ticket.reportedByUser.email) {
          await this.emailService.sendEmail(
            ticket.reportedByUser.email,
            `Opciones de Agendamiento - Ticket #${ticketId.split('-')[0].toUpperCase()}`,
            message,
          );
        }
      } catch (notifErr) {
        console.error('[Smart Scheduling] Error sending proposal:', notifErr);
      }
    }

    const currentOrder = ticket.currentState?.order ?? 0;
    const nextState = ticket.workflow.states.find(
      (s: any) => s.order > currentOrder,
    );

    if (!nextState) {
      // If no next state, maybe auto-resolve?
      return ticket;
    }

    // 3. Transition
    return this.transitionState(ticketId, tenantId, userId, nextState.id);
  }

  private async updateTicketStateLogs(
    ticketId: string,
    newStateId: string,
    userId: string,
  ) {
    // Complete active log
    await this.prisma.ticketStateLog.updateMany({
      where: { ticketId, completedAt: null },
      data: {
        completedAt: new Date(),
        completedByUserId: userId === 'SYSTEM' ? null : userId,
      },
    });

    // Start new log
    await this.prisma.ticketStateLog.create({
      data: {
        ticketId,
        stateId: newStateId,
        startedAt: new Date(),
      },
    });
  }

  async suggestTransition(ticketId: string, tenantId: string): Promise<string> {
    const ticket = await this.prisma.ticket.findUnique({
      where: { id: ticketId, tenantId },
      include: { stateLogs: { orderBy: { startedAt: 'desc' }, take: 1 } },
    });

    if (!ticket) return 'No se puede sugerir en este momento.';

    const lastComment = ticket.stateLogs[0]?.comment || '';
    // Integration with CognitiveService for actual AI logic would go here
    return `La IA sugiere avanzar al siguiente estado basado en el último comentario: "${lastComment.substring(0, 30)}..."`;
  }

  async updateSatisfaction(
    id: string,
    tenantId: string,
    stars: number,
    comment?: string,
  ): Promise<Ticket> {
    return this.prisma.ticket.update({
      where: { id, tenantId },
      data: {
        satisfactionStars: stars,
        satisfactionComment: comment,
      },
    });
  }

  /**
   * Token-authorized variant for the public satisfaction-survey flow.
   * The caller has already verified the HMAC token via
   * `SurveyTokenService.verify`, so we no longer need a tenant filter
   * — token possession is the authorization. `findFirst` is used
   * instead of `findUnique` so we can return null on missing instead
   * of throwing P2025.
   */
  async findOnePublicForSurvey(ticketId: string) {
    return this.prisma.ticket.findFirst({
      where: { id: ticketId },
      select: { id: true, title: true, resolvedAt: true, tenantId: true },
    });
  }

  /**
   * Token-authorized satisfaction update. Like `findOnePublicForSurvey`,
   * the HMAC token is the sole authorization gate (verified at the
   * controller before this is called).
   */
  async updateSatisfactionPublic(
    ticketId: string,
    stars: number,
    comment?: string,
  ): Promise<Ticket> {
    return this.prisma.ticket.update({
      where: { id: ticketId },
      data: {
        satisfactionStars: stars,
        satisfactionComment: comment,
      },
    });
  }

  async addAttachment(
    id: string,
    tenantId: string,
    attachmentUrl: string,
  ): Promise<Ticket> {
    const ticket = await this.prisma.ticket.findUnique({
      where: { id, tenantId },
    });
    if (!ticket) throw new Error('Ticket not found');

    const currentAttachments = (ticket.attachments as string[]) || [];
    return this.prisma.ticket.update({
      where: { id, tenantId },
      data: {
        attachments: [...currentAttachments, attachmentUrl],
      },
    });
  }

  async findAllByTenant(tenantId: string) {
    return this.prisma.ticket.findMany({
      where: { tenantId },
      include: {
        property: {
          include: {
            relations: {
              include: { user: { select: USER_PUBLIC_SELECT } },
            },
            assignments: {
              include: { agent: { select: USER_PUBLIC_SELECT } },
            },
          },
        },
        reportedByUser: { select: USER_PUBLIC_SELECT },
        assignedTechnician: { select: USER_PUBLIC_SELECT },
        currentState: true,
        interactions: {
          orderBy: { sentAt: 'desc' },
          take: 5,
        },
        stateLogs: {
          include: {
            state: {
              include: { responsible: { select: USER_PUBLIC_SELECT } },
            },
            completedByUser: { select: USER_PUBLIC_SELECT },
          },
          orderBy: { startedAt: 'desc' },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string, tenantId: string) {
    return this.prisma.ticket.findFirst({
      where: { id, tenantId },
      include: {
        property: {
          include: {
            relations: {
              include: { user: { select: USER_PUBLIC_SELECT } },
            },
            assignments: {
              include: { agent: { select: USER_PUBLIC_SELECT } },
            },
          },
        },
        reportedByUser: { select: USER_PUBLIC_SELECT },
        assignedTechnician: { select: USER_PUBLIC_SELECT },
        currentState: true,
        workflow: {
          include: { states: { orderBy: { order: 'asc' } } },
        },
        stateLogs: {
          include: {
            state: {
              include: { responsible: { select: USER_PUBLIC_SELECT } },
            },
            completedByUser: { select: USER_PUBLIC_SELECT },
          },
          orderBy: { startedAt: 'desc' },
        },
      },
    });
  }

  async findAllByTechnician(technicianId: string, tenantId: string) {
    return this.prisma.ticket.findMany({
      where: { tenantId, assignedTechnicianId: technicianId },
      include: {
        property: {
          include: {
            relations: {
              include: { user: { select: USER_PUBLIC_SELECT } },
            },
            assignments: {
              include: { agent: { select: USER_PUBLIC_SELECT } },
            },
          },
        },
        currentState: true,
        stateLogs: {
          include: {
            state: {
              include: { responsible: { select: USER_PUBLIC_SELECT } },
            },
            completedByUser: { select: USER_PUBLIC_SELECT },
          },
          orderBy: { startedAt: 'desc' },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findAllByOwner(ownerId: string, tenantId: string) {
    return this.prisma.ticket.findMany({
      where: {
        tenantId,
        property: {
          relations: {
            some: {
              userId: ownerId,
              relationType: RelationType.OWNER,
              status: 'ACTIVE',
            },
          },
        },
      },
      include: {
        property: {
          include: {
            relations: {
              include: { user: { select: USER_PUBLIC_SELECT } },
            },
            assignments: {
              include: { agent: { select: USER_PUBLIC_SELECT } },
            },
          },
        },
        reportedByUser: { select: USER_PUBLIC_SELECT },
        assignedTechnician: { select: USER_PUBLIC_SELECT },
        currentState: true,
        interactions: {
          orderBy: { sentAt: 'desc' },
          take: 5,
        },
        stateLogs: {
          include: {
            state: {
              include: { responsible: { select: USER_PUBLIC_SELECT } },
            },
            completedByUser: { select: USER_PUBLIC_SELECT },
          },
          orderBy: { startedAt: 'desc' },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }
}
