import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UserRole } from '@prisma/client';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async findByRole(role: UserRole, tenantId: string) {
    return this.prisma.user.findMany({
      where: {
        role,
        tenantId,
      },
    });
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
}
