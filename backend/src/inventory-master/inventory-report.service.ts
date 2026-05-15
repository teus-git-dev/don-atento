import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { WhatsappService } from '../whatsapp/whatsapp.service';

/**
 * Inventory report service.
 *
 * Block C cleanup:
 *  - `generateInventoryPDF` removed. It was 144 lines of pdfkit
 *    layout that no caller invoked AND it had three open bugs:
 *    cross-tenant property lookup (no tenantId filter),
 *    passwordHash leak via `relations.include.user: true`, and
 *    a footer claim that "la firma digital vinculada a este reporte
 *    tiene validez contractual" — a legal misrepresentation since
 *    the PDF carried no actual digital signature. If the feature
 *    returns, it'll be built fresh with the full guard chain
 *    (tenant filter + USER_PUBLIC_SELECT + real digital signature
 *    integration) applied from day 1.
 *  - `sendInventoryReport` now takes the `tenantId` explicitly so
 *    the WhatsApp outbound goes via the tenant's credentials
 *    (whatsapp Block A strict mode) rather than the cluster-wide
 *    WHATSAPP_* env fallback.
 *  - `console.log` for the check-out internal notification replaced
 *    by `Logger`; the hardcoded "Incasa" string is gone.
 */
@Injectable()
export class InventoryReportService {
  private readonly logger = new Logger(InventoryReportService.name);

  constructor(
    private prisma: PrismaService,
    private whatsapp: WhatsappService,
  ) {}

  async sendInventoryReport(
    propertyId: string,
    type: 'CHECK_IN' | 'CHECK_OUT',
    tenantId: string,
  ): Promise<void> {
    const property = await this.prisma.property.findFirst({
      where: { id: propertyId, tenantId },
      include: {
        relations: { include: { user: { select: USER_PUBLIC_SELECT } } },
      },
    });

    if (!property) {
      this.logger.warn(
        `sendInventoryReport: property=${propertyId} not found for tenant=${tenantId}; skipping notification.`,
      );
      return;
    }

    const owner = property.relations.find(
      (r) => r.relationType === 'OWNER',
    )?.user;
    const tenant = property.relations.find(
      (r) => r.relationType === 'TENANT',
    )?.user;

    if (type === 'CHECK_IN') {
      const msg = `✨ Don IQ: Tu reporte de inventario (${type}) para ${property.address} ya está listo.`;
      if (owner?.phone) {
        await this.whatsapp.sendMessage(owner.phone, msg, tenantId);
      }
      if (tenant?.phone) {
        await this.whatsapp.sendMessage(tenant.phone, msg, tenantId);
      }
    } else {
      // CHECK_OUT — internal-only notification surface. Pre-Block-C
      // this was a console.log with a hardcoded "Incasa" string;
      // logged structurally now, ready for a Slack/email hook when
      // the internal-ops surface lands.
      this.logger.log(
        `CHECK_OUT inventory report ready for tenant=${tenantId} property=${propertyId}`,
      );
    }
  }
}

/**
 * Whitelist of User fields safe to expose in inventory-report
 * payloads. Mirrors USER_PUBLIC_SELECT in properties / tickets /
 * workflows / crm / accounting / contracts. Pre-Block-C
 * `relations.include.user: true` returned the full User record
 * including passwordHash — visible to any caller that walked the
 * include chain.
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
