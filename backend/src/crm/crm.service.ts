import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ProspectStatus, ProspectSource, SentimentAnalysis } from '@prisma/client';
import { BrandBrainService } from '../cognitive/brand-brain.service';

@Injectable()
export class CrmService {
  constructor(
    private prisma: PrismaService,
    private brandBrain: BrandBrainService
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
    initialMessage?: string;
  }) {
    let initialSentiment: SentimentAnalysis = SentimentAnalysis.NEUTRAL;
    
    if (data.initialMessage) {
        const alignment = await this.brandBrain.getToneAlignmentScore(data.initialMessage, data.tenantId);
        if (alignment.score > 0.8) initialSentiment = SentimentAnalysis.POSITIVE;
        if (alignment.score < 0.4) initialSentiment = SentimentAnalysis.NEGATIVE;
    }

    return this.prisma.prospect.create({
      data: {
        tenantId: data.tenantId,
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email,
        phone: data.phone,
        whatsappId: data.whatsappId,
        source: data.source || ProspectSource.MANUAL,
        assignedAgentId: data.assignedAgentId,
        status: ProspectStatus.NEW,
        sentiment: initialSentiment,
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
          select: { id: true, firstName: true, lastName: true, email: true }
        }
      },
      orderBy: { updatedAt: 'desc' },
    });
  }

  async createTask(prospectId: string, data: { title: string; description?: string; dueDate?: Date }) {
    return this.prisma.prospectTask.create({
      data: {
        prospectId,
        title: data.title,
        description: data.description,
        dueDate: data.dueDate,
      },
    });
  }

  async updateTask(taskId: string, data: { title?: string; description?: string; dueDate?: Date; isCompleted?: boolean }) {
    return this.prisma.prospectTask.update({
      where: { id: taskId },
      data,
    });
  }

  async deleteTask(taskId: string) {
    return this.prisma.prospectTask.delete({
      where: { id: taskId },
    });
  }

  async updateProspect(id: string, data: any) {
    return this.prisma.prospect.update({
      where: { id },
      data,
    });
  }

  async scoreLead(prospectId: string) {
    const prospect = await this.prisma.prospect.findUnique({
        where: { id: prospectId },
        include: { interactions: true }
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
        qualityLabel: lastSentiment === SentimentAnalysis.POSITIVE ? 'HOT LEAD' : 'WARM',
        nextAction: urgencyScore > 70 ? 'CALL IMMEDIATELY' : 'FOLLOW UP IN 24H'
    };
  }

  async addInteraction(prospectId: string, message: string, channel: any) {
    const prospect = await this.prisma.prospect.findUnique({ where: { id: prospectId } });
    if (!prospect) throw new Error('Prospect not found');

    const alignment = await this.brandBrain.getToneAlignmentScore(message, prospect.tenantId);
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
        data: { sentiment }
    });

    return interaction;
  }

  async getFunnel(tenantId: string) {
    const prospects = await this.prisma.prospect.groupBy({
      by: ['status'],
      where: { tenantId },
      _count: { _all: true },
    });

    return prospects.map(p => ({
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

    return prospects.map(p => ({
      sentiment: p.sentiment,
      count: p._count._all,
    }));
  }

  async convertToClient(prospectId: string, tenantId: string) {
    const prospect = await this.prisma.prospect.findUnique({
      where: { id: prospectId },
    });

    if (!prospect) throw new Error('Prospect not found');

    const user = await this.prisma.user.create({
      data: {
        tenantId,
        email: prospect.email || `client_${prospect.id.substring(0, 8)}@example.com`,
        passwordHash: 'PROSPECT_CONVERTED',
        firstName: prospect.firstName,
        lastName: prospect.lastName || '',
        phone: prospect.phone,
        whatsappId: prospect.whatsappId,
        role: 'TENANT_USER',
      },
    });

    await this.prisma.prospect.update({
      where: { id: prospectId },
      data: { status: ProspectStatus.CLOSED_WON },
    });

    return user;
  }
}
