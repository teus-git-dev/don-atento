import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProviderDto } from './dto/create-provider.dto';
import { UpdateProviderDto } from './dto/update-provider.dto';

@Injectable()
export class ProvidersService {
  constructor(private prisma: PrismaService) {}

  async findAll(tenantId: string) {
    return this.prisma.provider.findMany({
      where: { tenantId },
      include: {
        technicians: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
            photoUrl: true,
          },
        },
        additionalContacts: true,
      },
      orderBy: [{ name: 'asc' }, { id: 'asc' }],
    });
  }

  async findOne(id: string, tenantId: string) {
    const provider = await this.prisma.provider.findFirst({
      where: { id, tenantId },
      include: {
        technicians: {
          // Block A: explicit select replaces the leaky `technicians: true`
          // that returned the full User row including passwordHash and
          // refreshTokenHash. Mirror of USER_PUBLIC_SELECT used across
          // the rest of the project (Block B widens it further).
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
            photoUrl: true,
          },
        },
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
    return this.prisma.provider.create({
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
  }

  async update(id: string, tenantId: string, data: UpdateProviderDto) {
    // Block A: closes the CRÍTICO tenant-escape vector. Pre-Block-A
    // `update(id, tenantId, data: any)` accepted `data.tenantId` in
    // the body — the composite where blocked cross-tenant id, but
    // the data overwrite still moved the row to another tenant. The
    // UpdateProviderDto whitelist explicitly excludes tenantId / id /
    // createdAt / updatedAt; combined with `forbidNonWhitelisted` at
    // the global pipe, the attacker can't smuggle them.
    const result = await this.prisma.provider.updateMany({
      where: { id, tenantId },
      data,
    });
    if (result.count === 0) {
      throw new NotFoundException('Provider no encontrado.');
    }
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
    return { deleted: true };
  }

  async assignTechnician(providerId: string, userId: string, tenantId: string) {
    // Block A: pre-flight checks for BOTH provider and user ownership.
    // Pre-Block-A only the provider was validated; the user.updateMany
    // composite where blocked cross-tenant id but returned { count: 0 }
    // silently on mismatch — the caller saw no error and the user was
    // never actually assigned.
    const provider = await this.prisma.provider.findFirst({
      where: { id: providerId, tenantId },
      select: { id: true },
    });
    if (!provider) {
      // Uniform 404 — pre-Block-A `'Provider not found or access denied'`
      // distinguished the two cases lingüísticamente, leaking
      // cross-tenant existence inference.
      throw new NotFoundException('Provider no encontrado.');
    }
    const user = await this.prisma.user.findFirst({
      where: { id: userId, tenantId },
      select: { id: true },
    });
    if (!user) {
      throw new NotFoundException('Usuario no encontrado.');
    }

    return this.prisma.user.update({
      where: { id: userId },
      data: { providerId },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        phone: true,
        providerId: true,
      },
    });
  }
}
