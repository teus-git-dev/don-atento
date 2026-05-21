import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TemplateStatus } from '@prisma/client';
import {
  CreateInventoryTemplateDto,
  CreateInventoryTemplateItemDto,
  CreateInventoryTemplateZoneDto,
  UpdateInventoryTemplateDto,
} from './dto/create-inventory-template.dto';

@Injectable()
export class InventoryTemplatesService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateInventoryTemplateDto) {
    return this.prisma.inventoryTemplate.create({
      data: {
        tenantId: dto.tenantId,
        name: dto.name,
        description: dto.description,
        status: dto.status ?? TemplateStatus.ACTIVE,
        // Support structured zones
        zones: {
          create: (dto.zones ?? []).map((zone: CreateInventoryTemplateZoneDto) => ({
            name: zone.name,
            type: zone.type ?? 'ZONAS_COMUNES',
            templateItems: {
              create: (zone.items ?? []).map(
                (item: CreateInventoryTemplateItemDto) => ({
                  name: item.name,
                  category: item.category ?? 'GENERAL',
                  description: item.description,
                  material: item.material,
                }),
              ),
            },
          })),
        },
        // Support top-level items (flat structure)
        items: {
          create: (dto.items ?? []).map(
            (item: CreateInventoryTemplateItemDto) => ({
              name: item.name,
              category: item.category ?? 'GENERAL',
              description: item.description,
              material: item.material,
            }),
          ),
        },
      },
      include: {
        zones: {
          include: { templateItems: true },
        },
        items: true,
      },
    });
  }

  async findAll(tenantId: string) {
    return this.prisma.inventoryTemplate.findMany({
      where: { tenantId },
      include: {
        zones: {
          include: { templateItems: true },
        },
        items: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async findOne(id: string, tenantId: string) {
    return this.prisma.inventoryTemplate.findFirst({
      where: { id, tenantId },
      include: {
        zones: {
          include: { templateItems: true },
        },
        items: true,
      },
    });
  }

  async update(id: string, dto: UpdateInventoryTemplateDto) {
    // Basic update for name/description/status
    return this.prisma.inventoryTemplate.update({
      where: { id },
      data: {
        name: dto.name,
        description: dto.description,
        status: dto.status as TemplateStatus | undefined,
      },
    });
  }

  async toggleStatus(id: string) {
    const template = await this.prisma.inventoryTemplate.findUnique({
      where: { id },
    });
    if (!template) throw new Error('Template not found');

    return this.prisma.inventoryTemplate.update({
      where: { id },
      data: {
        status: template.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE',
      },
    });
  }

  async remove(id: string) {
    // Delete hierarchical data
    const zones = await this.prisma.zone.findMany({
      where: { templateId: id },
    });
    const zoneIds = zones.map((z) => z.id);

    await this.prisma.inventoryTemplateItem.deleteMany({
      where: { OR: [{ templateId: id }, { zoneId: { in: zoneIds } }] },
    });

    await this.prisma.zone.deleteMany({
      where: { templateId: id },
    });

    return this.prisma.inventoryTemplate.delete({
      where: { id },
    });
  }
}
