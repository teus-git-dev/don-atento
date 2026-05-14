import {
  Inject,
  Injectable,
  NotFoundException,
  forwardRef,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  ProspectStatus,
  ProspectSource,
  SentimentAnalysis,
  ContractStatus,
  UserRole,
  RelationType,
  InteractionChannel,
} from '@prisma/client';
import { BrandBrainService } from '../cognitive/brand-brain.service';
import { EmailService } from '../cognitive/email.service';
import { WhatsappService } from '../whatsapp/whatsapp.service';

import { UsersService } from '../users/users.service';

@Injectable()
export class CrmService {
  constructor(
    private prisma: PrismaService,
    private brandBrain: BrandBrainService,
    private usersService: UsersService,
    private emailService: EmailService,
    @Inject(forwardRef(() => WhatsappService))
    private whatsappService: WhatsappService,
  ) {}

  async createProspect(data: {
    tenantId: string;
    firstName: string;
    lastName?: string;
    email?: string;
    phone?: string;
    whatsappId?: string;
    source?: ProspectSource;
    assignedAgentId?: string;
    propertyIds?: string[];
    initialMessage?: string;
  }) {
    let initialSentiment: SentimentAnalysis = SentimentAnalysis.NEUTRAL;

    if (data.initialMessage) {
      const alignment = await this.brandBrain.getToneAlignmentScore(
        data.initialMessage,
        data.tenantId,
      );
      if (alignment.score > 0.8) initialSentiment = SentimentAnalysis.POSITIVE;
      if (alignment.score < 0.4) initialSentiment = SentimentAnalysis.NEGATIVE;
    }

    // Phone validation and prefix enforcement
    let phone = data.phone;
    if (phone) {
      phone = phone.replace(/\s+/g, '');
      if (!phone.startsWith('+57')) {
        // If it starts with 57 but no +, add +
        if (phone.startsWith('57')) {
          phone = '+' + phone;
        } else {
          // Add +57 prefix
          phone = '+57' + phone;
        }
      }
    }

    return this.prisma.prospect.create({
      data: {
        tenantId: data.tenantId,
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email,
        phone: phone,
        whatsappId: data.whatsappId,
        source: data.source || ProspectSource.MANUAL,
        assignedAgentId: data.assignedAgentId,
        status: ProspectStatus.NEW,
        sentiment: initialSentiment,
        interestedProperties:
          data.propertyIds && data.propertyIds.length > 0
            ? {
                connect: data.propertyIds.map((id) => ({ id })),
              }
            : undefined,
      },
    });
  }

  async findAll(tenantId: string) {
    return this.prisma.prospect.findMany({
      where: { tenantId },
      include: {
        interactions: { orderBy: { createdAt: 'desc' }, take: 5 },
        tasks: { orderBy: { createdAt: 'desc' } },
        assignedAgent: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
        interestedProperties: true,
      },
      orderBy: { updatedAt: 'desc' },
    });
  }

  async createTask(
    prospectId: string,
    tenantId: string,
    data: { title: string; description?: string; dueDate?: Date },
  ) {
    // Cross-tenant write guard: tasks live under prospects, and
    // ProspectTask has no direct tenantId column, so we must verify
    // ownership via the prospect first. Without this check any caller
    // could attach tasks (titles, due dates) to a foreign tenant's
    // pipeline.
    await this.assertProspectBelongsToTenant(prospectId, tenantId);

    return this.prisma.prospectTask.create({
      data: {
        prospectId,
        title: data.title,
        description: data.description,
        dueDate: data.dueDate,
      },
    });
  }

  async updateTask(
    taskId: string,
    tenantId: string,
    data: {
      title?: string;
      description?: string;
      dueDate?: Date;
      isCompleted?: boolean;
    },
  ) {
    // Ownership check via the task's parent prospect — a foreign task
    // (or one whose update payload tries to reassign prospectId) is
    // rejected as 404.
    const task = await this.prisma.prospectTask.findFirst({
      where: { id: taskId, prospect: { tenantId } },
      select: { id: true },
    });
    if (!task) throw new NotFoundException('Tarea no encontrada.');

    return this.prisma.prospectTask.update({
      where: { id: taskId },
      data,
    });
  }

