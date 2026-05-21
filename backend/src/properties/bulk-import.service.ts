import { Injectable } from '@nestjs/common';
import { PropertyType } from '@prisma/client';
import { PropertiesService } from './properties.service';
import { PrismaService } from '../prisma/prisma.service';

/** Raw external row from a bulk import source (CSV / API / Excel).
 *  Keys and values are unknown until smartMap normalises them. */
type ExternalRow = Record<string, unknown>;

interface MappedProperty {
  propertyCode: string;
  title: string;
  address: string;
  city: string;
  department: string;
  country: string;
  propertyType: PropertyType;
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

  async processImport(tenantId: string, data: ExternalRow[]) {
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
            results.errors.push(
              `Property with code ${mappedProperty.propertyCode} already exists.`,
            );
            continue;
          }
        }

        await this.propertiesService.create(mappedProperty);
        results.imported++;
      } catch (error) {
        results.skipped++;
        const msg = error instanceof Error ? error.message : String(error);
        results.errors.push(`Error importing item: ${msg}`);
      }
    }

    return results;
  }

  private smartMap(externalItem: ExternalRow): MappedProperty {
    const str = (v: unknown): string => {
      if (v == null) return '';
      if (typeof v === 'object') return JSON.stringify(v);
      return String(v as string | number | boolean);
    };

    // Basic heuristics for mapping (Plug & Play vision)
    return {
      propertyCode: str(
        externalItem['ID'] ??
          externalItem['codigo'] ??
          externalItem['Cod_Propiedad'] ??
          externalItem['propertyCode'],
      ),
      title: str(
        externalItem['Nombre'] ??
          externalItem['Titulo'] ??
          externalItem['title'] ??
          'Inmueble Importado',
      ),
      address: str(
        externalItem['Direccion'] ??
          externalItem['address'] ??
          'Calle Falsa 123',
      ),
      city: str(externalItem['Ciudad'] ?? externalItem['city'] ?? 'Bogotá'),
      department: str(
        externalItem['Departamento'] ??
          externalItem['department'] ??
          'Cundinamarca',
      ),
      country: str(
        externalItem['Pais'] ?? externalItem['country'] ?? 'Colombia',
      ),
      propertyType: this.mapType(
        str(externalItem['Tipo'] ?? externalItem['propertyType']),
      ),
      areaM2:
        parseFloat(str(externalItem['Area'] ?? externalItem['areaM2'])) || 0,
      rooms:
        parseInt(
          str(externalItem['Habitaciones'] ?? externalItem['rooms']),
          10,
        ) || 0,
      bathrooms:
        parseInt(str(externalItem['Baños'] ?? externalItem['bathrooms']), 10) ||
        0,
      isVip: externalItem['VIP'] === 'SI' || externalItem['isVip'] === true,
      ownerInfo: {
        name: str(externalItem['Propietario'] ?? externalItem['ownerName']),
        email: str(
          externalItem['Email_Propietario'] ?? externalItem['ownerEmail'],
        ),
        phone: str(
          externalItem['Tel_Propietario'] ?? externalItem['ownerPhone'],
        ),
      },
    };
  }

  private mapType(type: string): PropertyType {
    const t = (type || '').toUpperCase();
    if (t.includes('APTO') || t.includes('APARTAMENTO'))
      return PropertyType.APARTMENT;
    if (t.includes('CASA')) return PropertyType.HOUSE;
    if (t.includes('OFICINA')) return PropertyType.OFFICE;
    if (t.includes('BODEGA')) return PropertyType.WAREHOUSE;
    return PropertyType.APARTMENT; // Default
  }
}
