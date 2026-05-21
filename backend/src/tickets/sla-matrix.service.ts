import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class SlaMatrixService {
  constructor(private readonly prisma: PrismaService) {}

  async calculateDueDate(ticketId: string): Promise<Date> {
    const ticket = await this.prisma.ticket.findUnique({
      where: { id: ticketId },
      include: {
        property: true,
        currentState: true,
        stateLogs: {
          where: { completedAt: null },
          orderBy: { startedAt: 'desc' },
          take: 1,
        },
      },
    });

    if (!ticket) return new Date();

    // 1. Base SLA from Workflow State (hours)
    let slaHours = ticket.currentState?.slaHours || 24;

    // 2. Modifier: VIP Property (Plug & Play vision)
    if (ticket.property.isVip) {
      slaHours = Math.ceil(slaHours * 0.5); // Reduce by 50%
    }

    // 3. Modifier: Priority/Severity
    if (ticket.priority === 'URGENT' || ticket.severity === 'CRITICAL') {
      slaHours = Math.min(slaHours, 4); // Capped at 4 hours for critical issues
    } else if (ticket.priority === 'HIGH' || ticket.severity === 'HIGH') {
      slaHours = Math.ceil(slaHours * 0.75); // Reduce by 25%
    }

    const baseDate =
      ticket.stateLogs?.find(
        (l: { stateId: string | null; completedAt: Date | null }) =>
          l.stateId === ticket.currentStateId && !l.completedAt,
      )?.startedAt || ticket.createdAt;
    const dueDate = new Date(baseDate);
    dueDate.setHours(dueDate.getHours() + slaHours);

    return dueDate;
  }
}
