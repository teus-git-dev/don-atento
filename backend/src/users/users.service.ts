import {
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UserRole } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { OnboardingService } from '../tenants/onboarding.service';

/**
 * Whitelist of User fields safe to expose. Mirrors the constant
 * used in properties / tickets / workflows / crm / accounting /
 * contracts / inventory-master / whatsapp. Excludes `passwordHash`,
 * `refreshTokenHash`, `mustChangePassword`, `passwordChangedAt` and
 * any other internal credential field.
 */
const USER_PUBLIC_SELECT = {
  id: true,
  tenantId: true,
  firstName: true,
  lastName: true,
  email: true,
  phone: true,
  whatsappId: true,
  role: true,
  roleId: true,
  governmentId: true,
  isActive: true,
  createdAt: true,
} as const;

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(
    private prisma: PrismaService,
    private onboardingService: OnboardingService,
  ) {}

  async findByRole(
    role: UserRole,
    tenantId: string,
    page: number = 1,
    limit: number = 10,
  ) {
    const skip = (page - 1) * limit;

    const [data, totalRecords] = await this.prisma.$transaction([
      this.prisma.user.findMany({
        where: { role, tenantId },
        select: USER_PUBLIC_SELECT,
        skip,
        take: limit,
        orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
      }),
      this.prisma.user.count({ where: { role, tenantId } }),
    ]);

    return {
      data,
      totalRecords,
      totalPages: Math.ceil(totalRecords / limit),
      currentPage: page,
    };
  }

  async findAllByTenant(tenantId: string, page = 1, limit = 20) {
    // Block C: paginación añadida (pre-Block-C retornaba todos los
    // users del tenant sin cap). Cap MAX_PAGE_LIMIT=100 alineado
    // con el resto de listados del proyecto.
    const safePage = Math.max(1, page);
    const safeLimit = Math.min(Math.max(1, limit), 100);
    const skip = (safePage - 1) * safeLimit;

    const [data, totalRecords] = await Promise.all([
      this.prisma.user.findMany({
        where: { tenantId },
        select: {
          ...USER_PUBLIC_SELECT,
          roleRef: { select: { id: true, name: true } },
        },
        orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
        skip,
        take: safeLimit,
      }),
      this.prisma.user.count({ where: { tenantId } }),
    ]);

    return {
      data,
      totalRecords,
      totalPages: Math.ceil(totalRecords / safeLimit),
      currentPage: safePage,
    };
  }

  async findAdmin(tenantId: string) {
    const admin = await this.prisma.user.findFirst({
      where: { tenantId, role: UserRole.ADMIN_TENANT },
      select: USER_PUBLIC_SELECT,
    });
    if (!admin) {
      this.logger.warn(`No ADMIN_TENANT found for tenant: ${tenantId}`);
    }
    return admin;
  }

  async create(data: {
    tenantId: string;
    email: string;
    firstName: string;
    lastName: string;
    role: UserRole;
    roleId?: string;
  }) {
    // Block B retires the body-supplied password path. Every new user
    // receives a CSPRNG temp password (same helper used by tenant
    // provisioning) + bcrypt(12) + mustChangePassword=true. The
    // plaintext is returned ONCE in the response so the admin can
    // share it via secure channel (Slack DM, password manager, etc.) —
    // never logged, never persisted in plaintext.
    const temporaryPassword =
      this.onboardingService.generateSecureTemporaryPassword();
    const passwordHash = await bcrypt.hash(temporaryPassword, 12);

    const created = await this.prisma.user.create({
      data: {
        tenantId: data.tenantId,
        email: data.email,
        firstName: data.firstName,
        lastName: data.lastName,
        role: data.role,
        roleId: data.roleId || null,
        passwordHash,
        mustChangePassword: true,
        passwordChangedAt: null,
        isActive: true,
      },
      select: USER_PUBLIC_SELECT,
    });

    this.logger.log(
      `User created id=${created.id} tenant=${data.tenantId} role=${data.role} (mustChangePassword=true)`,
    );

    return {
      user: created,
      // Admin must record this somewhere secure — it will not be
      // shown again.
      temporaryPassword,
    };
  }

  async delete(id: string, tenantId: string) {
    // Block B: last-admin guard. If the user being deleted is an
    // ADMIN_TENANT, ensure at least one other active admin remains —
    // otherwise the delete locks the tenant out (only SUPERADMIN
    // could rescue via OnboardingService.updateTenantAdmin).
    const target = await this.prisma.user.findFirst({
      where: { id, tenantId },
      select: { id: true, role: true, isActive: true },
    });
    if (!target) {
      throw new NotFoundException('Usuario no encontrado.');
    }

    if (target.role === UserRole.ADMIN_TENANT && target.isActive) {
      const otherActiveAdmins = await this.prisma.user.count({
        where: {
          tenantId,
          role: UserRole.ADMIN_TENANT,
          isActive: true,
          id: { not: id },
        },
      });
      if (otherActiveAdmins === 0) {
        throw new ConflictException(
          'No se puede eliminar el último ADMIN_TENANT activo del tenant. Crea otro admin primero.',
        );
      }
    }

    await this.prisma.user.delete({ where: { id } });
    this.logger.log(`User deleted id=${id} tenant=${tenantId}`);
    return { deleted: true };
  }

  async getUserDetails(id: string, tenantId: string) {
    const user = await this.prisma.user.findFirst({
      where: { id, tenantId },
      select: {
        ...USER_PUBLIC_SELECT,
        relations: {
          include: {
            property: true,
          },
        },
        Ticket_Ticket_reportedByUserIdToUser: {
          include: {
            property: true,
          },
        },
      },
    });

    if (!user) return null;

    const ownedProperties = user.relations
      .filter((r) => r.relationType === 'OWNER')
      .map((r) => {
        const { property, ...relationContext } = r;
        return { ...property, relationContext };
      });

    const rentedProperties = user.relations
      .filter((r) => r.relationType === 'TENANT')
      .map((r) => {
        const { property, ...relationContext } = r;
        return { ...property, relationContext };
      });

    const propertyIds = user.relations.map((r) => r.propertyId);

    let associatedTickets =
      (user as any).Ticket_Ticket_reportedByUserIdToUser || [];

    if (propertyIds.length > 0) {
      const propertyTickets = await this.prisma.ticket.findMany({
        where: {
          tenantId,
          propertyId: { in: propertyIds },
          reportedByUserId: { not: id },
        },
        include: {
          property: true,
        },
      });
      associatedTickets = [...associatedTickets, ...propertyTickets];
    }

    return {
      ...user,
      ownedProperties,
      rentedProperties,
      associatedTickets,
    };
  }
}
