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

  async findOne(id: string) {
    return this.prisma.provider.findUnique({
      where: { id },
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
