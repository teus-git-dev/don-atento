import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UserRole } from '@prisma/client';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async findByRole(role: UserRole, tenantId?: string) {
    return this.prisma.user.findMany({
      where: { 
        role,
        ...(tenantId && { tenantId })
      }
    });
  }

  async findAllByTenant(tenantId: string) {
    return this.prisma.user.findMany({
      where: { tenantId }
    });
  }

  async findAdmin(tenantId: string) {
    return this.prisma.user.findFirst({
      where: { tenantId, role: UserRole.ADMIN_TENANT }
    });
  }
}
