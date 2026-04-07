import { Injectable } from '@nestjs/common';
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

  async delete(id: string) {
    return this.prisma.role.delete({
      where: { id },
    });
  }
}
