"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.InventoryReportService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const whatsapp_service_1 = require("../whatsapp/whatsapp.service");
const PDFDocument = require("pdfkit");
let InventoryReportService = class InventoryReportService {
    prisma;
    whatsapp;
    constructor(prisma, whatsapp) {
        this.prisma = prisma;
        this.whatsapp = whatsapp;
    }
    async generateInventoryPDF(propertyId) {
        const property = await this.prisma.property.findUnique({
            where: { id: propertyId },
            include: {
                relations: {
                    include: { user: true },
                },
                zones: {
                    include: { items: true },
                },
                meterReadings: true,
                accessItems: true,
            },
        });
        if (!property) {
            throw new Error('Property not found');
        }
        return new Promise((resolve, reject) => {
            const doc = new PDFDocument({ margin: 50 });
            const chunks = [];
            doc.on('data', (chunk) => chunks.push(chunk));
            doc.on('end', () => resolve(Buffer.concat(chunks)));
            doc.on('error', (err) => reject(err));
            doc.rect(0, 0, 612, 100).fill('#000000');
            doc.fillColor('#FFFFFF').fontSize(24).text('DON IQ', 50, 40);
            doc
                .fontSize(10)
                .text('REPORTE DE INVENTARIO AUTÓNOMO - CICLO DE VIDA', 50, 70);
            doc
                .fontSize(10)
                .text(`FECHA: ${new Date().toLocaleDateString()}`, 450, 40);
            doc.text(`REF: ${property.propertyCode}`, 450, 55);
            doc.moveDown(4);
            doc.fillColor('#0070F3').fontSize(14).text('DATOS DEL INMUEBLE', 50);
            doc.rect(50, doc.y + 2, 512, 1).fill('#0070F3');
            doc.moveDown();
            doc.fillColor('#333333').fontSize(10);
            doc.text(`Referencia: ${property.propertyCode}`, 60);
            doc.text(`Título: ${property.title}`, 60);
            doc.text(`Dirección: ${property.address}`, 60);
            doc.text(`Ciudad: ${property.city}`, 60);
            doc.moveDown();
            const owner = property.relations.find((r) => r.relationType === 'OWNER')?.user;
            const tenant = property.relations.find((r) => r.relationType === 'TENANT')?.user;
            if (owner) {
                doc.fillColor('#0070F3').fontSize(12).text('PROPIETARIO', 50);
                doc
                    .fillColor('#333333')
                    .fontSize(10)
                    .text(`Nombre: ${owner.firstName} ${owner.lastName || ''}`, 60);
                doc.text(`Documento: ${owner.governmentId || 'N/A'}`, 60);
                doc.moveDown(0.5);
            }
            if (tenant) {
                doc.fillColor('#0070F3').fontSize(12).text('ARRENDATARIO', 50);
                doc
                    .fillColor('#333333')
                    .fontSize(10)
                    .text(`Nombre: ${tenant.firstName} ${tenant.lastName || ''}`, 60);
                doc.text(`Documento: ${tenant.governmentId || 'N/A'}`, 60);
                doc.moveDown(0.5);
            }
            doc.moveDown();
            doc.fillColor('#0070F3').fontSize(14).text('DETALLE DE INVENTARIO', 50);
            doc.rect(50, doc.y + 2, 512, 1).fill('#0070F3');
            doc.moveDown();
            for (const zone of property.zones) {
                doc
                    .fillColor('#000000')
                    .fontSize(11)
                    .text(zone.name.toUpperCase(), 50, undefined, { underline: true });
                doc.moveDown(0.5);
                for (const item of zone.items) {
                    doc
                        .fillColor('#333333')
                        .fontSize(9)
                        .text(`${item.name} (${item.quantity || 1} ${item.material || ''}): `, 70, undefined, { continued: true });
                    let condColor = '#666666';
                    if (item.condition === 'EXCELLENT')
                        condColor = '#10B981';
                    if (item.condition === 'GOOD')
                        condColor = '#3B82F6';
                    if (item.condition === 'REGULAR')
                        condColor = '#F59E0B';
                    if (item.condition === 'BAD')
                        condColor = '#EF4444';
                    doc.fillColor(condColor).text(item.condition);
                    doc
                        .fillColor('#666666')
                        .fontSize(8)
                        .text(`Notas: ${item.comments || item.description || 'Sin novedad'}`, 80);
                    doc.moveDown(0.5);
                }
                doc.moveDown();
            }
            const pageCount = doc.bufferedPageRange().count;
            for (let i = 0; i < pageCount; i++) {
                doc.switchToPage(i);
                doc
                    .fillColor('#999999')
                    .fontSize(8)
                    .text('Este documento fue generado automáticamente por el sistema Don Atento IA. La firma digital vinculada a este reporte tiene validez contractual.', 50, 750, { align: 'center', width: 512 });
            }
            doc.end();
        });
    }
    async sendInventoryReport(propertyId, type) {
        const property = await this.prisma.property.findUnique({
            where: { id: propertyId },
            include: {
                relations: { include: { user: true } },
            },
        });
        if (!property)
            return;
        const owner = property.relations.find((r) => r.relationType === 'OWNER')?.user;
        const tenant = property.relations.find((r) => r.relationType === 'TENANT')?.user;
        if (type === 'CHECK_IN' || type === 'DELIVERY') {
            if (owner?.phone) {
                await this.whatsapp.sendMessage(owner.phone, `✨ Don IQ: Tu reporte de inventario (${type}) para ${property.address} ya está listo.`);
            }
            if (tenant?.phone) {
                await this.whatsapp.sendMessage(tenant.phone, `✨ Don IQ: Tu reporte de inventario (${type}) para ${property.address} ya está listo.`);
            }
        }
        else {
            console.log('Notifying Incasa of Check-out PDF (Internal Only)');
        }
    }
};
exports.InventoryReportService = InventoryReportService;
exports.InventoryReportService = InventoryReportService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        whatsapp_service_1.WhatsappService])
], InventoryReportService);
//# sourceMappingURL=inventory-report.service.js.map