import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import {
  Prisma,
  ProviderSpecialty,
  ProviderStatus,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProviderDto } from './dto/create-provider.dto';
import { UpdateProviderDto } from './dto/update-provider.dto';

/**
 * Whitelist of User fields safe to expose when included as
 * `Provider.technicians`. Mirrors the constant used elsewhere
 * (properties / tickets / workflows / crm / accounting / contracts
 * / inventory-master / whatsapp / users-roles-tenants). Pre-Block-A
 * `findOne` used `include: { technicians: true }` which exposed
 * passwordHash; Block A introduced a partial inline whitelist; Block
 * B promotes it to the shared shape for consistency.
 */
const USER_PUBLIC_SELECT = {
  id: true,
  firstName: true,
  lastName: true,
  email: true,
  phone: true,
  role: true,
  whatsappId: true,
  photoUrl: true,
} as const;

/** Cap on `?limit=` for paginated provider listing. Same value as
 *  the rest of the project. */
const MAX_PAGE_LIMIT = 100;

@Injectable()
export class ProvidersService {
  private readonly logger = new Logger(ProvidersService.name);

  constructor(private prisma: PrismaService) {}

  async findAll(
    tenantId: string,
    opts: {
      page?: number;
      limit?: number;
      status?: string;
      specialty?: string;
    } = {},
  ) {
    const safePage = Math.max(1, opts.page ?? 1);
    const safeLimit = Math.min(Math.max(1, opts.limit ?? 20), MAX_PAGE_LIMIT);
    const skip = (safePage - 1) * safeLimit;

    const where: Prisma.ProviderWhereInput = { tenantId };
    if (opts.status && ['ACTIVE', 'INACTIVE', 'SUSPENDED'].includes(opts.status)) {
      where.status = opts.status as ProviderStatus;
    }
    if (opts.specialty) {
      // Validate against the enum (cast); invalid values just skip
      // the filter rather than 400 — caller sees the unfiltered list.
      const validSpecialties = Object.values(ProviderSpecialty);
      if (validSpecialties.includes(opts.specialty as ProviderSpecialty)) {
        where.specialty = opts.specialty as ProviderSpecialty;
      }
    }

    const [data, totalRecords] = await Promise.all([
      this.prisma.provider.findMany({
        where,
        include: {
          technicians: { select: USER_PUBLIC_SELECT },
          additionalContacts: true,
        },
        orderBy: [{ name: 'asc' }, { id: 'asc' }],
        skip,
        take: safeLimit,
      }),
      this.prisma.provider.count({ where }),
    ]);

    return {
      data,
      totalRecords,
      totalPages: Math.ceil(totalRecords / safeLimit),
      currentPage: safePage,
    };
  }

  async findOne(id: string, tenantId: string) {
    const provider = await this.prisma.provider.findFirst({
      where: { id, tenantId },
      include: {
        technicians: { select: USER_PUBLIC_SELECT },
        additionalContacts: true,
      },
    });
    if (!provider) {
      throw new NotFoundException('Provider no encontrado.');
    }
    return provider;
  }

  async create(tenantId: string, data: CreateProviderDto) {
    const { additionalContacts, ...providerData } = data;
    const created = await this.prisma.provider.create({
      data: {
        ...providerData,
        tenantId,
        additionalContacts: additionalContacts
          ? {
              create: additionalContacts,
            }
          : undefined,
      },
      include: { additionalContacts: true },
    });
    this.logger.log(
      `Provider created id=${created.id} tenant=${tenantId} name="${created.name}"`,
    );
    return created;
  }

  async update(id: string, tenantId: string, data: UpdateProviderDto) {
    const result = await this.prisma.provider.updateMany({
      where: { id, tenantId },
      data,
    });
    if (result.count === 0) {
      throw new NotFoundException('Provider no encontrado.');
    }
    this.logger.log(`Provider updated id=${id} tenant=${tenantId}`);
    return this.prisma.provider.findUnique({
      where: { id },
      include: { additionalContacts: true },
    });
  }

  async remove(id: string, tenantId: string) {
    const result = await this.prisma.provider.deleteMany({
      where: { id, tenantId },
    });
    if (result.count === 0) {
      throw new NotFoundException('Provider no encontrado.');
    }
    this.logger.log(`Provider deleted id=${id} tenant=${tenantId}`);
    return { deleted: true };
  }

  async assignTechnician(providerId: string, userId: string, tenantId: string) {
    const provider = await this.prisma.provider.findFirst({
      where: { id: providerId, tenantId },
      select: { id: true },
    });
    if (!provider) {
      throw new NotFoundException('Provider no encontrado.');
    }
    const user = await this.prisma.user.findFirst({
      where: { id: userId, tenantId },
      select: { id: true },
    });
    if (!user) {
      throw new NotFoundException('Usuario no encontrado.');
    }

    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: { providerId },
      select: { ...USER_PUBLIC_SELECT, providerId: true },
    });
    this.logger.log(
      `Technician user=${userId} assigned to provider=${providerId} tenant=${tenantId}`,
    );
    return updated;
  }
}
