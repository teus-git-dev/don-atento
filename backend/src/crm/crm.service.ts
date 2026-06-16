import {
  BadRequestException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
  forwardRef,
} from '@nestjs/common';
import { randomBytes } from 'crypto';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import {
  ProspectStatus,
  ProspectSource,
  SentimentAnalysis,
  UserRole,
  RelationType,
  InteractionChannel,
} from '@prisma/client';
import { Prisma } from '@prisma/client';
import { BrandBrainService } from '../cognitive/brand-brain.service';
import { EmailService } from '../cognitive/email.service';
import { WhatsappService } from '../whatsapp/whatsapp.service';
import { UpdateProspectDto } from './dto/update-prospect.dto';

/**
 * Whitelist of User fields safe to expose in CRM responses. Mirrors
 * the constant in PropertiesService / TicketsService / WorkflowsService
 * so the project speaks one vocabulary for what a "public" user looks
 * like.
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

/** Cap on `?limit=`. Mirrors properties/workflows for consistency. */
const MAX_PAGE_LIMIT = 100;

/** scoreLead tunables. Were inline magic numbers pre-Block-E. */
const URGENCY_BASE = 50;
const NEGATIVE_SENTIMENT_BUMP = 30;
const HIGH_ENGAGEMENT_BUMP = 20;
const HIGH_ENGAGEMENT_THRESHOLD = 5;
const HOT_LEAD_THRESHOLD = 70;
const URGENCY_CAP = 100;

/**
 * Minimal HTML escape for fields interpolated into the welcome email
 * body. Block E layer-1 defense — full template engine migration is a
 * post-v1 refactor. Covers the 5 chars that meaningfully change layout
 * or open attribute escapes.
 */
