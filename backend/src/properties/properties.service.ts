import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcrypt';
import * as fs from 'fs';

@Injectable()
export class PropertiesService {
  constructor(private prisma: PrismaService) {}

  async create(data: any) {
    try {
      const safeDate = (d: any) => {
        if (!d) return null;
        const date = new Date(d);
        return isNaN(date.getTime()) ? null : date;
      };

      const ownerInfo = data.ownerInfo;
      const tenantInfo = data.tenantInfo;
      const attachments = data.attachments;
      const propertyFields = data;

      // Ensure propertyType is a valid enum value
      const validTypes = [
        'APARTMENT',
        'HOUSE',
        'BUILDING',
        'WAREHOUSE',
        'OFFICE',
      ];
      const rawType = propertyFields.propertyType;
      const sanitizedPropertyType = validTypes.includes(rawType)
        ? rawType
        : 'HOUSE';

      let property: any;
      try {
        property = await this.prisma.property.create({
          data: {
            tenantId: propertyFields.tenantId,
            title: propertyFields.title,
            propertyType: sanitizedPropertyType,
            address: propertyFields.address,
            city: propertyFields.city,
            department: propertyFields.department,
            country: propertyFields.country,
            areaM2: propertyFields.areaM2
              ? Number(propertyFields.areaM2)
              : null,
            rooms: propertyFields.rooms ? Number(propertyFields.rooms) : null,
            bathrooms: propertyFields.bathrooms
              ? Number(propertyFields.bathrooms)
              : null,
            status: propertyFields.status,
            propertyCode: propertyFields.propertyCode || null,
            isVip: propertyFields.isVip || false,
            workflowId: propertyFields.workflowId || null,
            rentAmount: propertyFields.rentAmount
              ? Number(propertyFields.rentAmount)
              : null,
            adminAmount: propertyFields.adminAmount
              ? Number(propertyFields.adminAmount)
              : null,
            taxAmount: propertyFields.taxAmount
              ? Number(propertyFields.taxAmount)
              : null,
            managementName: propertyFields.managementName || null,
            managementNit: propertyFields.managementNit || null,
            managementEmail: propertyFields.managementEmail || null,
            managementPhone: propertyFields.managementPhone || null,
            splatUrl: propertyFields.splatUrl || null,
            visionVideoUrl: propertyFields.visionVideoUrl || null,
            attachments: attachments || [],
            visionAnalysis: propertyFields.visionAnalysis || null,
            latitude: data.latitude || 4.6097,
            longitude: data.longitude || -74.0817,
          },
        });
      } catch (err) {
        console.error('[PropertiesService] Error creating property:', err);
        throw new Error(`Error en creación de propiedad: ${err.message}`);
      }

      // 1. Handle Owner Persistence
      if (ownerInfo && ownerInfo.name) {
        const ownerLookupConditions: any[] = [];
        if (ownerInfo.email)
          ownerLookupConditions.push({ email: ownerInfo.email });
        if (ownerInfo.phone)
          ownerLookupConditions.push({ phone: ownerInfo.phone });
        if (ownerInfo.id)
          ownerLookupConditions.push({ governmentId: ownerInfo.id });

        let ownerUser =
          ownerLookupConditions.length > 0
            ? await this.prisma.user.findFirst({
                where: {
                  tenantId: propertyFields.tenantId,
                  OR: ownerLookupConditions,
                },
              })
            : null;

        if (!ownerUser) {
          const tempPassword = `TempOwner_${Date.now()}!`;
          const passwordHash = await bcrypt.hash(tempPassword, 10);

          const nameParts = (ownerInfo.name || 'Propietario').trim().split(' ');
          const firstName = nameParts[0];
          const lastName = nameParts.slice(1).join(' ') || 'Propietario';

          ownerUser = await this.prisma.user.create({
            data: {
              tenantId: propertyFields.tenantId,
              email: ownerInfo.email || `owner_${Date.now()}@teus.com`,
              passwordHash,
              firstName,
              lastName,
              governmentId: ownerInfo.id || null,
              role: 'OWNER',
              phone: ownerInfo.phone || null,
              personType: ownerInfo.personType || null,
              isTaxDeclarant: ownerInfo.isTaxDeclarant || false,
              regimeType: ownerInfo.regimeType || null,
              applyReteIva: ownerInfo.applyReteIva || false,
              applyReteFuente: ownerInfo.applyReteFuente || false,
              applyReteIca: ownerInfo.applyReteIca || false,
              additionalContacts: ownerInfo.additionalContacts
                ? JSON.stringify(ownerInfo.additionalContacts)
                : null,
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
      if (tenantInfo && (tenantInfo.firstName || tenantInfo.lastName)) {
        const tenantLookupConditions: any[] = [];
        if (tenantInfo.email)
          tenantLookupConditions.push({ email: tenantInfo.email });
        if (tenantInfo.governmentId)
          tenantLookupConditions.push({
            governmentId: tenantInfo.governmentId,
          });

        let tenantUser =
          tenantLookupConditions.length > 0
            ? await this.prisma.user.findFirst({
                where: {
                  tenantId: propertyFields.tenantId,
                  OR: tenantLookupConditions,
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
              firstName: tenantInfo.firstName || 'Arrendatario',
              lastName: tenantInfo.lastName || 'Sin Apellido',
              governmentId: tenantInfo.governmentId || null,
              role: 'TENANT_USER',
              phone: tenantInfo.phone || null,
              personType: tenantInfo.personType || 'NATURAL',
            },
          });
        }

        await this.prisma.propertyRelation.create({
          data: {
            propertyId: property.id,
            userId: tenantUser.id,
            relationType: 'TENANT',
            startDate: safeDate(tenantInfo.contractStart) || new Date(),
            endDate: safeDate(tenantInfo.contractEnd),
            contractNumber: propertyFields.propertyCode || null,
            contractType: tenantInfo.contractType || 'RESIDENTIAL',
            status: 'ACTIVE',
          },
        });
      }

      // 3. Inventory Template Application
      if (data.inventoryTemplateId) {
        const template = await this.prisma.inventoryTemplate.findUnique({
          where: { id: data.inventoryTemplateId },
          include: {
            items: true,
            zones: { include: { items: true } },
          },
        });

        if (template) {
          const legacyItems = template.items.map((item: any) => ({
            propertyId: property.id,
            name: item.name,
            category: item.category,
            condition: 'GOOD' as any,
            description: `Desde plantilla: ${item.material || ''} ${item.description || ''}`,
          }));

          for (const zone of template.zones) {
            const propZone = await this.prisma.zone.create({
              data: {
                propertyId: property.id,
                name: zone.name,
                type: zone.type,
              },
            });

            const zoneItems = zone.items.map((item: any) => ({
              propertyId: property.id,
              zoneId: propZone.id,
              name: item.name,
              category: item.category,
              condition: 'GOOD' as any,
              description: `Desde zona ${zone.name}: ${item.material || ''} ${item.description || ''}`,
            }));

            if (zoneItems.length > 0) {
              await this.prisma.inventoryItem.createMany({ data: zoneItems });
            }
          }

          if (legacyItems.length > 0) {
            await this.prisma.inventoryItem.createMany({ data: legacyItems });
          }
        }
      }

      return property;
    } catch (error) {
      console.error('[PropertiesService] CRITICAL ERROR:', error);
      try {
        const logMsg = `\n[${new Date().toISOString()}] CRITICAL ERROR:\n${error.stack}\n`;
        fs.appendFileSync('backend_error.log', logMsg);
      } catch (e) {}
      throw error;
    }
  }

  async findAllByTenant(
    tenantId: string,
    page: number = 1,
    limit: number = 10,
  ) {
    const skip = (page - 1) * limit;

    try {
      const [data, totalRecords] = await Promise.all([
        this.prisma.property.findMany({
          where: { tenantId },
          include: {
            relations: {
              include: {
                user: {
                  select: {
                    id: true,
                    firstName: true,
                    lastName: true,
                    role: true,
                  },
                },
              },
            },
          },
          skip,
          take: limit,
          orderBy: { createdAt: 'desc' },
        }),
        this.prisma.property.count({ where: { tenantId } }),
      ]);

      return {
        data,
        totalRecords,
        totalPages: Math.ceil(totalRecords / limit),
        currentPage: page,
      };
    } catch (err) {
      console.error('[PropertiesService] findAllByTenant error:', err);
      throw err;
    }
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
          contractNumber: (await this.findOne(propertyId, tenantId))
            ?.propertyCode, // Sync code
        },
      });
    }

    return { newOwner, newTenant };
  }
}
