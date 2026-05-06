import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class WorkflowsService {
  constructor(private prisma: PrismaService) {}

  async findAllByTenant(tenantId: string) {
    return this.prisma.workflow.findMany({
      where: { tenantId },
      include: {
        states: {
          orderBy: { order: 'asc' },
          include: { responsible: true },
        },
      },
    });
  }

  async create(data: {
    tenantId: string;
    name: string;
    description?: string;
    states?: any[]; // Added support for complete flow creation
  }) {
    const { states, ...workflowData } = data;

    return this.prisma.workflow.create({
      data: {
        ...workflowData,
        states: states
          ? {
              create: states.map((state, index) => ({
                name: state.name,
                order: state.order || index + 1,
                slaHours: state.slaHours ? Number(state.slaHours) : null,
                assignedRole: state.assignedRole,
                assignedUserId: state.assignedUserId,
                aiInstructions: state.aiInstructions,
                color: state.color,
              })),
            }
          : undefined,
      },
      include: {
        states: true,
      },
    });
  }

  async createState(data: {
    workflowId: string;
    name: string;
    order: number;
    assignedRole?: any;
    assignedUserId?: string;
    aiInstructions?: string;
    slaHours?: number;
    color?: string;
  }) {
    return this.prisma.workflowState.create({
      data: {
        ...data,
        slaHours: data.slaHours ? Number(data.slaHours) : null,
      },
    });
  }

  async getInitialState(workflowId: string) {
    const firstState = await this.prisma.workflowState.findFirst({
      where: { workflowId },
      orderBy: { order: 'asc' },
    });
    return firstState;
  }

  async update(id: string, data: { name?: string; description?: string }) {
    return this.prisma.workflow.update({
      where: { id },
      data,
    });
  }

  async deleteStatesByWorkflow(workflowId: string) {
    return this.prisma.workflowState.deleteMany({
      where: { workflowId },
    });
  }

  async delete(id: string) {
    // Delete associated states first to prevent foreign key constraint errors
    await this.prisma.workflowState.deleteMany({
      where: { workflowId: id },
    });
    
    return this.prisma.workflow.delete({
      where: { id },
    });
  }
}
