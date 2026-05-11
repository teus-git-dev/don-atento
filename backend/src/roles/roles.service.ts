import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class RolesService {
  constructor(private prisma: PrismaService) {}

  async findAllByTenant(tenantId: string) {
    return this.prisma.role.findMany({
      where: { tenantId },
      include: { users: true },
    });
  }

  async create(data: {
    tenantId: string;
    name: string;
    description?: string;
    permissions: any;
  }) {
    return this.prisma.role.create({
      data,
    });
  }

  async delete(id: string, tenantId: string) {
    // deleteMany scopes by tenantId so a role from another tenant is never touched.
    const result = await this.prisma.role.deleteMany({
      where: { id, tenantId },
    });
    if (result.count === 0) {
      throw new NotFoundException('Rol no encontrado en este tenant.');
    }
    return { success: true };
  }
}
