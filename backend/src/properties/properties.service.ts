import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcrypt';
import { randomBytes } from 'crypto';
import { TransferPropertyDto } from './dto/transfer-property.dto';

/**
 * Generate a high-entropy temp password for an auto-created owner/tenant
 * user. 32 bytes = 256 bits — bcrypt-12 brute force is computationally
 * infeasible even if the creation timestamp is known. The user is created
 * with `mustChangePassword: true`; the password is never returned and
 * exists only as a placeholder until the user completes a real password
 * setup flow (e.g., "olvidé mi contraseña" / admin reset).
 */
function generateTempPassword(): string {
  return randomBytes(32).toString('hex');
}

/** Random suffix for placeholder email when the caller didn't provide one. */
function randomEmailSuffix(): string {
  return randomBytes(8).toString('hex');
}

/**
 * Whitelist of User fields safe to expose in property responses. Excludes
 * `passwordHash`, `mustChangePassword`, `isActive`, and any internal flags.
 * Used across findOne / findByPropertyCode includes.
 */
const USER_PUBLIC_SELECT = {
  id: true,
  firstName: true,
  lastName: true,
  email: true,
  phone: true,
  role: true,
  governmentId: true,
  personType: true,
} as const;

@Injectable()
export class PropertiesService {
  private readonly logger = new Logger(PropertiesService.name);

  constructor(private prisma: PrismaService) {}

