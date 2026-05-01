import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcrypt';

@Injectable()
export class PropertiesService {
  constructor(private prisma: PrismaService) {}

  async create(data: any) {
    // Geocoding Simulation: Resolving coordinates based on address
    let latitude = data.latitude;
    let longitude = data.longitude;

    if (!latitude || !longitude) {
      // Logic would call Google Geocoding API here
      // For simulation, we generate consistent random-ish coords for the address string
      const seed = data.address.length;
      latitude = 4.6097 + (seed % 100) / 1000;
      longitude = -74.0817 + (seed % 100) / 1000;
    }

    const { ownerInfo, tenantInfo, attachments, ...propertyFields } = data;

    const property = await this.prisma.property.create({
      data: {
        tenantId: propertyFields.tenantId,
        title: propertyFields.title,
        propertyType: propertyFields.propertyType,
        address: propertyFields.address,
        city: propertyFields.city,
        department: propertyFields.department,
        country: propertyFields.country,
        areaM2: propertyFields.areaM2,
        rooms: propertyFields.rooms,
        bathrooms: propertyFields.bathrooms,
        status: propertyFields.status,
        propertyCode: propertyFields.propertyCode,
        isVip: propertyFields.isVip || false,
        workflowId: propertyFields.workflowId,
        rentAmount: propertyFields.rentAmount,
        adminAmount: propertyFields.adminAmount,
        taxAmount: propertyFields.taxAmount,
        managementName: propertyFields.managementName,
        managementNit: propertyFields.managementNit,
        managementEmail: propertyFields.managementEmail,
        managementPhone: propertyFields.managementPhone,

        splatUrl: propertyFields.splatUrl,
        visionVideoUrl: propertyFields.visionVideoUrl,
        attachments: attachments || [],
        visionAnalysis: propertyFields.visionAnalysis,
        latitude,
        longitude,
      },
    });

    // 1. Handle Owner Persistence
    if (ownerInfo && ownerInfo.name) {
      // Find or create owner user — search by real email or phone only, never with placeholder strings
      const ownerLookupConditions: any[] = [];
      if (ownerInfo.email)
        ownerLookupConditions.push({ email: ownerInfo.email });
      if (ownerInfo.phone)
        ownerLookupConditions.push({ phone: ownerInfo.phone });

      let ownerUser =
        ownerLookupConditions.length > 0
          ? await this.prisma.user.findFirst({
              where: { 
                tenantId: propertyFields.tenantId,
                OR: ownerLookupConditions 
              },
            })
          : null;

      if (!ownerUser) {
        // Generate a temporary password securely hashed
        const tempPassword = `TempOwner_${Date.now()}!`;
        const passwordHash = await bcrypt.hash(tempPassword, 10);

        ownerUser = await this.prisma.user.create({
          data: {
            tenantId: propertyFields.tenantId,
            email: ownerInfo.email || `owner_${Date.now()}@teus.com`,
            passwordHash,
            firstName: ownerInfo.name,
            lastName: ownerInfo.lastName || 'Propietario',
            role: 'OWNER',
            phone: ownerInfo.phone,
            personType: ownerInfo.personType,
            isTaxDeclarant: ownerInfo.isTaxDeclarant || false,
            regimeType: ownerInfo.regimeType,
            applyReteIva: ownerInfo.applyReteIva || false,
            applyReteFuente: ownerInfo.applyReteFuente || false,
            applyReteIca: ownerInfo.applyReteIca || false,
          },
        });
      }

      await this.prisma.propertyRelation.create({
        data: {
          propertyId: property.id,
          userId: ownerUser.id,
          relationType: 'OWNER',
          startDate: new Date(),
          status: 'ACTIVE',
        },
      });
    }

    // 2. Handle Tenant Persistence (if RENTED)
    if (tenantInfo && tenantInfo.firstName) {
      // Search by real email or governmentId only — avoid placeholder values
      const tenantLookupConditions: any[] = [];
      if (tenantInfo.email)
        tenantLookupConditions.push({ email: tenantInfo.email });
      if (tenantInfo.governmentId)
        tenantLookupConditions.push({ governmentId: tenantInfo.governmentId });

      let tenantUser =
        tenantLookupConditions.length > 0
          ? await this.prisma.user.findFirst({
              where: { 
                tenantId: propertyFields.tenantId,
                OR: tenantLookupConditions 
              },
            })
          : null;

      if (!tenantUser) {
        const tempPassword = `TempTenant_${Date.now()}!`;
        const passwordHash = await bcrypt.hash(tempPassword, 10);

        tenantUser = await this.prisma.user.create({
          data: {
            tenantId: propertyFields.tenantId,
            email: tenantInfo.email || `tenant_${Date.now()}@teus.com`,
            passwordHash,
            firstName: tenantInfo.firstName,
            lastName: tenantInfo.lastName,
            role: 'TENANT_USER',
            phone: tenantInfo.phone,
            governmentId: tenantInfo.governmentId,
            personType: tenantInfo.personType || 'NATURAL',
          },
        });
      }

      await this.prisma.propertyRelation.create({
        data: {
          propertyId: property.id,
          userId: tenantUser.id,
          relationType: 'TENANT',
          startDate: tenantInfo.contractStart
            ? new Date(tenantInfo.contractStart)
            : new Date(),
          endDate: tenantInfo.contractEnd
            ? new Date(tenantInfo.contractEnd)
            : null,
          contractNumber: propertyFields.propertyCode, // Enforce same ID
          contractType: tenantInfo.contractType,
          status: 'ACTIVE',
        },
      });
    }

    // If an inventory template was selected, apply it
    if (data.inventoryTemplateId) {
      const template = await this.prisma.inventoryTemplate.findUnique({
        where: { id: data.inventoryTemplateId },
        include: {
          items: true,
          zones: { include: { items: true } },
        },
      });

      if (template) {
        // Handle flat items (Legacy)
        const legacyItems = template.items.map((item: any) => ({
          propertyId: property.id,
          name: item.name,
          category: item.category,
          condition: 'GOOD' as any,
          description: `Generado desde plantilla (flat): ${item.material || ''} ${item.description || ''}`,
        }));

        // Handle structured zones (Advanced Constructor)
        const structuredItems: any[] = [];
        for (const zone of template.zones) {
          // Find or create zone for the property based on template zone name
          const propZone = await this.prisma.zone.create({
            data: {
              propertyId: property.id,
              name: zone.name,
              type: zone.type,
            },
          });

          for (const item of zone.items) {
            structuredItems.push({
              propertyId: property.id,
              zoneId: propZone.id,
              name: item.name,
              category: item.category,
              condition: 'GOOD' as any,
              description: `Generado desde zona ${zone.name}: ${item.material || ''} ${item.description || ''}`,
            });
          }
        }

        if (legacyItems.length > 0) {
          await this.prisma.inventoryItem.createMany({ data: legacyItems });
        }
        if (structuredItems.length > 0) {
          await this.prisma.inventoryItem.createMany({ data: structuredItems });
        }
      }
    }

    return property;
  }

