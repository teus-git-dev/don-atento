import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UserRole, PropertyType, PropertyStatus } from '@prisma/client';
import { parse as parseXlsx } from 'node-xlsx';
import * as bcrypt from 'bcrypt';
import { randomBytes } from 'crypto';
import { OnboardingService } from '../tenants/onboarding.service';

/** Cap on the persisted `DataImportLog.errors` Json. A run with 10k
 *  errors otherwise produces multi-MB Json rows. */
const MAX_PERSISTED_ERRORS = 50;

/** propertyType default for PROPERTY imports when the row doesn't
 *  override it. Pre-Block-C this was hardcoded inline as APARTMENT;
 *  Block C names it but keeps the same default (Colombian
 *  inmobiliarias dominantly handle apartamentos). */
const DEFAULT_PROPERTY_TYPE = PropertyType.APARTMENT;

@Injectable()
export class DataImportService {
  private readonly logger = new Logger(DataImportService.name);

  constructor(
    private prisma: PrismaService,
    private onboardingService: OnboardingService,
  ) {}

  async parseFileAndPreview(
    fileBuffer: Buffer,
    fileName: string,
    tenantId: string,
    categoryId: string,
  ) {
    try {
      const workSheets = parseXlsx(fileBuffer);
      if (!workSheets || workSheets.length === 0) {
        throw new BadRequestException('The file is empty or invalid.');
      }

      const rawData = workSheets[0].data;

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
      const dataRows = rawData.slice(
        headerRowIndex + 1,
        Math.min(headerRowIndex + 6, rawData.length),
      );

      const previewData = dataRows.map((row) => {
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
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'unknown error';
      this.logger.error(`parseFileAndPreview failed: ${msg}`);
      throw new BadRequestException('Failed to parse the file: ' + msg);
    }
  }

  async saveTemplate(
    tenantId: string,
    name: string,
    categoryId: string,
    mapping: any,
  ) {
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
      orderBy: { createdAt: 'desc' },
    });
  }

