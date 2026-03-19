import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ProviderSpecialty, ProviderStatus } from '@prisma/client';

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
          },
        },
      },
      orderBy: { name: 'asc' },
    });
  }

  async findOne(id: string) {
    return this.prisma.provider.findUnique({
      where: { id },
      include: {
        technicians: true,
      },
    });
  }

  async create(tenantId: string, data: {
    name: string;
    nit?: string;
    email?: string;
    phone?: string;
    address?: string;
    specialty: ProviderSpecialty;
  }) {
    return this.prisma.provider.create({
      data: {
        ...data,
        tenantId,
      },
    });
  }

  async update(id: string, data: any) {
    return this.prisma.provider.update({
      where: { id },
      data,
    });
  }

  async remove(id: string) {
    return this.prisma.provider.delete({
      where: { id },
    });
  }

  async assignTechnician(providerId: string, userId: string) {
    return this.prisma.user.update({
      where: { id: userId },
      data: { providerId },
    });
  }
}
