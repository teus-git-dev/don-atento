import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class WorkflowsService {
  constructor(private prisma: PrismaService) {}

  async findAllByTenant(tenantId: string) {
    return this.prisma.workflow.findMany({
      where: { tenantId },
      include: { states: { orderBy: { order: 'asc' } } },
    });
  }

  async create(data: { tenantId: string; name: string; description?: string }) {
    return this.prisma.workflow.create({
      data,
    });
  }

  async createState(data: {
    workflowId: string;
    name: string;
    order: number;
    assignedRole?: any;
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
}