  async deleteTask(taskId: string, tenantId: string) {
    const task = await this.prisma.prospectTask.findFirst({
      where: { id: taskId, prospect: { tenantId } },
      select: { id: true },
    });
    if (!task) throw new NotFoundException('Tarea no encontrada.');

    return this.prisma.prospectTask.delete({
      where: { id: taskId },
    });
  }

  async updateProspect(id: string, tenantId: string, data: any) {
    // updateMany with composite where prevents cross-tenant tampering.
    // Block B will further constrain `data` via a DTO whitelist so
    // tenantId itself can't be set from the body.
    const result = await this.prisma.prospect.updateMany({
      where: { id, tenantId },
      data,
    });
    if (result.count === 0) {
      throw new NotFoundException('Prospect no encontrado.');
    }
    return this.prisma.prospect.findUnique({ where: { id } });
  }

  async scoreLead(prospectId: string) {
    const prospect = await this.prisma.prospect.findUnique({
      where: { id: prospectId },
      include: { interactions: true },
    });

    if (!prospect) return null;

    const interactionCount = prospect.interactions.length;
    const lastSentiment = prospect.sentiment;

    let urgencyScore = 50;
    if (lastSentiment === SentimentAnalysis.NEGATIVE) urgencyScore += 30;
    if (interactionCount > 5) urgencyScore += 20;

    return {
      prospectId,
      urgencyScore: Math.min(100, urgencyScore),
      qualityLabel:
        lastSentiment === SentimentAnalysis.POSITIVE ? 'HOT LEAD' : 'WARM',
      nextAction: urgencyScore > 70 ? 'CALL IMMEDIATELY' : 'FOLLOW UP IN 24H',
    };
  }

  async addInteraction(prospectId: string, message: string, channel: any) {
    const prospect = await this.prisma.prospect.findUnique({
      where: { id: prospectId },
    });
    if (!prospect) throw new Error('Prospect not found');

    const alignment = await this.brandBrain.getToneAlignmentScore(
      message,
      prospect.tenantId,
    );
    let sentiment: SentimentAnalysis = SentimentAnalysis.NEUTRAL;
    if (alignment.score > 0.8) sentiment = SentimentAnalysis.POSITIVE;
    if (alignment.score < 0.4) sentiment = SentimentAnalysis.NEGATIVE;

    const interaction = await this.prisma.prospectInteraction.create({
      data: {
        prospectId,
        message,
        channel,
        sentiment: sentiment,
      },
    });

    await this.prisma.prospect.update({
      where: { id: prospectId },
      data: { sentiment },
    });

    return interaction;
  }

  async getFunnel(tenantId: string) {
    const prospects = await this.prisma.prospect.groupBy({
      by: ['status'],
      where: { tenantId },
      _count: { _all: true },
    });

    return prospects.map((p) => ({
      status: p.status,
      count: p._count._all,
    }));
  }

  async getSentimentMetrics(tenantId: string) {
    const prospects = await this.prisma.prospect.groupBy({
      by: ['sentiment'],
      where: { tenantId },
      _count: { _all: true },
    });

    return prospects.map((p) => ({
      sentiment: p.sentiment,
      count: p._count._all,
    }));
  }

  async startContractProcess(
    prospectId: string,
    propertyId: string,
    tenantId: string,
    formData: any,
  ) {
    // Cross-tenant write guards: both the prospect and the property
    // must belong to the caller's tenant. Without these the endpoint
    // would let an agent in tenant A initiate a legal contract on
    // tenant B's pipeline.
    await this.assertProspectBelongsToTenant(prospectId, tenantId);
    await this.assertPropertyBelongsToTenant(propertyId, tenantId);

    const request = await this.prisma.contractRequest.create({
      data: {
        tenantId,
        prospectId,
        propertyId,
        formData,
        status: 'PENDING_AI',
      },
    });

    // Update prospect status
    await this.prisma.prospect.update({
      where: { id: prospectId },
      data: { status: ProspectStatus.NEGOTIATION },
    });

    return request;
  }

