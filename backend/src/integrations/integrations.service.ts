import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PropertiesService } from '../properties/properties.service';

@Injectable()
export class IntegrationsService {
  private readonly logger = new Logger(IntegrationsService.name);

  constructor(
    private prisma: PrismaService,
    private propertiesService: PropertiesService,
  ) {}

  async handleFincaRaizWebhook(tenantId: string, data: any) {
    this.logger.log(`Received Finca Raiz Webhook for tenant: ${tenantId}`);

    // 1. Determine if it's a Property or a Prospect
    // Finca Raiz webhooks usually come from a lead or a new listing
    if (data.type === 'NEW_LISTING' || data.propertyData) {
      return this.handleNewListing(tenantId, data);
    } else {
      return this.handleNewLead(tenantId, data);
    }
  }

  private async handleNewListing(tenantId: string, data: any) {
    const propertyData = data.propertyData;

    // Map Finca Raiz fields to Don Atento Property
    const newProperty = await this.propertiesService.create({
      tenantId,
      title: propertyData.title || `Finca Raiz: ${propertyData.address}`,
      propertyType: this.mapPropertyType(propertyData.type),
      address: propertyData.address,
      city: propertyData.city,
      department: propertyData.state,
      country: 'Colombia', // Default for Finca Raiz
      areaM2: propertyData.area,
      rooms: propertyData.rooms,
      bathrooms: propertyData.bathrooms,
      status: 'AVAILABLE',
      propertyCode: propertyData.externalId || `FR-${Date.now()}`,
      rentAmount: propertyData.price,
      // Integration specific metadata
      visionAnalysis: `Imported via Finca Raiz Webhook on ${new Date().toISOString()}`,
    });

    this.logger.log(`Property auto-created from Finca Raiz: ${newProperty.id}`);
    return { status: 'SUCCESS', type: 'PROPERTY', id: newProperty.id };
  }

  private async handleNewLead(tenantId: string, data: any) {
    const leadData = data.lead || data;

    // Map to Prospect
    const prospect = await this.prisma.prospect.create({
      data: {
        tenantId,
        firstName: leadData.name || 'Finca Raiz Prospect',
        lastName: leadData.lastName || '',
        email: leadData.email,
        phone: leadData.phone,
        source: 'WEB',
        status: 'NEW',
        interactions: {
          create: {
            channel: 'SYSTEM_AI',
            message: `Lead automatically created from Finca Raiz webhook. Interest in listing: ${leadData.listingId || 'N/A'}`,
          },
        },
      },
    });

    this.logger.log(`Prospect auto-created from Finca Raiz: ${prospect.id}`);
    return { status: 'SUCCESS', type: 'PROSPECT', id: prospect.id };
  }

  private mapPropertyType(frType: string): string {
    const mapping: Record<string, string> = {
      Apartamento: 'APARTMENT',
      Casa: 'HOUSE',
      Oficina: 'OFFICE',
      Bodega: 'WAREHOUSE',
      Local: 'OFFICE',
    };
    return mapping[frType] || 'APARTMENT';
  }
}