function escapeHtml(input: string): string {
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Generates a high-entropy temporary password for prospect→User
 * conversion flows. Mirrors the helper in PropertiesService — same
 * crypto.randomBytes(32) + bcrypt(12) pattern, paired with
 * mustChangePassword=true so the new client must rotate at first
 * login.
 */
async function generateTempPasswordHash(): Promise<{
  plaintext: string;
  hash: string;
}> {
  const plaintext = randomBytes(32).toString('hex');
  const hash = await bcrypt.hash(plaintext, 12);
  return { plaintext, hash };
}

@Injectable()
export class CrmService {
  private readonly logger = new Logger(CrmService.name);

  constructor(
    private prisma: PrismaService,
    private brandBrain: BrandBrainService,
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

    let finalAssignedAgentId: string | null | undefined = data.assignedAgentId;

    if (!finalAssignedAgentId) {
      try {
        const tenantInfo = await this.prisma.tenant.findUnique({
          where: { id: data.tenantId },
          select: { crmDefaultAssigneeEmail: true },
        });

        if (tenantInfo?.crmDefaultAssigneeEmail) {
          const coordinator = await this.prisma.user.findFirst({
            where: {
              tenantId: data.tenantId,
              email: tenantInfo.crmDefaultAssigneeEmail,
            },
            select: { id: true },
          });

          if (coordinator) {
            finalAssignedAgentId = coordinator.id;
          }
        }
      } catch (err) {
        // Fallar silenciosamente como se solicitó
        this.logger.warn(
          `No se pudo buscar/asignar coordinador por defecto: ${err}`,
        );
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
        assignedAgentId: finalAssignedAgentId ?? undefined,
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

  async findAll(tenantId: string, page = 1, limit = 20) {
    const safePage = Math.max(1, page);
    const safeLimit = Math.min(Math.max(1, limit), MAX_PAGE_LIMIT);
    const skip = (safePage - 1) * safeLimit;

    const [data, totalRecords] = await Promise.all([
      this.prisma.prospect.findMany({
        where: { tenantId },
        include: {
          interactions: { orderBy: { createdAt: 'desc' }, take: 5 },
          tasks: { orderBy: { createdAt: 'desc' } },
          assignedAgent: { select: USER_PUBLIC_SELECT },
          interestedProperties: true,
        },
        orderBy: [{ updatedAt: 'desc' }, { id: 'asc' }],
        skip,
        take: safeLimit,
      }),
      this.prisma.prospect.count({ where: { tenantId } }),
    ]);

    return {
      data,
      totalRecords,
      totalPages: Math.ceil(totalRecords / safeLimit),
      currentPage: safePage,
    };
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
        tenantId,
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

  async updateProspect(id: string, tenantId: string, data: UpdateProspectDto) {
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
    // findFirst with composite where instead of findUnique: the row was
    // just validated by the updateMany above, so this is mostly cosmetic,
    // but the codebase standard is `(id, tenantId)` lookups everywhere
    // — keeping it consistent avoids drift the next time someone copies
    // this pattern.
    return this.prisma.prospect.findFirst({ where: { id, tenantId } });
  }

  /**
   * P0.1 — tenantId is now required. The pre-P0.1 signature
   * (`scoreLead(prospectId)`) used findUnique without scoping, so a
   * caller knowing any prospectId could read a foreign tenant's lead +
   * full interaction history. `findFirst({ id, tenantId })` closes that.
   */
  async scoreLead(prospectId: string, tenantId: string) {
    const prospect = await this.prisma.prospect.findFirst({
      where: { id: prospectId, tenantId },
      include: { interactions: true },
    });

    if (!prospect) return null;

    const interactionCount = prospect.interactions.length;
    const lastSentiment = prospect.sentiment;

    let urgencyScore = URGENCY_BASE;
    if (lastSentiment === SentimentAnalysis.NEGATIVE) {
      urgencyScore += NEGATIVE_SENTIMENT_BUMP;
    }
    if (interactionCount > HIGH_ENGAGEMENT_THRESHOLD) {
      urgencyScore += HIGH_ENGAGEMENT_BUMP;
    }

    const finalScore = Math.min(URGENCY_CAP, urgencyScore);

    return {
      prospectId,
      urgencyScore: finalScore,
      qualityLabel:
        lastSentiment === SentimentAnalysis.POSITIVE ? 'HOT LEAD' : 'WARM',
      nextAction:
        finalScore > HOT_LEAD_THRESHOLD
          ? 'CALL IMMEDIATELY'
          : 'FOLLOW UP IN 24H',
    };
  }

  /**
   * P0.1 — tenantId is now required. Pre-P0.1 the lookup was a bare
   * findUnique by prospectId, so anyone who could call this method (or
   * leak a prospectId through it) could write a ProspectInteraction
   * under a foreign tenant's prospect AND mutate that prospect's
   * sentiment. The TenantGuard only filtered HTTP input, not internal
   * service calls. Now the method demands tenantId explicitly and every
   * DB touch is scoped on `(id, tenantId)`. The channel parameter is
   * also tightened from `any` to `InteractionChannel`.
   */
  async addInteraction(
    prospectId: string,
    tenantId: string,
    message: string,
    channel: InteractionChannel,
  ) {
    const prospect = await this.prisma.prospect.findFirst({
      where: { id: prospectId, tenantId },
      select: { id: true },
    });
    if (!prospect) throw new NotFoundException('Prospect no encontrado.');

    const alignment = await this.brandBrain.getToneAlignmentScore(
      message,
      tenantId,
    );
    let sentiment: SentimentAnalysis = SentimentAnalysis.NEUTRAL;
    if (alignment.score > 0.8) sentiment = SentimentAnalysis.POSITIVE;
    if (alignment.score < 0.4) sentiment = SentimentAnalysis.NEGATIVE;

    const interaction = await this.prisma.prospectInteraction.create({
      data: {
        tenantId,
        prospectId,
        message,
        channel,
        sentiment,
      },
    });

    // updateMany with composite where so the second touch stays scoped
    // even if a concurrent delete removed the prospect between the
    // findFirst above and here — update-by-id would 500 in that case.
    await this.prisma.prospect.updateMany({
      where: { id: prospectId, tenantId },
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
    formData: Prisma.InputJsonValue,
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
    if (!request.prospect.email) {
      throw new BadRequestException(
        'El prospect del contrato no tiene email; completa el dato antes de aprobar.',
      );
    }

    // Block C: all 5 writes (User, PropertyRelation, ContractRequest,
    // Prospect, Property) run inside a single Prisma interactive
    // transaction. If any step fails, the legal-binding state stays
    // consistent — previously a mid-sequence failure could leave the
    // contract APPROVED, the property RENTED, but no PropertyRelation
    // (or vice-versa). Side effects (email / WA) live outside the tx
    // because they can't be rolled back; if they fail we log and
    // continue.
    const { hash: passwordHash } = await generateTempPasswordHash();

    const result = await this.prisma.$transaction(async (tx) => {
      // 1. Convert Prospect to User (Tenant)
      const newUser = await tx.user.create({
        data: {
          tenantId: request.tenantId,
          email: request.prospect.email!,
          passwordHash,
          mustChangePassword: true,
          firstName: request.prospect.firstName,
          lastName: request.prospect.lastName || '',
          phone: request.prospect.phone,
          whatsappId: request.prospect.whatsappId,
          role: UserRole.TENANT_USER,
        },
      });

      // 2. Link User to Property
      await tx.propertyRelation.create({
        data: {
          propertyId: request.propertyId,
          userId: newUser.id,
          relationType: RelationType.TENANT,
          startDate: new Date(),
          status: 'ACTIVE',
        },
      });

      // 3. Update Statuses
      await tx.contractRequest.update({
        where: { id: requestId },
        data: { status: 'APPROVED', approvedByUserId },
      });
      await tx.prospect.update({
        where: { id: request.prospectId },
        data: { status: ProspectStatus.CLOSED_WON },
      });
      await tx.property.update({
        where: { id: request.propertyId },
        data: { status: 'RENTED' },
      });

      return newUser;
    });

    // 4. Side effects — outside the transaction. Pass the tenantId
    // so WhatsappService routes via the tenant's Baileys/Meta config
    // and not the cluster-wide env fallback (which would identify the
    // outbound as Don Atento global rather than the actual tenant).
    await this.sendWelcomeKit(
      request.prospectId,
      result.id,
      request.propertyId,
      approvedByUserId,
      request.tenantId,
    );

    return { newUser: result, property: request.property };
  }

  private async sendWelcomeKit(
    prospectId: string,
    tenantUserId: string,
    propertyId: string,
    agentUserId: string,
    tenantId: string,
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

    if (!tenant || !agent || !property) {
      this.logger.warn(
        `Welcome kit skipped: missing tenant/agent/property (tenantUserId=${tenantUserId}, agentUserId=${agentUserId}, propertyId=${propertyId})`,
      );
      return;
    }

    // Block E: every interpolation into the welcome email is HTML-
    // escaped. The fields come from user-edited data (agent name,
    // property title, etc.) and an angle-bracket payload could break
    // out of an attribute or inject layout used for phishing. Full
    // template engine migration is post-v1; this is the minimum
    // viable defense.
    const tenantFirstNameSafe = escapeHtml(tenant.firstName);
    const agentNameSafe = escapeHtml(`${agent.firstName} ${agent.lastName}`);
    const propertyTitleSafe = escapeHtml(property.title);
    const agentPhotoSafe = escapeHtml(
      agent.photoUrl || 'https://donatento.ai/api/placeholder-avatar.png',
    );
    const agentPhoneSafe = escapeHtml(agent.phone || '');

    const agentName = `${agent.firstName} ${agent.lastName}`;
    const welcomeSubject = `¡Bienvenido a tu nuevo hogar! - Don Atento & ${agentName}`;

    // IA Personalizada: Actúa como el puente entre Don Atento y el Agente
    const emailBody = `
      <h1>¡Felicidades, ${tenantFirstNameSafe}!</h1>
      <p>Tu contrato para el inmueble <strong>${propertyTitleSafe}</strong> ha sido aprobado formalmente.</p>

      <div style="background: #f8fafc; border-radius: 1rem; padding: 2rem; border-left: 4px solid #06b6d4; margin: 2rem 0;">
        <p><em>"Es un placer para mí darte la bienvenida oficial. Estoy aquí para asegurar que tu estancia sea impecable, gestionando tus requerimientos de forma inteligente y predictiva."</em></p>
        <p><strong>— Don Atento (Tu Asistente IA)</strong></p>
      </div>

      <p>Este proceso fue liderado por tu Agente Comercial asignado:</p>

      <div style="display: flex; align-items: center; gap: 1rem; margin: 2rem 0;">
        <img src="${agentPhotoSafe}" style="width: 80px; height: 80px; border-radius: 50%; object-fit: cover;" alt="${agentNameSafe}">
        <div>
          <h3 style="margin: 0;">${agentNameSafe}</h3>
          <p style="margin: 0; color: #64748b; font-size: 0.9rem;">Agente Comercial Don Atento</p>
          <p style="margin: 0; color: #64748b; font-size: 0.8rem;">${agentPhoneSafe}</p>
        </div>
      </div>

      <p>A partir de ahora, puedes reportar cualquier novedad sobre el inmueble simplemente enviando un mensaje a nuestro WhatsApp oficial.</p>

      <p>Cordialmente,<br>El equipo de Don Atento.</p>
    `;

    // 1. Send Email
    await this.emailService.sendEmail(tenant.email, welcomeSubject, emailBody);

    // 2. Send WhatsApp — Block C passes tenantId so the message is
    // routed via the tenant's WhatsApp credentials (Baileys session
    // or Meta token), not the cluster-wide env fallback that would
    // identify the outbound as a Don Atento global number.
    if (tenant.phone || tenant.whatsappId) {
      const waTarget = tenant.whatsappId || tenant.phone!;
      const waMessage = `¡Hola ${tenant.firstName}! 🏠 Soy Don Atento. Tu contrato para ${property.title} ha sido aprobado. Tu asesor comercial ${agentName} y yo te damos la bienvenida oficial. ¡Estamos a un mensaje de distancia!`;
      await this.whatsappService.sendMessage(waTarget, waMessage, tenantId);
    }

    // Log the welcome interaction.
    await this.addInteraction(
      prospectId,
      tenantId,
      'ENVÍO KIT DE BIENVENIDA AUTOMÁTICO (EMAIL/WA)',
      InteractionChannel.SYSTEM_AI,
    );
  }

  async convertToClient(prospectId: string, tenantId: string) {
    // Legacy simple conversion path. Block A added the
    // findFirst({ id, tenantId }) tenant guard; Block C replaces the
    // 'PROSPECT_CONVERTED' sentinel passwordHash with a CSPRNG temp
    // password + bcrypt(12) + mustChangePassword=true, and rejects
    // conversion when the prospect lacks a real email (no more
    // @example.com auto-generated zombie accounts).
    const prospect = await this.prisma.prospect.findFirst({
      where: { id: prospectId, tenantId },
    });

    if (!prospect) throw new NotFoundException('Prospect no encontrado.');
    if (!prospect.email) {
      throw new BadRequestException(
        'El prospect no tiene email; completa el dato antes de convertirlo a cliente.',
      );
    }

    const { hash: passwordHash } = await generateTempPasswordHash();

    const user = await this.prisma.user.create({
      data: {
        tenantId,
        email: prospect.email,
        passwordHash,
        mustChangePassword: true,
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
