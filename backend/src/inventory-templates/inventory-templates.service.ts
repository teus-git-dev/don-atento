import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateInventoryTemplateDto } from './dto/create-inventory-template.dto';

@Injectable()
export class InventoryTemplatesService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateInventoryTemplateDto) {
    return this.prisma.inventoryTemplate.create({
      data: {
        tenantId: dto.tenantId,
        name: dto.name,
        description: dto.description,
        items: {
          create: dto.items.map(item => ({
            name: item.name,
            category: item.category,
            material: item.material,
            description: item.description,
          })),
        },
      },
      include: {
        items: true,
      },
    });
  }

  async findAll(tenantId: string) {
    return this.prisma.inventoryTemplate.findMany({
      where: tenantId ? { tenantId } : {},
      include: {
        items: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async findOne(id: string) {
    return this.prisma.inventoryTemplate.findUnique({
      where: { id },
      include: {
        items: true,
      },
    });
  }

  async remove(id: string) {
    // Delete items first if needed, though Prisma might handle it if cascade is set (it isn't by default in many setups without @onDelete)
    // Actually, looking at the schema, it's safer to delete items or ensure cascade.
    await this.prisma.inventoryTemplateItem.deleteMany({
      where: { templateId: id },
    });
    return this.prisma.inventoryTemplate.delete({
      where: { id },
    });
  }
}
