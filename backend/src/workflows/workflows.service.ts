import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

/**
 * Whitelist of User fields safe to expose in workflow responses.
 * Excludes `passwordHash`, `refreshTokenHash`, `mustChangePassword`
 * and any internal flag. Mirrors the constant in
 * PropertiesService / TicketsService for consistency.
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
export class WorkflowsService {
  constructor(private prisma: PrismaService) {}

  async findAllByTenant(tenantId: string) {
    return this.prisma.workflow.findMany({
      where: { tenantId },
      include: {
        states: {
          orderBy: { order: 'asc' },
          include: { responsible: { select: USER_PUBLIC_SELECT } },
        },
      },
    });
  }

  async create(data: {
    tenantId: string;
    name: string;
    description?: string;
    states?: any[];
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

  async createState(
    tenantId: string,
    data: {
      workflowId: string;
      name: string;
      order: number;
      assignedRole?: any;
      assignedUserId?: string;
      aiInstructions?: string;
      slaHours?: number;
      color?: string;
    },
  ) {
    // Cross-tenant write guard: the workflow must belong to the caller's
    // tenant before we attach a state to it. Without this, a caller from
    // tenant A could inject states (and SLA / assignedRole) into a
    // workflow of tenant B by just sending its workflowId in the body.
    await this.assertWorkflowBelongsToTenant(data.workflowId, tenantId);

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

  async update(
    id: string,
    tenantId: string,
    data: { name?: string; description?: string },
  ) {
    // updateMany with composite where prevents cross-tenant rename/defacement.
    const result = await this.prisma.workflow.updateMany({
      where: { id, tenantId },
      data,
    });
    if (result.count === 0) {
      throw new NotFoundException('Workflow no encontrado.');
    }
    return this.prisma.workflow.findUnique({ where: { id } });
  }

  async deleteStatesByWorkflow(workflowId: string, tenantId: string) {
    await this.assertWorkflowBelongsToTenant(workflowId, tenantId);

    return this.prisma.workflowState.deleteMany({
      where: { workflowId },
    });
  }

  async delete(id: string, tenantId: string) {
    await this.assertWorkflowBelongsToTenant(id, tenantId);

    // Both the state cleanup and the workflow delete run inside a single
    // interactive transaction: if the workflow delete fails (e.g. tickets
    // still reference workflowId), the state deletions roll back and the
    // workflow stays consistent. Without this we'd leave a stateless
    // workflow row referenced by orphaned tickets.
    return this.prisma.$transaction(async (tx) => {
      await tx.workflowState.deleteMany({ where: { workflowId: id } });
      return tx.workflow.delete({ where: { id } });
    });
  }

  /**
   * Throws NotFoundException if the workflow does not exist OR belongs
   * to a different tenant. Returning the same status for both cases
   * avoids leaking existence of cross-tenant workflows via enumeration.
   */
  private async assertWorkflowBelongsToTenant(
    workflowId: string,
    tenantId: string,
  ): Promise<void> {
    const wf = await this.prisma.workflow.findFirst({
      where: { id: workflowId, tenantId },
      select: { id: true },
    });
    if (!wf) {
      throw new NotFoundException('Workflow no encontrado.');
    }
  }
}
