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
        console.log("[TicketsService] Creating ticket with data:", JSON.stringify(data, null, 2));
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
            const ticket = await this.prisma.ticket.create({
                data: {
                    tenantId: data.tenantId,
                    propertyId: data.propertyId,
                    reportedByUserId: data.reportedByUserId,
                    workflowId: data.workflowId,
                    currentStateId: initialStateId,
                    reportedByUserPhone: data.reportedByUserPhone,
                    assignedTechnicianId: data.assignedTechnicianId,
                    priority: data.priority || client_1.TicketPriority.MEDIUM,
                    title: data.title,
                    description: data.description,
                    attachments: data.attachments,
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
            if (initialStateId) {
                await this.prisma.ticketStateLog.create({
                    data: {
                        ticketId: ticket.id,
                        stateId: initialStateId,
                        startedAt: new Date(),
                    }
                });
            }
            const dueDate = await this.slaMatrix.calculateDueDate(ticket.id);
            const ticketWithSla = { ...ticket, dueDate };
            this.sendTicketNotifications(ticketWithSla).catch(err => console.error("Notification Error:", err));
            return ticket;
        }
        catch (error) {
            console.error("[TicketsService] Error creating ticket:", error);
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
            }
        });
    }
    async updateStatus(id, statusId) {
        return this.prisma.ticket.update({
            where: { id },
            data: { currentStateId: statusId },
            include: { currentState: true }
        });
    }
    async transitionState(id, userId, newStateId) {
        const newState = await this.prisma.workflowState.findUnique({ where: { id: newStateId } });
        if (!newState)
            throw new Error("Estado no encontrado");
        const isResolved = newState.name.toLowerCase().includes('resuelto');
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
                tenant: true
            }
        });
        await this.updateTicketStateLogs(id, newStateId, userId);
        await this.notifyRoleAssignment(ticket, newState);
        if (isResolved && ticket.reportedByUserPhone) {
            const baseUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
            const surveyLink = `${baseUrl}/tickets/${ticket.id}/survey`;
            const surveyMessage = `¡Hola! Don Atento informa: Tu requerimiento "${ticket.title}" ha sido marcado como RESUELTO. \n\nPor favor, califica nuestro servicio aquí: ${surveyLink} \n\no responde con un número del 1 al 5.`;
            await this.whatsappService.sendMessage(ticket.reportedByUserPhone, surveyMessage);
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
                role: state.assignedRole
            }
        });
        const message = `Don Atento Tareas: Tienes un nuevo ticket en estado "${state.name}" para la propiedad ${ticket.property.title}. Título: ${ticket.title}`;
        for (const user of relevantUsers) {
            if (user.phone) {
                await this.whatsappService.sendMessage(user.phone, message).catch(e => console.error("WA Error:", e));
            }
            if (user.email) {
                console.log(`Email Sent to ${user.email}: ${message}`);
            }
        }
    }
    async resolveTicket(id, closureReason) {
        const ticket = await this.prisma.ticket.findUnique({
            where: { id },
            include: { workflow: { include: { states: true } } }
        });
        if (!ticket || !ticket.workflow)
            throw new Error("Ticket or Workflow not found");
        const resolvedState = ticket.workflow.states.find(s => s.name.toLowerCase().includes('resuelto'));
        if (!resolvedState)
            throw new Error("No 'Resuelto' state found in workflow");
        await this.prisma.ticket.update({
            where: { id },
            data: { closureReason },
        });
        return this.transitionState(id, 'SYSTEM', resolvedState.id);
    }
    async completeStateTask(ticketId, userId, comment) {
        await this.prisma.ticketStateLog.updateMany({
            where: { ticketId, completedAt: null },
            data: {
                completedAt: new Date(),
                comment,
                completedByUserId: userId
            }
        });
        const ticket = await this.prisma.ticket.findUnique({
            where: { id: ticketId },
            include: {
                currentState: true,
                workflow: { include: { states: { orderBy: { order: 'asc' } } } }
            }
        });
        if (!ticket || !ticket.workflow)
            throw new Error("Ticket or Workflow not found");
        const currentOrder = ticket.currentState?.order ?? 0;
        const nextState = ticket.workflow.states.find(s => s.order > currentOrder);
        if (!nextState) {
            return ticket;
        }
        return this.transitionState(ticketId, userId, nextState.id);
    }
    async updateTicketStateLogs(ticketId, newStateId, userId) {
        await this.prisma.ticketStateLog.updateMany({
            where: { ticketId, completedAt: null },
            data: {
                completedAt: new Date(),
                completedByUserId: userId === 'SYSTEM' ? null : userId
            }
        });
        await this.prisma.ticketStateLog.create({
            data: {
                ticketId,
                stateId: newStateId,
                startedAt: new Date(),
            }
        });
    }
    async suggestTransition(ticketId) {
        const ticket = await this.prisma.ticket.findUnique({
            where: { id: ticketId },
            include: { stateLogs: { orderBy: { startedAt: 'desc' }, take: 1 } }
        });
        if (!ticket)
            return "No se puede sugerir en este momento.";
        const lastComment = ticket.stateLogs[0]?.comment || "";
        return `La IA sugiere avanzar al siguiente estado basado en el último comentario: "${lastComment.substring(0, 30)}..."`;
    }
    async updateSatisfaction(id, stars, comment) {
        return this.prisma.ticket.update({
            where: { id },
            data: {
                satisfactionStars: stars,
                satisfactionComment: comment,
            },
        });
    }
    async addAttachment(id, attachmentUrl) {
        const ticket = await this.prisma.ticket.findUnique({ where: { id } });
        if (!ticket)
            throw new Error("Ticket not found");
        const currentAttachments = ticket.attachments || [];
        return this.prisma.ticket.update({
            where: { id },
            data: {
                attachments: [...currentAttachments, attachmentUrl]
            },
        });
    }
    async findAllByTenant(tenantId) {
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
                },
                stateLogs: {
                    include: { state: true, completedByUser: true },
                    orderBy: { startedAt: 'desc' }
                }
            },
            orderBy: { createdAt: 'desc' },
        });
    }
    async findOne(id) {
        return this.prisma.ticket.findUnique({
            where: { id },
            include: {
                property: true,
                reportedByUser: true,
                assignedTechnician: true,
                currentState: true,
                workflow: {
                    include: { states: { orderBy: { order: 'asc' } } }
                },
                stateLogs: {
                    include: { state: true, completedByUser: true },
                    orderBy: { startedAt: 'desc' }
                }
            }
        });
    }
    async findAllByTechnician(technicianId) {
        return this.prisma.ticket.findMany({
            where: { assignedTechnicianId: technicianId },
            include: {
                property: true,
                currentState: true,
                stateLogs: {
                    include: { state: true, completedByUser: true },
                    orderBy: { startedAt: 'desc' }
                }
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
                            status: 'ACTIVE'
                        }
                    }
                }
            },
            include: {
                property: true,
                reportedByUser: true,
                assignedTechnician: true,
                currentState: true,
                interactions: {
                    orderBy: { sentAt: 'desc' },
                    take: 5
                },
                stateLogs: {
                    include: { state: true, completedByUser: true },
                    orderBy: { startedAt: 'desc' }
                }
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