  async findAllByTenant(tenantId: string) {
    return this.prisma.property.findMany({
      where: { tenantId },
      include: {
        assignments: {
          include: { agent: true },
        },
        relations: {
          include: { user: true },
        },
        inventoryItems: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string, tenantId: string) {
    return this.prisma.property.findFirst({
      where: { id, tenantId },
      include: {
        relations: {
          include: { user: true },
        },
      },
    });
  }

  async updateStatus(id: string, tenantId: string, isActive: boolean) {
    return this.prisma.property.updateMany({
      where: { id, tenantId },
      data: { isActive },
    });
  }

  async findByPropertyCode(tenantId: string, propertyCode: string) {
    return this.prisma.property.findFirst({
      where: { tenantId, propertyCode },
      include: {
        relations: {
          include: { user: true },
        },
      },
    });
  }

  async findOneDetail(id: string, tenantId: string) {
    return this.prisma.property.findFirst({
      where: { id, tenantId },
      include: {
        relations: {
          include: { user: true },
        },
      },
    });
  }

  async update(id: string, tenantId: string, data: any) {
    const { ownerInfo, tenantInfo, attachments, ...propertyFields } = data;

    // Update basic fields
    const property = await this.prisma.property.updateMany({
      where: { id, tenantId },
      data: {
        title: propertyFields.title,
        propertyType: propertyFields.propertyType,
        address: propertyFields.address,
        city: propertyFields.city,
        department: propertyFields.department,
        country: propertyFields.country,
        areaM2: propertyFields.areaM2,
        rooms: propertyFields.rooms,
        bathrooms: propertyFields.bathrooms,
        status: propertyFields.status,
        propertyCode: propertyFields.propertyCode,
        isVip: propertyFields.isVip,
        workflowId: propertyFields.workflowId,
        rentAmount: propertyFields.rentAmount,
        adminAmount: propertyFields.adminAmount,
        taxAmount: propertyFields.taxAmount,
        managementName: propertyFields.managementName,
        managementNit: propertyFields.managementNit,
        managementEmail: propertyFields.managementEmail,
        managementPhone: propertyFields.managementPhone,

        splatUrl: propertyFields.splatUrl,
        visionVideoUrl: propertyFields.visionVideoUrl,
        attachments: attachments || [],
        visionAnalysis: propertyFields.visionAnalysis,
        latitude: propertyFields.latitude,
        longitude: propertyFields.longitude,
      },
    });

    // Update or Create Owner Relation
    if (ownerInfo && ownerInfo.name) {
      let ownerUser = await this.prisma.user.findFirst({
        where: {
          tenantId: tenantId,
          OR: [
            { email: ownerInfo.email || 'pending' },
            { phone: ownerInfo.phone },
          ],
        },
      });

      if (!ownerUser) {
        ownerUser = await this.prisma.user.create({
          data: {
            tenantId: tenantId,
            email: ownerInfo.email || `owner_${Date.now()}@teus.com`,
            passwordHash: 'vault_autogenerated',
            firstName: ownerInfo.name,
            lastName: ownerInfo.lastName || 'Propietario',
            role: 'OWNER',
            phone: ownerInfo.phone,
            personType: ownerInfo.personType,
            isTaxDeclarant: ownerInfo.isTaxDeclarant,
            regimeType: ownerInfo.regimeType,
            applyReteIva: ownerInfo.applyReteIva,
            applyReteFuente: ownerInfo.applyReteFuente,
            applyReteIca: ownerInfo.applyReteIca,
          },
        });
      } else {
        // Update existing owner with new tax info if provided
        await this.prisma.user.update({
          where: { id: ownerUser.id },
          data: {
            firstName: ownerInfo.name,
            personType: ownerInfo.personType,
            isTaxDeclarant: ownerInfo.isTaxDeclarant,
            regimeType: ownerInfo.regimeType,
            applyReteIva: ownerInfo.applyReteIva,
            applyReteFuente: ownerInfo.applyReteFuente,
            applyReteIca: ownerInfo.applyReteIca,
          },
        });
      }
      // Check if relation exists
      const existingRel = await this.prisma.propertyRelation.findFirst({
        where: { propertyId: id, relationType: 'OWNER' },
      });

      if (existingRel) {
        await this.prisma.propertyRelation.update({
          where: { id: existingRel.id },
          data: { userId: ownerUser.id },
        });
      } else {
        await this.prisma.propertyRelation.create({
          data: {
            propertyId: id,
            userId: ownerUser.id,
            relationType: 'OWNER',
            startDate: new Date(),
            status: 'ACTIVE',
          },
        });
      }
    }

    // Sync contractNumber for the active tenant relation
    if (propertyFields.propertyCode) {
      const activeTenantRel = await this.prisma.propertyRelation.findFirst({
        where: { propertyId: id, relationType: 'TENANT', status: 'ACTIVE' },
      });

      if (activeTenantRel) {
        await this.prisma.propertyRelation.update({
          where: { id: activeTenantRel.id },
          data: { contractNumber: propertyFields.propertyCode },
        });
      }
    }

    return property;
  }

  async transferProperty(
    propertyId: string,
    tenantId: string,
    data: { newOwnerId: string; newTenantId?: string; startDate: string },
  ) {
    // 0. Verify property belongs to tenant before proceeding
    const property = await this.prisma.property.findFirst({
      where: { id: propertyId, tenantId },
    });
    if (!property) return { error: 'Property not found or access denied' };

    // 1. Inactivate existing ACTIVE relations
    await this.prisma.propertyRelation.updateMany({
      where: {
        propertyId,
        status: 'ACTIVE',
      },
      data: {
        status: 'HISTORIC',
        endDate: new Date(data.startDate),
      },
    });

    // 2. Create new Owner relation
    const newOwner = await this.prisma.propertyRelation.create({
      data: {
        propertyId,
        userId: data.newOwnerId,
        relationType: 'OWNER',
        startDate: new Date(data.startDate),
        status: 'ACTIVE',
      },
    });

    // 3. Create new Tenant relation if provided
    let newTenant;
    if (data.newTenantId) {
      newTenant = await this.prisma.propertyRelation.create({
        data: {
          propertyId,
          userId: data.newTenantId,
          relationType: 'TENANT',
          startDate: new Date(data.startDate),
          status: 'ACTIVE',
          contractNumber: (await this.findOne(propertyId, tenantId))?.propertyCode, // Sync code
        },
      });
    }

    return { newOwner, newTenant };
  }
}
