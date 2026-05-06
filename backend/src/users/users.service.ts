import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UserRole } from '@prisma/client';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UsersService {
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
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
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
      include: { roleRef: true },
    });
  }

  async findAdmin(tenantId: string) {
    console.log(`[UsersService] Finding admin for tenant: ${tenantId}`);
    const admin = await this.prisma.user.findFirst({
      where: { tenantId, role: UserRole.ADMIN_TENANT },
    });
    if (!admin)
      console.warn(`[UsersService] NO ADMIN FOUND for tenant: ${tenantId}`);
    return admin;
  }

  async create(data: {
    tenantId: string;
    email: string;
    firstName: string;
    lastName: string;
    role: UserRole;
    roleId?: string;
    password?: string;
  }) {
    const passwordHash = await bcrypt.hash(
      data.password || 'TemporaryPassword123!',
      10,
    );

    return this.prisma.user.create({
      data: {
        tenantId: data.tenantId,
        email: data.email,
        firstName: data.firstName,
        lastName: data.lastName,
        role: data.role,
        roleId: data.roleId || null,
        passwordHash,
      },
    });
  }

  async delete(id: string, tenantId: string) {
    return this.prisma.user.deleteMany({
      where: { id, tenantId },
    });
  }

  async getUserDetails(id: string, tenantId: string) {
    try {
      const user = await this.prisma.user.findFirst({
        where: { id, tenantId },
        include: {
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

      // Filter properties by relation type
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

      // For tickets, we want tickets reported by the user OR tickets associated with their properties.
      const propertyIds = user.relations.map((r) => r.propertyId);

      let associatedTickets =
        (user as any).Ticket_Ticket_reportedByUserIdToUser || [];

      if (propertyIds.length > 0) {
        const propertyTickets = await this.prisma.ticket.findMany({
          where: {
            tenantId,
            propertyId: { in: propertyIds },
            reportedByUserId: { not: id }, // don't duplicate
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
    } catch (error: any) {
      require('fs').writeFileSync(
        'prisma_error.log',
        error.message + '\n' + error.stack,
      );
      console.error('[getUserDetails] Error:', error.message);
      throw error;
    }
  }
}