  async approveContract(
    requestId: string,
    tenantId: string,
    approvedByUserId: string,
  ) {
    // Tenant scoping on the ContractRequest lookup. Previously the
    // method used findUnique({ where: { id } }) and would approve a
    // contract belonging to any tenant — a catastrophic legal-binding
    // cross-tenant write. findFirst with the composite where filters
    // it and we 404 if it doesn't match.
    const request = await this.prisma.contractRequest.findFirst({
      where: { id: requestId, tenantId },
      include: { prospect: true, property: true },
    });

    if (!request) {
      throw new NotFoundException('Contract request no encontrado.');
    }

    // 1. Convert Prospect to User (Tenant)
    const newUser = await this.prisma.user.create({
      data: {
        tenantId: request.tenantId,
        email:
          request.prospect.email ||
          `client_${request.id.substring(0, 8)}@example.com`,
        passwordHash: 'PROSPECT_CONVERTED',
        firstName: request.prospect.firstName,
        lastName: request.prospect.lastName || '',
        phone: request.prospect.phone,
        whatsappId: request.prospect.whatsappId,
        role: UserRole.TENANT_USER,
      },
    });

    // 2. Link User to Property
    await this.prisma.propertyRelation.create({
      data: {
        propertyId: request.propertyId,
        userId: newUser.id,
        relationType: RelationType.TENANT,
        startDate: new Date(),
        status: 'ACTIVE',
      },
    });

    // 3. Update Statuses
    await this.prisma.contractRequest.update({
      where: { id: requestId },
      data: {
        status: 'APPROVED',
        approvedByUserId,
      },
    });

    await this.prisma.prospect.update({
      where: { id: request.prospectId },
      data: { status: ProspectStatus.CLOSED_WON },
    });

    await this.prisma.property.update({
      where: { id: request.propertyId },
      data: { status: 'RENTED' },
    });

    // 4. Send Welcome Kit (IA + Agent Branding)
    await this.sendWelcomeKit(newUser.id, request.propertyId, approvedByUserId);

    return { newUser, property: request.property };
  }

  private async sendWelcomeKit(
    tenantUserId: string,
    propertyId: string,
    agentUserId: string,
  ) {
    const tenant = await this.prisma.user.findUnique({
      where: { id: tenantUserId },
    });
    const agent = await this.prisma.user.findUnique({
      where: { id: agentUserId },
    });
    const property = await this.prisma.property.findUnique({
      where: { id: propertyId },
    });

    if (!tenant || !agent || !property) return;

    const agentName = `${agent.firstName} ${agent.lastName}`;
    const welcomeSubject = `¡Bienvenido a tu nuevo hogar! - Don Atento & ${agentName}`;

    // IA Personalizada: Actúa como el puente entre Don Atento y el Agente
    const emailBody = `
      <h1>¡Felicidades, ${tenant.firstName}!</h1>
      <p>Tu contrato para el inmueble <strong>${property.title}</strong> ha sido aprobado formalmente.</p>
      
      <div style="background: #f8fafc; border-radius: 1rem; padding: 2rem; border-left: 4px solid #06b6d4; margin: 2rem 0;">
        <p><em>"Es un placer para mí darte la bienvenida oficial. Estoy aquí para asegurar que tu estancia sea impecable, gestionando tus requerimientos de forma inteligente y predictiva."</em></p>
        <p><strong>— Don Atento (Tu Asistente IA)</strong></p>
      </div>

      <p>Este proceso fue liderado por tu Agente Comercial asignado:</p>
      
      <div style="display: flex; align-items: center; gap: 1rem; margin: 2rem 0;">
        <img src="${agent.photoUrl || 'https://donatento.ai/api/placeholder-avatar.png'}" style="width: 80px; height: 80px; border-radius: 50%; object-fit: cover;" alt="${agentName}">
        <div>
          <h3 style="margin: 0;">${agentName}</h3>
          <p style="margin: 0; color: #64748b; font-size: 0.9rem;">Agente Comercial Don Atento</p>
          <p style="margin: 0; color: #64748b; font-size: 0.8rem;">${agent.phone || ''}</p>
        </div>
      </div>

      <p>A partir de ahora, puedes reportar cualquier novedad sobre el inmueble simplemente enviando un mensaje a nuestro WhatsApp oficial.</p>
      
      <p>Cordialmente,<br>El equipo de Don Atento.</p>
    `;

    // 1. Send Email
    await this.emailService.sendEmail(tenant.email, welcomeSubject, emailBody);

    // 2. Send WhatsApp
    if (tenant.phone || tenant.whatsappId) {
      const waTarget = tenant.whatsappId || tenant.phone!;
      const waMessage = `¡Hola ${tenant.firstName}! 🏠 Soy Don Atento. Tu contrato para ${property.title} ha sido aprobado. Tu asesor comercial ${agentName} y yo te damos la bienvenida oficial. ¡Estamos a un mensaje de distancia!`;
      await this.whatsappService.sendMessage(waTarget, waMessage);
    }

    // Log the welcome interaction
    await this.addInteraction(
      tenantUserId,
      'ENVÍO KIT DE BIENVENIDA AUTOMÁTICO (EMAIL/WA)',
      InteractionChannel.SYSTEM_AI,
    );
  }

