import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { InventoryReportService } from './inventory-report.service';
import { TicketsService } from '../tickets/tickets.service';
import { InventoryTemplatesService } from '../inventory-templates/inventory-templates.service';

@Injectable()
export class InventoryMasterService {
  // Block C will retire `templatesService` and `ticketsService` along
  // with the dead `instantiateFromTemplate` and `createHandover`
  // methods that consume them. They stay injected here only so the
  // intermediate Block A / B states compile.
  constructor(
    private prisma: PrismaService,
    private inventoryReport: InventoryReportService,
    private ticketsService: TicketsService,
    private templatesService: InventoryTemplatesService,
  ) {}

  async createPropertyInventory(
    propertyId: string,
    tenantId: string,
    data: any,
  ) {
    // Block A: cross-tenant write guard. Pre-Block-A the controller
    // accepted propertyId from the URL and persisted zones / items /
    // meterReadings / accessItems against it with no ownership
    // check — Prisma only validates that the Property FK exists.
    await this.assertPropertyBelongsToTenant(propertyId, tenantId);
    // 1. Create Zones and Items
    const zones = await Promise.all(
      data.zones.map(async (zoneData: any) => {
        return this.prisma.zone.create({
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
        });
      }),
    );

    // 2. Create Meter Readings
    if (data.meterReadings) {
      await this.prisma.meterReading.createMany({
        data: data.meterReadings.map((reading: any) => ({
          propertyId,
          type: reading.type,
          value: reading.value,
          photoUrl: reading.photoUrl,
        })),
      });
    }

    // 3. Create Access Items
    if (data.accessItems) {
      await this.prisma.propertyAccessItem.createMany({
        data: data.accessItems.map((access: any) => ({
          propertyId,
          type: access.type,
          description: access.description,
          quantity: access.quantity || 1,
          photoUrl: access.photoUrl,
        })),
      });
    }
    // 4. Trigger Automated Report (Check-in by default for new creations)
    await this.inventoryReport.sendInventoryReport(propertyId, 'CHECK_IN');

    return { zones, propertyId };
  }

  async getPropertyInventory(propertyId: string, tenantId: string) {
    // Block A: findFirst with composite (id, tenantId) replaces the
    // pre-Block-A findUnique({ id }) that leaked any property of any
    // tenant by enumerated id. Returns null when foreign — caller can
    // turn that into 404 (or we throw here; for now we preserve the
    // legacy nullable return so the frontend keeps rendering).
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

  async addEvidence(itemId: string, tenantId: string, evidenceData: any) {
    // Block A: tenant guard via the parent property of the item.
    // InventoryItem has no direct tenantId column — ownership is
    // transitive via property.tenantId. Pre-Block-A any caller could
    // attach evidence (with arbitrary URL — addressed further in
    // Blocks B/D) to any item by enumerated id.
    await this.assertInventoryItemBelongsToTenant(itemId, tenantId);

    return this.prisma.inventoryEvidence.create({
      data: {
        inventoryItemId: itemId,
        evidenceType: evidenceData.type,
        url: evidenceData.url,
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

  async instantiateFromTemplate(
    propertyId: string,
    templateId: string,
    tenantId: string,
  ) {
    const template = await this.templatesService.findOne(templateId, tenantId);
    if (!template) throw new Error('Template not found');

    const property = await this.prisma.property.findUnique({
      where: { id: propertyId },
    });
    if (!property) throw new Error('Property not found');

    // Create zones and items from template
    const zones = await Promise.all(
      template.zones.map(async (templateZone: any) => {
        return this.prisma.zone.create({
          data: {
            propertyId,
            name: templateZone.name,
            type: templateZone.type,
            items: {
              create: templateZone.templateItems.map((tItem: any) => ({
                propertyId,
                category: tItem.category,
                name: tItem.name,
                condition: 'GOOD', // Default for initial check-in
                description: tItem.description,
                material: tItem.material,
                quantity: 1,
              })),
            },
          },
          include: { items: true },
        });
      }),
    );

    return { zones, propertyId };
  }

  async createHandover(
    propertyId: string,
    type: 'DELIVERY' | 'RETURN' | 'ASSIGNMENT',
    handoverData: any,
  ) {
    // handoverData should contain the list of item updates: { itemId, condition, comments, evidences }

    const updates = await Promise.all(
      handoverData.items.map(async (itemUpdate: any) => {
        const updatedItem: any = await this.prisma.inventoryItem.update({
          where: { id: itemUpdate.itemId },
          data: {
            condition: itemUpdate.condition,
            comments: itemUpdate.comments,
            evidences: {
              create: (itemUpdate.evidences || []).map((ev: any) => ({
                evidenceType: ev.type,
                url: ev.url,
              })),
            },
          },
          include: { property: true },
        });

        // Auto-Ticket Logic: If regular or bad, create a ticket
        if (
          itemUpdate.condition === 'REGULAR' ||
          itemUpdate.condition === 'BAD'
        ) {
          await this.ticketsService.createTicket({
            tenantId: updatedItem.property.tenantId,
            propertyId,
            reportedByUserId: handoverData.userId, // The agent performing the handover
            title: `Reparación: ${updatedItem.name} (${type})`,
            description: `Se detectó estado ${itemUpdate.condition} durante el proceso de ${type}. Comentarios: ${itemUpdate.comments || 'Sin comentarios'}.`,
            priority: 'MEDIUM',
            severity: itemUpdate.condition === 'BAD' ? 'HIGH' : 'MEDIUM',
            inventoryItemId: updatedItem.id,
          } as any);
        }

        return updatedItem;
      }),
    );

    await this.inventoryReport.sendInventoryReport(propertyId, type as any);

    return { propertyId, type, updates };
  }
}
