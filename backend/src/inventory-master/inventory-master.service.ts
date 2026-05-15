import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { InventoryReportService } from './inventory-report.service';

@Injectable()
export class InventoryMasterService {
  private readonly logger = new Logger(InventoryMasterService.name);

  // Block C cleanup: `ticketsService` and `templatesService` were
  // injected pre-Block-C to support the dead methods
  // `instantiateFromTemplate` and `createHandover` — both removed in
  // this commit (owner-approved: "menos código es menos superficie").
  // If those flows return, they'll be re-implemented from scratch
  // with the full guard chain (RBAC + tenant scoping + $transaction
  // + audit trail) applied from day 1.
  constructor(
    private prisma: PrismaService,
    private inventoryReport: InventoryReportService,
  ) {}

  async createPropertyInventory(
    propertyId: string,
    tenantId: string,
    data: any,
  ) {
    // Block A: cross-tenant write guard before any DB mutation.
    await this.assertPropertyBelongsToTenant(propertyId, tenantId);

    // Block C: all three persistence groups (zones+items+evidences,
    // meterReadings, accessItems) run inside a single Prisma
    // interactive transaction. Pre-Block-C a failure in accessItems
    // after a successful meterReadings batch left the inventory in
    // a partial state. Per-zone parallelism (Promise.all over
    // data.zones) is preserved inside the tx.
    const result = await this.prisma.$transaction(async (tx) => {
      const zones = await Promise.all(
        data.zones.map((zoneData: any) =>
          tx.zone.create({
            data: {
              propertyId,
              name: zoneData.name,
              type: zoneData.type,
              items: {
                create: zoneData.items.map((item: any) => ({
                  propertyId,
                  category: item.category || 'GENERAL',
                  name: item.name,
                  condition: item.condition || 'GOOD',
                  description: item.description,
                  brand: item.brand,
                  model: item.model,
                  serialNumber: item.serialNumber,
                  material: item.material,
                  isFunctional: item.isFunctional ?? true,
                  technicalDetails: item.technicalDetails,
                  expectedLifespanMonths: item.expectedLifespanMonths,
                  evidences: {
                    create: (item.evidences || []).map((ev: any) => ({
                      evidenceType: ev.type,
                      url: ev.url,
                    })),
                  },
                })),
              },
            },
            include: { items: true },
          }),
        ),
      );

      if (data.meterReadings) {
        await tx.meterReading.createMany({
          data: data.meterReadings.map((reading: any) => ({
            propertyId,
            type: reading.type,
            value: reading.value,
            photoUrl: reading.photoUrl,
          })),
        });
      }

      if (data.accessItems) {
        await tx.propertyAccessItem.createMany({
          data: data.accessItems.map((access: any) => ({
            propertyId,
            type: access.type,
            description: access.description,
            quantity: access.quantity || 1,
            photoUrl: access.photoUrl,
          })),
        });
      }

      return { zones, propertyId };
    });

    // Block C: side effect (WA notification) lives OUTSIDE the tx —
    // it can't be rolled back, and a WA outbound failure shouldn't
    // void a successfully persisted inventory. Fire-and-forget; the
    // failure is logged. tenantId is forwarded so the message is
    // routed via the tenant's WhatsApp credentials (whatsapp Block A
    // strict mode) instead of the cluster-wide env fallback.
    this.inventoryReport
      .sendInventoryReport(propertyId, 'CHECK_IN', tenantId)
      .catch((err) => {
        this.logger.warn(
          `sendInventoryReport failed for property=${propertyId}: ${(err as Error).message}`,
        );
      });

    this.logger.log(
      `Inventory created for property=${propertyId} tenant=${tenantId} zones=${result.zones.length}`,
    );
    return result;
  }

  async getPropertyInventory(propertyId: string, tenantId: string) {
    // Block A: findFirst with composite (id, tenantId) replaces the
    // pre-Block-A findUnique({ id }) that leaked any property of any
    // tenant by enumerated id.
    await this.assertPropertyBelongsToTenant(propertyId, tenantId);

    return this.prisma.property.findFirst({
      where: { id: propertyId, tenantId },
      include: {
        zones: {
          include: { items: { include: { evidences: true } } },
        },
        meterReadings: true,
        accessItems: true,
      },
    });
  }

  async addEvidence(
    itemId: string,
    tenantId: string,
    evidenceType: string,
    url: string,
  ) {
    // Block A: tenant guard via the parent property of the item.
    // InventoryItem has no direct tenantId column — ownership is
    // transitive via property.tenantId.
    //
    // Block D: the URL is no longer body-supplied — it's a signed URL
    // generated server-side by FileUploadService in the controller
    // immediately before this call. Stored-URL-injection vector is
    // gone (the caller can't forge the URL).
    await this.assertInventoryItemBelongsToTenant(itemId, tenantId);

    return this.prisma.inventoryEvidence.create({
      data: {
        inventoryItemId: itemId,
        evidenceType: evidenceType as any,
        url,
      },
    });
  }

  /**
   * Uniform-404 ownership guard. Mirror of the helper added in crm /
   * accounting / contracts Block A. Throws NotFoundException whether
   * the property doesn't exist OR belongs to a different tenant —
   * never 403 (avoids cross-tenant id enumeration).
   */
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

  /**
   * Ownership guard for InventoryItem via the parent property's
   * tenantId. The item itself carries no tenantId column — the
   * relation is transitive.
   */
  private async assertInventoryItemBelongsToTenant(
    itemId: string,
    tenantId: string,
  ): Promise<void> {
    const item = await this.prisma.inventoryItem.findFirst({
      where: { id: itemId, property: { tenantId } },
      select: { id: true },
    });
    if (!item) throw new NotFoundException('Ítem de inventario no encontrado.');
  }
}
