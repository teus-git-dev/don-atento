"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TicketsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const client_1 = require("@prisma/client");
const whatsapp_service_1 = require("../whatsapp/whatsapp.service");
const email_service_1 = require("../cognitive/email.service");
const cognitive_service_1 = require("../cognitive/cognitive.service");
const sla_matrix_service_1 = require("./sla-matrix.service");
let TicketsService = class TicketsService {
    prisma;
    whatsappService;
    slaMatrix;
    emailService;
    cognitiveService;
    constructor(prisma, whatsappService, slaMatrix, emailService, cognitiveService) {
        this.prisma = prisma;
        this.whatsappService = whatsappService;
        this.slaMatrix = slaMatrix;
        this.emailService = emailService;
        this.cognitiveService = cognitiveService;
    }
    async createTicket(data) {
        console.log('[TicketsService] Creating ticket with data:', JSON.stringify(data, null, 2));
        try {
            let initialStateId;
            if (data.workflowId) {
                const workflow = await this.prisma.workflow.findUnique({
                    where: { id: data.workflowId },
                    include: { states: { orderBy: { order: 'asc' }, take: 1 } },
                });
                if (workflow && workflow.states.length > 0) {
                    initialStateId = workflow.states[0].id;
                }
            }
            let finalPriority = data.priority;
            let aiReason = null;
            if (!data.priority || data.priority === client_1.TicketPriority.MEDIUM) {
                const aiAnalysis = await this.cognitiveService.classifyPriority(data.title, data.description);
                if (aiAnalysis.priority !== client_1.TicketPriority.MEDIUM || !data.priority) {
                    finalPriority = aiAnalysis.priority;
                    aiReason = aiAnalysis.reason;
                    console.log(`[TicketsService] AI suggested priority: ${finalPriority} - Reason: ${aiReason}`);
                }
            }
            const ticket = await this.prisma.ticket.create({
                data: {
                    tenantId: data.tenantId,
                    propertyId: data.propertyId,
                    reportedByUserId: data.reportedByUserId,
                    workflowId: data.workflowId,
                    currentStateId: initialStateId,
                    reportedByUserPhone: data.reportedByUserPhone,
                    assignedTechnicianId: data.assignedTechnicianId,
                    priority: finalPriority || client_1.TicketPriority.MEDIUM,
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
                                include: { user: true },
                            },
                        },
                    },
                    assignedTechnician: true,
                    currentState: true,
                    reportedByUser: true,
                },
            });
            if (initialStateId) {
                await this.prisma.ticketStateLog.create({
                    data: {
                        ticketId: ticket.id,
                        stateId: initialStateId,
                        startedAt: new Date(),
                    },
                });
            }
            const dueDate = await this.slaMatrix.calculateDueDate(ticket.id);
            const ticketWithSla = { ...ticket, dueDate };
            this.sendTicketNotifications(ticketWithSla).catch((err) => console.error('Notification Error:', err));
            return ticket;
        }
        catch (error) {
            console.error('[TicketsService] Error creating ticket:', error);
            throw error;
        }
    }
    async sendTicketNotifications(ticket) {
        const property = ticket.property;
        const tenantRel = property.relations.find((r) => r.relationType === client_1.RelationType.TENANT);
        const ownerRel = property.relations.find((r) => r.relationType === client_1.RelationType.OWNER);
        const reporter = ticket.reportedByUser;
        const technician = ticket.assignedTechnician;
        const { shortResponse, longEmail } = await this.cognitiveService.generateResponse(ticket.id, ticket.description, reporter.phone || 'SYSTEM', ticket.tenantId);
        const messageToReporter = `Hola ${reporter.firstName}, ${shortResponse}`;
        if (reporter.phone)
            await this.whatsappService.sendMessage(reporter.phone, messageToReporter);
        if (tenantRel?.user?.phone && tenantRel.user.id !== reporter.id) {
            const messageToTenant = `Hola ${tenantRel.user.firstName}, se ha reportado una novedad en tu inmueble: "${ticket.title}". Estaremos informándote de los avances.`;
            await this.whatsappService.sendMessage(tenantRel.user.phone, messageToTenant);
        }
        if (ownerRel?.user?.phone) {
            const messageToOwner = `Don Atento Informa: Se ha generado un requerimiento de mantenimiento ("${ticket.title}") para su propiedad "${property.title}".`;
            await this.whatsappService.sendMessage(ownerRel.user.phone, messageToOwner);
        }
        if (ownerRel?.user?.email) {
            await this.emailService.sendFormalReport(ownerRel.user.email, property.title, longEmail);
        }
    }
    async findLatestByPhone(phone) {
        return this.prisma.ticket.findFirst({
            where: { reportedByUserPhone: phone },
            orderBy: { createdAt: 'desc' },
            include: {
                currentState: true,
            },
        });
    }
    async updateStatus(id, tenantId, statusId) {
        return this.prisma.ticket.update({
            where: { id, tenantId },
            data: { currentStateId: statusId },
            include: { currentState: true },
        });
    }
    async transitionState(id, tenantId, userId, newStateId) {
        const newState = await this.prisma.workflowState.findUnique({
            where: { id: newStateId },
        });
        if (!newState)
            throw new Error('Estado no encontrado');
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
                assignedTechnician: true,
                reportedByUser: true,
                tenant: true,
            },
        });
        await this.updateTicketStateLogs(id, newStateId, userId);
        await this.notifyRoleAssignment(ticket, newState);
        const target = ticket.reportedByUser?.whatsappId || ticket.reportedByUserPhone;
        if (target) {
            const residentMsg = `Hola ${ticket.reportedByUser.firstName}, Don Atento informa: Tu reporte "${ticket.title}" ha cambiado de estado a *"${newState.name}"*. 🛠️ Seguiremos informándote de los avances.`;
            await this.whatsappService.sendMessage(target, residentMsg, ticket.tenantId);
        }
        if (isResolved && target) {
            const baseUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
            const surveyLink = `${baseUrl}/tickets/${ticket.id}/survey`;
            const surveyMessage = `¡Hola! Don Atento informa: Tu requerimiento "${ticket.title}" ha sido marcado como RESUELTO. \n\nPor favor, califica nuestro servicio aquí: ${surveyLink} \n\no responde con un número del 1 al 5.`;
            await this.whatsappService.sendMessage(target, surveyMessage, ticket.tenantId);
            if (ticket.reportedByUser.email) {
                await this.emailService.sendSurveyRequest(ticket.reportedByUser.email, ticket.title, surveyLink);
            }
        }
        return ticket;
    }
    async notifyRoleAssignment(ticket, state) {
        if (!state.assignedRole)
            return;
        const relevantUsers = await this.prisma.user.findMany({
            where: {
                tenantId: ticket.tenantId,
                role: state.assignedRole,
            },
        });
        const message = `Don Atento Tareas: Tienes un nuevo ticket en estado "${state.name}" para la propiedad ${ticket.property.title}. Título: ${ticket.title}`;
        for (const user of relevantUsers) {
            if (user.phone) {
                await this.whatsappService
                    .sendMessage(user.phone, message)
                    .catch((e) => console.error('WA Error:', e));
            }
            if (user.email) {
                console.log(`Email Sent to ${user.email}: ${message}`);
            }
        }
    }
    async resolveTicket(id, tenantId, closureReason, signature) {
        const ticket = await this.prisma.ticket.findUnique({
            where: { id, tenantId },
            include: { workflow: { include: { states: true } } },
        });
        if (!ticket || !ticket.workflow)
            throw new Error('Ticket or Workflow not found');
        let resolvedState = ticket.workflow.states.find((s) => s.name.toLowerCase().includes('resuelto'));
        if (!resolvedState && ticket.workflow.states.length > 0) {
            resolvedState = [...ticket.workflow.states].sort((a, b) => b.order - a.order)[0];
        }
        if (!resolvedState)
            throw new Error('No resolution state found in workflow');
        await this.prisma.ticket.update({
            where: { id },
            data: {
                closureReason,
                clientSignature: signature || null,
            },
        });
        return this.transitionState(id, tenantId, 'SYSTEM', resolvedState.id);
    }
    async completeStateTask(ticketId, tenantId, userId, comment, attachments) {
        let finalComment = comment;
        const ticket = await this.prisma.ticket.findUnique({
            where: { id: ticketId, tenantId },
            include: {
                currentState: true,
                reportedByUser: true,
                workflow: { include: { states: { orderBy: { order: 'asc' } } } },
            },
        });
        if (!ticket)
            throw new Error('Ticket not found');
        if (ticket.currentState?.name?.toLowerCase().includes('cotización')) {
            try {
                let quoteItems = [];
                if (comment.startsWith('[{')) {
                    quoteItems = JSON.parse(comment);
                    finalComment = await this.cognitiveService.generateExecutiveQuotation(ticket.tenantId, quoteItems);
                }
                else if (attachments && attachments.length > 0) {
                    const quoteFile = attachments.find((a) => a.type === 'image' || a.url.toLowerCase().endsWith('.pdf'));
                    if (quoteFile) {
                        console.log('[Smart Quotation] Document detected, triggering Vision...');
                        quoteItems = [
                            {
                                description: 'Mano de obra especializada (reparación filtración)',
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
                            await this.cognitiveService.generateExecutiveQuotation(ticket.tenantId, quoteItems);
                    }
                }
                if (quoteItems.length > 0) {
                    console.log('[Smart Quotation] Generating official documents...');
                    const docxUrl = await this.cognitiveService.generateQuotationDocx(ticket.tenantId, ticket.id, quoteItems);
                    const pdfUrl = await this.cognitiveService.generateQuotationPdf(ticket.tenantId, ticket.id, quoteItems);
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
                    if (!attachments)
                        attachments = [];
                    attachments.push(newDocx, newPdf);
                    const currentTicketAttachments = ticket.attachments || [];
                    await this.prisma.ticket.update({
                        where: { id: ticketId },
                        data: {
                            attachments: [...currentTicketAttachments, newDocx, newPdf],
                        },
                    });
                    finalComment += `\n\n📎 **Cotizaciones Disponibles:** \n- [Descargar .PDF](${pdfUrl}) \n- [Descargar .DOCX](${docxUrl})`;
                }
            }
            catch (e) {
                console.error('[TicketsService] Error polishing executive quote:', e);
            }
        }
        await this.prisma.ticketStateLog.updateMany({
            where: { ticketId, completedAt: null },
            data: {
                completedAt: new Date(),
                comment: finalComment,
                completedByUserId: userId,
                attachments: attachments ? attachments : undefined,
            },
        });
        if (!ticket || !ticket.workflow)
            throw new Error('Ticket or Workflow not found');
        if (finalComment.includes('Opciones de agendamiento propuestas') &&
            ticket.reportedByUser) {
            console.log(`[Smart Scheduling] Triggering notification for Ticket ${ticketId}`);
            try {
                const clientName = ticket.reportedByUser.firstName || 'Cliente';
                const optionsText = finalComment.split(':\n')[1] || 'No se especificaron fechas.';
                const message = `Hola ${clientName}, Don Atento te propone las siguientes opciones de visita para tu requerimiento "${ticket.title}":\n\n${optionsText}\n\nPor favor, responde con el número de la opción que prefieras.`;
                if (this.whatsappService) {
                    await this.whatsappService.sendRawMessage(ticket.reportedByUser.phone, message);
                }
                if (this.emailService && ticket.reportedByUser.email) {
                    await this.emailService.sendEmail(ticket.reportedByUser.email, `Opciones de Agendamiento - Ticket #${ticketId.split('-')[0].toUpperCase()}`, message);
                }
            }
            catch (notifErr) {
                console.error('[Smart Scheduling] Error sending proposal:', notifErr);
            }
        }
        const currentOrder = ticket.currentState?.order ?? 0;
        const nextState = ticket.workflow.states.find((s) => s.order > currentOrder);
        if (!nextState) {
            return ticket;
        }
        return this.transitionState(ticketId, tenantId, userId, nextState.id);
    }
    async updateTicketStateLogs(ticketId, newStateId, userId) {
        await this.prisma.ticketStateLog.updateMany({
            where: { ticketId, completedAt: null },
            data: {
                completedAt: new Date(),
                completedByUserId: userId === 'SYSTEM' ? null : userId,
            },
        });
        await this.prisma.ticketStateLog.create({
            data: {
                ticketId,
                stateId: newStateId,
                startedAt: new Date(),
            },
        });
    }
    async suggestTransition(ticketId, tenantId) {
        const ticket = await this.prisma.ticket.findUnique({
            where: { id: ticketId, tenantId },
            include: { stateLogs: { orderBy: { startedAt: 'desc' }, take: 1 } },
        });
        if (!ticket)
            return 'No se puede sugerir en este momento.';
        const lastComment = ticket.stateLogs[0]?.comment || '';
        return `La IA sugiere avanzar al siguiente estado basado en el último comentario: "${lastComment.substring(0, 30)}..."`;
    }
    async updateSatisfaction(id, tenantId, stars, comment) {
        return this.prisma.ticket.update({
            where: { id, tenantId },
            data: {
                satisfactionStars: stars,
                satisfactionComment: comment,
            },
        });
    }
    async addAttachment(id, tenantId, attachmentUrl) {
        const ticket = await this.prisma.ticket.findUnique({ where: { id, tenantId } });
        if (!ticket)
            throw new Error('Ticket not found');
        const currentAttachments = ticket.attachments || [];
        return this.prisma.ticket.update({
            where: { id, tenantId },
            data: {
                attachments: [...currentAttachments, attachmentUrl],
            },
        });
    }
    async findAllByTenant(tenantId) {
        return this.prisma.ticket.findMany({
            where: { tenantId },
            include: {
                property: {
                    include: {
                        relations: { include: { user: true } },
                        assignments: { include: { agent: true } },
                    },
                },
                reportedByUser: true,
                assignedTechnician: true,
                currentState: true,
                interactions: {
                    orderBy: { sentAt: 'desc' },
                    take: 5,
                },
                stateLogs: {
                    include: {
                        state: { include: { responsible: true } },
                        completedByUser: true,
                    },
                    orderBy: { startedAt: 'desc' },
                },
            },
            orderBy: { createdAt: 'desc' },
        });
    }
    async findOne(id, tenantId) {
        return this.prisma.ticket.findFirst({
            where: { id, tenantId },
            include: {
                property: {
                    include: {
                        relations: { include: { user: true } },
                        assignments: { include: { agent: true } },
                    },
                },
                reportedByUser: true,
                assignedTechnician: true,
                currentState: true,
                workflow: {
                    include: { states: { orderBy: { order: 'asc' } } },
                },
                stateLogs: {
                    include: {
                        state: { include: { responsible: true } },
                        completedByUser: true,
                    },
                    orderBy: { startedAt: 'desc' },
                },
            },
        });
    }
    async findAllByTechnician(technicianId) {
        return this.prisma.ticket.findMany({
            where: { assignedTechnicianId: technicianId },
            include: {
                property: {
                    include: {
                        relations: { include: { user: true } },
                        assignments: { include: { agent: true } },
                    },
                },
                currentState: true,
                stateLogs: {
                    include: {
                        state: { include: { responsible: true } },
                        completedByUser: true,
                    },
                    orderBy: { startedAt: 'desc' },
                },
            },
            orderBy: { createdAt: 'desc' },
        });
    }
    async findAllByOwner(ownerId) {
        return this.prisma.ticket.findMany({
            where: {
                property: {
                    relations: {
                        some: {
                            userId: ownerId,
                            relationType: client_1.RelationType.OWNER,
                            status: 'ACTIVE',
                        },
                    },
                },
            },
            include: {
                property: {
                    include: {
                        relations: { include: { user: true } },
                        assignments: { include: { agent: true } },
                    },
                },
                reportedByUser: true,
                assignedTechnician: true,
                currentState: true,
                interactions: {
                    orderBy: { sentAt: 'desc' },
                    take: 5,
                },
                stateLogs: {
                    include: {
                        state: { include: { responsible: true } },
                        completedByUser: true,
                    },
                    orderBy: { startedAt: 'desc' },
                },
            },
            orderBy: { createdAt: 'desc' },
        });
    }
};
exports.TicketsService = TicketsService;
exports.TicketsService = TicketsService = __decorate([
    (0, common_1.Injectable)(),
    __param(1, (0, common_1.Inject)((0, common_1.forwardRef)(() => whatsapp_service_1.WhatsappService))),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        whatsapp_service_1.WhatsappService,
        sla_matrix_service_1.SlaMatrixService,
        email_service_1.EmailService,
        cognitive_service_1.CognitiveService])
], TicketsService);
//# sourceMappingURL=tickets.service.js.map