  async convertToClient(prospectId: string, tenantId: string) {
    // Legacy method - redirecting to newer flow or keeping for simple cases.
    // Block A: findFirst with composite (id, tenantId) so a foreign
    // prospectId cannot be used to create a User in the caller's
    // tenant carrying the foreign prospect's email/phone (which the
    // pre-Block-A flow happily did).
    const prospect = await this.prisma.prospect.findFirst({
      where: { id: prospectId, tenantId },
    });

    if (!prospect) throw new NotFoundException('Prospect no encontrado.');

    const user = await this.prisma.user.create({
      data: {
        tenantId,
        email:
          prospect.email || `client_${prospect.id.substring(0, 8)}@example.com`,
        passwordHash: 'PROSPECT_CONVERTED',
        firstName: prospect.firstName,
        lastName: prospect.lastName || '',
        phone: prospect.phone,
        whatsappId: prospect.whatsappId,
        role: UserRole.TENANT_USER,
      },
    });

    await this.prisma.prospect.update({
      where: { id: prospectId },
      data: { status: ProspectStatus.CLOSED_WON },
    });

    return user;
  }

  /**
   * Public ownership guard called by the controller before invoking
   * LegalAiService.generateContractDraft (a billable LLM call). Throws
   * NotFoundException if the request doesn't exist OR belongs to a
   * different tenant — uniform 404 prevents enumeration of cross-tenant
   * contract request ids.
   */
  async assertContractRequestBelongsToTenant(
    requestId: string,
    tenantId: string,
  ): Promise<void> {
    const req = await this.prisma.contractRequest.findFirst({
      where: { id: requestId, tenantId },
      select: { id: true },
    });
    if (!req) throw new NotFoundException('Contract request no encontrado.');
  }

  private async assertProspectBelongsToTenant(
    prospectId: string,
    tenantId: string,
  ): Promise<void> {
    const p = await this.prisma.prospect.findFirst({
      where: { id: prospectId, tenantId },
      select: { id: true },
    });
    if (!p) throw new NotFoundException('Prospect no encontrado.');
  }

  private async assertPropertyBelongsToTenant(
    propertyId: string,
    tenantId: string,
  ): Promise<void> {
    const p = await this.prisma.property.findFirst({
      where: { id: propertyId, tenantId },
      select: { id: true },
    });
    if (!p) throw new NotFoundException('Propiedad no encontrada.');
  }
}
