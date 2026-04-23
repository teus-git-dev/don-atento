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
            photoUrl: true,
          },
        },
        additionalContacts: true,
      },
      orderBy: { name: 'asc' },
    });
  }

  async findOne(id: string, tenantId: string) {
    return this.prisma.provider.findFirst({
      where: { id, tenantId },
      include: {
        technicians: true,
        additionalContacts: true,
      },
    });
  }

  async create(
    tenantId: string,
    data: {
      name: string;
      nit?: string;
      email?: string;
      phone?: string;
      address?: string;
      specialty: ProviderSpecialty;
      contactName?: string;
      contactLastName?: string;
      contactId?: string;
      contactPhone?: string;
      photoUrl?: string;
      legalArl?: string;
      legalSst?: boolean;
      legalPolicyNumber?: string;
      additionalContacts?: any[];
    },
  ) {
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

  async update(id: string, tenantId: string, data: any) {
    return this.prisma.provider.updateMany({
      where: { id, tenantId },
      data,
    });
  }

  async remove(id: string, tenantId: string) {
    return this.prisma.provider.deleteMany({
      where: { id, tenantId },
    });
  }

  async assignTechnician(providerId: string, userId: string, tenantId: string) {
    // Verify provider belongs to tenant
    const provider = await this.prisma.provider.findFirst({
      where: { id: providerId, tenantId },
    });
    if (!provider) throw new Error('Provider not found or access denied');

    return this.prisma.user.updateMany({
      where: { id: userId, tenantId },
      data: { providerId },
    });
  }
}
