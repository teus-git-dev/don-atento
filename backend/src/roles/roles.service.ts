import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

/**
 * Whitelist of User fields safe to expose when included via Role.users.
 * Pre-Block-A `include: { users: true }` returned the full User row
 * for every user assigned to every role — passwordHash leak N×M.
 */
const USER_PUBLIC_SELECT = {
  id: true,
  firstName: true,
  lastName: true,
  email: true,
  phone: true,
  role: true,
  whatsappId: true,
} as const;

@Injectable()
export class RolesService {
  constructor(private prisma: PrismaService) {}

  async findAllByTenant(tenantId: string) {
    return this.prisma.role.findMany({
      where: { tenantId },
      include: { users: { select: USER_PUBLIC_SELECT } },
      orderBy: [{ name: 'asc' }, { id: 'asc' }],
    });
  }

  async create(data: {
    tenantId: string;
    name: string;
    description?: string;
    permissions: Record<string, unknown>;
  }) {
    return this.prisma.role.create({
      data: {
        ...data,
        permissions: data.permissions as Prisma.InputJsonValue,
      },
    });
  }

  async delete(id: string, tenantId: string) {
    // Pre-flight: don't delete a role that still has users assigned.
    // Without this Prisma would fail with FK constraint violation
    // surfacing as 500. ConflictException is the correct semantic.
    const usersWithRole = await this.prisma.user.count({
      where: { roleId: id, tenantId },
    });
    if (usersWithRole > 0) {
      throw new ConflictException(
        `No se puede eliminar el rol — ${usersWithRole} usuario(s) lo tienen asignado.`,
      );
    }

    const result = await this.prisma.role.deleteMany({
      where: { id, tenantId },
    });
    if (result.count === 0) {
      throw new NotFoundException('Rol no encontrado en este tenant.');
    }
    return { success: true };
  }
}