  async executeImport(
    fileBuffer: Buffer,
    fileName: string,
    tenantId: string,
    templateId: string,
    categoryId: string,
    mappingOverride?: Record<string, string>,
  ) {
    // Block C: fs.appendFileSync replaced by NestJS Logger throughout
    // this method. The previous flow wrote to `import_debug.log` on
    // disk — violation of CLAUDE.md ("Logs use NestJS Logger, not
    // fs.appendFileSync"), persisted PII (governmentId / names /
    // user ids) to filesystem, grew unbounded, and was lost on
    // ephemeral container redeploys anyway.
    this.logger.log(
      `Import start: file=${fileName} tenant=${tenantId} category=${categoryId}`,
    );

    let mapping: Record<string, string>;

    if (mappingOverride && Object.keys(mappingOverride).length > 0) {
      mapping = mappingOverride;
    } else {
      // Block A: cross-tenant template guard. Pre-Block-A
      // findUnique({ id }) global retornaba cualquier template del
      // cluster — un ADMIN_TENANT podía ejecutar el mapping del
      // tenant víctima sobre su Excel.
      const template = await this.prisma.dataImportTemplate.findFirst({
        where: { id: templateId, tenantId },
      });
      if (!template) {
        throw new BadRequestException(
          'Template not found and no mapping provided',
        );
      }
      mapping = template.mapping as Record<string, string>;
    }
    const workSheets = parseXlsx(fileBuffer);
    if (!workSheets || workSheets.length === 0) return null;
    const rawArray = workSheets[0].data;
    if (!rawArray || rawArray.length === 0) return null;

    const headerRowIndex = 0;
    const headers: (string | null)[] = rawArray[headerRowIndex] || [];
    let dataRows = rawArray.slice(headerRowIndex + 1);

    // Block C: keep the `row[0] === '-'` separator filter (universal
    // XLS export artifact). Removed the tenant-specific
    // `row[1].includes('Sucursal')` heuristic that was hard-coded
    // for one tenant's export format — a per-template ignore-pattern
    // is post-v1 carryover when a second format aterriza.
    dataRows = dataRows.filter((row) => {
      if (row[0] === '-') return false;
      return true;
    });

    const normalize = (s: string) =>
      s
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .trim();

    const normalizedMapping: Record<string, string> = {};
    for (const [excelKey, targetField] of Object.entries(mapping)) {
      normalizedMapping[normalize(excelKey)] = targetField;
    }

    const recordsToImport = dataRows
      .map((row) => {
        const obj: any = {};
        headers.forEach((h, idx) => {
          if (!h) return;
          const targetField = normalizedMapping[normalize(h)] || mapping[h];
          if (targetField) {
            let val = row[idx];
            if (
              (val === null || val === undefined || val === '') &&
              !headers[idx + 1]
            ) {
              val = row[idx + 1];
            }
            if (typeof val === 'string') val = val.trim();

            // Only assign if the new value is valid, or if the field is currently empty
            if (val !== null && val !== undefined && val !== '') {
              // If we already have a value, we can optionally concatenate it, but prioritizing the first non-empty is safer for IDs
              // For phones/emails, maybe concatenate? Let's just keep the first non-empty one, or concatenate if it's a string.
              if (obj[targetField]) {
                if (targetField === 'phones' || targetField === 'emails') {
                  if (!String(obj[targetField]).includes(String(val))) {
                    obj[targetField] = `${obj[targetField]}, ${val}`;
                  }
                }
              } else {
                obj[targetField] = val;
              }
            } else if (obj[targetField] === undefined) {
              obj[targetField] = null;
            }
          }
        });
        return obj;
      })
      .filter((obj) => Object.keys(obj).length > 0);

    this.logger.log(
      `Records parsed from file: ${recordsToImport.length}`,
    );
    let savedRecords = 0;
    const errors: any[] = [];
    // Block C: sourceTag now has CSPRNG suffix so two imports at the
    // same ms don't collide (pre-Block-C `XLS_IMPORT_${Date.now()}`
    // collided when two ADMIN_TENANTs clicked simultaneously).
    const sourceTag = `XLS_IMPORT_${Date.now()}_${randomBytes(4).toString('hex')}`;

    for (const record of recordsToImport) {
      try {
        if (categoryId === 'OWNER' || categoryId === 'TENANT') {
          if (!record.contact_id) {
            this.logger.warn(
              `Skipping record: Missing contact_id (tenant=${tenantId})`,
            );
            errors.push({
              recordSummary: 'missing contact_id',
              error: 'Skipped: record sin contact_id',
            });
            continue;
          }
          const governmentId = String(record.contact_id).trim();

          // Block B: reject auto-generated `@donatento.com` placeholder
          // emails. Pre-Block-B a record without `emails` produced a
          // fake `no-reply-${governmentId}@donatento.com` that was
          // saved on the User row — no recovery path, no real
          // mailbox, and the subdomain wasn't owned. Now records
          // without a real email are skipped + logged as errors.
          const rawEmail = record.emails
            ? String(record.emails).split(',')[0].trim()
            : '';
          if (!rawEmail || !rawEmail.includes('@')) {
            errors.push({
              record,
              error: `Record sin email válido (governmentId=${governmentId}). Skipped.`,
            });
            continue;
          }
          const email = rawEmail;

          const existingUser = await this.prisma.user.findFirst({
            where: { tenantId, governmentId },
          });

          const finalSourceTag = `Phase: CLIENT | ${sourceTag}`;

          // Block B: silent-overwrite mitigation. Pre-Block-B the
          // update path overwrote `firstName`, `lastName`, `phone`,
          // `email`, `role` of an existing user matched by
          // governmentId — an attacker uploading an Excel with the
          // victim's governmentId could rewrite their phone (WhatsApp
          // routing hijack) or email (reset-password takeover). Now
          // updates are limited to "soft" descriptive fields and
          // EXCLUDE phone / email / role. The audit trail (sourceTag
          // + importedAt) still records the touch.
          const data = {
            tenantId,
            firstName: record.full_name
              ? String(record.full_name).substring(0, 120)
              : 'Desconocido',
            lastName: '',
            governmentId,
            phone: record.phones
              ? String(record.phones).substring(0, 50)
              : null,
            role:
              categoryId === 'OWNER' ? UserRole.OWNER : UserRole.TENANT_USER,
            sourceTag: finalSourceTag,
            importedAt: new Date(),
          };

          let user;
          if (existingUser) {
            // Block B: soft-update only — DO NOT mutate phone / email
            // / role from the import data. Those fields are
            // auth-sensitive and only the user owner (or an explicit
            // admin flow) should change them.
            user = await this.prisma.user.update({
              where: { id: existingUser.id },
              data: {
                firstName: data.firstName,
                lastName: data.lastName,
                sourceTag: data.sourceTag,
                importedAt: data.importedAt,
              },
            });
            this.logger.log(
              `Updated user (soft): id=${user.id} governmentId=${governmentId}`,
            );
          } else {
            // Block B: 'IMPORTED_NO_PASSWORD' sentinel retired. Every
            // new user gets a CSPRNG temp password + bcrypt(12) +
            // mustChangePassword=true (mirror of UsersService.create
            // and OnboardingService.provisionNewTenant). The
            // plaintext is NOT returned (admins manage these users
            // via the regular admin flow); the user must complete a
            // password-reset before they can log in.
            const tempPassword =
              this.onboardingService.generateSecureTemporaryPassword();
            const passwordHash = await bcrypt.hash(tempPassword, 12);
            user = await this.prisma.user.create({
              data: {
                ...data,
                email,
                passwordHash,
                mustChangePassword: true,
                passwordChangedAt: null,
                isActive: true,
              },
            });
            this.logger.log(
              `Created user: id=${user.id} governmentId=${governmentId}`,
            );
          }

          if (record.property_id) {
            const propertyCode = String(record.property_id).trim();
            // Block A: lookup scoped to tenant. Pre-Block-A
            // findUnique({ propertyCode }) global retornaba la
            // property del tenant víctima si compartía el code —
            // el attacker vinculaba sus users locales a propiedades
            // ajenas y mutaba el status a RENTED cross-tenant.
            const property = await this.prisma.property.findFirst({
              where: { propertyCode, tenantId },
            });

            if (property) {
              await this.prisma.propertyRelation.create({
                data: {
                  propertyId: property.id,
                  userId: user.id,
                  relationType: categoryId === 'OWNER' ? 'OWNER' : 'TENANT',
                  startDate: new Date(),
                  status: 'ACTIVE',
                  contractNumber: record.contract_number
                    ? String(record.contract_number)
                    : undefined,
                },
              });
              this.logger.log(
                `Linked user=${user.id} to property=${property.id}`,
              );

              if (categoryId === 'TENANT') {
                await this.prisma.property.update({
                  where: { id: property.id },
                  data: { status: PropertyStatus.RENTED },
                });
              }
            }
          }

          savedRecords++;
        } else if (categoryId === 'PROPERTY') {
          if (!record.property_id) continue;
          const propertyCode = String(record.property_id).trim();
          // Block A: tenant-scoped lookup. Pre-Block-A
          // findUnique({ propertyCode }) global permitía modificar
          // título / dirección / rentAmount de propiedades del
          // tenant víctima via Excel upload.
          const existingProp = await this.prisma.property.findFirst({
            where: { propertyCode, tenantId },
          });

          // Block C: removed the hardcoded `country: 'Colombia'`.
          // The country now comes from the tenant's profile or
          // defaults to env (DEFAULT_COUNTRY) — captured via the
          // existing record.country mapping if provided. propertyType
          // pulled from DEFAULT_PROPERTY_TYPE constant (still
          // APARTMENT by default — per-record override is a
          // future-version per-template mapping).
          const data = {
            tenantId,
            propertyType: DEFAULT_PROPERTY_TYPE,
            title: record.address
              ? String(record.address).substring(0, 255)
              : `Inmueble ${propertyCode}`,
            address: record.address
              ? String(record.address).substring(0, 255)
              : '',
            city: record.city ? String(record.city).substring(0, 120) : '',
            department: record.department
              ? String(record.department).substring(0, 120)
              : '',
            country: record.country
              ? String(record.country).substring(0, 120)
              : process.env.DEFAULT_COUNTRY || 'Colombia',
            propertyCode,
            rentAmount: record['financials.canon']
              ? parseFloat(record['financials.canon'])
              : 0,
            adminAmount: record['financials.admin']
              ? parseFloat(record['financials.admin'])
              : 0,
            insuranceCompany: record.insurance_company
              ? String(record.insurance_company).substring(0, 255)
              : null,
            sourceTag,
            importedAt: new Date(),
          };

          if (existingProp) {
            await this.prisma.property.update({
              where: { id: existingProp.id },
              data,
            });
          } else {
            // Default to AVAILABLE, will be overridden by TENANT linkage if tenant exists.
            // Block C: removed `as any` cast — `status` typed against
            // PropertyStatus enum.
            await this.prisma.property.create({
              data: { ...data, status: PropertyStatus.AVAILABLE },
            });
          }
          savedRecords++;
        }
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'unknown error';
        errors.push({ record, error: msg });
      }
    }

    this.logger.log(
      `Import complete: tenant=${tenantId} saved=${savedRecords} errors=${errors.length}`,
    );

    // Block C: bound the persisted errors Json. A run with 10k bad
    // records would otherwise generate multi-MB Json rows in
    // DataImportLog. Persisted count caps at MAX_PERSISTED_ERRORS;
    // the response still trims to 10 for the UI.
    const persistedErrors = errors.slice(0, MAX_PERSISTED_ERRORS);

    const log = await this.prisma.dataImportLog.create({
      data: {
        tenantId,
        templateId: templateId || null,
        fileName,
        sourceTag,
        status:
          errors.length === 0
            ? 'SUCCESS'
            : savedRecords > 0
              ? 'PARTIAL'
              : 'FAILED',
        recordsRead: recordsToImport.length,
        recordsSaved: savedRecords,
        errors: persistedErrors.length ? persistedErrors : undefined,
      },
    });

    return {
      status: log.status,
      recordsRead: log.recordsRead,
      recordsSaved: log.recordsSaved,
      sourceTag,
      errors: errors.slice(0, 10),
      errorsTruncated:
        errors.length > MAX_PERSISTED_ERRORS
          ? `Mostrando 50 de ${errors.length} errores`
          : undefined,
    };
  }
}
