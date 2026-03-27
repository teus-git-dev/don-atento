import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { InventoryReportService } from './inventory-report.service';
import { TicketsService } from '../tickets/tickets.service';
import { InventoryTemplatesService } from '../inventory-templates/inventory-templates.service';

@Injectable()
export class InventoryMasterService {
  constructor(
    private prisma: PrismaService,
    private inventoryReport: InventoryReportService,
    private ticketsService: TicketsService,
    private templatesService: InventoryTemplatesService,
  ) {}

  async createPropertyInventory(propertyId: string, data: any) {
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

  async getPropertyInventory(propertyId: string) {
    return this.prisma.property.findUnique({
      where: { id: propertyId },
      include: {
        zones: {
          include: { items: { include: { evidences: true } } },
        },
        meterReadings: true,
        accessItems: true,
      },
    });
  }

  async addEvidence(itemId: string, evidenceData: any) {
    return this.prisma.inventoryEvidence.create({
      data: {
        inventoryItemId: itemId,
        evidenceType: evidenceData.type,
        url: evidenceData.url,
      },
    });
  }

  async instantiateFromTemplate(propertyId: string, templateId: string) {
    const template = await this.templatesService.findOne(templateId);
    if (!template) throw new Error('Template not found');

    const property = await this.prisma.property.findUnique({ where: { id: propertyId } });
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

  async createHandover(propertyId: string, type: 'DELIVERY' | 'RETURN' | 'ASSIGNMENT', handoverData: any) {
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
        if (itemUpdate.condition === 'REGULAR' || itemUpdate.condition === 'BAD') {
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
      })
    );

    await this.inventoryReport.sendInventoryReport(propertyId, type as any);

    return { propertyId, type, updates };
  }
}
