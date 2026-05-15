import {
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UserRole } from '@prisma/client';
import * as bcrypt from 'bcrypt';

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

  constructor(private prisma: PrismaService) {}

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

  async findAllByTenant(tenantId: string) {
    return this.prisma.user.findMany({
      where: { tenantId },
      select: {
        ...USER_PUBLIC_SELECT,
        roleRef: { select: { id: true, name: true } },
      },
      orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
    });
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
    /**
     * Optional explicit plaintext password. Block A keeps the legacy
     * signature so the existing controller flow compiles; Block B
     * replaces it with a CSPRNG temp password helper and
     * mustChangePassword=true.
     */
    password?: string;
  }) {
    // bcrypt cost factor 10 in Block A's intermediate state; Block B
    // raises to 12 (consistent with OnboardingService) along with the
    // password sentinel removal.
    const passwordHash = await bcrypt.hash(
      data.password || 'TemporaryPassword123!',
      10,
    );

    const created = await this.prisma.user.create({
      data: {
        tenantId: data.tenantId,
        email: data.email,
        firstName: data.firstName,
        lastName: data.lastName,
        role: data.role,
        roleId: data.roleId || null,
        passwordHash,
      },
      select: USER_PUBLIC_SELECT,
    });
    return created;
  }

  async delete(id: string, tenantId: string) {
    const result = await this.prisma.user.deleteMany({
      where: { id, tenantId },
    });
    if (result.count === 0) {
      throw new NotFoundException('Usuario no encontrado.');
    }
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
