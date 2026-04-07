import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class MaintenancePredictorService {
  constructor(private prisma: PrismaService) {}

  async calculatePropertyHealthScore(
    propertyId: string,
  ): Promise<{ score: number; status: string; recommendations: string[] }> {
    const property = await this.prisma.property.findUnique({
      where: { id: propertyId },
      include: {
        tickets: {
          where: {
            createdAt: {
              gte: new Date(Date.now() - 180 * 24 * 60 * 60 * 1000),
            },
          }, // Last 6 months
          include: { currentState: true },
        },
        inventoryItems: true,
      },
    });

    if (!property)
      return { score: 100, status: 'HEALTHY', recommendations: [] };

    let score = 100;
    const recommendations: string[] = [];

    // 1. Ticket Impact
    const ticketCount = property.tickets.length;
    score -= ticketCount * 2; // -2 per ticket in 6 months

    const criticalTickets = property.tickets.filter(
      (t) => t.severity === 'CRITICAL',
    ).length;
    score -= criticalTickets * 10;

    // 2. VIP Logic: VIP properties are more sensitive to score drops
    const vipMultiplier = property.isVip ? 1.5 : 1.0;
    score = 100 - (100 - score) * vipMultiplier;

    // 3. Inventory Impact (Simulation)
    const oldItems = property.inventoryItems.filter((item) => {
      // If age > 90% of expected life, decrease score
      // For simplicity, we assume some items are "aged" if they have no inspection in 3 months
      return (
        !item.lastInspectionDate ||
        Date.now() - new Date(item.lastInspectionDate).getTime() >
          90 * 24 * 60 * 60 * 1000
      );
    }).length;

    score -= oldItems * 3;

    // Ensure range 0-100
    score = Math.max(0, Math.min(100, Math.round(score)));

    // 4. Status and Recommendations
    let status = 'HEALTHY';
    if (score < 40) {
      status = 'CRITICAL';
      recommendations.push(
        'Revisión técnica de infraestructura inmediata requerida.',
      );
    } else if (score < 75) {
      status = 'WARNING';
      recommendations.push(
        'Programar mantenimiento preventivo de sistemas hidráulicos.',
      );
    }

    if (oldItems > 0) {
      recommendations.push(
        `Inspeccionar ${oldItems} ítems de inventario con mantenimiento vencido.`,
      );
    }

    return { score, status, recommendations };
  }
}