  async create(data: any) {
    const safeDate = (d: any) => {
      if (!d) return null;
      const date = new Date(d);
      return isNaN(date.getTime()) ? null : date;
    };

    const ownerInfo = data.ownerInfo;
    const tenantInfo = data.tenantInfo;
    const attachments = data.attachments;
    const propertyFields = data;

    const validTypes = [
      'APARTMENT',
      'HOUSE',
      'BUILDING',
      'WAREHOUSE',
      'OFFICE',
    ];
    const sanitizedPropertyType = validTypes.includes(
      propertyFields.propertyType,
    )
      ? propertyFields.propertyType
      : 'HOUSE';

    try {
      /**
       * All writes are wrapped in a single Prisma interactive transaction.
       * If any step fails, all prior writes are rolled back automatically.
       * This eliminates partial-commit data corruption (e.g., property created but no owner relation).
       */
      const property = await this.prisma.$transaction(async (tx) => {
        // 1. Create the property
        const createdProperty = await tx.property.create({
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

        // 2. Handle Owner Persistence
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
              ? await tx.user.findFirst({
                  where: {
                    tenantId: propertyFields.tenantId,
                    OR: ownerLookupConditions,
                  },
                })
              : null;

          if (!ownerUser) {
            // High-entropy placeholder password — never used as a real
            // credential. User must complete a password setup flow before
            // logging in (mustChangePassword: true).
            const passwordHash = await bcrypt.hash(generateTempPassword(), 10);

            const nameParts = (ownerInfo.name || 'Propietario')
              .trim()
              .split(' ');
            const firstName = nameParts[0];
            const lastName = nameParts.slice(1).join(' ') || 'Propietario';

            ownerUser = await tx.user.create({
              data: {
                tenantId: propertyFields.tenantId,
                email:
                  ownerInfo.email || `owner_${randomEmailSuffix()}@teus.com`,
                passwordHash,
                mustChangePassword: true,
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

          await tx.propertyRelation.create({
            data: {
              propertyId: createdProperty.id,
              userId: ownerUser.id,
              relationType: 'OWNER',
              startDate: new Date(),
              status: 'ACTIVE',
            },
          });
        }

        // 3. Handle Tenant/Arrendatario Persistence (if RENTED)
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
              ? await tx.user.findFirst({
                  where: {
                    tenantId: propertyFields.tenantId,
                    OR: tenantLookupConditions,
                  },
                })
              : null;

          if (!tenantUser) {
            // See generateTempPassword() doc — high-entropy placeholder.
            const passwordHash = await bcrypt.hash(generateTempPassword(), 10);

            tenantUser = await tx.user.create({
              data: {
                tenantId: propertyFields.tenantId,
                email:
                  tenantInfo.email || `tenant_${randomEmailSuffix()}@teus.com`,
                passwordHash,
                mustChangePassword: true,
                firstName: tenantInfo.firstName || 'Arrendatario',
                lastName: tenantInfo.lastName || 'Sin Apellido',
                governmentId: tenantInfo.governmentId || null,
                role: 'TENANT_USER',
                phone: tenantInfo.phone || null,
                personType: tenantInfo.personType || 'NATURAL',
              },
            });
          }

          await tx.propertyRelation.create({
            data: {
              propertyId: createdProperty.id,
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

        // 4. Inventory Template Application — batched to avoid N+1 zone creates
        // Tenant filter is required here: a caller could otherwise pass a
        // template id from another tenant and instantiate its zones/items
        // into their own property (cross-tenant data exfiltration).
        if (data.inventoryTemplateId) {
          const template = await tx.inventoryTemplate.findFirst({
            where: {
              id: data.inventoryTemplateId,
              tenantId: propertyFields.tenantId,
            },
            include: {
              items: true,
              zones: { include: { items: true } },
            },
          });

          if (template) {
            // Create all zones in a single batch
            const createdZones: { id: string; originalName: string }[] = [];
            for (const zone of template.zones) {
              const propZone = await tx.zone.create({
                data: {
                  propertyId: createdProperty.id,
                  name: zone.name,
                  type: zone.type,
                },
              });
              createdZones.push({ id: propZone.id, originalName: zone.name });

              const zoneItems = (zone as any).items.map((item: any) => ({
                propertyId: createdProperty.id,
                zoneId: propZone.id,
                name: item.name,
                category: item.category,
                condition: 'GOOD' as any,
                description: `Desde zona ${zone.name}: ${item.material || ''} ${item.description || ''}`,
              }));

              if (zoneItems.length > 0) {
                await tx.inventoryItem.createMany({ data: zoneItems });
              }
            }

            // Legacy top-level template items (not zone-scoped)
            const legacyItems = template.items.map((item: any) => ({
              propertyId: createdProperty.id,
              name: item.name,
              category: item.category,
              condition: 'GOOD' as any,
              description: `Desde plantilla: ${item.material || ''} ${item.description || ''}`,
            }));

            if (legacyItems.length > 0) {
              await tx.inventoryItem.createMany({ data: legacyItems });
            }
          }
        }

        return createdProperty;
      }); // end $transaction

      return property;
    } catch (error) {
      this.logger.error(
        '[PropertiesService] CRITICAL ERROR in create():',
        error,
      );
      throw new InternalServerErrorException(
        `Error en creación de propiedad: ${error.message}`,
      );
    }
  }

  async findAllByTenant(
    tenantId: string,
    page: number = 1,
    limit: number = 10,
  ) {
    // Defense in depth: controller already caps `limit`, but enforce here too
    // so internal callers can't bypass the cap.
    const safeLimit = Math.min(Math.max(1, limit), 100);
    const safePage = Math.max(1, page);
    const skip = (safePage - 1) * safeLimit;

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
          take: safeLimit,
          orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
        }),
        this.prisma.property.count({ where: { tenantId } }),
      ]);

      return {
        data,
        totalRecords,
        totalPages: Math.ceil(totalRecords / safeLimit),
        currentPage: safePage,
      };
    } catch (err) {
      this.logger.error('[PropertiesService] findAllByTenant error:', err);
      throw err;
    }
  }

  async findOne(id: string, tenantId: string) {
    return this.prisma.property.findFirst({
      where: { id, tenantId },
      include: {
        relations: {
          include: { user: { select: USER_PUBLIC_SELECT } },
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
          include: { user: { select: USER_PUBLIC_SELECT } },
        },
      },
    });
  }

  async update(id: string, tenantId: string, data: any) {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars -- BUG tracked in AUDIT_REPORT.md: tenantInfo destructured but update() never persists it. Frontend edits to arrendatario data are silently dropped.
    const { ownerInfo, tenantInfo, attachments, ...propertyFields } = data;

    // All writes wrapped in a single $transaction: property update + (if
    // ownerInfo) user upsert + relation upsert + (if propertyCode) tenant
    // relation update. A failure mid-way rolls back the whole set.
    return this.prisma.$transaction(async (tx) => {
      const property = await tx.property.updateMany({
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

      if (ownerInfo && ownerInfo.name) {
        let ownerUser = await tx.user.findFirst({
          where: {
            tenantId: tenantId,
            OR: [
              { email: ownerInfo.email || 'pending' },
              { phone: ownerInfo.phone },
            ],
          },
        });

        if (!ownerUser) {
          const passwordHash = await bcrypt.hash(generateTempPassword(), 10);

          ownerUser = await tx.user.create({
            data: {
              tenantId: tenantId,
              email: ownerInfo.email || `owner_${randomEmailSuffix()}@teus.com`,
              passwordHash,
              mustChangePassword: true,
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
          await tx.user.update({
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

        const existingRel = await tx.propertyRelation.findFirst({
          where: { propertyId: id, relationType: 'OWNER' },
        });

        if (existingRel) {
          await tx.propertyRelation.update({
            where: { id: existingRel.id },
            data: { userId: ownerUser.id },
          });
        } else {
          await tx.propertyRelation.create({
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

      // (Removed: previously this block auto-rewrote the active tenant's
      // `contractNumber` to the property's `propertyCode` whenever a
      // property update included propertyCode. The two fields model
      // distinct entities — internal property code vs. legal rental
      // contract number — and conflating them corrupted accounting
      // references. Use transferProperty / a future contract-update
      // endpoint to change contractNumber explicitly.)

      return property;
    });
  }

  async transferProperty(
    propertyId: string,
    tenantId: string,
    data: TransferPropertyDto,
  ) {
    // Cross-tenant identity injection vector: a user from Tenant A could
    // previously transfer ownership to a User ID belonging to Tenant B
    // (creating a phantom relation linking A's property to B's user). All
    // four lookups + writes wrap in a single $transaction so a partial
    // failure rolls back.
    return this.prisma.$transaction(async (tx) => {
      const property = await tx.property.findFirst({
        where: { id: propertyId, tenantId },
      });
      if (!property) {
        throw new NotFoundException('Property not found or access denied');
      }

      const newOwner = await tx.user.findFirst({
        where: { id: data.newOwnerId, tenantId },
        select: { id: true },
      });
      if (!newOwner) {
        throw new BadRequestException(
          `newOwnerId ${data.newOwnerId} no pertenece al tenant.`,
        );
      }

      let newTenantUser: { id: string } | null = null;
      if (data.newTenantId) {
        newTenantUser = await tx.user.findFirst({
          where: { id: data.newTenantId, tenantId },
          select: { id: true },
        });
        if (!newTenantUser) {
          throw new BadRequestException(
            `newTenantId ${data.newTenantId} no pertenece al tenant.`,
          );
        }
      }

      const effectiveDate = new Date(data.startDate);

      await tx.propertyRelation.updateMany({
        where: { propertyId, status: 'ACTIVE' },
        data: { status: 'HISTORIC', endDate: effectiveDate },
      });

      const newOwnerRel = await tx.propertyRelation.create({
        data: {
          propertyId,
          userId: newOwner.id,
          relationType: 'OWNER',
          startDate: effectiveDate,
          status: 'ACTIVE',
        },
      });

      let newTenantRel = null;
      if (newTenantUser) {
        newTenantRel = await tx.propertyRelation.create({
          data: {
            propertyId,
            userId: newTenantUser.id,
            relationType: 'TENANT',
            startDate: effectiveDate,
            status: 'ACTIVE',
            contractNumber: property.propertyCode,
          },
        });
      }

      return { newOwner: newOwnerRel, newTenant: newTenantRel };
    });
  }
}
