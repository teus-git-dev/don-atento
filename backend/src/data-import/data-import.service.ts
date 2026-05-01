import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UserRole, PropertyType, PropertyStatus } from '@prisma/client';
import * as xlsx from 'xlsx';

@Injectable()
export class DataImportService {
  constructor(private prisma: PrismaService) {}

  async parseFileAndPreview(fileBuffer: Buffer, fileName: string, tenantId: string, categoryId: string) {
    try {
      const workbook = xlsx.read(fileBuffer, { type: 'buffer' });
      const firstSheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[firstSheetName];
      
      const rawData: any[][] = xlsx.utils.sheet_to_json(worksheet, { header: 1 });
      
      if (!rawData || rawData.length === 0) {
        throw new BadRequestException('The file is empty.');
      }

      let headerRowIndex = 0;
      if (rawData[0] && (rawData[0][0] === '-' || !rawData[0][0])) {
        if (rawData.length > 1) {
          headerRowIndex = 1;
        }
      }

      const headers = rawData[headerRowIndex] || [];
      const dataRows = rawData.slice(headerRowIndex + 1, Math.min(headerRowIndex + 6, rawData.length));
      
      const previewData = dataRows.map(row => {
        const obj: any = {};
        headers.forEach((h: string, idx: number) => {
          if (h) {
            obj[h] = row[idx] ?? null;
          }
        });
        return obj;
      });

      return {
        headers,
        previewData,
        totalRows: Math.max(0, rawData.length - (headerRowIndex + 1)),
      };
    } catch (error: any) {
      console.error(error);
      throw new BadRequestException('Failed to parse the file: ' + error.message);
    }
  }

  async saveTemplate(tenantId: string, name: string, categoryId: string, mapping: any) {
    return this.prisma.dataImportTemplate.create({
      data: {
        tenantId,
        name,
        categoryId,
        mapping,
      },
    });
  }

