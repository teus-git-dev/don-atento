import { Injectable, Logger } from '@nestjs/common';
import { PropertyType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { PropertiesService } from '../properties/properties.service';

// ─── Finca Raiz Webhook payload shapes ───────────────────────────────────────
// These interfaces reflect the fields that the code accesses from the external
// webhook. The external API may send additional unknown keys — that's fine, as
// we only extract what we need and leave the rest untouched.

interface FincaRaizPropertyData {
  title?: string;
  address?: string;
  city?: string;
  state?: string;
  area?: number;
  rooms?: number;
  bathrooms?: number;
  type?: string;
  externalId?: string;
  price?: number;
}

interface FincaRaizLeadData {
  name?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  listingId?: string;
}

interface FincaRaizWebhookPayload {
  type?: string;
  propertyData?: FincaRaizPropertyData;
  lead?: FincaRaizLeadData;
  // Lead fields may appear at the top level when there's no `lead` wrapper
  name?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  listingId?: string;
}

@Injectable()
export class IntegrationsService {
  private readonly logger = new Logger(IntegrationsService.name);

  constructor(
    private prisma: PrismaService,
    private propertiesService: PropertiesService,
  ) {}

  async handleFincaRaizWebhook(tenantId: string, data: FincaRaizWebhookPayload) {
    this.logger.log(`Received Finca Raiz Webhook for tenant: ${tenantId}`);

    // 1. Determine if it's a Property or a Prospect
    // Finca Raiz webhooks usually come from a lead or a new listing
    if (data.type === 'NEW_LISTING' || data.propertyData) {
      return this.handleNewListing(tenantId, data);
    } else {
      return this.handleNewLead(tenantId, data);
    }
  }

  private async handleNewListing(tenantId: string, data: FincaRaizWebhookPayload) {
    const propertyData = data.propertyData ?? {};

    // Map Finca Raiz fields to Don Atento Property
    const newProperty = await this.propertiesService.create({
      tenantId,
      title: propertyData.title ?? `Finca Raiz: ${propertyData.address ?? ''}`,
      propertyType: this.mapPropertyType(propertyData.type ?? ''),
      address: propertyData.address,
      city: propertyData.city,
      department: propertyData.state,
      country: 'Colombia', // Default for Finca Raiz
      areaM2: propertyData.area,
      rooms: propertyData.rooms,
      bathrooms: propertyData.bathrooms,
      status: 'AVAILABLE',
      propertyCode: propertyData.externalId ?? `FR-${Date.now()}`,
      rentAmount: propertyData.price,
      // Integration specific metadata
      visionAnalysis: `Imported via Finca Raiz Webhook on ${new Date().toISOString()}`,
    });

    this.logger.log(`Property auto-created from Finca Raiz: ${newProperty.id}`);
    return { status: 'SUCCESS', type: 'PROPERTY', id: newProperty.id };
  }

  private async handleNewLead(tenantId: string, data: FincaRaizWebhookPayload) {
    // Lead fields may appear under `data.lead` or directly on `data`
    const leadData: FincaRaizLeadData = data.lead ?? data;

    // Map to Prospect
    const prospect = await this.prisma.prospect.create({
      data: {
        tenantId,
        firstName: leadData.name ?? 'Finca Raiz Prospect',
        lastName: leadData.lastName ?? '',
        email: leadData.email,
        phone: leadData.phone,
        source: 'WEB',
        status: 'NEW',
        interactions: {
          create: {
            // P0.1 — `tenantId` must be set on the nested ProspectInteraction
            // even though it lives under a Prospect being created in the same
            // statement. The FK from ProspectInteraction → Prospect uses
            // `prospectId` only, so the child row doesn't auto-inherit the
            // parent's tenantId.
            tenantId,
            channel: 'SYSTEM_AI',
            message: `Lead automatically created from Finca Raiz webhook. Interest in listing: ${leadData.listingId ?? 'N/A'}`,
          },
        },
      },
    });

    this.logger.log(`Prospect auto-created from Finca Raiz: ${prospect.id}`);
    return { status: 'SUCCESS', type: 'PROSPECT', id: prospect.id };
  }

  private mapPropertyType(frType: string): PropertyType {
    const mapping: Record<string, PropertyType> = {
      Apartamento: PropertyType.APARTMENT,
      Casa: PropertyType.HOUSE,
      Oficina: PropertyType.OFFICE,
      Bodega: PropertyType.WAREHOUSE,
      Local: PropertyType.OFFICE,
    };
    return mapping[frType] ?? PropertyType.APARTMENT;
  }
}
