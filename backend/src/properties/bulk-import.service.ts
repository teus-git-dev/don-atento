import { Injectable } from '@nestjs/common';
import { PropertiesService } from './properties.service';
import { PrismaService } from '../prisma/prisma.service';

interface MappedProperty {
  propertyCode: string;
  title: string;
  address: string;
  city: string;
  department: string;
  country: string;
  propertyType: any;
  areaM2: number;
  rooms: number;
  bathrooms: number;
  isVip: boolean;
  tenantId?: string;
  ownerInfo: {
    name: string;
    email: string;
    phone: string;
  };
}

@Injectable()
export class BulkImportService {
  constructor(
    private readonly propertiesService: PropertiesService,
    private readonly prisma: PrismaService,
  ) {}

  async processImport(tenantId: string, data: any[]) {
    const results = {
      total: data.length,
      imported: 0,
      skipped: 0,
      errors: [] as string[],
    };

    for (const item of data) {
      try {
        // Smart Mapper Simulation: Mapping external fields to internal structure
        const mappedProperty: MappedProperty = this.smartMap(item);
        mappedProperty.tenantId = tenantId;

        // Validation: Unique PropertyCode
        if (mappedProperty.propertyCode) {
          const existing = await this.prisma.property.findFirst({
            where: { tenantId, propertyCode: mappedProperty.propertyCode },
          });
          if (existing) {
            results.skipped++;
            results.errors.push(`Property with code ${mappedProperty.propertyCode} already exists.`);
            continue;
          }
        }

        await this.propertiesService.create(mappedProperty);
        results.imported++;
      } catch (error) {
        results.skipped++;
        results.errors.push(`Error importing item: ${error.message}`);
      }
    }

    return results;
  }

  private smartMap(externalItem: any): MappedProperty {
    // Basic heuristics for mapping (Plug & Play vision)
    return {
      propertyCode: externalItem.ID || externalItem.codigo || externalItem['Cod_Propiedad'] || externalItem.propertyCode,
      title: externalItem.Nombre || externalItem.Titulo || externalItem.title || 'Inmueble Importado',
      address: externalItem.Direccion || externalItem.address || 'Calle Falsa 123',
      city: externalItem.Ciudad || externalItem.city || 'Bogotá',
      department: externalItem.Departamento || externalItem.department || 'Cundinamarca',
      country: externalItem.Pais || externalItem.country || 'Colombia',
      propertyType: this.mapType(externalItem.Tipo || externalItem.propertyType),
      areaM2: parseFloat(externalItem.Area || externalItem.areaM2) || 0,
      rooms: parseInt(externalItem.Habitaciones || externalItem.rooms) || 0,
      bathrooms: parseInt(externalItem.Baños || externalItem.bathrooms) || 0,
      isVip: externalItem.VIP === 'SI' || externalItem.isVip === true,
      ownerInfo: {
        name: externalItem.Propietario || externalItem.ownerName,
        email: externalItem.Email_Propietario || externalItem.ownerEmail,
        phone: externalItem.Tel_Propietario || externalItem.ownerPhone,
      },
    };
  }

  private mapType(type: string) {
    const t = (type || '').toUpperCase();
    if (t.includes('APTO') || t.includes('APARTAMENTO')) return 'APARTMENT';
    if (t.includes('CASA')) return 'HOUSE';
    if (t.includes('OFICINA')) return 'OFFICE';
    if (t.includes('BODEGA')) return 'WAREHOUSE';
    return 'APARTMENT'; // Default
  }
}