  async getTemplates(tenantId: string) {
    return this.prisma.dataImportTemplate.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' }
    });
  }

  async executeImport(fileBuffer: Buffer, fileName: string, tenantId: string, templateId: string, categoryId: string, mappingOverride?: Record<string, string>) {
    let mapping: Record<string, string>;

    if (mappingOverride && Object.keys(mappingOverride).length > 0) {
      mapping = mappingOverride;
    } else {
      const template = await this.prisma.dataImportTemplate.findUnique({ where: { id: templateId } });
      if (!template) {
        throw new BadRequestException('Template not found and no mapping provided');
      }
      mapping = template.mapping as Record<string, string>;
    }
    const workbook = xlsx.read(fileBuffer, { type: 'buffer' });
    const worksheet = workbook.Sheets[workbook.SheetNames[0]];
    
    const rawArray: any[][] = xlsx.utils.sheet_to_json(worksheet, { header: 1 });
    if (!rawArray || rawArray.length === 0) return null;

    let headerRowIndex = 0;
    const headers: (string | null)[] = rawArray[headerRowIndex] || [];
    let dataRows = rawArray.slice(headerRowIndex + 1);

    // Filter out sub-headers like "Sucursal : INCASA" which break the mapping
    dataRows = dataRows.filter(row => {
      if (row[0] === '-' || (row[1] && typeof row[1] === 'string' && row[1].includes('Sucursal'))) return false;
      return true;
    });

    // Build a normalized mapping: strip whitespace and accents for fuzzy matching
    const normalize = (s: string) =>
      s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();

    const normalizedMapping: Record<string, string> = {};
    for (const [excelKey, targetField] of Object.entries(mapping)) {
      normalizedMapping[normalize(excelKey)] = targetField;
    }

    console.log('[DataImport] Headers:', headers.slice(0, 5));
    console.log('[DataImport] Normalized mapping:', normalizedMapping);

    // Convert rows using normalized lookup + Merged Cell Heuristic
    const recordsToImport = dataRows
      .map(row => {
        const obj: any = {};
        headers.forEach((h, idx) => {
          if (!h) return;
          const targetField = normalizedMapping[normalize(h)] || mapping[h];
          if (targetField) {
            let val = row[idx];
            // Merged Cell Heuristic: if current cell is empty but the NEXT header is empty,
            // the Excel exporter shifted the data to the right column. Grab it.
            if ((val === null || val === undefined || val === '') && !headers[idx + 1]) {
              val = row[idx + 1];
            }
            obj[targetField] = val ?? null;
          }
        });
        return obj;
      })
      .filter(obj => Object.keys(obj).length > 0);

    console.log(`[DataImport] ${recordsToImport.length} rows matched mapping. First row sample:`, recordsToImport[0]);

    let savedRecords = 0;
    const errors: any[] = [];
    const sourceTag = `XLS_IMPORT_${new Date().getTime()}`;

    // Execute Import Loop
    for (const record of recordsToImport) {
      try {
        if (categoryId === 'OWNER' || categoryId === 'TENANT') {
          if (!record.contact_id) continue;
          const governmentId = String(record.contact_id).trim();
          
          let email = record.emails ? String(record.emails).split(',')[0].trim() : `no-reply-${governmentId}@donatento.com`;
          if (!email.includes('@')) email = `no-reply-${governmentId}@donatento.com`;

          const existingUser = await this.prisma.user.findFirst({
            where: { tenantId, governmentId }
          });

          // Injecting directly into CRM with 'Phase: CLIENT'
          const finalSourceTag = `Phase: CLIENT | ${sourceTag}`;

          const data = {
            tenantId,
            firstName: record.full_name ? String(record.full_name) : 'Desconocido',
            lastName: '',
            governmentId,
            email: existingUser ? existingUser.email : email,
            phone: record.phones ? String(record.phones).substring(0, 50) : null,
            role: categoryId === 'OWNER' ? UserRole.OWNER : UserRole.TENANT_USER,
            sourceTag: finalSourceTag,
            importedAt: new Date(),
          };

          let user;
          if (existingUser) {
            user = await this.prisma.user.update({ where: { id: existingUser.id }, data });
          } else {
            (data as any)['passwordHash'] = 'IMPORTED_NO_PASSWORD';
            user = await this.prisma.user.create({ data: data as any });
          }

          // Link to Property Relation if available
          if (record.property_id) {
            const propertyCode = String(record.property_id).trim();
            const property = await this.prisma.property.findUnique({ where: { propertyCode } });
            
            if (property) {
              await this.prisma.propertyRelation.create({
                data: {
                  propertyId: property.id,
                  userId: user.id,
                  relationType: categoryId === 'OWNER' ? 'OWNER' : 'TENANT',
                  startDate: new Date(),
                  status: 'ACTIVE',
                  contractNumber: record.contract_number ? String(record.contract_number) : undefined,
                }
              });

              // State Flow Sync
              if (categoryId === 'TENANT') {
                await this.prisma.property.update({
                  where: { id: property.id },
                  data: { status: PropertyStatus.RENTED }
                });
              }
            }
          }

          savedRecords++;

        } else if (categoryId === 'PROPERTY') {
          if (!record.property_id) continue;
          const propertyCode = String(record.property_id).trim();
          const existingProp = await this.prisma.property.findUnique({
            where: { propertyCode }
          });

          const data = {
            tenantId,
            propertyType: PropertyType.APARTMENT,
            title: record.address ? String(record.address) : `Inmueble ${propertyCode}`,
            address: record.address ? String(record.address) : '',
            city: record.city ? String(record.city) : '',
            department: '',
            country: 'Colombia',
            propertyCode,
            rentAmount: record['financials.canon'] ? parseFloat(record['financials.canon']) : 0,
            adminAmount: record['financials.admin'] ? parseFloat(record['financials.admin']) : 0,
            insuranceCompany: record.insurance_company ? String(record.insurance_company) : null,
            sourceTag,
            importedAt: new Date(),
          };

          if (existingProp) {
            await this.prisma.property.update({ where: { id: existingProp.id }, data });
          } else {
            // Default to AVAILABLE, will be overridden by TENANT linkage if tenant exists
            await this.prisma.property.create({ data: { ...data, status: PropertyStatus.AVAILABLE } as any });
          }
          savedRecords++;
        }
      } catch (e: any) {
        errors.push({ record, error: e.message });
      }
    }

    console.log(`[DataImport] ✅ Complete. Saved: ${savedRecords}, Errors: ${errors.length}`);

    const log = await this.prisma.dataImportLog.create({
      data: {
        tenantId,
        templateId: templateId || null,
        fileName,
        sourceTag,
        status: errors.length === 0 ? 'SUCCESS' : (savedRecords > 0 ? 'PARTIAL' : 'FAILED'),
        recordsRead: recordsToImport.length,
        recordsSaved: savedRecords,
        errors: errors.length ? errors : undefined,
      }
    });

    return {
      status: log.status,
      recordsRead: log.recordsRead,
      recordsSaved: log.recordsSaved,
      sourceTag,
      errors: errors.slice(0, 10), // Return first 10 errors for UI display
    };
  }
}
